import React, { useState } from 'react';
import { Send, User, Mail, MessageSquare, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export const ContactForm: React.FC<{ data: any; styles?: any; theme?: any }> = ({ data }) => {
    const {
        title = 'Contacta con nosotros',
        subtitle = '¿Tienes alguna duda o petición especial? Estamos encantados de escucharte.',
        fields = {
            name: { label: 'Nombre Completo', placeholder: 'Tu nombre...' },
            email: { label: 'Correo Electrónico', placeholder: 'ejemplo@correo.com' },
            message: { label: 'Mensaje', placeholder: '¿En qué podemos ayudarte?' }
        },
        submitLabel = 'Enviar Mensaje',
        // propertyId is injected by generateV0Config / WebsiteBuilder when publishing
        propertyId = '',
    } = data;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !message.trim()) return;

        setStatus('sending');
        try {
            const workerUrl = (import.meta.env.VITE_PUBLIC_WORKER_URL ?? '').replace(/\/$/, '');
            if (!workerUrl) {
                // In editor preview mode — just show success without network call
                await new Promise(r => setTimeout(r, 600));
                setStatus('sent');
                return;
            }

            const res = await fetch(`${workerUrl}/public/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: propertyId || 'unknown',
                    name: name.trim(),
                    email: email.trim(),
                    message: message.trim(),
                    source: 'website-builder',
                    timestamp: new Date().toISOString(),
                }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setStatus('sent');
        } catch (err) {
            console.error('[ContactForm] submit failed:', err);
            setStatus('error');
        }
    };

    if (status === 'sent') {
        return (
            <section className="w-full py-20 px-6">
                <div className="max-w-3xl mx-auto text-center py-16">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 mb-4">¡Mensaje recibido!</h3>
                    <p className="text-slate-500 text-lg">Te responderemos en menos de 2 horas.</p>
                    <button
                        onClick={() => { setStatus('idle'); setName(''); setEmail(''); setMessage(''); }}
                        className="mt-8 text-sm text-indigo-600 font-bold hover:underline"
                    >
                        Enviar otro mensaje
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="w-full py-20 px-6">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black mb-6">{title}</h2>
                    <p className="text-slate-500 font-medium">{subtitle}</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <User size={12} className="text-indigo-600" /> {fields.name.label}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={fields.name.placeholder}
                                required
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Mail size={12} className="text-indigo-600" /> {fields.email.label}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder={fields.email.placeholder}
                                required
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={12} className="text-indigo-600" /> {fields.message.label}
                        </label>
                        <textarea
                            rows={5}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder={fields.message.placeholder}
                            required
                            className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-sm resize-none"
                        />
                    </div>

                    {status === 'error' && (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600">
                            <AlertCircle size={18} />
                            <span className="text-sm font-bold">Error al enviar. Prueba de nuevo o contáctanos por teléfono.</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'sending' || !name || !email || !message}
                        className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {status === 'sending' ? (
                            <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                        ) : (
                            <><Send size={16} /> {submitLabel}</>
                        )}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-tighter">
                        Al enviar este formulario aceptas nuestra política de privacidad
                    </p>
                </form>
            </div>
        </section>
    );
};
