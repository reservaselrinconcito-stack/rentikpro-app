import React, { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { BookingPolicy, PolicyScope, PaymentMode, DepositType, CancellationPolicyType } from '../types';
import { Save, AlertTriangle, Eye, CreditCard, Shield, Ban } from 'lucide-react';
import { checkoutService } from '../services/checkoutService';

interface Props {
    scopeType: PolicyScope;
    scopeId: string;
    onClose?: () => void;
}

const DEFAULT_POLICY: BookingPolicy = {
    id: 'temp', scope_type: 'PROPERTY', scope_id: '', currency: 'EUR',
    payment_mode: 'DEPOSIT_ONLY', deposit_type: 'PERCENT', deposit_value: 30,
    deposit_due: 'IMMEDIATE', remaining_due: 'ON_ARRIVAL', accepted_methods: ['CARD', 'CASH'],
    require_security_deposit: false, security_deposit_method: 'HOLD_CARD',
    cancellation_policy_type: 'FLEXIBLE', created_at: 0, updated_at: 0
};

export const PolicyEditor: React.FC<Props> = ({ scopeType, scopeId, onClose }) => {
    const store = useStore();
    const [policy, setPolicy] = useState<BookingPolicy>(DEFAULT_POLICY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewText, setPreviewText] = useState<string[]>([]);

    useEffect(() => {
        loadPolicy();
    }, [scopeType, scopeId]);

    useEffect(() => {
        updatePreview();
    }, [policy]);

    const loadPolicy = async () => {
        setLoading(true);
        if (store) {
            const existing = await store.getBookingPolicy(scopeType, scopeId);
            if (existing) {
                setPolicy(existing);
            } else {
                // Initialize new with correct scope
                setPolicy({ ...DEFAULT_POLICY, scope_type: scopeType, scope_id: scopeId, id: crypto.randomUUID() });
            }
        }
        setLoading(false);
    };

    const updatePreview = () => {
        // Generate a fake checkout to see texts
        const draft = { check_in: '2026-01-01', check_out: '2026-01-05', total_price: 100 };
        const result = checkoutService.computeCheckout(draft, policy);
        setPreviewText([...result.summary_texts, result.cancellation_text]);
    };

    const handleSave = async () => {
        if (!store) return;
        setSaving(true);
        // Basic validation
        if (policy.deposit_type === 'PERCENT' && policy.deposit_value > 100) {
            alert('Deposit percentage cannot be > 100%');
            setSaving(false);
            return;
        }
        await store.saveBookingPolicy(policy);
        setSaving(false);
        if (onClose) onClose();
    };

    const toggleMethod = (method: string) => {
        const methods = new Set(policy.accepted_methods);
        if (methods.has(method)) methods.delete(method);
        else methods.add(method);
        setPolicy({ ...policy, accepted_methods: Array.from(methods) });
    };

    if (loading) return <div className="p-4">Loading Policy...</div>;

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-full max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Shield className="text-indigo-600" />
                    Configurar Políticas ({scopeType === 'APARTMENT' ? 'Apartamento' : 'Propiedad'})
                </h2>
                {onClose && <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Cerrar</button>}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* 1. Payment Mode */}
                <section>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CreditCard size={18} /> Condiciones de Pago
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Cobro</label>
                            <select
                                className="w-full border rounded-lg p-2 bg-white"
                                value={policy.payment_mode}
                                onChange={e => setPolicy({ ...policy, payment_mode: e.target.value as PaymentMode })}
                            >
                                <option value="PAY_ON_ARRIVAL">Pagar todo al llegar</option>
                                <option value="FULL_PREPAY">Pago 100% por adelantado</option>
                                <option value="DEPOSIT_ONLY">Depósito + Resto después</option>
                                <option value="SPLIT_CUSTOM">Personalizado</option>
                            </select>
                        </div>

                        {(policy.payment_mode === 'DEPOSIT_ONLY' || policy.payment_mode === 'SPLIT_CUSTOM') && (
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Depósito</label>
                                    <select
                                        className="w-full border rounded-lg p-2"
                                        value={policy.deposit_type}
                                        onChange={e => setPolicy({ ...policy, deposit_type: e.target.value as DepositType })}
                                    >
                                        <option value="PERCENT">% Porcentaje</option>
                                        <option value="FIXED">€ Fijo</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg p-2"
                                        value={policy.deposit_value}
                                        onChange={e => setPolicy({ ...policy, deposit_value: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* 2. Cancellation */}
                <section className="pt-4 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Ban size={18} /> Política de Cancelación
                    </h3>
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            {['FLEXIBLE', 'MODERATE', 'STRICT'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setPolicy({ ...policy, cancellation_policy_type: type as CancellationPolicyType })}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${policy.cancellation_policy_type === type
                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        {policy.cancellation_policy_type === 'CUSTOM' && (
                            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800">
                                Edición de reglas personalizadas JSON (Próximamente)
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. Security Deposit */}
                <section className="pt-4 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Shield size={18} /> Fianza / Depósito de Seguridad
                    </h3>
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="reqSecDep"
                            checked={policy.require_security_deposit}
                            onChange={e => setPolicy({ ...policy, require_security_deposit: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <label htmlFor="reqSecDep" className="text-sm font-medium text-gray-700">Requerir fianza por daños</label>
                    </div>

                    {policy.require_security_deposit && (
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Importe (€)</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg p-2"
                                    value={policy.security_deposit_amount || 0}
                                    onChange={e => setPolicy({ ...policy, security_deposit_amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Cobro</label>
                                <select
                                    className="w-full border rounded-lg p-2"
                                    value={policy.security_deposit_method}
                                    onChange={e => setPolicy({ ...policy, security_deposit_method: e.target.value as any })}
                                >
                                    <option value="HOLD_CARD">Retención Tarjeta</option>
                                    <option value="CASH">Efectivo</option>
                                    <option value="TRANSFER">Transferencia</option>
                                    <option value="NONE">No especificado</option>
                                </select>
                            </div>
                        </div>
                    )}
                </section>

                {/* 4. Accepted Methods */}
                <section className="pt-4 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3">Métodos Aceptados</h3>
                    <div className="flex gap-2 flex-wrap">
                        {['CARD', 'CASH', 'TRANSFER', 'BIZUM'].map(m => (
                            <button
                                key={m}
                                onClick={() => toggleMethod(m)}
                                className={`px-3 py-1 text-xs rounded-full border ${policy.accepted_methods.includes(m) ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 text-gray-400'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Preview Banner */}
                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Eye size={12} /> Vista Previa (Cliente)
                    </h4>
                    <div className="space-y-1">
                        {previewText.map((t, i) => (
                            <p key={i} className="text-sm text-blue-900">{t}</p>
                        ))}
                    </div>
                </div>

            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                {onClose && <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Guardando...' : 'Guardar Política'}
                </button>
            </div>
        </div>
    );
};
