import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, BookOpen, AlertTriangle, HelpCircle, CheckCircle2, ExternalLink, ArrowRight } from 'lucide-react';
import { GUIDES } from '../content/guides';

const GuideDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  const guide = GUIDES.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/guias" replace />;
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">

      {/* Article Header */}
      <header className="bg-stone-900 pt-32 pb-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="mb-8">
            <Link to="/guias" className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
              <ChevronLeft size={16} /> {t('guides.back')}
            </Link>
          </div>
          <span className="bg-orange-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full mb-6 inline-block">
            Guía Profesional - {guide.category.replace('_', ' ')}
          </span>
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-8 max-w-4xl mx-auto leading-tight">
            {guide.title}
          </h1>
          <div className="flex items-center justify-center gap-6 text-stone-500 text-[10px] font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <BookOpen size={14} className="text-orange-500" /> 2026 Edition
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Fuentes Verificadas
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 -mt-10">
        <div className="grid lg:grid-cols-12 gap-12">

          {/* Main Article */}
          <article className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-xl border border-stone-100">

              <p className="text-xl text-stone-500 font-light leading-relaxed mb-16 italic border-l-4 border-orange-200 pl-8">
                {guide.intro}
              </p>

              {/* Sections */}
              <div className="space-y-20">
                {guide.sections.map((section, idx) => (
                  <section key={idx}>
                    <h2 className="text-3xl font-serif text-stone-900 mb-8">{section.title}</h2>
                    <div className="space-y-6">
                      {section.paragraphs.map((p, pIdx) => (
                        <p key={pIdx} className="text-stone-600 font-light leading-relaxed text-lg">
                          {p}
                        </p>
                      ))}
                      {section.bullets && (
                        <ul className="grid sm:grid-cols-2 gap-4 pt-4">
                          {section.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="flex items-start gap-3 bg-stone-50 p-4 rounded-xl border border-stone-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0"></span>
                              <span className="text-stone-700 text-sm font-medium">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                ))}
              </div>

              {/* Safety Notes */}
              <div className="mt-20 bg-red-50 rounded-3xl p-8 md:p-12 border border-red-100 relative overflow-hidden">
                <AlertTriangle className="absolute -right-8 -bottom-8 text-red-100 w-48 h-48 -rotate-12" />
                <div className="relative z-10">
                  <h3 className="text-red-900 font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                    <AlertTriangle size={20} /> NOTAS DE SEGURIDAD Y RESPETO
                  </h3>
                  <ul className="space-y-4">
                    {guide.safetyNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-4">
                        <span className="text-red-600 font-black">!</span>
                        <p className="text-red-800/80 font-medium text-sm leading-relaxed">{note}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* FAQ */}
              <div className="mt-20">
                <h3 className="text-2xl font-serif text-stone-900 mb-10 flex items-center gap-3">
                  <HelpCircle className="text-orange-500" /> Preguntas Frecuentes
                </h3>
                <div className="grid gap-6">
                  {guide.faqs.map((faq, idx) => (
                    <div key={idx} className="bg-stone-50 rounded-2xl p-8 border border-stone-100">
                      <h4 className="font-bold text-stone-900 mb-3">{faq.q}</h4>
                      <p className="text-stone-500 font-light text-sm italic">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-8">

              {/* Reference Box */}
              <div className="bg-stone-900 rounded-[2rem] p-8 text-white shadow-2xl">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-orange-400 mb-6">{t('common.sources_refs')}</h4>
                <p className="text-white/50 text-xs font-light mb-8">
                  Esta guía ha sido contrastada con información oficial de organismos regionales y turismo local.
                </p>
                <div className="space-y-3">
                  {guide.sources.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-white/40 hover:text-white transition-all group overflow-hidden"
                    >
                      <ExternalLink size={12} className="shrink-0 group-hover:scale-110" />
                      <span className="text-[10px] font-bold truncate tracking-wider">{url.replace('https://', '')}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Local Tip */}
              <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100 border-dashed">
                <h4 className="font-bold text-orange-900 text-sm mb-4">{t('guides.liked_question')}</h4>
                <p className="text-orange-800/60 text-xs font-light leading-relaxed mb-6">
                  Disponemos de versiones impresas y mapas exclusivos en el alojamiento para nuestros huéspedes.
                </p>
                <Link to="/apartamentos" className="flex items-center gap-2 text-orange-900 font-black text-[10px] uppercase tracking-widest hover:underline">
                  Ver apartamentos <ArrowRight size={14} />
                </Link>
              </div>

            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default GuideDetail;
