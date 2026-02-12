
import { projectManager } from './projectManager';
import { ChannelConnection, CalendarEvent, Booking } from '../types';
import { getChannelPriority } from './priorityMap';
import { notifyDataChanged } from './dataRefresher';
import { networkMonitor } from './networkMonitor';
import { getAdapter } from './channelAdapters/factory';

// PROXY ROTATION LOGIC
const PROXY_LIST = [
  "https://rentikpro-cm-proxy.reservas-elrinconcito.workers.dev/cm-proxy", // Primary (CF Worker)
  "https://corsproxy.io/?", // Backup 1 (Public)
  "https://api.allorigins.win/raw?url=" // Backup 2 (For simple GETs)
];

let currentProxyIndex = 0;

export const getProxyUrl = () => {
  const stored = localStorage.getItem('rentikpro_proxy_url');

  // Prioritize stored proxy if valid
  if (stored && stored.startsWith('https://')) {
    return stored;
  }

  return PROXY_LIST[currentProxyIndex];
};

export const rotateProxy = () => {
  currentProxyIndex = (currentProxyIndex + 1) % PROXY_LIST.length;
  console.log(`[SyncEngine] Rotating Proxy to index ${currentProxyIndex}: ${PROXY_LIST[currentProxyIndex]}`);
};

// HELPER: Extract Guest Name & Price
const extractBookingDetails = (summary: string = '', description: string = '') => {
  const fullText = (summary + ' ' + description).trim();

  // 1. Cleaning for Safe Name
  let guestName = summary.replace(/Reserva|Reservation|Booking|Confirmed|Tentative/gi, '').trim();

  // Clean platform specifics
  guestName = guestName.replace(/\(Airbnb\)|\(Booking\.com\)|\(Vrbo\)|\(Expedia\)/gi, '').trim();

  // If empty or generic, return null to trigger manual block logic
  if (!guestName || guestName.length < 3 || /^\d+$/.test(guestName)) {
    guestName = '';
  }

  // 2. Extract Price (Simple Regex for standard formats)
  let price = 0;
  // Look for patterns like "100 EUR", "€100", "Total: 100"
  const priceMatch = description.match(/(?:Total|Precio|Price|Valor)?\s*[:=]?\s*([0-9.,]+)\s*(?:€|EUR|USD)/i) ||
    description.match(/(?:€|EUR|USD)\s*([0-9.,]+)/i);

  if (priceMatch) {
    const rawPrice = priceMatch[1].replace(',', '.');
    price = parseFloat(rawPrice);
    if (isNaN(price)) price = 0;
  }

  return { guestName, price };
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
   * ENRICHED: Extracts Guest Name, Price, and enforce Manual Block rules.
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

    // Track occupied ranges with priority info for equal-priority tie breaking
    const occupiedRanges: { start: string, end: string, bookingId: string, priority: number }[] = [];
    let conflictCount = 0;

    // 1. Cargar Bloqueos Manuales (Prioridad 101 Implícita = Ganan Siempre)
    const manualBookings = apartmentBookings.filter(b => !b.external_ref && b.status !== 'cancelled');
    manualBookings.forEach(b => occupiedRanges.push({
      start: b.check_in,
      end: b.check_out,
      bookingId: b.id,
      priority: 101
    }));

    for (const evt of activeEvents) {
      const conn = connections.find(c => c.id === evt.connection_id);
      if (!conn) continue;

      let evtPriority = priorityMap.get(evt.connection_id) || 0;

      // ENRICHMENT: Extract details
      const details = extractBookingDetails(evt.summary, evt.description);
      const isManualBlock = !details.guestName; // SECURITY LAYER: No Guest = Manual Block

      // Override Source & Priority for Manual Blocks
      let displaySource = conn.alias ? `${conn.channel_name} (${conn.alias})` : conn.channel_name;
      if (isManualBlock) {
        evtPriority = 101; // Force High Priority (Wins over standard OTAs)
        displaySource = 'CALENDARIO';
      }

      // Check Collision with Higher or Equal Priority (Already Processed)
      // Since we sort DESC, any existing range is either HIGHER or EQUAL priority.
      const collidingRange = occupiedRanges.find(r => {
        return (evt.start_date < r.end) && (evt.end_date > r.start);
      });

      let booking = apartmentBookings.find(b => b.external_ref === evt.external_uid);

      if (collidingRange) {
        // COLLISION DETECTED

        // EMPATE DE PRIORIDAD O COLISIÓN NORMAL -> MARCAR AMBOS COMO CONFLICTO
        // 1. Mark Existing booking as conflict
        const existingBooking = apartmentBookings.find(b => b.id === collidingRange.bookingId);
        if (existingBooking) {
          existingBooking.conflict_detected = true;
          if (existingBooking.status === 'cancelled') existingBooking.status = 'confirmed'; // Revive to show conflict

          // Fix Source Label for Manual Bookings
          if (!existingBooking.external_ref && (!existingBooking.source || existingBooking.source === 'OTHER')) {
            existingBooking.source = 'CALENDARIO';
          }

          await store.saveBooking(existingBooking);
        }

        // 2. Process Current Event as Conflict (Always happens on collision)
        if (!booking) {
          booking = {
            id: crypto.randomUUID(),
            property_id: apartment.property_id,
            apartment_id: apartment.id,
            traveler_id: 'placeholder',
            check_in: evt.start_date,
            check_out: evt.end_date,
            status: 'confirmed', // Confirmed but conflicted
            total_price: details.price,
            guests: 1,
            source: displaySource,
            external_ref: evt.external_uid,
            linked_event_id: evt.id,
            created_at: Date.now(),
            conflict_detected: true,
            summary: evt.summary,
            guest_name: details.guestName || undefined
          };
          apartmentBookings.push(booking);
        } else {
          booking.conflict_detected = true;
          if (booking.status === 'cancelled') booking.status = 'confirmed';
          // Update details
          booking.summary = evt.summary;
          booking.guest_name = details.guestName || undefined;
          booking.total_price = details.price > 0 ? details.price : booking.total_price;
          booking.source = displaySource;
          booking.check_in = evt.start_date;
          booking.check_out = evt.end_date;
        }

        await store.saveBooking(booking);
        conflictCount++;

        // Add to occupied ranges to block lower priorities
        occupiedRanges.push({
          start: booking.check_in,
          end: booking.check_out,
          bookingId: booking.id,
          priority: evtPriority
        });

        continue;
      }

      // WON PRIORITY (No collision with higher/equal)
      if (booking) {
        if (booking.status === 'cancelled') booking.status = 'confirmed';
        if (booking.check_in !== evt.start_date || booking.check_out !== evt.end_date) {
          booking.check_in = evt.start_date;
          booking.check_out = evt.end_date;
        }
        booking.summary = evt.summary; // Update summary
        booking.guest_name = details.guestName || undefined;
        booking.total_price = details.price > 0 ? details.price : booking.total_price;
        booking.source = displaySource;
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
          total_price: details.price,
          guests: 1,
          source: displaySource,
          external_ref: evt.external_uid,
          linked_event_id: evt.id,
          created_at: Date.now(),
          conflict_detected: false,
          summary: evt.summary,
          guest_name: details.guestName || undefined
        };
        apartmentBookings.push(booking);
      }

      await store.saveBooking(booking);
      occupiedRanges.push({
        start: booking.check_in,
        end: booking.check_out,
        bookingId: booking.id,
        priority: evtPriority
      });
    }

    // HANDLE DELETIONS (Events disappeared from feed)
    const cancelledRawEvents = allRawEvents.filter(e => e.status === 'cancelled');
    for (const evt of cancelledRawEvents) {
      const b = apartmentBookings.find(b => b.external_ref === evt.external_uid);
      if (b && b.status !== 'cancelled') {
        b.status = 'cancelled';
        // Also clear conflict flag if it was conflicted
        b.conflict_detected = false;
        await store.saveBooking(b);
      }
    }

    return conflictCount;
  }

  /**
   * Elimina una conexión y limpia todos sus datos asociados (Eventos y Reservas).
   * Ejecuta reconciliación inmediata para el apartamento afectado.
   */
  public async deleteConnection(connectionId: string): Promise<void> {
    const store = projectManager.getStore();

    // 1. Obtener info para saber el apartamento antes de borrar
    const conns = await store.getChannelConnections(); // Inefficient but safe if no direct getById
    const conn = conns.find(c => c.id === connectionId);

    if (!conn) {
      // Si no existe, intentamos borrar por ID por si acaso quedaron restos
      await store.deleteChannelConnection(connectionId);
      await store.deleteCalendarEventsByConnection(connectionId);
      return;
    }

    const apartmentId = conn.apartment_id;

    // 2. Borrar Conexión
    await store.deleteChannelConnection(connectionId);

    // 3. Borrar Eventos Huérfanos
    await store.deleteCalendarEventsByConnection(connectionId);

    // 4. Re-conciliar (Esto limpiará las bookings asociadas a esos eventos borrados)
    await this.reconcileBookings(apartmentId);

    // 5. Notificar
    notifyDataChanged('all');
  }
}

export const syncEngine = new SyncEngine();
