import { AccountingMovement, Booking } from '../types';

export type BookingEntityClass = 'REAL_BOOKING' | 'OTA_BLOCK' | 'REAL_CONFLICT' | 'PENDING_PROVISIONAL' | 'CANCELLED' | 'UNKNOWN';
export type AccountingEntityClass = 'OPERATIONAL' | 'OTA_BLOCK' | 'PENDING_PROVISIONAL' | 'UNKNOWN';

const OTA_SOURCE_RE = /(booking|airbnb|vrbo|ical)/i;
const PENDING_ENRICHMENT = new Set(['PENDING', 'PENDING_DETAILS', 'INQUIRY', 'HOLD', 'PENDING_CONFIRMATION']);

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
        'occupied', 'reservado', 'cierre', 'bloqueo',
        'guest', 'reserved', 'not available', 'booking',
        'booking.com', 'airbnb', 'vrbo', 'expedia'
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

export const isImportedOtaRecord = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    return booking.event_origin === 'ical' || !!booking.external_ref || !!booking.ical_uid || !!booking.connection_id || OTA_SOURCE_RE.test(booking.source || '');
};

export const isPendingProvisionalWorkflowBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    if (booking.status === 'cancelled') return false;
    if (booking.event_state === 'provisional') return true;
    if (booking.status === 'pending') return true;
    if (booking.needs_details) return true;
    return !!booking.provisional_id || PENDING_ENRICHMENT.has((booking.enrichment_status || '').toUpperCase());
};

export const isOtaBlockBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    if (booking.event_kind === 'BLOCK' || booking.status === 'blocked') return true;
    if (isPendingProvisionalWorkflowBooking(booking)) return false;
    return isImportedOtaRecord(booking) && !hasRealGuest(booking) && !hasAmountPositive(booking);
};

/**
 * confirmed: tiene huésped real O tiene importe > 0.
 * 
 * Esto asegura que los iCal con nombre pero sin precio (muy común) sean tratados como reservas.
 */
export const isConfirmedBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    if (booking.status === 'cancelled') return false;
    if (isPendingProvisionalWorkflowBooking(booking)) return false;
    if (isOtaBlockBooking(booking)) return false;
    return hasRealGuest(booking) || hasAmountPositive(booking);
};

/**
 * provisional(block): NO tiene huésped real Y (importe vacío o <= 0).
 */
export const isProvisionalBlock = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    if (isPendingProvisionalWorkflowBooking(booking)) return true;
    if (isOtaBlockBooking(booking)) return true;
    return !hasRealGuest(booking) && !hasAmountPositive(booking);
};

/**
 * isProvisionalBooking: checks if a booking originates from the provisional/ingest system.
 */
export const isProvisionalBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    return isPendingProvisionalWorkflowBooking(booking);
};

export const isOperationalBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    return isConfirmedBooking(booking);
};

export const isRealConflictBooking = (booking: Partial<Booking> | null | undefined): boolean => {
    if (!booking) return false;
    return isOperationalBooking(booking) && !!booking.conflict_detected;
};

export const getBookingEntityClass = (booking: Partial<Booking> | null | undefined): BookingEntityClass => {
    if (!booking) return 'UNKNOWN';
    if (booking.status === 'cancelled') return 'CANCELLED';
    if (isPendingProvisionalWorkflowBooking(booking)) return 'PENDING_PROVISIONAL';
    if (isRealConflictBooking(booking)) return 'REAL_CONFLICT';
    if (isOtaBlockBooking(booking)) return 'OTA_BLOCK';
    if (isOperationalBooking(booking)) return 'REAL_BOOKING';
    return 'UNKNOWN';
};

export const isOtaAvailabilityMovement = (movement: Partial<AccountingMovement> | null | undefined): boolean => {
    if (!movement) return false;
    const imported = !!movement.ical_uid || !!movement.connection_id || OTA_SOURCE_RE.test(movement.platform || '');
    const placeholder = isPlaceholderGuestName(movement.concept);
    const stayLike = movement.source_event_type === 'STAY_RESERVATION';
    return stayLike && imported && placeholder && Number(movement.amount_net || 0) === 0;
};

export const isPendingProvisionalMovement = (movement: Partial<AccountingMovement> | null | undefined): boolean => {
    if (!movement) return false;
    return movement.event_state === 'provisional';
};

export const isOperationalAccountingMovement = (movement: Partial<AccountingMovement> | null | undefined): boolean => {
    if (!movement) return false;
    if (movement.type === 'expense') return true;
    if (isPendingProvisionalMovement(movement)) return false;
    if (isOtaAvailabilityMovement(movement)) return false;
    return Number(movement.amount_net || 0) > 0 || !isPlaceholderGuestName(movement.concept);
};

export const getAccountingEntityClass = (movement: Partial<AccountingMovement> | null | undefined): AccountingEntityClass => {
    if (!movement) return 'UNKNOWN';
    if (isPendingProvisionalMovement(movement)) return 'PENDING_PROVISIONAL';
    if (isOtaAvailabilityMovement(movement)) return 'OTA_BLOCK';
    if (isOperationalAccountingMovement(movement)) return 'OPERATIONAL';
    return 'UNKNOWN';
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
