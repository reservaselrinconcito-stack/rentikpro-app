import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, MessageSquare, Bot, Smartphone,
  BarChart3, ArrowRight, ExternalLink, ChevronRight,
  Zap, Globe, Lock, CheckCircle2, Users, Clock, RefreshCw
} from 'lucide-react';
import { BRAND } from '../content/brand';
import { useTranslation } from 'react-i18next';
import { useSEO } from '../hooks/useSEO';

const RentikPro: React.FC = () => {
  const { t } = useTranslation();

  useSEO({
    title: t('rentikpro.seo_title', 'RentikPro — Software de gestión para alojamientos rurales'),
    description: t('rentikpro_page.seo_desc'),
  });

  // Arrays defined inside component so t() is available
  const METRICS = [
    { value: '0',    unit: t('rentikpro_page.metric_0_unit'), label: t('rentikpro_page.metric_0_label') },
    { value: '<2h',  unit: t('rentikpro_page.metric_1_unit'), label: t('rentikpro_page.metric_1_label') },
    { value: '100%', unit: t('rentikpro_page.metric_2_unit'), label: t('rentikpro_page.metric_2_label') },
    { value: '3',    unit: t('rentikpro_page.metric_3_unit'), label: t('rentikpro_page.metric_3_label') },
  ];

  const FEATURES = [
    {
      icon: Calendar,
      color: 'text-blue-400',
      bg: 'bg-blue-900/20',
      title: t('rentikpro_page.feat_cal_title'),
      desc: t('rentikpro_page.feat_cal_desc'),
      badge: t('rentikpro_page.feat_cal_badge'),
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      icon: MessageSquare,
      color: 'text-emerald-400',
      bg: 'bg-emerald-900/20',
      title: t('rentikpro_page.feat_inbox_title'),
      desc: t('rentikpro_page.feat_inbox_desc'),
      badge: t('rentikpro_page.feat_inbox_badge'),
      badgeColor: 'bg-blue-500/20 text-blue-400',
    },
    {
      icon: Bot,
      color: 'text-purple-400',
      bg: 'bg-purple-900/20',
      title: t('rentikpro_page.feat_bot_title'),
      desc: t('rentikpro_page.feat_bot_desc'),
      badge: t('rentikpro_page.feat_bot_badge'),
      badgeColor: 'bg-purple-500/20 text-purple-400',
    },
    {
      icon: Smartphone,
      color: 'text-orange-400',
      bg: 'bg-orange-900/20',
      title: t('rentikpro_page.feat_checkin_title'),
      desc: t('rentikpro_page.feat_checkin_desc'),
      badge: t('rentikpro_page.feat_checkin_badge'),
      badgeColor: 'bg-orange-500/20 text-orange-400',
    },
  ];

  const OWNER_BENEFITS = [
    t('rentikpro_page.benefit_0'),
    t('rentikpro_page.benefit_1'),
    t('rentikpro_page.benefit_2'),
    t('rentikpro_page.benefit_3'),
    t('rentikpro_page.benefit_4'),
    t('rentikpro_page.benefit_5'),
  ];

  const TECH_BULLETS = [
    t('rentikpro_page.tech_0'),
    t('rentikpro_page.tech_1'),
    t('rentikpro_page.tech_2'),
    t('rentikpro_page.tech_3'),
  ];

  const OWNER_CARDS = [
    { icon: Globe, title: t('rentikpro_page.owner_card_0_title'), desc: t('rentikpro_page.owner_card_0_desc') },
    { icon: Lock,  title: t('rentikpro_page.owner_card_1_title'), desc: t('rentikpro_page.owner_card_1_desc') },
    { icon: Users, title: t('rentikpro_page.owner_card_2_title'), desc: t('rentikpro_page.owner_card_2_desc') },
    { icon: Clock, title: t('rentikpro_page.owner_card_3_title'), desc: t('rentikpro_page.owner_card_3_desc') },
  ];

  // Day initials come from translations (locale-specific)
  const DAY_INITIALS = t('availability.day_initials').split(',');

  return (
    <div className="bg-white">

      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 bg-stone-950 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-700/15 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-orange-700/20 border border-orange-600/30 text-orange-300 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              {t('rentikpro_page.hero_badge')}
            </div>

            <h1 className="font-serif text-5xl md:text-7xl text-white font-bold leading-[1.05] mb-8">
              {t('rentikpro_page.hero_title_1')}<br />
              <span className="text-orange-400">{t('rentikpro_page.hero_subtitle_2')}</span><br />
              {t('rentikpro_page.hero_subtitle_3')}
            </h1>

            <p className="text-xl text-stone-300 mb-10 leading-relaxed font-light max-w-2xl">
              {t('rentikpro_page.hero_desc')}
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href={BRAND.rentikproLandingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-orange-600 text-white px-8 py-4 rounded-full font-bold hover:bg-orange-500 transition-all flex items-center gap-2 shadow-lg shadow-orange-900/30"
              >
                {t('rentik.cta_visit')} <ExternalLink size={18} />
              </a>
              <Link
                to="/disponibilidad"
                className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-full font-medium hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <Calendar size={18} />
                {t('rentikpro_page.cta_calendar')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── METRICS ───────────────────────────────────────────────────────── */}
      <section className="py-16 bg-stone-900 border-b border-stone-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {METRICS.map((m, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-serif text-orange-400 font-bold">{m.value}</div>
                <div className="text-white font-bold text-sm mt-1">{m.unit}</div>
                <div className="text-stone-500 text-xs mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-stone-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-orange-600 text-xs font-black uppercase tracking-widest mb-3 block">{t('rentikpro_page.four_pillars')}</span>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">
              {t('rentikpro_page.features_title')}
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto font-light">
              {t('rentikpro_page.use_case_note')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-3xl p-10 border border-stone-100 shadow-sm hover:shadow-xl transition-all group card-hover">
                <div className="flex items-start justify-between mb-6">
                  <div className={`${f.bg} w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <f.icon className={f.color} size={30} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${f.badgeColor}`}>
                    {f.badge}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-3">{f.title}</h3>
                <p className="text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LIVE DEMO: CALENDAR ───────────────────────────────────────────── */}
      <section className="py-24 bg-white border-t border-stone-100">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
            <div>
              <span className="text-orange-600 text-xs font-black uppercase tracking-widest mb-4 block">{t('rentikpro_page.live_demo')}</span>
              <h2 className="font-serif text-4xl text-stone-900 mb-6 leading-tight">
                {t('rentikpro_page.features_title')}<br />
                <span className="text-orange-600">{t('rentikpro_page.works_with')}</span>
              </h2>
              <ul className="space-y-3 mb-8">
                {TECH_BULLETS.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-stone-700">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="font-medium text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/disponibilidad"
                className="inline-flex items-center gap-2 font-bold text-stone-900 border-b-2 border-orange-500 pb-1 hover:text-orange-700 hover:border-orange-700 transition-colors"
              >
                {t('rentikpro_page.cta_calendar')} <ArrowRight size={18} />
              </Link>
            </div>

            {/* Fake "system panel" visual */}
            <div className="bg-stone-900 rounded-[2rem] p-1 shadow-2xl shadow-stone-900/30">
              <div className="bg-stone-800 rounded-[1.75rem] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">rentikpro.app/calendar</span>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    {t('rentikpro_page.feat_cal_badge')}
                  </div>
                </div>

                {/* Calendar grid mockup */}
                <div className="bg-stone-900 rounded-2xl p-4">
                  <div className="text-white text-sm font-bold text-center mb-4 capitalize">
                    {new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {DAY_INITIALS.map((d, i) => (
                      <div key={i} className="text-stone-500 text-[10px] font-bold">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const patterns = [false,false,true,true,true,false,false,false,true,true,true,true,false,false,true,true,false,false,false,false,false,false,true,true,true,false,false,false];
                      const isOccupied = patterns[i];
                      return (
                        <div
                          key={i}
                          className={`h-7 w-full rounded-full flex items-center justify-center text-xs font-medium ${
                            isOccupied
                              ? 'bg-stone-600 text-stone-400 line-through'
                              : 'bg-orange-700/30 text-orange-300 cursor-pointer hover:bg-orange-600/40'
                          }`}
                        >
                          {i + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-stone-500 text-xs">{t('rentikpro_page.last_sync')}</span>
                  <div className="flex items-center gap-2">
                    <RefreshCw size={12} className="text-emerald-400 animate-spin-slow" />
                    <span className="text-emerald-400 text-xs font-bold">{t('rentikpro_page.synced')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── OWNER SECTION ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-stone-50 border-t border-stone-100">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-orange-600 text-xs font-black uppercase tracking-widest mb-4 block">{t('rentikpro_page.for_owners')}</span>
              <h2 className="font-serif text-4xl text-stone-900 mb-6">
                {t('rentik.owner_title')}<br />
                <span className="text-orange-600">{t('rentikpro_page.for_you')}</span>
              </h2>
              <p className="text-stone-500 leading-relaxed mb-8">
                {t('rentik.owner_desc')}
              </p>

              <ul className="space-y-3 mb-10">
                {OWNER_BENEFITS.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                      <ChevronRight size={12} className="text-orange-600" />
                    </div>
                    <span className="text-stone-700 text-sm font-medium">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-4">
                <a
                  href={BRAND.rentikproLandingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-orange-600 text-white px-8 py-4 rounded-full font-bold hover:bg-orange-500 transition-all flex items-center gap-2"
                >
                  {t('rentik.cta_try_free')} <ExternalLink size={16} />
                </a>
                <a
                  href={BRAND.rentikproContactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-stone-200 text-stone-700 px-8 py-4 rounded-full font-medium hover:bg-stone-50 transition-all"
                >
                  {t('rentik.cta_talk_expert')}
                </a>
              </div>
            </div>

            {/* Benefits visual */}
            <div className="space-y-4">
              {OWNER_CARDS.map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-stone-100 flex items-start gap-4 hover:shadow-md transition-shadow">
                  <div className="bg-orange-50 w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={22} className="text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 mb-1">{title}</h4>
                    <p className="text-stone-500 text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-stone-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-700/15 rounded-full blur-[120px]" />
        </div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="font-serif text-4xl md:text-5xl text-white mb-6">
            {t('rentikpro_page.hero_title_1')}<br />
            <span className="text-orange-400">{t('rentikpro_page.hero_subtitle_2')}</span>
          </h2>
          <p className="text-stone-400 text-xl mb-10 font-light max-w-2xl mx-auto">
            {t('rentikpro_page.hero_desc')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href={BRAND.rentikproLandingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-orange-600 text-white px-10 py-5 rounded-full font-bold hover:bg-orange-500 transition-all text-lg shadow-lg shadow-orange-900/30"
            >
              {t('rentik.cta_try_free')}
            </a>
            <Link
              to="/contacto"
              className="bg-white/10 border border-white/20 text-white px-10 py-5 rounded-full font-bold hover:bg-white/20 transition-all text-lg"
            >
              {t('rentik.cta_ask')}
            </Link>
          </div>
          <p className="text-stone-600 text-xs mt-6">{t('rentikpro_page.use_case_note')}</p>
        </div>
      </section>

    </div>
  );
};

export default RentikPro;
