import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, Filter, MapPin, Calendar, ExternalLink, MessageSquare, Sparkles } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useSiteConfig } from '../site-config/useSiteConfig';
import { useThemeTokens } from '../themes/useThemeTokens';

const Experiences: React.FC = () => {
  const { t } = useTranslation();
  const { openChat } = useChat();
  const siteConfig = useSiteConfig();
  const tokens = useThemeTokens();
  const [filter, setFilter] = useState<string | 'all'>('all');

  const experiences = siteConfig.content.experiences || [];

  const categories: { key: string | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'deportivo', label: 'Deporte y Aventura' },
    { key: 'gastronomia', label: 'Gastronomía' },
    { key: 'estrellas', label: 'Astroturismo' },
    { key: 'aire_y_agua', label: 'Aire y Agua' },
    { key: 'zonas_de_bano', label: 'Zonas de Baño' },
    { key: 'cultural', label: 'Cultura' }
  ];

  const filteredExperiences = filter === 'all'
    ? experiences
    : experiences.filter(e => e.category === filter);

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-20" style={{ fontSize: `${tokens.fontScale}rem` }}>
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-orange-600 text-[10px] font-black uppercase tracking-widest mb-4 block underline decoration-orange-200 underline-offset-8">
            {siteConfig.brand.shortName || 'Matarraña'} Experiences
          </span>
          <h1 className="text-4xl md:text-6xl font-serif text-stone-900 mb-6 font-medium leading-tight">
            Descubre el latido real del Matarraña
          </h1>
          <p className="text-stone-500 text-lg font-light leading-relaxed mb-6">
            Hemos seleccionado las experiencias más auténticas para que vivas el territorio como un local.
          </p>
          <button
            onClick={openChat}
            className="inline-flex items-center gap-2 text-stone-400 hover:text-orange-600 transition-colors text-xs font-bold uppercase tracking-widest border border-stone-200 px-4 py-2 rounded-full hover:border-orange-200 hover:bg-orange-50"
          >
            <MessageSquare size={14} />
            ¿Buscas algo específico? Preguntar al asistente
          </button>
        </div>

        {experiences.length > 0 ? (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-12">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setFilter(cat.key)}
                  className={`px-6 py-2 transition-all border text-xs font-bold uppercase tracking-widest`}
                  style={{
                    borderRadius: tokens.radius,
                    backgroundColor: filter === cat.key ? tokens.primaryColor : 'white',
                    color: filter === cat.key ? 'white' : '#9ca3af',
                    borderColor: filter === cat.key ? tokens.primaryColor : '#e5e7eb',
                    boxShadow: filter === cat.key ? tokens.shadow : 'none'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredExperiences.map(exp => (
                <Link
                  to={`/experiencias/${exp.slug}`}
                  key={exp.slug}
                  className="group overflow-hidden transition-all duration-500 border border-stone-100 flex flex-col"
                  style={{
                    backgroundColor: tokens.secondaryBg || 'white',
                    borderRadius: tokens.radius,
                    boxShadow: tokens.shadow
                  }}
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img
                      src={exp.photos[0]}
                      alt={exp.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm" style={{ backgroundColor: tokens.accentColor }}>
                        {typeof exp.category === 'string' ? exp.category.replace('_', ' ') : ''}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col grow">
                    <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                      <MapPin size={10} className="text-orange-500" />
                      {exp.town || siteConfig.locations[0].town}
                    </div>
                    <h3 className="text-xl font-serif text-stone-900 mb-4 group-hover:text-orange-600 transition-colors">
                      {exp.title}
                    </h3>
                    <p className="text-stone-500 text-sm font-light leading-relaxed mb-6 line-clamp-3">
                      {exp.shortSummary}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-stone-50">
                      <span className="text-[10px] font-black text-stone-900 uppercase tracking-widest flex items-center gap-1">
                        Ver detalles <ChevronRight size={12} />
                      </span>
                      <div className="flex gap-1">
                        {(exp.tags as string[] || []).slice(0, 2).map(tag => (
                          <span key={tag} className="text-[8px] border border-stone-200 px-2 py-0.5 rounded-full text-stone-400 uppercase font-bold">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {filter !== 'all' && filteredExperiences.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-stone-200">
                <Sparkles size={48} className="mx-auto mb-4 text-stone-200" />
                <p className="text-stone-400 font-light">Próximamente nuevas experiencias en esta categoría.</p>
              </div>
            )}
          </>
        ) : (
          <div
            className="max-w-2xl mx-auto text-center py-20 px-8 border border-stone-100 shadow-sm relative overflow-hidden group"
            style={{ backgroundColor: tokens.secondaryBg || 'white', borderRadius: tokens.radius }}
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: tokens.accentColor }}></div>
            <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-full bg-stone-50 group-hover:scale-110 transition-transform duration-500" style={{ color: tokens.accentColor }}>
              <Sparkles size={40} />
            </div>
            <h2 className="text-3xl font-serif text-stone-900 mb-4">Experiencias en preparación</h2>
            <p className="text-stone-500 font-light leading-relaxed mb-8">
              Estamos curando las mejores vivencias locales para ti. Muy pronto podrás descubrir rutas, gastronomía y rincones secretos recomendados personalmente por nuestro equipo.
            </p>
            <div className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
              <span className="w-8 h-[1px] bg-stone-200"></span>
              Próximamente
              <span className="w-8 h-[1px] bg-stone-200"></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Experiences;
