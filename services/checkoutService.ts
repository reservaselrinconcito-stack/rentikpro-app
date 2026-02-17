import { BookingPolicy, CancellationRule } from '../types';

export interface CheckoutResult {
    total: number;
    deposit: number;
    remaining: number;
    currency: string;
    schedule: PaymentScheduleItem[];
    summary_texts: string[];
    cancellation_text: string;
}

export interface PaymentScheduleItem {
    type: 'DEPOSIT' | 'REMAINING';
    amount: number;
    due_description: string;
    due_date?: string; // ISO Date if calculable
}

export interface BookingDraft {
    check_in: string; // YYYY-MM-DD
    check_out: string;
    total_price: number; // Base price including cleaning/fees
}

export class CheckoutService {

    computeCheckout(draft: BookingDraft, policy: BookingPolicy): CheckoutResult {
        const total = this.round(draft.total_price);
        let deposit = 0;
        let remaining = total;
        const schedule: PaymentScheduleItem[] = [];
        const texts: string[] = [];

        // 1. Calculate Deposit Amount
        if (policy.payment_mode === 'PAY_ON_ARRIVAL') {
            deposit = 0;
        } else if (policy.payment_mode === 'FULL_PREPAY') {
            deposit = total;
        } else if (policy.payment_mode === 'DEPOSIT_ONLY' || policy.payment_mode === 'SPLIT_CUSTOM') {
            if (policy.deposit_type === 'PERCENT') {
                deposit = this.round(total * (policy.deposit_value / 100));
            } else {
                deposit = Math.min(total, policy.deposit_value);
            }
        }

        remaining = this.round(total - deposit);

        // 2. Build Schedule
        // A. Deposit (Pay Now/Soon)
        if (deposit > 0) {
            schedule.push({
                type: 'DEPOSIT',
                amount: deposit,
                due_description: policy.deposit_due === 'IMMEDIATE' ? 'Pago inmediato para confirmar' : `Pago dentro de ${policy.deposit_due_hours || 24} horas`
            });
            texts.push(`Se requiere un pago de ${deposit} ${policy.currency} (${policy.deposit_due === 'IMMEDIATE' ? 'ahora' : 'después de reservar'}) para confirmar.`);
        }

        // B. Remaining
        if (remaining > 0) {
            let dueDesc = 'A la llegada';
            if (policy.remaining_due === 'DAYS_BEFORE_CHECKIN' && policy.remaining_due_days) {
                dueDesc = `${policy.remaining_due_days} días antes de la entrada`;
            }
            schedule.push({
                type: 'REMAINING',
                amount: remaining,
                due_description: dueDesc
            });
            texts.push(`El resto (${remaining} ${policy.currency}) se pagará: ${dueDesc.toLowerCase()}.`);
        }

        // 3. Security Deposit
        if (policy.require_security_deposit) {
            const method = policy.security_deposit_method === 'HOLD_CARD' ? 'retención en tarjeta' :
                policy.security_deposit_method === 'CASH' ? 'en efectivo' : 'por transferencia';
            texts.push(`Fianza de ${policy.security_deposit_amount} ${policy.currency} requerida mediante ${method}.`);
        }

        // 4. Cancellation Summary
        const cancelText = this.generateCancellationText(policy);

        return {
            total,
            deposit,
            remaining,
            currency: policy.currency,
            schedule,
            summary_texts: texts,
            cancellation_text: cancelText
        };
    }

    private generateCancellationText(policy: BookingPolicy): string {
        if (policy.cancellation_policy_type === 'FLEXIBLE') {
            return "Cancelación gratuita hasta 24h antes de la llegada.";
        }
        if (policy.cancellation_policy_type === 'MODERATE') {
            return "Cancelación gratuita hasta 5 días antes. Después, penalización parcial.";
        }
        if (policy.cancellation_policy_type === 'STRICT') {
            return "No reembolsable (o muy estricta según condiciones).";
        }
        if (policy.cancellation_policy_type === 'CUSTOM' && policy.cancellation_rules) {
            // Pick the most lenient rule to show as highlight
            const sorted = [...policy.cancellation_rules].sort((a, b) => b.until_days_before - a.until_days_before);
            if (sorted.length > 0) {
                const rule = sorted[0];
                return `Reembolso del ${rule.refund_percent}% cancelando hasta ${rule.until_days_before} días antes.`;
            }
            return "Consulte las condiciones de cancelación personalizadas.";
        }
        return "Condiciones de cancelación estándar.";
    }

    private round(num: number): number {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }
}

export const checkoutService = new CheckoutService();
