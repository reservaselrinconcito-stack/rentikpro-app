
import { Booking, Traveler } from '../types';

/**
 * REGLA DE DISPLAY NAME (orden):
 * 1) traveler.nombre + traveler.apellidos (si traveler_id existe y se puede cargar)
 * 2) booking.guest_name (si existe y no está vacío)
 * 3) booking.summary (si existe - común en iCal)
 * 4) "Sin nombre"
 */
export const getBookingDisplayName = (booking: Booking, traveler?: Traveler): string => {
    // 1. Prioridad: Traveler vinculado (si tiene datos reales)
    if (traveler) {
        const fullName = `${traveler.nombre || ''} ${traveler.apellidos || ''}`.trim();
        if (fullName) return fullName;
    }

    // 2. Prioridad: Nombre manual en reserva (si existe)
    if (booking.guest_name && booking.guest_name.trim()) {
        return booking.guest_name.trim();
    }

    // 3. Prioridad: Resumen iCal/OTA (ej: "Juan Perez (Airbnb)")
    if (booking.summary && booking.summary.trim()) {
        return booking.summary.trim();
    }

    // 4. Fallback: Fuente
    return booking.source || 'Sin nombre';
};
