
import React, { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { Booking, BookingPolicy } from '../types';
import { dateFormat } from '../services/dateFormat';
import { CheckCircle2, Circle, AlertCircle, Calendar, CreditCard, MessageSquare } from 'lucide-react';
import { checkoutService, CheckoutResult } from '../services/checkoutService';
import { formatDateES } from '../utils/dateFormat';

interface DirectPaymentListProps {
    onUpdate?: () => void;
}

export const DirectPaymentList: React.FC<DirectPaymentListProps> = ({ onUpdate }) => {
    const store = useStore();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        setLoading(true);
        const allBookings = await store.getBookings();
        // Filter: DIRECT_WEB or Manual source
        const direct = allBookings.filter(b =>
            (b.source === 'DIRECT_WEB' || b.source === 'WEB_CHECKOUT' || b.source === 'Manual') &&
            b.status !== 'cancelled'
        );
        // Sort by check-in (soonest first)
        direct.sort((a, b) => a.check_in.localeCompare(b.check_in));
        setBookings(direct);
        setLoading(false);
    };

    const updateBooking = async (id: string, updates: Partial<Booking>) => {
        const booking = bookings.find(b => b.id === id);
        if (!booking) return;

        const updated = { ...booking, ...updates };
        await store.saveBooking(updated);
        loadBookings();
        if (onUpdate) onUpdate();
    };

    const handleToggleDeposit = async (b: Booking) => {
        if (b.deposit_paid_at) {
            if (!confirm('¿Marcar depósito como NO pagado?')) return;
            await updateBooking(b.id, { deposit_paid_at: undefined });
        } else {
            await updateBooking(b.id, { deposit_paid_at: Date.now() });
        }
    };

    const handleToggleRemaining = async (b: Booking) => {
        if (b.remaining_paid_at) {
            if (!confirm('¿Marcar resto como NO pagado?')) return;
            await updateBooking(b.id, { remaining_paid_at: undefined, payment_status: 'PARTIAL' });
        } else {
            await updateBooking(b.id, { remaining_paid_at: Date.now(), payment_status: 'PAID' });
        }
    };

    const saveNote = async (id: string) => {
        await updateBooking(id, { payment_notes: noteText });
        setEditingNoteId(null);
    };

    const getPaymentDetails = (b: Booking) => {
        // Try to parse snapshot first
        let depositAmount = 0;
        let remainingAmount = b.total_price;
        let depositDue = 'Inmediato';
        let remainingDue = 'A la llegada';

        if (b.policy_snapshot) {
            try {
                const snapshot = JSON.parse(b.policy_snapshot);
                const breakdown = snapshot.breakdown as CheckoutResult;
                if (breakdown) {
                    depositAmount = breakdown.deposit;
                    remainingAmount = breakdown.remaining;
                    // Extract due dates/descriptions from schedule if needed
                    const depItem = breakdown.schedule.find(s => s.type === 'DEPOSIT');
                    const remItem = breakdown.schedule.find(s => s.type === 'REMAINING');
                    if (depItem) depositDue = depItem.due_description;
                    if (remItem) remainingDue = remItem.due_description;
                }
            } catch (e) {
                // Fallback manual calc if snapshot invalid
                console.warn('Invalid policy snapshot', e);
            }
        } else {
            // Fallback: Default 30% deposit if no snapshot? Or just show totals.
            // Let's assume 30% hardcoded fallback for display if missing
            depositAmount = Math.round(b.total_price * 0.3 * 100) / 100;
            remainingAmount = b.total_price - depositAmount;
        }

        return { depositAmount, remainingAmount, depositDue, remainingDue };
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando pagos...</div>;

    if (bookings.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50 rounded-3xl border border-slate-100">
                <CreditCard size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-700">Sin Reservas Directas</h3>
                <p className="text-slate-400">No hay reservas pendientes de gestión de cobros.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {bookings.map(b => {
                const { depositAmount, remainingAmount, depositDue, remainingDue } = getPaymentDetails(b);
                const isDepositPaid = !!b.deposit_paid_at;
                const isRemainingPaid = !!b.remaining_paid_at;
                const isFullyPaid = isDepositPaid && isRemainingPaid;

                return (
                    <div key={b.id} className={`bg-white p-6 rounded-2xl border transition-all ${isFullyPaid ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-200 shadow-sm'}`}>
                        <div className="flex flex-col md:flex-row justify-between gap-6">

                            {/* Header Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-bold text-slate-800 text-lg">{b.guest_name || 'Huésped'}</h4>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded">{b.source}</span>
                                    {isFullyPaid && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase rounded flex items-center gap-1"><CheckCircle2 size={10} /> Pagado</span>}
                                </div>
                                <div className="text-sm text-slate-500 flex items-center gap-4">
                                    <span className="flex items-center gap-1"><Calendar size={14} /> {formatDateES(b.check_in)} - {formatDateES(b.check_out)}</span>
                                    <span className="font-mono font-bold text-slate-700">{b.total_price} €</span>
                                </div>

                                {/* Notes Section */}
                                <div className="mt-4">
                                    {editingNoteId === b.id ? (
                                        <div className="flex gap-2">
                                            <input
                                                autoFocus
                                                className="flex-1 px-3 py-1 text-xs border rounded-lg bg-slate-50"
                                                value={noteText}
                                                onChange={e => setNoteText(e.target.value)}
                                                placeholder="Añadir nota de pago..."
                                            />
                                            <button onClick={() => saveNote(b.id)} className="text-xs bg-slate-900 text-white px-3 py-1 rounded-lg">Guardar</button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => { setEditingNoteId(b.id); setNoteText(b.payment_notes || ''); }}
                                            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1"
                                        >
                                            <MessageSquare size={12} />
                                            {b.payment_notes || "Añadir nota..."}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Actions */}
                            <div className="flex flex-col sm:flex-row gap-4">

                                {/* Deposit Box */}
                                <div className={`p-4 rounded-xl border ${isDepositPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'} w-48`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Depósito</span>
                                        <button onClick={() => handleToggleDeposit(b)} className={`${isDepositPaid ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}>
                                            {isDepositPaid ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                        </button>
                                    </div>
                                    <div className="font-bold text-slate-700 text-lg">{depositAmount} €</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{isDepositPaid ? `Pagado: ${formatDateES(new Date(b.deposit_paid_at!).toISOString().split('T')[0])}` : depositDue}</div>
                                </div>

                                {/* Remaining Box */}
                                <div className={`p-4 rounded-xl border ${isRemainingPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'} w-48`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Restante</span>
                                        <button onClick={() => handleToggleRemaining(b)} className={`${isRemainingPaid ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}>
                                            {isRemainingPaid ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                        </button>
                                    </div>
                                    <div className="font-bold text-slate-700 text-lg">{remainingAmount} €</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{isRemainingPaid ? `Pagado: ${formatDateES(new Date(b.remaining_paid_at!).toISOString().split('T')[0])}` : remainingDue}</div>
                                </div>

                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
