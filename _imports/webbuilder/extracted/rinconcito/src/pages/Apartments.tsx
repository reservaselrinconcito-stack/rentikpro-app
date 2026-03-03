import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Layout, ArrowRight, MapPin, Tent, Sparkles, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApartmentsPricingSync } from '../hooks/useApartmentsPricingSync';
import { LOCATIONS } from '../constants';
import { useChat } from '../context/ChatContext';
import { PriceDisplay } from '../components/PriceDisplay';

const Apartments: React.FC = () => {
  const { t } = useTranslation();
  const { openChat } = useChat();
  const apartments = useApartmentsPricingSync();

  const imgFallback = (id: string) => {
    if (id.includes('el-olivo')) return '/placeholders/coming-soon-1.svg';
    if (id.includes('la-parra')) return '/placeholders/coming-soon-2.svg';
    return '/placeholders/room-1.svg';
  };

  return (
    <div className="bg-stone-50 min-h-screen pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-20">
          <span className="text-orange-700 font-bold tracking-[0.2em] text-sm uppercase mb-4 block underline decoration-orange-200 underline-offset-8">{t('intro.label')}</span>
          <h1 className="font-serif text-5xl md:text-6xl text-stone-900 mb-6 font-bold leading-tight">{t('featured.title')}</h1>
          <p className="text-stone-500 text-xl font-light leading-relaxed mb-6">
            {t('featured.subtitle')}
          </p>
          <button
            onClick={openChat}
            className="inline-flex items-center gap-2 text-stone-400 hover:text-orange-600 transition-colors text-xs font-bold uppercase tracking-widest border border-stone-200 px-4 py-2 rounded-full hover:border-orange-200 hover:bg-orange-50"
          >
            <MessageSquare size={14} />
            ¿Dudas? Preguntar al asistente
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
          {apartments.map((apt) => {
            const isComingSoon = apt.status === 'coming_soon';
            const location = apt.locationId === 'rinconcito' ? LOCATIONS.rinconcito : LOCATIONS.masMatarrana;

            return (
              <div key={apt.id} className="group flex flex-col">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-stone-200 shadow-xl group-hover:shadow-2xl transition-all duration-700">
                  <img
                    src={apt.photos[0]}
                    alt={apt.name}
                    className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 ${isComingSoon ? 'opacity-60 grayscale-[0.5]' : ''}`}
                    onError={(e) => {
                      const el = e.currentTarget;
                      const next = imgFallback(apt.id);
                      if (el.src.endsWith(next)) return;
                      if (import.meta.env.DEV) console.warn('[img] failed:', apt.photos[0]);
                      el.src = next;
                    }}
                  />

                  {/* Status Badge */}
                  <div className={`absolute top-6 right-6 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl ${isComingSoon
                    ? 'bg-stone-900 text-orange-200 border border-orange-900/30'
                    : 'bg-white/95 backdrop-blur-md text-stone-900'
                    }`}>
                    {isComingSoon ? t('nav.comingSoon') : <Link to={`/disponibilidad?apartment=${apt.slug}`} className="hover:underline">{t('cta.checkAvailability')}</Link>}
                  </div>

                  {/* Location Badge */}
                  <div className="absolute bottom-6 left-6 bg-stone-900/40 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 border border-white/10">
                    <MapPin size={12} className="text-orange-400" /> {location.town}
                  </div>
                </div>

                <div className="pt-8 px-2 flex flex-col flex-grow">
                  <div className="flex items-center gap-6 mb-4 text-stone-400 text-[11px] font-black uppercase tracking-widest">
                    {(apt.capacity || 0) > 0 && (
                      <span className="flex items-center gap-2">
                        <Users size={14} className="text-orange-700" /> {apt.capacity} {t('guides.capacity_plazas')}
                      </span>
                    )}
                    {/* Mostrar Dormitorios o Layout */}
                    {(apt.bedrooms || 0) > 0 ? (
                      <span className="flex items-center gap-2">
                        <Layout size={14} className="text-orange-700" /> {apt.bedrooms} {t('guides.bedrooms_hab')}
                      </span>
                    ) : (
                      apt.layout && (
                        <span className="flex items-center gap-2">
                          <Tent size={14} className="text-emerald-600" /> {apt.layout}
                        </span>
                      )
                    )}
                  </div>

                  <h2 className="font-serif text-3xl text-stone-900 mb-4 group-hover:text-orange-700 transition-colors">{apt.name}</h2>
                  <p className="text-stone-500 mb-8 font-light leading-relaxed line-clamp-2 text-base flex-grow">
                    {apt.description || "Pendiente de confirmar"}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-stone-100">
                    <div className="flex flex-col">
                      <PriceDisplay
                        price={apt.publicBasePrice}
                        currency={apt.currency}
                        className="mb-1"
                        priceClassName="text-2xl"
                      />
                      <span className="text-sm font-serif text-stone-600 italic">{t('territory.location', 'Fuentespalda, Teruel')}</span>
                    </div>
                    <Link
                      to={isComingSoon ? '/proximamente' : `/apartamentos/${apt.slug}`}
                      className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 transform group-hover:-translate-y-1 ${isComingSoon
                        ? 'bg-stone-200 text-stone-500 hover:bg-stone-300 shadow-sm'
                        : 'bg-stone-900 text-white hover:bg-orange-700 shadow-xl hover:shadow-orange-900/40'
                        }`}
                    >
                      <ArrowRight size={24} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-40">
        <div className="bg-stone-900 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-700/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <Sparkles className="text-orange-500 mx-auto mb-8" size={48} />
          <h2 className="font-serif text-4xl md:text-5xl text-white mb-8">{t('guides.doubts')}</h2>
          <p className="text-stone-400 text-xl max-w-xl mx-auto mb-12 font-light">
            {t('contact.subtitle')}
          </p>
          <Link to="/contacto" className="inline-block bg-white text-stone-900 px-12 py-5 rounded-full font-bold hover:bg-orange-50 transition-all text-lg shadow-2xl">
            {t('nav.contact')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Apartments;
