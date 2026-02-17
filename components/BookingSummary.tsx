import React, { useMemo } from 'react';
import { BookingPolicy } from '../services/sqliteStore'; // Actually types, but let's correct import
import { BookingPolicy as IBookingPolicy } from '../types';
import { CheckoutService, checkoutService, BookingDraft, CheckoutResult } from '../services/checkoutService';
import { CreditCard, Wallet, Banknote, CalendarCheck, AlertCircle } from 'lucide-react';

interface Props {
    draft: BookingDraft;
    policy: IBookingPolicy;
}

export const BookingSummary: React.FC<Props> = ({ draft, policy }) => {

    const result: CheckoutResult = useMemo(() => {
        return checkoutService.computeCheckout(draft, policy);
    }, [draft, policy]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Pago</h3>

            {/* Total Highlight */}
            <div className="flex justify-between items-baseline mb-6 pb-4 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Total Reserva</span>
                <span className="text-3xl font-bold text-gray-900">
                    {result.total.toLocaleString('es-ES', { style: 'currency', currency: result.currency })}
                </span>
            </div>

            {/* Payment Schedule */}
            <div className="space-y-4 mb-6">
                {result.schedule.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center ${item.type === 'DEPOSIT' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            {item.type === 'DEPOSIT' ? <CreditCard className="w-5 h-5 text-blue-600" /> : <CalendarCheck className="w-5 h-5 text-gray-400" />}
                            <div className="flex flex-col">
                                <span className={`font-medium ${item.type === 'DEPOSIT' ? 'text-blue-900' : 'text-gray-700'}`}>
                                    {item.type === 'DEPOSIT' ? 'Pagar Ahora' : 'Pendiente'}
                                </span>
                                <span className="text-xs text-gray-500">{item.due_description}</span>
                            </div>
                        </div>
                        <span className="font-bold text-gray-900">
                            {item.amount.toLocaleString('es-ES', { style: 'currency', currency: result.currency })}
                        </span>
                    </div>
                ))}
            </div>

            {/* Summary Texts / Security Deposit */}
            <div className="space-y-2 mb-6">
                {result.summary_texts.map((text, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                        <span>{text}</span>
                    </div>
                ))}
            </div>

            {/* Cancellation Policy */}
            <div className="bg-gray-50 p-3 rounded text-xs text-gray-500 mb-4">
                <strong className="block text-gray-700 mb-1">Política de Cancelación</strong>
                {result.cancellation_text}
            </div>

            {/* Accepted Methods */}
            <div className="pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 block">Métodos de pago aceptados</span>
                <div className="flex gap-2 flex-wrap">
                    {policy.accepted_methods.includes('CARD') && <Badge icon={<CreditCard className="w-3 h-3" />} label="Tarjeta" />}
                    {policy.accepted_methods.includes('CASH') && <Badge icon={<Banknote className="w-3 h-3" />} label="Efectivo" />}
                    {policy.accepted_methods.includes('BIZUM') && <Badge icon={<Wallet className="w-3 h-3" />} label="Bizum" />}
                    {policy.accepted_methods.includes('BANK_TRANSFER') && <Badge label="Transferencia" />}
                </div>
            </div>
        </div>
    );
};

const Badge = ({ icon, label }: { icon?: React.ReactNode, label: string }) => (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        {icon}
        {label}
    </span>
);
