/**
 * Demo availability — deterministic (same seed each day, not random).
 * Used when IS_DEMO = true or when the real API fails.
 */
import { AvailabilityResponse, AvailabilityDay } from './types';
import { APARTMENTS } from '../../content/apartments';

const addDays = (date: Date, days: number): Date => {
    const r = new Date(date);
    r.setDate(r.getDate() + days);
    return r;
};

const fmt = (d: Date) => d.toISOString().split('T')[0];

// Deterministic "occupied" pattern — fixed blocks per apartment
// so the demo looks realistic without changing on every render
const OCCUPIED_OFFSETS: Record<string, number[]> = {
    'la-tirolina': [2, 3, 10, 11, 12, 22, 23, 30, 31, 45, 46, 60, 61, 62],
    'la-ermita': [5, 6, 7, 15, 16, 25, 26, 27, 40, 41, 55, 56, 70, 71],
    'los-almendros': [1, 8, 9, 18, 19, 20, 33, 34, 48, 49, 50, 65, 66, 67],
};

export const getMockAvailability = async (
    _from: string,
    _to: string,
): Promise<AvailabilityResponse> => {
    await new Promise(r => setTimeout(r, 400));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const apartments = APARTMENTS.map(apt => {
        const isComingSoon = apt.status === 'coming_soon';
        const days: AvailabilityDay[] = [];
        const occupied = new Set(
            (OCCUPIED_OFFSETS[apt.slug] ?? [2, 5, 8, 12, 15, 20, 25]).map(n =>
                fmt(addDays(today, n))
            )
        );

        for (let i = 0; i < 90; i++) {
            const d = addDays(today, i);
            const dateStr = fmt(d);
            const dow = d.getDay();
            days.push({
                date: dateStr,
                isAvailable: !isComingSoon && !occupied.has(dateStr),
                minNights: (dow === 4 || dow === 5) ? 2 : 1, // Thu/Fri → min 2 nights
                price: !isComingSoon ? 150 : null,
            });
        }

        return { apartmentSlug: apt.slug, days };
    });

    return { locationId: 'demo', apartments };
};
