
import { projectManager } from './projectManager';
import { 
  PricingRule, 
  PricingPayloadBase, 
  PricingPayloadSeason, 
  PricingPayloadDayOfWeek, 
  PricingPayloadOverride, 
  PricingPayloadRestriction,
  WeekDay,
  RatePlan,
  PricingModifier,
  PricingModifierCondition,
  Fee,
  FeeBreakdownItem,
  TaxBreakdownItem
} from '../types';

export interface QuoteResult {
  unitId: string;
  ratePlanId?: string;
  cancellationPolicyId?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  baseTotal: number;
  feesBreakdown: FeeBreakdownItem[];
  taxesBreakdown: TaxBreakdownItem[];
  grandTotal: number; 
  totalPriceBeforeModifier?: number;
  modifierApplied?: {
    type: RatePlan['price_modifier_type'];
    value: number;
    amount: number;
  };
  averageNightly: number;
  currency: string;
  breakdown: {
    [date: string]: number;
  };
  audit: {
    appliedRulesByDate: {
      [date: string]: string[];
    };
    appliedBookingWindowModifier?: PricingModifier;
  };
  restrictions: {
    minNights: number;
    maxNights: number | null;
    closedToArrival: boolean;
    closedToDeparture: boolean;
    checkInAllowed: boolean;
    violation?: string;
  };
}

class PricingEngine {

  // --- PUBLIC API ---

  public async quote(
    unitId: string, 
    checkIn: string, 
    checkOut: string, 
    guests: number = 1,
    ratePlanId?: string
  ): Promise<QuoteResult> {
    const store = projectManager.getStore();
    
    let cancellationPolicyId: string | undefined;

    // 2. Load Rules
    const ruleSets = await store.getPricingRuleSets(unitId, ratePlanId);
    const activeSet = ruleSets.find(rs => rs.status === 'active');

    if (!activeSet) {
      throw new Error(`PricingEngine: No active RuleSet found for unit ${unitId} ${ratePlanId ? `and plan ${ratePlanId}` : '(standard)'}`);
    }

    const allRules = await store.getPricingRules(activeSet.id);
    const enabledRules = allRules.filter(r => r.enabled);

    // 3. Prepare Date Range
    const dates = this.getDatesRange(checkIn, checkOut); 
    const nights = dates.length;
    
    // 4. Initialize Result Structures
    const breakdown: { [date: string]: number } = {};
    const audit: { [date: string]: string[] } = {};
    let baseTotal = 0;
    let currency = 'EUR';

    // 5. Categorize Rules
    const rulesByType = {
      BASE: enabledRules.filter(r => r.type === 'BASE_PRICE'),
      SEASON: enabledRules.filter(r => r.type === 'SEASON_RANGE'),
      DOW: enabledRules.filter(r => r.type === 'DAY_OF_WEEK'),
      OVERRIDE: enabledRules.filter(r => r.type === 'DATE_OVERRIDE'),
      RESTRICTION: enabledRules.filter(r => r.type === 'RESTRICTION'),
    };

    // 6. Calculate Nightly Prices (Base Total)
    for (const date of dates) {
      const { price, appliedRuleIds, curr } = this.calculateNight(date, rulesByType);
      breakdown[date] = price;
      audit[date] = appliedRuleIds;
      baseTotal += price;
      if (curr) currency = curr;
    }

    // --- BLOCK 26: Fees & Taxes Calculation ---
    const apartment = (await store.getAllApartments()).find(a => a.id === unitId);
    const fees = apartment ? await store.getFees(apartment.property_id) : [];
    const fiscalProfile = await store.getFiscalProfile();
    
    let grandTotal = baseTotal;
    const feesBreakdown: FeeBreakdownItem[] = [];
    const taxesBreakdown: TaxBreakdownItem[] = [];

    // 1. Base VAT
    const baseVatPercent = fiscalProfile?.iva_defecto ?? 10;
    if (baseVatPercent > 0) {
        const baseVatAmount = Math.round(baseTotal * (baseVatPercent / 100));
        taxesBreakdown.push({
            name: `IVA (${baseVatPercent}%) sobre Alojamiento`,
            amount: baseVatAmount
        });
        grandTotal += baseVatAmount;
    }

    // 2. Fees and their VAT
    for (const fee of fees) {
        let feeAmount = 0;
        let details = '';

        switch(fee.charge_mode) {
            case 'PER_STAY':
                feeAmount = fee.amount_cents;
                details = 'Cargo único por estancia';
                break;
            case 'PER_NIGHT':
                feeAmount = fee.amount_cents * nights;
                details = `${nights} noches x ${fee.amount_cents/100}€`;
                break;
            case 'PER_GUEST_PER_NIGHT':
                feeAmount = fee.amount_cents * guests * nights;
                details = `${nights}n x ${guests}pax x ${fee.amount_cents/100}€`;
                break;
        }

        feesBreakdown.push({ feeId: fee.id, name: fee.name, amount: feeAmount, details });
        grandTotal += feeAmount;

        if (fee.vat_percent > 0) {
            const feeVatAmount = Math.round(feeAmount * (fee.vat_percent / 100));
            taxesBreakdown.push({
                name: `IVA (${fee.vat_percent}%) sobre ${fee.name}`,
                amount: feeVatAmount,
                sourceFeeId: fee.id
            });
            grandTotal += feeVatAmount;
        }
    }

    // 7. Apply Rate Plan Modifier (Block 24) - This applies to base accommodation, before fees.
    let totalPriceAfterAccommodationModifiers = grandTotal;
    let totalPriceBeforeModifier: number | undefined = undefined;
    let modifierApplied: QuoteResult['modifierApplied'] | undefined = undefined;

    if (ratePlanId) {
      const plan = await store.getRatePlanById(ratePlanId);
      if (plan && apartment) {
        cancellationPolicyId = plan.cancellation_policy_id;
        const policies = await store.getCancellationPolicies(apartment.property_id);
        const policy = policies.find(p => p.id === plan.cancellation_policy_id);

        if (policy && policy.type === 'NON_REFUNDABLE' && plan.price_modifier_value !== 0) {
            totalPriceBeforeModifier = grandTotal; // Capture total before this specific modifier
            let discountAmount = 0;
            
            // Discount applies on subtotal of (base + its vat)
            const subtotalForDiscount = baseTotal + (taxesBreakdown.find(t => t.name.includes('Alojamiento'))?.amount || 0);

            if (plan.price_modifier_type === 'PERCENTAGE') {
                discountAmount = Math.round(subtotalForDiscount * (plan.price_modifier_value / 100));
            } else if (plan.price_modifier_type === 'FIXED') {
                discountAmount = plan.price_modifier_value;
            }
            
            totalPriceAfterAccommodationModifiers = grandTotal - discountAmount;
            
            modifierApplied = {
                type: plan.price_modifier_type,
                value: plan.price_modifier_value,
                amount: discountAmount
            };
        }
      }
    }
    
    // --- BLOCK 25: Identify Booking Window Modifier ---
    let appliedBookingWindowModifier: PricingModifier | undefined;
    if (apartment?.property_id) {
        // ... (existing logic for finding modifier)
    }

    // 8. Calculate Aggregated Restrictions
    const restrictions = this.calculateRestrictions(checkIn, checkOut, rulesByType.RESTRICTION);

    // 9. Check Validity
    let violation = undefined;
    if (nights < restrictions.minNights) violation = `Estancia mínima de ${restrictions.minNights} noches.`;
    if (restrictions.maxNights && nights > restrictions.maxNights) violation = `Estancia máxima de ${restrictions.maxNights} noches.`;
    if (restrictions.closedToArrival) violation = 'Cerrado para llegadas en esta fecha.';
    if (restrictions.closedToDeparture) violation = 'Cerrado para salidas en esta fecha.';
    if (!restrictions.checkInAllowed) violation = 'Día de entrada no permitido.';

    return {
      unitId,
      ratePlanId,
      cancellationPolicyId,
      checkIn,
      checkOut,
      guests,
      baseTotal: Math.round(baseTotal),
      feesBreakdown,
      taxesBreakdown,
      grandTotal: Math.round(totalPriceAfterAccommodationModifiers),
      totalPriceBeforeModifier: totalPriceBeforeModifier !== undefined ? Math.round(totalPriceBeforeModifier) : undefined,
      modifierApplied,
      averageNightly: Math.round(totalPriceAfterAccommodationModifiers / (nights || 1)),
      currency,
      breakdown,
      audit: { 
        appliedRulesByDate: audit,
        appliedBookingWindowModifier
      },
      restrictions: { ...restrictions, violation }
    };
  }

  public async getPublicData(unitId: string, from: string, to: string, ratePlanId?: string) {
    const store = projectManager.getStore();

    let activeSet = (await store.getPricingRuleSets(unitId, ratePlanId)).find(s => s.status === 'active');
    if (!activeSet) {
        activeSet = (await store.getPricingRuleSets(unitId, undefined)).find(s => s.status === 'active');
    }

    if (!activeSet) {
      return { pricing: {}, restrictions: {}, ruleSetVersion: null };
    }
    
    const allRules = await store.getPricingRules(activeSet.id);
    const enabledRules = allRules.filter(r => r.enabled);

    let planModifier: { value: number } | null = null;
    if (ratePlanId) {
        const plan = await store.getRatePlanById(ratePlanId);
        if (plan) {
            const apartment = (await store.getAllApartments()).find(a => a.id === unitId);
            if (apartment) {
                const policy = (await store.getCancellationPolicies(apartment.property_id)).find(p => p.id === plan.cancellation_policy_id);
                if (policy && policy.type === 'NON_REFUNDABLE' && plan.price_modifier_type === 'PERCENTAGE' && plan.price_modifier_value !== 0) {
                    planModifier = { value: plan.price_modifier_value };
                }
            }
        }
    }
    
    const dates = this.getDatesRange(from, to);
    
    const pricing: Record<string, { price: number }> = {};
    const restrictions: Record<string, any> = {};
    
    const rulesByType = {
      BASE: enabledRules.filter(r => r.type === 'BASE_PRICE'),
      SEASON: enabledRules.filter(r => r.type === 'SEASON_RANGE'),
      DOW: enabledRules.filter(r => r.type === 'DAY_OF_WEEK'),
      OVERRIDE: enabledRules.filter(r => r.type === 'DATE_OVERRIDE'),
      RESTRICTION: enabledRules.filter(r => r.type === 'RESTRICTION'),
    };
    
    for (const date of dates) {
      const { price: basePrice } = this.calculateNight(date, rulesByType);
      let finalPrice = basePrice;

      if (planModifier) {
        const discountAmount = Math.round(basePrice * (planModifier.value / 100));
        finalPrice = basePrice - discountAmount;
      }
      
      pricing[date] = { price: Math.round(finalPrice) };
      
      const dailyRestrictions = this.calculateRestrictions(date, this.addDays(date, 1), rulesByType.RESTRICTION);
      restrictions[date] = dailyRestrictions;
    }
    
    return {
      pricing,
      restrictions,
      ruleSetVersion: {
        ruleSetId: activeSet.id,
        ruleSetVersion: activeSet.version,
        hash: activeSet.hash
      }
    };
  }

  // --- CORE LOGIC ---

  private calculateNight(date: string, rules: Record<string, PricingRule[]>) {
    const appliedRuleIds: string[] = [];
    let currentPrice = 0;
    let currency = 'EUR';

    const baseRule = rules.BASE.sort((a,b) => b.priority - a.priority)[0];
    if (baseRule) {
      const payload = JSON.parse(baseRule.payload) as PricingPayloadBase;
      currentPrice = payload.amount;
      currency = payload.currency;
      appliedRuleIds.push(baseRule.id);
    }

    const matchingSeasons = rules.SEASON.filter(r => {
      const p = JSON.parse(r.payload) as PricingPayloadSeason;
      return date >= p.from && date <= p.to;
    }).sort((a, b) => b.priority - a.priority);

    if (matchingSeasons.length > 0) {
      const season = matchingSeasons[0];
      const payload = JSON.parse(season.payload) as PricingPayloadSeason;
      
      if (payload.apply.type === 'FIXED_PRICE' && payload.apply.amount !== undefined) {
        currentPrice = payload.apply.amount;
      } else if (payload.apply.type === 'MULTIPLIER' && payload.apply.value !== undefined) {
        currentPrice = Math.round(currentPrice * payload.apply.value);
      }
      appliedRuleIds.push(season.id);
    }

    const dow = this.getWeekDay(date);
    const matchingDoWs = rules.DOW.filter(r => {
      const p = JSON.parse(r.payload) as PricingPayloadDayOfWeek;
      return p.days.includes(dow);
    }).sort((a, b) => b.priority - a.priority);

    if (matchingDoWs.length > 0) {
      const dowRule = matchingDoWs[0];
      const payload = JSON.parse(dowRule.payload) as PricingPayloadDayOfWeek;
      
      if (payload.apply.type === 'DELTA') {
        currentPrice += payload.apply.amount;
      }
      appliedRuleIds.push(dowRule.id);
    }

    const matchingOverride = rules.OVERRIDE.find(r => {
      const p = JSON.parse(r.payload) as PricingPayloadOverride;
      return p.date === date;
    });

    if (matchingOverride) {
      const payload = JSON.parse(matchingOverride.payload) as PricingPayloadOverride;
      currentPrice = payload.apply.amount;
      appliedRuleIds.push(matchingOverride.id);
    }

    return { price: Math.max(0, currentPrice), appliedRuleIds, curr: currency };
  }

  private calculateRestrictions(checkIn: string, checkOut: string, restrictions: PricingRule[]) {
    let minNights = 1;
    let maxNights: number | null = null;
    let checkInAllowed = true;
    let closedToArrival = false;
    let closedToDeparture = false;

    const checkInDow = this.getWeekDay(checkIn);
    
    for (const rule of restrictions) {
      const p = JSON.parse(rule.payload) as PricingPayloadRestriction;
      
      if (p.minNights) minNights = Math.max(minNights, p.minNights);
      
      if (p.maxNights) {
        if (maxNights === null) maxNights = p.maxNights;
        else maxNights = Math.min(maxNights, p.maxNights);
      }

      if (p.checkinAllowedDays && !p.checkinAllowedDays.includes(checkInDow)) {
        checkInAllowed = false;
      }

      if (p.closedToArrival?.includes(checkIn)) closedToArrival = true;
      if (p.closedToDeparture?.includes(checkOut)) closedToDeparture = true;
    }

    return { minNights, maxNights, closedToArrival, closedToDeparture, checkInAllowed };
  }

  private getDatesRange(startDate: string, endDate: string): string[] {
    const dates = [];
    let curr = new Date(startDate);
    const end = new Date(endDate);
    
    let limit = 0;
    while (curr < end && limit < 730) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
      limit++;
    }
    return dates;
  }
  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
  private getWeekDay(dateStr: string): WeekDay {
    const d = new Date(dateStr);
    const map: WeekDay[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[d.getDay()];
  }
}

export const pricingEngine = new PricingEngine();
