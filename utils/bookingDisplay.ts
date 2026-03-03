
import { Booking, Traveler } from '../types';

/**
 * REGLA DE DISPLAY NAME (orden):
 * 1) traveler.nombre + traveler.apellidos (si traveler_id existe y se puede cargar)
 * 2) booking.guest_name (si existe y no está vacío)
 * 3) booking.summary (si existe - común en iCal)
 * 4) "Sin nombre"
 */
export const getBookingDisplayName = (booking: Booking, traveler?: Traveler): string => {
    let rawName = 'Sin nombre';

    // 1. Prioridad: Traveler vinculado (si tiene datos reales)
    if (traveler) {
        const fullName = `${traveler.nombre || ''} ${traveler.apellidos || ''}`.trim();
        if (fullName) rawName = fullName;
    }
    // 2. Prioridad: Nombre manual en reserva (si existe)
    else if (booking.guest_name && booking.guest_name.trim()) {
        rawName = booking.guest_name.trim();
    }
    // 3. Prioridad: Resumen iCal/OTA (ej: "Juan Perez (Airbnb)")
    else if (booking.summary && booking.summary.trim()) {
        rawName = booking.summary.trim();
    }

    // CLEANUP: Eliminar prefijos de PAX accidentales (ej: "0 ", "2 ", etc. al principio del nombre)
    // Algunos iCals o lógica de importación pueden prefijar el pax.
    // Solo limpiamos si el patrón es "DIGITO(S) ESPACIO Nombre"
    return rawName.replace(/^\d+\s+/, '').trim() || 'Sin nombre';
};
