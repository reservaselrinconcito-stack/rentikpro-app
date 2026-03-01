import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, MessageSquare, Bot, Smartphone, ShieldCheck,
  BarChart3, ArrowRight, ExternalLink, ChevronRight,
  Zap, Globe, Lock, CheckCircle2, Users, Clock, RefreshCw
} from 'lucide-react';
import { useSiteConfig } from '../site-config/useSiteConfig';
import { useSEO } from '../hooks/useSEO';

const METRICS = [
  { value: '0', unit: 'overbookings', label: 'desde que usamos RentikPro' },
  { value: '<2h', unit: 'respuesta', label: 'media a consultas de huéspedes' },
  { value: '100%', unit: 'digital', label: 'check-in sin papel ni llaves' },
  { value: '3', unit: 'plataformas', label: 'sincronizadas en tiempo real' },
];

const FEATURES = [
  {
    icon: Calendar,
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
    title: 'Disponibilidad en tiempo real',
    desc: 'El calendario que ves en esta web está sincronizado con RentikPro. Los datos son exactos al momento, sin actualizaciones manuales.',
    badge: 'Live',
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    icon: MessageSquare,
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/20',
    title: 'Buzón unificado',
    desc: 'WhatsApp, email, Booking.com y Airbnb en un único hilo. Nunca perdemos un mensaje. Respondemos en minutos, no en días.',
    badge: 'Omnicanal',
    badgeColor: 'bg-blue-500/20 text-blue-400',
  },
  {
    icon: Bot,
    color: 'text-purple-400',
    bg: 'bg-purple-900/20',
    title: 'Asistente IA contextual',
    desc: 'El chatbot de este site responde con información real de los apartamentos, actividades y disponibilidad. Entrenado con nuestro contenido.',
    badge: 'IA propia',
    badgeColor: 'bg-purple-500/20 text-purple-400',
  },
  {
    icon: Smartphone,
    color: 'text-orange-400',
    bg: 'bg-orange-900/20',
    title: 'Check-in 100% digital',
    desc: 'Los huéspedes reciben instrucciones automáticas antes de llegar. Acceso con código, sin llaves, sin esperas.',
    badge: 'Sin fricción',
    badgeColor: 'bg-orange-500/20 text-orange-400',
  },
];

const OWNER_BENEFITS = [
  'Sincronización Booking, Airbnb, Vrbo y canales directos',
  'Panel unificado: precios, bloqueos y disponibilidad',
  'Automatización de mensajes pre/post estancia',
  'Estadísticas de ocupación y revenue',
  'Soporte para alojamientos rurales, apartamentos y casas',
  'Onboarding asistido en menos de 48 horas',
];

const RentikPro: React.FC = () => {
  const cfg = useSiteConfig();
  useSEO({
    title: 'RentikPro — Software de gestión para alojamientos rurales',
    description: 'El Rinconcito usa RentikPro para sincronización de calendarios, buzón unificado y check-in digital. Descubre cómo puede ayudarte a ti.',
  });


  return (
    <div className="bg-white">

      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 bg-stone-950 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-700/15 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-orange-700/20 border border-orange-600/30 text-orange-300 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              Caso real — El Rinconcito Matarraña usa RentikPro
            </div>

            <h1 className="font-serif text-5xl md:text-7xl text-white font-bold leading-[1.05] mb-8">
              La tecnología que<br />
              <span className="text-orange-400">hace posible</span><br />
              este alojamiento
            </h1>

            <p className="text-xl text-stone-300 mb-10 leading-relaxed font-light max-w-2xl">
              RentikPro es el sistema de gestión que conecta el calendario de esta web con
              Booking y Airbnb, unifica la comunicación con huéspedes y automatiza el check-in.
              Sin RentikPro, esta web no sería lo que es.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href={cfg.rentikpro.landingUrl ?? 'https://rentikpro.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-orange-600 text-white px-8 py-4 rounded-full font-bold hover:bg-orange-500 transition-all flex items-center gap-2 shadow-lg shadow-orange-900/30"
              >
                Ver RentikPro <ExternalLink size={18} />
              </a>
              <Link
                to="/disponibilidad"
                className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-full font-medium hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <Calendar size={18} />
                Ver el calendario en acción
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
            <span className="text-orange-600 text-xs font-black uppercase tracking-widest mb-3 block">Las 4 patas del sistema</span>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">
              Qué hace RentikPro<br />en este alojamiento
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto font-light">
              No son promesas de marketing. Son funcionalidades activas en El Rinconcito Matarraña ahora mismo.
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
              <span className="text-orange-600 text-xs font-black uppercase tracking-widest mb-4 block">Demo en vivo</span>
              <h2 className="font-serif text-4xl text-stone-900 mb-6 leading-tight">
                El calendario que ves en esta web es real.<br />
                <span className="text-orange-600">Funciona con RentikPro.</span>
              </h2>
              <p className="text-stone-500 leading-relaxed mb-8">
                Cada fecha que aparece como ocupada o disponible está sincronizada en tiempo real
                con el sistema de RentikPro. Sin actualizaciones manuales, sin riesgo de overbooking.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Datos actualizados en menos de 60 segundos',
                  'Caché inteligente por mes para máxima velocidad',
                  'Manejo transparente de errores CORS y tokens',
                  'Preparado para booking directo cuando esté listo',
                ].map((item, i) => (
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
                Ver calendario en acción <ArrowRight size={18} />
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
                    Live
                  </div>
                </div>

                {/* Calendar grid mockup */}
                <div className="bg-stone-900 rounded-2xl p-4">
                  <div className="text-white text-sm font-bold text-center mb-4 capitalize">
                    {new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                      <div key={d} className="text-stone-500 text-[10px] font-bold">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const patterns = [false, false, true, true, true, false, false, false, true, true, true, true, false, false, true, true, false, false, false, false, false, false, true, true, true, false, false, false];
                      const isOccupied = patterns[i];
                      return (
                        <div
                          key={i}
                          className={`h-7 w-full rounded-full flex items-center justify-center text-xs font-medium ${isOccupied
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
                  <span className="text-stone-500 text-xs">Último sync: hace 32s</span>
                  <div className="flex items-center gap-2">
                    <RefreshCw size={12} className="text-emerald-400 animate-spin-slow" />
                    <span className="text-emerald-400 text-xs font-bold">Sincronizado</span>
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
              <span className="text-orange-600 text-xs font-black uppercase tracking-widest mb-4 block">Para propietarios</span>
              <h2 className="font-serif text-4xl text-stone-900 mb-6">
                ¿Gestionas un alojamiento rural?<br />
                <span className="text-orange-600">Esto es para ti.</span>
              </h2>
              <p className="text-stone-500 leading-relaxed mb-8">
                Si te identificas con lo que ves en El Rinconcito — disponibilidad en tiempo real,
                comunicación sin caos, check-in automático — RentikPro puede hacer lo mismo
                por tu alojamiento.
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
                  href={cfg.rentikpro.landingUrl ?? 'https://rentikpro.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-orange-600 text-white px-8 py-4 rounded-full font-bold hover:bg-orange-500 transition-all flex items-center gap-2"
                >
                  Conocer RentikPro <ExternalLink size={16} />
                </a>
                <a
                  href={cfg.rentikpro.contactUrl ?? 'https://rentikpro.com/contacto'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-stone-200 text-stone-700 px-8 py-4 rounded-full font-medium hover:bg-stone-50 transition-all"
                >
                  Hablar con el equipo
                </a>
              </div>
            </div>

            {/* Benefits visual */}
            <div className="space-y-4">
              {[
                { icon: Globe, title: 'Un panel. Todas las plataformas.', desc: 'Booking, Airbnb, Vrbo y directo en un solo lugar.' },
                { icon: Lock, title: 'Sin bloqueos manuales', desc: 'Los calendarios se actualizan solos. No hay trabajo manual.' },
                { icon: Users, title: 'Para cualquier tamaño', desc: '1 apartamento o 20. El sistema escala contigo.' },
                { icon: Clock, title: 'Onboarding en 48h', desc: 'El equipo de RentikPro lo configura todo por ti.' },
              ].map(({ icon: Icon, title, desc }, i) => (
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
            ¿Listo para gestionar tu alojamiento<br />
            <span className="text-orange-400">sin el caos?</span>
          </h2>
          <p className="text-stone-400 text-xl mb-10 font-light max-w-2xl mx-auto">
            El Rinconcito Matarraña es la prueba de que funciona. Ahora es tu turno.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href={cfg.rentikpro.landingUrl ?? 'https://rentikpro.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-orange-600 text-white px-10 py-5 rounded-full font-bold hover:bg-orange-500 transition-all text-lg shadow-lg shadow-orange-900/30"
            >
              Empezar con RentikPro
            </a>
            <Link
              to="/contacto"
              className="bg-white/10 border border-white/20 text-white px-10 py-5 rounded-full font-bold hover:bg-white/20 transition-all text-lg"
            >
              Hablar con Toni y Evelyn
            </Link>
          </div>
          <p className="text-stone-600 text-xs mt-6">El Rinconcito usa RentikPro. Esta web es su caso de uso.</p>
        </div>
      </section>

    </div>
  );
};

export default RentikPro;
