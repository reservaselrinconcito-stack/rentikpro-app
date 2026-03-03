import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Ruler, Bath, Users, Layout, MapPin, ArrowLeft, Star, Wind, Sparkles, X, MessageSquare, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LOCATIONS } from '../constants';
import { useApartmentsPricingSync } from '../hooks/useApartmentsPricingSync';
import { RentikProCalendar } from '../components/RentikProCalendar';
import { useChat } from '../context/ChatContext';
import { useSEO, buildApartmentSchema } from '../hooks/useSEO';
import { PriceDisplay } from '../components/PriceDisplay';

// --- Lightbox Component ---
interface LightboxProps {
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onNav: (idx: number) => void;
}
const Lightbox: React.FC<LightboxProps> = ({ photos, currentIndex, onClose, onNav }) => {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNav((currentIndex + 1) % photos.length);
      if (e.key === 'ArrowLeft') onNav((currentIndex - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, photos.length, onClose, onNav]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 text-white/60 hover:text-white z-10 bg-white/10 rounded-full p-2">
        <X size={24} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNav((currentIndex - 1 + photos.length) % photos.length); }}
        className="absolute left-4 md:left-8 text-white/60 hover:text-white z-10 bg-white/10 rounded-full p-3"
      >
        <ChevronLeft size={28} />
      </button>
      <img
        src={photos[currentIndex]}
        alt={`Foto ${currentIndex + 1}`}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onNav((currentIndex + 1) % photos.length); }}
        className="absolute right-4 md:right-8 text-white/60 hover:text-white z-10 bg-white/10 rounded-full p-3"
      >
        <ChevronRight size={28} />
      </button>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onNav(i); }}
            className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-125' : 'bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
};

// --- Photo Gallery Component ---
interface PhotoGalleryProps {
  photos: string[];
  apartmentName: string;
}
const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, apartmentName }) => {
  const { t } = useTranslation();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const fallbackSrc = '/placeholders/room-1.svg';

  if (!photos || photos.length === 0) return null;

  // Show max 5 images in grid, rest in lightbox
  const gridPhotos = photos.slice(0, 5);
  const hasMore = photos.length > 5;

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNav={setLightboxIdx}
        />
      )}
      <div className="relative grid grid-cols-4 grid-rows-2 gap-2 h-[60vh] rounded-3xl overflow-hidden">
        {/* Main large image */}
        <div className="col-span-2 row-span-2 relative cursor-pointer group" onClick={() => setLightboxIdx(0)}>
          <img
            src={gridPhotos[0]}
            alt={`${apartmentName} - foto 1`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              const el = e.currentTarget;
              if (el.src.endsWith(fallbackSrc)) return;
              if (import.meta.env.DEV) console.warn('[img] failed:', gridPhotos[0]);
              el.src = fallbackSrc;
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
          </div>
        </div>

        {/* Side images */}
        {gridPhotos.slice(1, 5).map((photo, i) => (
          <div key={i} className="relative cursor-pointer group overflow-hidden" onClick={() => setLightboxIdx(i + 1)}>
            <img
              src={photo}
              alt={`${apartmentName} - foto ${i + 2}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.src.endsWith(fallbackSrc)) return;
                if (import.meta.env.DEV) console.warn('[img] failed:', photo);
                el.src = fallbackSrc;
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
            </div>
            {/* "Ver todas" overlay on last image */}
            {i === 3 && hasMore && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center" onClick={(e) => { e.stopPropagation(); setLightboxIdx(4); }}>
                <span className="text-white font-bold text-lg">+{photos.length - 5}</span>
                <span className="text-white/80 text-xs uppercase tracking-widest">{t('common.see_all')}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

const ApartmentDetail: React.FC = () => {
  const { t } = useTranslation();
  const { openChat } = useChat();
  const { slug } = useParams<{ slug: string }>();
  const apartments = useApartmentsPricingSync();
  const apartment = apartments.find(a => a.slug === slug);

  // Selection state for mini calendar
  const [selection, setSelection] = useState<{ from: Date, to: Date, nights: number } | null>(null);

  // SEO
  useSEO({
    title: apartment ? `${apartment.name} — Apartamento rural en Fuentespalda` : 'Apartamento no encontrado',
    description: apartment?.description,
    schema: apartment ? buildApartmentSchema({
      name: apartment.name,
      description: apartment.description,
      priceFrom: apartment.priceFrom ?? 90,
      capacity: apartment.capacity,
      photos: apartment.photos,
    }) : undefined,
  });

  // 404 Handling
  if (!apartment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 text-center px-4">
        <h2 className="text-4xl font-serif text-stone-900 mb-4">{t('featured.not_found')}</h2>
        <p className="text-stone-500 mb-8">{t('featured.not_available_desc')}</p>
        <Link to="/apartamentos" className="bg-stone-900 text-white px-10 py-4 rounded-full font-bold hover:bg-orange-700 transition-all shadow-xl">
          {t('featured.back_to_collection')}
        </Link>
      </div>
    );
  }

  const isComingSoon = apartment.status === 'coming_soon';
  const location = apartment.locationId === 'rinconcito' ? LOCATIONS.rinconcito : LOCATIONS.masMatarrana;

  // Construct message
  const bookingMessage = selection
    ? `Hola, me gustaría reservar "${apartment.name}" del ${selection.from.toLocaleDateString()} al ${selection.to.toLocaleDateString()} (${selection.nights} noches).`
    : '';

  return (
    <div className="bg-stone-50 pb-32">
      {/* Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <Link to="/apartamentos" className="inline-flex items-center gap-2 text-stone-600 hover:text-orange-700 transition-all group">
          <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200 group-hover:bg-orange-50 group-hover:border-orange-200 transition-all">
            <ArrowLeft size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em]">{t('featured.collection')}</span>
        </Link>
      </div>

      {/* Photo Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <PhotoGallery photos={apartment.photos} apartmentName={apartment.name} />
      </div>

      {/* Title block below gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="bg-stone-100 border border-stone-200 px-4 py-2 rounded-full text-stone-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <MapPin size={12} className="text-orange-600" /> {location.town}
          </div>
          {isComingSoon && (
            <div className="bg-orange-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
              {t('featured.valjunquera_project')}
            </div>
          )}
        </div>
        <h1 className="font-serif text-5xl md:text-7xl text-stone-900 font-bold leading-[0.9] mb-4 tracking-tighter">
          {apartment.name}
        </h1>
        <div className="flex items-center gap-4 text-stone-500 text-lg font-light">
          <span>{apartment.sizeM2} {t('guides.m2')} · {t('featured.capacity_desc', { count: apartment.capacity })}</span>
          <span className="mx-2 opacity-30">·</span>
          <PriceDisplay
            price={apartment.publicBasePrice}
            currency={apartment.currency}
            priceClassName="text-xl"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="grid lg:grid-cols-12 gap-16 lg:gap-24">

          {/* Main Details */}
          <div className="lg:col-span-8">
            <div className="space-y-16">

              {/* Introduction */}
              <div className="prose prose-stone max-w-none">
                <h2 className="font-serif text-4xl text-stone-900 mb-8 border-l-4 border-orange-700 pl-8 leading-tight">
                  {t('featured.experience_title')} <br /> para el <span className="italic font-normal">{t('featured.experience_italic')}</span>
                </h2>
                <p className="text-stone-500 text-xl font-light leading-relaxed mb-10">
                  {apartment.longDescription || apartment.description}
                </p>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Ruler, label: t('intro.label'), val: `${apartment.sizeM2} ${t('guides.m2')}` },
                  { icon: Users, label: t('featured.guests'), val: `${apartment.capacity} ${t('guides.capacity_plazas')}` },
                  { icon: Layout, label: t('featured.rooms'), val: apartment.bedrooms || 'Estudio' },
                  { icon: Bath, label: t('featured.bathrooms') || 'Baños', val: `${apartment.bathrooms} Privado` }
                ].map((spec, i) => (
                  <div key={i} className="bg-white border border-stone-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                    <spec.icon size={24} className="text-orange-700 mb-6" />
                    <p className="text-[10px] uppercase tracking-widest font-black text-stone-400 mb-1">{spec.label}</p>
                    <p className="text-lg font-serif text-stone-900">{spec.val}</p>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              {apartment.highlights.length > 0 && (
                <div>
                  <h3 className="font-serif text-2xl text-stone-900 mb-10 border-b border-stone-100 pb-6 uppercase tracking-widest text-sm font-black">{t('featured.amenities')}</h3>
                  <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                    {apartment.highlights.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-4 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-700 group-hover:scale-150 transition-transform"></div>
                        <span className="text-stone-600 font-light text-lg">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technology Strip */}
              {!isComingSoon && (
                <div className="bg-stone-900 rounded-[3rem] p-12 relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all"></div>
                  <div className="relative z-10 grid md:grid-cols-3 gap-12 items-center">
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3 mb-6">
                        <Sparkles className="text-emerald-500" size={24} />
                        <span className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em]">{t('tech.frictionless')}</span>
                      </div>
                      <h4 className="font-serif text-3xl text-white mb-6">{t('featured.rentik_managed')}</h4>
                      <p className="text-stone-400 font-light leading-relaxed">
                        Tu tiempo es sagrado. Por eso hemos eliminado las llaves físicas, las esperas y la burocracia. Accede con un simple código seguro en tu móvil y gestiona tu estancia con total independencia.
                      </p>
                    </div>
                    <div className="text-center md:text-right">
                      <Link to="/rentikpro" className="inline-block bg-white text-stone-900 px-8 py-4 rounded-full font-bold hover:bg-orange-50 transition-all text-sm shadow-xl whitespace-nowrap">
                        {t('featured.more_about_rentik')}
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Action Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-32">
              {!isComingSoon ? (
                /* BOOKING SIDEBAR */
                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-stone-100 shadow-2xl relative overflow-hidden group">
                  {/* Decorative background element */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-700/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-end mb-8">
                      <div className="flex flex-col">
                        <PriceDisplay
                          price={apartment.publicBasePrice}
                          currency={apartment.currency}
                          priceClassName="text-4xl"
                        />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 text-stone-400 text-sm">
                          <Star size={16} className="text-orange-500 fill-orange-500" />
                          <span className="font-bold text-stone-900">4.9</span>
                          <span>(24)</span>
                        </div>
                        <button onClick={openChat} className="text-[10px] font-bold uppercase tracking-widest text-orange-600 hover:text-orange-800 flex items-center gap-1">
                          <MessageSquare size={12} /> ¿Dudas?
                        </button>
                      </div>
                    </div>

                    {/* MINI CALENDAR EMBED */}
                    <div className="mb-8">
                      <RentikProCalendar
                        apartmentSlug={apartment.slug}
                        className="shadow-inner border border-stone-100"
                        compact={true}
                        onRangeSelect={(from, to, nights) => setSelection({ from, to, nights })}
                      />
                      <p className="mt-4 text-[10px] text-stone-400 italic text-center">
                        {t('price.note')}
                      </p>
                    </div>

                    {selection ? (
                      <div className="animate-fade-in-up">
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4 text-center">
                          <span className="block text-xs font-black uppercase tracking-widest text-orange-400 mb-1">{t('common.your_selection')}</span>
                          <span className="font-serif text-xl text-stone-900">{selection.nights} {t('common.nights')}</span>
                          <div className="text-xs text-stone-500">{selection.from.toLocaleDateString()} - {selection.to.toLocaleDateString()}</div>
                          <button onClick={() => setSelection(null)} className="mt-2 text-[10px] underline text-stone-400 hover:text-stone-600 flex items-center justify-center gap-1 w-full"><X size={10} /> {t('apartment.clear_selection')}</button>
                        </div>
                        <Link
                          to={`/contacto?msg=${encodeURIComponent(bookingMessage)}`}
                          className="block w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all shadow-xl hover:shadow-orange-900/40 text-center"
                        >
                          Solicitar Reserva
                        </Link>
                      </div>
                    ) : (
                      <Link
                        to={`/disponibilidad?apartment=${apartment.slug}`}
                        className="block w-full bg-stone-100 text-stone-500 py-4 rounded-2xl font-bold text-lg hover:bg-stone-200 transition-all text-center"
                      >
                        Ver pantalla completa
                      </Link>
                    )}

                    <div className="mt-6 pt-6 border-t border-stone-50 text-center">
                      <div className="flex items-center justify-center gap-2 text-stone-400 mb-2">
                        <Wind size={14} className="text-orange-700" />
                        <span className="text-xs font-bold">{t('featured.instant_confirmation')}</span>
                      </div>
                      <p className="text-[10px] text-stone-300 uppercase tracking-[0.2em] font-black">{t('featured.integrated_booking')}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* COMING SOON SIDEBAR */
                <div className="bg-orange-700 rounded-[3rem] p-12 text-white shadow-2xl shadow-orange-900/40 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 50 Q 150 0 300 50 T 600 50" stroke="white" fill="transparent" />
                    </svg>
                  </div>
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-white/30 backdrop-blur-md">
                      <Sparkles size={40} className="text-white" />
                    </div>
                    <h3 className="font-serif text-3xl mb-4 leading-tight">{t('featured.valjunquera_project')}</h3>
                    <p className="text-orange-100 mb-12 text-lg font-light leading-relaxed">
                      {t('featured.coming_soon_desc')}
                    </p>

                    <Link to="/proximamente" className="block w-full bg-white text-orange-700 py-6 rounded-2xl font-bold text-lg hover:bg-stone-900 hover:text-white transition-all shadow-2xl">
                      {t('featured.opening_priority')}
                    </Link>
                    <p className="text-[10px] uppercase tracking-widest text-orange-200 mt-6 opacity-60">
                      {t('featured.priority_list_note')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div >
  );
};

export default ApartmentDetail;
