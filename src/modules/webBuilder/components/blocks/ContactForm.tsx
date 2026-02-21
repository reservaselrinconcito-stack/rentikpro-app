import React from 'react';
import { Send, User, Mail, MessageSquare } from 'lucide-react';

export const ContactForm: React.FC<{ data: any; styles?: any; theme?: any }> = ({ data }) => {
    const {
        title = 'Contacta con nosotros',
        subtitle = '¿Tienes alguna duda o petición especial? Estamos encantados de escucharte.',
        fields = {
            name: { label: 'Nombre Completo', placeholder: 'Tu nombre...' },
            email: { label: 'Correo Electrónico', placeholder: 'ejemplo@correo.com' },
            message: { label: 'Mensaje', placeholder: '¿En qué podemos ayudarte?' }
        },
        submitLabel = 'Enviar Mensaje'
    } = data;

    return (
        <section className="w-full py-20 px-6">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black mb-6">{title}</h2>
                    <p className="text-slate-500 font-medium">{subtitle}</p>
                </div>

                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <User size={12} className="text-indigo-600" /> {fields.name.label}
                            </label>
                            <input
                                type="text"
                                placeholder={fields.name.placeholder}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Mail size={12} className="text-indigo-600" /> {fields.email.label}
                            </label>
                            <input
                                type="email"
                                placeholder={fields.email.placeholder}
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
                            placeholder={fields.message.placeholder}
                            className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-sm resize-none"
                        />
                    </div>
                    <button className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95">
                        <Send size={16} />
                        {submitLabel}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-tighter">
                        Al enviar este formulario aceptas nuestra política de privacidad
                    </p>
                </form>
            </div>
        </section>
    );
};
