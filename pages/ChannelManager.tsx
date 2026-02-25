
import React, { useState, useEffect, useCallback } from 'react';
import { projectManager } from '../services/projectManager';
import { Property, Apartment, ChannelConnection, Booking, CalendarEvent, PricingDefaults, NightlyRateOverride } from '../types';
import { syncEngine, getProxyUrl } from '../services/syncEngine';
import { syncScheduler, SyncInterval } from '../services/syncScheduler';
import { networkMonitor } from '../services/networkMonitor';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { dateFormat } from '../services/dateFormat';
import { ChannelDetailsModal } from '../components/ChannelDetailsModal';
import { BookingEnrichmentList } from '../components/BookingEnrichmentList';
import { PendingDetailsList } from '../components/PendingDetailsList';
import {
   RefreshCw, Plus, Trash2, Link, AlertTriangle, CheckCircle2,
   ExternalLink, Calendar, Building2, Globe, ShieldAlert, ArrowRight,
   Wifi, Clock, Settings, Play, X, Lock as LockIcon, History as HistoryIcon, ChevronRight, LayoutGrid,
   MoreVertical, Power, HelpCircle, AlertCircle, Server, Copy, Eye, Share2, UploadCloud, Check, CreditCard, BarChart3, Zap, Ban
} from 'lucide-react';
import { iCalExportService } from '../services/iCalExportService';
import { pricingStudioStore } from '../services/pricingStudioStore';
import { toast } from 'sonner';
import { isConfirmedBooking, isProvisionalBlock, isCovered } from '../utils/bookingClassification';

// --- SUBCOMPONENTS ---

const ConnectionBadge = ({ type }: { type: string }) => {
   if (type === 'AIRBNB') return <span className="flex items-center gap-1.5 bg-[#FF5A5F] text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide"><Globe size={10} /> Airbnb</span>;
   if (type === 'BOOKING') return <span className="flex items-center gap-1.5 bg-[#003580] text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide"><Calendar size={10} /> Booking</span>;
   return <span className="flex items-center gap-1.5 bg-slate-600 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide"><Link size={10} /> {type}</span>;
};

const StatusDot = ({ status, enabled, lastSync }: { status: string, enabled: boolean, lastSync: number }) => {
   if (!enabled) return <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Pausado</div>;

   let color = 'bg-slate-300';
   let text = 'Pendiente';
   let textColor = 'text-slate-500';

   if (status === 'OK') { color = 'bg-emerald-500'; text = 'Sincronizado'; textColor = 'text-emerald-600'; }
   else if (status === 'ERROR') { color = 'bg-rose-500'; text = 'Error'; textColor = 'text-rose-600'; }
   else if (status === 'OFFLINE') { color = 'bg-amber-500'; text = 'Offline'; textColor = 'text-amber-600'; }
   else if (status === 'BLOCKED') { color = 'bg-slate-600'; text = 'Bloqueado'; textColor = 'text-slate-700'; }
   else if (status === 'INVALID_TOKEN' || status === 'TOKEN_CADUCADO') { color = 'bg-rose-600'; text = 'Token Caducado'; textColor = 'text-rose-700'; }

   // Check if stale (> 2 hours)
   if (Date.now() - lastSync > 2 * 60 * 60 * 1000 && status === 'OK') {
      color = 'bg-amber-400';
      text = 'Desactualizado';
      textColor = 'text-amber-600';
   }

   return (
      <div className="flex flex-col items-start">
         <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color} shadow-sm`}></div>
            <span className={`${textColor} text-[10px] font-bold uppercase`}>{text}</span>
         </div>
         {lastSync > 0 && <span className="text-[9px] text-slate-400 font-mono pl-3.5 mt-0.5">{dateFormat.formatTimestampForUser(lastSync)}</span>}
      </div>
   );
};
// ... (omitted)

export const ChannelManager: React.FC = () => {
   // Data
   const [properties, setProperties] = useState<Property[]>([]);
   const [apartments, setApartments] = useState<Apartment[]>([]);
   const [connections, setConnections] = useState<ChannelConnection[]>([]);
   const [bookings, setBookings] = useState<Booking[]>([]);
   const [publicBasePrice, setPublicBasePrice] = useState<number | ''>('');
   const [publicCurrency, setPublicCurrency] = useState('EUR');
   const [isSavingPrice, setIsSavingPrice] = useState(false);

   const [activeTab, setActiveTab] = useState<'channels' | 'pricing'>('channels');
   const [pricingDefaults, setPricingDefaults] = useState<PricingDefaults | null>(null);
   const [nightlyRates, setNightlyRates] = useState<NightlyRateOverride[]>([]);
   const [selectionRange, setSelectionRange] = useState<{ start: string | null, end: string | null }>({ start: null, end: null });
   const [pricingForm, setPricingForm] = useState<Partial<NightlyRateOverride>>({
      price: null,
      minNights: null,
      shortStayMode: 'ALLOWED',
      surchargeType: 'PERCENT',
      surchargeValue: 0
   });
   const [weeklyPattern, setWeeklyPattern] = useState<Record<number, number | ''>>({
      1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '' // 1=Mon, 7=Sun
   });
   const [currentMonth, setCurrentMonth] = useState(new Date());
   const [isApplyingPricing, setIsApplyingPricing] = useState(false);

   // UI State
   const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
   const selectedApt = apartments.find(a => a.id === selectedAptId);
   const [syncingId, setSyncingId] = useState<string | null>(null);
   const [showLogs, setShowLogs] = useState(false);

   // Settings
   const [isOnline, setIsOnline] = useState(networkMonitor.isOnline());
   const [syncInterval, setSyncInterval] = useState<SyncInterval>(syncScheduler.getInterval());
   const [enableMinimal, setEnableMinimal] = useState(false);

   // Modals
   const [isConnModalOpen, setIsConnModalOpen] = useState(false);
   const [connForm, setConnForm] = useState<Partial<ChannelConnection>>({ channel_name: 'AIRBNB', ical_url: '', alias: '', priority: 50, enabled: true, force_direct: false });

   // ... (existing imports)

   const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
   const [proxyUrl, setProxyUrl] = useState(getProxyUrl());

   // Details Modal
   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
   const [detailsData, setDetailsData] = useState<{ connection: ChannelConnection, events: CalendarEvent[] } | null>(null);

   const handleRetryConnection = async (conn: ChannelConnection) => {
      setSyncingId(conn.apartment_id);
      try {
         await syncEngine.syncApartment(conn.apartment_id);
         // Refresh details if open
         if (isDetailsModalOpen && detailsData?.connection.id === conn.id) {
            const store = projectManager.getStore();
            const updatedConn = (await store.getChannelConnections()).find(c => c.id === conn.id);
            const events = await store.getCalendarEvents(conn.id);
            if (updatedConn) setDetailsData({ connection: updatedConn, events });
         }
      } catch (e: any) {
         console.error(e);
      }
      setSyncingId(null);
      loadData();
   };

   // Conflict Modal State
   const [selectedConflict, setSelectedConflict] = useState<{ b1: Booking, b2: Booking } | null>(null);

   // Init Date Format
   useEffect(() => {
      dateFormat.initDateFormat().then(() => {
         // Force re-render if needed, but usually data load triggers it
      });
   }, []);

   const loadData = useCallback(async () => {
      const store = projectManager.getStore();
      try {
         const [p, a, c, b, settings] = await Promise.all([
            store.getProperties(),
            store.getAllApartments(),
            store.getChannelConnections(),
            store.getBookings(),
            store.getSettings()
         ]);
         setProperties(p);
         setApartments(a);
         setConnections(c);
         setBookings(b);
         setEnableMinimal(settings.enable_minimal_bookings_from_ical || false);
      } catch (e) { console.error(e); }
   }, []);

   useEffect(() => { loadData(); }, [loadData]);
   useDataRefresh(loadData);

   useEffect(() => {
      if (selectedApt) {
         setPublicBasePrice(selectedApt.publicBasePrice ?? '');
         setPublicCurrency(selectedApt.currency || 'EUR');
      }
   }, [selectedAptId, apartments]);

   useEffect(() => {
      if (selectedAptId && activeTab === 'pricing') {
         loadPricingData();
      }
   }, [selectedAptId, activeTab, currentMonth]);

   // Common today helper (start of day local)
   const getTodayStr = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
   };
   const todayStr = getTodayStr();

   const formatLocalDate = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
   };

   const loadPricingData = async () => {
      if (!selectedAptId) return;
      try {
         const defaults = await pricingStudioStore.getPricingDefaults(selectedAptId);
         setPricingDefaults(defaults);

         const y = currentMonth.getFullYear();
         const m = currentMonth.getMonth();
         // Load a window of days around the month
         const from = formatLocalDate(new Date(y, m, -7));
         const to = formatLocalDate(new Date(y, m + 1, 14));

         const rates = await pricingStudioStore.getNightlyRates(selectedAptId, from, to);
         setNightlyRates(rates);
      } catch (e) {
         console.error("Error loading pricing data:", e);
      }
   };

   const handleApplyPricing = async (usePatternOnly = false) => {
      if (!selectedAptId || !selectionRange.start || !selectionRange.end) return;
      setIsApplyingPricing(true);
      try {
         // Use T12:00:00 to avoid timezone shifts when parsing YYYY-MM-DD
         const start = new Date(selectionRange.start + 'T12:00:00');
         const end = new Date(selectionRange.end + 'T12:00:00');
         const rates: Partial<NightlyRateOverride>[] = [];

         for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = formatLocalDate(d);

            // Filter past dates (redundant but safe)
            if (dateStr < todayStr) continue;

            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            let finalPrice = usePatternOnly ? null : pricingForm.price;

            // If in pattern mode, we use the pattern. 
            // If in normal mode, we use pattern only if manual price is null.
            if (usePatternOnly) {
               finalPrice = weeklyPattern[dayOfWeek] !== '' ? Number(weeklyPattern[dayOfWeek]) : null;
            } else if (finalPrice === null && weeklyPattern[dayOfWeek] !== '') {
               finalPrice = Number(weeklyPattern[dayOfWeek]);
            }

            rates.push({
               date: dateStr,
               price: finalPrice,
               minNights: pricingForm.minNights,
               shortStayMode: pricingForm.shortStayMode,
               surchargeType: pricingForm.surchargeType,
               surchargeValue: pricingForm.surchargeValue
            });
         }

         if (rates.length === 0) {
            toast.error("No puedes modificar fechas pasadas");
            return;
         }

         const result = await pricingStudioStore.upsertNightlyRatesBulk(selectedAptId, rates);
         if (result.skippedCount > 0) {
            toast.warning(`${result.skippedCount} fechas pasadas fueron ignoradas`);
         }
         toast.success("Precios aplicados");
         loadPricingData();
      } catch (e: any) {
         toast.error("Error: " + e.message);
      } finally {
         setIsApplyingPricing(false);
      }
   };

   const handleClearOverrides = async () => {
      if (!selectedAptId || !selectionRange.start || !selectionRange.end) return;
      try {
         const filterFrom = selectionRange.start < todayStr ? todayStr : selectionRange.start;
         if (filterFrom > selectionRange.end) {
            toast.error("No puedes modificar fechas pasadas");
            return;
         }

         await pricingStudioStore.deleteNightlyRatesRange(selectedAptId, filterFrom, selectionRange.end);
         toast.success("Overrides eliminados");
         loadPricingData();
      } catch (e: any) {
         toast.error("Error: " + e.message);
      }
   };

   // --- ACTIONS ---

   const handleSaveConnection = async () => {
      if (!connForm.ical_url || !selectedAptId) return alert("URL iCal requerida");
      const conn: ChannelConnection = {
         id: connForm.id || crypto.randomUUID(),
         apartment_id: selectedAptId,
         channel_name: connForm.channel_name as any,
         alias: connForm.alias || connForm.channel_name,
         ical_url: connForm.ical_url,
         priority: connForm.priority || (connForm.channel_name === 'BOOKING' ? 90 : 80),
         connection_type: 'ICAL',
         last_sync: 0,
         last_status: 'PENDING',
         sync_log: 'Creado. Pendiente de sync.',
         enabled: connForm.enabled !== false,
         force_direct: connForm.force_direct || false,
         created_at: Date.now(),
         ...connForm
      } as ChannelConnection;

      await projectManager.getStore().saveChannelConnection(conn);
      await projectManager.saveProject();
      setIsConnModalOpen(false);
      setConnForm({ channel_name: 'AIRBNB', ical_url: '', alias: '', priority: 50, enabled: true, force_direct: false });
      loadData();
   };

   const handleDeleteConnection = async (id: string) => {
      if (confirm("¿Eliminar fuente? Se borrarán la conexión, los eventos cacheados y las reservas asociadas.")) {
         try {
            await syncEngine.deleteConnection(id);
            loadData();
         } catch (e: any) {
            alert("Error al eliminar: " + e.message);
         }
      }
   };

   const saveProxyConfig = () => {
      localStorage.setItem('rentikpro_proxy_url', proxyUrl);
      setIsConfigModalOpen(false);
      alert("Configuración de Proxy guardada.");
   };

   const handleSavePrice = async () => {
      if (!selectedApt) return;
      setIsSavingPrice(true);
      try {
         const updated: Apartment = {
            ...selectedApt,
            publicBasePrice: publicBasePrice === '' ? null : Number(publicBasePrice),
            currency: publicCurrency
         };
         await projectManager.getStore().saveApartment(updated);
         await projectManager.saveProject();

         // Trigger republish if property has public token
         const prop = properties.find(p => p.id === selectedApt.property_id);
         if (prop?.public_token) {
            import('../services/publicWebSync').then(async ({ publishAvailability }) => {
               const settings = await projectManager.getStore().getSettings();
               const workerUrl = settings.cloudflare_worker_url || 'https://rentikpro-availability.reservas-elrinconcito.workers.dev';
               const adminKey = settings.cloudflare_admin_api_key || '';
               await publishAvailability(prop, workerUrl, adminKey);
            });
         }

         toast.success("Precio base guardado y publicado");
         loadData();
      } catch (e: any) {
         toast.error("Error al guardar: " + e.message);
      } finally {
         setIsSavingPrice(false);
      }
   };

   const runSync = async (aptId: string) => {
      if (!isOnline) return alert("Modo Offline activado.");
      setSyncingId(aptId);
      try {
         await syncEngine.syncApartment(aptId);
      } catch (e: any) { alert("Error sync: " + e.message); }
      setSyncingId(null);
      loadData();
   };

   const runGlobalSync = async () => {
      if (!isOnline) return alert("Modo Offline activado.");
      setSyncingId('GLOBAL');
      try {
         await syncScheduler.triggerNow();
      } catch (e: any) { alert("Error sync global: " + e.message); }
      setSyncingId(null);
      loadData();
   };

   const toggleMinimalMode = async () => {
      const store = projectManager.getStore();
      const settings = await store.getSettings();
      const newValue = !enableMinimal;
      setEnableMinimal(newValue);
      await store.saveSettings({ ...settings, enable_minimal_bookings_from_ical: newValue });
      loadData();
   };

   // --- ICAL EXPORT ACTIONS ---
   const [isPublishing, setIsPublishing] = useState(false);

   const handlePublish = async (aptId: string) => {
      if (!isOnline) return alert("Modo Offline requerido para publicar.");
      setIsPublishing(true);
      const res = await iCalExportService.publishApartment(aptId);
      setIsPublishing(false);

      if (res.success) {
         alert("¡Calendario publicado con éxito! Ya puedes usar la URL en tus OTAs.");
         loadData();
      } else {
         alert("Error al publicar: " + res.error);
      }
   };

   // --- CONFLICT RESOLUTION LOGIC ---

   const resolveConflict = async (winnerId: string, loserId: string) => {
      const store = projectManager.getStore();
      const winner = bookings.find(b => b.id === winnerId);
      const loser = bookings.find(b => b.id === loserId);

      if (winner && loser) {
         winner.conflict_detected = false;
         winner.status = 'confirmed';
         loser.conflict_detected = false;
         loser.status = 'cancelled';

         await store.saveBooking(winner);
         await store.saveBooking(loser);
         await projectManager.saveProject();
         loadData();
      }
   };

   const resolveAsManualBlock = async (b1: Booking, b2: Booking) => {
      if (!confirm("¿Bloquear estas fechas manualmente? Ambas reservas externas se cancelarán.")) return;
      const store = projectManager.getStore();

      // 1. Create Manual Block
      const block: Booking = {
         id: crypto.randomUUID(),
         property_id: b1.property_id,
         apartment_id: b1.apartment_id,
         traveler_id: 'manual_block_user', // Placeholder
         check_in: b1.check_in,
         check_out: b1.check_out,
         status: 'confirmed',
         source: 'MANUAL',
         total_price: 0,
         guests: 0,
         created_at: Date.now()
      };
      await store.saveBooking(block);
      await projectManager.saveProject();

      // 2. Cancel conflicting
      b1.status = 'cancelled';
      b1.conflict_detected = false;
      b2.status = 'cancelled';
      b2.conflict_detected = false;

      await store.saveBooking(b1);
      await store.saveBooking(b2);
      await projectManager.saveProject();
      loadData();
   };

   // --- RENDER HELPERS ---

   // --- CLASSIFICATION & CONFLICTS (MINI-BLOQUE 4) ---
   const { realConflicts, uncoveredBlocks } = React.useMemo(() => {
      const confirmed = bookings.filter(b => b.status !== 'cancelled' && isConfirmedBooking(b));
      const provisional = bookings.filter(b => b.status !== 'cancelled' && isProvisionalBlock(b));

      // Un conflicto es real solo si ambas partes son confirmed (según syncEngine actualizado)
      const real = bookings.filter(b => b.conflict_detected && b.status !== 'cancelled' && isConfirmedBooking(b));
      const uncovered = provisional.filter(p => !isCovered(p, confirmed));

      return { realConflicts: real, uncoveredBlocks: uncovered };
   }, [bookings]);

   const conflictGroups: Record<string, Booking[]> = {};
   realConflicts.forEach(b => {
      if (!conflictGroups[b.apartment_id]) conflictGroups[b.apartment_id] = [];
      conflictGroups[b.apartment_id].push(b);
   });

   const aptConnections = connections.filter(c => c.apartment_id === selectedAptId);

   // Pricing Helpers
   const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
   const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

   const renderCalendarDays = () => {
      const days = [];
      const totalDays = daysInMonth(currentMonth);
      const startOffset = (firstDayOfMonth(currentMonth) + 6) % 7;

      for (let i = 0; i < startOffset; i++) {
         days.push(<div key={`empty-${i}`} className="bg-slate-50/50 h-24 border-slate-100 border"></div>);
      }

      for (let d = 1; d <= totalDays; d++) {
         const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
         const dateStr = formatLocalDate(date);
         const isPast = dateStr < todayStr;
         const override = nightlyRates.find(r => r.date === dateStr);
         const price = override?.price ?? pricingDefaults?.basePrice ?? '—';
         const isSelected = selectionRange.start && selectionRange.end &&
            dateStr >= selectionRange.start && dateStr <= selectionRange.end;
         const isEnd = selectionRange.end === dateStr;
         const isStart = selectionRange.start === dateStr;

         days.push(
            <div
               key={dateStr}
               onClick={() => {
                  if (isPast) return;
                  if (!selectionRange.start || (selectionRange.start && selectionRange.end)) {
                     setSelectionRange({ start: dateStr, end: null });
                  } else {
                     if (dateStr < selectionRange.start) {
                        setSelectionRange({ start: dateStr, end: selectionRange.start });
                     } else {
                        setSelectionRange({ start: selectionRange.start, end: dateStr });
                     }
                  }
               }}
               className={`h-24 p-2 border border-slate-100 bg-white transition-all flex flex-col justify-between group relative 
                  ${isPast ? 'bg-slate-200/50 cursor-not-allowed grayscale-[0.5]' : 'cursor-pointer'}
                  ${isSelected ? 'bg-indigo-50 border-indigo-200 z-10' : !isPast ? 'hover:bg-slate-50' : ''} 
                  ${isStart || isEnd ? 'ring-2 ring-indigo-500 z-20' : ''}`}
            >
               <span className={`text-[10px] font-black ${isSelected ? 'text-indigo-600' : isPast ? 'text-slate-300' : 'text-slate-400'}`}>{d}</span>
               <div className={`flex flex-col items-end ${isPast ? 'opacity-30' : ''}`}>
                  <span className={`text-sm font-black ${override?.price ? 'text-indigo-600' : 'text-slate-800'}`}>
                     {price}{price !== '—' ? '€' : ''}
                  </span>
                  {override?.minNights && (
                     <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                        <Clock size={8} /> {override.minNights}n
                     </span>
                  )}
               </div>
            </div>
         );
      }
      return days;
   };

   return (
      <div className="h-full flex flex-col space-y-6 animate-in fade-in pb-20">

         {/* HEADER GLOBAL */}
         <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div>
               <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <RefreshCw className={`text-indigo-600 ${syncingId === 'GLOBAL' ? 'animate-spin' : ''}`} /> Channel Manager
               </h2>
               <p className="text-slate-500 font-medium text-sm flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {isOnline ? 'Sistema Online • Sincronización Automática' : 'Sistema Offline • Cambios en cola local'}
               </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-100">
               <button
                  onClick={toggleMinimalMode}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black tracking-tight transition-all border ${enableMinimal ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 shadow-sm'}`}
                  title="Convierte bloqueos anónimos de Booking.com en reservas operativas"
               >
                  <Calendar size={14} />
                  MODO MÍNIMO: {enableMinimal ? 'ACTIVO' : 'DESACTIVADO'}
               </button>
               <button onClick={() => setIsConfigModalOpen(true)} className="p-3 bg-white hover:bg-slate-200 rounded-2xl text-slate-500 transition-colors shadow-sm" title="Configurar Proxy">
                  <Server size={16} />
               </button>
               <div className="flex items-center gap-2 px-5 py-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Intervalo</span>
                  <select
                     value={syncInterval}
                     onChange={e => {
                        const val = e.target.value === 'MANUAL' ? 'MANUAL' : parseInt(e.target.value) as SyncInterval;
                        setSyncInterval(val);
                        syncScheduler.setInterval(val);
                     }}
                     className="bg-transparent text-xs font-bold outline-none cursor-pointer text-slate-700"
                  >
                     <option value={15}>15 min</option>
                     <option value={30}>30 min</option>
                     <option value={60}>1 hora</option>
                     <option value="MANUAL">Manual</option>
                  </select>
               </div>
               <button
                  onClick={runGlobalSync}
                  disabled={!isOnline || !!syncingId}
                  className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs hover:bg-slate-800 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
               >
                  {syncingId === 'GLOBAL' ? 'Sincronizando...' : 'Sincronizar Todo'} <Play size={10} fill="currentColor" />
               </button>
            </div>
         </div>

         <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-0">

            {/* SIDEBAR: NAVIGATION */}
            <div className={`lg:col-span-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${selectedAptId ? 'hidden lg:flex' : 'flex'}`}>
               <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                     <LayoutGrid size={14} /> Propiedades
                  </h3>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                  {properties.map(p => (
                     <div key={p.id}>
                        <div className="flex items-center gap-2 mb-3 px-2">
                           <Building2 size={16} className="text-indigo-400" />
                           <span className="font-bold text-sm text-slate-800">{p.name}</span>
                        </div>
                        <div className="space-y-2">
                           {apartments.filter(a => a.property_id === p.id).map(a => {
                              const hasConflict = realConflicts.some(b => b.apartment_id === a.id);
                              const aptConns = connections.filter(c => c.apartment_id === a.id);
                              const hasError = aptConns.some(c => c.last_status === 'ERROR' && c.enabled);
                              const isSelected = selectedAptId === a.id;

                              return (
                                 <button
                                    key={a.id}
                                    onClick={() => setSelectedAptId(a.id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left group border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md text-slate-600'}`}
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className={`w-1.5 h-8 rounded-full ${isSelected ? 'bg-white/30' : ''}`} style={{ backgroundColor: isSelected ? undefined : a.color }}></div>
                                       <div>
                                          <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>{a.name}</p>
                                          <p className={`text-[9px] font-medium ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                             {aptConns.length} conexiones
                                          </p>
                                       </div>
                                    </div>
                                    <div className="flex gap-1">
                                       {hasConflict && <div className="p-1 bg-amber-400 text-white rounded-full animate-pulse"><AlertTriangle size={12} /></div>}
                                       {hasError && <div className="p-1 bg-rose-400 text-white rounded-full"><AlertCircle size={12} /></div>}
                                       {!hasConflict && !hasError && isSelected && <ChevronRight size={16} className="text-indigo-300" />}
                                    </div>
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  ))}
                  {properties.length === 0 && <div className="p-4 text-center text-slate-400 text-xs italic">No hay propiedades. Crea una primero.</div>}
               </div>
               <div className="p-4 border-t border-slate-50">
                  <button onClick={() => setSelectedAptId(null)} className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs text-slate-600 transition-colors flex items-center justify-center gap-2">
                     <LayoutGrid size={14} /> Dashboard General
                  </button>
               </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden h-full">

               {/* VIEW: APARTMENT SOURCES */}
               {selectedAptId && selectedApt ? (
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4">
                     {/* Apt Header */}
                     <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
                        <div className="flex items-center gap-4">
                           <button onClick={() => setSelectedAptId(null)} className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-800"><ArrowRight size={20} className="rotate-180" /></button>
                           <div className="w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center text-white font-black text-2xl" style={{ backgroundColor: selectedApt.color }}>
                              {selectedApt.name[0]}
                           </div>
                           <div>
                              <h3 className="text-2xl font-black text-slate-800">{selectedApt.name}</h3>
                              <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                                 {aptConnections.length} Canales Conectados
                                 {syncingId === selectedApt.id && <span className="text-indigo-600 text-xs font-bold animate-pulse">• Sincronizando...</span>}
                              </p>
                           </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                           <button
                              onClick={() => runSync(selectedApt.id)}
                              disabled={!!syncingId}
                              className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center gap-2"
                           >
                              <RefreshCw size={14} className={syncingId === selectedApt.id ? 'animate-spin' : ''} /> Sincronizar
                           </button>
                           {activeTab === 'channels' && (
                              <button
                                 onClick={() => { setConnForm({ channel_name: 'AIRBNB', ical_url: '', alias: '', priority: 50, enabled: true, force_direct: false }); setIsConnModalOpen(true); }}
                                 className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                              >
                                 <Plus size={16} /> Añadir Fuente
                              </button>
                           )}
                        </div>
                     </div>

                     {/* TAB NAVIGATION */}
                     <div className="flex bg-slate-100/50 p-1 mx-8 mt-4 rounded-2xl border border-slate-200/50">
                        <button
                           onClick={() => setActiveTab('channels')}
                           className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'channels' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                           <Link size={14} /> Conexiones iCal
                        </button>
                        <button
                           onClick={() => setActiveTab('pricing')}
                           className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'pricing' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                           <BarChart3 size={14} /> Pricing Studio
                        </button>
                     </div>

                     {activeTab === 'channels' ? (
                        <>
                           <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
                              <div className="flex flex-col gap-4">
                                 {aptConnections.map(conn => (
                                    <div key={conn.id} className={`group bg-white border border-slate-200 rounded-3xl p-1 transition-all`}>
                                       <div className="flex flex-col md:flex-row items-center gap-4 p-4">
                                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors bg-slate-50`}>
                                             {conn.channel_name === 'AIRBNB' ? <Globe className="text-rose-500" size={24} /> : conn.channel_name === 'BOOKING' ? <Calendar className="text-blue-600" size={24} /> : <Link className="text-slate-500" size={24} />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <div className="flex items-center gap-2 mb-1"><h4 className="font-bold text-slate-800">{conn.alias || conn.channel_name}</h4><ConnectionBadge type={conn.channel_name} /></div>
                                             <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 flex items-center gap-2 max-w-full">
                                                <span className="text-[10px] font-mono text-slate-400 truncate flex-1">{conn.ical_url}</span>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-6 md:border-l md:border-slate-100 md:pl-6">
                                             <StatusDot status={conn.last_status} enabled={conn.enabled} lastSync={conn.last_sync} />
                                          </div>
                                          <div className="flex gap-2">
                                             <button onClick={() => { setConnForm(conn); setIsConnModalOpen(true); }} className="p-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition-all shadow-sm"><Settings size={16} /></button>
                                             <button onClick={() => handleDeleteConnection(conn.id)} className="p-2.5 bg-white border border-slate-200 hover:border-rose-300 rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                                 {aptConnections.length === 0 && <div className="py-20 text-center text-slate-400 text-sm">No hay fuentes iCal conectadas.</div>}
                              </div>
                           </div>
                           <div className="bg-slate-900 text-slate-300 border-t border-slate-800 p-4">
                              <button onClick={() => setShowLogs(!showLogs)} className="w-full text-left text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center gap-2"><HistoryIcon size={14} /> Log de Sincronización</button>
                           </div>
                        </>
                     ) : (
                        <div className="flex-1 flex flex-col xl:flex-row min-h-0 overflow-hidden bg-slate-50/20 p-8 gap-8">
                           {/* Calendar & Editor Area */}
                           <div className="flex-1 flex flex-col gap-6 min-h-0">
                              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 md:p-10 flex flex-col h-full overflow-hidden">
                                 {/* Calendar Header */}
                                 <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                       <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar size={24} /></div>
                                       {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
                                    </h4>
                                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                       <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-3 bg-white hover:bg-slate-200 rounded-xl text-slate-500 transition-all shadow-sm"><ArrowRight size={18} className="rotate-180" /></button>
                                       <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-3 bg-white text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-all rounded-xl shadow-sm">Hoy</button>
                                       <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-3 bg-white hover:bg-slate-200 rounded-xl text-slate-500 transition-all shadow-sm"><ArrowRight size={18} /></button>
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-[2rem] overflow-hidden border border-slate-200 flex-1">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (<div key={d} className="bg-slate-50 p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>))}
                                    {renderCalendarDays()}
                                 </div>
                                 <div className="mt-8 flex items-center gap-8 px-4">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-white border border-slate-200"></div><span className="text-[10px] font-black text-slate-400 uppercase">Precio Base</span></div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-indigo-50 border border-indigo-200"></div><span className="text-[10px] font-black text-slate-400 uppercase">Seleccionado</span></div>
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div><span className="text-[10px] font-black text-slate-400 uppercase mt-0.5">Override Activo</span></div>
                                 </div>
                              </div>
                           </div>
                           <div className="w-full xl:w-[400px] flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
                                 <div className="flex items-center gap-4"><div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><Zap size={24} /></div><div><h4 className="text-xl font-black text-slate-800">Editor de Rango</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{selectionRange.start ? `${selectionRange.start} — ${selectionRange.end || '?'}` : 'Selecciona días'}</p></div></div>
                                 {selectionRange.start ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                       <div className="space-y-4">
                                          <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Precio por Noche (€)</label><input type="number" value={pricingForm.price || ''} onChange={e => setPricingForm({ ...pricingForm, price: e.target.value ? Number(e.target.value) : null })} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-300 outline-none transition-all" /></div>
                                          <div className="grid grid-cols-2 gap-4"><div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Estancia Mínima</label><input type="number" value={pricingForm.minNights || ''} onChange={e => setPricingForm({ ...pricingForm, minNights: e.target.value ? Number(e.target.value) : null })} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-300 outline-none" /></div><div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Estancias Cortas</label><select value={pricingForm.shortStayMode || 'ALLOWED'} onChange={e => setPricingForm({ ...pricingForm, shortStayMode: e.target.value as any })} className="w-full px-3 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none"><option value="ALLOWED">Permitido</option><option value="NOT_ALLOWED">Denegado</option><option value="WITH_SURCHARGE">Con Recargo</option></select></div></div>
                                       </div>
                                       <div className="pt-4 border-t border-slate-50 space-y-3"><button onClick={() => handleApplyPricing(false)} disabled={isApplyingPricing || !selectionRange.end} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50">{isApplyingPricing ? <RefreshCw size={14} className="animate-spin" /> : <Check size={18} />} APLICAR CAMBIOS AL RANGO</button><button onClick={handleClearOverrides} className="w-full py-4 bg-white border border-slate-200 text-rose-500 rounded-2xl font-black text-xs hover:bg-rose-50 transition-all flex items-center justify-center gap-2"><Ban size={18} /> LIMPIAR OVERRIDES</button></div>
                                    </div>
                                 ) : <div className="py-12 flex flex-col items-center justify-center text-center px-4"><div className="p-4 bg-slate-50 rounded-full mb-4"><Plus size={32} className="text-slate-200" /></div><p className="text-slate-400 text-xs font-bold leading-relaxed">Selecciona un rango en el calendario.</p></div>}
                              </div>
                              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl"><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-slate-800 rounded-xl"><HistoryIcon size={20} className="text-indigo-400" /></div><h4 className="text-sm font-black uppercase tracking-widest">Patrón Semanal</h4></div><div className="grid grid-cols-2 gap-3 mb-6">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (<div key={d} className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-xl"><span className="text-[10px] font-black text-white/30 uppercase w-8 text-center">{d}</span><input type="number" value={weeklyPattern[i + 1]} onChange={e => setWeeklyPattern({ ...weeklyPattern, [i + 1]: e.target.value ? Number(e.target.value) : '' })} className="bg-transparent text-sm font-bold w-full outline-none text-white placeholder:text-white/10" placeholder="Base" /></div>))}</div><button onClick={() => handleApplyPricing(true)} disabled={!selectionRange.start || !selectionRange.end} className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 disabled:opacity-20">APLICAR PATRÓN AL RANGO</button></div>
                           </div>
                        </div>
                     )}
                  </div>
               ) : (
                  // DEFAULT DASHBOARD VIEW
                  <div className="space-y-8 animate-in slide-in-from-left-4 h-full overflow-y-auto p-1">
                     <BookingEnrichmentList onBookingConfirmed={loadData} />
                     {/* Conflict Center */}
                     {realConflicts.length > 0 ? (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] border border-amber-100 p-8 shadow-xl shadow-amber-100/50">
                           <div className="flex items-center gap-4 mb-8">
                              <div className="p-4 bg-white text-amber-600 rounded-2xl shadow-sm"><ShieldAlert size={32} /></div>
                              <div>
                                 <h3 className="text-2xl font-black text-amber-900">Conflictos de Disponibilidad</h3>
                                 <p className="text-amber-800/70 font-medium text-sm">Acción requerida: {realConflicts.length} reservas solapadas.</p>
                              </div>
                           </div>
                           <div className="grid gap-6">
                              {Object.entries(conflictGroups).map(([aptId, group]) => {
                                 const aptName = apartments.find(a => a.id === aptId)?.name;
                                 if (group.length < 2) return null;
                                 const b1 = group[0];
                                 const b2 = group[1];
                                 return (
                                    <div key={b1.id + b2.id} className="bg-white p-6 rounded-[2rem] border border-amber-200 shadow-sm relative overflow-hidden">
                                       <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400"></div>
                                       <div className="flex justify-between items-center mb-6">
                                          <span className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg">
                                             <Building2 size={12} /> {aptName}
                                          </span>
                                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg flex items-center gap-2">
                                             <Calendar size={12} /> {dateFormat.formatRangeForUser(b1.check_in, b1.check_out)}
                                          </span>
                                       </div>

                                       {/* Clickable Card Body triggering Modal */}
                                       <div
                                          className="cursor-pointer hover:opacity-80 transition-opacity mb-4"
                                          onClick={() => setSelectedConflict({ b1, b2 })}
                                       >
                                          <p className="text-sm text-slate-500 mb-2 italic text-center">Tap para ver detalles y resolver</p>
                                       </div>

                                       <div className="flex flex-col md:flex-row items-stretch gap-4 opacity-60 pointer-events-none">
                                          {/* Option A */}
                                          <button
                                             onClick={() => resolveConflict(b1.id, b2.id)}
                                             className="flex-1 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md transition-all text-left group relative"
                                          >
                                             <div className="flex justify-between items-start mb-2">
                                                <span className="font-black text-slate-800 text-lg group-hover:text-indigo-700">{b1.source}</span>
                                                {b1.source === 'BOOKING' && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Prio Alta</span>}
                                             </div>
                                             {b1.guest_name && <p className="text-sm text-slate-700 font-bold mb-1 truncate">{b1.guest_name}</p>}
                                             <p className="text-xs text-slate-500 font-medium line-clamp-2" title={b1.summary || 'Sin detalles'}>
                                                {b1.summary || 'Reserva Externa'}
                                             </p>
                                             <div className="mt-2 pt-2 border-t border-slate-200 group-hover:border-indigo-200">
                                                <p className="text-[9px] text-slate-400 font-mono truncate" title={b1.external_ref}>UID: {b1.external_ref}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                   <span className="text-slate-400 text-xs font-mono">{b1.total_price}€</span>
                                                   <CheckCircle2 size={18} className="text-slate-300 group-hover:text-indigo-500" />
                                                </div>
                                             </div>
                                          </button>

                                          {/* VS Badge */}
                                          <div className="flex items-center justify-center">
                                             <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 font-black flex items-center justify-center text-xs shadow-sm z-10">VS</div>
                                          </div>

                                          {/* Option B */}
                                          <button
                                             onClick={() => resolveConflict(b2.id, b1.id)}
                                             className="flex-1 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md transition-all text-left group relative"
                                          >
                                             <div className="flex justify-between items-start mb-2">
                                                <span className="font-black text-slate-800 text-lg group-hover:text-indigo-700">{b2.source}</span>
                                                {b2.source === 'BOOKING' && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Prio Alta</span>}
                                             </div>
                                             <p className="text-xs text-slate-500 font-medium line-clamp-2" title={b2.summary || 'Sin detalles'}>
                                                {b2.summary || 'Reserva Externa'}
                                             </p>
                                             <div className="mt-2 pt-2 border-t border-slate-200 group-hover:border-indigo-200">
                                                <p className="text-[9px] text-slate-400 font-mono truncate" title={b2.external_ref}>UID: {b2.external_ref}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                   <span className="text-slate-400 text-xs font-mono">{b2.total_price}€</span>
                                                   <CheckCircle2 size={18} className="text-slate-300 group-hover:text-indigo-500" />
                                                </div>
                                             </div>
                                          </button>
                                       </div>

                                       {/* Manual Override */}
                                       <div className="mt-4 text-center">
                                          <button onClick={() => resolveAsManualBlock(b1, b2)} className="text-xs font-bold text-slate-400 hover:text-rose-500 flex items-center justify-center gap-1 mx-auto transition-colors">
                                             <LockIcon size={12} /> Bloquear fechas manualmente (Cancelar ambas)
                                          </button>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     ) : (
                        <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-6">
                           <div className="bg-emerald-50 p-6 rounded-full text-emerald-500 mb-2 shadow-lg shadow-emerald-50"><CheckCircle2 size={48} /></div>
                           <div>
                              <h3 className="text-3xl font-black text-slate-800">Todo Sincronizado</h3>
                              <p className="text-slate-500 mt-2 max-w-md mx-auto">No hay conflictos de disponibilidad pendientes. Tus calendarios están al día.</p>
                           </div>
                        </div>
                     )}

                     {/* UNCOVERED BLOCKS SECTION (MINI-BLOQUE 4) */}
                     {uncoveredBlocks.length > 0 && (
                        <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8">
                           <h4 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
                              <LockIcon size={20} className="text-slate-400" /> Bloqueos Provisionales (Fuera de Reservas)
                           </h4>
                           <p className="text-xs text-slate-500 mb-6 font-medium">Estos bloqueos de iCal no solapan con ninguna reserva confirmada. Son bloqueos de disponibilidad efectivos.</p>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {uncoveredBlocks.map(b => (
                                 <div key={b.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                    <div>
                                       <p className="text-xs font-black text-slate-700">{apartments.find(a => a.id === b.apartment_id)?.name}</p>
                                       <p className="text-[10px] text-slate-400 font-bold">{dateFormat.formatRangeForUser(b.check_in, b.check_out)}</p>
                                    </div>
                                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">{b.source}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Summary Cards */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                           <div className="flex justify-between items-start">
                              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Link size={20} /></div>
                              <span className="text-3xl font-black text-slate-800">{connections.length}</span>
                           </div>
                           <div>
                              <p className="font-bold text-slate-700">Conexiones Totales</p>
                              <p className="text-xs text-slate-400">Canales activos</p>
                           </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                           <div className="flex justify-between items-start">
                              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><RefreshCw size={20} /></div>
                              <span className="text-3xl font-black text-slate-800">{connections.filter(c => c.last_status === 'OK').length}</span>
                           </div>
                           <div>
                              <p className="font-bold text-slate-700">Estado Salud</p>
                              <p className="text-xs text-slate-400">Fuentes sincronizando OK</p>
                           </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                           <div className="flex justify-between items-start">
                              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><Building2 size={20} /></div>
                              <span className="text-3xl font-black text-slate-800">{apartments.length}</span>
                           </div>
                           <div>
                              <p className="font-bold text-slate-700">Apartamentos</p>
                              <p className="text-xs text-slate-400">Gestionados</p>
                           </div>
                        </div>
                        {aptConnections.length === 0 && (
                           <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
                              <Link size={48} className="text-slate-200 mb-4" />
                              <p className="text-slate-400 font-bold">No hay fuentes iCal conectadas</p>
                              <button onClick={() => setIsConnModalOpen(true)} className="mt-4 text-indigo-600 font-black text-xs flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all">
                                 <Plus size={14} /> Conectar primera fuente
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* MODAL: ADD/EDIT CONNECTION */}
         {isConnModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
               <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                     <h3 className="text-xl font-black text-slate-800">Configurar Fuente</h3>
                     <button onClick={() => setIsConnModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-2"><Power size={14} /> Estado Conexión</span>
                        <button
                           onClick={() => setConnForm({ ...connForm, enabled: !connForm.enabled })}
                           className={`w-10 h-6 rounded-full p-1 transition-all ${connForm.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                           <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${connForm.enabled ? 'translate-x-4' : ''}`}></div>
                        </button>
                     </div>

                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">Canal / Plataforma</label>
                        <select
                           className="w-full p-3 bg-slate-50 border rounded-xl font-bold mt-1"
                           value={connForm.channel_name}
                           onChange={e => setConnForm({ ...connForm, channel_name: e.target.value as any })}
                        >
                           <option value="AIRBNB">Airbnb</option>
                           <option value="BOOKING">Booking.com</option>
                           <option value="VRBO">Vrbo</option>
                           <option value="OTHER">Otro</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">Nombre / Alias</label>
                        <input
                           className="w-full p-3 bg-slate-50 border rounded-xl font-bold mt-1"
                           placeholder="Ej. Airbnb Principal"
                           value={connForm.alias}
                           onChange={e => setConnForm({ ...connForm, alias: e.target.value })}
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">URL del Calendario (iCal)</label>
                        <input
                           className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-xs mt-1"
                           placeholder="https://..."
                           value={connForm.ical_url}
                           onChange={e => setConnForm({ ...connForm, ical_url: e.target.value })}
                        />
                        <div className="mt-2 flex flex-col gap-1">
                           <p className="text-[9px] text-slate-400 flex items-center gap-1"><ExternalLink size={10} /> Copia el enlace de exportación de tu OTA.</p>
                           <p className="text-[9px] text-indigo-400 font-bold cursor-pointer hover:underline" onClick={() => setConnForm({ ...connForm, ical_url: 'http://localhost:5173/mock_airbnb.ics' })}>Usar Mock Airbnb (Test)</p>
                           <p className="text-[9px] text-indigo-400 font-bold cursor-pointer hover:underline" onClick={() => setConnForm({ ...connForm, ical_url: 'http://localhost:5173/mock_booking.ics' })}>Usar Mock Booking (Test)</p>
                        </div>
                     </div>

                     {/* PROXY SETTINGS */}
                     <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-1"><ShieldAlert size={10} /> Modo Avanzado</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <input
                              type="checkbox"
                              id="forceDirect"
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                              checked={connForm.force_direct || false}
                              onChange={e => setConnForm({ ...connForm, force_direct: e.target.checked })}
                           />
                           <label htmlFor="forceDirect" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                              Forzar conexión directa (Bypass Proxy)
                           </label>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                           Activa esto solo si tu servidor iCal permite CORS. Por defecto, RentikPro usa un proxy seguro para evitar bloqueos.
                        </p>
                     </div>

                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">Prioridad (0-100)</label>
                        <div className="flex items-center gap-3 mt-1">
                           <input
                              type="range" min="0" max="100"
                              className="flex-1 accent-indigo-600"
                              value={connForm.priority}
                              onChange={e => setConnForm({ ...connForm, priority: Number(e.target.value) })}
                           />
                           <span className="font-black text-slate-700 w-8 text-right">{connForm.priority}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                           <HelpCircle size={10} /> A mayor número, mayor prioridad.
                        </p>
                     </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                     <button onClick={() => setIsConnModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                     <button onClick={handleSaveConnection} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700">Guardar</button>
                  </div>
               </div>
            </div>
         )}

         {/* MODAL: PROXY CONFIG */}
         {isConfigModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
               <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                     <h3 className="text-xl font-black text-slate-800">Configuración Proxy</h3>
                     <button onClick={() => setIsConfigModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                  </div>

                  <div className="space-y-4">
                     <p className="text-xs text-slate-500">
                        RentikPro utiliza un proxy intermediario para evitar errores CORS al descargar calendarios iCal de Booking/Airbnb.
                     </p>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">URL del Worker (Cloudflare)</label>
                        <input
                           className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-xs mt-1"
                           placeholder="https://corsproxy.io/?"
                           value={proxyUrl}
                           onChange={e => setProxyUrl(e.target.value)}
                        />
                        <p className="text-[9px] text-slate-400 mt-2">
                           Déjalo por defecto (corsproxy.io) o usa tu propio worker si lo has desplegado (Recomendado).
                        </p>
                     </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                     <button onClick={() => setIsConfigModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                     <button onClick={saveProxyConfig} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black shadow-lg hover:bg-slate-800">Guardar URL</button>
                  </div>
               </div>
            </div>
         )}

         {/* MODAL: DETAILS */}
         {isDetailsModalOpen && detailsData && (
            <ChannelDetailsModal
               connection={detailsData.connection}
               events={detailsData.events}
               onRetry={() => handleRetryConnection(detailsData.connection)}
               onClose={() => setIsDetailsModalOpen(false)}
            />
         )}

         {/* MODAL: CONFLICT RESOLUTION */}
         {selectedConflict && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
               <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                     <h3 className="text-2xl font-black text-rose-600 flex items-center gap-2">
                        <ShieldAlert size={28} /> Resolver Conflicto
                     </h3>
                     <button onClick={() => setSelectedConflict(null)}><X size={24} className="text-slate-400" /></button>
                  </div>

                  <p className="text-sm text-slate-500 text-center">
                     Se ha detectado una coincidencia de fechas en <strong>{apartments.find(a => a.id === selectedConflict.b1.apartment_id)?.name}</strong>.<br />
                     Selecciona cuál es la reserva válida (la otra se cancelará) o bloquea las fechas manualmente.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                     {/* VS Badge */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center font-black z-10 border-4 border-white shadow-lg">VS</div>

                     {/* BOOKING A */}
                     <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col gap-4 hover:border-indigo-300 transition-colors">
                        <div className="flex justify-between items-start">
                           <span className="font-black text-xl text-slate-800">{selectedConflict.b1.source}</span>
                           {selectedConflict.b1.source === 'BOOKING' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold uppercase">Prioridad Alta</span>}
                        </div>

                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-slate-600 text-sm">
                              <Calendar size={14} className="text-indigo-500" />
                              <span className="font-bold">{selectedConflict.b1.check_in} - {selectedConflict.b1.check_out}</span>
                           </div>
                           <div className="flex items-center gap-2 text-slate-600 text-sm">
                              <span className="font-black">{selectedConflict.b1.total_price}€</span>
                              <span className="text-xs text-slate-400">Total</span>
                           </div>
                           <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs text-slate-500">
                              <p className="font-bold mb-1">Detalles:</p>
                              <p className="line-clamp-3">{selectedConflict.b1.summary || 'Sin resumen'}</p>
                              <p className="mt-2 font-mono text-[9px] text-slate-400 break-all">{selectedConflict.b1.external_ref}</p>
                           </div>
                        </div>

                        <button
                           onClick={() => { resolveConflict(selectedConflict.b1.id, selectedConflict.b2.id); setSelectedConflict(null); }}
                           className="mt-auto w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 transition-all transform active:scale-95"
                        >
                           Mantener Esta
                        </button>
                     </div>

                     {/* BOOKING B */}
                     <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col gap-4 hover:border-indigo-300 transition-colors">
                        <div className="flex justify-between items-start">
                           <span className="font-black text-xl text-slate-800">{selectedConflict.b2.source}</span>
                           {selectedConflict.b2.source === 'BOOKING' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold uppercase">Prioridad Alta</span>}
                        </div>

                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-slate-600 text-sm">
                              <Calendar size={14} className="text-indigo-500" />
                              <span className="font-bold">{selectedConflict.b2.check_in} - {selectedConflict.b2.check_out}</span>
                           </div>
                           <div className="flex items-center gap-2 text-slate-600 text-sm">
                              <span className="font-black">{selectedConflict.b2.total_price}€</span>
                              <span className="text-xs text-slate-400">Total</span>
                           </div>
                           <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs text-slate-500">
                              <p className="font-bold mb-1">Detalles:</p>
                              <p className="line-clamp-3">{selectedConflict.b2.summary || 'Sin resumen'}</p>
                              <p className="mt-2 font-mono text-[9px] text-slate-400 break-all">{selectedConflict.b2.external_ref}</p>
                           </div>
                        </div>

                        <button
                           onClick={() => { resolveConflict(selectedConflict.b2.id, selectedConflict.b1.id); setSelectedConflict(null); }}
                           className="mt-auto w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 transition-all transform active:scale-95"
                        >
                           Mantener Esta
                        </button>
                     </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 text-center">
                     <button
                        onClick={() => { resolveAsManualBlock(selectedConflict.b1, selectedConflict.b2); setSelectedConflict(null); }}
                        className="text-slate-400 font-bold text-xs hover:text-rose-500 flex items-center justify-center gap-2 mx-auto transition-colors px-4 py-2 hover:bg-rose-50 rounded-xl"
                     >
                        <LockIcon size={14} /> Ninguna es válida (Bloquear fechas manualmente)
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
