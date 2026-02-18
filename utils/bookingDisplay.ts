
import { Booking, Traveler } from '../types';

/**
 * REGLA DE DISPLAY NAME (orden):
 * 1) traveler.nombre + traveler.apellidos (si traveler_id existe y se puede cargar)
 * 2) booking.guest_name (si existe y no está vacío)
 * 3) booking.summary (si existe - común en iCal)
 * 4) "Sin nombre"
 */
export const getBookingDisplayName = (booking: Booking, traveler?: Traveler): string => {
    if (traveler) {
        const fullName = `${traveler.nombre || ''} ${traveler.apellidos || ''}`.trim();
        if (fullName) return fullName;
    }

    if (booking.guest_name && booking.guest_name.trim()) {
        return booking.guest_name.trim();
    }

    if (booking.summary && booking.summary.trim()) {
        return booking.summary.trim();
    }

    return 'Sin nombre';
};
