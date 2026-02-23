import { Message, ProvisionalBooking, EmailProvider, Apartment } from '../types';

export class BookingEmailParser {

    async parseBookingEmail(email: Message, subject: string, emailIngestId: string, apartments: Apartment[] = []): Promise<ProvisionalBooking | null> {
        const provider = this.detectProvider(subject, email.body);
        if (!provider) return null;

        console.log(`[EmailParser] Detected provider ${provider} for email ${email.id}`);

        let provisional: ProvisionalBooking | null = null;

        switch (provider) {
            case 'AIRBNB':
                provisional = this.parseAirbnb(email, subject, emailIngestId);
                break;
            case 'BOOKING':
                provisional = this.parseBooking(email, subject, emailIngestId);
                break;
            case 'VRBO':
                provisional = this.parseVrbo(email, subject, emailIngestId);
                break;
            case 'ESCAPADA_RURAL':
                provisional = this.parseEscapada(email, subject, emailIngestId);
                break;
            default:
                break;
        }

        if (!provisional) return null;

        // 3. Detect Apartment (if passed)
        if (apartments.length > 0) {
            const apt = this.detectApartment(subject, email.body, apartments);
            if (apt) {
                provisional.apartment_hint = apt.name;
                // If we found the apartment, we might have the ID to map it later in SyncEngine
                // But ProvisionalBooking doesn't store apartment_id directly, only hint. 
                // Actually we should maybe store it if we are sure? 
                // For now, let's just ensure we have a hint.
            }
        }

        // 4. Enforce Status Rules (Minimum Viable)
        // Rule: Apartment + Start + End = CONFIRMED (Blocking)
        // Otherwise: PENDING_DETAILS
        // EXCEPTION: Do not override INQUIRY or CANCELLED
        if (provisional.status !== 'INQUIRY' && provisional.status !== 'CANCELLED') {
            const hasDates = provisional.start_date && provisional.end_date;
            const hasApartment = !!provisional.apartment_hint; // We need to trust the hint or the detection above

            if (hasDates && hasApartment) {
                provisional.status = 'CONFIRMED';
            } else {
                provisional.status = 'PENDING_DETAILS';
            }
        }

        // Calculate confidence based on missing fields
        provisional.confidence = this.calculateConfidence(provisional);

        return provisional;
    }

    private detectApartment(subject: string, body: string, apartments: Apartment[]): Apartment | null {
        // Simple heuristic: check if apartment name appears in subject or body
        const content = (subject + " " + body).toLowerCase();
        for (const apt of apartments) {
            if (content.includes(apt.name.toLowerCase())) {
                return apt;
            }
        }
        return null;
    }

    private detectProvider(subject: string, body: string): EmailProvider | null {
        const content = (subject + " " + body).toLowerCase();

        if (content.includes('airbnb') || content.includes('reservation confirmed') || subject.toLowerCase().includes('inquiry')) return 'AIRBNB';
        if (content.includes('booking.com') || content.includes('booking confirmation')) return 'BOOKING';
        if (content.includes('vrbo') || content.includes('homeaway')) return 'VRBO';
        if (content.includes('escapada') || content.includes('escapadarural')) return 'ESCAPADA_RURAL';

        return null;
    }

    private parseAirbnb(email: Message, subject: string, emailIngestId: string): ProvisionalBooking {
        const body = email.body || '';
        const content = subject + "\n" + body;

        const sContent = (content ?? "") as string;
        // Heuristics for Airbnb
        const codeMatch = sContent.match(/Reservation code\s*[:#-]?\s*([A-Z0-9]{5,15})/i) || sContent.match(/Code\s*([A-Z0-9]{5,15})/i);
        const guestMatch = sContent.match(/Guest\s*[:#-]?\s*([^\n\r]+)/i) || sContent.match(/Arrive\s*[:#-]?\s*([^\n\r]+)/i);

        const dateRegex = /([A-Z][a-z]{2}\s\d{1,2},?\s\d{4})|(\d{1,2}\s[A-Z][a-z]{2}\s\d{4})/g;
        const dates = sContent.match(dateRegex) || [];

        let checkIn = dates[0] ? this.normalizeDate(dates[0]) : '';
        let checkOut = dates[1] ? this.normalizeDate(dates[1]) : '';

        const priceMatch = sContent.match(/Total\s*[:]?\s*([$€£])?\s*([\d,]+\.?\d*)/i);

        const isInquiry = subject.toLowerCase().includes('inquiry') || body.toLowerCase().includes('inquiry') || content.toLowerCase().includes('question');

        const missing: string[] = [];
        if (!checkIn) missing.push('start_date');
        if (!checkOut) missing.push('end_date');
        if (!guestMatch) missing.push('guest_name');
        if (!priceMatch) missing.push('total_price');

        return {
            id: crypto.randomUUID(),
            provider: 'AIRBNB',
            provider_reservation_id: codeMatch ? codeMatch[1].trim() : undefined,
            status: isInquiry ? 'INQUIRY' : 'PENDING_DETAILS',
            source: 'EMAIL_TRIGGER',
            email_ingest_id: emailIngestId,
            created_at: Date.now(),
            updated_at: Date.now(),

            start_date: checkIn,
            end_date: checkOut,
            guest_name: guestMatch ? guestMatch[1].trim() : 'Guest',
            pax_adults: 1,
            total_price: priceMatch ? parseFloat(priceMatch[2].replace(/,/g, '')) : 0,
            currency: priceMatch ? this.mapSymbolToCurrency(priceMatch[1]) : 'EUR',

            missing_fields: missing,
            raw_text_snippet: body.substring(0, 500),

            // Legacy/Compat
            check_in: checkIn,
            check_out: checkOut,
            platform: 'AIRBNB',
            source_email_id: email.id
        };
    }

    private parseBooking(email: Message, subject: string, emailIngestId: string): ProvisionalBooking {
        const body = email.body || '';
        const content = subject + "\n" + body;

        const sContent = (content ?? "") as string;
        const numberMatch = sContent.match(/Booking number\s*[:]?\s*(\d+)/i) || sContent.match(/#\s*([A-Z0-9-]+)/i);
        const guestMatch = sContent.match(/Guest\s*[:]?\s*([^\n\r]+)/i);

        const dateRegex = /Check-in[:\s]*([A-Za-z]+,?\s\d{1,2}\s[A-Za-z]+\s\d{4}|\d{4}-\d{2}-\d{2})/i;
        const checkInMatch = sContent.match(dateRegex);
        const checkOutMatch = sContent.match(/Check-out[:\s]*([A-Za-z]+,?\s\d{1,2}\s[A-Za-z]+\s\d{4}|\d{4}-\d{2}-\d{2})/i);

        let checkIn = checkInMatch ? this.normalizeDate(checkInMatch[1]) : '';
        let checkOut = checkOutMatch ? this.normalizeDate(checkOutMatch[1]) : '';

        const priceMatch = sContent.match(/Price\s*[:]?\s*([A-Z]{3}|[$€£])\s*([\d,]+\.?\d*)/i);
        const notesMatch = sContent.match(/Notes\s*[:]?\s*([^\n\r]+)/i);

        const missing: string[] = [];
        if (!checkIn) missing.push('start_date');
        if (!checkOut) missing.push('end_date');
        if (!guestMatch || guestMatch[1].toLowerCase().includes('booking.com')) missing.push('guest_name');
        if (!priceMatch) missing.push('total_price');

        return {
            id: crypto.randomUUID(),
            provider: 'BOOKING',
            provider_reservation_id: numberMatch ? numberMatch[1].trim() : undefined,
            status: 'PENDING_DETAILS',
            source: 'EMAIL_TRIGGER',
            email_ingest_id: emailIngestId,
            created_at: Date.now(),
            updated_at: Date.now(),

            start_date: checkIn,
            end_date: checkOut,
            guest_name: (guestMatch && !guestMatch[1].toLowerCase().includes('booking.com')) ? guestMatch[1].trim() : 'Guest Booking.com',
            pax_adults: 1,
            total_price: priceMatch ? parseFloat(priceMatch[2].replace(/,/g, '')) : 0,
            currency: priceMatch ? this.mapSymbolToCurrency(priceMatch[1]) : 'EUR',

            missing_fields: missing,
            raw_text_snippet: body.substring(0, 500),
            metadata: notesMatch ? { notes: notesMatch[1].trim() } : {},

            // Legacy/Compat
            check_in: checkIn,
            check_out: checkOut,
            platform: 'BOOKING',
            source_email_id: email.id
        };
    }

    private parseVrbo(email: Message, subject: string, emailIngestId: string): ProvisionalBooking {
        const body = email.body || '';
        const content = subject + "\n" + body;

        const sContent = (content ?? "") as string;
        const idMatch = sContent.match(/Reservation ID\s*[:]?\s*([A-Za-z0-9-]+)/i);

        const dates = sContent.match(/(\d{1,2}\s[A-Za-z]{3}\s\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/g) || [];
        const guestMatch = sContent.match(/Guest Name\s*[:]?\s*([^\n\r]+)/i) || sContent.match(/Traveler\s*[:]?\s*([^\n\r]+)/i);
        const priceMatch = sContent.match(/Total\s*[:]?\s*([$€£])?\s*([\d,]+\.?\d*)/i);

        const missing: string[] = [];
        if (dates.length < 2) missing.push('start_date', 'end_date');
        if (!guestMatch) missing.push('guest_name');

        return {
            id: crypto.randomUUID(),
            provider: 'VRBO',
            provider_reservation_id: idMatch ? idMatch[1].trim() : undefined,
            status: 'PENDING_DETAILS',
            source: 'EMAIL_TRIGGER',
            email_ingest_id: emailIngestId,
            created_at: Date.now(),
            updated_at: Date.now(),

            start_date: dates[0] ? this.normalizeDate(dates[0]) : '',
            end_date: dates[1] ? this.normalizeDate(dates[1]) : '',
            guest_name: guestMatch ? guestMatch[1].trim() : 'Guest Vrbo',
            pax_adults: 1,
            total_price: priceMatch ? parseFloat(priceMatch[2].replace(/,/g, '')) : 0,
            currency: priceMatch ? this.mapSymbolToCurrency(priceMatch[1]) : 'EUR',

            missing_fields: missing,
            raw_text_snippet: body.substring(0, 500),

            // Legacy/Compat
            check_in: dates[0] ? this.normalizeDate(dates[0]) : '',
            check_out: dates[1] ? this.normalizeDate(dates[1]) : '',
            platform: 'VRBO',
            source_email_id: email.id
        };
    }

    private calculateConfidence(pb: ProvisionalBooking): number {
        let score = 1.0;
        if (pb.missing_fields && pb.missing_fields.length > 0) {
            score -= (pb.missing_fields.length * 0.1);
        }
        if (!pb.provider_reservation_id) score -= 0.2;
        // pb.apartment_hint check could be added
        return Math.max(0, score);
    }

    private normalizeDate(dateStr: string): string {
        try {
            const s = (dateStr ?? "") as string;
            // Handle DD/MM/YYYY explicitly
            if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const parts = dateStr.split('/');
                // Assume DD/MM/YYYY
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }

            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toISOString().split('T')[0];
        } catch {
            return dateStr;
        }
    }

    private mapSymbolToCurrency(symbol: string): string {
        if (!symbol) return 'EUR';
        if (symbol === '$') return 'USD';
        if (symbol === '€') return 'EUR';
        if (symbol === '£') return 'GBP';
        return symbol;
    }

    private parseEscapada(email: Message, subject: string, emailIngestId: string): ProvisionalBooking {
        const body = email.body || '';
        const content = subject + "\n" + body;
        const sContent = (content ?? "") as string;

        // "Reserva pendiente de confirmar: 55-ABC"
        const idMatch = sContent.match(/Reserva.*?[:]\s*([A-Za-z0-9-]+)/i) || sContent.match(/Solicitud.*?[:]\s*([A-Za-z0-9-]+)/i);
        // "Fecha entrada: 01/08/2026"
        const checkInMatch = sContent.match(/Fecha entrada.*[:]\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        const checkOutMatch = sContent.match(/Fecha salida.*[:]\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        const guestNameMatch = sContent.match(/Nombre cliente.*[:]\s*([^\n\r]+)/i);
        const priceMatch = sContent.match(/Importe total.*[:]\s*([\d,]+\.?\d*)\s*(€|EUR)/i);

        const missing: string[] = [];
        if (!checkInMatch) missing.push('start_date');
        if (!checkOutMatch) missing.push('end_date');
        if (!guestNameMatch) missing.push('guest_name');

        return {
            id: crypto.randomUUID(),
            provider: 'ESCAPADA_RURAL',
            provider_reservation_id: idMatch ? idMatch[1].trim() : undefined,
            status: 'PENDING_DETAILS',
            source: 'EMAIL_TRIGGER',
            email_ingest_id: emailIngestId,
            created_at: Date.now(),
            updated_at: Date.now(),

            start_date: checkInMatch ? this.normalizeDate(checkInMatch[1]) : '',
            end_date: checkOutMatch ? this.normalizeDate(checkOutMatch[1]) : '',
            guest_name: guestNameMatch ? guestNameMatch[1].trim() : 'Guest EscapadaRural',
            pax_adults: 1,
            total_price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0,
            currency: 'EUR',

            missing_fields: missing,
            raw_text_snippet: body.substring(0, 500),

            // Legacy/Compat
            check_in: checkInMatch ? this.normalizeDate(checkInMatch[1]) : '',
            check_out: checkOutMatch ? this.normalizeDate(checkOutMatch[1]) : '',
            platform: 'ESCAPADA_RURAL',
            source_email_id: email.id
        };
    }
}

export const bookingEmailParser = new BookingEmailParser();
