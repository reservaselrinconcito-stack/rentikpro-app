
import { Booking, Traveler } from '../types';

/**
 * REGLA DE DISPLAY NAME (orden):
 * 1) traveler.nombre + traveler.apellidos (si traveler_id existe y se puede cargar)
 * 2) booking.guest_name (si existe y no está vacío)
 * 3) booking.summary (si existe - común en iCal)
 * 4) "Sin nombre"
 */
export const getBookingDisplayName = (booking: Booking, traveler?: Traveler): string => {
    const fullName = traveler
        ? `${traveler.nombre || ''} ${traveler.apellidos || ''}`.trim()
        : '';

    const rawName =
        fullName ||
        booking.guest_name?.trim() ||
        booking.summary?.trim() ||
        'Sin nombre';

    // Strip leading digits: "0 Nombre" → "Nombre"
    // Handles: "2 John" (with space), "0" (alone), "42\tName" (tab)
    const cleaned = rawName.replace(/^\d+[\s]*/, '').trim();
    if (!cleaned) return 'Sin nombre';
    return cleaned;
};
