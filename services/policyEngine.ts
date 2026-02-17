import { BookingPolicy, ProvisionalBooking } from '../types';

export interface CancellationOutcome {
    refund_percent: number;
    refund_amount: number;
    explanation: string;
    cancellation_fee: number;
}

export class PolicyEngine {

    getCancellationOutcome(policy: BookingPolicy, booking: ProvisionalBooking, cancelRequestedAt: number = Date.now()): CancellationOutcome {

        // 1. Calculate Days Before Check-in
        const checkInDate = new Date(booking.start_date); // YYYY-MM-DD
        // Reset time parts to ensure pure day difference? 
        // Or keep time if we want strict 24h?
        // Usually policies are "Days before". Let's assume Check-in is at 00:00 of that day for calculation safety, 
        // or compare to 15:00. Let's stick to simple day diff for now.

        // Normalize:
        const checkInTs = new Date(booking.start_date + 'T15:00:00').getTime(); // Assume 3PM standard
        const diffMs = checkInTs - cancelRequestedAt;
        const daysBefore = diffMs / (1000 * 60 * 60 * 24);

        if (daysBefore < 0) {
            return {
                refund_percent: 0,
                refund_amount: 0,
                explanation: 'La fecha de entrada ya ha pasado.',
                cancellation_fee: booking.total_price
            };
        }

        let refundPercent = 0;
        let explanation = '';

        switch (policy.cancellation_policy_type) {
            case 'FLEXIBLE':
                // Free up to 24h before (1 day)
                if (daysBefore >= 1) {
                    refundPercent = 100;
                    explanation = 'Cancelación gratuita (Flexible: >24h antes).';
                } else {
                    refundPercent = 0; // Or first night? Let's assume 0 for simple flexible logic: "Cancel up to 24h" usually means full refund. After that? Standard is often 0 or 1 night. 
                    // Let's implement: 100% if > 1 day. 0% if < 1 day.
                    explanation = 'Cancelación fuera de plazo (<24h). Sin reembolso.';
                }
                break;

            case 'MODERATE':
                // Free up to 5 days before.
                if (daysBefore >= 5) {
                    refundPercent = 100;
                    explanation = 'Cancelación gratuita (Moderada: >5 días antes).';
                } else {
                    refundPercent = 50;
                    explanation = 'Cancelación tardía (Moderada: <5 días). Reembolso del 50%.';
                }
                break;

            case 'STRICT':
                refundPercent = 0;
                explanation = 'Política Estricta. Sin reembolso.';
                // Often strict allows 48h grace period after booking if far away, but for simplicity: 0.
                break;

            case 'CUSTOM':
                if (policy.cancellation_rules && policy.cancellation_rules.length > 0) {
                    // Sort rules descending by days
                    const rules = [...policy.cancellation_rules].sort((a, b) => b.until_days_before - a.until_days_before);
                    // Find first rule that matches
                    const applicableRule = rules.find(r => daysBefore >= r.until_days_before);

                    if (applicableRule) {
                        refundPercent = applicableRule.refund_percent;
                        explanation = `Regla personalizada aplicada: Cancelación >= ${applicableRule.until_days_before} días antes.`;
                    } else {
                        // If no rule matches (e.g. daysBefore is 1, and rules stop at 7), assume 0%?
                        refundPercent = 0;
                        explanation = 'Fuera de plazo de cancelación personalizada.';
                    }
                } else {
                    // Fallback if custom but no rules
                    refundPercent = 0;
                    explanation = 'Sin reglas definidas (Estricta por defecto).';
                }
                break;
        }

        const refundAmount = (booking.total_price * refundPercent) / 100;
        const fee = booking.total_price - refundAmount;

        return {
            refund_percent: refundPercent,
            refund_amount: refundAmount,
            explanation: explanation,
            cancellation_fee: fee
        };
    }
}

export const policyEngine = new PolicyEngine();
