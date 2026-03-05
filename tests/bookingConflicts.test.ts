import { describe, it, expect } from 'vitest';
import { annotateBookingConflicts } from '../utils/bookingConflicts';
import { Booking } from '../types';

describe('Booking conflict detection (UI-level)', () => {
    const apt1 = 'apt_1';

    it('marks conflicts when two bookings with guest data overlap', () => {
        const bookingA: Booking = {
            id: 'booking_a',
            apartment_id: apt1,
            check_in: '2026-08-01',
            check_out: '2026-08-05',
            status: 'confirmed',
            event_origin: 'manual',
            property_id: 'prop_1',
            traveler_id: 'trav_1',
            total_price: 200,
            guests: 2,
            source: 'manual',
            guest_name: 'Ana Lopez',
            created_at: Date.now()
        };

        const bookingB: Booking = {
            id: 'booking_b',
            apartment_id: apt1,
            check_in: '2026-08-03',
            check_out: '2026-08-06',
            status: 'confirmed',
            event_origin: 'ical',
            property_id: 'prop_1',
            traveler_id: 'trav_2',
            total_price: 150,
            guests: 2,
            source: 'Airbnb',
            guest_name: 'John Doe',
            created_at: Date.now()
        };

        const [a, b] = annotateBookingConflicts([bookingA, bookingB]) as Array<Booking & { conflict_sources?: string[] }>;

        expect(a.conflict_detected).toBe(true);
        expect(b.conflict_detected).toBe(true);
        expect(a.conflict_sources).toEqual(expect.arrayContaining(['manual', 'Airbnb']));
        expect(b.conflict_sources).toEqual(expect.arrayContaining(['manual', 'Airbnb']));
    });
});
