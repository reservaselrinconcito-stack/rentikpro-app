import React from 'react';

export const CTA: React.FC<{ data: any; styles?: any; theme?: any }> = ({ data, styles }) => {
    const {
        title = '¿Listo para reservar?',
        subtitle = 'Haz click en el botón para consultar disponibilidad y precios.',
        ctaLabel = 'Reservar Ahora',
        ctaHref = '#contact'
    } = data;

    return (
        <section className="w-full flex flex-col items-center justify-center py-16 px-6 sm:py-24 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight max-w-3xl">
                {title}
            </h2>
            <p className="text-lg opacity-80 max-w-2xl mb-10 leading-relaxed">
                {subtitle}
            </p>
            <a
                href={ctaHref}
                className="inline-flex items-center justify-center px-10 py-4 bg-indigo-600 text-white rounded-full font-black text-sm tracking-widest uppercase hover:bg-slate-900 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95"
            >
                {ctaLabel}
            </a>
        </section>
    );
};
