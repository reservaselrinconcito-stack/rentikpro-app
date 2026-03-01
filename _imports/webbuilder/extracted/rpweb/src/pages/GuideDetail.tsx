import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, MapPin, Calendar, CheckCircle2, Info, ExternalLink, Share2, BookOpen, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';
import { useSiteConfig } from '../site-config/useSiteConfig';
import { useThemeTokens } from '../themes/useThemeTokens';

const GuideDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const tokens = useThemeTokens();

  const guides = siteConfig.content.guides || [];
  const guide = guides.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/guias" replace />;
  }

  // Cast generic fields
  const sections = (guide.sections as any[]) || [];
  const safetyNotes = (guide.safetyNotes as string[]) || [];
  const faqs = (guide.faqs as any[]) || [];
  const sources = (guide.sources as string[]) || [];
  const photos = (guide.photos as string[]) || [];

  return (
    <div className="min-h-screen bg-stone-50 pb-20" style={{ fontSize: `${tokens.fontScale}rem` }}>
      {/* Hero Header */}
      <div className="relative h-[60vh] min-h-[500px] overflow-hidden">
        <img
          src={(guide.imageUrl as string) || photos[0]}
          alt={guide.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent"></div>

        {/* Navigation */}
        <div className="absolute top-24 left-6 md:left-20 flex items-center gap-4">
          <Link to="/guias" className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 backdrop-blur-md px-4 py-2 border border-white/20" style={{ borderRadius: tokens.radius }}>
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Todas las Guías</span>
          </Link>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-16 left-6 md:left-20 right-6 max-w-5xl text-white">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <span className="text-white text-[10px] font-black uppercase px-4 py-1.5 shadow-lg" style={{ backgroundColor: tokens.accentColor, borderRadius: tokens.radius }}>
              {(guide.category as string).replace('_', ' ')}
            </span>
            <div className="flex items-center gap-4 text-white/60 text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><MapPin size={12} className="text-orange-500" /> Matarraña</span>
              <span className="flex items-center gap-1.5"><BookOpen size={12} className="text-orange-500" /> 5 min lectura</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-7xl font-serif mb-8 leading-[1.1] drop-shadow-xl max-w-4xl">
            {guide.title}
          </h1>
          <p className="text-white/70 text-xl font-light leading-relaxed max-w-3xl border-l-2 border-orange-500 pl-8">
            {(guide.intro as string) || (guide.seoDescription as string)}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 mt-16">
        <div className="grid lg:grid-cols-12 gap-16">

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-20">

            {/* Sections */}
            <div className="space-y-20">
              {sections.map((section, idx) => (
                <section key={idx} className="group">
                  <div className="flex items-baseline gap-6 mb-8 underline decoration-stone-200 underline-offset-[16px]">
                    <span className="text-4xl font-serif text-stone-200 italic">0{idx + 1}</span>
                    <h2 className="text-3xl font-serif text-stone-900 leading-tight">
                      {section.title}
                    </h2>
                  </div>
                  <div className="space-y-6">
                    {section.paragraphs.map((p: string, pIdx: number) => (
                      <p key={pIdx} className="text-stone-600 text-lg font-light leading-relaxed first-letter:text-stone-900 first-letter:float-left first-letter:text-5xl first-letter:mr-3 first-letter:font-serif first-letter:mt-1">
                        {p}
                      </p>
                    ))}
                    {section.bullets && (
                      <ul
                        className="grid md:grid-cols-1 gap-4 mt-8 bg-white p-8 border border-stone-100 transition-shadow hover:shadow-md"
                        style={{ borderRadius: tokens.radius, boxShadow: tokens.shadow }}
                      >
                        {section.bullets.map((bullet: string, bIdx: number) => (
                          <li key={bIdx} className="flex items-start gap-4 text-stone-600 font-light">
                            <span className="mt-1.5 shrink-0" style={{ color: tokens.accentColor }}>
                              <CheckCircle2 size={16} />
                            </span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}
            </div>

            {/* FAQ Accordion-style (simplified) */}
            {faqs.length > 0 && (
              <section
                className="bg-white p-10 md:p-16 border border-stone-100"
                style={{ borderRadius: tokens.radius, boxShadow: tokens.shadow }}
              >
                <div className="text-center mb-12">
                  <HelpCircle size={40} className="mx-auto mb-4" style={{ color: tokens.accentColor }} />
                  <h2 className="text-3xl font-serif text-stone-900">Preguntas Frecuentes</h2>
                </div>
                <div className="space-y-8 max-w-3xl mx-auto">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="group border-b border-stone-100 pb-8 last:border-0">
                      <h4 className="text-lg font-serif text-stone-900 mb-3 hover:opacity-80 transition-colors flex items-start gap-3">
                        <span className="mt-1" style={{ color: tokens.accentColor }}>Q.</span> {faq.q}
                      </h4>
                      <p className="text-stone-500 font-light leading-relaxed pl-8">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-12">
            <div className="sticky top-28 space-y-12">

              {/* Safety Notes Card */}
              {safetyNotes.length > 0 && (
                <div
                  className="p-10 text-white relative overflow-hidden"
                  style={{ backgroundColor: tokens.primaryColor, borderRadius: tokens.radius, boxShadow: tokens.shadow }}
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                  <div className="flex items-center gap-3 mb-8">
                    <AlertTriangle style={{ color: tokens.accentColor }} size={24} />
                    <h3 className="text-2xl font-serif">Seguridad</h3>
                  </div>
                  <ul className="space-y-6">
                    {safetyNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-4 text-white/70 text-sm font-light leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: tokens.accentColor }}></span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related/Action Card */}
              <div
                className="bg-white p-10 border border-stone-100 text-center"
                style={{ borderRadius: tokens.radius, boxShadow: tokens.shadow }}
              >
                <img
                  src={photos[1] || photos[0]}
                  alt="Explore more"
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-6 border-4 border-stone-50"
                />
                <h3 className="text-xl font-serif text-stone-900 mb-4">¿Te ha gustado esta guía?</h3>
                <p className="text-stone-500 text-sm font-light mb-8">
                  Reserva tu estancia en {siteConfig.brand.name} y descubre todos estos rincones en persona.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-3 text-white px-8 py-4 font-bold transition-all group"
                  style={{ backgroundColor: tokens.primaryColor, borderRadius: tokens.radius, boxShadow: tokens.shadow }}
                >
                  Ver disponibilidad
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Sources */}
              {sources.length > 0 && (
                <div className="bg-emerald-50/50 rounded-2xl p-8 border border-emerald-100/50 text-center">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 mb-6">Fuentes oficiales</h4>
                  <div className="flex flex-col gap-4">
                    {sources.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-emerald-600 hover:text-emerald-900 transition-colors break-all flex items-center justify-center gap-2 group"
                      >
                        <ExternalLink size={10} className="shrink-0 group-hover:scale-110" /> {url.replace('https://', '')}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Share */}
              <button className="flex items-center justify-center gap-3 w-full text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-stone-900 transition-colors">
                <Share2 size={14} /> Compartir esta guía
              </button>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GuideDetail;
