import { Booking, CalendarEvent } from '../types';

/**
 * Maps a raw CalendarEvent (iCal) to a Booking structure for UI display.
 */
export const mapCalendarEventToBooking = (evt: CalendarEvent): Partial<Booking> => {
    return {
        id: evt.booking_id || `evt-${evt.id}`,
        apartment_id: evt.apartment_id || '',
        property_id: evt.property_id || '',
        check_in: evt.start_date,
        check_out: evt.end_date,
        status: evt.status === 'confirmed' ? 'confirmed' : 'pending',
        source: 'iCal', // Default source for events
        guest_name: evt.summary || 'Sin huésped (iCal)',
        summary: evt.description,
        created_at: evt.created_at,
        event_kind: evt.event_kind,
        linked_event_id: evt.id
    };
};


/**
 * Ensures a booking-like object has at least a guest name placeholder if missing.
 */
export const ensureGuestName = (booking: Partial<Booking>): string => {
    return booking.guest_name || 'Sin huésped (pendiente)';
};

/**
 * Merges internal bookings with raw iCal events, avoiding duplicates.
 * confirmed bookings from internal DB are the source of truth.
 */
export const mergeBookingsAndEvents = (bookings: Booking[], events: CalendarEvent[]): Booking[] => {
    const eventBookings = events.map(mapCalendarEventToBooking) as Booking[];

    // Set of IDs already present in canonical bookings
    const internalIds = new Set(bookings.map(b => b.id));

    // Also check for linked_event_id to avoid showing the same event as both a booking and an event
    const linkedEventIds = new Set(bookings.map(b => b.linked_event_id).filter(Boolean));

    const unmatchedEvents = eventBookings.filter(eb => {
        // Skip if already represented by a canonical booking by ID
        if (internalIds.has(eb.id)) return false;
        // Skip if this raw event is already linked to a canonical booking
        if (eb.linked_event_id && linkedEventIds.has(eb.linked_event_id)) return false;
        return true;
    });

    return [...bookings, ...unmatchedEvents];
};
