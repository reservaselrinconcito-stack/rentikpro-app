
import { AvailabilityResponse, ApartmentAvailability, AvailabilityDay } from './types';
import { APARTMENTS } from '../../content/apartments';

// Helper to add days to a date
const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// Helper to format YYYY-MM-DD
const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const getMockAvailability = async (from: string, to: string): Promise<AvailabilityResponse> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const apartments = APARTMENTS.map(apt => {
        const isComingSoon = apt.status === 'coming_soon';
        const days: AvailabilityDay[] = [];

        // Generate 90 days from "today" (or from 'from' if we parsed it, but mock can just start today)
        const startDate = new Date();

        for (let i = 0; i < 90; i++) {
            const current = addDays(startDate, i);
            const dateStr = formatDate(current);
            const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat

            let isAvailable = true;
            let minNights = 1;

            // Logic for Coming Soon: ALL unavailable/blocked
            if (isComingSoon) {
                isAvailable = false;
            } else {
                // Logic for Active:
                // Randomly block some days to look realistic (20% occupied)
                // Weekend block logic: if Sat is booked, Sun usually is too? 
                // Simple random:
                if (Math.random() < 0.2) {
                    isAvailable = false;
                }

                // Min nights: Weekends 2 nights
                if (dayOfWeek === 5 || dayOfWeek === 6) {
                    minNights = 2;
                }
            }

            days.push({
                date: dateStr,
                isAvailable,
                minNights,
                price: null // No invented prices
            });
        }

        return {
            apartmentSlug: apt.slug,
            days
        };
    });

    return {
        locationId: 'all',
        apartments
    };
};
