import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, User, CreditCard } from 'lucide-react';
import { Apartment, BookingPolicy } from '../types';
import { BookingSummary } from './BookingSummary';
import { checkoutService, BookingDraft } from '../services/checkoutService';
import { useStore } from '../services/sqliteStore'; // Assuming hook exists or we use direct store

interface Props {
    isOpen: boolean;
    onClose: () => void;
    apartment: Apartment;
    policies: BookingPolicy[]; // Passed from parent or fetched
    onSave: (draft: any) => void;
}

export const CreateBookingModal: React.FC<Props> = ({ isOpen, onClose, apartment, policies, onSave }) => {
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [price, setPrice] = useState(100);
    const [guestName, setGuestName] = useState('');

    // Resolve Policy: Apartment > Property (simulated for now if not fully linked)
    // In real app, we'd use store.resolveBookingPolicy(apartment.id)
    const activePolicy = policies.find(p => p.scope_type === 'APARTMENT' && p.scope_id === apartment.id)
        || policies.find(p => p.scope_type === 'PROPERTY' && p.scope_id === apartment.property_id)
        || policies.find(p => p.id === 'default');

    if (!isOpen) return null;

    const draft: BookingDraft = {
        check_in: checkIn,
        check_out: checkOut,
        total_price: price
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row">

                {/* Form Section */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Nueva Reserva</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apartamento</label>
                            <div className="p-3 bg-gray-50 rounded-lg text-gray-900 font-medium">
                                {apartment.name}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Entrada</label>
                                <div className="relative">
                                    <CalendarIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={checkIn}
                                        onChange={e => setCheckIn(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Salida</label>
                                <div className="relative">
                                    <CalendarIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={checkOut}
                                        onChange={e => setCheckOut(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Precio Total</label>
                            <div className="relative">
                                <CreditCard className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="number"
                                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    value={price}
                                    onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Huésped Principal</label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nombre completo"
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
                            onClick={() => onSave({ ...draft, guest_name: guestName })}
                        >
                            Crear Reserva
                        </button>
                    </div>
                </div>

                {/* Summary Section (Right Side) */}
                <div className="w-full md:w-[400px] bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
                    {activePolicy ? (
                        <BookingSummary draft={draft} policy={activePolicy} />
                    ) : (
                        <div className="text-gray-500 text-center mt-10">
                            Cargando políticas...
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
