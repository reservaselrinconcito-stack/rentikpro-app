import React, { useRef, useState, useEffect } from 'react';
import { Coffee, Sunrise, Waves, Wine, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Moment {
  time: string;
  title: string;
  description: string;
  color: string;
  accent: string;
  icon: React.ReactNode;
  image: string;
  tag: string;
}

const MOMENTS: Moment[] = [
  {
    
    time: '08:00',
    title: 'Desayuno en la terraza.',
    description: 'El sol asoma tras la sierra. Café recién hecho, aceite D.O. Matarraña y el silencio de un pueblo que se despierta despacio. Sin prisa. Sin agenda.',
    color: '#F4F0E8',
    accent: '#C8A96E',
    icon: <Coffee size={18} />,
    image: 'https://cdn.turisapps.com/site-2302/5ae4ec66-a20f-4835-99c6-e30a7759485c/main.webp',
    tag: 'Mañana tranquila',
  },
  {
    time: '10:30',
    title: 'Parrizal de Beceite.',
    description: 'Pasarelas sobre agua esmeralda entre paredes de roca. El río Matarraña en estado puro. 22 km desde tu cama. La naturaleza que pensabas que solo existía en fotografías.',
    color: '#2A3827',
    accent: '#6B7F65',
    icon: <Sunrise size={18} />,
    image: 'https://cdn.turisapps.com/site-2302/28f5c737-5b74-4c7c-b890-533f75e02d5e/main.webp',
    tag: 'Paraje natural',
  },
  {
    time: '13:00',
    title: 'Baño en pozas naturales.',
    description: 'Agua cristalina entre rocas. Temperatura perfecta. Solo el sonido del río. Este es el lujo que no se paga con dinero — se gana desconectando del ruido.',
    color: '#1C3A4A',
    accent: '#4A9070',
    icon: <Waves size={18} />,
    image: 'https://cdn.turisapps.com/site-2302/921d1ede-4a0d-4085-bb6d-931ab027bcfa/main.webp',
    tag: 'Aguas cristalinas',
  },
  {
    time: '18:00',
    title: 'Vino en Valderrobres.',
    description: 'El castillo gótico se tiñe de naranja. Una copa de Garnacha D.O. en la terraza de la plaza mayor. Valderrobres, uno de los pueblos más bonitos de España. 20 minutos.',
    color: '#3B1E0F',
    accent: '#9B4F2E',
    icon: <Wine size={18} />,
    image: 'https://cdn.turisapps.com/site-2302/3ead602d-9c60-4b79-93a1-99e0fe7b4e78/main.webp',
    tag: 'Pueblo medieval',
  },
  {
    time: '22:30',
    title: 'La vía láctea sobre ti.',
    description: 'Cero contaminación lumínica. La Vía Láctea con el ojo desnudo. Las Pléyades. Orión. El firmamento que la ciudad olvidó que existe. La razón por la que volverás.',
    color: '#0C0A14',
    accent: '#7A6AAA',
    icon: <Star size={18} />,
    image: 'https://cdn.turisapps.com/site-2302/b5ca8a2a-23df-4e78-b184-e4f0d6bb60cf/main.webp',
    tag: 'Astroturismo',
  },
];

export const NarrativeSection: React.FC = () => {
    const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIndex(i); },
        { threshold: 0.55 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  const active = MOMENTS[activeIndex];

  return (
    <section className="relative">

      {/* Background transitions with active moment color */}
      <div
        className="hidden lg:block fixed inset-0 pointer-events-none transition-colors duration-700"
        style={{ background: active.color, opacity: 0, zIndex: -1 }}
      />

      <div className="max-w-7xl mx-auto px-8 md:px-14 lg:px-24 py-24 md:py-36">

        {/* Header */}
        <div className="mb-20">
          <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--rust)' }}>{t('narrative.lived')}</p>
          <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(40px,6.5vw,92px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
            {t('narrative.perfect_day_1')}<br /><span style={{ color: 'var(--rust)' }}>{t('narrative.perfect_day_2')}</span>
          </h2>
        </div>

        {/* Timeline layout */}
        <div className="relative">

          {/* Vertical line */}
          <div className="hidden md:block absolute left-[140px] top-0 bottom-0 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--gold) 10%, var(--gold) 90%, transparent)' }} />

          <div className="space-y-0">
            {MOMENTS.map((moment, i) => (
              <div
                key={moment.time}
                ref={el => { refs.current[i] = el; }}
                className="grid md:grid-cols-[160px_1fr] gap-0 group"
                style={{ minHeight: 220 }}
              >
                {/* Time column */}
                <div className="hidden md:flex flex-col items-end pr-10 pt-2">
                  <div className="relative">
                    {/* Dot on timeline */}
                    <div
                      className="absolute right-[-42px] top-1 w-3 h-3 rounded-full border-2 transition-all duration-500"
                      style={{
                        background: activeIndex === i ? moment.accent : 'var(--cream-dark)',
                        borderColor: moment.accent,
                        transform: activeIndex === i ? 'scale(1.4)' : 'scale(1)',
                        boxShadow: activeIndex === i ? `0 0 12px ${moment.accent}66` : 'none',
                      }}
                    />
                    <p className="font-display italic text-3xl font-light" style={{ color: activeIndex === i ? 'var(--ink)' : 'var(--ink-muted)', transition: 'color 0.5s ease', letterSpacing: '-0.02em' }}>
                      {moment.time.split(':')[0]}
                    </p>
                    <p className="font-sans text-xs text-right" style={{ color: 'var(--ink-muted)' }}>:{moment.time.split(':')[1]}</p>
                  </div>
                </div>

                {/* Content */}
                <div className={`pl-8 md:pl-16 pb-16 transition-all duration-500 ${activeIndex === i ? 'opacity-100' : 'opacity-40'}`}>

                  {/* Mobile time */}
                  <div className="md:hidden flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full" style={{ background: moment.accent }} />
                    <span className="font-sans text-xs uppercase tracking-wider" style={{ color: moment.accent }}>{moment.time} · {moment.tag}</span>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-10 items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: moment.accent + '22', color: moment.accent }}>
                          {moment.icon}
                        </div>
                        <span className="font-sans text-[9px] uppercase tracking-[0.28em]" style={{ color: moment.accent }}>{moment.tag}</span>
                      </div>
                      <h3 className="font-display italic font-light mb-4" style={{ fontSize: 'clamp(24px,3vw,42px)', color: 'var(--ink)', letterSpacing: '-0.015em', lineHeight: 1.1 }}>
                        {moment.title}
                      </h3>
                      <p className="font-sans font-light leading-relaxed" style={{ color: 'var(--ink-muted)', fontSize: 16, maxWidth: 360 }}>
                        {moment.description}
                      </p>
                    </div>

                    <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '16/10', maxHeight: 220 }}>
                      <img
                        src={moment.image}
                        alt={moment.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
