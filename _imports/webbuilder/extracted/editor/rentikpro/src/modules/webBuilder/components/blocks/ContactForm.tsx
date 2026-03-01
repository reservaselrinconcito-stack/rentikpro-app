import React, { useState } from 'react';
import { Send, User, Mail, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * ContactForm — bloque de contacto.
 *
 * Editor: muestra el formulario visual, onSubmit desactivado.
 * RPWeb (publicación): envía a POST ${VITE_PUBLIC_WORKER_URL}/public/leads
 *   { propertyId, name, email, message, source: 'website', timestamp }
 *
 * isLiveMode lo inyecta el template de RPWeb via props.data._liveMode.
 */
export const ContactForm: React.FC<{ data: any; styles?: any; theme?: any }> = ({ data, theme }) => {
    const {
        title = 'Contacta con nosotros',
        subtitle = '¿Tienes alguna duda? Estamos para ayudarte.',
        submitLabel = 'Enviar Consulta',
        propertyId = '',
        _liveMode = false,
    } = data ?? {};

    const primary = theme?.colors?.primary ?? '#4f46e5';
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!_liveMode) return;
        if (!form.name || !form.email || !form.message) { setStatus('error'); setErrorMsg('Rellena todos los campos.'); return; }
        setStatus('sending');
        try {
            const workerUrl = ((typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_PUBLIC_WORKER_URL : '') ?? '').replace(/\/$/, '');
            const res = await fetch(`${workerUrl}/public/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId, ...form, source: 'website', timestamp: Date.now() }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setStatus('ok');
            setForm({ name: '', email: '', message: '' });
        } catch (err: any) {
            setStatus('error');
            setErrorMsg('Error al enviar. Inténtalo de nuevo o contáctanos directamente.');
        }
    };

    if (status === 'ok') return (
        <section className="w-full py-20 px-6" id="contacto">
            <div className="max-w-3xl mx-auto text-center">
                <CheckCircle size={56} className="mx-auto mb-6" style={{ color: primary }} />
                <h2 className="text-3xl font-bold mb-4">¡Mensaje recibido!</h2>
                <p className="opacity-70">Te responderemos en menos de 24 horas.</p>
            </div>
        </section>
    );

    return (
        <section className="w-full py-20 px-6" id="contacto">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black mb-6">{title}</h2>
                    <p className="opacity-70">{subtitle}</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[{ key: 'name', label: 'Nombre', Icon: User, type: 'text' }, { key: 'email', label: 'Email', Icon: Mail, type: 'email' }].map(({ key, label, Icon, type }) => (
                            <div key={key} className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-70"><Icon size={12} /> {label}</label>
                                <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={`Tu ${label.toLowerCase()}...`} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-current transition-all shadow-sm" required={_liveMode} style={{ '--tw-ring-color': primary } as any} />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-70"><MessageSquare size={12} /> Mensaje</label>
                        <textarea rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="¿En qué podemos ayudarte?" className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-4 text-sm font-bold outline-none focus:border-current transition-all shadow-sm resize-none" required={_liveMode} />
                    </div>
                    {status === 'error' && <div className="flex items-center gap-2 text-red-600 text-sm font-bold"><AlertCircle size={16} /> {errorMsg}</div>}
                    <button type={_liveMode ? 'submit' : 'button'} disabled={status === 'sending'} className="w-full py-4 rounded-3xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 transition-all shadow-xl hover:opacity-90 hover:-translate-y-1 active:scale-95 text-white disabled:opacity-50" style={{ backgroundColor: primary }}>
                        <Send size={16} />
                        {status === 'sending' ? 'Enviando...' : submitLabel}
                    </button>
                    {!_liveMode && <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-tighter">Preview — envío real activado en RPWeb</p>}
                </form>
            </div>
        </section>
    );
};
