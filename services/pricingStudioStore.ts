
import { IDataStore, PricingDefaults, NightlyRateOverride, ShortStayMode, SurchargeType, DayStayRule } from '../types';

export class PricingStudioStore {
    private _store: IDataStore | null = null;

    constructor(store?: IDataStore) {
        if (store) this._store = store;
    }

    private async getStore(): Promise<IDataStore> {
        if (this._store) return this._store;
        const { projectManager } = await import('./projectManager');
        return projectManager.getStore();
    }

    async getPricingDefaults(apartmentId: string): Promise<PricingDefaults | null> {
        const store = await this.getStore();
        return await store.getPricingDefaults(apartmentId);
    }

    async upsertPricingDefaults(apartmentId: string, defaults: PricingDefaults): Promise<void> {
        const store = await this.getStore();
        // Normalize surcharge
        if (defaults.shortStayMode !== 'WITH_SURCHARGE') {
            defaults.surchargeValue = 0;
        }
        await store.savePricingDefaults(apartmentId, defaults);
    }

    async getNightlyRates(apartmentId: string, from: string, to: string): Promise<NightlyRateOverride[]> {
        const store = await this.getStore();
        const overrides = await store.getNightlyRates(apartmentId, from, to);
        const defaults = await this.getPricingDefaults(apartmentId);

        if (!defaults) return overrides;

        // Fallback defaults -> nightly for individual fields if they are missing/null in the override
        return overrides.map(o => ({
            ...o,
            price: o.price ?? defaults.basePrice,
            minNights: o.minNights ?? defaults.defaultMinNights,
            shortStayMode: o.shortStayMode ?? defaults.shortStayMode,
            surchargeType: o.surchargeType ?? defaults.surchargeType,
            surchargeValue: o.surchargeValue ?? defaults.surchargeValue,
        }));
    }

    async upsertNightlyRatesBulk(apartmentId: string, rates: Partial<NightlyRateOverride>[]): Promise<void> {
        const store = await this.getStore();
        await store.upsertNightlyRatesBulk(apartmentId, rates);
    }

    async deleteNightlyRatesRange(apartmentId: string, from: string, to: string): Promise<void> {
        const store = await this.getStore();
        await store.deleteNightlyRatesRange(apartmentId, from, to);
    }

    private resolvePolicy(p1: ShortStayMode, p2: ShortStayMode): ShortStayMode {
        if (p1 === 'NOT_ALLOWED' || p2 === 'NOT_ALLOWED') return 'NOT_ALLOWED';
        if (p1 === 'WITH_SURCHARGE' || p2 === 'WITH_SURCHARGE') return 'WITH_SURCHARGE';
        return 'ALLOWED';
    }

    /**
     * Computes the final pricing rules for a stay range by merging defaults and overrides.
     * @param apartmentId The ID of the apartment.
     * @param startDate The start date of the range (YYYY-MM-DD).
     * @param endDate The end date of the range (YYYY-MM-DD, exclusive).
     */
    async computeStayRules(apartmentId: string, startDate: string, endDate: string): Promise<DayStayRule[]> {
        const defaults = await this.getPricingDefaults(apartmentId);
        if (!defaults) return [];

        const overrides = await this.getNightlyRates(apartmentId, startDate, endDate);
        const overridesMap = new Map<string, NightlyRateOverride>();
        overrides.forEach(o => overridesMap.set(o.date, o));

        const rules: DayStayRule[] = [];
        let current = new Date(startDate);
        const end = new Date(endDate);

        while (current < end) {
            const dateStr = current.toISOString().split('T')[0];
            const override = overridesMap.get(dateStr);

            // Logic: MAX(minNights) and policy DISALLOW > SURCHARGE > NONE
            const effectiveMinNights = Math.max(defaults.defaultMinNights, override?.minNights ?? 0);
            const effectivePolicy = this.resolvePolicy(defaults.shortStayMode, override?.shortStayMode ?? 'ALLOWED');

            rules.push({
                date: dateStr,
                price: override?.price ?? defaults.basePrice,
                minNights: effectiveMinNights,
                shortStayMode: effectivePolicy,
                surchargeType: override?.surchargeType ?? defaults.surchargeType,
                surchargeValue: override?.surchargeValue ?? defaults.surchargeValue,
                isOverride: !!override
            });

            current.setDate(current.getDate() + 1);
        }

        return rules;
    }
}

export const pricingStudioStore = new PricingStudioStore();
