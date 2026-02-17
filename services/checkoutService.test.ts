import { describe, it, expect } from 'vitest';
import { checkoutService, BookingDraft } from './checkoutService.ts';
import { BookingPolicy } from '../types.ts';

const mockDraft: BookingDraft = {
    check_in: '2026-08-01',
    check_out: '2026-08-05',
    total_price: 1000
};

const basePolicy: BookingPolicy = {
    id: 'p1', scope_type: 'PROPERTY', scope_id: '1', currency: 'EUR',
    payment_mode: 'DEPOSIT_ONLY', deposit_type: 'PERCENT', deposit_value: 30,
    deposit_due: 'IMMEDIATE', remaining_due: 'ON_ARRIVAL',
    accepted_methods: ['CARD'], require_security_deposit: false,
    security_deposit_method: 'NONE', cancellation_policy_type: 'FLEXIBLE',
    created_at: 0, updated_at: 0
};

describe('CheckoutService', () => {

    it('1. Deposit Only (30%)', () => {
        const res = checkoutService.computeCheckout(mockDraft, basePolicy);

        expect(res.total).toBe(1000);
        expect(res.deposit).toBe(300); // 30% of 1000
        expect(res.remaining).toBe(700);
        expect(res.schedule).toHaveLength(2);
        expect(res.schedule[0].type).toBe('DEPOSIT');
        expect(res.schedule[0].amount).toBe(300);
        expect(res.schedule[1].type).toBe('REMAINING');
        expect(res.schedule[1].amount).toBe(700);
    });

    it('2. Full Prepay', () => {
        const policy: BookingPolicy = { ...basePolicy, payment_mode: 'FULL_PREPAY' };
        const res = checkoutService.computeCheckout(mockDraft, policy);

        expect(res.deposit).toBe(1000);
        expect(res.remaining).toBe(0);
        expect(res.schedule).toHaveLength(1); // Only deposit
        expect(res.schedule[0].type).toBe('DEPOSIT');
    });

    it('3. Pay On Arrival', () => {
        const policy: BookingPolicy = { ...basePolicy, payment_mode: 'PAY_ON_ARRIVAL' };
        const res = checkoutService.computeCheckout(mockDraft, policy);

        expect(res.deposit).toBe(0);
        expect(res.remaining).toBe(1000);
        expect(res.schedule).toHaveLength(1); // Only remaining
        expect(res.schedule[0].type).toBe('REMAINING');
    });

    it('4. Fixed Deposit', () => {
        const policy: BookingPolicy = {
            ...basePolicy,
            payment_mode: 'DEPOSIT_ONLY',
            deposit_type: 'FIXED',
            deposit_value: 150
        };
        const res = checkoutService.computeCheckout(mockDraft, policy);

        expect(res.deposit).toBe(150);
        expect(res.remaining).toBe(850);
    });

    it('5. Security Deposit Text', () => {
        const policy: BookingPolicy = {
            ...basePolicy,
            require_security_deposit: true,
            security_deposit_amount: 200,
            security_deposit_method: 'HOLD_CARD'
        };
        const res = checkoutService.computeCheckout(mockDraft, policy);

        expect(res.summary_texts.some(t => t.includes('Fianza de 200'))).toBe(true);
        expect(res.summary_texts.some(t => t.includes('retención en tarjeta'))).toBe(true);
    });

});
