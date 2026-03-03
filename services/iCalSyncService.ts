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
import type { ChannelConnection, CalendarEvent } from '../types';

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
              // saveCalendarEvent uses INSERT OR REPLACE
              await store.saveCalendarEvent({
                ...existing,
                ...partial,
                connection_id: conn.id,
                apartment_id: conn.apartment_id,
                updated_at: now,
              } as CalendarEvent);
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
            result.eventsAdded++;
          }
        }

        // Soft-cancel events that disappeared from the feed
        for (const existing of existingEvents) {
          if (!incomingUids.has(existing.external_uid) && existing.status !== 'cancelled') {
            await store.saveCalendarEvent({
              ...existing,
              status: 'cancelled',
              updated_at: now,
            });
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
};
