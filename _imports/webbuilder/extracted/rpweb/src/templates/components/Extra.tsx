import React from 'react';
import { useBootstrapState } from '../../app/BootstrapContext';

export const Highlights: React.FC = () => {
    const highlights = [
        { icon: '✨', title: 'Limpieza Premium', desc: 'Protocolos rigurosos para tu seguridad y confort.' },
        { icon: '📍', title: 'Ubicación Única', desc: 'Entornos seleccionados por su belleza y tranquilidad.' },
        { icon: '🛎️', title: 'Atención 24/7', desc: 'Estamos a tu disposición en todo momento.' },
        { icon: '📶', title: 'WiFi Alta Velocidad', desc: 'Conéctate sin límites desde cualquier rincón.' }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                {highlights.map((h, i) => (
                    <div key={i} className="space-y-4 group">
                        <div className="text-4xl group-hover:scale-110 transition-transform duration-300 h-16 w-16 bg-brand-soft rounded-2xl flex items-center justify-center">
                            {h.icon}
                        </div>
                        <h3 className="text-xl font-bold text-brand-dark">{h.title}</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">{h.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export const CTA: React.FC = () => {
    const { property } = useBootstrapState();
    if (!property) return null;

    return (
        <section className="py-20 px-4">
            <div className="max-w-6xl mx-auto bg-brand-dark rounded-[3rem] overflow-hidden relative shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/40 via-transparent to-transparent opacity-50" />
                <div className="relative z-10 px-8 py-16 md:py-24 text-center max-w-3xl mx-auto space-y-8">
                    <h2 className="text-3xl md:text-5xl font-bold font-serif text-white leading-tight">
                        ¿Listo para vivir una experiencia inolvidable?
                    </h2>
                    <p className="text-gray-300 text-lg md:text-xl">
                        Reserva directamente con nosotros y obtén el mejor precio garantizado en {property.name}.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                        <a
                            href="#alojamientos"
                            className="px-10 py-5 bg-brand-accent text-white rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-brand-accent/40 transition-all active:scale-95"
                        >
                            Reservar ahora
                        </a>
                        <a
                            href={`tel:${property.phoneRaw || property.phone}`}
                            className="px-10 py-5 bg-white/10 text-white rounded-full font-bold text-lg hover:bg-white/20 transition-all"
                        >
                            Llamar directamente
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export const Footer: React.FC = () => {
    const { property, source } = useBootstrapState();
    if (!property) return null;

    return (
        <footer id="contacto" className="bg-brand-dark text-white pt-24 pb-12 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
                <div className="md:col-span-2 space-y-8">
                    <div className="flex items-center gap-4">
                        {property.logoUrl ? (
                            <img src={property.logoUrl} alt={property.name} className="h-12 w-auto brightness-0 invert" />
                        ) : (
                            <div className="h-12 w-12 rounded-2xl bg-brand-accent flex items-center justify-center font-bold text-xl">
                                {property.shortName?.charAt(0)}
                            </div>
                        )}
                        <h3 className="text-2xl font-bold font-serif">{property.name}</h3>
                    </div>
                    <p className="text-gray-400 max-w-sm leading-relaxed text-lg">
                        {property.slogan || "Tu hogar lejos de casa. Experiencias auténticas en entornos privilegiados."}
                    </p>
                    <div className="flex gap-4">
                        {/* Social Icons placeholders */}
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-brand-accent hover:text-brand-accent transition-all cursor-pointer flex items-center justify-center" />
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <h4 className="text-sm uppercase tracking-[0.2em] font-black text-brand-accent">Contacto</h4>
                    <ul className="space-y-4 text-gray-400">
                        {property.email && (
                            <li className="flex items-center gap-3">
                                <span className="text-white/40">✉</span>
                                <a href={`mailto:${property.email}`} className="hover:text-white transition-colors">{property.email}</a>
                            </li>
                        )}
                        {property.phone && (
                            <li className="flex items-center gap-3">
                                <span className="text-white/40">📞</span>
                                <a href={`tel:${property.phoneRaw || property.phone}`} className="hover:text-white transition-colors">{property.phone}</a>
                            </li>
                        )}
                        <li className="flex items-start gap-3">
                            <span className="text-white/40">📍</span>
                            <span>{property.location.town}, {property.location.province}<br />{property.location.country}</span>
                        </li>
                    </ul>
                </div>

                <div className="space-y-6">
                    <h4 className="text-sm uppercase tracking-[0.2em] font-black text-brand-accent">Navegación</h4>
                    <ul className="space-y-4 text-gray-400">
                        {['Inicio', 'Alojamientos', 'Disponibilidad', 'Políticas'].map(item => (
                            <li key={item}><a href={`#${item.toLowerCase()}`} className="hover:text-white transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 pt-12 border-t border-white/5 text-center text-xs text-gray-500 font-medium">
                <p>
                    © {new Date().getFullYear()} {property.name}.
                    Powered by <a href="https://rentikpro.com" target="_blank" className="text-white hover:text-brand-accent">RentikPro</a>
                    {source !== 'api' && ' · Modo Demo'}
                </p>
            </div>
        </footer>
    );
};
