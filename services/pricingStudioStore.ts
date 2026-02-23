
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
        const d = await store.getPricingDefaults(apartmentId);
        if (!d) return null;

        // Invariants (FASE 1): missing values must be null (never 0).
        // If basePrice is not a positive finite number, treat as "no defaults".
        const base = (typeof (d as any).basePrice === 'number') ? (d as any).basePrice : Number((d as any).basePrice);
        if (!Number.isFinite(base) || base <= 0) return null;

        const minN = (typeof (d as any).defaultMinNights === 'number') ? (d as any).defaultMinNights : Number((d as any).defaultMinNights);
        const defaultMinNights = Number.isFinite(minN) && minN >= 1 ? Math.floor(minN) : 1;

        const shortStayMode = (d.shortStayMode === 'ALLOWED' || d.shortStayMode === 'NOT_ALLOWED' || d.shortStayMode === 'WITH_SURCHARGE')
            ? d.shortStayMode
            : 'ALLOWED';

        const surchargeType = (d.surchargeType === 'PERCENT' || d.surchargeType === 'FIXED')
            ? d.surchargeType
            : 'PERCENT';

        const sv = (typeof (d as any).surchargeValue === 'number') ? (d as any).surchargeValue : Number((d as any).surchargeValue);
        const surchargeValue = Number.isFinite(sv) ? sv : 0;

        return {
            apartmentId: d.apartmentId,
            currency: d.currency || 'EUR',
            basePrice: base,
            defaultMinNights,
            shortStayMode,
            surchargeType,
            surchargeValue,
        };
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

        const normalizePositiveNumberOrNull = (v: any): number | null => {
            if (v === undefined || v === null) return null;
            const n = typeof v === 'number' ? v : Number(v);
            if (!Number.isFinite(n)) return null;
            // Invariant: when not set, use null (never 0)
            if (n <= 0) return null;
            return n;
        };

        const normalizeMinNightsOrNull = (v: any): number | null => {
            if (v === undefined || v === null) return null;
            const n = typeof v === 'number' ? v : Number(v);
            if (!Number.isFinite(n)) return null;
            if (n <= 0) return null;
            return Math.floor(n);
        };

        // Fallback defaults -> nightly for individual fields if they are missing/null in the override
        return overrides.map(o => ({
            ...o,
            price: normalizePositiveNumberOrNull(o.price) ?? defaults.basePrice,
            minNights: normalizeMinNightsOrNull(o.minNights) ?? defaults.defaultMinNights,
            shortStayMode: o.shortStayMode ?? defaults.shortStayMode,
            surchargeType: o.surchargeType ?? defaults.surchargeType,
            surchargeValue: o.surchargeValue ?? defaults.surchargeValue,
        }));
    }

    private getTodayStr(): string {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    async upsertNightlyRatesBulk(apartmentId: string, rates: Partial<NightlyRateOverride>[]): Promise<{ skippedCount: number }> {
        const store = await this.getStore();
        const todayStr = this.getTodayStr();
        const validRates = rates.filter(r => r.date && r.date >= todayStr);
        const skippedCount = rates.length - validRates.length;

        if (validRates.length > 0) {
            await store.upsertNightlyRatesBulk(apartmentId, validRates);
        }
        return { skippedCount };
    }

    async deleteNightlyRatesRange(apartmentId: string, from: string, to: string): Promise<void> {
        const store = await this.getStore();
        const todayStr = this.getTodayStr();
        const effectiveFrom = from < todayStr ? todayStr : from;

        if (effectiveFrom <= to) {
            await store.deleteNightlyRatesRange(apartmentId, effectiveFrom, to);
        }
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
