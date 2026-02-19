/**
 * bookingRequestImporter
 * Parses a plain-text booking request (e.g. from an email or WhatsApp message)
 * and saves it as a provisional booking in the current project.
 */
import { projectManager } from './projectManager';

export interface ImportResult {
    success: boolean;
    message: string;
}

export const bookingRequestImporter = {
    /**
     * Attempt to parse `text` and create a booking from it.
     * Returns { success, message } in all cases (never throws).
     */
    async import(text: string): Promise<ImportResult> {
        try {
            if (!text || text.trim().length === 0) {
                return { success: false, message: 'El texto está vacío.' };
            }

            const store = projectManager.getStore();
            if (!store) {
                return { success: false, message: 'No hay proyecto abierto.' };
            }

            // --- Basic extraction helpers ---
            const extractDate = (src: string, patterns: RegExp[]): string | null => {
                for (const re of patterns) {
                    const m = src.match(re);
                    if (m) {
                        // Normalise to YYYY-MM-DD
                        const [, d, mo, y] = m;
                        const day = d.padStart(2, '0');
                        const month = mo.padStart(2, '0');
                        return `${y}-${month}-${day}`;
                    }
                }
                return null;
            };

            const datePatterns = [
                /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
                /(\d{1,2})\s+(?:de\s+)?(\w+)\s+(?:de\s+)?(\d{4})/i,
            ];

            const checkIn = extractDate(text, datePatterns);
            const checkOut = (() => {
                // Try to find a second date after the first
                const stripped = checkIn ? text.replace(checkIn.replace(/-/g, '/'), '') : text;
                return extractDate(stripped, datePatterns);
            })();

            // Extract guest name (look for "nombre:", "guest:", "huésped:", etc.)
            const nameMatch = text.match(/(?:nombre|guest|hu[eé]sped|cliente)[:\s]+([A-Za-zÀ-ÿ\s]+)/i);
            const guestName = nameMatch ? nameMatch[1].trim().split('\n')[0] : 'Solicitud importada';

            // Extract number of guests (Block 10: Sum adults + children + infants if needed)
            const paxMatch = text.match(/(\d+)\s*(?:personas?|guests?|total\s+pax|pax)/i);
            const adultsMatch = text.match(/(\d+)\s*(?:adultos?|adults?)/i);
            const childrenMatch = text.match(/(\d+)\s*(?:niños?|children?|kids?)/i);
            const infantsMatch = text.match(/(\d+)\s*(?:bebes?|infants?)/i);

            let valPax = paxMatch ? parseInt(paxMatch[1], 10) : 0;
            const valAdults = adultsMatch ? parseInt(adultsMatch[1], 10) : 0;
            const valChildren = childrenMatch ? parseInt(childrenMatch[1], 10) : 0;
            const valInfants = infantsMatch ? parseInt(infantsMatch[1], 10) : 0;

            if (valPax === 0 && (valAdults > 0 || valChildren > 0 || valInfants > 0)) {
                valPax = valAdults + valChildren + valInfants;
            }

            const guests = valPax > 0 ? valPax : 0; // "Sin inventar" -> 0 if not found

            // Extract price
            const priceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros?)/i);
            const totalPrice = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;

            // Get active property
            const propertyId = projectManager.getActivePropertyId() || '';

            const now = Date.now();
            const booking: any = {
                id: `req-${now}`,
                property_id: propertyId,
                apartment_id: '',
                traveler_id: '',
                guest_name: guestName,
                check_in: checkIn || '',
                check_out: checkOut || '',
                status: 'pending' as const,
                source: 'manual' as const,
                guests: guests || 1, // Keep 1 for grid visibility if possible, but store 0 in metadata
                pax_total: guests > 0 ? guests : undefined,
                pax_adults: valAdults > 0 ? valAdults : undefined,
                pax_children: valChildren > 0 ? valChildren : undefined,
                pax_infants: valInfants > 0 ? valInfants : undefined,
                total_price: totalPrice,
                payment_notes: 'Importado desde solicitud de texto',
                payments: [],
                created_at: now,
                updated_at: now,
            };

            await store.saveBooking(booking);

            return {
                success: true,
                message: `Solicitud importada correctamente para "${guestName}".${!checkIn ? ' No se detectaron fechas, revisa el registro.' : ''
                    }`,
            };
        } catch (err: any) {
            return { success: false, message: err?.message ?? 'Error desconocido.' };
        }
    },
};
