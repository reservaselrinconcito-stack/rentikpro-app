import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Square, Users, CheckCircle } from 'lucide-react';
import { useThemeTokens } from '../../themes/useThemeTokens';
import { SiteBlock } from '../../site-config/types';

interface ApartmentsBlockProps {
    block: SiteBlock;
    config: any;
}

export const ApartmentsBlock: React.FC<ApartmentsBlockProps> = ({ block, config }) => {
    const { t } = useTranslation();
    const tokens = useThemeTokens();

    const activeApartments = config.apartments.filter((apt: any) => apt.status === 'active');

    return (
        <section className="py-24 bg-stone-50">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12">
                    <div>
                        <span className="text-orange-600 text-xs font-black uppercase tracking-widest mb-2 block">{block.subtitle || t('nav.apartments', 'Apartamentos')}</span>
                        <h2 className="text-4xl md:text-5xl font-serif text-stone-900">{block.title || t('featured.collection', 'Nuestra Colección')}</h2>
                    </div>
                    <Link to="/apartamentos" className="hidden md:flex items-center gap-2 text-stone-500 hover:text-orange-600 transition-colors font-medium group">
                        {t('cta.viewAll', 'Ver todos')} <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeApartments.map((apt: any) => (
                        <div
                            key={apt.slug}
                            className="group overflow-hidden transition-all duration-500 hover:-translate-y-1"
                            style={{
                                backgroundColor: tokens.secondaryBg || 'white',
                                borderRadius: tokens.radius,
                                boxShadow: tokens.shadow
                            }}
                        >
                            <div className="relative h-64 overflow-hidden">
                                <img
                                    src={apt.photos?.[0] || "/placeholders/room-1.svg"}
                                    alt={apt.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute top-4 left-4 text-white px-3 py-1 rounded-full text-xs font-black" style={{ backgroundColor: tokens.accentColor }}>
                                    Desde {apt.priceFrom}€/noche
                                </div>
                            </div>
                            <div className="p-8">
                                <h3 className="text-2xl font-serif font-bold text-stone-900 mb-2">{apt.name}</h3>
                                <div className="flex items-center gap-4 text-stone-500 text-sm mb-6">
                                    <span className="flex items-center gap-1"><Square size={14} /> {apt.sizeM2}m²</span>
                                    <span className="flex items-center gap-1"><Users size={14} /> {apt.capacity} pers.</span>
                                </div>
                                <p className="text-stone-600 font-light line-clamp-2 mb-6 text-sm">
                                    {apt.description}
                                </p>
                                <Link
                                    to={`/apartamentos/${apt.slug}`}
                                    className="block text-center w-full py-3 border border-stone-200 font-bold text-stone-600 transition-all"
                                    style={{ borderRadius: `calc(${tokens.radius} / 2)` }}
                                >
                                    {t('cta.viewDetails', 'Ver detalles')}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
