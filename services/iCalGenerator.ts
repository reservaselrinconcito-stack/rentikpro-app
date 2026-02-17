
import { projectManager } from './projectManager';
import { Booking } from '../types';

export class ICalGenerator {

    /**
     * Generates an iCalendar (.ics) string for the given property.
     * Implements privacy logic for DIRECT_WEB bookings.
     */
    async generate(propertyId: string): Promise<string> {
        const store = projectManager.getStore();
        const property = (await store.getProperties()).find(p => p.id === propertyId);
        if (!property) throw new Error(`Property ${propertyId} not found`);

        const bookings = await store.getBookings();
        const units = await store.getApartments(propertyId);
        const unitIds = units.map(u => u.id);

        const relevantBookings = bookings.filter(b =>
            (b.property_id === propertyId) ||
            (b.apartment_id && unitIds.includes(b.apartment_id))
        ).filter(b => b.status === 'confirmed');

        return this.buildIcs(`Feeds ${property.name}`, relevantBookings);
    }

    /**
     * MINI-BLOQUE F4: Generates ICS for a specific unit.
     */
    async generateForUnit(apartmentId: string): Promise<string> {
        const store = projectManager.getStore();
        const bookings = await store.getBookings();
        const relevant = bookings.filter(b => b.apartment_id === apartmentId && b.status === 'confirmed');
        return this.buildIcs(`Unit Feed ${apartmentId}`, relevant);
    }

    private buildIcs(name: string, bookings: Booking[]): string {
        let ical = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//RentikPro//iCal Export 2.0//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${name}`,
            'X-WR-TIMEZONE:Europe/Madrid',
        ];

        for (const booking of bookings) {
            ical = ical.concat(this.createEventsForBooking(booking));
        }

        ical.push('END:VCALENDAR');
        return ical.map(line => this.foldLine(line)).join('\r\n');
    }

    private foldLine(line: string): string {
        if (line.length <= 75) return line;

        let result = '';
        let currentLine = line;

        while (currentLine.length > 75) {
            result += currentLine.substring(0, 75) + '\r\n ';
            currentLine = currentLine.substring(75);
        }

        result += currentLine;
        return result;
    }

    private createEventsForBooking(booking: Booking): string[] {
        const events: string[] = [];
        const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        // Privacy Logic
        const isDirect = booking.source === 'DIRECT_WEB' || booking.source === 'WEB_CHECKOUT';
        const isSensitive = isDirect; // Could extend logic here

        let summary = isSensitive ? 'Blocked' : `Reserva: ${booking.guest_name || 'Guest'}`;
        let description = isSensitive ? 'Booked via Direct' : `Reserva via ${booking.source || 'Manual'}`;

        // Ensure stable UID
        // If it's direct web, use specific prefix as requested
        let uid = booking.external_ref || `rp-${booking.id}`;
        if (isDirect) {
            uid = `rp-web-${booking.id}`;
        }

        // Dates formatting (YYYYMMDD)
        const start = booking.check_in.replace(/-/g, '');
        // iCal end date is exclusive, so we need to add 1 day to check_out for correct display usually?
        // Actually for "All Day" events, DTEND is exclusive.
        // check_out in our internal system is usually the day of departure (11am or so).
        // So a booking CheckIn: 2024-01-01, CheckOut: 2024-01-03 means nights of 1st and 2nd.
        // In iCal DTSTART:20240101, DTEND:20240103 covers exactly that duration.
        const end = booking.check_out.replace(/-/g, '');

        events.push('BEGIN:VEVENT');
        events.push(`DTSTAMP:${now}`);
        events.push(`UID:${uid}@rentikpro.app`);
        events.push(`DTSTART;VALUE=DATE:${start}`);
        events.push(`DTEND;VALUE=DATE:${end}`);
        events.push(`SUMMARY:${summary}`);
        if (description) events.push(`DESCRIPTION:${description}`);
        events.push(`STATUS:${booking.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`);
        events.push('END:VEVENT');

        return events;
    }
}

export const iCalGenerator = new ICalGenerator();
