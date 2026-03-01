import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Layout, ArrowRight, MapPin, Tent, Sparkles, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSiteConfig } from '../site-config/useSiteConfig';
import { useChat } from '../context/ChatContext';
import { useThemeTokens } from '../themes/useThemeTokens';

const Apartments: React.FC = () => {
  const { t } = useTranslation();
  const config = useSiteConfig();
  const { openChat } = useChat();
  const tokens = useThemeTokens();

  return (
    <div className="bg-stone-50 min-h-screen pt-24 pb-32" style={{ fontSize: `${tokens.fontScale}rem` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-20">
          <span className="font-bold tracking-[0.2em] text-sm uppercase mb-4 block underline decoration-orange-200 underline-offset-8" style={{ color: tokens.accentColor }}>{t('intro.label')}</span>
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
          {config.apartments.map((apt) => {
            const isComingSoon = apt.status === 'coming_soon';
            const location = config.locations.find(l => l.id === apt.locationId);

            return (
              <div key={apt.slug} className="group flex flex-col">
                <div
                  className="relative aspect-[4/5] overflow-hidden bg-stone-200 transition-all duration-700"
                  style={{ borderRadius: tokens.radius, boxShadow: tokens.shadow }}
                >
                  <img
                    src={apt.photos?.[0] || '/placeholders/room-1.svg'}
                    alt={apt.name}
                    className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 ${isComingSoon ? 'opacity-60 grayscale-[0.5]' : ''}`}
                  />

                  {/* Status Badge */}
                  <div className={`absolute top-6 right-6 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl ${isComingSoon
                    ? 'bg-stone-900 text-orange-200 border border-orange-900/30'
                    : 'bg-white/95 backdrop-blur-md text-stone-900'
                    }`}>
                    {isComingSoon ? t('nav.comingSoon') : <Link to={`/disponibilidad?apartment=${apt.slug}`} className="hover:underline">{t('cta.checkAvailability')}</Link>}
                  </div>

                  {/* Location Badge */}
                  <div className="absolute bottom-6 left-6 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 border border-white/10" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <MapPin size={12} style={{ color: tokens.accentColor }} /> {location?.town || 'Teruel'}
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
                      <span className="text-[10px] uppercase tracking-widest font-black text-stone-400">{location?.name || 'El Rinconcito'}</span>
                      <span className="text-sm font-serif text-stone-600 italic">{location?.town || 'Fuentespalda'}, {location?.province || 'Teruel'}</span>
                    </div>
                    <Link
                      to={isComingSoon ? '/proximamente' : `/apartamentos/${apt.slug}`}
                      className={`flex items-center justify-center w-14 h-14 transition-all duration-500 transform group-hover:-translate-y-1 shadow-xl`}
                      style={{
                        backgroundColor: isComingSoon ? '#e5e7eb' : tokens.primaryColor,
                        color: isComingSoon ? '#6b7280' : 'white',
                        borderRadius: '9999px' // User said icons usually rounded-full, but if they want radius applied everywhere... 
                      }}
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
        <div className="rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden" style={{ backgroundColor: tokens.primaryColor, boxShadow: tokens.shadow }}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <Sparkles style={{ color: tokens.accentColor }} className="mx-auto mb-8" size={48} />
          <h2 className="font-serif text-4xl md:text-5xl text-white mb-8">{t('guides.doubts')}</h2>
          <p className="text-stone-400 text-xl max-w-xl mx-auto mb-12 font-light">
            {t('contact.subtitle')}
          </p>
          <Link to="/contacto" className="inline-block bg-white text-stone-900 px-12 py-5 font-bold hover:bg-orange-50 transition-all text-lg shadow-2xl" style={{ borderRadius: tokens.radius }}>
            {t('nav.contact')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Apartments;