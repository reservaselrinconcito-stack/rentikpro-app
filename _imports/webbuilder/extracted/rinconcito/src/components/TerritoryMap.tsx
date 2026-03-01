import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Clock, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface POI {
  id: string;
  name: string;
  type: 'home' | 'village' | 'nature' | 'activity';
  x: number; // SVG percentage x
  y: number; // SVG percentage y
  distance: string;
  time: string;
  description: string;
  tag: string;
  link?: string;
}

const POIS: POI[] = [
  {
    
    id: 'fuentespalda',
    name: 'Fuentespalda',
    type: 'home',
    x: 35, y: 52,
    distance: '0 km',
    time: 'Tu base',
    description: 'El Rinconcito Matarraña. Pueblo medieval con 350 habitantes, castillo árabe y el nuevo Bike Park inaugurado en 2026.',
    tag: 'Tu alojamiento',
  },
  {
    id: 'valderrobres',
    name: 'Valderrobres',
    type: 'village',
    x: 62, y: 28,
    distance: '18 km',
    time: '20 min',
    description: 'Considerado uno de los pueblos más bonitos de España. Castillo gótico, puente medieval y gastronomía D.O.',
    tag: 'Pueblo medieval',
  },
  {
    id: 'parrizal',
    name: 'Parrizal de Beceite',
    type: 'nature',
    x: 78, y: 55,
    distance: '22 km',
    time: '25 min',
    description: 'Las Hoces del Río Matarraña. Pasarelas sobre aguas de esmeralda y sombra de ribera. El paisaje más icónico del Matarraña.',
    tag: 'Paraje natural',
  },
  {
    id: 'fresneda',
    name: 'La Fresneda',
    type: 'village',
    x: 44, y: 30,
    distance: '12 km',
    time: '15 min',
    description: 'Pueblo con encanto de piedra rosa, plaza mayor con bodega del siglo XVI. Vino DO Matarraña y oleoturismo.',
    tag: 'Pueblo con encanto',
  },
  {
    id: 'calaceite',
    name: 'Calaceite',
    type: 'village',
    x: 55, y: 14,
    distance: '28 km',
    time: '30 min',
    description: 'Cuna de la cerámica ibérica. Conjunto histórico-artístico con casa-palacio y aceite de oliva virgen extra D.O.',
    tag: 'Patrimonio ibérico',
  },
  {
    id: 'arens',
    name: 'Arens de Lledó',
    type: 'village',
    x: 55, y: 68,
    distance: '11 km',
    time: '12 min',
    description: 'Pintoresco pueblo sobre roca viva con ermita románica. Punto de acceso a la Sierra de Arens y rutas de montaña.',
    tag: 'Sierra y ermitas',
  },
  {
    id: 'pena',
    name: 'Torre dels Moros · Peñarroya',
    type: 'activity',
    x: 22, y: 30,
    distance: '8 km',
    time: '10 min',
    description: 'Observatorio de astronomía y torre medieval. Zona certificada Dark Sky — las mejores noches de estrellas de España.',
    tag: 'Astroturismo',
  },
  {
    id: 'bano',
    name: 'Baños naturales',
    type: 'nature',
    x: 70, y: 72,
    distance: '15 km',
    time: '18 min',
    description: 'Pozas de agua cristalina en el río Matarraña. Temperatura perfecta en verano entre paredes de roca.',
    tag: 'Aguas cristalinas',
  },
];

const TYPE_STYLES = {
  home:     { fill: '#9B4F2E', ring: '#C8A96E', size: 14 },
  village:  { fill: '#3B4F35', ring: '#6B7F65', size: 10 },
  nature:   { fill: '#2A6049', ring: '#4A9070', size: 10 },
  activity: { fill: '#4A3A6A', ring: '#8A70AA', size: 10 },
};

const TYPE_LABELS: Record<string, string> = {
  home: 'Tu base',
  village: 'Pueblo',
  nature: 'Naturaleza',
  activity: 'Actividad',
};

export const TerritoryMap: React.FC = () => {
    const { t } = useTranslation();
  const [active, setActive] = useState<POI>(POIS[0]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const style = TYPE_STYLES[active.type];

  return (
    <section style={{ background: 'var(--ink)', overflow: 'hidden' }} className="relative">
      {/* Topo texture */}
      <div className="absolute inset-0 topo-bg opacity-8 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-14 lg:px-24 py-24 md:py-36">

        {/* Header */}
        <div className="grid md:grid-cols-2 gap-10 mb-16 items-end">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>{t('territory.title')}</p>
            <h2 className="font-display italic font-light leading-none" style={{ fontSize: 'clamp(40px,6vw,84px)', color: 'var(--cream)', letterSpacing: '-0.025em' }}>
              {t('territory.map_tagline_1')}<br /><span style={{ color: 'var(--gold)' }}>{t('territory.map_tagline_2')}</span>
            </h2>
          </div>
          <p className="font-sans font-light leading-relaxed" style={{ color: 'rgba(244,240,232,0.55)', fontSize: 16, maxWidth: 380 }}>
            Explora el mapa. Cada punto del territorio está a menos de 30 minutos desde El Rinconcito. La Toscana española, toda para ti.
          </p>
        </div>

        {/* Map + Info panel */}
        <div className="grid lg:grid-cols-5 gap-6 items-stretch">

          {/* SVG Map */}
          <div className="lg:col-span-3 relative rounded-3xl overflow-hidden" style={{ background: 'rgba(244,240,232,0.04)', border: '1px solid rgba(200,169,110,0.12)', aspectRatio: '4/3' }}>

            {/* Terrain lines decoration */}
            <svg viewBox="0 0 100 75" className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }} preserveAspectRatio="none">
              <path d="M0 60 Q15 45 30 50 Q45 55 60 42 Q75 30 100 35" fill="none" stroke="#C8A96E" strokeWidth="0.4"/>
              <path d="M0 50 Q20 38 40 42 Q60 46 80 33 Q90 27 100 30" fill="none" stroke="#C8A96E" strokeWidth="0.3"/>
              <path d="M0 68 Q25 58 50 62 Q75 66 100 55" fill="none" stroke="#C8A96E" strokeWidth="0.3"/>
              <path d="M10 72 Q30 65 55 70 Q80 74 100 65" fill="none" stroke="#C8A96E" strokeWidth="0.2"/>
              <path d="M0 40 Q18 30 38 33 Q58 36 75 25 Q88 17 100 22" fill="none" stroke="#C8A96E" strokeWidth="0.25"/>
              {/* River */}
              <path d="M30 75 Q35 65 40 55 Q50 40 65 45 Q75 50 82 42" fill="none" stroke="#4A9070" strokeWidth="0.6" opacity="0.4"/>
            </svg>

            {/* Interactive SVG */}
            <svg viewBox="0 0 100 75" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Connection lines from home to all POIs */}
              {POIS.filter(p => p.id !== 'fuentespalda').map(p => (
                <line
                  key={p.id}
                  x1={POIS[0].x} y1={POIS[0].y}
                  x2={p.x} y2={p.y}
                  stroke="rgba(200,169,110,0.12)"
                  strokeWidth="0.3"
                  strokeDasharray="1 1.5"
                />
              ))}

              {/* Active connection highlighted */}
              {active.id !== 'fuentespalda' && (
                <line
                  x1={POIS[0].x} y1={POIS[0].y}
                  x2={active.x} y2={active.y}
                  stroke="rgba(200,169,110,0.5)"
                  strokeWidth="0.5"
                />
              )}

              {/* POI dots */}
              {POIS.map(poi => {
                const s = TYPE_STYLES[poi.type];
                const isActive = poi.id === active.id;
                const isHover = poi.id === hoverId;
                return (
                  <g
                    key={poi.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActive(poi)}
                    onMouseEnter={() => setHoverId(poi.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    {/* Pulse ring for active */}
                    {isActive && (
                      <circle cx={poi.x} cy={poi.y} r={s.size * 0.18 + 4} fill="none" stroke={s.ring} strokeWidth="0.5" opacity="0.4" />
                    )}
                    {/* Main dot */}
                    <circle
                      cx={poi.x} cy={poi.y}
                      r={isActive ? s.size * 0.18 + 1 : s.size * 0.15}
                      fill={s.fill}
                      stroke={s.ring}
                      strokeWidth={isActive ? '0.8' : '0.4'}
                      style={{ transition: 'r 0.3s ease' }}
                    />
                    {/* Label */}
                    <text
                      x={poi.x}
                      y={poi.y - (s.size * 0.15) - 1.5}
                      textAnchor="middle"
                      fontSize="2.2"
                      fontFamily="Outfit, sans-serif"
                      fill={isActive || isHover ? 'rgba(244,240,232,0.95)' : 'rgba(244,240,232,0.4)'}
                      style={{ transition: 'fill 0.3s ease', pointerEvents: 'none', userSelect: 'none' }}
                      fontWeight={isActive ? '600' : '400'}
                    >
                      {poi.name.split('·')[0].trim()}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-3">
              {Object.entries(TYPE_STYLES).map(([type, s]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.fill, boxShadow: `0 0 0 1px ${s.ring}` }} />
                  <span className="font-sans text-[9px] uppercase tracking-wider" style={{ color: 'rgba(244,240,232,0.35)' }}>{TYPE_LABELS[type]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info panel */}
          <div className="lg:col-span-2 flex flex-col justify-between" style={{ minHeight: 320 }}>
            <div key={active.id} style={{ animation: 'fadeIn 0.4s ease' }}>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6"
                style={{ background: TYPE_STYLES[active.type].fill + '22', border: `1px solid ${TYPE_STYLES[active.type].ring}44` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_STYLES[active.type].fill }} />
                <span className="font-sans text-[9px] uppercase tracking-[0.25em]" style={{ color: TYPE_STYLES[active.type].ring }}>{active.tag}</span>
              </div>

              <h3 className="font-display italic font-light mb-4" style={{ fontSize: 'clamp(28px,3.5vw,46px)', color: 'var(--cream)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {active.name}
              </h3>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Navigation size={13} style={{ color: 'var(--gold)' }} />
                  <span className="font-sans text-sm" style={{ color: 'rgba(244,240,232,0.5)' }}>{active.distance}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={13} style={{ color: 'var(--gold)' }} />
                  <span className="font-sans text-sm" style={{ color: 'rgba(244,240,232,0.5)' }}>{active.time}</span>
                </div>
              </div>

              <p className="font-sans font-light leading-relaxed mb-8" style={{ color: 'rgba(244,240,232,0.62)', fontSize: 15 }}>
                {active.description}
              </p>
            </div>

            {/* POI list pills */}
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.25em] mb-4" style={{ color: 'rgba(200,169,110,0.5)' }}>{t('common.select_point')}</p>
              <div className="flex flex-wrap gap-2">
                {POIS.map(poi => (
                  <button
                    key={poi.id}
                    onClick={() => setActive(poi)}
                    className="font-sans text-xs font-medium rounded-full px-3 py-1.5 transition-all duration-300"
                    style={{
                      background: active.id === poi.id ? TYPE_STYLES[poi.type].fill : 'rgba(244,240,232,0.05)',
                      color: active.id === poi.id ? 'var(--cream)' : 'rgba(244,240,232,0.4)',
                      border: `1px solid ${active.id === poi.id ? TYPE_STYLES[poi.type].ring : 'rgba(244,240,232,0.08)'}`,
                    }}
                  >
                    {poi.name.split('·')[0].split(' de ')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
