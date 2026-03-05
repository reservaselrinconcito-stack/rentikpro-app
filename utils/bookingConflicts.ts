import { Booking } from '../types';
import { isConfirmedBooking, overlaps } from './bookingClassification';

type ConflictSourceMap = Map<string, Set<string>>;

const getSourceLabel = (booking: Booking): string => {
    return booking.source || booking.event_origin || 'unknown';
};

export const annotateBookingConflicts = (bookings: Booking[]): Booking[] => {
    const byApartment = new Map<string, Booking[]>();
    const sourcesByBooking: ConflictSourceMap = new Map();

    bookings
        .filter(b => b.status !== 'cancelled' && isConfirmedBooking(b))
        .forEach(b => {
            const list = byApartment.get(b.apartment_id) || [];
            list.push(b);
            byApartment.set(b.apartment_id, list);
        });

    for (const [, list] of byApartment) {
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i];
                const b = list[j];
                if (!overlaps(a.check_in, a.check_out, b.check_in, b.check_out)) continue;

                const aSources = sourcesByBooking.get(a.id) || new Set<string>();
                const bSources = sourcesByBooking.get(b.id) || new Set<string>();
                aSources.add(getSourceLabel(a));
                aSources.add(getSourceLabel(b));
                bSources.add(getSourceLabel(a));
                bSources.add(getSourceLabel(b));
                sourcesByBooking.set(a.id, aSources);
                sourcesByBooking.set(b.id, bSources);
            }
        }
    }

    return bookings.map(b => {
        const sources = sourcesByBooking.get(b.id);
        if (!sources) return b;
        return {
            ...b,
            conflict_detected: true,
            conflict_sources: Array.from(sources),
        } as Booking & { conflict_sources: string[] };
    });
};
