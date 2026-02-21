import React from 'react';
import { Check } from 'lucide-react';

export const Pricing: React.FC<{ data: any; styles?: any; theme?: any }> = ({ data }) => {
    const {
        title = 'Nuestras Tarifas',
        subtitle = 'Transparencia total. Elige el plan que mejor se adapte a tu estancia.',
        plans = [
            { name: 'Estándar', price: '99', period: '/noche', features: ['WiFi Gratis', 'Cocina Equipada', 'Limpieza básica'], cta: 'Reservar' },
            { name: 'Premium', price: '149', period: '/noche', features: ['Vistas al mar', 'Parking incluido', 'Late check-out', 'Botella de bienvenida'], cta: 'El más popular', featured: true },
            { name: 'Largo Plazo', price: '2500', period: '/mes', features: ['Todos los servicios', 'Limpieza semanal', 'Mantenimiento 24h'], cta: 'Consultar' }
        ]
    } = data;

    return (
        <section className="w-full py-20 px-6 bg-slate-50">
            <div className="max-w-6xl mx-auto text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black mb-6">{title}</h2>
                <p className="text-slate-500 max-w-2xl mx-auto font-medium">{subtitle}</p>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan: any, idx: number) => (
                    <div
                        key={idx}
                        className={`p-8 rounded-[2.5rem] border ${plan.featured ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xl scale-105 z-10' : 'bg-white border-slate-100 text-slate-800'}`}
                    >
                        <h3 className="text-xl font-black mb-4 uppercase tracking-widest">{plan.name}</h3>
                        <div className="mb-8">
                            <span className="text-5xl font-black">{plan.price}€</span>
                            <span className={`text-sm font-bold ${plan.featured ? 'opacity-80' : 'text-slate-400'}`}>{plan.period}</span>
                        </div>
                        <ul className="space-y-4 mb-10">
                            {plan.features.map((f: string, fIdx: number) => (
                                <li key={fIdx} className="flex items-center gap-3 text-sm font-bold truncate">
                                    <div className={`p-1 rounded-full ${plan.featured ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                                        <Check size={12} />
                                    </div>
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <button className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
                            ${plan.featured ? 'bg-white text-indigo-600 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-indigo-600'}
                        `}>
                            {plan.cta}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};
