import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrapState } from '../../app/BootstrapContext';
import { getPriceDisplay } from '../../domain/pricing';

interface HeroProps {
    variant?: 'default' | 'modern' | 'minimal' | 'luxe';
}

export const Hero: React.FC<HeroProps> = ({ variant = 'default' }) => {
    const { t, i18n } = useTranslation();
    const { property, apartments } = useBootstrapState();
    if (!property) return null;

    const minPrice = apartments.length > 0
        ? Math.min(...apartments.map(a => a.publicBasePrice || Infinity).filter(p => p > 0))
        : Infinity;

    const firstAptWithPrice = apartments.find(a => a.publicBasePrice === minPrice);
    const price = getPriceDisplay(
        minPrice !== Infinity ? minPrice : null,
        firstAptWithPrice?.currency || 'EUR',
        t,
        i18n
    );

    const isLuxe = variant === 'luxe';
    const isMinimal = variant === 'minimal';
    const isModern = variant === 'modern';

    return (
        <section
            id="inicio"
            className={`relative overflow-hidden flex items-center justify-center text-center px-4 ${isModern ? 'h-screen' : 'py-24 md:py-32'
                } ${isLuxe ? 'bg-brand-dark text-white' : 'bg-brand-soft text-brand-dark'}`}
        >
            {/* Background patterns/effects inspired by Rinconcito */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-accent/20 via-transparent to-transparent" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <p className={`uppercase tracking-[0.3em] text-xs md:text-sm font-semibold ${isLuxe ? 'text-brand-accent' : 'text-brand-accent'
                        }`}>
                        {property.location.town} {property.location.province ? `· ${property.location.province}` : ''}
                    </p>

                    {price.hasPrice && (
                        <div className="bg-brand-accent/10 border border-brand-accent/20 px-4 py-1.5 rounded-full backdrop-blur-sm">
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-brand-accent">
                                {price.labelBefore} {price.formattedPrice}{price.labelAfter}
                            </span>
                        </div>
                    )}
                </div>

                <h2 className={`text-4xl md:text-6xl lg:text-7xl font-bold font-serif leading-tight animate-fade-in-up delay-100`}>
                    {property.name}
                </h2>

                {property.slogan && (
                    <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto animate-fade-in-up delay-200">
                        {property.slogan}
                    </p>
                )}

                <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
                    <a
                        href="#alojamientos"
                        className="px-8 py-4 bg-brand-accent text-white rounded-full font-bold text-lg hover:bg-brand-accent/90 transition-all shadow-xl shadow-brand-accent/20"
                    >
                        Explorar estancia
                    </a>
                    <a
                        href="#disponibilidad"
                        className={`px-8 py-4 rounded-full font-bold text-lg transition-all border-2 ${isLuxe
                            ? 'border-white/20 text-white hover:bg-white/10'
                            : 'border-brand-dark/10 text-brand-dark hover:bg-brand-dark hover:text-white'
                            }`}
                    >
                        Consultar fechas
                    </a>
                </div>
            </div>

            {/* Decorative elements */}
            {!isMinimal && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce-slow text-brand-accent/50 cursor-pointer hidden md:block">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            )}
        </section>
    );
};
