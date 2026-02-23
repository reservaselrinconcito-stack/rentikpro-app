/**
 * pricingEngine – stub
 * Provides pricing and restriction data for public calendar exports.
 * A full implementation would query the pricing rules stored in SQLite;
 * this stub returns empty-but-valid structures so the build succeeds.
 */
import { projectManager } from './projectManager';
import { pricingStudioStore } from './pricingStudioStore';

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
            const rules = await pricingStudioStore.computeStayRules(unitId, from, to);
            if (rules.length === 0) return { pricing: {}, restrictions: {} };

            const pricing: Record<string, DayPricing> = {};
            const restrictions: Record<string, DayRestriction> = {};

            const defaults = await pricingStudioStore.getPricingDefaults(unitId);
            const currency = defaults?.currency || 'EUR';

            for (const r of rules) {
                pricing[r.date] = { price: r.price, currency };
                restrictions[r.date] = {
                    minStay: r.minNights
                };
            }

            return { pricing, restrictions, ruleSetVersion: Date.now() };
        } catch (e) {
            console.error("[PRICING:ENGINE] Error fetching public data", e);
            return { pricing: {}, restrictions: {} };
        }
    },
};
