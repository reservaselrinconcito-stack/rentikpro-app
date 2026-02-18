
import { describe, it, expect } from 'vitest';
import { getBookingDisplayName } from '../utils/bookingDisplay';
import { Booking, Traveler } from '../types';

describe('getBookingDisplayName', () => {
    const mockBooking = (overrides: Partial<Booking>): Booking => ({
        id: 'b1',
        property_id: 'p1',
        apartment_id: 'a1',
        check_in: '2022-01-01',
        check_out: '2022-01-02',
        status: 'confirmed',
        total_price: 100,
        guests: 1,
        source: 'manual',
        created_at: 0,
        ...overrides
    } as Booking);

    const mockTraveler = (overrides: Partial<Traveler>): Traveler => ({
        id: 't1',
        nombre: 'Traveler',
        apellidos: 'Name',
        ...overrides
    } as Traveler);

    it('should prioritize traveler full name if present', () => {
        const booking = mockBooking({ guest_name: 'Guest Name', summary: 'Summary' });
        const traveler = mockTraveler({ nombre: 'Real', apellidos: 'Traveler' });

        expect(getBookingDisplayName(booking, traveler)).toBe('Real Traveler');
    });

    it('should use booking.guest_name if traveler is missing', () => {
        const booking = mockBooking({ guest_name: 'Manual Guest', summary: 'Summary' });
        expect(getBookingDisplayName(booking, undefined)).toBe('Manual Guest');
    });

    it('should use booking.guest_name if traveler has empty name', () => {
        const booking = mockBooking({ guest_name: 'Manual Guest', summary: 'Summary' });
        const traveler = mockTraveler({ nombre: '', apellidos: '' }); // Empty traveler

        expect(getBookingDisplayName(booking, traveler)).toBe('Manual Guest');
    });

    it('should use summary if both traveler query and guest_name fail', () => {
        const booking = mockBooking({ guest_name: '', summary: 'OTA Summary' });
        expect(getBookingDisplayName(booking, undefined)).toBe('OTA Summary');
    });

    it('should return "Sin nombre" if nothing is available', () => {
        const booking = mockBooking({ guest_name: '', summary: '' });
        expect(getBookingDisplayName(booking, undefined)).toBe('Sin nombre');
    });
});
