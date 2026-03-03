import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, Filter, MapPin, Calendar, ExternalLink, MessageSquare } from 'lucide-react';
import { EXPERIENCES, ExperienceCategory } from '../content/experiences';
import { useChat } from '../context/ChatContext';

const Experiences: React.FC = () => {
  const { t } = useTranslation();
  const { openChat } = useChat();
  const [filter, setFilter] = useState<ExperienceCategory | 'all'>('all');

  const categories: { key: ExperienceCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'deportivo', label: 'Deporte y Aventura' },
    { key: 'gastronomia', label: 'Gastronomía' },
    { key: 'estrellas', label: 'Astroturismo' },
    { key: 'aire_y_agua', label: 'Aire y Agua' },
    { key: 'zonas_de_bano', label: 'Zonas de Baño' },
    { key: 'cultural', label: 'Cultura' }
  ];

  const filteredExperiences = filter === 'all'
    ? EXPERIENCES
    : EXPERIENCES.filter(e => e.category === filter);

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-orange-600 text-[10px] font-black uppercase tracking-widest mb-4 block underline decoration-orange-200 underline-offset-8">
            Matarraña Experiences
          </span>
          <h1 className="text-4xl md:text-6xl font-serif text-stone-900 mb-6 font-medium leading-tight">
            Descubre el latido real del Matarraña
          </h1>
          <p className="text-stone-500 text-lg font-light leading-relaxed mb-6">
            Hemos seleccionado las experiencias más auténticas, desde la inauguración del nuevo Bike Park hasta los rincones más profundos de nuestra gastronomía y cultura.
          </p>
          <button
            onClick={openChat}
            className="inline-flex items-center gap-2 text-stone-400 hover:text-orange-600 transition-colors text-xs font-bold uppercase tracking-widest border border-stone-200 px-4 py-2 rounded-full hover:border-orange-200 hover:bg-orange-50"
          >
            <MessageSquare size={14} />
            ¿Buscas algo específico? Preguntar al asistente
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredExperiences.map(exp => (
            <Link
              to={`/experiencias/${exp.slug}`}
              key={exp.slug}
              className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-stone-100 flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <img
                  src={exp.photos[0]}
                  alt={exp.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur-sm text-stone-900 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm">
                    {exp.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="p-8 flex flex-col grow">
                <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                  <MapPin size={10} className="text-orange-500" />
                  {exp.town}
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
                    {exp.tags.slice(0, 2).map(tag => (
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
      </div>
    </div>
  );
};

export default Experiences;
