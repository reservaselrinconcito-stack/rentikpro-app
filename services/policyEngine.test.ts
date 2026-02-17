import { describe, it, expect } from 'vitest';
import { policyEngine } from './policyEngine.ts';
import { BookingPolicy, ProvisionalBooking } from '../types.ts';

const mockBooking: ProvisionalBooking = {
    id: 'b1', provider: 'DIRECT_WEB', status: 'CONFIRMED', source: 'WEB_CHECKOUT',
    start_date: '2026-08-10', end_date: '2026-08-15', total_price: 1000,
    created_at: 0, updated_at: 0, currency: 'EUR', guest_name: 'Test', pax_adults: 2
};

const basePolicy: BookingPolicy = {
    id: 'p1', scope_type: 'PROPERTY', scope_id: '1', currency: 'EUR',
    payment_mode: 'PAY_ON_ARRIVAL', deposit_type: 'PERCENT', deposit_value: 0,
    deposit_due: 'IMMEDIATE', remaining_due: 'ON_ARRIVAL', accepted_methods: [],
    require_security_deposit: false, security_deposit_method: 'NONE',
    cancellation_policy_type: 'FLEXIBLE', created_at: 0, updated_at: 0
};

describe('PolicyEngine', () => {

    it('1. Flexible: > 24h before (Full Refund)', () => {
        // Check-in: 10th Aug (3PM)
        // Cancel: 5th Aug
        const cancelDate = new Date('2026-08-05T12:00:00').getTime();
        const outcome = policyEngine.getCancellationOutcome(basePolicy, mockBooking, cancelDate);

        expect(outcome.refund_percent).toBe(100);
        expect(outcome.refund_amount).toBe(1000);
        expect(outcome.explanation).toContain('Flexible');
    });

    it('2. Flexible: < 24h before (No Refund)', () => {
        // Check-in: 2026-08-10T15:00:00
        // Cancel: 2026-08-10T10:00:00 (5h before)
        const cancelDate = new Date('2026-08-10T10:00:00').getTime();
        const outcome = policyEngine.getCancellationOutcome(basePolicy, mockBooking, cancelDate);

        expect(outcome.refund_percent).toBe(0);
        expect(outcome.refund_amount).toBe(0);
    });

    it('3. Custom Rule', () => {
        const customPolicy: BookingPolicy = {
            ...basePolicy,
            cancellation_policy_type: 'CUSTOM',
            cancellation_rules: [
                { until_days_before: 30, refund_percent: 100 },
                { until_days_before: 7, refund_percent: 50 },
            ]
        };

        // Case A: 40 days before -> 100%
        let cancelDate = new Date('2026-07-01T12:00:00').getTime();
        let outcome = policyEngine.getCancellationOutcome(customPolicy, mockBooking, cancelDate);
        expect(outcome.refund_percent).toBe(100);

        // Case B: 10 days before -> 50%
        cancelDate = new Date('2026-07-31T12:00:00').getTime();
        outcome = policyEngine.getCancellationOutcome(customPolicy, mockBooking, cancelDate);
        expect(outcome.refund_percent).toBe(50);
        expect(outcome.refund_amount).toBe(500);

        // Case C: 3 days before -> 0% (Fallback)
        cancelDate = new Date('2026-08-07T12:00:00').getTime();
        outcome = policyEngine.getCancellationOutcome(customPolicy, mockBooking, cancelDate);
        expect(outcome.refund_percent).toBe(0);
    });

    it('4. Strict', () => {
        const strictPolicy: BookingPolicy = { ...basePolicy, cancellation_policy_type: 'STRICT' };
        const cancelDate = new Date('2026-07-01T12:00:00').getTime(); // Way before
        const outcome = policyEngine.getCancellationOutcome(strictPolicy, mockBooking, cancelDate);

        expect(outcome.refund_percent).toBe(0);
        expect(outcome.explanation).toContain('Estricta');
    });

});
