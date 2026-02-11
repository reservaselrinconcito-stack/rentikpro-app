
import { projectManager } from './projectManager';
import { pricingEngine } from './pricingEngine';

export class PublicCalendarExporter {
    async export(propertyId: string) {
        const store = projectManager.getStore();
        const property = (await store.getProperties()).find(p => p.id === propertyId);
        if (!property) throw new Error("Propiedad no encontrada");

        const units = await store.getApartments(propertyId);
        const bookings = await store.getBookings(); 

        const from = new Date().toISOString().split('T')[0];
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 365);
        const to = toDate.toISOString().split('T')[0];

        const payload = {
            schema: "rentikpro.public_calendar.v1",
            generatedAt: new Date().toISOString(),
            property: {
                propertyId: property.id,
                name: property.name,
                timezone: "Europe/Madrid",
                currency: "EUR"
            },
            version: {
                calendarRevision: Date.now(),
                pricingRuleSetRevisions: {} as any
            },
            units: units.map(u => ({ id: u.id, name: u.name })),
            range: { from, to },
            availability: {} as any,
            pricing: {} as any,
            restrictions: {} as any,
            ratePlans: {} as any,
            cancellationPolicies: {} as any,
        };

        const policies = await store.getCancellationPolicies(propertyId);
        policies.forEach(p => {
            payload.cancellationPolicies[p.id] = {
                name: p.name,
                type: p.type,
                rules: JSON.parse(p.rules_json || '{}')
            };
        });

        for (const unit of units) {
            // 1. Availability (Reconciliation Result)
            const unitBookings = bookings.filter(b => 
                b.apartment_id === unit.id && 
                b.status !== 'cancelled' &&
                b.check_out > from &&
                b.check_in < to
            );
            
            const blocked: string[] = [];
            for (const b of unitBookings) {
                let start = b.check_in < from ? from : b.check_in;
                let end = b.check_out > to ? to : b.check_out;
                
                let curr = new Date(start);
                const endDate = new Date(end);
                
                while(curr < endDate) {
                    blocked.push(curr.toISOString().split('T')[0]);
                    curr.setDate(curr.getDate() + 1);
                }
            }
            
            payload.availability[unit.id] = { blocked: Array.from(new Set(blocked)).sort() };

            // 2. Pricing & Restrictions (Base)
            const baseData = await pricingEngine.getPublicData(unit.id, from, to);
            
            payload.pricing[unit.id] = {
                mode: "PER_DAY",
                days: baseData.pricing
            };
            
            payload.restrictions[unit.id] = {
                days: baseData.restrictions
            };

            if (baseData.ruleSetVersion) {
                payload.version.pricingRuleSetRevisions[unit.id] = baseData.ruleSetVersion;
            }

            // 3. Rate Plans & "From" Price
            payload.ratePlans[unit.id] = [];
            const unitRatePlans = await store.getRatePlans(unit.id);

            for (const plan of unitRatePlans) {
                if (!plan.is_active) continue;

                const planPricingData = await pricingEngine.getPublicData(unit.id, from, to, plan.id);
                const dailyPrices = Object.values(planPricingData.pricing).map((p: any) => p.price).filter(p => p > 0);
                const fromPrice = dailyPrices.length > 0 ? Math.min(...dailyPrices) : 0;
                
                payload.ratePlans[unit.id].push({
                    ratePlanId: plan.id,
                    name: plan.name,
                    cancellationPolicyId: plan.cancellation_policy_id,
                    price_modifier_type: plan.price_modifier_type,
                    price_modifier_value: plan.price_modifier_value,
                    fromPrice: fromPrice
                });
            }
        }

        return payload;
    }
}

export const publicCalendarExporter = new PublicCalendarExporter();
