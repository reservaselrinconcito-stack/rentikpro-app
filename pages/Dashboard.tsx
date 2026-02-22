
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { Property, Booking, ChannelConnection, Traveler, WebSite, Conversation, Message } from '../types';
import { TrendingUp, Home, Calendar, Users, AlertTriangle, RefreshCw, CheckCircle2, ArrowRight, Sparkles, Globe, MessageSquare, ExternalLink, Download, Building2, CalendarRange } from 'lucide-react';
import { useDataRefresh } from '../services/dataRefresher';
import { APP_VERSION } from '../src/version';
import { isConfirmedBooking, isSameDay, isOccupiedToday } from '../utils/bookingClassification';
import { getBookingDisplayName } from '../utils/bookingDisplay';

const StatCard = ({ label, value, icon: Icon, color, onClick }: { label: string, value: string | number, icon: any, color: string, onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`glass p-8 rounded-3xl border border-white/40 shadow-xl shadow-slate-200/50 flex flex-col items-start gap-4 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-1 active:scale-95' : ''}`}
  >
    <div className={`p-4 rounded-2xl ${color} shadow-lg shadow-current/20`}>
      <Icon size={28} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-800 tabular-nums">{value}</h3>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // -- EXISTING STATE --
  const [stats, setStats] = useState({
    properties: 0,
    bookings: 0,
    revenue: 0,
    travelers: 0
  });

  const [cmStats, setCmStats] = useState({
    activeConnections: 0,
    conflicts: 0,
    errors: 0
  });

  const [opStats, setOpStats] = useState({
    arrivalsToday: 0,
    departuresToday: 0,
    activeToday: 0
  });

  const [travelers, setTravelers] = useState<Traveler[]>([]);

  // -- NEW STATE FOR ENHANCEMENTS --
  const [upcomingArrivals, setUpcomingArrivals] = useState<(Booking & { apartment_name?: string })[]>([]);
  const [provisionalArrivals, setProvisionalArrivals] = useState<(Booking & { apartment_name?: string })[]>([]);
  const [pendingCheckins, setPendingCheckins] = useState<Booking[]>([]);
  const [todayBirthdays, setTodayBirthdays] = useState<Traveler[]>([]);
  const [recentMessages, setRecentMessages] = useState<Conversation[]>([]);
  const [pendingCleanings, setPendingCleanings] = useState<number>(0);
  const [myWebsite, setMyWebsite] = useState<WebSite | null>(null);

  const fetchData = async () => {
    const store = projectManager.getStore();
    const [props, accountingBookings, bookings, txs, connections, travelers, websites, conversations] = await Promise.all([
      store.getProperties(),
      store.getBookingsFromAccounting(),
      store.getBookings(),
      store.getMovements(),
      store.getChannelConnections(),
      store.getTravelers(),
      store.getWebsites(),
      store.getConversations('OPEN')
    ]);

    const apartments = await store.getAllApartments();

    // Cleaning Stats
    const today = new Date().toISOString().split('T')[0];
    const tasks = await store.getCleaningTasks(today, today);
    const pendingTasks = tasks.filter(t => t.status !== 'DONE');
    setPendingCleanings(pendingTasks.length);

    // 1. General Stats
    const revenue = txs
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount_net, 0);

    // Some projects store operational stays in `bookings` without accounting_movements rows.
    // Prefer accounting-derived bookings when available, but fall back to bookings table.
    const confirmedFromAccounting = accountingBookings.filter(b => b.status === 'confirmed');
    const confirmedFromBookings = bookings.filter(b => b.status === 'confirmed');
    const confirmedBookings = confirmedFromAccounting.length > 0 ? confirmedFromAccounting : confirmedFromBookings;

    setStats({
      properties: props.length,
      bookings: confirmedBookings.length,
      revenue,
      travelers: travelers.length
    });

    setTravelers(travelers);

    // 2. Channel Manager Stats
    if (!store) return;

    try {
      const counts = await store.getCounts();
      const settings = await store.getSettings();
      const timezone = settings.default_timezone || 'Europe/Madrid';

      const activePropId = projectManager.getActivePropertyId();

      // Use new specialized selectors with Context
      const arrivals = await store.getUpcomingArrivals(7, activePropId, timezone);
      const provArrivals = await (store as any).getProvisionalArrivals ? await (store as any).getProvisionalArrivals(7, activePropId, timezone) : [];
      const pending = await store.getPendingCheckins(7, activePropId, timezone);
      const birthdays = await store.getBirthdaysToday(activePropId, timezone);
      const messages = await store.getRecentMessages(3);

      // OPERATIONAL CALCULATIONS (D1)
      const todayISO = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

      const arrToday = confirmedBookings.filter(b => isSameDay(b.check_in, todayISO)).length;
      const depToday = confirmedBookings.filter(b => isSameDay(b.check_out, todayISO)).length;
      const activeNow = confirmedBookings.filter(b => isOccupiedToday(b.check_in, b.check_out, todayISO)).length;

      setOpStats({
        arrivalsToday: arrToday,
        departuresToday: depToday,
        activeToday: activeNow
      });

      const website = await store.getMyWebsite();
      const cmConnections = await store.getChannelConnections();

      // Re-evaluating cmStats 
      const cm = {
        activeConnections: cmConnections.filter(c => c.enabled).length,
        conflicts: counts.conflicts || 0,
        errors: cmConnections.filter(c => c.enabled && c.last_status === 'ERROR').length
      };

      setUpcomingArrivals(arrivals);
      setProvisionalArrivals(provArrivals);
      setPendingCheckins(pending.filter(isConfirmedBooking));
      setTodayBirthdays(birthdays);
      setRecentMessages(messages);
      setMyWebsite(website);
      setCmStats(cm);
    } catch (error) {
      console.error("Dashboard load failed:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useDataRefresh(fetchData); // Auto-refresh if data changes elsewhere

  const isEmpty = projectManager.isProjectEmpty();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {isEmpty && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-amber-900">Proyecto sin datos</h3>
              <p className="text-xs text-amber-700 font-medium">Este proyecto está activo pero no contiene datos aún. Puedes importar un archivo o crear nuevas propiedades.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/settings')} className="px-5 py-2.5 bg-white border border-amber-200 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors">
              Ajustes
            </button>
            <button onClick={() => navigate('/importers')} className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-colors">
              Importar
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Panel de Control</h2>
          <p className="text-slate-500">Resumen general de tu negocio de alquiler.</p>
        </div>
      </div>

      {/* 0. ALERTS ROW (Critical Only: Conflicts & Errors) */}
      {(cmStats.conflicts > 0 || cmStats.errors > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          {cmStats.conflicts > 0 && (
            <div onClick={() => navigate('/channel-manager')} className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors group">
              <div className="flex items-center gap-3 text-amber-800">
                <div className="p-2 bg-amber-200 rounded-lg text-amber-800"><AlertTriangle size={20} /></div>
                <div>
                  <h4 className="font-bold text-sm">Conflictos ({cmStats.conflicts})</h4>
                  <p className="text-xs opacity-80">Requieren atención inmediata.</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-amber-400 group-hover:text-amber-700 group-hover:translate-x-1 transition-all" />
            </div>
          )}
          {cmStats.errors > 0 && (
            <div onClick={() => navigate('/channel-manager')} className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-colors group">
              <div className="flex items-center gap-3 text-rose-800">
                <div className="p-2 bg-rose-200 rounded-lg text-rose-800"><RefreshCw size={20} /></div>
                <div>
                  <h4 className="font-bold text-sm">Error Sync ({cmStats.errors})</h4>
                  <p className="text-xs opacity-80">Conexiones fallidas.</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-rose-400 group-hover:text-rose-700 group-hover:translate-x-1 transition-all" />
            </div>
          )}
        </div>
      )}

      {/* 1. OPERATIONAL KPIS (D1) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-[2.5rem] border border-white/40 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center gap-4 group transition-all duration-300 hover:shadow-2xl">
          <div className="p-4 rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <Download size={32} className="rotate-180" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Llegadas Hoy</p>
            <h3 className="text-5xl font-black text-slate-800 tabular-nums">{opStats.arrivalsToday}</h3>
          </div>
          <button
            onClick={() => navigate('/bookings?filter=arrivals_today')}
            className="mt-4 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
          >
            Ver Detalle
          </button>
        </div>

        <div className="glass p-8 rounded-[2.5rem] border border-white/40 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center gap-4 group transition-all duration-300 hover:shadow-2xl">
          <div className="p-4 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
            <Download size={32} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Salidas Hoy</p>
            <h3 className="text-5xl font-black text-slate-800 tabular-nums">{opStats.departuresToday}</h3>
          </div>
          <button
            onClick={() => navigate('/bookings?filter=departures_today')}
            className="mt-4 px-6 py-2 bg-rose-50 text-rose-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95"
          >
            Ver Detalle
          </button>
        </div>

        <div className="glass p-8 rounded-[2.5rem] border border-white/40 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center gap-4 group transition-all duration-300 hover:shadow-2xl">
          <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Reservas Activas</p>
            <h3 className="text-5xl font-black text-slate-800 tabular-nums">{opStats.activeToday}</h3>
          </div>
          <button
            onClick={() => navigate('/bookings?filter=active_today')}
            className="mt-4 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
          >
            Ver Detalle
          </button>
        </div>
      </div>

      {/* 2. SECONDARY KPIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Propiedades" value={stats.properties} icon={Building2} color="bg-indigo-500" onClick={() => navigate('/properties')} />
        <StatCard label="Reservas Totales" value={stats.bookings} icon={CalendarRange} color="bg-emerald-500" onClick={() => navigate('/bookings')} />
        <StatCard label="Limpiezas" value={pendingCleanings} icon={Sparkles} color="bg-pink-500" onClick={() => navigate('/cleaning')} />
        <div className="hidden md:block">
          <StatCard label="Viajeros" value={stats.travelers} icon={Users} color="bg-orange-500" onClick={() => navigate('/travelers')} />
        </div>
      </div>

      {/* 2. OPERATIONAL DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COL: ARRIVALS + MESSAGES */}
        <div className="lg:col-span-2 space-y-8">

          {/* UPCOMING ARRIVALS */}
          <div className="glass p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-white/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Calendar size={120} />
            </div>
            <div className="flex justify-between items-center mb-10 relative z-10">
              <h4 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar size={20} /></div>
                Próximas Llegadas
              </h4>
              <button onClick={() => navigate('/bookings')} className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-full transition-colors">Ver todas</button>
            </div>

            <div className="space-y-3">
              {[...upcomingArrivals, ...provisionalArrivals].length > 0 ? [...upcomingArrivals, ...provisionalArrivals].map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer group/item" onClick={() => navigate('/bookings')}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs relative overflow-hidden">
                      {new Date(b.check_in).getDate()}
                      {b.event_state === 'provisional' && <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[1px]"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{getBookingDisplayName(b, travelers.find(t => t.id === b.traveler_id))}</p>
                      <p className="text-xs text-slate-500">{b.apartment_name} • {b.guests} pax</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {b.event_state === 'provisional' ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Pendiente (iCal)</span>
                          <button className="text-[9px] font-black text-white bg-amber-600 px-2 py-0.5 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity">Revisar</button>
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {b.status === 'confirmed' ? 'CONFIRMADA' : b.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <div className="mb-2">No hay llegadas previstas esta semana.</div>
                  <button onClick={() => navigate('/bookings')} className="text-indigo-600 font-bold text-xs">Ir a Reservas</button>
                </div>
              )}
            </div>
          </div>

          {/* RECENT MESSAGES */}
          <div className="glass p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-white/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <MessageSquare size={120} />
            </div>
            <div className="flex justify-between items-center mb-10 relative z-10">
              <h4 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-violet-50 text-violet-600 rounded-xl"><MessageSquare size={20} /></div>
                Buzón de Mensajes
              </h4>
              <button onClick={() => navigate('/communications')} className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-full transition-colors">Buzón</button>
            </div>

            <div className="space-y-3">
              {recentMessages.length > 0 ? recentMessages.map(c => (
                <div key={c.id} onClick={() => navigate(`/communications?search=${c.id}`)} className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-700">{c.subject || 'Sin asunto'}</span>
                      {c.unread_count > 0 && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(c.last_message_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 group-hover:text-slate-700 transition-colors">
                    {c.last_message_preview || 'Sin vista previa'}
                  </p>
                </div>
              )) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300"><MessageSquare size={20} /></div>
                  <div className="mb-2">Buzón al día. No hay mensajes recientes.</div>
                  <button onClick={() => navigate('/communications')} className="text-indigo-600 font-bold text-xs">Ir a Comunicaciones</button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COL: WEBSITE + PENDING + BIRTHDAYS + STATUS */}
        <div className="space-y-6">

          {/* PENDING CHECK-INS */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/40 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform"><Users size={24} /></div>
              <span className={`text-4xl font-black ${pendingCheckins.length > 0 ? 'text-indigo-600' : 'text-slate-200'}`}>
                {pendingCheckins.length}
              </span>
            </div>
            <div>
              <h4 className="font-bold text-slate-700">Check-ins Pendientes</h4>
              <p className="text-xs text-slate-400 mb-4">Para hoy y mañana</p>
              {pendingCheckins.length > 0 ? (
                <button onClick={() => navigate('/checkin-scan')} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors">
                  Ver Check-ins
                </button>
              ) : (
                <button onClick={() => navigate('/bookings')} className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-bold transition-colors">
                  Ir a Reservas
                </button>
              )}
            </div>
          </div>

          {/* WEBSITE STATUS CARD */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 border border-white/10 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20"><Globe size={28} /></div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${myWebsite?.status === 'published' ? 'bg-emerald-400/20 border-emerald-400 text-emerald-100' : 'bg-white/10 border-white/20 text-white/60'}`}>
                {myWebsite?.status === 'published' ? 'ONLINE' : 'BORRADOR'}
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-1">{myWebsite ? myWebsite.name : 'Tu Sitio Web'}</h3>
              <p className="text-white/60 text-xs mb-8 truncate font-medium">{myWebsite?.subdomain ? `${myWebsite.subdomain}.rentik.pro` : 'Aún no configurado'}</p>

              <div className="flex gap-3">
                {myWebsite ? (
                  <>
                    <button
                      onClick={() => window.open(`https://${myWebsite.subdomain}.rentik.pro`, '_blank')}
                      className="flex-1 py-4 bg-white text-indigo-900 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
                    >
                      <ExternalLink size={16} /> Abrir Sitio
                    </button>
                    <button onClick={() => navigate('/website-builder?action=export')} className="p-4 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition-all flex items-center justify-center active:scale-95 border border-white/10">
                      <Download size={18} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => navigate('/website-builder')} className="w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg">
                    <Sparkles size={16} /> Crear Web Gratis
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* BIRTHDAYS CARD */}
          <div className={`p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden transition-all border ${todayBirthdays.length > 0 ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-rose-200 border-rose-400' : 'glass border-white/40 text-slate-800 shadow-slate-200/50'}`}>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-3 rounded-2xl ${todayBirthdays.length > 0 ? 'bg-white/20 backdrop-blur-md' : 'bg-pink-50 text-pink-500'}`}>
                <Sparkles size={24} />
              </div>
              <span className={`text-4xl font-black ${todayBirthdays.length > 0 ? 'text-white' : 'text-slate-200'}`}>
                {todayBirthdays.length}
              </span>
            </div>

            <div className="relative z-10">
              <h4 className={`text-lg font-black ${todayBirthdays.length > 0 ? 'text-white' : 'text-slate-800'}`}>
                Cumpleaños Hoy
              </h4>
              {todayBirthdays.length > 0 ? (
                <>
                  <div className="text-white/80 text-xs mb-6 mt-1 line-clamp-2 font-medium">
                    {todayBirthdays.map(t => t.nombre).join(', ')}
                  </div>
                  <button onClick={() => navigate('/marketing')} className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95">
                    Enviar Felicitación
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-400 mb-6 mt-1 font-medium">Ningún huésped cumple años hoy.</p>
                  <button onClick={() => navigate('/travelers')} className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95">
                    Ver Viajeros
                  </button>
                </>
              )}
            </div>
          </div>

          {/* SYSTEM STATUS MINI */}
          <div className="glass p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white/40">
            <h5 className="font-black text-slate-800 mb-6 text-sm uppercase tracking-widest">Estado del Sistema</h5>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-3"><RefreshCw size={16} /> Sincronización</span>
                <span className={`${cmStats.activeConnections > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                  {cmStats.activeConnections > 0 ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-3"><CheckCircle2 size={16} /> Motor Reservas</span>
                <span className="text-emerald-500">OPERATIVO</span>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100/50 grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/settings')} className="py-3 px-3 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                Ajustes
              </button>
              <button onClick={() => window.open('https://help.rentik.pro', '_blank')} className="py-3 px-3 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95">
                Ayuda <ExternalLink size={12} />
              </button>
            </div>
          </div>

        </div>

        <div className="text-right mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          v{APP_VERSION} · {typeof __BUILD_TIME__ !== 'undefined' ? new Date(__BUILD_TIME__).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
        </div>

      </div>
    </div>
  );
};
