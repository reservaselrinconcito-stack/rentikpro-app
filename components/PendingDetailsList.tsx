import React, { useState, useEffect } from 'react';
import { ProvisionalBooking, Apartment } from '../types';
import { projectManager } from '../services/projectManager';
import { AlertCircle, Copy, ExternalLink, Save, X, Check } from 'lucide-react';
import { copyToClipboard as safeCopyToClipboard } from '../utils/clipboard';

export const PendingDetailsList: React.FC = () => {
    const [pendingItems, setPendingItems] = useState<ProvisionalBooking[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<ProvisionalBooking | null>(null); // For modal
    const [manualForm, setManualForm] = useState<Partial<ProvisionalBooking>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const store = projectManager.getStore();
        if (store) {
            const all = await store.getProvisionalBookings();
            const apts = await store.getAllApartments();
            setApartments(apts);
            // Filter for Pending or Needs Manual
            const filtered = all.filter(pb => pb.status === 'PENDING_DETAILS' || (pb.status as any) === 'NEEDS_MANUAL');
            setPendingItems(filtered);
        }
        setLoading(false);
    };

    const handleOpenManual = (item: ProvisionalBooking) => {
        setSelectedItem(item);
        setManualForm({
            apartment_hint: item.apartment_hint,
            start_date: item.start_date,
            end_date: item.end_date,
            guest_name: item.guest_name,
            pax_adults: item.pax_adults || 1,
            total_price: item.total_price || 0,
            currency: item.currency || 'EUR',
            metadata: { notes: '' } // init notes
        });
    };

    const handleSaveManual = async () => {
        if (!selectedItem) return;
        const store = projectManager.getStore();
        if (store) {
            const updated: ProvisionalBooking = {
                ...selectedItem,
                ...manualForm,
                metadata: {
                    ...selectedItem.metadata,
                    ...manualForm.metadata,
                    input_type: 'manual_completion'
                },
                manual_completed_at: Date.now(),
                status: 'CONFIRMED',
                confidence: 1.0
            };

            // If apartment hint changed to a real apartment name, user might expect map, 
            // but for now we just save string. Ideally we map to apartment_id later in booking.

            await store.saveProvisionalBooking(updated);
            setSelectedItem(null);
            loadData(); // Refresh list
        }
    };

    const copyToClipboard = (text: string) => {
        void safeCopyToClipboard(text).then((ok) => {
            alert(ok ? 'Copied to clipboard!' : 'Could not copy (permission denied)');
        });
    };

    if (loading) return null;
    if (pendingItems.length === 0) return null;

    return (
        <div className="bg-white rounded-lg shadow mb-6 border border-orange-200">
            <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex justify-between items-center">
                <h3 className="text-orange-800 font-semibold flex items-center gap-2">
                    <AlertCircle size={18} />
                    Pending Details ({pendingItems.length})
                </h3>
            </div>

            <div className="divide-y divide-orange-100">
                {pendingItems.map(item => (
                    <div key={item.id} className="p-4">
                        {/* Header Info */}
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800">{item.provider}</span>
                                    <span className="text-gray-500 text-sm">#{item.provider_reservation_id || '???'}</span>
                                    <span className="text-xs text-gray-400">Recibido: {new Date(item.created_at).toLocaleString()}</span>
                                </div>
                                <div className="text-sm mt-1">
                                    <span className="text-gray-600">Apartamento: </span>
                                    <span className={item.apartment_hint ? "text-gray-900 font-medium" : "text-red-500"}>
                                        {item.apartment_hint || 'Desconocido'}
                                    </span>
                                </div>
                                <div className="text-sm text-red-600 mt-1">
                                    Falta: {item.missing_fields?.join(', ') || 'Información incompleta'}
                                </div>
                            </div>

                            {item.metadata?.extranet_link && (
                                <a
                                    href={item.metadata.extranet_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-blue-600 text-sm hover:underline bg-blue-50 px-3 py-1 rounded"
                                >
                                    Abrir Extranet <ExternalLink size={14} />
                                </a>
                            )}
                        </div>

                        {/* Action Blocks */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-50 p-3 rounded text-sm">

                            {/* Option 1: Forward */}
                            <div className="border border-gray-200 bg-white p-3 rounded">
                                <strong className="text-gray-700 block mb-2">Opción 1: Reenviar Detalles</strong>
                                <p className="text-gray-500 mb-2">Copia/pega los detalles de la extranet en un email y envíalo a tu correo con este asunto:</p>
                                <div className="flex items-center gap-2 bg-gray-100 p-2 rounded border border-gray-300 font-mono text-xs mb-2">
                                    <span className="truncate flex-1">RP DETAILS {item.provider} #{item.provider_reservation_id}</span>
                                    <button onClick={() => copyToClipboard(`RP DETAILS ${item.provider} #${item.provider_reservation_id}`)} className="text-gray-500 hover:text-blue-600">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Option 2: Manual */}
                            <div className="border border-gray-200 bg-white p-3 rounded flex flex-col justify-center items-center text-center">
                                <strong className="text-gray-700 block mb-2">Opción 2: Completar Manualmente</strong>
                                <button
                                    onClick={() => handleOpenManual(item)}
                                    className="bg-orange-100 text-orange-700 px-4 py-2 rounded hover:bg-orange-200 transition text-sm font-medium w-full"
                                >
                                    Completar Datos
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Manual Completion Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Completar Datos Reserva</h3>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Apartamento</label>
                                <select
                                    className="w-full border rounded p-2 mt-1"
                                    value={manualForm.apartment_hint || ''}
                                    onChange={e => setManualForm({ ...manualForm, apartment_hint: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    {apartments.map(apt => (
                                        <option key={apt.id} value={apt.name}>{apt.name}</option>
                                    ))}
                                    {manualForm.apartment_hint && !apartments.find(a => a.name === manualForm.apartment_hint) && (
                                        <option value={manualForm.apartment_hint}>{manualForm.apartment_hint} (Original)</option>
                                    )}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Check-In</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded p-2 mt-1"
                                        value={manualForm.start_date || ''}
                                        onChange={e => setManualForm({ ...manualForm, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Check-Out</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded p-2 mt-1"
                                        value={manualForm.end_date || ''}
                                        onChange={e => setManualForm({ ...manualForm, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Huésped</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2 mt-1"
                                    value={manualForm.guest_name || ''}
                                    onChange={e => setManualForm({ ...manualForm, guest_name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pax</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded p-2 mt-1"
                                        value={manualForm.pax_adults || 1}
                                        onChange={e => setManualForm({ ...manualForm, pax_adults: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Total ({manualForm.currency})</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full border rounded p-2 mt-1"
                                        value={manualForm.total_price || 0}
                                        onChange={e => setManualForm({ ...manualForm, total_price: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notas</label>
                                <textarea
                                    className="w-full border rounded p-2 mt-1"
                                    rows={3}
                                    value={manualForm.metadata?.notes || ''}
                                    onChange={e => setManualForm({
                                        ...manualForm,
                                        metadata: { ...manualForm.metadata, notes: e.target.value }
                                    })}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveManual}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Save size={16} /> Guardar y Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
