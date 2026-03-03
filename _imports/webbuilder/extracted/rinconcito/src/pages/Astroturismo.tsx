import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Moon, Star, Eye, Clock, MapPin, Calendar, Zap } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../content/brand';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

const METEOR_SHOWERS = [
  { name: 'Cuadrántidas', peak: '3–4 enero', rate: '100/hora', desc: 'La mejor lluvia de enero. Radiante en Boyero. Noche fría pero sin rival en la primera semana del año.', icon: '⚡' },
  { name: 'Perseidas', peak: '11–13 agosto', rate: '100+/hora', desc: 'La más famosa: "Lágrimas de San Lorenzo". En 2026 el pico coincide con el eclipse total del 12 agosto. Noche histórica.', icon: '🌟', highlighted: true },
  { name: 'Oriónidas', peak: '20–22 octubre', rate: '20/hora', desc: 'Restos del cometa Halley. Meteoros rápidos y brillantes. Las hojas otoñales del Matarraña añaden magia.', icon: '🍂' },
  { name: 'Leónidas', peak: '17–18 noviembre', rate: '15/hora', desc: 'Famosas por sus tormentas de meteoros históricas. Rápidas y con trazas luminosas de larga duración.', icon: '🦁' },
  { name: 'Gemínidas', peak: '13–14 diciembre', rate: '120/hora', desc: 'LA MEJOR del año en número de meteoros. Procede del asteroide Faetón. Visibles incluso antes de medianoche.', icon: '👑', highlighted: true },
  { name: 'Ursidas', peak: '22–23 diciembre', rate: '10/hora', desc: 'Pocas pero constantes. Perfectas para Nochebuena bajo las estrellas del Matarraña.', icon: '🐻' },
];

const ECLIPSES_2026 = [
  {
    date: '12 agosto 2026', time: '20:29h', type: 'ECLIPSE SOLAR TOTAL',
    duration: '~1m 34s en Teruel (hasta 1m 50s en línea central)',
    visibility: 'Fuentespalda está en la franja de totalidad',
    note: 'El primer eclipse solar total en España peninsular desde 1912. 290 km de ancho en España.',
    color: '#E8272C', icon: '⚫', featured: true,
  },
  {
    date: '28 agosto 2026', time: '21:14h', type: 'ECLIPSE PARCIAL DE LUNA',
    duration: '~70 minutos de parcialidad',
    visibility: 'Visible toda España — perfectamente desde el Matarraña',
    note: 'Solo 16 días después del eclipse total de Sol. Verano de dos eclipses.',
    color: '#E8820C', icon: '🌕', featured: false,
  },
  {
    date: '6 febrero 2027', type: 'ECLIPSE ANULAR DE SOL',
    duration: 'Anillo de fuego visible desde el sur de España',
    visibility: 'Parcial desde el Matarraña (~80% de cobertura)',
    note: 'Tres eclipses en 18 meses. El Matarraña, base perfecta para todos.',
    color: '#C8A96E', icon: '🔴', featured: false,
  },
];

const NIGHT_ROUTES = [
  {
    name: 'Ruta de la Vía Láctea',
    time: '22:00 — 00:30',
    km: '2.5 km',
    difficulty: 'Fácil',
    description: 'Desde el Rinconcito hasta el mirador de la Ermita de San Roque. Sin luz artificial. La Vía Láctea completa en verano. Se ven: Andrómeda, las Pléyades, el Escorpión entero.',
    items: ['Linterna roja (preserva la visión nocturna)', 'Manta o silla baja', 'App de cielo (Star Walk 2)', '20 min de adaptación ocular'],
    image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&auto=format&fit=crop',
  },
  {
    name: 'Ruta Torre dels Moros',
    time: '21:30 — 00:00',
    km: '8 km (en coche + 500m a pie)',
    difficulty: 'Fácil',
    description: 'Peñarroya de Tastavins, 8km. Torre medieval del siglo XIV + horizonte de 360° sin obstáculos. Mejor para el eclipse 2026 (horizonte oeste perfecto) y para fotografía de Vía Láctea.',
    items: ['Mejor punto de eclipse 2026', 'Horizonte 360° despejado', 'Historia medieval + cielo oscuro', 'Parking junto a la torre'],
    image: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=800&auto=format&fit=crop',
  },
  {
    name: 'Parrizal Nocturno',
    time: '22:00 — 00:00',
    km: '4 km ida y vuelta',
    difficulty: 'Moderada',
    description: 'Solo con luna llena. Las hoces del río Matarraña iluminadas por la luna. Luciérnagas en junio. El sonido del agua en la oscuridad. Una experiencia sensorial única en España.',
    items: ['Solo en luna llena (consultar calendario)', 'Linterna frontal esencial', 'Calzado impermeable', 'Luciérnagas: junio–julio'],
    image: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=800&auto=format&fit=crop',
  },
  {
    name: 'Valderrobres Medieval by Night',
    time: '21:00 — 23:00',
    km: '18 km desde Fuentespalda',
    difficulty: 'Muy fácil',
    description: 'El castillo gótico del siglo XIV iluminado bajo las estrellas. La plaza mayor vacía. El puente medieval y el río. Valderrobres es mejor ciudad por la noche que de día.',
    items: ['Castillo iluminado gratis', 'Bares hasta medianoche', 'Fotos épicas del castillo', 'Helado en Pastelería Leal'],
    image: 'https://images.unsplash.com/photo-1548263594-a71ea65a8598?w=800&auto=format&fit=crop',
  },
];

const WHAT_TO_SEE = [
  { obj: 'Vía Láctea completa', months: 'Mayo – Octubre', type: 'Galaxia', desc: 'El arco completo de nuestra galaxia, de horizonte a horizonte. Sin telescopio.' },
  { obj: 'Galaxia de Andrómeda (M31)', months: 'Ago – Nov', type: 'Galaxia', desc: 'A 2,5 millones de años luz. Visible a simple vista como mancha borrosa en Andrómeda.' },
  { obj: 'Cúmulo de las Pléyades', months: 'Todo el año', type: 'Cúmulo', desc: 'Las "Siete Cabrillas". A simple vista se ven 6–7, con prismáticos más de 100 estrellas.' },
  { obj: 'Nebulosa de Orión (M42)', months: 'Nov – Marzo', type: 'Nebulosa', desc: 'La guardería de estrellas más cercana. Visible a simple vista, espectacular con prismáticos.' },
  { obj: 'Cúmulo de Hércules (M13)', months: 'Abr – Sep', type: 'Cúmulo', desc: '300.000 estrellas en una esfera de 145 años luz. Prismáticos recomendados.' },
  { obj: 'Saturno con sus anillos', months: 'Mayo – Oct', type: 'Planeta', desc: 'Con un telescopio básico de 60mm ya se ven los anillos. Espectacular para niños.' },
  { obj: 'Escorpión completo', months: 'Junio – Agosto', type: 'Constelación', desc: 'En latitudes mediterráneas rara vez se ve entero. Desde el Matarraña sí. Con Antares rojo en el corazón.' },
  { obj: 'ISS (Estación Espacial)', months: 'Todo el año', type: 'Satélite', desc: 'Pasa cada 90 min. Brilla más que Venus. App ISS Detector para horarios exactos.' },
];

const BEST_APPS = [
  { name: 'Star Walk 2', platform: 'iOS / Android', desc: 'La mejor app de astronomía para principiantes. Apunta el móvil al cielo y ve qué es cada punto.', free: true },
  { name: 'ISS Detector', platform: 'iOS / Android', desc: 'Notificaciones cuando la Estación Espacial Internacional pase sobre el Matarraña.', free: true },
  { name: 'Clear Outside', platform: 'iOS / Android', desc: 'Previsión del cielo para astrónomos. Muestra nubes, humedad y transparencia atmosférica.', free: true },
  { name: 'Sky Map', platform: 'Android', desc: 'De Google. Realidad aumentada para identificar estrellas, planetas y constelaciones.', free: true },
];

export default function Astroturismo() {
  const { t } = useTranslation();
  useSEO({
    title: 'Astroturismo en el Matarraña — Eclipse 2026, Vía Láctea, Perseidas | El Rinconcito',
    description: 'Eclipse solar total 12 agosto 2026 visible desde Fuentespalda. Cielos entre los más oscuros de España. Vía Láctea, Perseidas, Gemínidas y rutas nocturnas mágicas. Base: El Rinconcito.',
  });

  const h = useReveal();
  const ec = useReveal();
  const sh = useReveal();
  const rt = useReveal();
  const wt = useReveal();

  return (
    <div style={{ background: '#080612', color: 'var(--cream)' }} className="overflow-x-hidden">

      {/* HERO STARFIELD */}
      <section className="relative overflow-hidden grain" style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Animated stars */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 150 }).map((_, i) => {
            const size = Math.random() > 0.88 ? 2.5 : Math.random() > 0.7 ? 1.5 : 1;
            return (
              <div key={i} className="absolute rounded-full" style={{
                width: size, height: size,
                background: `rgba(255,255,255,${Math.random()*0.7+0.2})`,
                left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
                animation: `starPulse ${2+Math.random()*5}s ease-in-out ${Math.random()*4}s infinite`,
              }} />
            );
          })}
        </div>
        <style>{`@keyframes starPulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}`}</style>

        {/* Milky Way arc (subtle gradient) */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 30% at 50% 50%, rgba(150,130,200,0.08) 0%, transparent 70%)',
          transform: 'rotate(-25deg)',
        }} />

        <div ref={h.ref} className="relative z-10 px-8 md:px-14 lg:px-24 pt-28 pb-20 max-w-7xl mx-auto w-full"
          style={{ opacity: h.vis ? 1 : 0, transform: h.vis ? 'none' : 'translateY(30px)', transition: 'all 1.2s cubic-bezier(0.16,1,0.3,1)' }}>
          <div className="max-w-2xl">
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-8" style={{ color: 'var(--gold)' }}>{t('astro_page.location_label')}</p>
            <h1 className="font-display italic font-light leading-none mb-6" style={{ fontSize: 'clamp(48px,8vw,110px)', letterSpacing: '-0.03em' }}>
              Donde el cielo<br /><span style={{ color: 'var(--gold)' }}>toca la tierra.</span>
            </h1>
            <p className="font-sans font-light mb-10 max-w-lg leading-relaxed" style={{ color: 'rgba(244,240,232,0.6)', fontSize: 17 }}>
              El Matarraña es uno de los lugares con menor contaminación lumínica de España. Desde Fuentespalda, la Vía Láctea es visible a simple vista. El 12 agosto 2026: eclipse solar total. La noche más extraordinaria del siglo.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <Link to="/eclipse-2026" className="btn-primary flex items-center gap-2 px-7 py-4 text-sm" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
                Eclipse 2026 <ArrowRight size={16} />
              </Link>
              <a href={BRAND.contact.whatsapp + '?text=Hola! Quiero planificar una noche de estrellas en el Matarraña'}
                target="_blank" rel="noopener noreferrer"
                className="btn-ghost flex items-center gap-2 px-7 py-4 text-sm">
                Planificar mi noche <Moon size={16} />
              </a>
            </div>
            {/* Quick stats */}
            <div className="flex flex-wrap gap-8">
              {[
                { n: '21.5+', l: 'mag/arc² de oscuridad', s: 'umbral de Reserva Starlight' },
                { n: '0', l: 'industrias en 50km', s: 'aire y cielo puros' },
                { n: '740m', l: 'altitud', s: 'menos atmósfera que ver' },
              ].map((s, i) => (
                <div key={i}>
                  <p className="font-display font-light leading-none mb-1" style={{ fontSize: 28, color: 'var(--gold)', letterSpacing: '-0.02em' }}>{s.n}</p>
                  <p className="font-sans text-xs font-semibold" style={{ color: 'rgba(244,240,232,0.7)' }}>{s.l}</p>
                  <p className="font-sans text-[10px]" style={{ color: 'rgba(244,240,232,0.35)' }}>{s.s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to bottom, transparent, #080612)' }} />
      </section>

      {/* ECLIPSE CALENDAR */}
      <section ref={ec.ref} className="py-24 md:py-32 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-16" style={{ opacity: ec.vis ? 1 : 0, transition: 'all 1s ease' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>2026–2027</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5.5vw,78px)', letterSpacing: '-0.025em' }}>
            Tres eclipses.<br /><span style={{ color: 'var(--gold)' }}>{t('astro_page.perfect_base')}</span>
          </h2>
        </div>
        <div className="grid gap-5">
          {ECLIPSES_2026.map((ec2, i) => (
            <div key={i} className="rounded-2xl p-6 md:p-8 border flex flex-col md:flex-row gap-6 items-start"
              style={{
                background: ec2.featured ? `rgba(${ec2.color.replace('#','').match(/.{2}/g)!.map(h=>parseInt(h,16)).join(',')},0.08)` : 'rgba(200,169,110,0.04)',
                borderColor: ec2.featured ? ec2.color.replace('#','rgba(') + ',0.35)' : 'rgba(200,169,110,0.1)',
                opacity: ec.vis ? 1 : 0, transform: ec.vis ? 'none' : 'translateY(20px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i*0.12}s`,
              }}>
              <div className="text-4xl shrink-0">{ec2.icon}</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="font-sans text-[9px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full font-semibold"
                    style={{ background: ec2.color + '22', color: ec2.color, border: `1px solid ${ec2.color}44` }}>
                    {ec2.type}
                  </span>
                  {ec2.featured && <span className="font-sans text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full" style={{ background: 'var(--gold)', color: 'var(--ink)', fontWeight: 600 }}>{t('astro_page.century_event')}</span>}
                </div>
                <h3 className="font-display italic font-light mb-1" style={{ fontSize: 26, color: 'var(--cream)', letterSpacing: '-0.01em' }}>
                  {ec2.date}{ec2.time ? ` · ${ec2.time}` : ''}
                </h3>
                <p className="font-sans text-sm mb-1" style={{ color: 'rgba(244,240,232,0.6)' }}><strong style={{ color: 'var(--gold)' }}>{t('astro_page.duration')}</strong> {ec2.duration}</p>
                <p className="font-sans text-sm mb-2" style={{ color: 'rgba(244,240,232,0.6)' }}><strong style={{ color: 'var(--gold)' }}>{t('astro_page.visibility')}</strong> {ec2.visibility}</p>
                <p className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(244,240,232,0.45)' }}>{ec2.note}</p>
              </div>
              {ec2.featured && (
                <Link to="/eclipse-2026" className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm shrink-0"
                  style={{ background: 'var(--gold)', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                  {t('astro_page.eclipse_link')} <ArrowRight size={14} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* METEOR SHOWERS */}
      <section ref={sh.ref} className="py-20 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-14" style={{ opacity: sh.vis ? 1 : 0, transition: 'all 1s ease' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('astro_page.star_showers')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5.5vw,72px)', letterSpacing: '-0.025em' }}>
            {t('astro_page.monthly_label')}<br /><span style={{ color: 'var(--gold)' }}>{t('astro_page.monthly_title')}</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {METEOR_SHOWERS.map((shower, i) => (
            <div key={i} className="rounded-2xl p-5 border"
              style={{
                background: shower.highlighted ? 'rgba(200,169,110,0.08)' : 'rgba(255,255,255,0.03)',
                borderColor: shower.highlighted ? 'rgba(200,169,110,0.35)' : 'rgba(255,255,255,0.07)',
                opacity: sh.vis ? 1 : 0, transform: sh.vis ? 'none' : 'translateY(20px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i*0.08}s`,
              }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{shower.icon}</span>
                <span className="font-display font-light" style={{ fontSize: 20, color: 'var(--gold)', letterSpacing: '-0.01em' }}>{shower.rate}</span>
              </div>
              <h3 className="font-sans font-semibold mb-1" style={{ color: 'var(--cream)', fontSize: 15 }}>{shower.name}</h3>
              <p className="font-sans text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--gold)', opacity: 0.7 }}>{shower.peak}</p>
              <p className="font-sans font-light text-sm leading-relaxed" style={{ color: 'rgba(244,240,232,0.5)' }}>{shower.desc}</p>
              {shower.highlighted && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(200,169,110,0.2)' }}>
                  <span className="font-sans text-[9px] uppercase tracking-[0.2em]" style={{ color: 'var(--gold)' }}>⭐ Mejor del año desde el Matarraña</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* NIGHT ROUTES */}
      <section ref={rt.ref} className="py-20 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-14" style={{ opacity: rt.vis ? 1 : 0, transition: 'all 1s ease' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('astro_page.night_routes')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5.5vw,72px)', letterSpacing: '-0.025em' }}>
            La noche tiene<br /><span style={{ color: 'var(--gold)' }}>sus propias rutas.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {NIGHT_ROUTES.map((route, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border" style={{
              borderColor: 'rgba(255,255,255,0.07)',
              opacity: rt.vis ? 1 : 0, transform: rt.vis ? 'none' : 'translateY(20px)',
              transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i*0.1}s`,
            }}>
              <div className="relative" style={{ height: 180 }}>
                <img src={route.image} alt={route.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,6,18,0.85), rgba(8,6,18,0.2))' }} />
                <div className="absolute bottom-4 left-4 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} style={{ color: 'var(--gold)' }} />
                    <span className="font-sans text-xs" style={{ color: 'rgba(244,240,232,0.8)' }}>{route.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={11} style={{ color: 'var(--gold)' }} />
                    <span className="font-sans text-xs" style={{ color: 'rgba(244,240,232,0.8)' }}>{route.km}</span>
                  </div>
                </div>
              </div>
              <div className="p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <h3 className="font-display italic font-light mb-2" style={{ fontSize: 22, color: 'var(--cream)', letterSpacing: '-0.01em' }}>{route.name}</h3>
                <p className="font-sans font-light text-sm leading-relaxed mb-4" style={{ color: 'rgba(244,240,232,0.5)' }}>{route.description}</p>
                <div className="flex flex-col gap-1.5">
                  {route.items.map((item, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--gold)' }} />
                      <span className="font-sans text-xs" style={{ color: 'rgba(244,240,232,0.5)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT TO SEE */}
      <section ref={wt.ref} className="py-20 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-14" style={{ opacity: wt.vis ? 1 : 0, transition: 'all 1s ease' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('astro_page.sky_title')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5.5vw,72px)', letterSpacing: '-0.025em' }}>
            {t('astro_page.vision_label')}<br /><span style={{ color: 'var(--gold)' }}>{t('astro_page.vision_title')}</span>
          </h2>
          <p className="font-sans font-light mt-4 max-w-xl" style={{ color: 'rgba(244,240,232,0.5)', fontSize: 16 }}>
            Sin telescopio, sin experiencia. Solo ojos, oscuridad y tiempo.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(200,169,110,0.2)' }}>
                {['Objeto celeste', 'Mejor época', 'Tipo', 'Descripción'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-sans text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(200,169,110,0.6)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WHAT_TO_SEE.map((obj, i) => (
                <tr key={i} className="border-b" style={{
                  borderColor: 'rgba(255,255,255,0.05)',
                  opacity: wt.vis ? 1 : 0, transition: `opacity 0.6s ease ${i*0.05}s`,
                }}>
                  <td className="py-4 px-4 font-sans font-semibold text-sm" style={{ color: 'var(--cream)' }}>{obj.obj}</td>
                  <td className="py-4 px-4 font-sans text-xs" style={{ color: 'var(--gold)' }}>{obj.months}</td>
                  <td className="py-4 px-4">
                    <span className="font-sans text-[9px] uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: 'rgba(200,169,110,0.1)', color: 'rgba(200,169,110,0.8)' }}>{obj.type}</span>
                  </td>
                  <td className="py-4 px-4 font-sans text-sm" style={{ color: 'rgba(244,240,232,0.5)' }}>{obj.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* APPS + CTA */}
      <section className="py-20 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('astro_page.apps_title')}</p>
            <h2 className="font-display italic font-light leading-none mb-8" style={{ fontSize: 'clamp(28px,4vw,52px)', letterSpacing: '-0.025em' }}>{t('astro_page.apps_subtitle')}</h2>
            <div className="flex flex-col gap-4">
              {BEST_APPS.map((app, i) => (
                <div key={i} className="rounded-xl p-4 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-sans font-semibold text-sm" style={{ color: 'var(--cream)' }}>{app.name}</span>
                    <span className="font-sans text-[9px] uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>Gratis</span>
                  </div>
                  <p className="font-sans text-[10px] mb-1" style={{ color: 'rgba(200,169,110,0.6)' }}>{app.platform}</p>
                  <p className="font-sans text-sm" style={{ color: 'rgba(244,240,232,0.45)' }}>{app.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl p-8 flex flex-col justify-between" style={{ background: 'rgba(200,169,110,0.07)', border: '1px solid rgba(200,169,110,0.2)' }}>
            <div>
              <Moon size={32} style={{ color: 'var(--gold)' }} className="mb-6" />
              <h3 className="font-display italic font-light mb-4" style={{ fontSize: 32, letterSpacing: '-0.015em' }}>{t('astro_page.kit_title')}</h3>
              <ul className="font-sans text-sm space-y-2.5" style={{ color: 'rgba(244,240,232,0.6)' }}>
                {[
                  'Mapa del cielo personalizado para tu fecha',
                  'Hoja de rutas nocturnas con coordenadas',
                  'Gafas de eclipse certificadas ISO (agosto 2026)',
                  'App recomendadas instaladas',
                  'Linterna roja de cortesía',
                  'Horarios de Perseidas, Gemínidas y planetas',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Star size={12} style={{ color: 'var(--gold)', marginTop: 4, flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <a href={BRAND.contact.whatsapp + '?text=Hola! Quiero planificar una noche de estrellas en el Matarraña'}
              target="_blank" rel="noopener noreferrer"
              className="mt-8 btn-primary flex items-center justify-center gap-2 px-7 py-4"
              style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
              {t('astro_page.cta_book')} <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
