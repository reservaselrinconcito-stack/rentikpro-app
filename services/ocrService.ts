
import { createWorker } from 'tesseract.js';

export interface PulseExtractedData {
    guest_name?: string;
    locator?: string;
    total_price?: number;
    currency?: string;
    pax_adults?: number;
    pax_children?: number;
    raw_text?: string;
}

export class OCRService {

    async processPulseImage(imageSrc: string): Promise<PulseExtractedData> {
        const worker = await createWorker('spa'); // Use Spanish for better name/date detection in the region

        try {
            const { data: { text } } = await worker.recognize(imageSrc);

            const results: PulseExtractedData = {
                raw_text: text
            };

            // 1. Extract Locator (Booking number: XXXX.XXX.XXX or 1234567890)
            const locatorMatch = text.match(/(\d{4}[. ]?\d{3}[. ]?\d{3})/i) || text.match(/#\s*(\d{8,12})/i);
            if (locatorMatch) {
                results.locator = locatorMatch[1].replace(/[. ]/g, '');
            }

            // 2. Extract Price (Digits + €/EUR/$...)
            const priceMatch = text.match(/([\d,]+[.,]\d{2})\s*(€|EUR|\$|USD)/i) || text.match(/(€|EUR|\$|USD)\s*([\d,]+[.,]\d{2})/i);
            if (priceMatch) {
                const priceStr = priceMatch[1].includes('€') || priceMatch[1].includes('$') ? priceMatch[2] : priceMatch[1];
                const symbol = priceMatch[1].includes('€') || priceMatch[1].includes('$') ? priceMatch[1] : priceMatch[2];

                results.total_price = parseFloat(priceStr.replace(',', '.'));
                results.currency = this.mapSymbolToCurrency(symbol);
            }

            // 3. Extract Guest Name (Heuristic: usually after "Huésped" or at the top)
            // Pulse often has "Reserva de [Nombre]" or just the name prominent
            const guestMatch = text.match(/Reserva de\s*([A-Za-z\s]{5,40})/i) || text.match(/Huésped\s*[:]?\s*([A-Za-z\s]{5,40})/i);
            if (guestMatch) {
                results.guest_name = guestMatch[1].trim();
            }

            // 4. Extract Pax
            const paxMatch = text.match(/(\d+)\s*(adulto|adults)/i);
            if (paxMatch) {
                results.pax_adults = parseInt(paxMatch[1]);
            }
            const childMatch = text.match(/(\d+)\s*(niño|children)/i);
            if (childMatch) {
                results.pax_children = parseInt(childMatch[1]);
            }

            return results;
        } finally {
            await worker.terminate();
        }
    }

    private mapSymbolToCurrency(symbol: string): string {
        const s = symbol.toUpperCase();
        if (s.includes('€') || s.includes('EUR')) return 'EUR';
        if (s.includes('$') || s.includes('USD')) return 'USD';
        if (s.includes('£') || s.includes('GBP')) return 'GBP';
        return 'EUR';
    }
}

export const ocrService = new OCRService();
