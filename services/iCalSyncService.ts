/**
 * iCalSyncService.ts
 * 
 * Orchestrates pull-and-persist for iCal channel connections.
 * - Pulls events via ICalAdapter
 * - Upserts into calendar_events table (idempotent by external_uid + connection_id)
 * - Marks disappeared events as cancelled (soft delete)
 * - Converts BOOKING events to bookings table (non-destructive)
 * - Updates connection metadata (last_sync, last_error, etc.)
 *
 * NOTE: Uses saveCalendarEvent (INSERT OR REPLACE) and getCalendarEvents(connectionId)
 * which are the actual method names in sqliteStore.ts.
 * ChannelConnection.last_sync (number) is the field used (not last_sync_at).
 */

import { ICalAdapter } from './channelAdapters/icalAdapter';
import { projectManager } from './projectManager';
import { iCalLogger } from './iCalLogger';
import { dedupeEvents, computeFingerprint } from './iCalDedupeService';
import type { ChannelConnection, CalendarEvent, Booking } from '../types';

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
  const bookingId = `ical_${conn.id}_${evt.external_uid}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const eventKind = (evt as any).event_kind || 'BOOKING';
  const status = evt.status === 'cancelled' ? 'cancelled' : (eventKind === 'BLOCK' ? 'blocked' : 'confirmed');

  const booking: Booking = {
    id: bookingId,
    property_id: propertyId || evt.property_id || '',
    apartment_id: conn.apartment_id || evt.apartment_id || '',
    traveler_id: '',
    check_in: evt.start_date,
    check_out: evt.end_date,
    status: status as any,
    total_price: 0,
    guests: 0,
    source: conn.channel_name || 'ical',
    external_ref: evt.external_uid,
    linked_event_id: evt.id,
    summary: evt.summary || (eventKind === 'BLOCK' ? 'Bloqueo OTA' : 'Reserva Externa'),
    guest_name: evt.summary || (eventKind === 'BLOCK' ? 'Bloqueo OTA' : ''),
    event_kind: eventKind,
    event_origin: 'ical',
    event_state: 'confirmed',
    connection_id: conn.id,
    ical_uid: evt.external_uid,
    raw_summary: evt.summary,
    raw_description: evt.description,
    created_at: evt.created_at || now,
    ota: conn.channel_name || null,
    project_id: localStorage.getItem('active_project_id') || undefined,
  } as any;

  await store.saveBooking(booking);
}

const adapter = new ICalAdapter();

export interface SyncConnectionResult {
  connectionId: string;
  apartmentId: string;
  status: 'ok' | 'no_changes' | 'blocked' | 'error';
  eventsAdded: number;
  eventsUpdated: number;
  eventsCancelled: number;
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

    iCalLogger.logInfo('SYNC_ALL', `Starting sync for ${enabled.length} connection(s)`);
    const results: SyncConnectionResult[] = [];
    for (const conn of enabled) {
      const result = await this.syncConnection(conn);
      results.push(result);
    }

    // Cross-connection dedupe: after all syncs, dedupe all active events per apartment
    try {
      await this.runDedupeForAll(apartmentId);
    } catch (e: any) {
      iCalLogger.logWarn('DEDUPE', `Dedupe step failed (non-fatal): ${e.message}`);
    }

    return results;
  },

  async runDedupeForAll(apartmentId?: string): Promise<void> {
    const store = projectManager.getStore();
    const connections = await store.getChannelConnections(apartmentId);
    const channelMap = new Map(connections.map((c: ChannelConnection) => [c.id, c.channel_name || '']));

    // Build a map of all events grouped by apartment
    const allEvents: CalendarEvent[] = await store.getCalendarEvents();
    const byApartment = new Map<string, CalendarEvent[]>();
    for (const evt of allEvents) {
      if (evt.status === 'cancelled') continue;
      const key = evt.apartment_id || evt.property_id || 'unknown';
      if (!byApartment.has(key)) byApartment.set(key, []);
      byApartment.get(key)!.push(evt);
    }

    for (const [, events] of byApartment) {
      const { masters, duplicates } = dedupeEvents(events, channelMap);
      for (const evt of masters) {
        await store.saveCalendarEvent(evt);
        // Propagate is_duplicate=0 to linked booking if exists
        if ((evt as any).booking_id) {
          await store.executeWithParams(
            'UPDATE bookings SET is_duplicate = 0 WHERE id = ?',
            [(evt as any).booking_id]
          ).catch(() => {});
        }
      }
      for (const evt of duplicates) {
        await store.saveCalendarEvent(evt);
        // Propagate is_duplicate=1 to linked booking so calendar filters it out
        if ((evt as any).booking_id) {
          await store.executeWithParams(
            'UPDATE bookings SET is_duplicate = 1 WHERE id = ?',
            [(evt as any).booking_id]
          ).catch(() => {});
        }
      }
    }
    iCalLogger.logInfo('DEDUPE', `Dedupe complete`);
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
      eventsAdded: 0,
      eventsUpdated: 0,
      eventsCancelled: 0,
      log: '',
    };

    try {
      iCalLogger.logInfo('SYNC', `Syncing connection ${conn.id} (${conn.channel_name})`, { url: conn.ical_url?.substring(0, 40) });

      // Fetch apartment to obtain property_id for booking bridge
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
        await store.saveChannelConnection({
          ...conn,
          ...syncResult.metadataUpdates,
          last_sync: Date.now(),
        });
        iCalLogger.logWarn('SYNC', `Connection ${conn.id} blocked by provider`);
        return result;
      }

      if (syncResult.log.includes('Sin cambios')) {
        result.status = 'no_changes';
        await store.saveChannelConnection({
          ...conn,
          ...syncResult.metadataUpdates,
          last_sync: Date.now(),
        });
        return result;
      }

      // Persist events
      const incomingEvents = syncResult.events;
      if (incomingEvents.length > 0) {
        const now = Date.now();
        // getCalendarEvents(connectionId) returns events for this connection
        const existingEvents: CalendarEvent[] = await store.getCalendarEvents(conn.id);
        const existingByUid = new Map(existingEvents.map((e: CalendarEvent) => [e.external_uid, e]));
        const incomingUids = new Set(incomingEvents.map((e: any) => e.external_uid));

        for (const partial of incomingEvents) {
          const existing = existingByUid.get(partial.external_uid!);
          const isCancelled = partial.status === 'cancelled';

          if (existing) {
            // Update if changed
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
                updated_at: now,
              } as CalendarEvent;
              await store.saveCalendarEvent(updated);
              await upsertBookingFromCalendarEvent(store, updated, conn, now, propertyId);
              result.eventsUpdated++;
            }
          } else if (!isCancelled) {
            // New event
            const newEvt: CalendarEvent = {
              id: `cev-${conn.id}-${partial.external_uid}-${now}`.slice(0, 64),
              connection_id: conn.id,
              apartment_id: conn.apartment_id,
              external_uid: partial.external_uid!,
              ical_uid: partial.ical_uid || partial.external_uid!,
              event_kind: partial.event_kind || 'BOOKING',
              start_date: partial.start_date!,
              end_date: partial.end_date!,
              status: partial.status || 'confirmed',
              summary: partial.summary || '',
              description: partial.description || '',
              raw_data: partial.raw_data || '',
              source: conn.channel_name || 'ICAL',
              created_at: now,
              updated_at: now,
            } as unknown as CalendarEvent;
            (newEvt as any).fingerprint = computeFingerprint(newEvt);
            await store.saveCalendarEvent(newEvt);
            await upsertBookingFromCalendarEvent(store, newEvt, conn, now, propertyId);
            result.eventsAdded++;
          }
        }

        // Soft-cancel events that disappeared from the feed
        for (const existing of existingEvents) {
          if (!incomingUids.has(existing.external_uid) && existing.status !== 'cancelled') {
            const cancelled: CalendarEvent = {
              ...existing,
              status: 'cancelled',
              updated_at: now,
            };
            await store.saveCalendarEvent(cancelled);
            await upsertBookingFromCalendarEvent(store, cancelled, conn, now, propertyId);
            result.eventsCancelled++;
          }
        }
      }

      // Update connection metadata
      await store.saveChannelConnection({
        ...conn,
        ...syncResult.metadataUpdates,
        last_sync: Date.now(),
      });

      iCalLogger.logInfo('SYNC', `Connection ${conn.id} synced OK`, {
        added: result.eventsAdded,
        updated: result.eventsUpdated,
        cancelled: result.eventsCancelled,
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
        await store.saveChannelConnection({
          ...conn,
          last_sync: Date.now(),
        });
      } catch (_) {}
    }

    return result;
  },

  /**
   * One-time backfill: bridge all existing calendar_events into bookings table.
   * Call this on app startup to ensure pre-existing iCal events are visible in calendar.
   */
  async backfillBookingsFromCalendarEvents(): Promise<void> {
    try {
      const store = projectManager.getStore();
      const connections: ChannelConnection[] = await store.getChannelConnections();
      const connMap = new Map(connections.map((c: ChannelConnection) => [c.id, c]));
      const apts = await store.getAllApartments();
      const aptMap = new Map(apts.map((a: any) => [a.id, a]));

      const allEvents: CalendarEvent[] = await store.getCalendarEvents();
      const active = allEvents.filter((e: CalendarEvent) => e.status !== 'cancelled' && e.connection_id);

      iCalLogger.logInfo('BACKFILL', `Backfilling ${active.length} calendar_events → bookings`);

      const now = Date.now();
      let count = 0;
      for (const evt of active) {
        const conn = connMap.get(evt.connection_id);
        if (!conn) continue;
        const apt = aptMap.get(conn.apartment_id);
        const propertyId = apt?.property_id;
        await upsertBookingFromCalendarEvent(store, evt, conn, now, propertyId);
        count++;
      }
      iCalLogger.logInfo('BACKFILL', `Backfill complete: ${count} bookings upserted`);
    } catch (err: any) {
      iCalLogger.logWarn('BACKFILL', `Backfill failed (non-fatal): ${err.message}`);
    }
  },
};
