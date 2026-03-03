import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Calendar, MapPin, Clock, Eye, Zap, Moon } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { BRAND } from '../content/brand';
import { useTranslation } from 'react-i18next';

// Eclipse: 12 August 2026, 20:29h local time (from Torre del Compte, ~10km from Fuentespalda)
const ECLIPSE_DATE = new Date('2026-08-12T20:29:00+02:00');
const TOTALITY_SECONDS = 87; // ~1 min 27 sec (Torre del Compte data, Matarraña)

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setDiff(Math.max(0, target.getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [target]);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="font-display font-light rounded-2xl flex items-center justify-center mb-3"
        style={{
          fontSize: 'clamp(36px,8vw,96px)',
          letterSpacing: '-0.04em',
          color: 'var(--gold)',
          width: 'clamp(80px,14vw,160px)',
          height: 'clamp(80px,14vw,160px)',
          background: 'rgba(200,169,110,0.06)',
          border: '1px solid rgba(200,169,110,0.18)',
          lineHeight: 1,
        }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="font-sans text-[9px] uppercase tracking-[0.3em]" style={{ color: 'rgba(200,169,110,0.5)' }}>{label}</span>
    </div>
  );
}

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

const ECLIPSE_FACTS = [
  { icon: <Clock size={18} />, title: '1m 27s de totalidad', desc: 'El Sol completamente oculto por la Luna. El día se convierte en noche. Las estrellas aparecen a las 20:29h.' },
  { icon: <Eye size={18} />, title: 'A simple vista', desc: 'No se necesita telescopio para la totalidad. La corona solar, la atmósfera de la Luna y las estrellas del mediodía: visibles a ojo desnudo.' },
  { icon: <Star size={18} />, title: 'Último hasta 2053', desc: 'El siguiente eclipse total visible desde España no será hasta 2053. Una oportunidad única en toda una vida.' },
  { icon: <Zap size={18} />, title: 'Perseidas esa misma noche', desc: 'La noche del 12 al 13 de agosto es el pico de las Perseidas. Eclipse al atardecer + lluvia de estrellas de madrugada: noche irrepetible.' },
  { icon: <MapPin size={18} />, title: 'Matarraña en la franja', desc: 'Teruel y el Matarraña están en la franja de totalidad. Desde Fuentespalda, con el horizonte oeste despejado, se verá el fenómeno completo.' },
  { icon: <Moon size={18} />, title: 'Cielo oscuro certificado', desc: 'El Matarraña tiene uno de los cielos más oscuros de España (Reserva Biosfera). Sin contaminación lumínica: condiciones de observación excepcionales.' },
];

const OBSERVATION_GUIDE = [
  { time: '19:35', event: 'Inicio del eclipse parcial', desc: 'El Sol empieza a cubrirse. Ya se necesitan gafas de eclipse.' },
  { time: '20:20', event: 'Eclipse casi total', desc: 'Momento mágico: la luz cambia de color, los animales se comportan extraño, la temperatura baja.' },
  { time: '20:29', event: '⚫ TOTALIDAD', desc: 'El Sol desaparece. Se pueden quitar las gafas. La corona solar, las estrellas y los planetas son visibles. Gritar es obligatorio.' },
  { time: '20:30:27', event: 'Fin de la totalidad', desc: 'Vuelve la luz. El "diamante de brillante" aparece en el borde de la Luna. Las gafas vuelven a ser necesarias.' },
  { time: '21:05', event: 'El Sol se pone', desc: 'El eclipse termina con la puesta de sol. Las Perseidas empiezan a ser visibles.' },
  { time: '00:00–04:00', event: '🌠 Pico de las Perseidas', desc: 'Lluvia de estrellas fugaces. Hasta 100 meteoros/hora. El Matarraña, sin contaminación lumínica, es el mejor lugar para verlas.' },
];

const PACKAGES = [
  {
    name: 'Eclipse Básico',
    nights: '1 noche (11–12 Aug)',
    price: 'Desde 90€',
    features: ['Paquete de bienvenida eclipse', 'Gafas certificadas ISO', 'Mapa de observación local', 'Guía de horarios exactos'],
    highlight: false,
  },
  {
    name: 'Eclipse Premium',
    nights: '3 noches (10–13 Aug)',
    price: 'Desde 270€',
    features: ['Todo del básico', 'Observación Perseidas (12–13 Aug)', 'Cena maridaje local', 'Ruta nocturna guiada', 'Transfer a punto de observación'],
    highlight: true,
    badge: 'Más popular',
  },
  {
    name: 'Eclipse Total',
    nights: '5 noches (9–14 Aug)',
    price: 'Desde 450€',
    features: ['Todo del Premium', 'Telescopio en el apartamento', 'Sesión astrofotografía', 'Picnic al amanecer pos-eclipse', 'Visita Torre del Visco ★'],
    highlight: false,
  },
];

export default function Eclipse2026() {
  const { t } = useTranslation();
  useSEO({
    title: t('eclipse.seo_title', 'Eclipse Solar Total 2026 en el Matarraña — El Rinconcito'),
    description: t('eclipse.seo_desc', 'El primer eclipse solar total en España en más de 100 años. 12 agosto 2026 · 1m 27s de totalidad · Matarraña, Teruel. Reserva ahora antes de que se agoten.'),
  });

  const { d, h, m, s } = useCountdown(ECLIPSE_DATE);
  const factsRev = useReveal();
  const guideRev = useReveal();
  const packRev = useReveal();

  return (
    <div className="overflow-x-hidden" style={{ background: '#0A0710', color: 'var(--cream)' }}>

      {/* HERO — Deep Space */}
      <section className="relative overflow-hidden grain" style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

        {/* Star field */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {Array.from({ length: 120 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() > 0.85 ? 2 : 1,
                height: Math.random() > 0.85 ? 2 : 1,
                background: `rgba(255,255,255,${Math.random() * 0.6 + 0.2})`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `pulse ${2 + Math.random() * 4}s ease-in-out ${Math.random() * 3}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Eclipse visual */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" style={{ width: 500, height: 500, right: -80 }}>
          {/* Moon blocking Sun */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Corona glow */}
            <div className="absolute rounded-full" style={{
              width: 360, height: 360,
              background: 'radial-gradient(circle, transparent 38%, rgba(200,169,110,0.08) 45%, rgba(200,169,110,0.04) 60%, transparent 75%)',
              animation: 'pulse 4s ease-in-out infinite',
            }} />
            {/* Sun corona rays */}
            <div className="absolute rounded-full" style={{
              width: 320, height: 320,
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,220,100,0.06) 5%, transparent 10%, rgba(255,200,80,0.04) 15%, transparent 20%, rgba(255,220,100,0.06) 25%, transparent 30%, rgba(255,200,80,0.04) 35%, transparent 40%, rgba(255,220,100,0.05) 45%, transparent 50%, rgba(255,200,80,0.04) 55%, transparent 60%, rgba(255,220,100,0.06) 65%, transparent 70%, rgba(255,200,80,0.04) 75%, transparent 80%, rgba(255,220,100,0.06) 85%, transparent 90%, rgba(255,200,80,0.04) 95%, transparent 100%)',
            }} />
            {/* Moon — black circle */}
            <div className="rounded-full" style={{
              width: 180, height: 180,
              background: '#0A0710',
              boxShadow: '0 0 0 2px rgba(200,169,110,0.15), 0 0 80px 20px rgba(200,169,110,0.12)',
              zIndex: 2,
            }} />
          </div>
        </div>

        <div className="relative z-10 px-8 md:px-14 lg:px-24 pt-28 pb-20 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
              <span className="h-px w-10" style={{ background: 'var(--gold)' }} />
              <span className="font-sans text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--gold)' }}>12 · Agosto · 2026 · Teruel, Aragón</span>
            </div>

            <h1 className="font-display italic font-light leading-none mb-6" style={{ fontSize: 'clamp(48px,8vw,110px)', letterSpacing: '-0.03em', lineHeight: 0.9 }}>
              El eclipse del<br />
              <span style={{ color: 'var(--gold)' }}>siglo.</span>
            </h1>

            <p className="font-sans font-light mb-10 max-w-lg" style={{ color: 'rgba(244,240,232,0.6)', fontSize: 17, lineHeight: 1.7 }}>
              El primer eclipse solar total visible desde España en más de 100 años. 1 minuto y 27 segundos de oscuridad total. Visible desde el Matarraña. <strong style={{ color: 'rgba(244,240,232,0.9)' }}>{t('eclipse_page.few_spots')}</strong>
            </p>

            <div className="flex flex-wrap gap-4 mb-16">
              <a
                href={BRAND.contact.whatsapp + '?text=Hola! Quiero reservar para el Eclipse del 12 agosto 2026'}
                target="_blank" rel="noopener noreferrer"
                className="btn-primary flex items-center gap-2 px-8 py-4"
                style={{ background: 'var(--gold)', color: 'var(--ink)', fontSize: 15 }}
              >
                {t('eclipse_page.cta_book')} <ArrowRight size={17} />
              </a>
              <Link to="/disponibilidad" className="btn-ghost flex items-center gap-2 px-8 py-4" style={{ fontSize: 15 }}>
                <Calendar size={17} /> Consultar fechas
              </Link>
            </div>

            {/* Countdown */}
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.3em] mb-6" style={{ color: 'rgba(200,169,110,0.5)' }}>{t('eclipse_page.countdown_title')}</p>
              <div className="flex flex-wrap gap-4">
                <CountdownUnit value={d} label={t('eclipse.days').toLowerCase()} />
                <CountdownUnit value={h} label={t('eclipse.hours').toLowerCase()} />
                <CountdownUnit value={m} label={t('eclipse.minutes').toLowerCase()} />
                <CountdownUnit value={s} label={t('eclipse.seconds').toLowerCase()} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to bottom, transparent, #0A0710)' }} />
      </section>

      {/* FACTS */}
      <section ref={factsRev.ref} className="py-24 md:py-32 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-16" style={{ opacity: factsRev.vis ? 1 : 0, transform: factsRev.vis ? 'none' : 'translateY(24px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('eclipse_page.why_unique')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5.5vw,78px)', letterSpacing: '-0.025em' }}>
            Una vez en la vida.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ECLIPSE_FACTS.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 border"
              style={{
                background: 'rgba(200,169,110,0.04)',
                borderColor: 'rgba(200,169,110,0.12)',
                opacity: factsRev.vis ? 1 : 0,
                transform: factsRev.vis ? 'none' : 'translateY(20px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`,
              }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(200,169,110,0.12)', color: 'var(--gold)' }}>
                {f.icon}
              </div>
              <h3 className="font-sans font-semibold mb-2" style={{ color: 'var(--cream)' }}>{f.title}</h3>
              <p className="font-sans font-light text-sm leading-relaxed" style={{ color: 'rgba(244,240,232,0.5)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TIMELINE */}
      <section ref={guideRev.ref} className="py-24 md:py-32 px-8 md:px-14 lg:px-24" style={{ background: 'rgba(200,169,110,0.04)', borderTop: '1px solid rgba(200,169,110,0.1)', borderBottom: '1px solid rgba(200,169,110,0.1)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-16" style={{ opacity: guideRev.vis ? 1 : 0, transform: guideRev.vis ? 'none' : 'translateY(24px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('eclipse_page.minute_by_minute')}</p>
            <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5.5vw,78px)', letterSpacing: '-0.025em' }}>
              La noche del 12<br /><span style={{ color: 'var(--gold)' }}>de agosto.</span>
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-24 top-0 bottom-0 w-px hidden md:block" style={{ background: 'linear-gradient(to bottom, transparent, rgba(200,169,110,0.4) 10%, rgba(200,169,110,0.4) 90%, transparent)' }} />

            {OBSERVATION_GUIDE.map((item, i) => (
              <div
                key={i}
                className="grid md:grid-cols-[96px_1fr] gap-0 group mb-1"
                style={{
                  opacity: guideRev.vis ? 1 : 0,
                  transform: guideRev.vis ? 'none' : 'translateX(-20px)',
                  transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s`,
                }}
              >
                <div className="hidden md:flex flex-col items-end pr-8 pt-5">
                  <span className="font-display italic text-lg" style={{ color: 'var(--gold)', letterSpacing: '-0.02em' }}>{item.time}</span>
                </div>
                <div
                  className="rounded-2xl p-5 md:ml-8 mb-3 border"
                  style={{
                    background: item.time.includes('Totalidad') || item.event.includes('⚫') ? 'rgba(200,169,110,0.1)' : 'rgba(200,169,110,0.03)',
                    borderColor: item.time.includes('Totalidad') || item.event.includes('⚫') ? 'rgba(200,169,110,0.3)' : 'rgba(200,169,110,0.08)',
                  }}
                >
                  <div className="md:hidden text-xs font-sans mb-1" style={{ color: 'var(--gold)' }}>{item.time}</div>
                  <p className="font-sans font-semibold mb-1" style={{ color: 'var(--cream)', fontSize: 15 }}>{item.event}</p>
                  <p className="font-sans font-light text-sm" style={{ color: 'rgba(244,240,232,0.5)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section ref={packRev.ref} className="py-24 md:py-32 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-16 text-center" style={{ opacity: packRev.vis ? 1 : 0, transform: packRev.vis ? 'none' : 'translateY(24px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('eclipse_page.reserve_history')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5.5vw,78px)', letterSpacing: '-0.025em' }}>
            Paquetes Eclipse 2026.
          </h2>
          <p className="font-sans font-light mt-6 max-w-md mx-auto" style={{ color: 'rgba(244,240,232,0.5)', fontSize: 16 }}>
            Agosto 2026 en el Matarraña se está agotando. No dejes pasar el acontecimiento astronómico del siglo.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PACKAGES.map((pkg, i) => (
            <div
              key={i}
              className="rounded-3xl p-7 flex flex-col relative border"
              style={{
                background: pkg.highlight ? 'rgba(200,169,110,0.1)' : 'rgba(200,169,110,0.04)',
                borderColor: pkg.highlight ? 'rgba(200,169,110,0.4)' : 'rgba(200,169,110,0.12)',
                opacity: packRev.vis ? 1 : 0,
                transform: packRev.vis ? 'none' : 'translateY(24px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s`,
              }}
            >
              {pkg.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 font-sans text-[10px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-full" style={{ background: 'var(--gold)', color: 'var(--ink)', fontWeight: 600 }}>
                  {pkg.badge}
                </div>
              )}
              <div>
                <p className="font-sans font-semibold text-sm mb-1" style={{ color: 'var(--gold)' }}>{pkg.nights}</p>
                <h3 className="font-display italic font-light mb-4" style={{ fontSize: 28, color: 'var(--cream)', letterSpacing: '-0.01em' }}>{pkg.name}</h3>
                <p className="font-display font-light mb-6" style={{ fontSize: 36, color: 'var(--gold)', letterSpacing: '-0.02em' }}>{pkg.price}<span className="font-sans text-sm" style={{ color: 'rgba(244,240,232,0.4)' }}>/apt.</span></p>
                <ul className="space-y-2.5 mb-8">
                  {pkg.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(200,169,110,0.2)' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
                      </div>
                      <span className="font-sans text-sm" style={{ color: 'rgba(244,240,232,0.65)' }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href={BRAND.contact.whatsapp + `?text=Hola! Me interesa el paquete "${pkg.name}" para el Eclipse 2026`}
                target="_blank" rel="noopener noreferrer"
                className="mt-auto font-sans font-semibold text-sm flex items-center justify-center gap-2 rounded-full py-3.5 px-6 transition-all duration-300"
                style={{
                  background: pkg.highlight ? 'var(--gold)' : 'transparent',
                  color: pkg.highlight ? 'var(--ink)' : 'var(--cream)',
                  border: `1.5px solid ${pkg.highlight ? 'var(--gold)' : 'rgba(244,240,232,0.2)'}`,
                }}
              >
                Consultar disponibilidad <ArrowRight size={15} />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-8 md:px-14 text-center" style={{ background: 'rgba(200,169,110,0.06)', borderTop: '1px solid rgba(200,169,110,0.1)' }}>
        <p className="font-sans text-xs uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--gold)' }}>{t('eclipse_page.doubts')}</p>
        <h2 className="font-display italic font-light mb-6" style={{ fontSize: 'clamp(28px,4.5vw,56px)', letterSpacing: '-0.025em' }}>
          Toni y Evelyn te ayudan<br />a planificar la noche perfecta.
        </h2>
        <div className="flex flex-wrap gap-4 justify-center">
          <a
            href={BRAND.contact.whatsapp + '?text=Hola! Quiero información sobre el Eclipse 2026 en el Matarraña'}
            target="_blank" rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2 px-8 py-4"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            Escribir por WhatsApp <ArrowRight size={17} />
          </a>
          <Link to="/disponibilidad" className="btn-ghost flex items-center gap-2 px-8 py-4">
            Ver disponibilidad <Calendar size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
