
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { bookingRequestImporter } from '../services/bookingRequestImporter';
import { Booking, Property, Traveler, Apartment, AccountingMovement } from '../types';
import { projectPersistence } from '../services/projectPersistence';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { Plus, Calendar, Trash2, CheckCircle, Clock, XCircle, X, MessageCircle, Edit2, AlertCircle, FileInput, Upload, CreditCard, Search, Filter } from 'lucide-react';
import { DirectPaymentList } from '../components/DirectPaymentList';
import { formatDateES } from '../utils/dateFormat';
import { isConfirmedBooking, isProvisionalBlock, hasRealGuest, hasAmountPositive } from '../utils/bookingClassification';
import { getBookingDisplayName } from '../utils/bookingDisplay';
import { mapCalendarEventToBooking, mergeBookingsAndEvents } from '../utils/bookingMapping';
import { AlertTriangle } from 'lucide-react';
import { getStayStatus } from '../utils/bookingStayStatus';

export const Bookings: React.FC = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [allApartments, setAllApartments] = useState<Apartment[]>([]);
  const [dataSource, setDataSource] = useState<'ical' | 'internal'>('ical');
  const [formApartments, setFormApartments] = useState<Apartment[]>([]);

  const [viewMode, setViewMode] = useState<'list' | 'payments'>('list');
  const [sortBy, setSortBy] = useState<string>(() => localStorage.getItem('bookings_sort_by') || 'checkin_asc');

  useEffect(() => {
    localStorage.setItem('bookings_sort_by', sortBy);
  }, [sortBy]);

  // Search & Filters
  const [activeMainTab, setActiveMainTab] = useState<'ALL' | 'TODAY'>('ALL');
  const [filterDateMode, setFilterDateMode] = useState<'arrivals_today' | 'active_today' | 'departures_today'>('arrivals_today');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterChannel, setFilterChannel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterApartment, setFilterApartment] = useState('ALL');
  const [filterStayStatus, setFilterStayStatus] = useState('ALL');
  const [includeBlocks, setIncludeBlocks] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  const runDebug = async () => {
    const store = projectManager.getStore();
    const tables = await store.query("SELECT name FROM sqlite_master WHERE type='table'");
    const allCounts: any[] = [];
    for (const t of tables) {
      try {
        const c = await store.query(`SELECT COUNT(*) as c FROM ${t.name}`);
        if (c[0]?.c > 0) {
          allCounts.push({ name: t.name, count: c[0].c });
        }
      } catch (e) { }
    }

    setDebugData({
      project_id: (projectManager as any).currentProjectId,
      mode: projectManager.getCurrentMode(),
      ui_bookings: bookings.length,
      all_counts: allCounts.sort((a, b) => b.count - a.count),
      active_property: projectManager.getActivePropertyId(),
      ls_active_id: localStorage.getItem('active_project_id'),
    });
  };

  useEffect(() => {
    if (showDebug) runDebug();
  }, [showDebug, bookings.length]);

  const [form, setForm] = useState<Partial<Booking>>({
    property_id: '',
    apartment_id: '',
    traveler_id: '',
    check_in: '',
    check_out: '',
    status: 'pending',
    total_price: 0,
    guests: 1,
    source: 'manual', // Default
    guest_name: '',
    payment_notes: '',
    payments: []
  });

  // Extra form field for Payment Method (mapped to accounting)
  const [paymentMethod, setPaymentMethod] = useState<string>('Transferencia');

  const loadData = useCallback(async () => {
    const store = projectManager.getStore();
    try {
      const [tableBookings, p, t, a] = await Promise.all([
        store.getBookings(),
        store.getProperties(),
        store.getTravelers(),
        store.getAllApartments()
      ]);

      setProperties(p);
      setTravelers(t);
      setAllApartments(a);

      console.debug(`[Bookings] Source of Truth: SQLITE_TABLE. Result: ${tableBookings.length} bookings.`);

      setBookings(tableBookings);
      setDataSource('internal');
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle routing for deep links (F1)
  useEffect(() => {
    if (routeId && bookings.length > 0) {
      const b = bookings.find(x => x.id === routeId);
      if (b) {
        openEditModal(b);
      }
    }
  }, [routeId, bookings]);

  useDataRefresh(loadData);

  // Handle URL filters from Dashboard (D1.1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');
    if (filter === 'arrivals_today') {
      setActiveMainTab('TODAY');
      setFilterDateMode('arrivals_today');
    } else if (filter === 'active_today') {
      setActiveMainTab('TODAY');
      setFilterDateMode('active_today');
    } else if (filter === 'departures_today') {
      setActiveMainTab('TODAY');
      setFilterDateMode('departures_today');
    }
  }, []);

  useEffect(() => {
    if (form.property_id) {
      projectManager.getStore().getApartments(form.property_id).then(setFormApartments);
    } else {
      setFormApartments([]);
    }
  }, [form.property_id]);

  const openEditModal = async (b: Booking) => {
    setEditingBookingId(b.id);
    setForm({
      property_id: b.property_id,
      apartment_id: b.apartment_id,
      traveler_id: b.traveler_id,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status,
      total_price: b.total_price,
      guests: b.guests,
      source: b.source,
      guest_name: b.guest_name || '',
      payment_notes: b.payment_notes || b.summary || '',
      payments: b.payments || []
    });

    // Try to find associated movement to preload payment method
    const movements = await projectManager.getStore().getMovements('ALL');
    const mov = movements.find(m => m.reservation_id === b.id);
    if (mov) setPaymentMethod(mov.payment_method);
    else setPaymentMethod('Transferencia');

    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingBookingId(null);
    setForm({
      property_id: projectManager.getActivePropertyId(), // Block 11-D: Default to active
      apartment_id: '', traveler_id: '',
      check_in: '', check_out: '', status: 'pending',
      total_price: 0, guests: 1, source: 'manual',
      payments: [
        { id: crypto.randomUUID(), type: 'confirmacion', amount: 0, date: '', method: 'Transferencia', status: 'pendiente' },
        { id: crypto.randomUUID(), type: 'final', amount: 0, date: '', method: 'Transferencia', status: 'pendiente' }
      ]
    });
    setPaymentMethod('Transferencia');
    setIsModalOpen(true);
  };

  const addPayment = () => {
    const newPayment: any = {
      id: crypto.randomUUID(),
      type: 'extra',
      amount: 0,
      date: form.check_in || '',
      method: 'Transferencia',
      status: 'pendiente'
    };
    setForm(f => ({ ...f, payments: [...(f.payments || []), newPayment] }));
  };

  const updatePayment = (id: string, updates: any) => {
    setForm(f => ({
      ...f,
      payments: (f.payments || []).map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const removePayment = (id: string) => {
    setForm(f => ({
      ...f,
      payments: (f.payments || []).filter(p => p.id !== id)
    }));
  };

  const handleImportRequest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await bookingRequestImporter.import(text);

      if (result.success) {
        await projectManager.saveProject();
        alert(result.message);
        notifyDataChanged();
        loadData();
      } else {
        alert("Error: " + result.message);
      }
    } catch (err: any) {
      alert("Error crítico importando solicitud: " + err.message);
    } finally {
      e.target.value = ''; // Reset input
    }
  };



  const uniqueChannels = React.useMemo(() => {
    const channels = new Set(bookings.map(b => b.source));
    return Array.from(channels).sort();
  }, [bookings]);

  const processedBookings = React.useMemo(() => {
    let result = [...bookings];

    // 1. Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(b => {
        const traveler = travelers.find(t => t.id === b.traveler_id);
        const tName = traveler ? (traveler.nombre + ' ' + traveler.apellidos).toLowerCase() : (b.guest_name || '').toLowerCase();
        const tDoc = traveler?.documento?.toLowerCase() || '';
        const extRef = b.external_ref?.toLowerCase() || '';
        const summary = b.summary?.toLowerCase() || '';
        const notes = b.payment_notes?.toLowerCase() || '';
        // Also search in apartment name
        const aptName = allApartments.find(a => a.id === b.apartment_id)?.name?.toLowerCase() || '';

        return tName.includes(lower) ||
          tDoc.includes(lower) ||
          extRef.includes(lower) ||
          summary.includes(lower) ||
          notes.includes(lower) ||
          aptName.includes(lower);
      });
    }

    if (activeMainTab === 'ALL') {
      if (filterChannel !== 'ALL') {
        result = result.filter(b => b.source === filterChannel);
      }
      if (filterStatus !== 'ALL') {
        result = result.filter(b => b.status === filterStatus);
      }
      if (filterApartment !== 'ALL') {
        result = result.filter(b => b.apartment_id === filterApartment);
      }
    }

    // 1b. Block Filter
    if (activeMainTab === 'ALL' && !includeBlocks) {
      result = result.filter(b => !isProvisionalBlock(b));
    }

    // 1c. Date Mode Filter (D1.1)
    if (activeMainTab === 'TODAY') {
      const todayISO = new Date().toLocaleDateString('en-CA');
      result = result.filter(b => {
        if (!isConfirmedBooking(b)) return false;
        if (filterDateMode === 'arrivals_today') return b.check_in === todayISO;
        if (filterDateMode === 'departures_today') return b.check_out === todayISO;
        if (filterDateMode === 'active_today') return todayISO >= b.check_in && todayISO < b.check_out;
        return true;
      });
    }

    if (activeMainTab === 'ALL' && filterStayStatus !== 'ALL') {
      result = result.filter(b => {
        const status = getStayStatus(b.check_in, b.check_out);
        return status === filterStayStatus;
      });
    }

    // 2. Sort
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'checkin_asc':
          return a.check_in.localeCompare(b.check_in);
        case 'checkin_desc':
          return b.check_in.localeCompare(a.check_in);
        case 'checkout_asc':
          return a.check_out.localeCompare(b.check_out);
        case 'checkout_desc':
          return b.check_out.localeCompare(a.check_out);
        case 'created_desc':
          return (b.created_at || b.updated_at || 0) - (a.created_at || a.updated_at || 0);
        case 'apartment':
          const aptA = allApartments.find(apt => apt.id === a.apartment_id)?.name || '';
          const aptB = allApartments.find(apt => apt.id === b.apartment_id)?.name || '';
          return aptA.localeCompare(aptB);
        case 'channel':
          return a.source.localeCompare(b.source);
        case 'status':
          // Confirmed first, then Pending
          if (a.status === b.status) return 0;
          return a.status === 'confirmed' ? -1 : 1;
        default:
          return 0;
      }
    });
  }, [bookings, sortBy, allApartments, searchTerm, filterChannel, filterStatus, filterApartment, filterStayStatus, travelers]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterChannel('ALL');
    setFilterStatus('ALL');
    setFilterApartment('ALL');
    setFilterStayStatus('ALL');
    setIncludeBlocks(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const store = projectManager.getStore();

    // GUARDRAIL: Validar fechas
    if (form.check_in && form.check_out && form.check_out <= form.check_in) {
      if (!confirm("La fecha de salida debe ser posterior a la de entrada. ¿Deseas que el sistema la ajuste automáticamente a 1 noche?")) {
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(true);

    try {
      const b: Booking = {
        id: editingBookingId || crypto.randomUUID(),
        property_id: form.property_id || '',
        apartment_id: form.apartment_id || '',
        traveler_id: form.traveler_id || '',
        check_in: form.check_in || '',
        check_out: form.check_out || '',
        status: form.status as any || 'pending',
        total_price: Number(form.total_price) || 0,
        guests: Number(form.guests) || 1,
        source: form.source || 'manual',
        guest_name: form.guest_name || '',
        payment_notes: form.payment_notes || '',
        payments: form.payments || [],
        created_at: editingBookingId ? (bookings.find(bo => bo.id === editingBookingId)?.created_at || Date.now()) : Date.now(),
        // Preserve external ref if editing
        external_ref: editingBookingId ? bookings.find(bo => bo.id === editingBookingId)?.external_ref : undefined,
        project_id: projectManager.getCurrentProjectId() || undefined
      };

      // Refined Rule: No Guest and No Amount => classify as Block
      if (b.status === 'confirmed' && isProvisionalBlock(b)) {
        if (!confirm("Esta entrada no tiene Huésped o Importe. Se guardará como BLOQUEO manual. ¿Continuar?")) {
          setIsSaving(false);
          return;
        }
      }

      console.log("[SAVE:UI] start", { bookingId: b.id, projectId: b.project_id });
      if (editingBookingId) {
        await store.updateReservation(editingBookingId, b, 'MANUAL');
      } else {
        await store.saveBooking(b);
      }

      console.log("[SAVE:UI] sqlite_written");

      // The store now handles accounting sync automatically (or we call it here if we prefer)
      // Since I will make syncAccountingMovementsFromBooking public and call it from saveBooking/updateReservation,
      // we don't need any of the code below.

      console.log("[SAVE:UI] calling saveProject");
      await projectManager.saveProject();
      console.log("[SAVE:UI] saveProject_done");
      notifyDataChanged();
      await loadData();

      // CLOSE & NAVIGATE BACK (Important to clear route param)
      setIsModalOpen(false);
      if (routeId) {
        navigate('/bookings');
      }
    } catch (err: any) {
      console.error("Error saving booking:", err);
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar reserva permanentemente? Esto no borra el apunte contable asociado si existe.')) {
      await projectManager.getStore().deleteBooking(id);
      await projectManager.saveProject();
      notifyDataChanged();
      loadData();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Listado de Reservas</h2>
          <p className="text-slate-500">Gestión de reservas e integración contable automática.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            className="hidden"
            onChange={handleImportRequest}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-slate-600 border border-slate-200 px-6 py-4 rounded-3xl font-bold text-xs shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-2"
            title="Importar booking_request.json"
          >
            <Upload size={16} /> Importar Solicitud
          </button>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`px-6 py-4 rounded-3xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 border ${showDebug ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'}`}
          >
            <AlertCircle size={16} /> DEBUG
          </button>
          <button onClick={openNewModal} className="bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black text-xs shadow-xl shadow-indigo-100 hover:scale-105 transition-all flex items-center gap-2">
            <Plus size={16} /> Añadir Reserva
          </button>
        </div>
      </div>

      {/* Fallback Banner */}
      {dataSource === 'internal' && (
        <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[2.5rem] flex items-center gap-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-amber-800">Mostrando datos de Base Interna</h3>
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">No se han encontrado eventos de sincronización iCal. Los datos mostrados corresponden a reservas manuales y archivadas en el sistema.</p>
          </div>
        </div>
      )}

      {showDebug && debugData && (
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white animate-in zoom-in duration-300 shadow-2xl mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-tighter text-indigo-400">Panel de Diagnóstico de Origen de Datos</h3>
            <button onClick={() => setShowDebug(false)}><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Contexto Activo</p>
              <p className="text-xs font-mono text-emerald-400">ID: {debugData.project_id}</p>
              <p className="text-xs font-bold text-slate-300 uppercase mt-1">Modo: {debugData.mode}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tablas con Datos</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {debugData.all_counts.map((t: any) => (
                  <p key={t.name} className="text-[10px] flex justify-between font-mono">
                    <span className={t.name === 'bookings' ? 'text-indigo-400 font-bold' : 'text-slate-400'}>{t.name}:</span>
                    <span className="text-white">{t.count}</span>
                  </p>
                ))}
                {debugData.all_counts.length === 0 && <p className="text-[10px] text-slate-500 italic">Base de datos vacía</p>}
              </div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Estado Persistencia</p>
              <p className="text-[10px] text-slate-400 truncate">LS Active: {debugData.ls_active_id}</p>
              <p className="text-[10px] text-slate-400">Propiedad: {debugData.active_property}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Análisis de Mismatch</p>
              {debugData.ui_bookings > 0 && !debugData.all_counts.find((x: any) => x.name === 'bookings') ? (
                <p className="text-[10px] text-rose-400 font-bold leading-tight">⚠️ CONTRADICCIÓN CRÍTICA: La UI tiene {debugData.ui_bookings} reservas pero la tabla 'bookings' está vacía o no existe.</p>
              ) : debugData.ui_bookings > 0 ? (
                <p className="text-[10px] text-emerald-400 font-bold">Estado coherente: {debugData.ui_bookings} reservas detectadas.</p>
              ) : (
                <p className="text-[10px] text-slate-400 italic">No hay datos en UI ni en DB Bookings.</p>
              )}
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={runDebug} className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 px-4 py-2 rounded-xl">Refresh counts</button>
            <button
              onClick={async () => {
                try {
                  const list = await projectPersistence.listProjects();
                  console.log("ALL PROJECTS DATA:", list);
                  alert(`Proyectos en DB: ${list.length}\n${list.map((p: any) => `- ${p.name || 'Sin nombre'} [${p.mode}] (${p.id}) size: ${p.sizeBytes || 0}`).join('\n')}`);
                } catch (e: any) {
                  alert("Error listando proyectos: " + e.message);
                }
              }}
              className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 px-4 py-2 rounded-xl"
            >
              List all Projects
            </button>
            <button onClick={() => console.log("DEBUG_DATA:", debugData)} className="text-[10px] font-black uppercase tracking-widest bg-slate-700 px-4 py-2 rounded-xl">Log to Console</button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('list')}
            className={`pb-4 px-4 font-bold text-sm transition-colors border-b-2 ${viewMode === 'list' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <div className="flex items-center gap-2"><Calendar size={16} /> Listado General</div>
          </button>
          <button
            onClick={() => setViewMode('payments')}
            className={`pb-4 px-4 font-bold text-sm transition-colors border-b-2 ${viewMode === 'payments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <div className="flex items-center gap-2"><CreditCard size={16} /> Cobros Directos</div>
          </button>
        </div>

        {viewMode === 'list' && (activeMainTab === 'ALL' ? (
          <div className="pb-2 pr-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-300"
            >
              <option value="checkin_asc">Check-in (Próximos primero)</option>
              <option value="checkin_desc">Check-in (Lejanos primero)</option>
              <option value="checkout_asc">Check-out (Próximos primero)</option>
              <option value="checkout_desc">Check-out (Lejanos primero)</option>
              <option value="created_desc">Fecha Creación (Recientes)</option>
              <option value="apartment">Apartamento</option>
              <option value="channel">Canal (Origen)</option>
              <option value="status">Estado</option>
            </select>
          </div>
        ) : (
          <div className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50 px-4 py-1.5 rounded-full border border-slate-200">
            Vista Operativa: {filterDateMode === 'arrivals_today' ? 'Llegadas' : filterDateMode === 'active_today' ? 'Activas' : 'Salidas'} ({processedBookings.length})
          </div>
        ))}
      </div>

      {viewMode === 'list' && (
        <div className="flex flex-col gap-6">
          {/* Main Tabs Segmented */}
          <div className="flex justify-center">
            <div className="inline-flex bg-slate-100 p-1.5 rounded-[2rem] shadow-inner gap-1">
              <button
                onClick={() => setActiveMainTab('TODAY')}
                className={`px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeMainTab === 'TODAY' ? 'bg-white text-indigo-600 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Hoy Operativo
              </button>
              <button
                onClick={() => setActiveMainTab('ALL')}
                className={`px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeMainTab === 'ALL' ? 'bg-white text-indigo-600 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Todas las Reservas
              </button>
            </div>
          </div>

          {activeMainTab === 'ALL' && (
            <div className="flex justify-center animate-in zoom-in-95 duration-300">
              <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm gap-2">
                <button
                  onClick={() => setFilterStayStatus('ALL')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStayStatus === 'ALL' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterStayStatus('upcoming')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStayStatus === 'upcoming' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Por Venir
                </button>
                <button
                  onClick={() => setFilterStayStatus('staying')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStayStatus === 'staying' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  En Estancia
                </button>
                <button
                  onClick={() => setFilterStayStatus('past')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStayStatus === 'past' ? 'bg-slate-400 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Pasadas
                </button>
              </div>
            </div>
          )}

          {activeMainTab === 'TODAY' && (
            <div className="flex justify-center animate-in zoom-in-95 duration-300">
              <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm gap-2">
                <button
                  onClick={() => setFilterDateMode('arrivals_today')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterDateMode === 'arrivals_today' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Llegadas Hoy
                </button>
                <button
                  onClick={() => setFilterDateMode('active_today')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterDateMode === 'active_today' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Activas
                </button>
                <button
                  onClick={() => setFilterDateMode('departures_today')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterDateMode === 'departures_today' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Salidas Hoy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTER BAR */}
      {viewMode === 'list' && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center animate-in fade-in slide-in-from-top-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar huésped, ref, notas..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 transition-colors placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {activeMainTab === 'ALL' && (
            <>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filterApartment}
                  onChange={(e) => setFilterApartment(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-300"
                >
                  <option value="ALL">Todos los Apartamentos</option>
                  {allApartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>

                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-300"
                >
                  <option value="ALL">Todos los Canales</option>
                  {uniqueChannels.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-300"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="pending">Pendiente</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              <button
                onClick={() => setIncludeBlocks(!includeBlocks)}
                className={`px-4 py-3 rounded-2xl text-xs font-black transition-all border ${includeBlocks ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
              >
                {includeBlocks ? '✓ Mostrando Bloqueos' : 'Mostrar Bloqueos'}
              </button>
            </>
          )}

          {(searchTerm || (activeMainTab === 'ALL' && (filterChannel !== 'ALL' || filterStatus !== 'ALL' || filterApartment !== 'ALL' || includeBlocks))) && (
            <button
              onClick={() => { clearFilters(); }}
              className="flex items-center gap-2 px-4 py-3 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black hover:bg-rose-100 transition-colors"
            >
              <XCircle size={16} /> Limpiar
            </button>
          )}
        </div>
      )}

      {
        viewMode === 'payments' ? (
          <DirectPaymentList onUpdate={loadData} />
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Unidad / Propiedad</th>
                  <th className="px-8 py-5">Huésped</th>
                  <th className="px-8 py-5">Origen</th>
                  <th className="px-8 py-5">Fechas</th>
                  <th className="px-8 py-5">Importe</th>
                  <th className="px-8 py-5">Estado</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedBookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-800">{allApartments.find(a => a.id === b.apartment_id)?.name || 'N/A'}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{properties.find(p => p.id === b.property_id)?.name || 'N/A'}</div>
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-700">
                      {b.event_kind === 'BLOCK' ? 'Bloqueo OTA' : getBookingDisplayName(b, travelers.find(t => t.id === b.traveler_id))}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${b.source === 'WEBSITE_IMPORT' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {b.source}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-xs text-slate-500 font-bold">
                      {formatDateES(b.check_in)} al {formatDateES(b.check_out)}
                      {b.conflict_detected && <span className="block text-[9px] text-rose-500 font-black mt-1 flex items-center gap-1"><AlertCircle size={10} /> CONFLICTO</span>}
                    </td>
                    <td className={`px-8 py-5 font-black ${isProvisionalBlock(b) || b.status === 'blocked' ? 'text-amber-600' : 'text-slate-900'}`}>
                      {b.event_kind === 'BLOCK' ? 'Bloqueo OTA' : (isProvisionalBlock(b) || b.status === 'blocked' ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle size={12} /> Bloqueo
                        </span>
                      ) : (
                        `${b.total_price}€`
                      ))}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        {(() => {
                          const stay = getStayStatus(b.check_in, b.check_out);
                          if (stay === 'upcoming') return <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100/50">Por Venir</span>;
                          if (stay === 'staying') return <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100/50 animate-pulse">En Estancia</span>;
                          return <span className="inline-flex items-center justify-center bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200/50">Pasada</span>;
                        })()}
                        <div className="flex items-center gap-2 px-1">
                          {b.status === 'confirmed' ? (
                            <span className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1"><CheckCircle size={10} /> Confirmada</span>
                          ) : b.status === 'blocked' ? (
                            <span className="text-[9px] font-bold text-amber-500 uppercase flex items-center gap-1"><Clock size={10} /> Bloqueo</span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-500 uppercase flex items-center gap-1"><Clock size={10} /> Pendiente</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                      <button onClick={() => openEditModal(b)} className="text-slate-300 hover:text-indigo-600 transition-colors p-2 bg-slate-50 rounded-xl" title="Editar"><Edit2 size={18} /></button>
                      <button
                        onClick={() => navigate('/comms', { state: { travelerId: b.traveler_id } })}
                        className="text-slate-300 hover:text-indigo-600 transition-colors p-2 bg-slate-50 rounded-xl"
                        title="Enviar Mensaje"
                      >
                        <MessageCircle size={18} />
                      </button>
                      {!b.external_ref && (
                        <button onClick={() => handleDelete(b.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 bg-slate-50 rounded-xl" title="Eliminar"><Trash2 size={18} /></button>
                      )}
                      {b.external_ref && (
                        <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-lg">Sólo Lectura (OTA)</span>
                      )}
                    </td>
                  </tr>
                ))}
                {processedBookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center text-slate-400 italic">
                      {bookings.length === 0 ? "No hay reservas registradas." : "No se encontraron reservas con los filtros actuales."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      }

      {
        isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{editingBookingId ? 'Editar Reserva' : 'Nueva Reserva Manual'}</h3>
                  {isProvisionalBlock(form) && (
                    <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2 inline-block">Modo Bloqueo Activado</span>
                  )}
                </div>
                <button onClick={() => {
                  setIsModalOpen(false);
                  if (routeId) navigate('/bookings');
                }} className="text-slate-400"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Propiedad</label>
                    <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Apartamento</label>
                    <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.apartment_id} onChange={e => setForm({ ...form, apartment_id: e.target.value })} disabled={!form.property_id}>
                      <option value="">Seleccionar...</option>
                      {formApartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Vincular a Huésped Existente</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.traveler_id} onChange={e => setForm({ ...form, traveler_id: e.target.value })}>
                      <option value="">(SIN VINCULAR - USAR NOMBRE MANUAL)</option>
                      {travelers.map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellidos}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Nombre del Huésped (Manual/iCal)</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-50 border rounded-2xl font-bold"
                      placeholder="Nombre completo..."
                      value={form.guest_name}
                      onChange={e => setForm({ ...form, guest_name: e.target.value })}
                    />
                  </div>
                </div>

                {/* DESGLOSE DE PAGOS (Multi-Payment Section) */}
                <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200 space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <CreditCard size={18} className="text-indigo-600" /> Desglose de Pagos
                    </h4>
                    <button
                      type="button"
                      onClick={addPayment}
                      className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-2"
                    >
                      <Plus size={14} /> Añadir Extra
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(form.payments || []).map((p, idx) => (
                      <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-3 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Concepto</label>
                          <select
                            className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                            value={p.type}
                            onChange={e => updatePayment(p.id, { type: e.target.value })}
                          >
                            <option value="confirmacion">Confirmación</option>
                            <option value="final">Pago Final</option>
                            <option value="extra">Extra / Otros</option>
                          </select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Importe</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                            value={p.amount}
                            onChange={e => updatePayment(p.id, { amount: Number(e.target.value) })}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Fecha</label>
                          <input
                            type="date"
                            className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                            value={p.date}
                            onChange={e => updatePayment(p.id, { date: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Método</label>
                          <select
                            className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                            value={p.method}
                            onChange={e => updatePayment(p.id, { method: e.target.value })}
                          >
                            <option value="Transferencia">Transferencia</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Tarjeta">Tarjeta</option>
                            <option value="Bizum">Bizum</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Estado</label>
                          <button
                            type="button"
                            onClick={() => updatePayment(p.id, { status: p.status === 'pagado' ? 'pendiente' : 'pagado' })}
                            className={`w-full p-2 rounded-xl text-[10px] font-black uppercase transition-all ${p.status === 'pagado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}
                          >
                            {p.status}
                          </button>
                        </div>
                        <div className="col-span-1 pb-1">
                          {(p.type === 'extra' || idx > 1) && (
                            <button
                              type="button"
                              onClick={() => removePayment(p.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {(form.payments || []).length === 0 && (
                      <p className="text-center text-xs text-slate-400 italic py-4">Sin pagos registrados. Use el botón anterior para añadir cobros.</p>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center px-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Total Pagos</span>
                      <span className={`font-black text-sm ${(form.payments || []).reduce((acc, curr) => acc + curr.amount, 0) !== Number(form.total_price) ? 'text-rose-500' : 'text-slate-800'}`}>
                        {(form.payments || []).reduce((acc, curr) => acc + curr.amount, 0)}€ / {form.total_price}€
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Entrada</label><input type="date" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Salida</label><input type="date" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Precio Total (0 = Bloqueo)</label>
                    <input type="number" required className={`w-full p-4 bg-slate-50 border rounded-2xl font-bold ${form.total_price === 0 ? 'text-amber-600 border-amber-200' : ''}`} value={form.total_price} onChange={e => setForm({ ...form, total_price: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Nº Personas</label><input type="number" min="1" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.guests} onChange={e => setForm({ ...form, guests: Number(e.target.value) })} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Estado</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Origen / Canal</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                      <option value="manual">Manual</option>
                      <option value="AIRBNB">Airbnb</option>
                      <option value="BOOKING">Booking.com</option>
                      <option value="VRBO">Vrbo</option>
                      <option value="WEBSITE">Website</option>
                      <option value="AGENCY">Agencia</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Notas / Observaciones</label>
                    <textarea
                      className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm min-h-[100px]"
                      value={form.payment_notes}
                      onChange={e => setForm({ ...form, payment_notes: e.target.value })}
                      placeholder="Notas internas, restricciones, etc..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isProvisionalBlock(form) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isProvisionalBlock(form) ? '● MODO BLOQUEO (Sin nombre ni importe)' : '✓ RESERVA REAL'}
                  </div>
                  <p className="text-[10px] text-slate-400 italic">La categorización se actualiza automáticamente basada en el nombre e importe.</p>
                </div>


                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full py-5 rounded-[2rem] font-black shadow-xl transition-all ${isSaving ? 'bg-slate-400 cursor-not-allowed' : (isProvisionalBlock(form) ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100' : 'bg-slate-900 hover:bg-slate-800 text-white')}`}
                >
                  {isSaving ? 'GUARDANDO...' : (isProvisionalBlock(form) ? 'GUARDAR COMO BLOQUEO' : 'GUARDAR RESERVA')}
                </button>
              </form>
            </div >
          </div >
        )
      }
    </div >
  );
};
/**
 * PR MANUAL TESTS - Block 6 Hotfix:
 * 1) Editar check_out + payment_status + total_price 
 *    -> Guardar -> Recargar -> Comprobar que los valores persisten (Source of Truth = SQLITE_TABLE).
 * 
 * 2) Revisar Contabilidad:
 *    -> Al editar una reserva que ya tenía movimientos, comprobar que NO se duplican. 
 *    -> El sistema ahora borra el "base_booking" si detecta pagos específicos.
 * 
 * 3) Sync iCal:
 *    -> Comprobar que los campos 'MANUAL' (detectados tras la edición en test 1) no se pisan al sincronizar.
 */
