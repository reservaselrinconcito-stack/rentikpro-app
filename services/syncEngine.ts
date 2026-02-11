
import { projectManager } from './projectManager';
import { ChannelConnection, CalendarEvent, Booking } from '../types';
import { getChannelPriority } from './priorityMap';
import { notifyDataChanged } from './dataRefresher';
import { networkMonitor } from './networkMonitor';
import { getAdapter } from './channelAdapters/factory';

// Helper to get Proxy URL with strict validation (Exported for ICalAdapter usage)
export const getProxyUrl = () => {
  const stored = localStorage.getItem('rentikpro_proxy_url');
  const fallback = "https://rentikpro-cm-proxy.reservas-elrinconcito.workers.dev/cm-proxy";

  if (stored) {
    if (stored.startsWith('https://') && stored.includes('/cm-proxy')) {
      return stored;
    } else {
      console.warn("[SyncEngine] Proxy almacenado inválido o antiguo. Restableciendo a Worker oficial.");
      localStorage.removeItem('rentikpro_proxy_url');
    }
  }
  return fallback;
};

export class SyncEngine {
  
  /**
   * Ejecuta el ciclo completo de sincronización para un apartamento:
   * 1. Delega la ingesta al Adaptador correspondiente (iCal vs API).
   * 2. Persiste los eventos crudos en DB.
   * 3. Concilia con Reservas.
   */
  async syncApartment(apartmentId: string): Promise<{ processed: number, conflicts: number, errors: string[] }> {
    const store = projectManager.getStore();
    const connections = await store.getChannelConnections(apartmentId);
    const errors: string[] = [];
    let totalProcessed = 0;

    // CHECK NETWORK
    if (!networkMonitor.isOnline()) {
       return { processed: 0, conflicts: 0, errors: ['Modo Offline: No se puede sincronizar.'] };
    }

    // PASO 1: INGESTA (Adapter -> DB)
    for (const conn of connections) {
      if (!conn.enabled) continue;
      
      try {
        await this.ingestConnection(conn);
        totalProcessed++;
      } catch (err: any) {
        console.error(`Error syncing connection ${conn.alias}:`, err);
        errors.push(`${conn.alias}: ${err.message}`);
        
        conn.last_sync = Date.now();
        conn.last_status = err.message.includes('Offline') ? 'OFFLINE' : 'ERROR';
        conn.sync_log = `ERROR: ${err.message.substring(0, 50)}.`;
        await store.saveChannelConnection(conn);
      }
    }

    // PASO 2: CONCILIACIÓN (CalendarEvent -> Booking)
    const conflictCount = await this.reconcileBookings(apartmentId);

    notifyDataChanged('bookings');
    notifyDataChanged('all'); // Refresh UI

    return { processed: totalProcessed, conflicts: conflictCount, errors };
  }

  /**
   * Orquesta la llamada al adaptador y el guardado en base de datos.
   */
  private async ingestConnection(conn: ChannelConnection): Promise<void> {
    const store = projectManager.getStore();
    const adapter = getAdapter(conn); // Factory Select

    // Block 11-D: Resolve property_id from apartment
    const apartment = (await store.getAllApartments()).find(a => a.id === conn.apartment_id);
    const propertyId = apartment?.property_id || 'prop_default';

    // 1. PULL (Adapter Logic)
    const result = await adapter.pullReservations(conn);

    // 2. Update Connection Metadata
    conn.last_sync = Date.now();
    conn.last_status = 'OK';
    conn.sync_log = result.log;
    
    if (result.metadataUpdates) {
        Object.assign(conn, result.metadataUpdates);
    }
    await store.saveChannelConnection(conn);

    // If no events returned (e.g. 304 Not Modified), skip persistence
    if (result.events.length === 0 && result.log.includes('Sin cambios')) {
        return;
    }

    // 3. Persistence Logic (Diffing & Upserting)
    const existingEvents = await store.getCalendarEvents(conn.id);
    const processedUids = new Set<string>();

    for (const partialEvt of result.events) {
      if (!partialEvt.external_uid) continue;
      
      processedUids.add(partialEvt.external_uid);
      
      // Merge partial event with required fields for DB
      const evt: CalendarEvent = {
        id: crypto.randomUUID(),
        connection_id: conn.id,
        external_uid: partialEvt.external_uid,
        property_id: propertyId, // Block 11-D: Set derived propertyId
        apartment_id: conn.apartment_id,
        start_date: partialEvt.start_date || '',
        end_date: partialEvt.end_date || '',
        status: partialEvt.status || 'confirmed',
        summary: partialEvt.summary, 
        description: partialEvt.description,
        raw_data: partialEvt.raw_data, 
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const existing = existingEvents.find(e => e.external_uid === partialEvt.external_uid);
      if (existing) {
        evt.id = existing.id;
        evt.created_at = existing.created_at;
      }

      await store.saveCalendarEvent(evt);
    }

    // 4. Process Implicit Cancellations (Only if full sync, assumed for Pull)
    // Note: If 304 was returned, we wouldn't reach here, so existing events are safe.
    for (const existing of existingEvents) {
      if (!processedUids.has(existing.external_uid) && existing.status !== 'cancelled') {
        existing.status = 'cancelled';
        existing.updated_at = Date.now();
        await store.saveCalendarEvent(existing);
      }
    }
  }

  /**
   * Reglas de Negocio: Transforma eventos crudos en Reservas oficiales.
   * (Logic remains same as before)
   */
  public async reconcileBookings(apartmentId: string): Promise<number> {
    const store = projectManager.getStore();
    
    const apartment = (await store.getAllApartments()).find(a => a.id === apartmentId);
    if (!apartment) return 0;

    // Get Connections & Priorities
    const connections = await store.getChannelConnections(apartmentId);
    const priorityMap = new Map<string, number>();
    connections.forEach(c => priorityMap.set(c.id, c.priority || getChannelPriority(c.channel_name)));

    // Fetch all raw events
    let allRawEvents: CalendarEvent[] = [];
    for (const conn of connections) {
        const events = await store.getCalendarEvents(conn.id);
        allRawEvents.push(...events);
    }

    const activeEvents = allRawEvents.filter(e => e.status !== 'cancelled');

    // SORT BY PRIORITY DESC, THEN DATE ASC
    activeEvents.sort((a, b) => {
        const pA = priorityMap.get(a.connection_id) || 0;
        const pB = priorityMap.get(b.connection_id) || 0;
        if (pA !== pB) return pB - pA; // Higher priority first
        return a.start_date.localeCompare(b.start_date);
    });

    const existingBookings = await store.getBookings(); 
    const apartmentBookings = existingBookings.filter(b => b.apartment_id === apartmentId);

    const occupiedRanges: {start: string, end: string, bookingId: string}[] = [];
    let conflictCount = 0;

    // 1. Cargar Bloqueos Manuales (Prioridad 100 Implícita)
    const manualBookings = apartmentBookings.filter(b => !b.external_ref && b.status !== 'cancelled');
    manualBookings.forEach(b => occupiedRanges.push({ start: b.check_in, end: b.check_out, bookingId: b.id }));

    for (const evt of activeEvents) {
      const conn = connections.find(c => c.id === evt.connection_id);
      if (!conn) continue;

      // Check Collision with Higher Priority (Already Processed or Manual)
      const hasCollision = occupiedRanges.some(r => {
         return (evt.start_date < r.end) && (evt.end_date > r.start);
      });

      let booking = apartmentBookings.find(b => b.external_ref === evt.external_uid);

      if (hasCollision) {
         // LOST PRIORITY BATTLE -> Save as CONFLICTED Booking
         if (!booking) {
             booking = {
                id: crypto.randomUUID(),
                property_id: apartment.property_id,
                apartment_id: apartment.id,
                traveler_id: 'placeholder',
                check_in: evt.start_date,
                check_out: evt.end_date,
                status: 'confirmed',
                total_price: 0,
                guests: 1,
                source: conn.channel_name,
                external_ref: evt.external_uid,
                linked_event_id: evt.id,
                created_at: Date.now(),
                conflict_detected: true
             };
             apartmentBookings.push(booking);
         } else {
             booking.conflict_detected = true;
             if (booking.status === 'cancelled') booking.status = 'confirmed';
         }
         
         await store.saveBooking(booking);
         conflictCount++;
         continue; 
      }

      // WON PRIORITY
      if (booking) {
        if (booking.status === 'cancelled') booking.status = 'confirmed';
        if (booking.check_in !== evt.start_date || booking.check_out !== evt.end_date) {
           booking.check_in = evt.start_date;
           booking.check_out = evt.end_date;
        }
        booking.conflict_detected = false;
      } else {
        booking = {
          id: crypto.randomUUID(),
          property_id: apartment.property_id,
          apartment_id: apartment.id,
          traveler_id: 'placeholder',
          check_in: evt.start_date,
          check_out: evt.end_date,
          status: 'confirmed',
          total_price: 0,
          guests: 1,
          source: conn.channel_name,
          external_ref: evt.external_uid,
          linked_event_id: evt.id,
          created_at: Date.now(),
          conflict_detected: false
        };
        apartmentBookings.push(booking);
      }

      await store.saveBooking(booking);
      occupiedRanges.push({ start: booking.check_in, end: booking.check_out, bookingId: booking.id });
    }

    // HANDLE DELETIONS
    const cancelledRawEvents = allRawEvents.filter(e => e.status === 'cancelled');
    for (const evt of cancelledRawEvents) {
       const b = apartmentBookings.find(b => b.external_ref === evt.external_uid);
       if (b && b.status !== 'cancelled') {
          b.status = 'cancelled';
          await store.saveBooking(b);
       }
    }

    return conflictCount;
  }
}

export const syncEngine = new SyncEngine();
