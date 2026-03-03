import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Tag, MessageSquare } from 'lucide-react';
import { GUIDES } from '../content/guides';
import { ExperienceCategory } from '../content/experiences';
import { useChat } from '../context/ChatContext';

const GuidesList: React.FC = () => {
  const { t } = useTranslation();
  const { openChat } = useChat();
  const [filter, setFilter] = useState<ExperienceCategory | 'all'>('all');

  const categories: { key: ExperienceCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'zonas_de_bano', label: 'Zonas de Baño' },
    { key: 'estrellas', label: 'Astroturismo' },
    { key: 'cultural', label: 'Cultura' },
    { key: 'gastronomia', label: 'Gastronomía' }
  ];

  const filteredGuides = filter === 'all'
    ? GUIDES
    : GUIDES.filter(g => g.category === filter);

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-20">
      <div className="container mx-auto px-6">

        {/* Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-orange-600 text-[10px] font-black uppercase tracking-widest mb-4 block underline decoration-orange-200 underline-offset-8">
            Matarraña Local Guides
          </span>
          <h1 className="text-4xl md:text-6xl font-serif text-stone-900 mb-6 font-medium leading-tight">
            Guías para el viajero consciente
          </h1>
          <p className="text-stone-500 text-lg font-light leading-relaxed mb-6">
            Consejos locales, rutas poco conocidas y todo lo que necesitas saber para disfrutar del Matarraña de forma segura y respetuosa.
          </p>
          <button
            onClick={openChat}
            className="inline-flex items-center gap-2 text-stone-400 hover:text-orange-600 transition-colors text-xs font-bold uppercase tracking-widest border border-stone-200 px-4 py-2 rounded-full hover:border-orange-200 hover:bg-orange-50"
          >
            <MessageSquare size={14} />
            ¿Sobre qué necesitas informarte?
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-12">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${filter === cat.key
                ? 'bg-stone-900 text-white border-stone-900 shadow-lg'
                : 'bg-white text-stone-400 border-stone-200 hover:border-orange-200 hover:text-orange-600'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {filteredGuides.map(guide => (
            <Link
              to={`/guias/${guide.slug}`}
              key={guide.slug}
              className="group bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm hover:shadow-2xl transition-all duration-500 border border-stone-100 flex flex-col md:flex-row gap-8"
            >
              <div className="md:w-1/3 aspect-square rounded-2xl overflow-hidden shrink-0">
                <img
                  src={guide.photos[0]}
                  alt={guide.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="flex flex-col grow">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-stone-50 text-stone-400 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border border-stone-100 italic">
                    {guide.category.replace('_', ' ')}
                  </span>
                  <span className="text-stone-300 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> 5 min lectura
                  </span>
                </div>
                <h3 className="text-2xl font-serif text-stone-900 mb-4 group-hover:text-orange-600 transition-colors">
                  {guide.title}
                </h3>
                <p className="text-stone-500 text-sm font-light leading-relaxed mb-8 line-clamp-3">
                  {guide.seoDescription}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[10px] font-black text-stone-900 uppercase tracking-widest flex items-center gap-2">
                    {t('guides.read_full')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="flex gap-2">
                    <Tag size={12} className="text-stone-200" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredGuides.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
            <BookOpen size={48} className="mx-auto mb-4 text-stone-200" />
            <p className="text-stone-400 font-light">{t('common.shortly_new_guides')}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default GuidesList;
