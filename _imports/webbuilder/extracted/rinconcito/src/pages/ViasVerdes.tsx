import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Clock, MapPin, Mountain, Bike, Users, ChevronRight } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { useTranslation } from 'react-i18next';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

const TRAMOS = [
  {
    name: 'Tramo Matarraña',
    km: '22 km',
    difficulty: 'Fácil',
    time: '2–3h',
    from: 'Horta de Sant Joan',
    to: 'Torre del Compte',
    highlights: ['Viaducto sobre el río Algars (vía Aragón–Cataluña)', 'Estación de Cretas (albergue)', 'Olivares y almendros centenarios', 'Pozas de baño en el río'],
    description: 'El tramo más espectacular de toda la ruta. Sale de Horta de Sant Joan cruzando el viaducto sobre el río Algars (frontera Aragón–Cataluña) y llega a Torre del Compte pasando por los olivares históricos de la comarca.',
    featured: true,
    image: 'https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=900&auto=format&fit=crop',
  },
  {
    name: 'Tramo Terra Alta (completo Matarraña)',
    km: '40 km',
    difficulty: 'Fácil',
    time: '4–5h',
    from: 'Valdealgorfa',
    to: 'Horta de Sant Joan',
    highlights: ['Túnel del Equinoccio (2,4 km sin luz)', 'Estación mudéjar de Valdealgorfa', 'Pinturas rupestres cercanas', 'Viaducto sobre el río Matarraña'],
    description: 'El tramo aragonés de la Vía Verde pasa por municipios con encanto: Valjunquera, Valdeltormo, Torre del Compte, Valderrobres y Cretas. Túneles, viaductos y el río Matarraña como protagonista.',
    featured: false,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&auto=format&fit=crop',
  },
  {
    name: 'Ruta Express (Cretas–Torre del Compte)',
    km: '8,8 km',
    difficulty: 'Muy fácil',
    time: '1h',
    from: 'Cretas',
    to: 'Torre del Compte',
    highlights: ['Pinar en la segunda mitad', 'Perfecta para familias con niños', 'Pozas de baño al final', 'Transfer disponible'],
    description: 'La opción perfecta para familias o quienes quieran un primer contacto con la Vía Verde. Sin grandes desniveles, pinar y vistas panorámicas. Ideal como primera actividad del día.',
    featured: false,
    image: 'https://images.unsplash.com/photo-1476611338391-6f395a0dd82e?w=900&auto=format&fit=crop',
  },
  {
    name: 'Ruta Completa (Aragonesa + Delta)',
    km: '135 km',
    difficulty: 'Moderada',
    time: '2–3 días',
    from: 'Valdealgorfa',
    to: 'Tortosa',
    highlights: ['28 túneles históricos', 'Puertos de Beceite', 'Delta del Ebro como final', 'De montaña al mar'],
    description: 'La aventura completa: del corazón del Matarraña hasta la desembocadura del Ebro. Una de las vías verdes más largas de España. Se puede hacer por etapas con los servicios de Matarraña Aventura.',
    featured: false,
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=900&auto=format&fit=crop',
  },
];

const PRACTICAL_INFO = [
  {
    icon: <Bike size={20} />,
    title: 'Alquiler de bicicletas',
    info: 'Matarraña Aventura (Cretas) · Alquiler + transfer + recogida. Precio desde 15€/día. Bici de montaña, trekking y eléctrica.',
    contact: 'matarranyaaventura.com',
  },
  {
    icon: <Mountain size={20} />,
    title: 'Transfer (remonte)',
    info: 'Service de recogida de personas y bicicletas al final de la ruta. No hace falta hacer ida y vuelta por el mismo sitio.',
    contact: 'Incluido en packs de alquiler',
  },
  {
    icon: <MapPin size={20} />,
    title: 'Punto de agua y descanso',
    info: 'Torre del Compte y Cretas tienen agua potable. Las estaciones rehabilitadas tienen zona de descanso y aparcamiento.',
    contact: 'Estaciones habilitadas',
  },
  {
    icon: <Users size={20} />,
    title: 'Para todos',
    info: 'Trazado accesible en asfalto, señalizado y con barandillas en zonas de altura. Sin límite de edad ni capacidad física.',
    contact: 'Accesibilidad universal',
  },
];

const CDN_VIA = 'https://images.unsplash.com/photo-1476611338391-6f395a0dd82e?w=1400&auto=format&fit=crop';

export default function ViasVerdes() {
  const { t: tl } = useTranslation();
  useSEO({
    title: tl('viasverdes.seo_title', 'Vía Verde Val de Zafán — La más bonita de España | El Rinconcito Matarraña'),
    description: tl('viasverdes.seo_desc', 'La Vía Verde Val de Zafán pasa por el Matarraña: 135 km, viaductos, túneles y pozas de baño. Base perfecta: El Rinconcito en Fuentespalda. Alquiler de bici a 10 min.'),
  });

  const h = useReveal();
  const t = useReveal();
  const p = useReveal();

  return (
    <div style={{ background: 'var(--cream)', color: 'var(--ink)' }}>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ height: 'clamp(500px,70vw,780px)' }}>
        <img src={CDN_VIA} alt="Vía Verde Val de Zafán - Matarraña en bicicleta" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(28,24,18,0.9) 0%, rgba(28,24,18,0.45) 55%, rgba(28,24,18,0.15) 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: 'linear-gradient(to top, var(--cream), transparent)' }} />

        <div ref={h.ref} className="absolute inset-0 flex flex-col justify-end px-8 md:px-14 lg:px-24 pb-16" style={{ opacity: h.vis ? 1 : 0, transform: h.vis ? 'none' : 'translateY(24px)', transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1)' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('vv_page.cycle_label')}</p>
          <h1 className="font-display italic font-light leading-none mb-6" style={{ fontSize: 'clamp(44px,7.5vw,106px)', letterSpacing: '-0.03em', color: 'var(--cream)' }}>
            Vía Verde<br /><span style={{ color: 'var(--gold)' }}>{t('vv_page.title_italic')}</span>
          </h1>
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <Bike size={15} style={{ color: 'var(--gold)' }} />
              <span className="font-sans text-sm" style={{ color: 'rgba(244,240,232,0.7)' }}>135 km de ruta</span>
            </div>
            <div className="flex items-center gap-2">
              <Mountain size={15} style={{ color: 'var(--gold)' }} />
              <span className="font-sans text-sm" style={{ color: 'rgba(244,240,232,0.7)' }}>{t('vv_page.easy_route')}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={15} style={{ color: 'var(--gold)' }} />
              <span className="font-sans text-sm" style={{ color: 'rgba(244,240,232,0.7)' }}>{t('vv_page.base_location')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO TEXT */}
      <section className="py-20 md:py-28 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--rust)' }}>{t('vv_page.one_of_best')}</p>
            <h2 className="font-display italic font-light leading-none mb-8" style={{ fontSize: 'clamp(36px,5vw,66px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
              {t('vv_page.hero_tagline_1')}<br />{t('vv_page.hero_tagline_2')}
            </h2>
            <p className="font-sans font-light leading-relaxed mb-6" style={{ color: 'var(--ink-muted)', fontSize: 17 }}>
              La Vía Verde Val de Zafán sigue el antiguo trazado del ferrocarril del Bajo Aragón. Inaugurado en el año 2000, con 135 km de recorrido, es una de las vías verdes más largas de España y conecta el interior de Aragón con el Delta del Ebro.
            </p>
            <p className="font-sans font-light leading-relaxed mb-8" style={{ color: 'var(--ink-muted)', fontSize: 17 }}>
              Los municipios del Matarraña que atraviesa son: Valjunquera, Valdeltormo, Torre del Compte, Valderrobres, Cretas y Lledó. Desde El Rinconcito, tienes acceso en 15 minutos en coche a cualquier punto de entrada.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://xn--matarraaventura-4qb.com" target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2 px-6 py-3.5 text-sm">
                Alquilar bicicleta <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { num: '135', label: 'kilómetros', sub: 'una de las más largas de España' },
              { num: '28', label: 'túneles', sub: 'algunos con magia del equinoccio' },
              { num: '2', label: 'viaductos', sub: 'sobre ríos Algars y Matarraña' },
              { num: '0€', label: 'acceso', sub: 'gratuito los 365 días del año' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: i % 2 === 1 ? 'var(--ink)' : 'var(--cream-dark)' }}>
                <p className="font-display font-light leading-none mb-1" style={{ fontSize: 'clamp(28px,4vw,48px)', color: i % 2 === 1 ? 'var(--gold)' : 'var(--rust)', letterSpacing: '-0.025em' }}>{s.num}</p>
                <p className="font-sans font-semibold text-xs mb-0.5" style={{ color: i % 2 === 1 ? 'var(--cream)' : 'var(--ink)' }}>{s.label}</p>
                <p className="font-sans text-xs" style={{ color: i % 2 === 1 ? 'rgba(244,240,232,0.4)' : 'var(--ink-muted)' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAMOS */}
      <section ref={t.ref} className="py-16 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-14" style={{ opacity: t.vis ? 1 : 0, transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--rust)' }}>{t('vv_page.choose_adventure')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5vw,72px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
            Tramos y rutas.
          </h2>
        </div>

        <div className="grid gap-5">
          {TRAMOS.map((tramo, i) => (
            <div
              key={i}
              className="grid lg:grid-cols-5 rounded-2xl overflow-hidden border"
              style={{
                borderColor: tramo.featured ? 'var(--rust)' : 'rgba(28,24,18,0.07)',
                opacity: t.vis ? 1 : 0,
                transform: t.vis ? 'none' : 'translateY(20px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s`,
              }}
            >
              <div className="lg:col-span-2 relative" style={{ minHeight: 200 }}>
                <img src={tramo.image} alt={tramo.name} className="w-full h-full object-cover" style={{ minHeight: 200 }} />
                {tramo.featured && (
                  <div className="absolute top-4 left-4 font-sans text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full font-semibold" style={{ background: 'var(--rust)', color: 'var(--cream)' }}>
                    Recomendado
                  </div>
                )}
              </div>
              <div className="lg:col-span-3 p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h3 className="font-display italic font-light" style={{ fontSize: 24, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{tramo.name}</h3>
                    <span className="font-sans text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded-full" style={{ background: tramo.difficulty === 'Muy fácil' ? '#EEF7EE' : tramo.difficulty === 'Fácil' ? '#FFF8EE' : '#FFF0EE', color: tramo.difficulty === 'Muy fácil' ? '#2E7D32' : tramo.difficulty === 'Fácil' ? '#E65100' : '#C62828' }}>
                      {tramo.difficulty}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-5 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Bike size={13} style={{ color: 'var(--rust)' }} />
                      <span className="font-sans text-sm" style={{ color: 'var(--ink-muted)' }}>{tramo.km}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} style={{ color: 'var(--rust)' }} />
                      <span className="font-sans text-sm" style={{ color: 'var(--ink-muted)' }}>{tramo.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} style={{ color: 'var(--rust)' }} />
                      <span className="font-sans text-sm" style={{ color: 'var(--ink-muted)' }}>{tramo.from} → {tramo.to}</span>
                    </div>
                  </div>
                  <p className="font-sans font-light text-sm leading-relaxed mb-4" style={{ color: 'var(--ink-muted)' }}>{tramo.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {tramo.highlights.map((h, j) => (
                      <span key={j} className="flex items-center gap-1 font-sans text-xs" style={{ color: 'var(--ink-light)' }}>
                        <ChevronRight size={11} style={{ color: 'var(--gold)' }} /> {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRACTICAL INFO */}
      <section ref={p.ref} className="py-20 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-14" style={{ opacity: p.vis ? 1 : 0, transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--rust)' }}>{t('vv_page.practical_info')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5vw,66px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
            Todo lo que necesitas<br /><span style={{ color: 'var(--rust)' }}>para pedalear.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRACTICAL_INFO.map((info, i) => (
            <div
              key={i}
              className="rounded-2xl p-5"
              style={{
                background: 'var(--cream-dark)',
                opacity: p.vis ? 1 : 0,
                transform: p.vis ? 'none' : 'translateY(20px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.09}s`,
              }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(155,79,46,0.1)', color: 'var(--rust)' }}>
                {info.icon}
              </div>
              <h3 className="font-sans font-semibold text-sm mb-2" style={{ color: 'var(--ink)' }}>{info.title}</h3>
              <p className="font-sans font-light text-sm leading-relaxed mb-2" style={{ color: 'var(--ink-muted)' }}>{info.info}</p>
              <p className="font-sans text-xs" style={{ color: 'var(--rust)' }}>{info.contact}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 md:px-14 text-center" style={{ background: 'var(--ink)' }}>
        <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('vv_page.plan_route')}</p>
        <h2 className="font-display italic font-light mb-6" style={{ fontSize: 'clamp(32px,5vw,66px)', color: 'var(--cream)', letterSpacing: '-0.025em' }}>
          Toni te manda el mapa<br />y los mejores puntos de parada.
        </h2>
        <Link to="/contacto" className="btn-primary inline-flex items-center gap-2 px-8 py-4" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
          Preguntar por WhatsApp <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
