import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrapState } from '../../app/BootstrapContext';
import { DomainApartment } from '../../domain/types';
import { getPriceDisplay } from '../../domain/pricing';

interface ApartmentCardProps {
    apt: DomainApartment;
    variant?: 'default' | 'modern' | 'minimal' | 'luxe';
}

export const ApartmentCard: React.FC<ApartmentCardProps> = ({ apt, variant = 'default' }) => {
    const { t, i18n } = useTranslation();
    const isLuxe = variant === 'luxe';
    const photo = apt.photos?.[0];

    const price = getPriceDisplay(apt.publicBasePrice, apt.currency, t, i18n);

    return (
        <div className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-gray-100 ${isLuxe ? 'font-serif' : 'font-sans'}`}>
            <div className="aspect-[4/3] overflow-hidden relative">
                {photo ? (
                    <img
                        src={photo}
                        alt={apt.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-4xl">🏡</div>
                )}

                {apt.status === 'coming_soon' && (
                    <div className="absolute top-4 right-4 bg-brand-dark/80 backdrop-blur-md text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-bold">
                        {t('nav.comingSoon')}
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <p className="text-white text-sm font-medium leading-relaxed clamp-2">
                        {apt.description}
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                    <h3 className="text-xl font-bold text-brand-dark group-hover:text-brand-accent transition-colors">
                        {apt.name}
                    </h3>
                    <div className="text-right">
                        {price.hasPrice ? (
                            <>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{price.labelBefore}</p>
                                <p className="text-xl font-black text-brand-dark">
                                    {price.formattedPrice}<span className="text-xs font-normal text-gray-400 font-sans">{price.labelAfter}</span>
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium">{t('price.note')}</p>
                            </>
                        ) : (
                            <p className="text-sm font-bold text-gray-400 mt-2">{price.fullText}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs font-semibold text-gray-500 border-t border-gray-50 pt-4">
                    <span className="flex items-center gap-1.5">👥 {apt.capacity} {t('featured.guests')}</span>
                    <span className="flex items-center gap-1.5">🛏 {apt.bedrooms} {t('featured.rooms')}</span>
                    {apt.sizeM2 && <span className="flex items-center gap-1.5">📐 {apt.sizeM2} m²</span>}
                </div>

                <button className="w-full py-3 bg-brand-soft text-brand-dark font-bold rounded-xl transition-all hover:bg-brand-accent hover:text-white group-hover:shadow-lg group-hover:shadow-brand-accent/20">
                    {t('cta.bookNow')}
                </button>
            </div>
        </div>
    );
};

interface ApartmentGridProps {
    variant?: 'default' | 'modern' | 'minimal' | 'luxe';
}

export const ApartmentGrid: React.FC<ApartmentGridProps> = ({ variant = 'default' }) => {
    const { apartments } = useBootstrapState();

    if (apartments.length === 0) {
        return (
            <section id="alojamientos" className="py-20 text-center">
                <div className="max-w-xl mx-auto px-4 bg-gray-50 rounded-3xl py-16 border-2 border-dashed border-gray-200">
                    <span className="text-5xl mb-4 block">🏠</span>
                    <h3 className="text-xl font-bold text-gray-800">No hay alojamientos disponibles</h3>
                    <p className="text-gray-500 mt-2">Estamos preparando nuevas estancias para ti. Vuelve pronto.</p>
                </div>
            </section>
        );
    }

    return (
        <section id="alojamientos" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold font-serif text-brand-dark">
                    Nuestras Estancias
                </h2>
                <div className="w-20 h-1 bg-brand-accent mx-auto rounded-full" />
                <p className="text-gray-500 max-w-xl mx-auto text-lg leading-relaxed">
                    Descubre el refugio perfecto para tu próxima escapada. Espacios diseñados para el confort y la desconexión.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {apartments.map((apt) => (
                    <ApartmentCard key={apt.id} apt={apt} variant={variant} />
                ))}
            </div>
        </section>
    );
};
