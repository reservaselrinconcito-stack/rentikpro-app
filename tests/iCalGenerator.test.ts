import { describe, it, expect } from 'vitest';
import { ICalGenerator } from '../services/iCalGenerator';

const gen = new ICalGenerator();

function extractUIDs(ics: string): string[] {
    return (ics.match(/^UID:(.+)$/gm) || []).map(l => l.replace('UID:', ''));
}

const makeBooking = (overrides: Record<string, any>) => ({
    id: crypto.randomUUID(),
    status: 'confirmed',
    check_in: '2026-06-01',
    check_out: '2026-06-05',
    guest_name: 'Test Guest',
    source: 'Booking',
    apartment_id: 'apt-1',
    property_id: 'prop-1',
    ...overrides,
});

describe('iCalGenerator — UID uniqueness', () => {

    it('all UIDs are distinct for different bookings', () => {
        const bookings = [
            makeBooking({ id: 'b-001', check_in: '2026-06-01', check_out: '2026-06-05' }),
            makeBooking({ id: 'b-002', check_in: '2026-07-10', check_out: '2026-07-15' }),
            makeBooking({ id: 'b-003', check_in: '2026-08-01', check_out: '2026-08-07' }),
        ];
        const ics = (gen as any).buildIcs('Test', bookings);
        const uids = extractUIDs(ics);
        expect(uids).toHaveLength(3);
        expect(new Set(uids).size).toBe(3);
    });

    it('preserves real OTA ical_uid when available', () => {
        const b = makeBooking({ id: 'b-ota', ical_uid: 'abc123-booking-uid' });
        const ics = (gen as any).buildIcs('Test', [b]);
        const [uid] = extractUIDs(ics);
        expect(uid).toBe('abc123-booking-uid@rentikpro.app');
    });

    it('falls back to rp-<id> when ical_uid is synthetic IMP- prefix', () => {
        const b = makeBooking({ id: 'b-imp', ical_uid: 'IMP-669f' });
        const ics = (gen as any).buildIcs('Test', [b]);
        const [uid] = extractUIDs(ics);
        expect(uid).toBe('rp-b-imp@rentikpro.app');
    });

    it('direct bookings always use rp-web- prefix', () => {
        const b = makeBooking({ id: 'b-direct', source: 'DIRECT_WEB', ical_uid: 'some-uid' });
        const ics = (gen as any).buildIcs('Test', [b]);
        const [uid] = extractUIDs(ics);
        expect(uid).toBe('rp-web-b-direct@rentikpro.app');
    });

    it('re-exporting same bookings produces identical UIDs (stability)', () => {
        const bookings = [
            makeBooking({ id: 'b-stable-1' }),
            makeBooking({ id: 'b-stable-2', ical_uid: 'vrbo-xyz-789' }),
        ];
        const ics1 = (gen as any).buildIcs('Test', bookings);
        const ics2 = (gen as any).buildIcs('Test', bookings);
        expect(extractUIDs(ics1)).toEqual(extractUIDs(ics2));
    });

    it('no two events share UID even with IMP- ical_uid', () => {
        const bookings = Array.from({ length: 5 }, (_, i) =>
            makeBooking({ id: `b-shared-${i}`, ical_uid: 'IMP-669f', check_in: `2026-0${i + 1}-01`, check_out: `2026-0${i + 1}-05` })
        );
        const ics = (gen as any).buildIcs('Test', bookings);
        const uids = extractUIDs(ics);
        expect(new Set(uids).size).toBe(5);
    });
});
