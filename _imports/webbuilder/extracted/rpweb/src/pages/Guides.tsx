import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, Filter, BookOpen, MapPin, Sparkles, Clock } from 'lucide-react';
import { useSiteConfig } from '../site-config/useSiteConfig';
import { useThemeTokens } from '../themes/useThemeTokens';

const GuidesList: React.FC = () => {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const tokens = useThemeTokens();
  const [filter, setFilter] = useState<string | 'all'>('all');

  const guides = siteConfig.content.guides || [];

  const categories = [
    { key: 'all', label: 'Todos' },
    { key: 'aire_y_agua', label: 'Naturaleza' },
    { key: 'zonas_de_bano', label: 'Bañarse' },
    { key: 'cultural', label: 'Pueblos' },
    { key: 'gastronomia', label: 'Comer' }
  ];

  const filteredGuides = filter === 'all'
    ? guides
    : guides.filter(g => g.category === filter);

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-20" style={{ fontSize: `${tokens.fontScale}rem` }}>
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="max-w-3xl mb-16 text-center mx-auto">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 block" style={{ color: tokens.accentColor }}>
            Guías Locales
          </span>
          <h1 className="text-4xl md:text-6xl font-serif text-stone-900 mb-6 font-medium">
            El Manual del Matarraña
          </h1>
          <p className="text-stone-500 text-lg font-light leading-relaxed">
            Consejos de expertos y guías detalladas para que no te pierdas nada durante tu estancia en {siteConfig.brand.name}.
          </p>
        </div>

        {guides.length > 0 ? (
          <>
            {/* Filter */}
            <div className="flex justify-center flex-wrap gap-2 mb-16">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setFilter(cat.key)}
                  className={`px-8 py-2 transition-all border text-xs font-bold uppercase tracking-widest`}
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
            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {filteredGuides.map(guide => (
                <Link
                  to={`/guias/${guide.slug}`}
                  key={guide.slug}
                  className="group block relative overflow-hidden transition-all duration-500 border border-stone-100 flex flex-col"
                  style={{
                    backgroundColor: tokens.secondaryBg || 'white',
                    borderRadius: tokens.radius,
                    boxShadow: tokens.shadow
                  }}
                >
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <img
                      src={(guide.imageUrl as string) || (guide.photos as string[])?.[0]}
                      alt={guide.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent"></div>
                    <div className="absolute top-6 left-6">
                      <span className="text-white text-[10px] font-black uppercase px-4 py-1 shadow-sm" style={{ backgroundColor: tokens.accentColor, borderRadius: tokens.radius }}>
                        {typeof guide.category === 'string' ? guide.category.replace('_', ' ') : ''}
                      </span>
                    </div>
                  </div>
                  <div className="p-10 flex flex-col grow">
                    <h3 className="text-2xl md:text-3xl font-serif text-stone-900 mb-4 group-hover:text-orange-600 transition-colors">
                      {guide.title}
                    </h3>
                    <p className="text-stone-500 font-light text-sm leading-relaxed mb-8 line-clamp-3">
                      {(guide.intro as string) || (guide.seoDescription as string) || guide.content}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400">
                        <Clock size={12} className="text-orange-500" />
                        5 min lectura
                      </div>
                      <span className="w-10 h-10 rounded-full bg-stone-50 text-stone-900 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all transform group-hover:rotate-45 shadow-sm">
                        <ChevronRight size={20} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {filter !== 'all' && filteredGuides.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-stone-200 mt-12 max-w-6xl mx-auto">
                <Sparkles size={48} className="mx-auto mb-4 text-stone-200" />
                <p className="text-stone-400 font-light">Estamos redactando nuevas guías para esta categoría.</p>
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
              <BookOpen size={40} />
            </div>
            <h2 className="text-3xl font-serif text-stone-900 mb-4">Guías en preparación</h2>
            <p className="text-stone-500 font-light leading-relaxed mb-8">
              Estamos documentando los mejores secretos de la comarca: rutas desconocidas, los mejores momentos para ver las estrellas y dónde encontrar el producto local directo de almazara.
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

export default GuidesList;
