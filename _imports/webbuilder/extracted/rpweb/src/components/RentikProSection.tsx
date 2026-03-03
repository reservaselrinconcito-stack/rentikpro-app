import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Zap, MessageSquare, Bot, Calendar, ShieldCheck,
  CheckCircle, ArrowRight, Wifi, Clock
} from 'lucide-react';

export const RentikProSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-28 bg-stone-900 text-white relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-700/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-900/15 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3" />
      </div>

      <div className="container mx-auto px-6 relative z-10">

        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-orange-700/20 border border-orange-600/30 text-orange-300 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
            Gestionado con RentikPro
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-white mb-6 leading-tight">
            La tecnología invisible<br className="hidden md:block" />
            <em className="text-orange-400 not-italic"> de tu descanso</em>
          </h2>
          <p className="text-stone-400 text-lg font-light leading-relaxed">
            Desde la primera consulta hasta el check-out, todo funciona sin fricción.
            Eso es lo que RentikPro hace por El Rinconcito — y por cualquier alojamiento rural.
          </p>
        </div>

        {/* ─── Feature Cards ───────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">

          {/* Card 1: Calendar */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-orange-600/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-orange-700/20 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Calendar className="text-orange-400" size={28} />
              </div>
              <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              {t('rentik.features.calendar_title', 'Disponibilidad en tiempo real')}
            </h3>
            <p className="text-stone-400 text-sm leading-relaxed font-light">
              {t('rentik.features.calendar_desc', 'Sincronización instantánea con todas las plataformas. Sin overbookings, sin esperas.')}
            </p>
            <div className="mt-6 flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-stone-400 text-xs">Booking · Airbnb · Directo</span>
            </div>
          </div>

          {/* Card 2: Unified Inbox */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-orange-600/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-orange-700/20 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="text-orange-400" size={28} />
              </div>
              <span className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Unificado</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              {t('rentik.features.inbox_title', 'Buzón unificado')}
            </h3>
            <p className="text-stone-400 text-sm leading-relaxed font-light">
              {t('rentik.features.inbox_desc', 'WhatsApp + Email + plataformas en un solo hilo. Respondemos al instante.')}
            </p>
            <div className="mt-6 flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-stone-400 text-xs">WhatsApp · Gmail · Booking</span>
            </div>
          </div>

          {/* Card 3: Smart Chatbot */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-orange-600/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-orange-700/20 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Bot className="text-orange-400" size={28} />
              </div>
              <span className="text-stone-500 text-[10px] font-black uppercase tracking-widest">IA</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              {t('rentik.features.bot_title', 'Asistente 24/7')}
            </h3>
            <p className="text-stone-400 text-sm leading-relaxed font-light">
              {t('rentik.features.bot_desc', 'Respuestas automáticas inteligentes. El asistente de este site funciona con RentikPro.')}
            </p>
            <div className="mt-6 flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-stone-400 text-xs">Pruébalo → icono inferior derecho</span>
            </div>
          </div>
        </div>

        {/* ─── Trust Strip ─────────────────────────────────────────────────── */}
        <div className="border-t border-white/10 pt-10 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Zap, label: 'Sync instantáneo', sub: 'todas las plataformas' },
              { icon: ShieldCheck, label: 'Sin overbooking', sub: 'garantizado' },
              { icon: Wifi, label: 'Check-in digital', sub: '100% sin papel' },
              { icon: Clock, label: 'Soporte 24/7', sub: 'para propietarios' },
            ].map(({ icon: Icon, label, sub }, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Icon size={22} className="text-orange-400" />
                <p className="text-white font-bold text-sm">{label}</p>
                <p className="text-stone-500 text-xs">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── CTAs ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <Link
            to="/disponibilidad"
            className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-full font-bold transition-all shadow-lg shadow-orange-900/30 flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <Calendar size={18} />
            Ver disponibilidad en tiempo real
          </Link>
          <Link
            to="/rentikpro"
            className="px-8 py-4 bg-transparent border border-white/20 text-white rounded-full font-medium hover:bg-white/10 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
          >
            ¿Eres propietario? Descubre RentikPro
            <ArrowRight size={16} />
          </Link>
        </div>

      </div>
    </section>
  );
};
