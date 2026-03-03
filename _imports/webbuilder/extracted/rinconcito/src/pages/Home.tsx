import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowUpRight, Star, Moon, Calendar, ChevronDown, MessageSquare, Play, Utensils, Bike, Telescope, Waves } from 'lucide-react';
import { RentikProSection } from '../components/RentikProSection';
import { TerritoryMap } from '../components/TerritoryMap';
import { NarrativeSection } from '../components/NarrativeSection';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { WeatherWidget } from '../components/WeatherWidget';
import { PriceDisplay } from '../components/PriceDisplay';
import { useApartmentsPricingSync } from '../hooks/useApartmentsPricingSync';
import { EXPERIENCES } from '../content/experiences';
import { REVIEWS } from '../content/reviews';
import { BRAND } from '../content/brand';
import { useChat } from '../context/ChatContext';
import { ApartmentQuiz } from '../components/ApartmentQuiz';
import { useSEO, buildLodgingBusinessSchema } from '../hooks/useSEO';

const CDN = {
  hero: '/assets/home/foto.jpg',  // Foto subida por el usuario
  tirolina: '/assets/rooms/la-tirolina/02-cocina.jpg',
  bano: '/assets/rooms/la-tirolina/03-bano-banera.jpg',
  valderrobres: '/assets/fachada/01-entrada.jpg',
  toscana: '/assets/fachada/02-calle.jpg',
  matarrana: '/assets/rooms/zona-comun/01-billar-dardos.jpg',
};

const TICKER_ITEMS = [
  'El Matarraña', 'Fuentespalda', 'Teruel', 'Astroturismo', 'Gastronomía D.O.',
  'Parrizal de Beceite', 'Bike Park', 'Tirolina Doble', 'La Toscana Española',
  'Apartamentos Rurales', 'Reserva de la Biosfera', 'Valderrobres', 'Aceite D.O.',
  'Cargador Coche Eléctrico Gratis', 'Eclipse 2026', 'Vía Verde Val de Zafán',
  'Cielos Starlight', 'Pozas Naturales',
  '★ Sol Repsol', '★ Estrella Michelin', 'Pueblos más Bonitos de España',
];

const ECLIPSE_DATE = new Date('2026-08-12T20:29:00+02:00');

function useEclipseCountdown() {
  const [diff, setDiff] = useState(Math.max(0, ECLIPSE_DATE.getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setDiff(Math.max(0, ECLIPSE_DATE.getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, []);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, passed: diff === 0 };
}

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export default function Home() {
  useSEO({ schema: buildLodgingBusinessSchema() });
  const { openChat } = useChat();
  const { t, i18n } = useTranslation();
  const apartments = useApartmentsPricingSync();

  const activeApts = apartments.filter(a => a.status === 'active' && a.locationId === 'rinconcito');
  const comingSoon = apartments.filter(a => a.status === 'coming_soon');
  const highlightedReviews = REVIEWS.filter(r => r.highlighted);

  const [heroLoaded, setHeroLoaded] = useState(false);
  const [showScroll, setShowScroll] = useState(true);
  const [activeReview, setActiveReview] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const galleryImages = [
    { src: CDN.tirolina, caption: 'Tirolina doble', location: 'Fuentespalda · Matarraña' },
    { src: CDN.bano, caption: 'Baño natural en el río', location: 'Río Matarraña' },
    { src: CDN.toscana, caption: 'La Toscana española', location: 'Comarca del Matarraña' },
    { src: '/assets/rooms/zona-comun/01-billar-dardos.jpg', caption: 'Sala de juegos', location: 'Zona Común · El Rinconcito' },
    { src: '/assets/rooms/zona-comun/02-barra-medieval.jpg', caption: 'Barra medieval', location: 'Zona Común · El Rinconcito' },
    { src: '/assets/rooms/la-ermita/01-dormitorio.jpg', caption: 'La Ermita', location: 'Fuentespalda · Teruel' },
    { src: '/assets/rooms/los-almendros/02-cocina.jpg', caption: 'Los Almendros', location: 'Fuentespalda · Teruel' },
    { src: '/assets/rooms/la-tirolina/01-dormitorio-dosel.jpg', caption: 'La Tirolina', location: 'Fuentespalda · Teruel' },
    { src: '/assets/fachada/01-entrada.jpg', caption: 'El Rinconcito', location: 'Fuentespalda · Teruel' },
  ];


  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 80);
    const onScroll = () => setShowScroll(window.scrollY < 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    if (!highlightedReviews.length) return;
    const t = setInterval(() => setActiveReview(i => (i + 1) % highlightedReviews.length), 5000);
    return () => clearInterval(t);
  }, [highlightedReviews.length]);

  const eclipse = useEclipseCountdown();
  const eclipseRev = useReveal(0.08);
  const premiumRev = useReveal(0.08);

  const statsRev = useReveal();
  const aptsRev = useReveal(0.08);
  const regionRev = useReveal(0.08);
  const reviewsRev = useReveal(0.08);
  const contactRev = useReveal(0.08);

  return (
    <div style={{ background: 'var(--cream)', color: 'var(--ink)' }} className="font-sans overflow-x-hidden">

      {/* §1 — HERO */}
      <section className="relative overflow-hidden grain" style={{ height: '100svh', minHeight: 640, maxHeight: 1080 }}>
        <div className="absolute inset-0 z-0">
          <img
            src={CDN.hero}
            alt="El Rinconcito Matarraña — Apartamentos rurales en Fuentespalda, Teruel"
            onLoad={() => setHeroLoaded(true)}
            className="w-full h-full object-cover animate-drift"
            style={{ opacity: heroLoaded ? 1 : 0, transition: 'opacity 1.4s ease' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(28,24,18,0.88) 0%, rgba(28,24,18,0.55) 50%, rgba(28,24,18,0.12) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-56" style={{ background: 'linear-gradient(to top, var(--cream), transparent)' }} />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-14 lg:px-24 pt-20">
          <div className="max-w-3xl">

            <div className="flex items-center gap-3 mb-8" style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? 'none' : 'translateY(16px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s' }}>
              <span className="h-px w-10" style={{ background: 'var(--gold)' }} />
              <span className="font-sans text-xs uppercase tracking-[0.3em] font-medium" style={{ color: 'var(--gold)' }}>{t('territory.location')}</span>
              <span className="mx-2 opacity-30" style={{ color: 'var(--gold)' }}>·</span>
              <WeatherWidget compact />
            </div>

            <h1
              className="font-display font-light leading-none mb-8"
              style={{ fontSize: 'clamp(52px,9.5vw,132px)', color: 'var(--cream)', letterSpacing: '-0.025em', opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? 'none' : 'translateY(40px)', transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1) 0.22s' }}
            >
              {t('hero.title', 'El arte de')}<br />
              <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>{t('hero.italicTitle', 'no hacer nada.')}</em>
            </h1>

            <p className="font-sans font-light mb-10 max-w-md leading-relaxed" style={{ fontSize: 'clamp(15px,1.4vw,19px)', color: 'rgba(244,240,232,0.72)', opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? 'none' : 'translateY(24px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s' }}>
              {t('hero.desc', 'Desconexión total en el corazón del Matarraña. Naturaleza pura, confort cuidado al detalle.')}
            </p>

            <div className="flex flex-wrap gap-4" style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? 'none' : 'translateY(20px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.55s' }}>
              <Link to="/disponibilidad" className="btn-primary flex items-center gap-2.5 px-8 py-4 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t('cta.checkAvailability', 'Ver disponibilidad en tiempo real')}
              </Link>
              <Link to="/apartamentos" className="btn-ghost flex items-center gap-2 px-8 py-4 text-sm">
                {t('nav.apartments', 'Los apartamentos')} <ArrowRight size={16} />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-10" style={{ opacity: heroLoaded ? 1 : 0, transition: 'opacity 1s ease 0.75s' }}>
              {[{ icon: '★', v: '10/10', l: 'Booking.com' }, { icon: '★', v: '5/5', l: 'Google' }].map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span style={{ color: 'var(--gold)', fontSize: 12 }}>{b.icon}</span>
                  <span className="font-sans font-semibold text-sm" style={{ color: 'var(--cream)' }}>{b.v}</span>
                  <span className="font-sans text-xs" style={{ color: 'rgba(244,240,232,0.45)' }}>{b.l}</span>
                  <span style={{ color: 'rgba(244,240,232,0.2)', marginLeft: 6 }}>·</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--gold)', fontSize: 12 }}>◇</span>
                <PriceDisplay
                  price={90}
                  showPerNight={true}
                  showFrom={true}
                  className="!gap-1.5"
                  priceClassName="!text-white !font-sans !font-semibold !text-sm"
                  labelClassName="!text-[rgba(244,240,232,0.45)] !text-xs !font-sans !font-normal !tracking-normal !lowercase"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500" style={{ opacity: showScroll ? 0.5 : 0 }}>
          <span className="font-sans text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--cream)' }}>{t('common.scroll')}</span>
          <ChevronDown size={15} style={{ color: 'var(--cream)' }} className="animate-bounce" />
        </div>

        <div className="absolute right-8 top-1/2 -translate-y-1/2 vert-text hidden xl:flex items-center gap-3" style={{ opacity: heroLoaded ? 0.35 : 0, transition: 'opacity 1.2s ease 1s' }}>
          <span className="h-14 w-px" style={{ background: 'var(--gold)' }} />
          <span className="font-sans text-[9px] uppercase tracking-[0.25em]" style={{ color: 'var(--cream)' }}>{t('territory.location')}</span>
        </div>
      </section>

      {/* §2 — TICKER */}
      <div className="overflow-hidden py-4 border-y" style={{ background: 'var(--ink)', borderColor: 'rgba(200,169,110,0.2)' }}>
        <div className="flex animate-marquee whitespace-nowrap" aria-hidden="true">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-5 mx-5">
              <span className="font-display italic text-sm" style={{ color: 'rgba(244,240,232,0.65)', fontWeight: 300 }}>{item}</span>
              <span style={{ color: 'var(--gold)', fontSize: 7 }}>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* §3 — NUMBERS STATEMENT */}
      <section className="py-24 md:py-36 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div ref={statsRev.ref} className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div style={{ opacity: statsRev.visible ? 1 : 0, transform: statsRev.visible ? 'none' : 'translateX(-36px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--rust)' }}>{t('intro.label', 'Quiénes somos')}</p>
            <h2 className="font-display italic font-light leading-none mb-8" style={{ fontSize: 'clamp(34px,4.5vw,66px)', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              {t('home.tagline_1')}<br /><span style={{ color: 'var(--rust)' }}>{t('home.tagline_2')}</span><br />{t('home.tagline_3')}
            </h2>
            <p className="font-sans font-light leading-relaxed mb-8" style={{ color: 'var(--ink-muted)', fontSize: 17 }}>
              Toni y Evelyn cuidan cada detalle de sus apartamentos en Fuentespalda como si fueran su propia casa. Una pequeña joya en la que refugiarse, reconectar con la naturaleza y con uno mismo.
            </p>
            <Link to="/apartamentos" className="inline-flex items-center gap-2 font-sans font-semibold text-sm hover-line" style={{ color: 'var(--rust)' }}>
              Conocer los apartamentos <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-5" style={{ opacity: statsRev.visible ? 1 : 0, transform: statsRev.visible ? 'none' : 'translateY(36px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.18s' }}>
            {[
              { num: '3', label: 'apartamentos únicos', sub: 'en Fuentespalda', dark: false },
              { num: '10/10', label: 'en Booking.com', sub: 'puntuación verificada', dark: true },
              { isPrice: true, dark: true },
              { num: '∞', label: 'estrellas', sub: 'cielo sin contaminación', dark: false },
            ].map((s: any, i) => (
              <div
                key={i}
                className="rounded-3xl p-6 transition-all duration-500 hover:scale-105 cursor-default"
                style={{
                  background: s.dark ? 'var(--ink)' : 'var(--cream-dark)',
                  boxShadow: '0 4px 24px rgba(28,24,18,0.08)',
                }}
              >
                {s.isPrice ? (
                  <>
                    <PriceDisplay
                      price={90}
                      className="mb-2 !items-center"
                      priceClassName="!text-[clamp(32px,4.5vw,56px)] !font-display !font-light !text-[var(--gold)] !tracking-tighter"
                      labelClassName="!text-[9px] !uppercase !tracking-widest !text-[rgba(244,240,232,0.35)]"
                    />
                    <p className="font-sans font-semibold text-sm mb-0.5" style={{ color: 'var(--cream)' }}>por noche</p>
                    <p className="font-sans text-xs" style={{ color: 'rgba(244,240,232,0.38)' }}>apartamento completo</p>
                  </>
                ) : (
                  <>
                    {s.prefix && <p className="font-sans text-[9px] uppercase tracking-widest mb-1" style={{ color: s.dark ? 'rgba(244,240,232,0.35)' : 'var(--ink-muted)' }}>{s.prefix}</p>}
                    <p
                      className="font-display leading-none mb-2"
                      style={{ fontSize: 'clamp(32px,4.5vw,56px)', fontWeight: 300, color: s.dark ? 'var(--gold)' : 'var(--rust)', letterSpacing: '-0.025em' }}
                    >
                      {s.num}
                    </p>
                    <p className="font-sans font-semibold text-sm mb-0.5" style={{ color: s.dark ? 'var(--cream)' : 'var(--ink)' }}>{s.label}</p>
                    <p className="font-sans text-xs" style={{ color: s.dark ? 'rgba(244,240,232,0.38)' : 'var(--ink-muted)' }}>{s.sub}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §4 — GOLD RULE */}
      <div className="mx-8 md:mx-14 lg:mx-24 gold-rule" />

      {/* §5 — APARTMENTS */}
      <section ref={aptsRev.ref} className="py-24 md:py-36 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16" style={{ opacity: aptsRev.visible ? 1 : 0, transform: aptsRev.visible ? 'none' : 'translateY(24px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--rust)' }}>{t('featured.title', 'Dónde dormir')}</p>
            <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(40px,6vw,84px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>{t('featured.collection', 'Nuestra colección.')}</h2>
          </div>
          <Link to="/apartamentos" className="mt-6 md:mt-0 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] hover-line" style={{ color: 'var(--ink-light)' }}>
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {/* 1 large + 2 stacked — editorial asymmetry */}
        <div className="grid lg:grid-cols-5 gap-5" style={{ opacity: aptsRev.visible ? 1 : 0, transform: aptsRev.visible ? 'none' : 'translateY(40px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.15s' }}>
          {activeApts[0] && (
            <Link to={`/apartamentos/${activeApts[0].slug}`} className="apt-card lg:col-span-3 group relative overflow-hidden rounded-[2rem] block" style={{ minHeight: 520 }}>
              <img src={activeApts[0].photos[0]} alt={activeApts[0].name} className="apt-img absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(28,24,18,0.95) 0%, rgba(28,24,18,0.1) 55%, transparent 100%)' }} />
              <div className="apt-overlay absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(155,79,46,0.12)', backdropFilter: 'blur(2px)' }}>
                <span className="font-display italic text-5xl" style={{ color: 'var(--cream)', fontWeight: 300 }}>{t('cta.viewDetails', 'Ver apartamento')}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-sans text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--gold)' }}>{activeApts[0].sizeM2}m² · {activeApts[0].capacity} personas</p>
                    <h3 className="font-display italic font-light" style={{ fontSize: 'clamp(26px,3vw,40px)', color: 'var(--cream)', letterSpacing: '-0.01em' }}>{activeApts[0].name}</h3>
                    <p className="font-sans font-light text-sm mt-2 max-w-xs clamp-2 leading-relaxed" style={{ color: 'rgba(244,240,232,0.65)' }}>{activeApts[0].description}</p>
                  </div>
                  <div className="shrink-0 ml-6 text-right">
                    <PriceDisplay
                      price={activeApts[0].publicBasePrice}
                      currency={activeApts[0].currency}
                      priceClassName="!text-3xl !font-display !italic !font-light !text-[var(--gold)]"
                      labelClassName="!text-[9px] !uppercase !tracking-widest !text-[rgba(244,240,232,0.4)]"
                      className="flex-col items-end gap-0"
                    />
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div className="lg:col-span-2 flex flex-col gap-5">
            {activeApts.slice(1).map(apt => (
              <Link key={apt.id} to={`/apartamentos/${apt.slug}`} className="apt-card group relative overflow-hidden rounded-[2rem] flex-1" style={{ minHeight: 248 }}>
                <img src={apt.photos[0]} alt={apt.name} className="apt-img absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(28,24,18,0.92) 0%, rgba(28,24,18,0.08) 60%, transparent 100%)' }} />
                <div className="apt-overlay absolute inset-0" style={{ background: 'rgba(155,79,46,0.1)', backdropFilter: 'blur(1px)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-sans text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--gold)' }}>{apt.sizeM2}m² · {apt.capacity} pers.</p>
                      <h3 className="font-display italic font-light" style={{ fontSize: 22, color: 'var(--cream)', letterSpacing: '-0.01em' }}>{apt.name}</h3>
                    </div>
                    <PriceDisplay
                      price={apt.publicBasePrice}
                      currency={apt.currency}
                      priceClassName="!text-xl !font-display !italic !font-light !text-[var(--gold)]"
                      showFrom={false}
                      showPerNight={false}
                      className="shrink-0 ml-3"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-5" style={{ opacity: aptsRev.visible ? 1 : 0, transition: 'opacity 0.8s ease 0.5s' }}>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34d399' }} />
            <span className="font-sans text-sm" style={{ color: 'var(--ink-muted)' }}>{t('rentik.features.calendar_title')}</span>
          </div>
          <Link to="/disponibilidad" className="btn-primary px-8 py-3.5 text-sm flex items-center gap-2">
            <Calendar size={16} /> Consultar fechas
          </Link>
        </div>
      </section>

      {/* §6 — REGION SPREAD */}
      <section ref={regionRev.ref} className="relative overflow-hidden" style={{ height: 'clamp(440px, 62vw, 680px)' }}>
        <img src={CDN.valderrobres} alt="Valderrobres, Matarraña" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(28,24,18,0.82) 0%, rgba(28,24,18,0.3) 55%, rgba(28,24,18,0.05) 100%)' }} />

        <div className="absolute inset-0 flex flex-col justify-end px-10 md:px-20 lg:px-28 pb-16 md:pb-20" style={{ opacity: regionRev.visible ? 1 : 0, transform: regionRev.visible ? 'none' : 'translateY(24px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>El territorio</p>
          <h2 className="font-display italic font-light mb-6 leading-none" style={{ fontSize: 'clamp(34px,5.5vw,80px)', color: 'var(--cream)', letterSpacing: '-0.02em' }}>
            {t('home.territory_toscana')}<br />{t('home.territory_toscana_sub')}
          </h2>
          <p className="font-sans font-light mb-8 max-w-lg leading-relaxed" style={{ color: 'rgba(244,240,232,0.72)', fontSize: 17 }}>
            Ríos de agua verde esmeralda, pueblos medievales y senderos vírgenes. El Matarraña es el secreto mejor guardado de España.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/experiencias" className="btn-primary flex items-center gap-2 px-7 py-3.5 text-sm">{t('home.cta_experiences')} <ArrowRight size={16} /></Link>
            <Link to="/guias" className="btn-ghost flex items-center gap-2 px-7 py-3.5 text-sm">{t('home.cta_guides')}</Link>
          </div>
        </div>

        <div className="absolute top-8 right-8 md:top-12 md:right-12 rounded-2xl px-5 py-3.5 hidden md:block" style={{ background: 'rgba(244,240,232,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(244,240,232,0.15)' }}>
          <p className="font-sans text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--gold)' }}>Valderrobres</p>
          <p className="font-sans text-sm font-medium" style={{ color: 'var(--cream)' }}>Pueblo medieval · 40 min</p>
        </div>
      </section>

      {/* §6b — APARTMENT QUIZ */}
      <ApartmentQuiz />

      {/* ★ ECLIPSE 2026 — DRAMATIC COUNTDOWN */}
      <section
        ref={eclipseRev.ref}
        className="relative overflow-hidden grain"
        style={{ background: 'var(--ink)' }}
      >
        {/* Star field background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(1px 1px at 20% 30%, rgba(200,169,110,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 80% 10%, rgba(244,240,232,0.4) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 50% 70%, rgba(200,169,110,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 10% 60%, rgba(244,240,232,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 50%, rgba(244,240,232,0.25) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 85%, rgba(200,169,110,0.4) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 90% 40%, rgba(244,240,232,0.35) 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 15%, rgba(200,169,110,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 25%, rgba(244,240,232,0.3) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 45% 45%, rgba(200,169,110,0.3) 0%, transparent 100%)`,
        }} />
        {/* Corona glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(200,169,110,0.08) 0%, transparent 70%)' }} />

        <div
          className="relative z-10 px-8 md:px-14 lg:px-24 py-20 md:py-28 max-w-7xl mx-auto"
          style={{ opacity: eclipseRev.visible ? 1 : 0, transform: eclipseRev.visible ? 'none' : 'translateY(30px)', transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1)' }}
        >
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            {/* Left: text */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--gold)' }} />
                <span className="font-sans text-[10px] uppercase tracking-[0.35em]" style={{ color: 'var(--gold)' }}>
                  {t('eclipse.badge', 'Evento del siglo · Matarraña 2026')}
                </span>
              </div>

              <h2 className="font-display font-light leading-none mb-6" style={{ fontSize: 'clamp(40px,6vw,84px)', color: 'var(--cream)', letterSpacing: '-0.025em' }}>
                {t('eclipse.title1', 'Eclipse Solar')}
                <br />
                <em style={{ color: 'var(--gold)' }}>{t('eclipse.title2', 'Total.')}</em>
                <br />
                <span style={{ fontSize: 'clamp(22px,3vw,44px)', color: 'rgba(244,240,232,0.55)', fontStyle: 'normal' }}>12 Agosto 2026 · 20:29h</span>
              </h2>

              <p className="font-sans font-light leading-relaxed mb-6" style={{ color: 'rgba(244,240,232,0.7)', fontSize: 17, maxWidth: 480 }}>
                {t('eclipse.desc', 'El primer eclipse solar total visible en España en más de 100 años. Fuentespalda y el Matarraña están en la franja de totalidad perfecta: 1 minuto y 27 segundos de oscuridad absoluta. La misma noche: pico de las Perseidas.')}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { v: '1m 27s', l: t('eclipse.stat1', 'Totalidad') },
                  { v: '20:29h', l: t('eclipse.stat2', 'Hora local') },
                  { v: '+100', l: t('eclipse.stat3', 'Años sin igual') },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(200,169,110,0.06)', border: '1px solid rgba(200,169,110,0.14)' }}>
                    <p className="font-display font-light" style={{ fontSize: 26, color: 'var(--gold)', letterSpacing: '-0.02em' }}>{s.v}</p>
                    <p className="font-sans text-[10px] uppercase tracking-widest mt-1" style={{ color: 'rgba(244,240,232,0.4)' }}>{s.l}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/eclipse-2026" className="btn-primary flex items-center gap-2 px-7 py-3.5 text-sm" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
                  {t('eclipse.cta1', 'Ver todo sobre el eclipse')} <ArrowRight size={16} />
                </Link>
                <Link to="/disponibilidad" className="btn-ghost flex items-center gap-2 px-7 py-3.5 text-sm" style={{ borderColor: 'rgba(200,169,110,0.3)', color: 'rgba(244,240,232,0.7)' }}>
                  {t('eclipse.cta2', 'Reservar agosto 2026')}
                </Link>
              </div>
            </div>

            {/* Right: countdown */}
            <div className="flex flex-col items-center">
              <p className="font-sans text-[10px] uppercase tracking-[0.35em] mb-8" style={{ color: 'rgba(200,169,110,0.5)' }}>
                {t('eclipse.countdown_label', 'Cuenta atrás')}
              </p>
              <div className="grid grid-cols-4 gap-3 md:gap-5 w-full max-w-sm">
                {[
                  { v: eclipse.d, l: t('eclipse.days', 'Días') },
                  { v: eclipse.h, l: t('eclipse.hours', 'Horas') },
                  { v: eclipse.m, l: t('eclipse.minutes', 'Min') },
                  { v: eclipse.s, l: t('eclipse.seconds', 'Seg') },
                ].map((u, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="font-display font-light rounded-2xl flex items-center justify-center mb-2 w-full"
                      style={{
                        fontSize: 'clamp(28px,6vw,64px)',
                        letterSpacing: '-0.04em',
                        color: 'var(--gold)',
                        aspectRatio: '1',
                        background: 'rgba(200,169,110,0.06)',
                        border: '1px solid rgba(200,169,110,0.18)',
                        lineHeight: 1,
                      }}
                    >
                      {String(u.v).padStart(2, '0')}
                    </div>
                    <span className="font-sans text-[9px] uppercase tracking-[0.25em]" style={{ color: 'rgba(200,169,110,0.45)' }}>{u.l}</span>
                  </div>
                ))}
              </div>

              {/* Perseidas bonus */}
              <div className="mt-8 rounded-2xl p-5 w-full max-w-sm" style={{ background: 'rgba(200,169,110,0.04)', border: '1px solid rgba(200,169,110,0.1)' }}>
                <p className="font-sans text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(200,169,110,0.5)' }}>
                  {t('eclipse.bonus_label', 'Bonus astronómico')}
                </p>
                <p className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(244,240,232,0.6)' }}>
                  {t('eclipse.bonus_text', '✨ La misma noche: pico de las Perseidas. Eclipse total + lluvia de estrellas. Una vez en la vida.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ★ PREMIUM DESTINATIONS GRID */}
      <section ref={premiumRev.ref} className="py-24 md:py-32 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div
          className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14"
          style={{ opacity: premiumRev.visible ? 1 : 0, transform: premiumRev.visible ? 'none' : 'translateY(20px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}
        >
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--rust)' }}>
              {t('premium.label', 'Experiencias de autor')}
            </p>
            <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(34px,5vw,72px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
              {t('premium.title1', 'El Matarraña')}
              <br />
              <em style={{ color: 'var(--rust)' }}>{t('premium.title2', 'te sorprenderá.')}</em>
            </h2>
          </div>
          <p className="mt-4 md:mt-0 max-w-xs font-sans font-light leading-relaxed text-sm" style={{ color: 'var(--ink-muted)' }}>
            {t('premium.subtitle', 'Estrellas Michelin a 400 metros. La vía verde más épica de Aragón. Cielos Starlight. Y un eclipse que no volverá en 100 años.')}
          </p>
        </div>

        <div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          style={{ opacity: premiumRev.visible ? 1 : 0, transform: premiumRev.visible ? 'none' : 'translateY(30px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.15s' }}
        >
          {[
            {
              to: '/eclipse-2026',
              icon: <Moon size={20} />,
              badge: t('premium.eclipse_badge', '12 Ago 2026'),
              title: t('premium.eclipse_title', 'Eclipse Solar Total'),
              desc: t('premium.eclipse_desc', '1m 27s de oscuridad total. El primer eclipse en España en 100 años. Matarraña en la franja perfecta.'),
              color: 'var(--gold)',
              bg: 'var(--ink)',
              dark: true,
              img: 'https://images.unsplash.com/photo-1532798369041-b33eb576ef16?w=600&auto=format&fit=crop&q=80',
            },
            {
              to: '/gastronomia',
              icon: <Utensils size={20} />,
              badge: t('premium.gastro_badge', '★ Sol Repsol + Michelin'),
              title: t('premium.gastro_title', 'Alta Gastronomía'),
              desc: t('premium.gastro_desc', 'La Torre del Visco: Estrella Michelin a 400m. La Fábrica de Solfa, Baudilio: Soles Repsol 2026.'),
              color: 'var(--rust)',
              bg: '#fef7f2',
              dark: false,
              img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80',
            },
            {
              to: '/vias-verdes',
              icon: <Bike size={20} />,
              badge: t('premium.vv_badge', '137 km · Val de Zafán'),
              title: t('premium.vv_title', 'Vía Verde'),
              desc: t('premium.vv_desc', 'Antiguo ferrocarril convertido en ruta épica. Viaductos sobre el río Algars. Del Matarraña al Delta del Ebro.'),
              color: 'var(--forest)',
              bg: '#f3f7f4',
              dark: false,
              img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop&q=80',
            },
            {
              to: '/astroturismo',
              icon: <Telescope size={20} />,
              badge: t('premium.astro_badge', 'Cielos Starlight'),
              title: t('premium.astro_title', 'Turismo de Estrellas'),
              desc: t('premium.astro_desc', 'Vía Láctea visible a simple vista. Cero contaminación lumínica. Perseidas, Gemínidas, lluvias de estrellas.'),
              color: '#6366f1',
              bg: '#f5f5fe',
              dark: false,
              img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80',
            },
          ].map((card, i) => (
            <Link
              key={i}
              to={card.to}
              className="group relative rounded-[2rem] overflow-hidden block transition-all duration-500 hover:-translate-y-2"
              style={{ background: card.bg, boxShadow: '0 4px 24px rgba(28,24,18,0.08)' }}
            >
              {/* Image */}
              <div className="relative overflow-hidden" style={{ height: 200 }}>
                <img
                  src={card.img}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0" style={{ background: card.dark ? 'rgba(28,24,18,0.4)' : 'rgba(28,24,18,0.15)' }} />
                {/* Icon */}
                <div className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: card.dark ? 'rgba(200,169,110,0.2)' : 'rgba(255,255,255,0.9)', color: card.dark ? 'var(--gold)' : card.color }}>
                  {card.icon}
                </div>
                {/* Badge */}
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-block font-sans text-[9px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full" style={{ background: card.dark ? 'rgba(200,169,110,0.15)' : 'rgba(255,255,255,0.85)', color: card.dark ? 'var(--gold)' : card.color, border: `1px solid ${card.dark ? 'rgba(200,169,110,0.2)' : 'rgba(0,0,0,0.08)'}` }}>
                    {card.badge}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="font-display italic font-light mb-2" style={{ fontSize: 22, color: card.dark ? 'var(--cream)' : 'var(--ink)', letterSpacing: '-0.01em' }}>{card.title}</h3>
                <p className="font-sans font-light text-sm leading-relaxed mb-4" style={{ color: card.dark ? 'rgba(244,240,232,0.6)' : 'var(--ink-muted)' }}>{card.desc}</p>
                <div className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: card.color }}>
                  {t('cta.discoverMore', 'Descubrir')} <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ★ AGUA & AIRE — Calidad excepcional */}
      <section className="py-20 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Agua */}
          <div className="rounded-[2rem] overflow-hidden relative group" style={{ minHeight: 280 }}>
            <img
              src="https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=900&auto=format&fit=crop&q=80"
              alt="Pozas naturales río Matarraña"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(28,24,18,0.9) 0%, rgba(28,24,18,0.2) 60%, transparent 100%)' }} />
            <div className="relative z-10 h-full flex flex-col justify-end p-8">
              <div className="flex items-center gap-2 mb-3">
                <Waves size={16} style={{ color: '#60a5fa' }} />
                <span className="font-sans text-[10px] uppercase tracking-[0.3em]" style={{ color: '#60a5fa' }}>
                  {t('agua.badge', 'Calidad excelente · MITECO')}
                </span>
              </div>
              <h3 className="font-display italic font-light mb-3" style={{ fontSize: 'clamp(22px,2.8vw,36px)', color: 'var(--cream)', letterSpacing: '-0.01em' }}>
                {t('agua.title', 'Aguas cristalinas')}
              </h3>
              <p className="font-sans font-light text-sm leading-relaxed mb-5" style={{ color: 'rgba(244,240,232,0.65)', maxWidth: 400 }}>
                {t('agua.desc', 'Las pozas del río Matarraña y el río Algars están clasificadas de excelente calidad por el MITECO. Aguas kársticas de los Puertos de Beceite — National Geographic las eligió entre las mejores de España.')}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  t('agua.tag1', 'La Pesquera · 15 pozas'),
                  t('agua.tag2', 'Pantano de la Pena'),
                  t('agua.tag3', 'Azud de Lledó'),
                  t('agua.tag4', 'Río Algars · nutrias'),
                ].map((tag, i) => (
                  <span key={i} className="font-sans text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full" style={{ background: 'rgba(96,165,250,0.12)', color: 'rgba(147,197,253,0.8)', border: '1px solid rgba(96,165,250,0.2)' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Aire */}
          <div className="rounded-[2rem] overflow-hidden relative group" style={{ minHeight: 280 }}>
            <img
              src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&auto=format&fit=crop&q=80"
              alt="Bosques Puertos de Beceite"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,50,20,0.92) 0%, rgba(10,50,20,0.25) 60%, transparent 100%)' }} />
            <div className="relative z-10 h-full flex flex-col justify-end p-8">
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: '#4ade80', fontSize: 16 }}>🌿</span>
                <span className="font-sans text-[10px] uppercase tracking-[0.3em]" style={{ color: '#4ade80' }}>
                  {t('aire.badge', 'AQI Excelente · Reserva Biosfera')}
                </span>
              </div>
              <h3 className="font-display italic font-light mb-3" style={{ fontSize: 'clamp(22px,2.8vw,36px)', color: 'var(--cream)', letterSpacing: '-0.01em' }}>
                {t('aire.title', 'Aire puro certificado')}
              </h3>
              <p className="font-sans font-light text-sm leading-relaxed mb-5" style={{ color: 'rgba(244,240,232,0.65)', maxWidth: 400 }}>
                {t('aire.desc', 'Fuentespalda está en Reserva de la Biosfera (UNESCO). Sin industria en 50km. Vientos limpios del Mediterráneo. Los pinos centenarios de los Puertos purifican el aire naturalmente. A 740m de altitud.')}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  t('aire.tag1', 'UNESCO · Biosfera'),
                  t('aire.tag2', '740m altitud'),
                  t('aire.tag3', '0 industria'),
                  t('aire.tag4', 'Apto respiratorio'),
                ].map((tag, i) => (
                  <span key={i} className="font-sans text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: 'rgba(134,239,172,0.8)', border: '1px solid rgba(74,222,128,0.2)' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* §7 — PHOTO STRIP */}
      <section className="py-20" style={{ background: 'var(--ink)' }}>
        <div className="px-8 md:px-14 mb-10 flex justify-between items-end">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-3" style={{ color: 'var(--gold)' }}>{t('home.gallery_label')}</p>
            <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(26px,3.5vw,52px)', color: 'var(--cream)', letterSpacing: '-0.015em' }}>{t('home.gallery_title_1')}<br />{t('home.gallery_title_2')}</h2>
          </div>
          <Link to="/experiencias" className="hidden md:flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] hover-line" style={{ color: 'rgba(244,240,232,0.4)' }}>
            Ver experiencias <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="flex gap-4 pl-8 md:pl-14 overflow-x-auto pb-2 no-scrollbar" style={{ cursor: 'grab' }}>
          {galleryImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightboxIndex(i)}
              className="flex-none rounded-2xl overflow-hidden relative group"
              style={{ width: 'clamp(240px,26vw,360px)', height: 'clamp(300px,34vw,460px)', opacity: 0, animation: `fadeIn 0.7s ease ${i * 0.1}s forwards` }}
            >
              <img src={img.src} alt={img.caption} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'rgba(28,24,18,0.35)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(244,240,232,0.15)', backdropFilter: 'blur(8px)' }}>
                  <Play size={20} style={{ color: 'var(--cream)', marginLeft: 2 }} fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(28,24,18,0.8), transparent)' }}>
                <p className="font-sans text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--gold)' }}>{img.location}</p>
                <p className="font-display italic text-sm" style={{ color: 'var(--cream)' }}>{img.caption}</p>
              </div>
            </button>
          ))}
          <div className="flex-none w-8 md:w-14" />
        </div>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <PhotoLightbox
            images={galleryImages}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex(i => i !== null ? (i - 1 + galleryImages.length) % galleryImages.length : 0)}
            onNext={() => setLightboxIndex(i => i !== null ? (i + 1) % galleryImages.length : 0)}
          />
        )}
      </section>

      {/* §8 — EXPERIENCES */}
      <section className="py-24 md:py-32 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--rust)' }}>{t('home.activities_label')}</p>
            <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5.5vw,78px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>{t('home.activities_title_1')}<br />{t('home.activities_title_2')}</h2>
          </div>
          <Link to="/experiencias" className="mt-6 md:mt-0 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] hover-line" style={{ color: 'var(--ink-light)' }}>
            Todas las experiencias <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {EXPERIENCES.filter(e => e.featured).slice(0, 3).map((exp) => (
            <Link key={exp.slug} to={`/experiencias/${exp.slug}`} className="group block relative rounded-[2rem] overflow-hidden" style={{ aspectRatio: '3/4' }}>
              <img src={exp.photos[0]} alt={exp.title} className="w-full h-full object-cover" style={{ transition: 'transform 0.85s cubic-bezier(0.16,1,0.3,1)' }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.07)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(28,24,18,0.92) 0%, rgba(28,24,18,0.1) 55%, transparent 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-7">
                <span className="inline-block font-sans text-[9px] uppercase tracking-[0.28em] px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(200,169,110,0.15)', color: 'var(--gold)', border: '1px solid rgba(200,169,110,0.25)' }}>
                  {exp.category.replace(/_/g, ' ')}
                </span>
                <h3 className="font-display italic font-light mb-2" style={{ fontSize: 'clamp(20px,2.4vw,28px)', color: 'var(--cream)', letterSpacing: '-0.01em' }}>{exp.title}</h3>
                <p className="font-sans font-light text-sm clamp-2 opacity-0 group-hover:opacity-100 leading-relaxed" style={{ color: 'rgba(244,240,232,0.65)', transition: 'opacity 0.4s ease' }}>{exp.shortSummary}</p>
              </div>
              <div className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100" style={{ background: 'rgba(244,240,232,0.12)', backdropFilter: 'blur(8px)', transition: 'opacity 0.3s ease' }}>
                <ArrowUpRight size={16} style={{ color: 'var(--cream)' }} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* §9 — NARRATIVE — Un día perfecto */}
      <NarrativeSection />

      {/* §10 — REVERSE MARQUEE */}
      <div className="overflow-hidden py-5 border-y" style={{ background: 'var(--cream-dark)', borderColor: 'rgba(200,169,110,0.25)' }}>
        <div className="flex animate-marquee-r whitespace-nowrap" aria-hidden="true">
          {[...TICKER_ITEMS.slice(6), ...TICKER_ITEMS, ...TICKER_ITEMS.slice(0, 6)].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-5 mx-5">
              <span className="font-display italic text-sm" style={{ color: 'rgba(28,24,18,0.35)', fontWeight: 300 }}>{item}</span>
              <span style={{ color: 'var(--gold)', fontSize: 7 }}>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* §10 — REVIEWS */}
      <section ref={reviewsRev.ref} className="py-24 md:py-32 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-14 lg:gap-24 items-start">

          {/* Left: rotating big quote */}
          <div style={{ opacity: reviewsRev.visible ? 1 : 0, transform: reviewsRev.visible ? 'none' : 'translateX(-28px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--rust)' }}>{t('home.reviews_label')}</p>
            <div className="font-display italic leading-none select-none mb-6" style={{ fontSize: 'clamp(72px,11vw,128px)', color: 'var(--gold)', opacity: 0.22, lineHeight: 0.7 }}>"</div>

            {highlightedReviews[activeReview] && (
              <div key={activeReview} style={{ animation: 'fadeIn 0.7s ease', minHeight: 200 }}>
                <p className="font-display italic font-light leading-snug mb-8" style={{ fontSize: 'clamp(18px,2.4vw,28px)', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  {highlightedReviews[activeReview].text}
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-display italic text-lg shrink-0" style={{ background: 'var(--rust)', color: 'var(--cream)' }}>
                    {highlightedReviews[activeReview].author[0]}
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm" style={{ color: 'var(--ink)' }}>{highlightedReviews[activeReview].author}</p>
                    <p className="font-sans text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {highlightedReviews[activeReview].platform === 'booking' ? 'Booking.com' : highlightedReviews[activeReview].platform === 'google' ? 'Google Reviews' : 'Directo'}
                      {' · '}{new Date(highlightedReviews[activeReview].date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array(5).fill(0).map((_, i) => <Star key={i} size={13} fill="var(--gold)" style={{ color: 'var(--gold)' }} />)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-8">
              {highlightedReviews.map((_, i) => (
                <button key={i} onClick={() => setActiveReview(i)} className="rounded-full transition-all duration-300" style={{ width: i === activeReview ? 24 : 8, height: 8, background: i === activeReview ? 'var(--rust)' : 'var(--cream-dark)', border: `1.5px solid ${i === activeReview ? 'var(--rust)' : 'var(--gold)'}` }} />
              ))}
            </div>
          </div>

          {/* Right: stacked cards */}
          <div className="space-y-3 hidden md:block" style={{ opacity: reviewsRev.visible ? 1 : 0, transform: reviewsRev.visible ? 'none' : 'translateY(36px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.2s' }}>
            {highlightedReviews.map((review, i) => (
              <div key={review.id} onClick={() => setActiveReview(i)} className="rounded-2xl p-5 cursor-pointer transition-all duration-300" style={{ background: i === activeReview ? 'var(--cream-dark)' : 'transparent', borderLeft: `2px solid ${i === activeReview ? 'var(--rust)' : 'var(--gold)'}`, paddingLeft: 20, opacity: i === activeReview ? 1 : 0.45 }}>
                <div className="flex justify-between mb-2">
                  <span className="font-sans font-semibold text-sm" style={{ color: 'var(--ink)' }}>{review.author}</span>
                  <span className="font-sans text-xs" style={{ color: 'var(--rust)' }}>{review.rating}/10</span>
                </div>
                <p className="font-sans text-sm clamp-2 font-light" style={{ color: 'var(--ink-muted)' }}>{review.text}</p>
              </div>
            ))}
            <div className="pt-4 flex flex-col gap-2">
              <a href={BRAND.contact.booking} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] hover-line" style={{ color: 'var(--rust)' }}>
                {t('reviews.booking', 'Todas las reseñas en Booking')} <ArrowUpRight size={14} />
              </a>
              <a href="https://www.google.com/maps/search/El+Rinconcito+Matarranya+Fuentespalda" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] hover-line" style={{ color: 'var(--ink-muted)' }}>
                {t('reviews.google', 'Reseñas en Google')} <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* §11 — COMING SOON */}
      {comingSoon.length > 0 && (
        <section className="py-24 relative overflow-hidden grain" style={{ background: 'var(--forest)' }}>
          <div className="absolute inset-0 topo-bg opacity-15 pointer-events-none" />
          <div className="relative z-10 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              <div className="md:flex-1">
                <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('common.coming_soon_short')}</p>
                <h2 className="font-display italic font-light leading-none mb-6" style={{ fontSize: 'clamp(44px,6.5vw,92px)', color: 'var(--cream)', letterSpacing: '-0.025em' }}>
                  Mas<br /><span style={{ color: 'var(--gold)' }}>Matarraña</span>
                </h2>
                <p className="font-sans font-light leading-relaxed mb-8 max-w-sm" style={{ color: 'rgba(244,240,232,0.62)', fontSize: 17 }}>
                  Un nuevo concepto en Valjunquera. Dos refugios gemelos fundidos con el paisaje de olivos centenarios. Cargador de coche eléctrico gratuito incluido. En 2026.
                </p>
                <Link to="/proximamente" className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-sm" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
                  Unirse a la lista de espera <ArrowRight size={16} />
                </Link>
              </div>
              <div className="md:flex-1 grid grid-cols-2 gap-4">
                {comingSoon.slice(0, 2).map((apt) => (
                  <div key={apt.id} className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: '3/4', background: 'rgba(244,240,232,0.04)', border: '1px solid rgba(244,240,232,0.08)' }}>
                    <div className="absolute inset-0 flex flex-col justify-end p-5">
                      <p className="font-sans text-[9px] uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--gold)' }}>{t('common.coming_soon_short')}</p>
                      <p className="font-display italic font-light text-lg" style={{ color: 'var(--cream)' }}>{apt.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* §12 — TERRITORY MAP */}
      <TerritoryMap />

      {/* §13 — RENTIKPRO */}
      <RentikProSection />

      {/* §13 — CONTACT */}
      <section ref={contactRev.ref} className="py-24 md:py-32 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center" style={{ opacity: contactRev.visible ? 1 : 0, transform: contactRev.visible ? 'none' : 'translateY(30px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--rust)' }}>{t('contact.title', 'Contacto directo')}</p>
            <h2 className="font-display italic font-light leading-none mb-6" style={{ fontSize: 'clamp(38px,5.5vw,76px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
              {t('contact.header_title', 'Hablamos')}<br /><span style={{ color: 'var(--rust)' }}>{t('home.contact_sub', 'de tu escapada.')}</span>
            </h2>
            <p className="font-sans font-light mb-10 leading-relaxed" style={{ color: 'var(--ink-muted)', fontSize: 17 }}>
              {t('home.contact_desc', 'Toni y Evelyn responden personalmente. Sin robots, sin formularios. Cuéntanos qué buscas y lo organizamos juntos.')}
            </p>

            <div className="space-y-3">
              {[
                { href: BRAND.contact.whatsapp, bg: '#25D366', icon: <MessageSquare size={17} color="#fff" />, label: 'WhatsApp directo', sub: BRAND.contact.phone, external: true },
                { href: BRAND.contact.booking, bg: '#003580', icon: <span className="font-sans font-bold text-[10px] text-white">B.</span>, label: 'Reservar en Booking.com', sub: '10/10 · Puntuación verificada', external: true },
              ].map((item, i) => (
                <a key={i} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-4 rounded-2xl px-5 py-4 group transition-all duration-300"
                  style={{ background: 'var(--cream-dark)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream-dark)')}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: item.bg }}>{item.icon}</div>
                  <div className="flex-1">
                    <p className="font-sans font-semibold text-sm" style={{ color: 'var(--ink)' }}>{item.label}</p>
                    <p className="font-sans text-xs" style={{ color: 'var(--ink-muted)' }}>{item.sub}</p>
                  </div>
                  <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--rust)' }} />
                </a>
              ))}
              <button onClick={openChat} className="flex items-center gap-4 rounded-2xl px-5 py-4 w-full text-left group transition-all duration-300" style={{ background: 'var(--cream-dark)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--ink)' }}>
                  <Moon size={16} style={{ color: 'var(--gold)' }} />
                </div>
                <div className="flex-1">
                  <p className="font-sans font-semibold text-sm" style={{ color: 'var(--ink)' }}>{t('home.chat_label', 'Asistente IA · 24/7')}</p>
                  <p className="font-sans text-xs" style={{ color: 'var(--ink-muted)' }}>{t('home.chat_sub', 'Disponibilidad, actividades, recomendaciones')}</p>
                </div>
                <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--rust)' }} />
              </button>
            </div>

            {/* Social media */}
            <div className="flex items-center gap-4 mt-6 pt-5" style={{ borderTop: '1px solid var(--cream-dark)' }}>
              <span className="font-sans text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--ink-muted)' }}>{t('home.follow', 'Síguenos')}</span>
              {[
                { href: 'https://www.instagram.com/elrinconcitomatarranya/', label: 'Instagram', icon: '📸' },
                { href: BRAND.contact.booking, label: 'Booking.com', icon: '🏨' },
                { href: `https://api.whatsapp.com/send?phone=${BRAND.contact.phone?.replace(/\D/g, '')}`, label: 'WhatsApp', icon: '💬' },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-sans text-xs font-medium hover-line transition-colors"
                  style={{ color: 'var(--ink-light)' }}
                >
                  <span>{s.icon}</span> {s.label}
                </a>
              ))}
            </div>
          </div>

          <div className="relative hidden md:block rounded-[2.5rem] overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <img src={CDN.bano} alt="Zona de baño natural · Matarraña" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl px-5 py-4" style={{ background: 'rgba(28,24,18,0.72)', backdropFilter: 'blur(16px)' }}>
              <p className="font-sans text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: 'var(--gold)' }}>{t('home.bano_place')}</p>
              <p className="font-display italic font-light text-xl" style={{ color: 'var(--cream)' }}>{t('home.bano_desc')}</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
