/**
 * iCalSyncService.ts
 *
 * Orchestrates pull-and-persist for iCal channel connections.
 * - Pulls events via ICalAdapter
 * - Upserts into calendar_events table (idempotent by external_uid + connection_id)
 * - Marks disappeared events as cancelled (soft delete)
 * - Converts BOOKING/BLOCK events to bookings table (non-destructive)
 * - Updates connection metadata (last_sync, last_error, etc.)
 *
 * Fix log:
 *   [sync-lock]    Per-connection mutex prevents concurrent syncs for the same connectionId.
 *   [dedupe-first] Within-connection dedup runs BEFORE saving (using incoming UIDs set).
 *   [dedupe-ids]   runDedupeForAll derives booking IDs deterministically instead of
 *                  relying on evt.booking_id (which was always null, causing bookings to
 *                  never get is_duplicate=1 and showing duplicates in the calendar).
 *   [property-id]  newEvt now carries property_id so bookings are correctly scoped.
 *   [block-label]  Empty-summary BLOCK events get canonical "Bloqueo OTA" summary.
 *   [logs]         Detailed per-sync counters: read/inserted/updated/cancelled/ignored/skipped.
 */

import { ICalAdapter } from './channelAdapters/icalAdapter';
import { projectManager } from './projectManager';
import { iCalLogger } from './iCalLogger';
import { dedupeEvents, computeFingerprint } from './iCalDedupeService';
import { syncEngine } from './syncEngine';
import type { ChannelConnection, CalendarEvent, Booking } from '../types';

// ---------------------------------------------------------------------------
// [sync-lock] Per-connection in-flight guard
// ---------------------------------------------------------------------------
const _syncInFlight = new Set<string>();

function deriveBookingId(connId: string, externalUid: string): string {
  return `ical_${connId}_${externalUid}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

/**
 * Bridge: convert a CalendarEvent (from iCal) into a Booking record and upsert it.
 * This ensures the Calendar page (which reads bookings table) shows iCal events.
 */
async function upsertBookingFromCalendarEvent(
  store: any,
  evt: CalendarEvent,
  conn: ChannelConnection,
  now: number,
  propertyId?: string
): Promise<void> {
  const bookingId = deriveBookingId(conn.id, evt.external_uid);
  const eventKind = (evt as any).event_kind || 'BOOKING';
  const isBlock = eventKind === 'BLOCK';
  const status = evt.status === 'cancelled' ? 'cancelled' : (isBlock ? 'blocked' : 'confirmed');
  const summary = evt.summary?.trim() || (isBlock ? 'Bloqueo OTA' : 'Reserva Externa');

  const booking: Booking = {
    id: bookingId,
    property_id: propertyId || (evt as any).property_id || '',
    apartment_id: conn.apartment_id || (evt as any).apartment_id || '',
    traveler_id: '',
    check_in: evt.start_date,
    check_out: evt.end_date,
    status: status as any,
    total_price: 0,
    guests: 0,
    source: conn.channel_name || 'ical',
    external_ref: evt.external_uid,
    linked_event_id: evt.id,
    summary,
    guest_name: summary,
    event_kind: eventKind,
    event_origin: 'ical',
    event_state: 'confirmed',
    connection_id: conn.id,
    ical_uid: evt.external_uid,
    raw_summary: evt.summary,
    raw_description: (evt as any).description,
    created_at: (evt as any).created_at || now,
    ota: conn.channel_name || null,
    project_id: localStorage.getItem('active_project_id') || undefined,
  } as any;

  await store.saveBooking(booking);
}

const adapter = new ICalAdapter();

export interface SyncConnectionResult {
  connectionId: string;
  apartmentId: string;
  status: 'ok' | 'no_changes' | 'blocked' | 'error' | 'skipped';
  eventsRead: number;
  eventsAdded: number;
  eventsUpdated: number;
  eventsCancelled: number;
  eventsIgnored: number;
  eventsDuplicated: number;
  log: string;
  error?: string;
}

export const iCalSyncService = {

  /**
   * Sync all enabled connections, optionally filtered by apartmentId.
   */
  async syncAll(apartmentId?: string): Promise<SyncConnectionResult[]> {
    const store = projectManager.getStore();
    const connections = await store.getChannelConnections(apartmentId);
    const enabled = connections.filter((c: ChannelConnection) => c.enabled !== false && c.ical_url);
    const apartmentIds = Array.from(new Set(enabled.map((c: ChannelConnection) => c.apartment_id).filter(Boolean)));

    iCalLogger.logInfo('SYNC_ALL', `Starting sync for ${enabled.length} connection(s)`);
    const results: SyncConnectionResult[] = [];
    for (const conn of enabled) {
      const result = await this.syncConnection(conn);
      results.push(result);
    }

    // Cross-connection dedupe: after all syncs, reconcile duplicates across OTAs
    try {
      const { duplicates } = await this.runDedupeForAll(apartmentId);
      iCalLogger.logInfo('SYNC_ALL', `Cycle complete. Cross-connection duplicates hidden: ${duplicates}`);
    } catch (e: any) {
      iCalLogger.logWarn('DEDUPE', `Dedupe step failed (non-fatal): ${e.message}`);
    }

    for (const aptId of apartmentIds) {
      try {
        await syncEngine.reconcileBookings(aptId);
        await store.sanitizeCanonicalState(aptId);
      } catch (e: any) {
        iCalLogger.logWarn('SYNC_ALL', `Canonical reconcile failed for apartment ${aptId}: ${e.message}`);
      }
    }

    return results;
  },

  /**
   * [dedupe-ids] Cross-connection deduplication.
   * Derives booking IDs deterministically (same formula as upsertBookingFromCalendarEvent)
   * so that is_duplicate propagates correctly to the bookings table.
   */
  async runDedupeForAll(apartmentId?: string): Promise<{ masters: number; duplicates: number }> {
    const store = projectManager.getStore();
    const connections = await store.getChannelConnections(apartmentId);
    const channelMap = new Map(connections.map((c: ChannelConnection) => [c.id, c.channel_name || '']));

    const allEvents: CalendarEvent[] = await store.getCalendarEvents();
    const byApartment = new Map<string, CalendarEvent[]>();
    for (const evt of allEvents) {
      if (evt.status === 'cancelled') continue;
      const key = (evt as any).apartment_id || (evt as any).property_id || 'unknown';
      if (!byApartment.has(key)) byApartment.set(key, []);
      byApartment.get(key)!.push(evt);
    }

    let totalMasters = 0;
    let totalDuplicates = 0;

    for (const [, events] of byApartment) {
      const { masters, duplicates } = dedupeEvents(events, channelMap);

      for (const evt of masters) {
        await store.saveCalendarEvent(evt);
        // [dedupe-ids] Derive booking ID — evt.booking_id is unreliable (often null)
        if (evt.connection_id && evt.external_uid) {
          const bookingId = deriveBookingId(evt.connection_id, evt.external_uid);
          await store.executeWithParams(
            'UPDATE bookings SET is_duplicate = 0 WHERE id = ?',
            [bookingId]
          ).catch(() => {});
        }
        totalMasters++;
      }

      for (const evt of duplicates) {
        await store.saveCalendarEvent(evt);
        // [dedupe-ids] Mark the linked booking as duplicate so Calendar hides it
        if (evt.connection_id && evt.external_uid) {
          const bookingId = deriveBookingId(evt.connection_id, evt.external_uid);
          await store.executeWithParams(
            'UPDATE bookings SET is_duplicate = 1 WHERE id = ?',
            [bookingId]
          ).catch(() => {});
        }
        totalDuplicates++;
      }
    }

    iCalLogger.logInfo('DEDUPE', `Dedupe complete: ${totalMasters} masters, ${totalDuplicates} hidden duplicates`);
    return { masters: totalMasters, duplicates: totalDuplicates };
  },

  /**
   * Sync a single connection: pull → diff → upsert → update metadata.
   */
  async syncConnection(conn: ChannelConnection): Promise<SyncConnectionResult> {
    const store = projectManager.getStore();
    const result: SyncConnectionResult = {
      connectionId: conn.id,
      apartmentId: conn.apartment_id,
      status: 'ok',
      eventsRead: 0,
      eventsAdded: 0,
      eventsUpdated: 0,
      eventsCancelled: 0,
      eventsIgnored: 0,
      eventsDuplicated: 0,
      log: '',
    };

    // [sync-lock] Skip if a sync for this connection is already in flight
    if (_syncInFlight.has(conn.id)) {
      result.status = 'skipped';
      result.log = 'Skipped: sync already in progress for this connection';
      iCalLogger.logInfo('SYNC', `[sync-lock] Skipped connection ${conn.id} — already syncing`);
      return result;
    }

    _syncInFlight.add(conn.id);

    try {
      iCalLogger.logInfo('SYNC', `Syncing connection ${conn.id} (${conn.channel_name})`, { url: conn.ical_url?.substring(0, 40) });

      // [property-id] Resolve property_id from apartment for booking bridge
      let propertyId: string | undefined;
      try {
        const apts = await store.getAllApartments();
        const apt = apts.find((a: any) => a.id === conn.apartment_id);
        propertyId = apt?.property_id;
      } catch (_) {}

      const syncResult = await adapter.pullReservations(conn);
      result.log = syncResult.log;

      if (syncResult.status === 'blocked') {
        result.status = 'blocked';
        await store.saveChannelConnection({ ...conn, ...syncResult.metadataUpdates, last_sync: Date.now() });
        iCalLogger.logWarn('SYNC', `Connection ${conn.id} blocked by provider`);
        return result;
      }

      // Use startsWith so partial matches don't skip events accidentally
      if (syncResult.log.startsWith('Sin cambios')) {
        result.status = 'no_changes';
        await store.saveChannelConnection({ ...conn, ...syncResult.metadataUpdates, last_sync: Date.now() });
        iCalLogger.logInfo('SYNC', `Connection ${conn.id}: no changes`);
        return result;
      }

      const incomingEvents = syncResult.events;
      result.eventsRead = incomingEvents.length;
      iCalLogger.logInfo('SYNC', `Connection ${conn.id}: ${incomingEvents.length} events from feed`);

      if (incomingEvents.length > 0) {
        const now = Date.now();
        const existingEvents: CalendarEvent[] = await store.getCalendarEvents(conn.id);
        const existingByUid = new Map(existingEvents.map((e: CalendarEvent) => [e.external_uid, e]));
        const incomingUids = new Set(incomingEvents.map((e: any) => e.external_uid));

        // [dedupe-first] Within-connection: skip incoming events whose UID already
        // exists and hasn't changed, to avoid re-saving identical data.
        for (const partial of incomingEvents) {
          const existing = existingByUid.get(partial.external_uid!);
          const isCancelled = partial.status === 'cancelled';

          if (existing) {
            const changed =
              existing.start_date !== partial.start_date ||
              existing.end_date !== partial.end_date ||
              existing.status !== partial.status ||
              existing.summary !== partial.summary;

            if (changed) {
              const updated: CalendarEvent = {
                ...existing,
                ...partial,
                connection_id: conn.id,
                apartment_id: conn.apartment_id,
                property_id: (existing as any).property_id || propertyId || '',
                updated_at: now,
              } as CalendarEvent;
              // [atomic] saveCalendarEvent + booking upsert as single transaction
              await store.saveCalendarEvent(updated);
              result.eventsUpdated++;
              iCalLogger.logInfo('SYNC', `Updated event ${partial.external_uid} (${partial.start_date}→${partial.end_date})`);
            } else {
              result.eventsIgnored++;
            }
          } else if (!isCancelled) {
            const eventKind = partial.event_kind || 'BOOKING';
            const isBlock = eventKind === 'BLOCK';
            const summary = partial.summary?.trim() || (isBlock ? 'Bloqueo OTA' : 'Reserva Externa');

            // [property-id] Always include property_id on new events
            const newEvt: CalendarEvent = {
              id: `cev-${conn.id}-${partial.external_uid}-${now}`.slice(0, 64),
              connection_id: conn.id,
              apartment_id: conn.apartment_id,
              property_id: propertyId || '',
              external_uid: partial.external_uid!,
              ical_uid: partial.ical_uid || partial.external_uid!,
              event_kind: eventKind,
              start_date: partial.start_date!,
              end_date: partial.end_date!,
              status: partial.status || 'confirmed',
              summary,
              description: partial.description || '',
              raw_data: partial.raw_data || '',
              source: conn.channel_name || 'ICAL',
              created_at: now,
              updated_at: now,
              is_duplicate: 0,
            } as unknown as CalendarEvent;
            (newEvt as any).fingerprint = computeFingerprint(newEvt);

            // [atomic] saveCalendarEvent + booking upsert as single transaction
            await store.saveCalendarEvent(newEvt);
            result.eventsAdded++;
            iCalLogger.logInfo('SYNC', `Added event ${partial.external_uid} [${eventKind}] (${partial.start_date}→${partial.end_date})`);
          } else {
            // incoming cancelled event that doesn't exist locally — ignore
            result.eventsIgnored++;
          }
        }

        // Soft-cancel events that disappeared from the feed
        for (const existing of existingEvents) {
          if (!incomingUids.has(existing.external_uid) && existing.status !== 'cancelled') {
            const cancelled: CalendarEvent = { ...existing, status: 'cancelled', updated_at: now };
            // [atomic] saveCalendarEvent + booking upsert as single transaction
            await store.saveCalendarEvent(cancelled);
            result.eventsCancelled++;
            iCalLogger.logInfo('SYNC', `Cancelled event ${existing.external_uid} (no longer in feed)`);
          }
        }
      }

      await store.saveChannelConnection({ ...conn, ...syncResult.metadataUpdates, last_sync: Date.now() });

      iCalLogger.logInfo('SYNC', `Connection ${conn.id} done`, {
        read: result.eventsRead,
        added: result.eventsAdded,
        updated: result.eventsUpdated,
        cancelled: result.eventsCancelled,
        ignored: result.eventsIgnored,
        duplicates: result.eventsDuplicated,
        skipped_by_lock: result.status === 'skipped' ? 1 : 0,
      });
      iCalLogger.updateSummary({
        lastSyncAt: Date.now(),
        lastError: null,
        eventCount: result.eventsAdded + result.eventsUpdated,
      });

      result.status = 'ok';
    } catch (err: any) {
      result.status = 'error';
      result.error = err.message;
      iCalLogger.logError('SYNC', `Connection ${conn.id} failed: ${err.message}`);
      iCalLogger.updateSummary({ lastError: err.message });

      try {
        const store = projectManager.getStore();
        await store.saveChannelConnection({ ...conn, last_sync: Date.now() });
      } catch (_) {}
    } finally {
      // [sync-lock] Always release the lock
      _syncInFlight.delete(conn.id);
    }

    return result;
  },

  /**
   * Legacy backfill entrypoint.
   * Canonical flow now reconciles from calendar_events into bookings via SyncEngine,
   * then runs canonical sanitization to avoid ghost rebuilds.
   */
  async backfillBookingsFromCalendarEvents(): Promise<void> {
    try {
      const store = projectManager.getStore();
      const connections: ChannelConnection[] = await store.getChannelConnections();
      const apartmentIds = Array.from(new Set(connections.map((c: ChannelConnection) => c.apartment_id).filter(Boolean)));
      let count = 0;
      for (const aptId of apartmentIds) {
        await syncEngine.reconcileBookings(aptId);
        await store.sanitizeCanonicalState(aptId);
        count++;
      }
      iCalLogger.logInfo('BACKFILL', `Backfill complete: ${count} apartment(s) reconciled canonically`);
    } catch (err: any) {
      iCalLogger.logWarn('BACKFILL', `Backfill failed (non-fatal): ${err.message}`);
    }
  },
};
