import React, { useState, useEffect } from 'react';
import { X, Calendar, User, CreditCard, Info, CheckCircle, Home, AlertTriangle, Link as LinkIcon, Trash2, Edit2 } from 'lucide-react';
import { ProvisionalBooking, Apartment, Booking, Property, Traveler } from '../types';
import { projectManager } from '../services/projectManager';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    provisional: ProvisionalBooking;
    apartments: Apartment[];
    properties: Property[];
    onConverted: () => void;
    onDeleted: () => void;
    travelers: Traveler[];
}

export const ProvisionalDetailModal: React.FC<Props> = ({
    isOpen,
    onClose,
    provisional,
    apartments,
    properties,
    onConverted,
    onDeleted,
    travelers
}) => {
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        guest_name: provisional.guest_name || '',
        pax_adults: provisional.pax_adults || 1,
        total_price: provisional.total_price || 0,
        start_date: provisional.start_date || '',
        end_date: provisional.end_date || '',
        apartment_id: provisional.apartment_id || '',
        traveler_id: provisional.traveler_id || '',
        notes: provisional.notes || ''
    });

    const [overlappingBooking, setOverlappingBooking] = useState<Booking | null>(null);
    const [isCheckingOverlap, setIsCheckingOverlap] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                guest_name: provisional.guest_name || '',
                pax_adults: provisional.pax_adults || 1,
                total_price: provisional.total_price || 0,
                start_date: provisional.start_date || '',
                end_date: provisional.end_date || '',
                apartment_id: provisional.apartment_id || '',
                traveler_id: provisional.traveler_id || '',
                notes: provisional.notes || ''
            });
            checkOverlap();
        }
    }, [isOpen, provisional]);

    const checkOverlap = async () => {
        if (!formData.start_date || !formData.end_date || !formData.apartment_id) return;

        setIsCheckingOverlap(true);
        try {
            const store = projectManager.getStore();
            const allBookings = await store.getBookingsFromAccounting();

            // Look for confirmed bookings that overlap
            const overlap = allBookings.find(b =>
                b.apartment_id === formData.apartment_id &&
                b.event_state === 'confirmed' &&
                b.id !== provisional.id && // Don't overlap with self (if it already has a booking record)
                ((formData.start_date >= b.check_in && formData.start_date < b.check_out) ||
                    (formData.end_date > b.check_in && formData.end_date <= b.check_out) ||
                    (formData.start_date <= b.check_in && formData.end_date >= b.check_out))
            );

            setOverlappingBooking(overlap || null);
        } catch (e) {
            console.error("Error checking overlaps", e);
        } finally {
            setIsCheckingOverlap(false);
        }
    };

    useEffect(() => {
        checkOverlap();
    }, [formData.start_date, formData.end_date, formData.apartment_id]);

    if (!isOpen) return null;

    const handleSaveEdit = async () => {
        const store = projectManager.getStore();
        const updatedPb: ProvisionalBooking = {
            ...provisional,
            ...formData,
            updated_at: Date.now()
        };
        await store.saveProvisionalBooking(updatedPb);
        setEditMode(false);
    };

    const handleConvert = async () => {
        const store = projectManager.getStore();
        const updatedPb: ProvisionalBooking = {
            ...provisional,
            ...formData,
            status: 'CONFIRMED',
            updated_at: Date.now()
        };

        // saveProvisionalBooking logic already handles promotion to confirmed Booking
        await store.saveProvisionalBooking(updatedPb);
        onConverted();
        onClose();
    };

    const handleLinkToExisting = async (existing: Booking) => {
        const store = projectManager.getStore();

        // Link the provisional to the existing booking
        // We update the existing booking with the provisional_id and potentially enrich it
        const updatedBooking: Booking = {
            ...existing,
            provisional_id: provisional.id,
            enrichment_status: 'COMPLETE',
            external_ref: existing.external_ref || provisional.provider_reservation_id,
            guest_name: existing.guest_name || provisional.guest_name
        };

        await store.saveBooking(updatedBooking);

        // Also update the provisional status to confirmed/linked
        const updatedPb: ProvisionalBooking = {
            ...provisional,
            status: 'CONFIRMED',
            updated_at: Date.now()
        };
        await store.saveProvisionalBooking(updatedPb);

        onConverted();
        onClose();
    };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de que deseas eliminar esta propuesta provisional?")) {
            const store = projectManager.getStore();
            await store.deleteProvisionalBooking(provisional.id);
            onDeleted();
            onClose();
        }
    };

    const matchedApt = apartments.find(a => a.id === formData.apartment_id);
    const matchedProp = properties.find(p => p.id === matchedApt?.property_id);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row border border-slate-200">

                {/* Lateral Metadata Section */}
                <div className="md:w-1/3 bg-slate-50 p-6 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6 md:hidden">
                        <h2 className="text-xl font-bold text-slate-800">Detalle Provisional</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Procedencia</span>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <Info className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-bold text-slate-700 text-sm truncate">{provisional.provider}</p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">{provisional.source}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">ID Reserva</span>
                                <code className="text-[11px] bg-slate-200 text-slate-600 px-2 py-1 rounded font-mono font-bold">
                                    {provisional.provider_reservation_id || provisional.ical_uid || 'N/A'}
                                </code>
                            </div>

                            {provisional.raw_summary && (
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Resumen Original</span>
                                    <p className="text-xs text-slate-600 italic leading-relaxed">{provisional.raw_summary}</p>
                                </div>
                            )}

                            {provisional.confidence !== undefined && (
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Confianza</span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${provisional.confidence > 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                style={{ width: `${provisional.confidence * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500">{Math.round(provisional.confidence * 100)}%</span>
                                    </div>
                                    {provisional.confidence_reason && (
                                        <p className="text-[9px] text-slate-400 mt-1">{provisional.confidence_reason}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                            <button
                                onClick={handleDelete}
                                className="w-full flex items-center justify-center gap-2 p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-bold text-xs"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar Propuesta
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Form Section */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <div className="hidden md:flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">Revisión de Reserva</h2>
                            <p className="text-sm text-slate-400 font-medium">Completa los detalles para confirmar la estancia</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Overlap Warning */}
                        {overlappingBooking && (
                            <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-top-4">
                                <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-black text-rose-800">¡Conflict Detectado!</p>
                                    <p className="text-xs text-rose-600 mb-3">Ya existe una reserva confirmada para estas fechas en esta unidad ({overlappingBooking.guest_name}).</p>
                                    <button
                                        onClick={() => handleLinkToExisting(overlappingBooking)}
                                        className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-rose-700 transition-colors"
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                        Vincular a existente
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Apartamento</label>
                                    <div className="relative">
                                        <Home className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                        <select
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700 appearance-none"
                                            value={formData.apartment_id}
                                            onChange={e => setFormData({ ...formData, apartment_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar unidad...</option>
                                            {apartments.map(apt => (
                                                <option key={apt.id} value={apt.id}>{apt.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Entrada</label>
                                        <div className="relative">
                                            <Calendar className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                            <input
                                                type="date"
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700"
                                                value={formData.start_date}
                                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Salida</label>
                                        <div className="relative">
                                            <Calendar className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                            <input
                                                type="date"
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700"
                                                value={formData.end_date}
                                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Huésped</label>
                                    <div className="relative">
                                        <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700 placeholder:text-slate-300"
                                            placeholder="Nombre completo..."
                                            value={formData.guest_name}
                                            onChange={e => setFormData({ ...formData, guest_name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Pax</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700"
                                            value={formData.pax_adults}
                                            onChange={e => setFormData({ ...formData, pax_adults: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Importe</label>
                                        <div className="relative">
                                            <CreditCard className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                            <input
                                                type="number"
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700"
                                                value={formData.total_price}
                                                onChange={e => setFormData({ ...formData, total_price: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Vincular a Huésped Existente</label>
                                        <select
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700"
                                            value={formData.traveler_id}
                                            onChange={e => setFormData({ ...formData, traveler_id: e.target.value })}
                                        >
                                            <option value="">(Solo nombre manual)</option>
                                            {travelers.map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre} {t.apellidos}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Notas Internas</label>
                                        <textarea
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 min-h-[80px]"
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder="Observaciones adicionales..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={handleSaveEdit}
                                className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-600 font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Guardar Cambios
                            </button>
                            <button
                                onClick={handleConvert}
                                disabled={!!overlappingBooking || isCheckingOverlap}
                                className={`flex-[2] px-6 py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 shadow-indigo-200 ${overlappingBooking ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                Convertir a Reserva
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
