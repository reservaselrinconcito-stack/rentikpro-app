/**
 * pricingEngine – stub
 * Provides pricing and restriction data for public calendar exports.
 * A full implementation would query the pricing rules stored in SQLite;
 * this stub returns empty-but-valid structures so the build succeeds.
 */
import { projectManager } from './projectManager';

export interface DayPricing {
    price: number;
    currency: string;
}

export interface DayRestriction {
    minStay?: number;
    maxStay?: number;
    closedToArrival?: boolean;
    closedToDeparture?: boolean;
}

export interface PublicPricingData {
    pricing: Record<string, DayPricing>;
    restrictions: Record<string, DayRestriction>;
    ruleSetVersion?: number;
}

export const pricingEngine = {
    /**
     * Returns daily pricing and restriction data for a given unit and date range.
     * @param unitId       Apartment / unit ID
     * @param from         Start date (YYYY-MM-DD, inclusive)
     * @param to           End date   (YYYY-MM-DD, exclusive)
     * @param ratePlanId   Optional rate-plan ID for plan-specific pricing
     */
    async getPublicData(
        unitId: string,
        from: string,
        to: string,
        ratePlanId?: string
    ): Promise<PublicPricingData> {
        try {
            const store = projectManager.getStore();
            if (!store) return { pricing: {}, restrictions: {} };

            // Iterate over every day in [from, to)
            const pricing: Record<string, DayPricing> = {};
            const restrictions: Record<string, DayRestriction> = {};

            let curr = new Date(from);
            const end = new Date(to);

            while (curr < end) {
                const dateStr = curr.toISOString().split('T')[0];

                // Default values – a real implementation would look up pricing rules here
                pricing[dateStr] = { price: 0, currency: 'EUR' };
                restrictions[dateStr] = {};

                curr.setDate(curr.getDate() + 1);
            }

            return { pricing, restrictions, ruleSetVersion: Date.now() };
        } catch {
            return { pricing: {}, restrictions: {} };
        }
    },
};
