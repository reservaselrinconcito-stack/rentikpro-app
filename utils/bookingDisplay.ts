
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

    if (traveler) {
        const fullName = `${traveler.nombre || ''} ${traveler.apellidos || ''}`.trim();
        if (fullName) rawName = fullName;
    } else if (booking.guest_name && booking.guest_name.trim()) {
        rawName = booking.guest_name.trim();
    } else if (booking.summary && booking.summary.trim()) {
        rawName = booking.summary.trim();
    }

    // Strip leading digits: "0 Nombre" → "Nombre"
    // Handles: "2 John" (with space), "0" (alone), "42\tName" (tab)
    const cleaned = rawName.replace(/^\d+[\s]*/, '').trim();
    if (!cleaned) return 'Sin nombre';
    return cleaned;
};
