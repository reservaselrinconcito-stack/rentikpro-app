
import { projectManager } from './projectManager';
import { ChannelConnection, CalendarEvent, Booking, ProvisionalBooking, AccountingMovement } from '../types';
import { getChannelPriority } from './priorityMap';
import { notifyDataChanged } from './dataRefresher';
import { networkMonitor } from './networkMonitor';
import { getAdapter } from './channelAdapters/factory';
import { isConfirmedBooking, isProvisionalBlock } from '../utils/bookingClassification';
import { ensureValidStay } from '../utils/dateLogic';

// PROXY ROTATION LOGIC
const OFFICIAL_WORKER = "https://rentikpro-cm-proxy.reservas-elrinconcito.workers.dev/cm-proxy";

const PROXY_LIST = (import.meta as any).env?.PROD
  ? [OFFICIAL_WORKER]
  : [
    OFFICIAL_WORKER,
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url="
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
  if (PROXY_LIST.length <= 1) return; // No rotation in prod
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
  const sDescription = (description ?? "") as string;
  // Look for patterns like "100 EUR", "€100", "Total: 100"
  const priceMatch = sDescription.match(/(?:Total|Precio|Price|Valor)?\s*[:=]?\s*([0-9.,]+)\s*(?:€|EUR|USD)/i) ||
    sDescription.match(/(?:€|EUR|USD)\s*([0-9.,]+)/i);

  if (priceMatch) {
    const rawPrice = priceMatch[1].replace(',', '.');
    price = parseFloat(rawPrice);
    if (isNaN(price)) price = 0;
  }

  return { guestName, price };
};

// HELPER: Merge Event Data into Booking protecting MANUAL fields
const mergeEventToBooking = (booking: Booking, evt: CalendarEvent, details: any, source: string, currentKind: 'BOOKING' | 'BLOCK') => {
  let fieldSources: Record<string, string> = {};
  if (booking.field_sources) {
    try {
      fieldSources = JSON.parse(booking.field_sources);
    } catch (e) { }
  }

  const protect = (field: string, newValue: any) => {
    if (fieldSources[field] === 'MANUAL') {
      console.log(`[SyncEngine] Protected MANUAL field: ${field} for booking ${booking.id}`);
      return (booking as any)[field];
    }
    return newValue;
  };

  booking.check_in = protect('check_in', evt.start_date);
  booking.check_out = protect('check_out', evt.end_date);
  booking.guest_name = protect('guest_name', details.guestName || booking.guest_name);

  if (fieldSources['total_price'] !== 'MANUAL') {
    if (details.price > 0) booking.total_price = details.price;
  }

  if (fieldSources['status'] !== 'MANUAL') {
    booking.status = currentKind === 'BLOCK' ? 'blocked' : 'confirmed';
    booking.event_kind = currentKind;
  }

  // Other potentially manual fields
  booking.guests = protect('guests', booking.guests);
  booking.payments = protect('payments', booking.payments);
  booking.payment_status = protect('payment_status', booking.payment_status);
  booking.payment_notes = protect('payment_notes', booking.payment_notes);

  booking.summary = protect('summary', evt.summary);
  booking.source = protect('source', source);

  // Technical fields
  booking.external_ref = evt.external_uid;
  booking.linked_event_id = evt.id;
  booking.connection_id = evt.connection_id;
  booking.ical_uid = evt.ical_uid || evt.external_uid;
  booking.raw_summary = evt.summary;
  booking.raw_description = evt.description;
  booking.event_origin = 'ical';
  booking.event_state = 'confirmed';
  booking.updated_at = Date.now();
};

export class SyncEngine {

  /**
   * Ejecuta el ciclo completo de sincronización para un apartamento:
   * 1. Delega la ingesta al Adaptador correspondiente (iCal vs API).
   * 2. Persiste los eventos crudos en DB.
   * 3. Concilia con Reservas.
   */
  async syncApartment(apartmentId: string, options?: { isAutomated?: boolean }): Promise<{ processed: number, conflicts: number, errors: string[] }> {
    const store = projectManager.getStore();
    const connections = await store.getChannelConnections(apartmentId);
    const errors: string[] = [];
    let totalProcessed = 0;

    // CHECK PROJECT MODE
    if (projectManager.getCurrentMode() === 'demo') {
      return { processed: 0, conflicts: 0, errors: [] };
    }

    // CHECK NETWORK
    if (!networkMonitor.isOnline()) {
      return { processed: 0, conflicts: 0, errors: ['Modo Offline: No se puede sincronizar.'] };
    }

    // PASO 1: INGESTA (Adapter -> DB)
    for (const conn of connections) {
      if (!conn.enabled) continue;

      // Skip automated retries for expired tokens (USER REQ: detener reintentos automáticos)
      if (options?.isAutomated && (conn.last_status === 'TOKEN_CADUCADO' || conn.last_status === 'INVALID_TOKEN')) {
        continue;
      }

      try {
        await this.ingestConnection(conn);
        totalProcessed++;
      } catch (err: any) {
        console.error(`Error syncing connection ${conn.alias}:`, err);
        errors.push(`${conn.alias}: ${err.message}`);

        conn.last_sync = Date.now();
        // Check for fatal flag or specific message (F2)
        if (err.fatal || err.message.includes('Token de Booking inválido') || err.message.includes('caducado')) {
          conn.last_status = 'TOKEN_CADUCADO';
        } else {
          conn.last_status = err.message.includes('Offline') ? 'OFFLINE' : 'ERROR';
        }
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

      // --- GUARDRAIL: Ensure stay dates are valid before saving to accounting ---
      const { checkIn: validCI, checkOut: validCO } = ensureValidStay(partialEvt.start_date || '', partialEvt.end_date || '');

      const movement: AccountingMovement = {
        id: crypto.randomUUID(),
        date: validCI,
        type: 'income',
        category: 'Alojamiento',
        concept: partialEvt.summary || 'Reserva iCal',
        apartment_id: conn.apartment_id,
        reservation_id: partialEvt.external_uid,
        platform: conn.channel_name,
        amount_gross: 0,
        amount_net: 0,
        commission: 0,
        vat: 0,
        payment_method: 'iCal',
        accounting_bucket: 'A',
        project_id: projectManager.getCurrentProjectId() || undefined,
        property_id: propertyId,
        check_in: validCI,
        check_out: validCO,
        guests: 1,
        source_event_type: 'STAY_RESERVATION',
        event_state: partialEvt.status === 'confirmed' ? 'confirmed' : 'provisional',
        ical_uid: partialEvt.ical_uid,
        connection_id: conn.id,
        raw_summary: partialEvt.summary,
        raw_description: partialEvt.description,
        movement_key: `ical-${partialEvt.external_uid}`,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const existingMv = await store.getMovementByKey(movement.movement_key!);
      if (existingMv) {
        movement.id = existingMv.id;
        movement.created_at = existingMv.created_at;
      }
      await store.saveMovement(movement);

      // Save raw event for legacy support (will be phased out)
      const evt: CalendarEvent = {
        id: crypto.randomUUID(),
        connection_id: conn.id,
        external_uid: partialEvt.external_uid,
        ical_uid: partialEvt.ical_uid,
        event_kind: partialEvt.event_kind,
        project_id: projectManager.getCurrentProjectId() || undefined,
        property_id: propertyId,
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

      const existing = existingEvents.find(e =>
        (partialEvt.ical_uid && e.ical_uid === partialEvt.ical_uid) ||
        e.external_uid === partialEvt.external_uid
      );
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

        // Also update accounting movement if cancellation found
        const mvKey = `ical-${existing.external_uid}`;
        const existingMv = await store.getMovementByKey(mvKey);
        if (existingMv) {
          existingMv.event_state = 'confirmed';
          existingMv.accounting_bucket = 'A';
          existingMv.updated_at = Date.now();
          // We can add a 'cancelled' state to movements too
          await store.saveMovement(existingMv);
        }
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

    const settings = await store.getSettings();
    const enableMinimal = settings.enable_minimal_bookings_from_ical;

    // DEBUG 2: Trace before sync
    const debugBookingId = localStorage.getItem('debug_revert_booking_id');
    if (debugBookingId) {
      const b = await store.getBooking(debugBookingId);
      console.log("[REVERT:BEFORE_SYNC]", {
        id: debugBookingId,
        price: b?.total_price,
        check_in: b?.check_in,
        sources: b?.field_sources
      });
    }

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

    // FETCH PROVISIONAL BOOKINGS FOR LINKING
    const allProvisionals = await store.getProvisionalBookings();
    // Filter pertinent to this apartment (fuzzy match on hint or by linking logic later)
    // We keep all for searching.

    // Track occupied ranges with priority info for equal-priority tie breaking
    const occupiedRanges: { start: string, end: string, bookingId: string, priority: number, isReal: boolean, kind: string }[] = [];
    let conflictCount = 0;

    // 1. Cargar Bloqueos Manuales (Prioridad 101 Implícita = Ganan Siempre)
    const manualBookings = apartmentBookings.filter(b => !b.external_ref && b.status !== 'cancelled' && !b.provisional_id);
    manualBookings.forEach(b => occupiedRanges.push({
      start: b.check_in,
      end: b.check_out,
      bookingId: b.id,
      priority: 101,
      isReal: isConfirmedBooking(b),
      kind: b.event_kind || (isConfirmedBooking(b) ? 'BOOKING' : 'BLOCK')
    }));

    // 2. PROCESS ACTIVE iCal EVENTS
    // We do this BEFORE ghost provisionals to ensure matching and prevent duplication.
    for (const evt of activeEvents) {
      const conn = connections.find(c => c.id === evt.connection_id);
      if (!conn) continue;

      let evtPriority = priorityMap.get(evt.connection_id) || 0;

      // ENRICHMENT: Extract details
      let details = extractBookingDetails(evt.summary, evt.description);
      const currentKind = evt.event_kind || (details.guestName ? 'BOOKING' : 'BLOCK');

      // --- LINKING LAYER ---
      const matchedProvisional = this.matchEventToProvisional(evt, conn, allProvisionals);
      if (matchedProvisional) {
        console.log(`[SyncEngine] PROVISIONAL_LINKED_CALENDAR_EVENT: ${matchedProvisional.id} -> ${evt.id}`);

        // Enrich Details from Provisional
        if (matchedProvisional.guest_name && (!details.guestName || details.guestName === '')) {
          details.guestName = matchedProvisional.guest_name;
        }
        if ((matchedProvisional.total_price || 0) > 0 && details.price === 0) {
          details.price = matchedProvisional.total_price!;
        }

        // Update Provisional State if needed
        let provUpdates = false;
        if (!matchedProvisional.linked_calendar_event_id) {
          matchedProvisional.linked_calendar_event_id = evt.id;
          provUpdates = true;
        }
        if (matchedProvisional.status !== 'CONFIRMED' && matchedProvisional.status !== 'CANCELLED') {
          matchedProvisional.status = 'CONFIRMED';
          provUpdates = true;
        }

        if (provUpdates) {
          await store.saveProvisionalBooking(matchedProvisional);
        }
      }

      const isManualBlock = !details.guestName; // SECURITY LAYER: No Guest = Manual Block

      // MODAL RESERVAS MÍNIMAS (Booking iCal)
      let isMinimalBooking = false;
      if (isManualBlock && enableMinimal && conn.channel_name === 'BOOKING') {
        isMinimalBooking = true;
        details.guestName = 'Booking.com (iCal)';
      }

      // Override Source & Priority for Manual Blocks
      let displaySource = conn.alias ? `${conn.channel_name} (${conn.alias})` : conn.channel_name;
      if (isManualBlock && !isMinimalBooking) {
        evtPriority = 101; // Force High Priority (Wins over standard OTAs)
        displaySource = 'CALENDARIO';
      } else if (isMinimalBooking) {
        displaySource = 'ota_ical';
      }

      // 1. Check if we already have a booking for this event (via external_ref)
      // OR if we have a booking from a matched provisional!
      let booking = apartmentBookings.find(b =>
        (b.external_ref && b.external_ref === evt.external_uid) ||
        (matchedProvisional && b.provisional_id === matchedProvisional.id)
      );

      // Check Collision with Higher or Equal Priority (Already Processed)
      const collidingRange = occupiedRanges.find(r => {
        // IGNORE COLLISION if it's the SAME booking (e.g. promoting a ghost that was already in occupiedRanges)
        if (booking && r.bookingId === booking.id) return false;
        return (evt.start_date < r.end) && (evt.end_date > r.start);
      });

      if (collidingRange) {
        // COLLISION DETECTED
        // BUSINESS RULE: Conflicts only between BOOKING vs BOOKING.
        // Blocks do not trigger main conflicts.
        const isCurrentlyConfirmed = isConfirmedBooking({ guest_name: details.guestName, total_price: details.price, event_kind: currentKind });
        const isConflict = isCurrentlyConfirmed && collidingRange.isReal && currentKind === 'BOOKING' && collidingRange.kind !== 'BLOCK';

        // 1. Mark Existing booking as conflict (if both real)
        const existingBooking = apartmentBookings.find(b => b.id === collidingRange.bookingId);
        if (existingBooking && isConflict) {
          existingBooking.conflict_detected = true;
          if (existingBooking.status === 'cancelled') existingBooking.status = 'confirmed'; // Revive to show conflict

          // Fix Source Label for Manual Bookings
          if (!existingBooking.external_ref && (!existingBooking.source || existingBooking.source === 'OTHER')) {
            existingBooking.source = 'CALENDARIO';
          }

          await store.saveBooking(existingBooking);
        }

        // 2. Process Current Event as Booking (flag conflict if both real)
        if (!booking) {
          booking = {
            id: crypto.randomUUID(),
            property_id: apartment.property_id,
            apartment_id: apartment.id,
            traveler_id: 'placeholder',
            check_in: evt.start_date,
            check_out: evt.end_date,
            status: currentKind === 'BLOCK' ? 'blocked' : 'confirmed',
            total_price: details.price,
            guests: 1,
            source: displaySource,
            external_ref: evt.external_uid,
            linked_event_id: evt.id,
            created_at: Date.now(),
            conflict_detected: isConflict,
            summary: evt.summary,
            guest_name: details.guestName || undefined,
            event_kind: currentKind,
            event_origin: 'ical',
            event_state: 'confirmed',
            provisional_id: matchedProvisional?.id,
            connection_id: evt.connection_id,
            ical_uid: evt.ical_uid || evt.external_uid,
            raw_summary: evt.summary,
            raw_description: evt.description
          };
          apartmentBookings.push(booking);
        } else {
          // PROMOTE or UPDATE existing
          booking.conflict_detected = isConflict;
          mergeEventToBooking(booking, evt, details, displaySource, currentKind);
        }

        await store.saveBooking(booking);
        if (isConflict) conflictCount++;

        // PERSIST LOCATOR FOR MINIMAL BOOKING
        if (isMinimalBooking) {
          const existingLocator = await store.getBookingLocator(booking.id);
          if (!existingLocator) {
            const { checkinService } = await import('./checkinService');
            const loc = checkinService.generateLocator(booking.check_in);
            booking.locator = loc;
            booking.notes = 'Datos limitados: Booking iCal no trae huésped/localizador';
            booking.ota = 'booking';
            await store.saveBookingLocator(booking.id, loc);
            await store.saveBooking(booking);
          }
        }

        // Add to occupied ranges to block lower priorities
        occupiedRanges.push({
          start: booking.check_in,
          end: booking.check_out,
          bookingId: booking.id,
          priority: evtPriority,
          isReal: isConfirmedBooking(booking),
          kind: booking.event_kind || (isConfirmedBooking(booking) ? 'BOOKING' : 'BLOCK')
        });

        continue;
      }

      // WON PRIORITY (No collision with higher/equal)
      if (booking) {
        booking.conflict_detected = false;
        mergeEventToBooking(booking, evt, details, displaySource, currentKind);
      } else {
        booking = {
          id: crypto.randomUUID(),
          property_id: apartment.property_id,
          apartment_id: apartment.id,
          traveler_id: 'placeholder',
          check_in: evt.start_date,
          check_out: evt.end_date,
          status: currentKind === 'BLOCK' ? 'blocked' : 'confirmed',
          total_price: details.price,
          guests: 1,
          source: displaySource,
          external_ref: evt.external_uid,
          linked_event_id: evt.id,
          created_at: Date.now(),
          conflict_detected: false,
          summary: evt.summary,
          guest_name: details.guestName || undefined,
          event_kind: currentKind,
          event_origin: 'ical',
          event_state: 'confirmed',
          provisional_id: matchedProvisional?.id,
          connection_id: evt.connection_id,
          ical_uid: evt.ical_uid || evt.external_uid,
          raw_summary: evt.summary,
          raw_description: evt.description
        };
        apartmentBookings.push(booking);
      }

      await store.saveBooking(booking);

      // PERSIST LOCATOR FOR MINIMAL BOOKING
      if (isMinimalBooking) {
        const existingLocator = await store.getBookingLocator(booking.id);
        if (!existingLocator) {
          const { checkinService } = await import('./checkinService');
          const loc = checkinService.generateLocator(booking.check_in);
          booking.locator = loc;
          booking.notes = 'Datos limitados: Booking iCal no trae huésped/localizador';
          booking.ota = 'booking';
          await store.saveBookingLocator(booking.id, loc);
          await store.saveBooking(booking);
        }
      }

      occupiedRanges.push({
        start: booking.check_in,
        end: booking.check_out,
        bookingId: booking.id,
        priority: evtPriority,
        isReal: isConfirmedBooking(booking),
        kind: booking.event_kind || (isConfirmedBooking(booking) ? 'BOOKING' : 'BLOCK')
      });
    }

    // 3. INGEST REMAINING "GHOST" PROVISIONALS
    // (Those that survived the iCal matching phase and still have no linked event)
    const validStatuses = ['CONFIRMED', 'HOLD', 'PENDING_CONFIRMATION'];
    const ghostProvisionals = allProvisionals.filter(p =>
      validStatuses.includes(p.status) &&
      !p.linked_calendar_event_id &&
      p.start_date && p.end_date &&
      (p.apartment_hint && apartment.name.toLowerCase().includes(p.apartment_hint.toLowerCase()))
    );

    for (const p of ghostProvisionals) {
      // Check if we already created a booking for this provisional
      let booking = apartmentBookings.find(b => b.provisional_id === p.id);

      if (!booking) {
        // Create new "Ghost" Booking
        booking = {
          id: crypto.randomUUID(),
          property_id: apartment.property_id,
          apartment_id: apartment.id,
          traveler_id: 'placeholder',
          check_in: p.start_date!,
          check_out: p.end_date!,
          status: 'confirmed',
          total_price: p.total_price || 0,
          guests: p.pax_adults || 1,
          source: `EMAIL_TRIGGER (${p.provider})`,
          provisional_id: p.id,
          created_at: Date.now(),
          summary: `Reserva ${p.provider} (Pending Sync)`,
          guest_name: p.guest_name,
          event_origin: 'other',
          event_state: 'provisional'
        };
        apartmentBookings.push(booking);
        await store.saveBooking(booking);
      } else {
        // Update if changed (e.g. user updated provisional via UI)
        if (booking.check_in !== p.start_date || booking.check_out !== p.end_date) {
          booking.check_in = p.start_date!;
          booking.check_out = p.end_date!;
          await store.saveBooking(booking);
        }
      }

      // Add to occupied ranges
      occupiedRanges.push({
        start: booking.check_in,
        end: booking.check_out,
        bookingId: booking.id,
        priority: 90,
        isReal: isConfirmedBooking(booking),
        kind: booking.event_kind || (isConfirmedBooking(booking) ? 'BOOKING' : 'BLOCK')
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
    await projectManager.saveProject();

    // 5. Notificar
    notifyDataChanged('all');
  }
  /**
   * Intenta vincular un evento de calendario con una reserva provisional (Email Ingest).
   */
  private matchEventToProvisional(evt: CalendarEvent, conn: ChannelConnection, provisionals: ProvisionalBooking[]): ProvisionalBooking | undefined {
    // 0. Check already linked
    const linked = provisionals.find(p => p.linked_calendar_event_id === evt.id);
    if (linked) return linked;

    const evtText = (evt.summary + ' ' + evt.description).toLowerCase();

    // 1. Match by Provider & ID (Direct)
    // Optim: Only check provisionals that match the provider
    const provider = conn.channel_name;

    const candidates = provisionals.filter(p => {
      if (p.linked_calendar_event_id) return false;
      if (p.provider !== 'OTHER' && p.provider !== provider) return false;
      return true;
    });

    // A. ID Match
    for (const p of candidates) {
      if (p.provider_reservation_id && evtText.includes(p.provider_reservation_id.toLowerCase())) {
        return p;
      }
    }

    // B. Fuzzy Window Match
    const dateMatch = candidates.find(p =>
      p.start_date === evt.start_date &&
      p.end_date === evt.end_date
    );

    if (dateMatch) {
      return dateMatch;
    }

    return undefined;
  }
}

export const syncEngine = new SyncEngine();
