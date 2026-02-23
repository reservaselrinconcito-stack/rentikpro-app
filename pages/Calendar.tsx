import React, { useState, useEffect, useMemo, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { Booking, Apartment, Property, Traveler, CalendarEvent } from '../types';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { dateFormat } from '../services/dateFormat';
import { mapCalendarEventToBooking, ensureGuestName, mergeBookingsAndEvents } from '../utils/bookingMapping';
import {
  ChevronLeft, ChevronRight, Filter,
  X, Trash2, CalendarDays, Clock, AlertTriangle, AlertCircle, ShieldCheck
} from 'lucide-react';
import { formatDateES, formatDateRangeES } from '../utils/dateFormat';
import { isConfirmedBooking, isProvisionalBlock, isCovered } from '../utils/bookingClassification';
import { getBookingDisplayName } from '../utils/bookingDisplay';
import { DayIndex, formatDay } from '../utils/day';
import { assignLanes, LaneAssigned } from '../utils/assignLanes';
import { ReservationLike } from '../utils/reservationIntervals';

type ViewMode = 'monthly' | 'weekly' | 'yearly';

const toDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const dayIndexFromLocalDate = (date: Date): DayIndex => {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
};

const startOfWeekMonday = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // 0=Sun..6=Sat
  const delta = dow === 0 ? 6 : (dow - 1); // Mon=0
  d.setDate(d.getDate() - delta);
  return d;
};

// --- LOCAL ERROR BOUNDARY FOR CALENDAR ---
interface EBProps { children: ReactNode; }
interface EBState { hasError: boolean; error: Error | null; }
class CalendarErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Calendar Crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Calendario no disponible</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Se ha producido un error al renderizar la vista del calendario. {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CalendarContent: React.FC = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dataSource, setDataSource] = useState<'ical' | 'internal'>('ical');
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [showCovered, setShowCovered] = useState(false);

  // Init Date Format
  useEffect(() => {
    dateFormat.initDateFormat().then(() => {
      // Force re-render if needed
    });
  }, []);

  const loadData = useCallback(async () => {
    const store = projectManager.getStore();
    const activeProjectId = localStorage.getItem('active_project_id');

    console.debug(`[Calendar] query_source=ACCOUNTING_TRUTH project_id=${activeProjectId} selected_prop=${selectedPropertyId}`);

    try {
      const computeRange = () => {
        if (viewMode === 'weekly') {
          const ws = startOfWeekMonday(currentDate);
          const startIdx = dayIndexFromLocalDate(ws);
          const from = formatDay(startIdx);
          const to = formatDay(startIdx + 7); // exclusive
          return { from, to };
        }

        if (viewMode === 'yearly') {
          const y = currentDate.getFullYear();
          return { from: `${y}-01-01`, to: `${y + 1}-01-01` };
        }

        // Monthly grid = 6 weeks (Mon..Sun)
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const firstOfMonth = new Date(y, m, 1);
        const gridStart = startOfWeekMonday(firstOfMonth);
        const startIdx = dayIndexFromLocalDate(gridStart);
        const from = formatDay(startIdx);
        const to = formatDay(startIdx + (6 * 7)); // 42 days, exclusive
        return { from, to };
      };

      const { from, to } = computeRange();
      const propertyId = selectedPropertyId !== 'all' ? selectedPropertyId : undefined;

      const [rangeBookings, pList, tList, aList] = await Promise.all([
        store.queryReservationsByRange(null, from, to, { propertyId, includeCancelled: true } as any),
        store.getProperties(),
        store.getTravelers(),
        store.getAllApartments()
      ]);

      setProperties(pList);
      setTravelers(tList);
      setApartments(aList);

      console.debug(`[Calendar] Source of Truth: BOOKINGS (range ${from}..${to}). Result: ${rangeBookings.length} bookings.`);

      setBookings(rangeBookings);
      setDataSource('internal');
    } catch (err) {
      console.error("Error cargando calendario:", err);
    }
  }, [currentDate, viewMode, selectedPropertyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle routing for deep links (F1)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const filter = searchParams.get('filter');

    if (filter === 'arrivals') {
      setCurrentDate(new Date());
      // Could also set a state to highlight arrivals
    }

    if (routeId) {
      (async () => {
        // Prefer direct fetch (may be outside current visible range)
        try {
          const store = projectManager.getStore();
          const b = await store.getBooking(routeId);
          if (b) {
            openEventDetail(b);
            return;
          }
        } catch (_) { }

        if (bookings.length > 0) {
          const b = bookings.find(x => x.id === routeId || x.linked_event_id === routeId);
          if (b) openEventDetail(b);
        }
      })();
    }
  }, [routeId, bookings]);

  useDataRefresh(loadData, ['bookings', 'accounting', 'all']);

  const openEventDetail = async (b: Booking) => {
    const store = projectManager.getStore();
    // FIX: Fetch fresh booking from DB to avoid staleness.
    // If not found by id (iCal bookings use external_ref as id), try external_ref fallback.
    let fresh = await store.getBooking(b.id);
    if (!fresh && b.external_ref) {
      fresh = await store.getBookingByExternalRef(b.external_ref);
    }
    setViewingBooking(fresh || b);
    setIsViewModalOpen(true);
  };

  // FIX: When bookings state refreshes (e.g. after a save), update the open detail modal
  // so it always shows current data without requiring the user to close and reopen.
  useEffect(() => {
    if (isViewModalOpen && viewingBooking) {
      const updated = bookings.find(b => b.id === viewingBooking.id);
      if (updated) setViewingBooking(updated);
    }
  }, [bookings]);

  const { confirmed, provisionalNotCovered, provisionalCovered } = useMemo(() => {
    const cf = bookings.filter(b => b.status !== 'cancelled' && isConfirmedBooking(b));
    const pr = bookings.filter(b => b.status !== 'cancelled' && isProvisionalBlock(b));
    const prNotCovered = pr.filter(p => !isCovered(p, cf));
    const prCovered = pr.filter(p => isCovered(p, cf));
    return { confirmed: cf, provisionalNotCovered: prNotCovered, provisionalCovered: prCovered };
  }, [bookings]);

  const displayBookings = useMemo(() => {
    if (showCovered) return [...confirmed, ...provisionalNotCovered, ...provisionalCovered];
    return [...confirmed, ...provisionalNotCovered];
  }, [confirmed, provisionalNotCovered, provisionalCovered, showCovered]);

  const getBookingsForDate = (date: Date) => {
    const dStr = toDateStr(date);
    return displayBookings.filter(b => {
      if (selectedPropertyId !== 'all' && b.property_id !== selectedPropertyId) return false;
      // REGLA VISUAL (Block 10): Incluimos el día de salida (`<=`) para pintar el chip de checkout.
      return dStr >= b.check_in && dStr <= b.check_out;
    });
  };

  type VisibleDay = { dayIndex: DayIndex; dateStr: string; inMonth: boolean };

  const visibleWeeks = useMemo((): VisibleDay[][] => {
    if (viewMode === 'weekly') {
      const start = startOfWeekMonday(currentDate);
      const startIdx = dayIndexFromLocalDate(start);
      const week: VisibleDay[] = [];
      for (let i = 0; i < 7; i++) {
        const idx = startIdx + i;
        week.push({ dayIndex: idx, dateStr: formatDay(idx), inMonth: true });
      }
      return [week];
    }

    if (viewMode === 'monthly') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstOfMonth = new Date(year, month, 1);
      const gridStart = startOfWeekMonday(firstOfMonth);
      const gridStartIdx = dayIndexFromLocalDate(gridStart);

      const weeks: VisibleDay[][] = [];
      for (let w = 0; w < 6; w++) {
        const week: VisibleDay[] = [];
        for (let d = 0; d < 7; d++) {
          const idx = gridStartIdx + (w * 7) + d;
          const dt = new Date(idx * MS_PER_DAY);
          const inMonth = dt.getUTCFullYear() === year && dt.getUTCMonth() === month;
          week.push({ dayIndex: idx, dateStr: formatDay(idx), inMonth });
        }
        weeks.push(week);
      }
      return weeks;
    }

    return [];
  }, [currentDate, viewMode]);

  const visibleDays = useMemo((): VisibleDay[] => {
    return visibleWeeks.flat();
  }, [visibleWeeks]);

  const viewStartDay = visibleDays.length ? visibleDays[0].dayIndex : null;
  const viewEndDayInclusive = visibleDays.length ? visibleDays[visibleDays.length - 1].dayIndex : null;

  // Monthly visible range definition (grid range, inclusive)
  const monthStartDay = (viewMode === 'monthly' && visibleWeeks.length) ? visibleWeeks[0][0].dayIndex : null;
  const monthEndDay = (viewMode === 'monthly' && visibleWeeks.length) ? visibleWeeks[visibleWeeks.length - 1][6].dayIndex : null;
  const visibleRangeInclusive: [DayIndex, DayIndex] | null = (viewStartDay !== null && viewEndDayInclusive !== null)
    ? [viewStartDay, viewEndDayInclusive]
    : null;

  type BookingReservation = ReservationLike & { booking: Booking };

  const reservationsForGrid = useMemo((): BookingReservation[] => {
    return displayBookings
      .filter(b => selectedPropertyId === 'all' || b.property_id === selectedPropertyId)
      .map((b) => ({
        id: b.id,
        apartmentId: b.apartment_id,
        checkIn: b.check_in,
        checkOut: b.check_out,
        status: b.status === 'blocked' ? 'blocked' : (b.status === 'cancelled' ? 'cancelled' : 'booked'),
        booking: b,
      }));
  }, [displayBookings, selectedPropertyId]);

  const apartmentsInTimeline = useMemo(() => {
    const filtered = selectedPropertyId === 'all'
      ? apartments
      : apartments.filter(a => a.property_id === selectedPropertyId);

    return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [apartments, selectedPropertyId]);

  const reservationsByApartment = useMemo(() => {
    const byApt = new Map<string, BookingReservation[]>();
    for (const apt of apartmentsInTimeline) byApt.set(apt.id, []);
    for (const r of reservationsForGrid) {
      const list = byApt.get(r.apartmentId) || [];
      list.push(r);
      byApt.set(r.apartmentId, list);
    }
    return byApt;
  }, [reservationsForGrid, apartmentsInTimeline]);

  const weekApartmentLaneAssignments = useMemo(() => {
    const out = new Map<number, Map<string, Array<LaneAssigned<BookingReservation>>>>();
    for (const week of visibleWeeks) {
      if (week.length !== 7) continue;
      const ws = week[0].dayIndex;
      const we = week[6].dayIndex;
      const byApt = new Map<string, Array<LaneAssigned<BookingReservation>>>();

      for (const apt of apartmentsInTimeline) {
        const list = reservationsByApartment.get(apt.id) || [];
        const assigned = assignLanes(list, {
          viewStartDay: ws,
          viewEndDayInclusive: we,
          includeCancelled: false,
        });
        byApt.set(apt.id, assigned);
      }

      out.set(ws, byApt);
    }
    return out;
  }, [visibleWeeks, apartmentsInTimeline, reservationsByApartment]);

  const [expandedApartments, setExpandedApartments] = useState<Set<string>>(new Set());
  const toggleApartmentExpand = useCallback((aptId: string) => {
    setExpandedApartments(prev => {
      const next = new Set(prev);
      if (next.has(aptId)) next.delete(aptId);
      else next.add(aptId);
      return next;
    });
  }, []);

  const upcomingBookings = useMemo(() => {
    const today = toDateStr(new Date());
    return confirmed
      .filter(b => b.check_in >= today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
      .slice(0, 5);
  }, [confirmed]);

  const navigateDate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'weekly') d.setDate(d.getDate() + dir * 7);
    else if (viewMode === 'monthly') d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Compacto */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center items-start gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
            <CalendarDays size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Calendario</h2>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>{viewMode === 'weekly' ? 'Vista Semanal' : (viewMode === 'yearly' ? 'Vista Anual' : 'Vista Mensual')}</span>
              <span>•</span>
              <span>
                {viewMode === 'yearly'
                  ? currentDate.getFullYear()
                  : (viewMode === 'weekly'
                    ? (visibleDays.length
                      ? `${formatDateES(visibleDays[0].dateStr)} — ${formatDateES(visibleDays[visibleDays.length - 1].dateStr)}`
                      : '')
                    : `${new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(currentDate)} ${currentDate.getFullYear()}`
                  )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
            <button onClick={() => setViewMode('weekly')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'weekly' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Semana</button>
            <button onClick={() => setViewMode('monthly')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'monthly' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Mes</button>
            <button onClick={() => setViewMode('yearly')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'yearly' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Año</button>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl flex items-center p-1">
            <button onClick={() => navigateDate(-1)} className="p-2 text-slate-400 hover:text-slate-800"><ChevronLeft size={20} /></button>
            <button onClick={() => navigateDate(1)} className="p-2 text-slate-400 hover:text-slate-800"><ChevronRight size={20} /></button>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 rounded-2xl border border-slate-100">
            <Filter size={14} className="text-slate-400" />
            <select className="bg-transparent text-[10px] font-bold text-slate-600 outline-none uppercase tracking-wide py-2" value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)}>
              <option value="all">Todas las Propiedades</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowCovered(!showCovered)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${showCovered ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
          >
            {showCovered ? 'Ocultar Cubiertos' : 'Ver Cubiertos'}
          </button>
        </div>
      </div>

      {viewMode === 'yearly' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, idx) => (
            <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 text-center uppercase mb-3">{new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(currentDate.getFullYear(), idx, 1))}</h4>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: new Date(currentDate.getFullYear(), idx + 1, 0).getDate() }, (_, i) => i + 1).map(d => {
                  const bookingsOnDay = getBookingsForDate(new Date(currentDate.getFullYear(), idx, d));
                  const apt = bookingsOnDay[0] ? apartments.find(a => a.id === bookingsOnDay[0].apartment_id) : null;
                  const isConflict = bookingsOnDay.some(b => b.conflict_detected);
                  const bg = isConflict ? '#f87171' : (apt?.color || (bookingsOnDay.length > 0 ? '#4f46e5' : null));
                  return (
                    <div key={d} className={`aspect-square rounded-[4px] text-[6px] flex items-center justify-center font-bold ${bg ? 'text-white' : 'text-slate-300'}`} style={{ backgroundColor: bg || 'transparent' }}>
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISTA SEMANA / MES (GRID SEMANAS): BARRAS POR RESERVA, CHECKOUT INCLUSIVO EN RENDER */
        <div className="w-full overflow-x-auto custom-scrollbar pb-4 -mb-4 touch-pan-x">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden select-none min-w-[850px] md:min-w-full">
            {visibleWeeks.length === 0 || viewStartDay === null || viewEndDayInclusive === null ? (
              <div className="p-8 text-slate-400 font-bold">No hay días para mostrar.</div>
            ) : (
              <>
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                  {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d, i) => (
                    <div key={d} className={`py-3 text-center text-[10px] font-black uppercase tracking-widest ${i >= 5 ? 'text-rose-400' : 'text-slate-400'}`}>{d}</div>
                  ))}
                </div>

                {(() => {
                  const MAX_LANES_COLLAPSED = 3;
                  const LANE_H = 22;
                  const LABEL_W = 220;
                  const todayIdx = dayIndexFromLocalDate(new Date());

                  return (
                    <div className="divide-y divide-slate-100">
                      {visibleWeeks.map((week) => {
                        if (week.length !== 7) return null;
                        const weekStart = week[0].dayIndex;
                        const weekEnd = week[6].dayIndex;
                        const perApt = weekApartmentLaneAssignments.get(weekStart) || new Map();

                        return (
                          <div key={weekStart} className="p-4">
                            {/* Week header row */}
                            <div className="flex gap-px bg-slate-200 rounded-2xl overflow-hidden">
                              <div className="bg-slate-50 px-4 py-2" style={{ width: LABEL_W }}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Semana</p>
                              </div>
                              <div className="grid grid-cols-7 gap-px flex-1">
                                {week.map((d) => {
                                  const dt = new Date(d.dayIndex * MS_PER_DAY);
                                  const dow = dt.getUTCDay();
                                  const isWeekend = dow === 0 || dow === 6;
                                  const isToday = d.dayIndex === todayIdx;
                                  return (
                                    <div
                                      key={d.dateStr}
                                      className={`bg-white px-2 py-2 ${!d.inMonth ? 'bg-slate-50/70' : ''}`}
                                    >
                                      <span className={`text-[10px] font-black ${isToday ? 'text-white bg-indigo-600 rounded-full w-5 h-5 flex items-center justify-center' : (isWeekend ? 'text-rose-400' : (d.inMonth ? 'text-slate-700' : 'text-slate-300'))}`}>
                                        {dt.getUTCDate()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Apartment rows */}
                            <div className="mt-3 space-y-3">
                              {apartmentsInTimeline.map((apt) => {
                                const assigned = perApt.get(apt.id) || [];
                                const laneCount = assigned.length ? (Math.max(...assigned.map(x => x.laneIndex)) + 1) : 0;
                                const isExpanded = expandedApartments.has(apt.id);
                                const lanesToShow = isExpanded ? laneCount : Math.min(laneCount, MAX_LANES_COLLAPSED);
                                const hiddenLanes = Math.max(0, laneCount - lanesToShow);

                                const byLane = new Map<number, Array<LaneAssigned<BookingReservation>>>();
                                for (let i = 0; i < laneCount; i++) byLane.set(i, []);
                                for (const a of assigned) {
                                  const list = byLane.get(a.laneIndex) || [];
                                  list.push(a);
                                  byLane.set(a.laneIndex, list);
                                }

                                return (
                                  <div key={`${weekStart}-${apt.id}`} className="flex gap-3">
                                    <div className="shrink-0" style={{ width: LABEL_W }}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: apt.color || '#4f46e5' }}></div>
                                            <p className="text-xs font-black text-slate-800 truncate">{apt.name}</p>
                                          </div>
                                          <p className="text-[10px] font-bold text-slate-400 truncate">{laneCount ? `${laneCount} lanes` : 'Sin reservas'}</p>
                                        </div>
                                        {hiddenLanes > 0 && (
                                          <button
                                            onClick={() => toggleApartmentExpand(apt.id)}
                                            className="shrink-0 px-3 py-1 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-500 hover:text-indigo-600"
                                            title={isExpanded ? 'Colapsar lanes' : 'Expandir lanes'}
                                          >
                                            {isExpanded ? 'Ocultar' : `+${hiddenLanes} más`}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex-1 min-w-[560px] space-y-[2px]">
                                      {laneCount === 0 ? (
                                        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden" style={{ height: LANE_H }}>
                                          {week.map((d) => (
                                            <div key={`${weekStart}-empty-${apt.id}-${d.dateStr}`} className={`bg-white ${!d.inMonth ? 'bg-slate-50/70' : ''}`}></div>
                                          ))}
                                        </div>
                                      ) : (
                                        Array.from({ length: lanesToShow }, (_, laneIdx) => {
                                          const laneItems = byLane.get(laneIdx) || [];
                                          return (
                                            <div key={`${weekStart}-${apt.id}-lane-${laneIdx}`} className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden" style={{ height: LANE_H }}>
                                              {week.map((d) => (
                                                <div key={`${weekStart}-${apt.id}-${laneIdx}-${d.dateStr}`} className={`bg-white ${!d.inMonth ? 'bg-slate-50/70' : ''}`}></div>
                                              ))}

                                              {laneItems.map((it) => {
                                                const b = it.booking;
                                                const traveler = travelers.find(t => t.id === b.traveler_id);

                                                const monthClipStart = monthStartDay !== null ? monthStartDay : weekStart;
                                                const monthClipEnd = monthEndDay !== null ? monthEndDay : weekEnd;
                                                const clippedStart = Math.max(it.renderStartDay, weekStart, monthClipStart);
                                                const clippedEnd = Math.min(it.renderEndDayInclusive, weekEnd, monthClipEnd);
                                                if (clippedStart > clippedEnd) return null;

                                                const colStart = (clippedStart - weekStart) + 1;
                                                const colEnd = (clippedEnd - weekStart) + 2;

                                                const isBlock = isProvisionalBlock(b);
                                                const baseColor = isBlock ? '#94a3b8' : (apt.color || '#4f46e5');
                                                const isConflict = b.conflict_detected;
                                                const isBlack = baseColor === '#000000' || baseColor === '#000';
                                                const textColor = isBlack ? '#FFFFFF' : '#000000';

                                                const style = isConflict
                                                  ? {
                                                    gridColumn: `${colStart} / ${colEnd}`,
                                                    gridRow: 1,
                                                    height: LANE_H,
                                                    backgroundImage: `repeating-linear-gradient(45deg, ${baseColor}, ${baseColor} 5px, #ef4444 5px, #ef4444 10px)`,
                                                    border: '1px solid #ef4444',
                                                    color: textColor,
                                                  }
                                                  : {
                                                    gridColumn: `${colStart} / ${colEnd}`,
                                                    gridRow: 1,
                                                    height: LANE_H,
                                                    backgroundColor: baseColor,
                                                    color: textColor,
                                                  };

                                                return (
                                                  <div
                                                    key={`${weekStart}-${apt.id}-${b.id}`}
                                                    onClick={(e) => { e.stopPropagation(); openEventDetail(b); }}
                                                    className={`z-10 px-2 text-[10px] font-black flex items-center rounded-md shadow-sm cursor-pointer hover:brightness-110 transition-all overflow-hidden whitespace-nowrap ${isConflict ? 'animate-pulse' : ''} ${isBlock ? 'opacity-70 grayscale-[0.5]' : ''}`}
                                                    style={style as any}
                                                    data-reservation-id={b.id}
                                                    data-week-start={weekStart}
                                                    title={`${isBlock ? 'BLOQUEO' : getBookingDisplayName(b, traveler)} - ${apt.name} (${b.check_in} → ${b.check_out})`}
                                                  >
                                                    <span className="truncate w-full drop-shadow-sm">
                                                      {isConflict && <AlertTriangle size={10} style={{ color: textColor, fill: textColor }} />}
                                                      <span className="ml-1">{b.event_kind === 'BLOCK' ? 'Bloqueo OTA' : (isBlock ? 'BLOQUEO' : getBookingDisplayName(b, traveler))}</span>
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* Tarjeta de Próximas Reservas */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Clock className="text-indigo-600" /> Próximas Llegadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingBookings.map(b => {
            const apt = apartments.find(a => a.id === b.apartment_id);
            const trav = travelers.find(t => t.id === b.traveler_id);
            const guestName = getBookingDisplayName(b, trav);

            const handleClick = () => {
              if (b.linked_event_id) {
                navigate(`/calendar/event/${b.linked_event_id}`);
              } else {
                navigate(`/bookings/${b.id}`);
              }
            };

            return (
              <div
                key={b.id}
                onClick={handleClick}
                className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 hover:bg-slate-100 transition-colors cursor-pointer group"
              >
                <div className="w-2 h-12 rounded-full" style={{ backgroundColor: apt?.color || '#ccc' }}></div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{guestName}</p>
                  <p className="text-xs text-slate-500 font-bold">{formatDateRangeES(b.check_in, b.check_out)}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-indigo-900">{b.guests || 1}</span>
                  <p className="text-[8px] uppercase font-black text-slate-400">PAX</p>
                </div>
              </div>
            );
          })}
          {upcomingBookings.length === 0 && <p className="text-slate-400 italic">No hay llegadas previstas próximamente.</p>}
        </div>
      </div>

      {/* Modal Detalle */}
      {isViewModalOpen && viewingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-800"><X size={24} /></button>

            {viewingBooking.conflict_detected && (
              <div className="bg-amber-100 text-amber-700 p-4 rounded-2xl mb-6 flex items-center gap-3 border border-amber-200">
                <AlertTriangle size={24} />
                <div className="text-xs font-bold">
                  <p className="uppercase mb-1">Conflicto Detectado</p>
                  <p className="opacity-80">Esta reserva se solapa con otra. Revisa el Channel Manager.</p>
                </div>
              </div>
            )}

            <h3 className="text-2xl font-black text-slate-800 mb-6">Detalle de Reserva</h3>
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidad Asignada</p>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: apartments.find(a => a.id === viewingBooking.apartment_id)?.color }}></div>
                  <p className="text-lg font-bold text-slate-800">{apartments.find(a => a.id === viewingBooking.apartment_id)?.name || 'Sin Asignar'}</p>
                </div>
              </div>
              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Huésped</p>
                <div className="flex justify-between items-end">
                  <p className="text-xl font-black text-indigo-900">{viewingBooking.event_kind === 'BLOCK' ? 'Bloqueo OTA' : getBookingDisplayName(viewingBooking, travelers.find(t => t.id === viewingBooking.traveler_id))}</p>
                  {isProvisionalBlock(viewingBooking) ? (
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl shadow-sm flex items-center gap-1">
                      <AlertCircle size={12} /> Bloqueo
                    </span>
                  ) : (
                    <span className="text-lg font-black text-indigo-600 bg-white px-3 py-1 rounded-xl shadow-sm">{viewingBooking.guests || 1} PAX</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Entrada</p>
                  <p className="font-bold text-lg text-slate-700">{formatDateES(viewingBooking.check_in)}</p>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Salida</p>
                  <p className="font-bold text-lg text-slate-700">{formatDateES(viewingBooking.check_out)}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  if (viewingBooking.id && !viewingBooking.id.startsWith('evt-')) {
                    navigate(`/bookings/${viewingBooking.id}`);
                  } else {
                    // It's a raw event, maybe promote it? 
                    // For now just navigate to bookings with provisional data?
                    // Or just show it can't be edited directly as a booking yet.
                    alert("Este evento proviene de iCal directo. Conviértelo en reserva desde 'Review' para editarlo totalmente.");
                  }
                }}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Clock size={18} /> Gestionar
              </button>
            </div>

            {!viewingBooking.external_ref ? (
              <button onClick={async () => {
                if (confirm("¿Estás seguro?")) {
                  await projectManager.getStore().deleteBooking(viewingBooking.id);
                  await projectManager.saveProject();
                  setIsViewModalOpen(false);
                  loadData();
                  notifyDataChanged();
                }
              }} className="w-full mt-8 py-4 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors"><Trash2 size={18} /> Eliminar Reserva</button>
            ) : (
              <div className="w-full mt-8 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black flex items-center justify-center gap-2 border border-slate-100">
                <ShieldCheck size={18} /> Sincronizado con OTA (Solo Lectura)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Calendar: React.FC = () => (
  <CalendarErrorBoundary>
    <CalendarContent />
  </CalendarErrorBoundary>
);
