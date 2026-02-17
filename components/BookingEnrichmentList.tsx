
import React, { useState, useEffect } from 'react';
import { ProvisionalBooking, Booking } from '../types';
import { useStore } from '../hooks/useStore';
import { policyEngine, CancellationOutcome } from '../services/policyEngine';
import { checkoutService } from '../services/checkoutService';
import { Share2, Check, X, AlertCircle, Edit, Trash2, XCircle, AlertTriangle, Calendar, User, CreditCard, ExternalLink } from 'lucide-react';
import { ProvisionalDetailModal } from './ProvisionalDetailModal';
import { projectManager } from '../services/projectManager';
import { Apartment, Property, Traveler } from '../types';


interface BookingEnrichmentListProps {
    onBookingConfirmed?: () => void;
}

export const BookingEnrichmentList: React.FC<BookingEnrichmentListProps> = ({ onBookingConfirmed }) => {
    const store = useStore();
    const [provisionals, setProvisionals] = useState<ProvisionalBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBooking, setEditingBooking] = useState<ProvisionalBooking | null>(null);

    // Cancellation State
    const [cancellingBooking, setCancellingBooking] = useState<ProvisionalBooking | null>(null);
    const [cancellationOutcome, setCancellationOutcome] = useState<CancellationOutcome | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [travelers, setTravelers] = useState<Traveler[]>([]);
    const [selectedProvisional, setSelectedProvisional] = useState<ProvisionalBooking | null>(null);

    useEffect(() => {
        loadProvisionals();
    }, []);

    const loadProvisionals = async () => {
        setLoading(true);
        if (store) {
            const bookings = await store.getProvisionalBookings();
            const apts = await store.getAllApartments();
            const props = await store.getProperties();
            const travs = await store.getTravelers();

            setProvisionals(bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'CANCELLED' || b.status === 'PENDING_DETAILS' || b.status === 'INQUIRY'));
            setApartments(apts);
            setProperties(props);
            setTravelers(travs);
        }
        setLoading(false);
    };

    const handleDismiss = async (id: string) => {
        if (!confirm('Are you sure you want to dismiss this provisional booking?')) return;
        if (store) {
            await store.deleteProvisionalBooking(id);
            loadProvisionals();
        }
    };

    const handleConfirm = async (pb: ProvisionalBooking) => {
        // simple confirmation for now - ideally opens a full booking editor
        if (!confirm(`Confirm booking for ${pb.guest_name} ? This will add it to the calendar.`)) return;

        if (!store) return;

        const newBooking: Booking = {
            id: crypto.randomUUID(),
            property_id: 'unknown', // Need manual selection
            apartment_id: 'unknown', // Need manual selection
            traveler_id: '',
            check_in: pb.start_date || '',
            check_out: pb.end_date || '',
            status: 'confirmed',
            total_price: pb.total_price || 0,
            guests: pb.pax_adults || 1,
            source: pb.provider,
            external_ref: pb.provider_reservation_id,
            created_at: Date.now(),
            guest_name: pb.guest_name,
            enrichment_status: 'COMPLETE',
            provisional_id: pb.id
        };

        // Snapshot Policy & Breakdown for DIRECT_WEB privacy & history
        if (pb.provider === 'DIRECT_WEB' || pb.source === 'WEB_CHECKOUT') {
            try {
                const policy = await store.resolveBookingPolicy(pb.apartment_hint);
                const draft = {
                    check_in: pb.start_date || '',
                    check_out: pb.end_date || '',
                    total_price: pb.total_price || 0
                };
                const breakdown = checkoutService.computeCheckout(draft, policy);

                newBooking.policy_snapshot = JSON.stringify({
                    policy_id: policy.id,
                    mode: policy.payment_mode,
                    breakdown: breakdown,
                    captured_at: Date.now()
                });
            } catch (e) {
                console.warn("Could not capture policy snapshot", e);
            }
        }


        // Save booking
        await store.saveBooking(newBooking);
        // Delete provisional
        await store.deleteProvisionalBooking(pb.id);

        // Refresh
        loadProvisionals();
        if (onBookingConfirmed) onBookingConfirmed();
    };

    const handleSaveEdit = async (updated: ProvisionalBooking) => {
        await store.saveProvisionalBooking(updated);
        setEditingBooking(null);
        loadProvisionals();
    };

    const handleInitiateCancel = async (booking: ProvisionalBooking) => {
        setCancellingBooking(booking);
        // Simulating fetch for immediate feedback (In real app, fetch policy by apt id)
        const policy = await store.resolveBookingPolicy(booking.apartment_hint || 'default');
        const outcome = policyEngine.getCancellationOutcome(policy, booking);
        setCancellationOutcome(outcome);
    };

    const confirmCancel = async () => {
        if (!cancellingBooking || !cancellationOutcome) return;
        await store.cancelProvisionalBooking(cancellingBooking.id, cancellationReason, cancellationOutcome);
        setCancellingBooking(null);
        setCancellationOutcome(null);
        setCancellationReason('');
        loadProvisionals();
    };

    if (loading) return <div className="p-4 text-center">Loading provisional bookings...</div>;
    if (provisionals.length === 0) return null; // Hide if empty

    return (
        <div className="bg-white rounded-lg shadow mb-6 border border-amber-200">
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex justify-between items-center">
                <h3 className="text-amber-800 font-semibold flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Provisional Bookings Review
                </h3>
                <span className="bg-amber-200 text-amber-800 text-xs px-2 py-1 rounded-full">
                    {provisionals.length} Pending
                </span>
            </div>

            <div className="divide-y divide-gray-100">
                {provisionals.map(pb => (
                    <div key={pb.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group/item" onClick={() => setSelectedProvisional(pb)}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                    {pb.guest_name || 'Unknown Guest'}
                                    <span className={`text - xs px - 2 py - 0.5 rounded border ${pb.provider === 'AIRBNB' ? 'bg-red-50 text-red-600 border-red-200' :
                                        pb.provider === 'BOOKING' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                            'bg-gray-100 text-gray-600 border-gray-200'
                                        } `}>
                                        {pb.provider}
                                    </span>
                                </h4>
                                <div className="text-sm text-gray-500 mt-1 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} />
                                        {pb.start_date || '?'} {'->'} {pb.end_date || '?'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User size={14} /> {pb.pax_adults} Guests
                                        {pb.total_price && pb.total_price > 0 && (
                                            <span className="flex items-center gap-1 ml-2">
                                                <CreditCard size={14} /> {pb.total_price} {pb.currency}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleConfirm(pb)}
                                    className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                    title="Confirm & Add to Calendar"
                                >
                                    <Check size={18} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedProvisional(pb); }}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                                    title="Editar / Revisar"
                                >
                                    <ExternalLink size={18} />
                                </button>

                                {(pb.provider === 'DIRECT_WEB' && pb.status !== 'CANCELLED') && (
                                    <button
                                        onClick={() => handleInitiateCancel(pb)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        title="Cancelar Reserva"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                )}

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDismiss(pb.id); }}
                                    className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors border border-rose-100"
                                    title="Dismiss"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Missing Fields Warning */}
                        {pb.missing_fields && pb.missing_fields.length > 0 && (
                            <div className="mt-2 text-xs bg-orange-50 text-orange-700 p-2 rounded border border-orange-100">
                                <span className="font-semibold">Missing info: </span>
                                {pb.missing_fields.join(', ')}
                            </div>
                        )}

                        <div className="mt-2 text-xs text-gray-400">
                            ID: {pb.provider_reservation_id} | Confidence: {(pb.confidence ? pb.confidence * 100 : 0).toFixed(0)}%
                        </div>
                    </div>
                ))}
            </div>

            {/* Cancellation Modal */}
            {cancellingBooking && cancellationOutcome && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-red-500" />
                            Cancelar Reserva
                        </h3>

                        <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Total Reserva:</span>
                                <span className="font-semibold">{cancellingBooking.total_price} {cancellingBooking.currency}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Reembolso ({cancellationOutcome.refund_percent}%):</span>
                                <span className="font-bold text-green-600">+{cancellationOutcome.refund_amount} {cancellingBooking.currency}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="text-gray-600">Cargo por cancelación:</span>
                                <span className="font-bold text-red-600">-{cancellationOutcome.cancellation_fee} {cancellingBooking.currency}</span>
                            </div>
                            <p className="mt-3 text-xs text-gray-500 italic">{cancellationOutcome.explanation}</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (Opcional)</label>
                            <textarea
                                className="w-full border rounded p-2 text-sm"
                                rows={2}
                                value={cancellationReason}
                                onChange={e => setCancellationReason(e.target.value)}
                                placeholder="El cliente solicitó..."
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setCancellingBooking(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                                Volver
                            </button>
                            <button onClick={confirmCancel} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium">
                                Confirmar Cancelación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedProvisional && (
                <ProvisionalDetailModal
                    isOpen={!!selectedProvisional}
                    onClose={() => setSelectedProvisional(null)}
                    provisional={selectedProvisional}
                    apartments={apartments}
                    properties={properties}
                    onConverted={loadProvisionals}
                    onDeleted={loadProvisionals}
                    travelers={travelers}
                />
            )}
        </div>
    );
};

