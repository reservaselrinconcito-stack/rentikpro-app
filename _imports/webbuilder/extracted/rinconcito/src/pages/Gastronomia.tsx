import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Star, Award, MapPin, Clock, Phone } from 'lucide-react';
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

interface Restaurant {
  name: string;
  location: string;
  distance: string;
  award: string;
  awardColor: string;
  awardBg: string;
  description: string;
  specialty: string;
  priceRange: string;
  phone?: string;
  highlight?: string;
  image: string;
}

const RESTAURANTS: Restaurant[] = [
  {
    name: 'La Torre del Visco',
    location: 'Fuentespalda · 5 min andando',
    distance: '400 m',
    award: '★ Michelin + ★ Verde',
    awardColor: '#E8272C',
    awardBg: '#FFF0F0',
    description: 'El único restaurante con estrella Michelin y estrella verde de la comarca, ubicado en Fuentespalda, a metros de El Rinconcito. El chef Rubén Catalán propone una cocina verde de máximo aprovechamiento con huerta propia y producto cero kilómetro.',
    specialty: 'Menú trufa negra del Matarraña · Menú degustación 5 platos 110€',
    priceRange: '€€€€',
    highlight: 'En tu misma calle',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop',
  },
  {
    name: 'La Fábrica de Solfa',
    location: 'Beceite · 15 min en coche',
    distance: '12 km',
    award: '☀ Sol Repsol 2026',
    awardColor: '#E55A00',
    awardBg: '#FFF4EE',
    description: 'Restaurante con encanto junto al río Matarraña en Beceite. Combina recetas tradicionales de la comarca con toques de cocina moderna y productos de temporada. Ambiente "slow travel" junto al río. Fesols y esturión son su firma.',
    specialty: 'Fesols de Beceite · Esturión con trufa · Cocina de temporada',
    priceRange: '€€',
    image: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&auto=format&fit=crop',
  },
  {
    name: 'Baudilio (Valderrobres)',
    location: 'Valderrobres · 20 min en coche',
    distance: '18 km',
    award: '☀ Sol Repsol 2026',
    awardColor: '#E55A00',
    awardBg: '#FFF4EE',
    description: 'En la capital del Matarraña, Fabiana Arévalo dirige una cocina de cercanía con caza de temporada (conejo, liebre) y huerta local. Instalado en una casona de piedra con vistas al castillo gótico de Valderrobres.',
    specialty: 'Ternasco asado · Caza de temporada · Huerta local',
    priceRange: '€€€',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
  },
  {
    name: 'Restaurante Matarraña',
    location: 'La Fresneda · 12 min en coche',
    distance: '10 km',
    award: '★★★ Guía Repsol',
    awardColor: '#E55A00',
    awardBg: '#FFF4EE',
    description: 'Institución de la comarca. Los hermanos Alcalá, tercera generación, mantienen la esencia de la cocina popular aragonesa. Las judías blancas de Beceite con arenque frito son legendarias. Cebollas rellenas, ternasco... cocina de memoria.',
    specialty: 'Judías con arenque frito · Ternasco asado · Cebollas rellenas',
    priceRange: '€€',
    image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&auto=format&fit=crop',
  },
  {
    name: 'Fonda Alcalá',
    location: 'Calaceite · 25 min en coche',
    distance: '22 km',
    award: '★★★ Guía Repsol',
    awardColor: '#E55A00',
    awardBg: '#FFF4EE',
    description: 'El restaurante que fundó Angeleta en 1940 sigue en manos de quienes lo aman. Álvaro Pradera cocina con tiempo: canelones, carpaccios de solomillo, saquitos de berenjena. Carta amplia, precio justo, corazón de la comarca.',
    specialty: 'Canelones artesanos · Solomillo con foie · Queso de Tronchón',
    priceRange: '€€',
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&auto=format&fit=crop',
  },
  {
    name: 'La Restaurante La Matarraña',
    location: 'La Fresneda · 12 min en coche',
    distance: '10 km',
    award: '★★★ Recomendado',
    awardColor: '#3B4F35',
    awardBg: '#F0F5EF',
    description: 'María Elena Grau y Pilar Gil preparan con maestría la cocina de una comarca donde la tierra provee en abundancia. Alcachofas con foie, manitas con caracoles, cabrito rebozado, perdiz roja de caza. Raciones legendarias.',
    specialty: 'Manitas con caracoles · Perdiz de caza · Aceite D.O. Matarraña',
    priceRange: '€€',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop',
  },
];

const PRODUCTS = [
  {
    name: 'Aceite D.O. Matarraña',
    desc: 'Variedad Empeltre. Prensado en frío. Medalla de Oro en concursos internacionales. Se produce en los olivares centenarios que rodean Fuentespalda.',
    icon: '🫒',
    where: 'Cooperativa de Fuentespalda',
  },
  {
    name: 'Trufa negra (Tuber melanosporum)',
    desc: 'El Matarraña es uno de los principales productores de trufa negra de España. Temporada: diciembre a marzo. La Torre del Visco la sirve en sus menús.',
    icon: '🍄',
    where: 'Mercado de trufas · Dic–Mar',
  },
  {
    name: 'Judías de Beceite',
    desc: 'La legumbre más famosa de la comarca. Blancas, cremosas, sin piel. La Fábrica de Solfa las celebra como bandera gastronómica de la comarca.',
    icon: '🫘',
    where: 'Productores locales',
  },
  {
    name: 'Vino D.O. Matarraña',
    desc: 'Garnacha y Cariñena de viñas viejas. Producción artesanal. La Fresneda tiene bodegas del siglo XVI abiertas al enoturismo.',
    icon: '🍷',
    where: 'Bodegas de La Fresneda',
  },
  {
    name: 'Ternasco de Aragón IGP',
    desc: 'Cordero con Indicación Geográfica Protegida. Criado en libertad en las sierras del Matarraña. La combinación perfecta: un vino D.O. y ternasco asado.',
    icon: '🥩',
    where: 'Asadores de la comarca',
  },
  {
    name: 'Miel de la Sierra',
    desc: 'Producida en los prados de tomillo y romero de los Puertos de Beceite. Apicultores artesanos. Variedad: azahar, tomillo, romero, multifloral.',
    icon: '🍯',
    where: 'Productores locales',
  },
];

export default function Gastronomia() {
  const { t } = useTranslation();
  useSEO({
    title: 'Gastronomía en el Matarraña — Estrella Michelin, Sol Repsol | El Rinconcito',
    description: 'La Torre del Visco ★ Michelin a metros de tu apartamento. La Fábrica de Solfa, Baudilio Sol Repsol. Aceite D.O., trufa negra, judías de Beceite. La mejor gastronomía rural de España, aquí.',
  });

  const heroRev = useReveal();
  const restRev = useReveal();
  const prodRev = useReveal();

  return (
    <div style={{ background: 'var(--cream)', color: 'var(--ink)' }}>

      {/* HERO */}
      <section className="relative overflow-hidden grain" style={{ paddingTop: 'max(120px, 18vh)', paddingBottom: 80, background: 'var(--ink)' }}>
        <div className="absolute inset-0 topo-bg opacity-10 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-14 lg:px-24">
          <div ref={heroRev.ref} style={{ opacity: heroRev.vis ? 1 : 0, transform: heroRev.vis ? 'none' : 'translateY(24px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--gold)' }}>{t('gastro_page.section_title')}</p>
            <h1 className="font-display italic font-light leading-none mb-8" style={{ fontSize: 'clamp(48px,8vw,110px)', letterSpacing: '-0.03em', color: 'var(--cream)' }}>
              Sabores que<br /><span style={{ color: 'var(--gold)' }}>no se olvidan.</span>
            </h1>
            <p className="font-sans font-light max-w-2xl leading-relaxed" style={{ color: 'rgba(244,240,232,0.6)', fontSize: 18 }}>
              Una estrella Michelin a 400 metros de tu cama. Dos Sol Repsol a 15 minutos en coche. Trufa negra, aceite D.O. Empeltre y las mejores judías del mundo. Bienvenido a la despensa secreta de España.
            </p>
          </div>
        </div>
      </section>

      {/* MAIN RESTAURANT — Torre del Visco feature */}
      <section className="py-20 md:py-28 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6" style={{ background: '#FFF0F0', border: '1px solid rgba(232,39,44,0.2)' }}>
              <span className="text-base">★</span>
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#E8272C' }}>{t('gastro_page.michelin_label')}</span>
            </div>
            <h2 className="font-display italic font-light leading-none mb-6" style={{ fontSize: 'clamp(36px,5vw,66px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
              La Torre del Visco.<br /><span style={{ color: 'var(--rust)' }}>{t('gastro_page.on_your_street')}</span>
            </h2>
            <p className="font-sans font-light leading-relaxed mb-6" style={{ color: 'var(--ink-muted)', fontSize: 17 }}>
              A 400 metros de El Rinconcito, el chef Rubén Catalán trabaja con huerta propia y cero kilómetro para crear una cocina verde de extraordinaria sensibilidad. La trufa negra del Matarraña, las verduras de temporada y el aceite D.O. Empeltre son los protagonistas.
            </p>
            <p className="font-sans font-light leading-relaxed mb-8" style={{ color: 'var(--ink-muted)', fontSize: 17 }}>
              La estrella verde Michelin, la más difícil de conseguir, reconoce su compromiso con la sostenibilidad y el entorno. En Fuentespalda. A pie desde el apartamento.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://torredelviscorestaurant.es" target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2 px-6 py-3.5 text-sm">
                {t('gastro_page.cta_reserve_table')} <ArrowUpRight size={15} />
              </a>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                <MapPin size={14} />
                <span>{t('gastro_page.distance_walk')}</span>
              </div>
            </div>
          </div>
          <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <img
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&auto=format&fit=crop"
              alt="La Torre del Visco - Restaurante Estrella Michelin Fuentespalda"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-5 left-5 rounded-xl px-4 py-3" style={{ background: 'rgba(28,24,18,0.72)', backdropFilter: 'blur(12px)' }}>
              <p className="font-sans text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--gold)' }}>{t('gastro_page.distance_label')}</p>
              <p className="font-display italic text-lg font-light" style={{ color: 'var(--cream)' }}>{t('gastro_page.torre_visco')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* RESTAURANT GRID */}
      <section ref={restRev.ref} className="py-16 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-14" style={{ opacity: restRev.vis ? 1 : 0, transform: restRev.vis ? 'none' : 'translateY(24px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--rust)' }}>{t('gastro_page.table_title')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5vw,72px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
            Todos los sabores,<br />a tu alcance.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {RESTAURANTS.slice(1).map((rest, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{
                border: '1px solid rgba(28,24,18,0.07)',
                opacity: restRev.vis ? 1 : 0,
                transform: restRev.vis ? 'none' : 'translateY(20px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`,
              }}
            >
              <div className="relative" style={{ height: 180 }}>
                <img src={rest.image} alt={rest.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(28,24,18,0.7) 0%, transparent 60%)' }} />
                <div className="absolute bottom-4 left-4">
                  <span className="font-sans text-[10px] uppercase tracking-wider font-semibold px-3 py-1.5 rounded-full" style={{ background: rest.awardBg, color: rest.awardColor }}>
                    {rest.award}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display italic font-light" style={{ fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{rest.name}</h3>
                  <span className="font-sans text-xs shrink-0 ml-3 mt-1" style={{ color: 'var(--ink-muted)' }}>{rest.priceRange}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  <MapPin size={11} style={{ color: 'var(--rust)' }} />
                  <span className="font-sans text-xs" style={{ color: 'var(--rust)' }}>{rest.location}</span>
                </div>
                <p className="font-sans font-light text-sm leading-relaxed mb-3" style={{ color: 'var(--ink-muted)' }}>{rest.description}</p>
                <p className="font-sans text-xs" style={{ color: 'var(--ink-light)', fontStyle: 'italic' }}>{rest.specialty}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GOLD RULE */}
      <div className="mx-8 md:mx-14 lg:mx-24 gold-rule my-8" />

      {/* LOCAL PRODUCTS */}
      <section ref={prodRev.ref} className="py-20 px-8 md:px-14 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-14" style={{ opacity: prodRev.vis ? 1 : 0, transform: prodRev.vis ? 'none' : 'translateY(24px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--rust)' }}>{t('gastro_page.pantry_title')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(36px,5vw,72px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
            {t('gastro_page.tagline_1')}<br /><span style={{ color: 'var(--rust)' }}>{t('gastro_page.tagline_2')}</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p, i) => (
            <div
              key={i}
              className="rounded-2xl p-6"
              style={{
                background: 'var(--cream-dark)',
                opacity: prodRev.vis ? 1 : 0,
                transform: prodRev.vis ? 'none' : 'translateY(20px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`,
              }}
            >
              <span className="text-3xl mb-4 block">{p.icon}</span>
              <h3 className="font-sans font-semibold mb-2" style={{ color: 'var(--ink)' }}>{p.name}</h3>
              <p className="font-sans font-light text-sm leading-relaxed mb-3" style={{ color: 'var(--ink-muted)' }}>{p.desc}</p>
              <p className="font-sans text-xs" style={{ color: 'var(--rust)' }}>{p.where}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 md:px-14 text-center" style={{ background: 'var(--ink)' }}>
        <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('gastro_page.guide_label')}</p>
        <h2 className="font-display italic font-light mb-6" style={{ fontSize: 'clamp(32px,5vw,72px)', color: 'var(--cream)', letterSpacing: '-0.025em' }}>
          {t('gastro_page.guide_desc')}
        </h2>
        <p className="font-sans font-light mb-10 max-w-lg mx-auto" style={{ color: 'rgba(244,240,232,0.5)', fontSize: 16 }}>
          Reserva, horarios actualizados, platos recomendados y los secretos de Toni y Evelyn para comer increíble sin salir del Matarraña.
        </p>
        <Link to="/disponibilidad" className="btn-primary inline-flex items-center gap-2 px-8 py-4" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
          {t('gastro_page.cta_guide')} <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
