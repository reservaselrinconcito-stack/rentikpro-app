
import { projectManager } from './projectManager';
import { BookingRequestSchema, Booking, Traveler, BookingPriceSnapshot } from '../types';
import { pricingEngine } from './pricingEngine';

export class BookingRequestImporter {

  async import(jsonContent: string): Promise<{ success: boolean; message: string; bookingId?: string }> {
    const store = projectManager.getStore();
    let request: BookingRequestSchema;

    // 1. Parse & Schema Check
    try {
      request = JSON.parse(jsonContent);
      if (request.schema !== 'rentikpro.booking_request.v1.1') {
        return { success: false, message: 'Esquema de archivo no soportado o versión incorrecta (se esperaba v1.1).' };
      }
    } catch (e) {
      return { success: false, message: 'El archivo no es un JSON válido.' };
    }

    // 2. Idempotency Check (Prevent Duplicates)
    const existingBookings = await store.getBookings();
    const duplicate = existingBookings.find(b => b.external_ref === request.idempotencyKey);
    if (duplicate) {
      return { success: false, message: `Esta solicitud ya fue importada previamente (ID: ${duplicate.id}).` };
    }

    // 3. Unit Validation
    const apartment = (await store.getAllApartments()).find(a => a.id === request.stay.unitId);
    if (!apartment) {
      return { success: false, message: `La unidad solicitada (${request.stay.unitId}) no existe en este proyecto.` };
    }

    // 4. Guest Handling (Find or Create)
    let travelerId: string;
    const travelers = await store.getTravelers();
    // Simple match by email
    const existingTraveler = travelers.find(t => t.email.toLowerCase() === request.guest.email.toLowerCase());

    if (existingTraveler) {
      travelerId = existingTraveler.id;
      // Optional: Update phone if missing
      if (!existingTraveler.telefono && request.guest.phone) {
        existingTraveler.telefono = request.guest.phone;
        await store.saveTraveler(existingTraveler);
      }
    } else {
      travelerId = crypto.randomUUID();
      const newTraveler: Traveler = {
        id: travelerId,
        nombre: request.guest.name.split(' ')[0], // Simple heuristic
        apellidos: request.guest.name.split(' ').slice(1).join(' ') || '.',
        email: request.guest.email,
        telefono: request.guest.phone,
        tipo_documento: 'OTRO', // Pending verification
        documento: 'PENDIENTE',
        fecha_nacimiento: '',
        nacionalidad: '',
        created_at: Date.now(),
        updated_at: Date.now()
      };
      await store.saveTraveler(newTraveler);
    }

    let warningMessage = "";
    let conflictDetected = false;

    // 5. Re-quote and validate price & availability
    try {
      const liveQuote = await pricingEngine.quote(
        request.stay.unitId,
        request.stay.from,
        request.stay.to,
        request.stay.guests,
        request.stay.ratePlanId
      );

      // A. Price validation
      if (liveQuote.grandTotal !== request.priceQuote.grandTotal) {
        conflictDetected = true;
        warningMessage += `Discrepancia de precio: Cliente vio ${request.priceQuote.grandTotal / 100}€, sistema calcula ${liveQuote.grandTotal / 100}€.`;
      }

      // B. Availability check from quote engine's restrictions
      if (liveQuote.restrictions.violation) {
        conflictDetected = true;
        warningMessage += ` Conflicto de disponibilidad/restricción: ${liveQuote.restrictions.violation}`;
      }

      // C. Legacy availability check (belt and braces)
      const overlaps = existingBookings.filter(b =>
        b.apartment_id === apartment.id &&
        b.status !== 'cancelled' &&
        b.check_in < request.stay.to &&
        b.check_out > request.stay.from
      );
      if (overlaps.length > 0) {
        conflictDetected = true;
        warningMessage += ` Las fechas ya están ocupadas.`;
      }

      // 6. Create Booking
      const newBooking: Booking = {
        id: crypto.randomUUID(),
        property_id: apartment.property_id,
        apartment_id: apartment.id,
        traveler_id: travelerId,
        check_in: request.stay.from,
        check_out: request.stay.to,
        guests: request.stay.guests,
        total_price: request.priceQuote.grandTotal, // Use the price the client saw
        status: 'pending', // Always pending for review
        source: 'WEBSITE_IMPORT',
        external_ref: request.idempotencyKey,
        conflict_detected: conflictDetected,
        rate_plan_id: request.stay.ratePlanId,
        created_at: new Date(request.createdAt).getTime() || Date.now()
      };

      await store.saveBooking(newBooking);

      // 7. Save Price Snapshot (always, for audit)
      const snapshot: BookingPriceSnapshot = {
        bookingId: newBooking.id,
        snapshotJson: JSON.stringify({
          request: request.priceQuote,
          liveQuote: liveQuote,
          warning: warningMessage
        }),
        createdAt: Date.now()
      };
      await store.saveBookingPriceSnapshot(snapshot);

      // Guest message removed from logging for privacy/security

      return {
        success: true,
        message: conflictDetected
          ? `Importado con ADVERTENCIAS. Revisar manualmente. ${warningMessage}`
          : `Solicitud importada correctamente. Requiere confirmación manual.`,
        bookingId: newBooking.id
      };

    } catch (e: any) {
      return { success: false, message: `Error al recalcular el precio: ${e.message}` };
    }
  }
}

export const bookingRequestImporter = new BookingRequestImporter();
