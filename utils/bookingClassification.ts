import { Booking } from '../types';

/**
 * Normalizes a string by trimming whitespace and converting to lowercase.
 */
export const normalize = (s: string | null | undefined): string => {
    return (s || '').trim().toLowerCase();
};

/**
 * Checks if a guest name is a known placeholder for a blockage.
 * 
 * Ejemplos:
 * - "Blocked" -> true
 * - "Airbnb (Blocked)" -> true
 * - "Juan Perez" -> false
 * - "" -> true
 */
export const isPlaceholderGuestName = (name: string | null | undefined): boolean => {
    const normalized = normalize(name);
    if (!normalized) return true; // Vacío es redundante con "sin nombre real"

    const placeholders = [
        'blocked', 'unavailable', 'bloqueado', 'no disponible',
        'occupied', 'reservado', 'cierre', 'bloqueo'
    ];
    return placeholders.some(p => normalized.includes(p));
};

/**
 * hasRealGuest: tiene un nombre y no es un marcador de posición.
 */
export const hasRealGuest = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    return !isPlaceholderGuestName(booking.guest_name);
};

/**
 * hasAmountPositive: importe total estrictamente mayor que cero.
 */
export const hasAmountPositive = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    return (booking.total_price || 0) > 0;
};

/**
 * confirmed: tiene huésped real O tiene importe > 0.
 * 
 * Esto asegura que los iCal con nombre pero sin precio (muy común) sean tratados como reservas.
 */
export const isConfirmedBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    if (booking.event_kind === 'BLOCK') return false;
    if (booking.event_state === 'provisional') return false;
    // Fallback for legacy data or manual bookings
    return hasRealGuest(booking) || hasAmountPositive(booking);
};

/**
 * provisional(block): NO tiene huésped real Y (importe vacío o <= 0).
 */
export const isProvisionalBlock = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    if (booking.event_kind === 'BLOCK') return true;
    if (booking.event_state === 'provisional') return true;
    return !hasRealGuest(booking) && !hasAmountPositive(booking);
};

/**
 * isProvisionalBooking: checks if a booking originates from the provisional/ingest system.
 */
export const isProvisionalBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    return !!booking.provisional_id;
};

/**
 * overlaps: cálculo de solapamiento de fechas estándar.
 * Formato esperado: YYYY-MM-DD
 */
export const overlaps = (startA: string, endA: string, startB: string, endB: string): boolean => {
    return (startA < endB) && (endA > startB);
};

/**
 * covered: una booking provisional (bloqueo) está "cubierta" si solapa 
 * con alguna booking ya confirmada en el mismo apartamento.
 */
export const isCovered = (block: Partial<Booking>, confirmedBookings: Booking[]): boolean => {
    if (!block.check_in || !block.check_out) return false;

    return confirmedBookings.some(confirmed =>
        overlaps(block.check_in!, block.check_out!, confirmed.check_in, confirmed.check_out)
    );
};
/**
 * isSameDay: checks if two YYYY-MM-DD strings represent the same day.
 */
export const isSameDay = (date1: string | undefined, date2: string | undefined): boolean => {
    if (!date1 || !date2) return false;
    return date1 === date2;
};

/**
 * isOccupiedToday: checks if a booking is active today.
 * Logic: today >= checkin && today < checkout (the night of checkout is not counted).
 */
export const isOccupiedToday = (checkIn: string | undefined, checkOut: string | undefined, today: string): boolean => {
    if (!checkIn || !checkOut) return false;
    return today >= checkIn && today < checkOut;
};
