import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, MapPin, Calendar, CheckCircle2, Info, ExternalLink, Share2 } from 'lucide-react';
import { EXPERIENCES } from '../content/experiences';

const ExperienceDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  const experience = EXPERIENCES.find(e => e.slug === slug);

  if (!experience) {
    return <Navigate to="/experiencias" replace />;
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Hero Header */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <img
          src={experience.photos[0]}
          alt={experience.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent"></div>

        {/* Breadcrumb / Back */}
        <div className="absolute top-24 left-6 md:left-20">
          <Link to="/experiencias" className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">{t('nav.experiences', 'Ver todas')}</span>
          </Link>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-12 left-6 md:left-20 right-6 max-w-4xl text-white">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-orange-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
              {experience.category.replace('_', ' ')}
            </span>
            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              <MapPin size={10} className="text-emerald-400" /> {experience.town}, {experience.area}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-serif mb-6 leading-tight drop-shadow-md">
            {experience.title}
          </h1>
          <p className="text-white/80 text-lg font-light leading-relaxed max-w-2xl">
            {experience.shortSummary}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 mt-12">
        <div className="grid lg:grid-cols-12 gap-12">

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">

            {/* Highlights */}
            <section className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-stone-100">
              <h2 className="text-2xl font-serif text-stone-900 mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm">01</span>
                Lo más destacado
              </h2>
              <ul className="grid md:grid-cols-2 gap-6">
                {experience.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-4 group">
                    <CheckCircle2 size={18} className="text-emerald-500 mt-1 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-stone-600 font-light leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Practical Info */}
            <section className="bg-stone-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <h2 className="text-2xl font-serif mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-sm">02</span>
                Información Práctica
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                {experience.practicalInfo.map((info, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <Info size={18} className="text-orange-400 mt-1 shrink-0" />
                    <p className="text-white/70 font-light text-sm leading-relaxed">{info}</p>
                  </div>
                ))}
              </div>
              <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-8 items-center text-[10px] uppercase tracking-widest font-black">
                <div className="flex items-center gap-2">
                  <Calendar className="text-orange-500" size={12} />
                  Estacionalidad: <span className="text-white">{experience.seasonality}</span>
                </div>
                {experience.tags.map(tag => (
                  <span key={tag} className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/40">
                    #{tag}
                  </span>
                ))}
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-28 space-y-8">

              {/* CTA Card */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-stone-100 text-center">
                <h3 className="text-xl font-serif text-stone-900 mb-4">¿Quieres vivir esta experiencia?</h3>
                <p className="text-stone-500 text-sm font-light mb-8 px-4">
                  Estamos encantados de ayudarte a organizar tu estancia y recomendarte los mejores momentos para tu visita.
                </p>
                <Link
                  to={`/contacto?msg=${encodeURIComponent(`Hola, estoy interesado en la experiencia: ${experience.title}`)}`}
                  className="block w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg"
                >
                  Contactar para más info
                </Link>
                <button className="flex items-center justify-center gap-2 w-full mt-4 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-stone-900 transition-colors">
                  <Share2 size={12} /> Compartir experiencia
                </button>
              </div>

              {/* Verification Box */}
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex gap-4 items-start">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 mt-1 shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm mb-1 line-tight">{t('common.verify_content')}</h4>
                  <p className="text-[10px] text-stone-500 leading-relaxed uppercase tracking-wider font-medium">
                    Información extraída de fuentes oficiales y turismo regional (actualizado 2026).
                  </p>
                  <div className="mt-4 space-y-2">
                    {experience.sources.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-emerald-700 font-bold hover:underline transition-all truncate group"
                        style={{ fontSize: '9px' }}
                      >
                        <ExternalLink size={10} className="shrink-0 group-hover:scale-110" /> {url.replace('https://', '')}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExperienceDetail;
