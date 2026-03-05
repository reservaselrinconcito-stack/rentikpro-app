import { describe, it, expect } from 'vitest';
import { dedupeBookingsForDisplay } from '../utils/bookingDedupe';
import { Booking } from '../types';

describe('Booking Deduplication (UI-level)', () => {
    const apt1 = 'apt_1';

    it('should keep a booking with guest and hide a matching OTA block by UID', () => {
        const manual: Booking = {
            id: 'manual_1',
            apartment_id: apt1,
            check_in: '2026-04-01',
            check_out: '2026-04-05',
            status: 'confirmed',
            event_origin: 'manual',
            ical_uid: 'uid_123',
            property_id: 'prop_1',
            traveler_id: 'trav_1',
            total_price: 100,
            guests: 2,
            source: 'manual',
            guest_name: 'Ana Lopez',
            created_at: Date.now()
        };

        const icalBlock: Booking = {
            id: 'ical_block_1',
            apartment_id: apt1,
            check_in: '2026-04-01',
            check_out: '2026-04-05',
            status: 'blocked',
            event_origin: 'ical',
            ical_uid: 'uid_123',
            event_kind: 'BLOCK',
            property_id: 'prop_1',
            traveler_id: '',
            total_price: 0,
            guests: 0,
            source: 'Airbnb',
            created_at: Date.now()
        };

        const { deduplicated, hiddenCount } = dedupeBookingsForDisplay([manual, icalBlock]);

        expect(deduplicated).toHaveLength(1);
        expect(deduplicated[0].id).toBe('manual_1');
        expect(hiddenCount).toBe(1);
    });

    it('should hide an OTA block if dates and apartment match exactly, even without common UID', () => {
        const manual: Booking = {
            id: 'manual_2',
            apartment_id: apt1,
            check_in: '2026-05-10',
            check_out: '2026-05-15',
            status: 'confirmed',
            event_origin: 'manual',
            property_id: 'prop_1',
            traveler_id: 'trav_2',
            total_price: 200,
            guests: 3,
            source: 'manual',
            guest_name: 'Carlos Perez',
            created_at: Date.now()
        };

        const icalBlock: Booking = {
            id: 'ical_block_2',
            apartment_id: apt1,
            check_in: '2026-05-10',
            check_out: '2026-05-15',
            status: 'blocked',
            event_origin: 'ical',
            event_kind: 'BLOCK',
            property_id: 'prop_1',
            traveler_id: '',
            total_price: 0,
            guests: 0,
            source: 'Booking.com',
            created_at: Date.now()
        };

        const { deduplicated, hiddenCount } = dedupeBookingsForDisplay([manual, icalBlock]);

        expect(deduplicated).toHaveLength(1);
        expect(deduplicated[0].id).toBe('manual_2');
        expect(hiddenCount).toBe(1);
    });

    it('should NOT hide a manual block even if dates match a booking', () => {
        
        const manual: Booking = {
            id: 'manual_3',
            apartment_id: apt1,
            check_in: '2026-06-01',
            check_out: '2026-06-05',
            status: 'blocked',
            event_origin: 'manual',
            property_id: 'prop_1',
            traveler_id: '',
            total_price: 0,
            guests: 0,
            source: 'manual',
            created_at: Date.now()
        };

        const booking: Booking = {
            id: 'booking_3',
            apartment_id: apt1,
            check_in: '2026-06-01',
            check_out: '2026-06-05',
            status: 'confirmed',
            event_origin: 'manual',
            property_id: 'prop_1',
            traveler_id: 'trav_3',
            total_price: 120,
            guests: 2,
            source: 'manual',
            guest_name: 'Ana Lopez',
            created_at: Date.now()
        };

        const { deduplicated, hiddenCount } = dedupeBookingsForDisplay([manual, booking]);

        expect(deduplicated).toHaveLength(2);
        expect(hiddenCount).toBe(0);
    });

    it('should keep both if they are in different apartments', () => {
        const manual: Booking = {
            id: 'manual_4',
            apartment_id: 'apt_A',
            check_in: '2026-07-01',
            check_out: '2026-07-05',
            status: 'confirmed',
            event_origin: 'manual',
            property_id: 'prop_1',
            traveler_id: 'trav_4',
            total_price: 150,
            guests: 2,
            source: 'manual',
            created_at: Date.now()
        };

        const ical: Booking = {
            id: 'ical_4',
            apartment_id: 'apt_B',
            check_in: '2026-07-01',
            check_out: '2026-07-05',
            status: 'confirmed',
            event_origin: 'ical',
            property_id: 'prop_1',
            traveler_id: '',
            total_price: 0,
            guests: 0,
            source: 'Airbnb',
            created_at: Date.now()
        };

        const { deduplicated, hiddenCount } = dedupeBookingsForDisplay([manual, ical]);

        expect(deduplicated).toHaveLength(2);
        expect(hiddenCount).toBe(0);
    });
});
