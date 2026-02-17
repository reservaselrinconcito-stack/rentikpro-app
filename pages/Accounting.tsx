
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { projectManager } from '../services/projectManager';
import { guestService } from '../services/guestService';
import { AccountingMovement, Apartment, Property, FiscalProfile, UserSettings } from '../types';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { processImage, ScannedData } from '../services/ocrParser';
import {
  TrendingUp, TrendingDown, Trash2, Filter, Search, Plus, X,
  Wallet, BarChart3, FileText, Settings, Download, Save, AlertCircle, PieChart, Info, Calendar, Clock,
  ArrowDownUp, ArrowUp, ArrowDown, Building2, Camera, ScanLine, Receipt, Paperclip, Mail, CalendarRange,
  ChevronDown, ChevronRight, AlertTriangle
} from 'lucide-react';

type Tab = 'MOVEMENTS' | 'CHARTS' | 'TAX_DRAFT' | 'FISCAL_SETTINGS' | 'SCAN_EXPENSE';
type FilterMode = 'MONTHLY' | 'YEARLY' | 'HISTORICAL';

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const monthsShort = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const formatDateES = (isoDate: string) => {
  if (!isoDate) return '-';
  try {
    // Robust parsing
    let dateObj;
    if (isoDate.includes('-')) {
      const [y, m, d] = isoDate.split('-');
      dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return `${d}/${m}/${y}`;
    } else if (isoDate.includes('/')) {
      const [d, m, y] = isoDate.split('/');
      return `${d}/${m}/${y}`;
    }
    return isoDate;
  } catch { return isoDate; }
};

const parseSafeDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(0);
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  } else if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return new Date(dateStr);
};

// --- SVG COMPONENTS ---

const DonutChart = ({ data, title }: { data: { name: string; value: number; color: string }[], title: string }) => {
  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);

  if (total <= 0) return <div className="flex items-center justify-center h-48 w-48 text-slate-300 italic text-[10px] bg-slate-50 rounded-full border border-slate-100">Sin datos</div>;

  return (
    <div className="relative w-56 h-56 mx-auto group">
      <div className="absolute inset-0 bg-indigo-50/50 rounded-full blur-2xl group-hover:bg-indigo-100/50 transition-all"></div>
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full overflow-visible relative z-10 drop-shadow-2xl">
        <defs>
          {data.map((slice, i) => (
            <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={slice.color} />
              <stop offset="100%" stopColor={slice.color} stopOpacity={0.8} />
            </linearGradient>
          ))}
        </defs>
        {data.map((slice, i) => {
          if (slice.value <= 0) return null;
          const percent = slice.value / total;
          if (isNaN(percent)) return null;

          const dashArray = 2 * Math.PI * 40;
          const currentDash = percent * dashArray;

          const prevTotal = data.slice(0, i).reduce((acc, d) => acc + (d.value || 0), 0);
          const prevPercent = prevTotal / total;

          return (
            <circle
              key={`c-${i}`}
              r="40"
              cx="50"
              cy="50"
              fill="transparent"
              stroke={`url(#grad-${i})`}
              strokeWidth="14"
              strokeDasharray={`${currentDash} ${dashArray - currentDash}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform={`rotate(${prevPercent * 360} 50 50)`}
              className="hover:scale-110 origin-center transition-all cursor-pointer"
            >
              <title>{slice.name}: {slice.value.toLocaleString()}€ ({Math.round(percent * 100)}%)</title>
            </circle>
          );
        })}
        <text x="50" y="48" textAnchor="middle" dy="0.3em" className="text-[12px] font-black fill-slate-800" transform="rotate(90 50 50)">
          {total.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
        </text>
        <text x="50" y="62" textAnchor="middle" dy="0.3em" className="text-[6px] font-black fill-slate-400 uppercase tracking-widest" transform="rotate(90 50 50)">
          {title}
        </text>
      </svg>
    </div>
  );
};

const BarChart = ({ data }: { data: any[] }) => {
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.income || 0, d.expense || 0)),
    100
  );

  return (
    <div className="flex items-end gap-2 h-64 w-full pb-6 border-b border-slate-100">
      {data.map((d, i) => {
        const income = d.income || 0;
        const expense = d.expense || 0;
        const hIncome = Math.min((income / maxValue) * 100, 100);
        const hExpense = Math.min((expense / maxValue) * 100, 100);

        return (
          <div key={i} className="flex-1 flex flex-col justify-end gap-1 h-full group relative">
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              In: {income.toLocaleString()}€ | Out: {expense.toLocaleString()}€
            </div>

            <div className="flex gap-[2px] items-end h-full justify-center w-full px-1">
              <div
                className="w-1/2 bg-emerald-400 rounded-t-sm hover:bg-emerald-500 transition-all min-h-[2px]"
                style={{ height: `${hIncome}%` }}
              />
              <div
                className="w-1/2 bg-rose-400 rounded-t-sm hover:bg-rose-500 transition-all min-h-[2px]"
                style={{ height: `${hExpense}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-slate-400 text-center absolute -bottom-5 w-full uppercase">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
};

const HorizontalStackedBarChart = ({ data, apartments }: { data: any[], apartments: Apartment[] }) => {
  const maxVal = Math.max(...data.map(d => d.total || 0), 100);
  const hasData = data.some(d => d.total > 0);

  if (!hasData) return <div className="text-center text-slate-400 italic py-10 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">Sin datos para mostrar en este periodo.</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {apartments.filter(apt => data.some(d => (d[apt.id] || 0) > 0)).map(apt => (
          <div key={apt.id} className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/60 shadow-sm">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: apt.color || '#ccc' }}></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{apt.name}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5 w-full">
        {data.map((d, i) => {
          const total = d.total || 0;
          const widthPercent = Math.min((total / maxVal) * 100, 100);

          return (
            <div key={i} className="flex items-center gap-4 group">
              <span className="w-10 text-[10px] font-black text-slate-400 uppercase text-right shrink-0">{d.month}</span>
              <div className="flex-1 h-10 bg-slate-100/50 rounded-2xl flex overflow-hidden relative border border-slate-200/50 shadow-inner">
                <div className="flex h-full transition-all duration-700 rounded-r-2xl overflow-hidden shadow-2xl" style={{ width: `${widthPercent}%` }}>
                  {apartments.map(apt => {
                    const value = d[apt.id] || 0;
                    if (value === 0) return null;
                    const segmentWidth = (value / total) * 100;
                    return (
                      <div
                        key={apt.id}
                        className="h-full hover:brightness-110 transition-all relative group/segment cursor-help"
                        style={{ width: `${segmentWidth}%`, backgroundColor: apt.color || '#ccc' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/segment:opacity-100 text-[10px] font-black text-white drop-shadow-md pointer-events-none transition-opacity">
                          {value.toLocaleString()}€
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <span className="w-20 text-[11px] font-black text-slate-700 text-right shrink-0 tabular-nums">{total > 0 ? `${total.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€` : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const HorizontalRankingChart = ({ data }: { data: { name: string, value: number, color: string }[] }) => {
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const maxVal = Math.max(...sortedData.map(d => d.value), 100);

  if (sortedData.length === 0 || sortedData.every(d => d.value === 0)) {
    return <div className="text-center text-slate-400 italic py-10 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">Sin datos registrados.</div>;
  }

  return (
    <div className="space-y-6">
      {sortedData.map((d, i) => (
        <div key={i} className="group">
          <div className="flex justify-between items-center mb-2 text-[10px] px-1">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
                {i + 1}
              </div>
              <span className="font-black text-slate-700 uppercase tracking-tight">{d.name}</span>
            </div>
            <span className="font-black text-indigo-600 text-sm tabular-nums">{d.value.toLocaleString()}€</span>
          </div>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner group-hover:border-indigo-200 transition-colors">
            <div
              className="h-full rounded-full transition-all duration-[1.5s] ease-out relative shadow-lg group-hover:brightness-110"
              style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: d.color }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const UnitBreakdownBarChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <div className="text-center text-slate-400 italic text-sm py-10">Selecciona una propiedad para ver el desglose.</div>;

  const maxVal = Math.max(...data.flatMap(d => [d.total_income, d.total_expense]));

  return (
    <div className="space-y-4">
      {data.map(item => (
        <div key={item.apartment_id}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-700">{item.apartment_name}</span>
            <span className="text-xs font-mono text-slate-500">
              {item.total_income.toLocaleString()}€ / -{item.total_expense.toLocaleString()}€
            </span>
          </div>
          <div className="flex gap-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-l-full"
              style={{ width: `${(item.total_income / maxVal) * 100}%`, backgroundColor: item.apartment_color }}
              title={`Ingresos: ${item.total_income}€`}
            ></div>
            <div
              className="h-full bg-rose-200"
              style={{ width: `${(item.total_expense / maxVal) * 100}%` }}
              title={`Gastos: ${item.total_expense}€`}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};


export const Accounting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('MOVEMENTS');
  const [movements, setMovements] = useState<AccountingMovement[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [fiscalProfile, setFiscalProfile] = useState<FiscalProfile | null>(null);

  const [aptSummary, setAptSummary] = useState<any[]>([]);
  const [timeSeries, setTimeSeries] = useState<any[]>([]);

  // FILTERS
  const [filterMode, setFilterMode] = useState<FilterMode>('MONTHLY');
  const [year, setYear] = useState(new Date().getFullYear());
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [diagLogs, setDiagLogs] = useState<string[]>([]);
  const [diagCounts, setDiagCounts] = useState<{ accounting: number, bookings: number } | null>(null);
  const [diagProjects, setDiagProjects] = useState<any[]>([]);

  const addDiagLog = (msg: string) => {
    console.log(`[Accounting-Diag] ${msg}`);
    setDiagLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    projectManager.getStore().getSettings().then(setSettings);
  }, []);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [bucket, setBucket] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('ALL');

  // NEW FILTERS
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'income' | 'expense'>('ALL');

  // Detectar años disponibles desde los datos
  const availableYears = useMemo(() => {
    const years = movements
      .map(m => parseSafeDate(m.date).getFullYear())
      .filter(y => !isNaN(y) && y > 2000 && y < 2100);
    const set = new Set(years);
    if (set.size === 0) set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [movements]);

  // --- SCAN STATE ---
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    concept: '',
    supplier: '',
    amount: '',
    category: 'General',
    apartment_id: ''
  });

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = useCallback(async () => {
    const store = projectManager.getStore();
    setLoadError(null);
    setDiagLogs([]);
    addDiagLog("Iniciando carga de contabilidad...");

    try {
      addDiagLog("Paso 1: Obteniendo ID de propiedad activa...");
      const propId = selectedPropertyId === 'ALL' ? undefined : selectedPropertyId;
      const aptId = selectedApartmentId === 'ALL' ? undefined : selectedApartmentId;
      addDiagLog(`Propiedad: ${propId || 'ALL'}, Unidad: ${aptId || 'ALL'}`);

      addDiagLog("Paso 2: Comprobando estado de la base de datos...");
      const counts = await store.getCounts();
      addDiagLog(`RAW DB - Movimientos: ${counts.accounting}, Reservas: ${counts.bookings}`);

      const activeProjId = (projectManager as any).currentProjectId;
      addDiagLog(`RECURSO ACTIVO - ProjectID: ${activeProjId || 'N/A'}`);

      const projects = await (projectManager as any).persistentContext?.projectPersistence?.listProjects() || [];
      addDiagLog(`LISTA DE PROYECTOS: ${projects.length} encontrados`);
      projects.forEach((p: any) => {
        addDiagLog(` - ${p.name} (${p.id}): ${p.sizeBytes} bytes`);
      });
      setDiagProjects(projects);

      setDiagCounts(counts);

      addDiagLog("Paso 3: Lanzando queries paralelas (movements, props, apts, summary, series)...");
      const [mList, pList, aList, fProfile, summary, series] = await Promise.all([
        store.getMovements('ALL').then(r => { addDiagLog(`Fetch Movements: ${r.length} items`); return r; }),
        store.getProperties().then(r => { addDiagLog(`Fetch Properties: ${r.length} items`); return r; }),
        store.getAllApartments().then(r => { addDiagLog(`Fetch Apartments: ${r.length} items`); return r; }),
        store.getFiscalProfile().then(r => { addDiagLog("Fetch Fiscal Profile OK"); return r; }),
        store.getAccountingSummaryByApartment(year, bucket, propId).then(r => { addDiagLog(`Fetch Summary: ${r?.length || 0} units`); return r; }),
        store.getAccountingTimeSeries(year, bucket, propId, aptId).then(r => { addDiagLog(`Fetch TimeSeries: ${r?.length || 0} points`); return r; })
      ]);

      addDiagLog("Paso 4: Hidratando estado de la UI...");
      setMovements(mList);
      setProperties(pList);
      setApartments(aList);
      setFiscalProfile(fProfile);
      setAptSummary(summary || []);
      setTimeSeries(series || []);
      addDiagLog("Carga completada con éxito.");
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      addDiagLog(`❌ ERROR EN CARGA: ${errorMsg}`);
      console.error("Error contabilidad:", err);
      setLoadError(errorMsg);
    }
  }, [bucket, year, selectedPropertyId, selectedApartmentId]);

  const handleGenerateBaseMovements = async () => {
    if (!confirm("¿Deseas generar movimientos de ingreso base para todas las reservas confirmadas? Se usará el importe total y la fecha de check-in de cada reserva.")) return;

    setIsGenerating(true);
    try {
      const count = await projectManager.getStore().generateBaseMovementsFromBookings();
      await projectManager.saveProject();
      alert(count > 0 ? `Se han creado ${count} movimientos base correctamente.` : "No se han encontrado nuevas reservas para generar movimientos.");
      loadData();
    } catch (err: any) {
      alert(`Error al generar movimientos: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  const toggleGroup = (resId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(resId)) next.delete(resId);
      else next.add(resId);
      return next;
    });
  };

  useEffect(() => {
    if (selectedPropertyId === 'ALL') {
      setFilteredApartments([]);
      setSelectedApartmentId('ALL');
    } else {
      setFilteredApartments(apartments.filter(a => a.property_id === selectedPropertyId));
      setSelectedApartmentId('ALL');
    }
  }, [selectedPropertyId, apartments]);

  useEffect(() => { loadData(); }, [loadData]);
  useDataRefresh(loadData, ['accounting', 'all']);

  // Extract Unique Payment Methods
  const uniquePaymentMethods = useMemo(() => {
    return Array.from(new Set(movements.map(m => m.payment_method).filter(Boolean))).sort();
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return movements.filter(m => {
      // Bucket filter
      if (bucket !== 'ALL' && m.accounting_bucket !== bucket) return false;

      // Text search
      if (searchLower) {
        const aptName = apartments.find(a => a.id === m.apartment_id)?.name.toLowerCase() || '';
        const combinedText = `${m.concept} ${m.platform || ''} ${m.payment_method} ${aptName} ${m.category || ''} ${m.supplier || ''}`.toLowerCase();
        if (!combinedText.includes(searchLower)) return false;
      }

      // Property/Apt filter
      if (selectedPropertyId !== 'ALL') {
        const apt = apartments.find(a => a.id === m.apartment_id);
        if (apt?.property_id !== selectedPropertyId) return false;
      }
      if (selectedApartmentId !== 'ALL' && m.apartment_id !== selectedApartmentId) return false;

      // Date filters
      const date = parseSafeDate(m.date);
      if (isNaN(date.getTime())) return true;

      const mYear = date.getFullYear();
      const mMonth = date.getMonth() + 1;

      // NEW FILTERS LOGIC
      if (filterType !== 'ALL' && m.type !== filterType) return false;
      if (filterPaymentMethod !== 'ALL' && m.payment_method !== filterPaymentMethod) return false;

      if (filterMode === 'HISTORICAL') return true;
      if (filterMode === 'YEARLY') return mYear === year;
      if (filterMode === 'MONTHLY') return mYear === year && mMonth === month;

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [movements, filterMode, year, month, bucket, searchTerm, sortOrder, apartments, selectedPropertyId, selectedApartmentId, filterType, filterPaymentMethod]);

  const groupedMovements = useMemo(() => {
    // 1. Diagnostics: Find potential duplicates (Global scope)
    const dupMap = new Map<string, AccountingMovement[]>();
    movements.forEach(m => {
      const d = parseSafeDate(m.date);
      // Key: Month-Year-Type-Amount-Concept-Apt
      const key = `${d.getFullYear()}-${d.getMonth()}-${m.type}-${m.amount_net}-${(m.concept || '').toLowerCase().trim()}-${m.apartment_id}`;
      if (!dupMap.has(key)) dupMap.set(key, []);
      dupMap.get(key)!.push(m);
    });
    const duplicates = new Set(Array.from(dupMap.values()).filter(g => g.length > 1).flat().map(m => m.id));

    // 2. Grouping for display (Within filtered view)
    const result: {
      type: 'group' | 'single';
      id: string;
      movements: AccountingMovement[];
      totalNet: number;
    }[] = [];

    const resGroups = new Map<string, AccountingMovement[]>();
    const singles: { id: string, movements: AccountingMovement[], totalNet: number }[] = [];

    filteredMovements.forEach(m => {
      if (m.reservation_id) {
        if (!resGroups.has(m.reservation_id)) resGroups.set(m.reservation_id, []);
        resGroups.get(m.reservation_id)!.push(m);
      } else {
        singles.push({ id: m.id, movements: [m], totalNet: m.amount_net });
      }
    });

    resGroups.forEach((movs, resId) => {
      if (movs.length > 1) {
        result.push({ type: 'group', id: resId, movements: movs, totalNet: movs.reduce((s, x) => s + (x.amount_net || 0), 0) });
      } else {
        result.push({ type: 'single', id: movs[0].id, movements: movs, totalNet: movs[0].amount_net });
      }
    });

    singles.forEach(s => result.push({ type: 'single', ...s }));

    return {
      items: result.sort((a, b) => {
        const dateA = parseSafeDate(a.movements[0].date).getTime() || 0;
        const dateB = parseSafeDate(b.movements[0].date).getTime() || 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }),
      duplicates,
      duplicateCount: Array.from(dupMap.values()).filter(g => g.length > 1).length
    };
  }, [filteredMovements, movements, sortOrder]);

  const kpi = useMemo(() => {
    return filteredMovements.reduce((acc, m) => {
      if (m.type === 'income') {
        acc.income += m.amount_net || 0;
      } else {
        acc.expense += m.amount_net || 0;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredMovements]);

  const groupedStats = useMemo(() => {
    const propMap = new Map<string, any>();

    properties.forEach(p => {
      propMap.set(p.name, {
        id: p.id,
        name: p.name,
        income: 0,
        expense: 0,
        apartments: []
      });
    });

    propMap.set('Sin Propiedad', { id: 'unassigned', name: 'Sin Propiedad', income: 0, expense: 0, apartments: [] });

    aptSummary.forEach(aptStat => {
      const pName = aptStat.property_name || 'Sin Propiedad';
      if (!propMap.has(pName)) {
        propMap.set(pName, { id: aptStat.property_id, name: pName, income: 0, expense: 0, apartments: [] });
      }
      const p = propMap.get(pName);
      p.income += aptStat.total_income || 0;
      p.expense += aptStat.total_expense || 0;
      p.apartments.push(aptStat);
    });

    return Array.from(propMap.values()).filter(p => p.income > 0 || p.expense > 0 || p.apartments.length > 0);
  }, [aptSummary, properties]);

  const pieData = useMemo(() => {
    if (selectedPropertyId === 'ALL') {
      // Group by property
      return groupedStats.map((p) => {
        // Stable HSL based on ID string hash or length to avoid shifting
        const hash = p.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        return {
          name: p.name,
          value: p.income,
          color: `hsl(${(210 + (hash % 150)) % 360}, 65%, 50%)`
        };
      }).filter(d => d.value > 0);
    } else {
      // Group by apartment inside selected property
      const propData = groupedStats.find(p => p.id === selectedPropertyId);
      return (propData?.apartments || []).map((apt: any) => {
        // Find real apartment to get its current color (aptSummary might have stale data)
        const realApt = apartments.find(a => a.id === apt.apartment_id);
        return {
          name: apt.apartment_name,
          value: apt.total_income,
          color: realApt?.color || apt.apartment_color || '#cbd5e1'
        };
      }).filter((d: any) => d.value > 0);
    }
  }, [groupedStats, selectedPropertyId, apartments]);

  const chartData = Array.from({ length: 12 }).map((_, i) => {
    const mLabel = (i + 1).toString().padStart(2, '0');
    const data = timeSeries.find(s => s.month === mLabel) || { income: 0, expense: 0 };
    return { month: monthsShort[i], ...data };
  });

  // Estadísticas avanzadas
  const advancedStats = useMemo(() => {
    const monthlyAvg = chartData.reduce((sum, d) => sum + (d.income || 0), 0) / 12;
    const monthsWithData = chartData.filter(d => d.income > 0);
    const bestMonth = monthsWithData.reduce((best, curr) =>
      (curr.income || 0) > (best.income || 0) ? curr : best,
      { month: '-', income: 0 }
    );
    const worstMonth = monthsWithData.length > 0
      ? monthsWithData.reduce((worst, curr) =>
        (curr.income || 0) < (worst.income || 0) ? curr : worst,
        monthsWithData[0]
      )
      : { month: '-', income: 0 };

    return { monthlyAvg, bestMonth, worstMonth, totalMonthsActive: monthsWithData.length };
  }, [chartData]);

  // Gráfico apilado por apartamento con sus colores
  const stackedChartData = useMemo(() => {
    return Array.from({ length: 12 }).map((_, monthIdx) => {
      const monthData: any = { month: monthsShort[monthIdx] };
      let totalIncome = 0;

      apartments.forEach(apt => {
        const monthIncome = filteredMovements
          .filter(m => {
            const d = parseSafeDate(m.date);
            return m.type === 'income' &&
              m.apartment_id === apt.id &&
              d.getMonth() === monthIdx &&
              (filterMode === 'HISTORICAL' || d.getFullYear() === year);
          })
          .reduce((sum, m) => sum + (m.amount_net || 0), 0);
        monthData[apt.id] = monthIncome;
        totalIncome += monthIncome;
      });
      monthData.total = totalIncome;
      return monthData;
    });
  }, [filteredMovements, apartments, filterMode, year]);

  // Top performers
  const topPerformers = useMemo(() => {
    const aptPerformance = apartments.map(apt => {
      const income = filteredMovements
        .filter(m => m.type === 'income' && m.apartment_id === apt.id)
        .reduce((sum, m) => sum + (m.amount_net || 0), 0);
      return { ...apt, income };
    }).filter(a => a.income > 0)
      .sort((a, b) => b.income - a.income)
      .slice(0, 5);

    const maxIncome = aptPerformance[0]?.income || 1;
    return aptPerformance.map(a => ({ ...a, percentage: (a.income / maxIncome) * 100 }));
  }, [apartments, filteredMovements]);

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este movimiento contable?")) {
      await projectManager.getStore().deleteMovement(id);
      await projectManager.saveProject();
      loadData();
    }
  }

  const handleSaveFiscal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const profile: FiscalProfile = {
      tipo_fiscal: formData.get('tipo_fiscal') as any,
      nombre_razon_social: formData.get('nombre_razon_social') as string,
      nif_cif: formData.get('nif_cif') as string,
      domicilio_fiscal: formData.get('domicilio_fiscal') as string,
      provincia: formData.get('provincia') as string,
      email: formData.get('email') as string,
      telefono: formData.get('telefono') as string,
    };
    await projectManager.getStore().saveFiscalProfile(profile);
    setFiscalProfile(profile);
    alert("Perfil fiscal guardado correctamente.");
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setIsScanning(true);
    setScanProgress(0);

    try {
      const result: ScannedData = await processImage(file, (p) => setScanProgress(Math.round(p * 100)));
      const text = result.raw_text || '';

      const dateMatch = text.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
      if (dateMatch) {
        setExpenseForm(prev => ({ ...prev, date: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` }));
      }

      const numbers = text.match(/\d+[.,]\d{2}/g);
      if (numbers) {
        const amounts = numbers.map(n => parseFloat(n.replace(',', '.'))).sort((a, b) => b - a);
        if (amounts.length > 0) {
          setExpenseForm(prev => ({ ...prev, amount: amounts[0].toString() }));
        }
      }
      setExpenseForm(prev => ({ ...prev, concept: 'Gasto Escaneado' }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.amount) return alert("El importe es obligatorio");

    const amount = parseFloat(expenseForm.amount);
    let receiptBlob = undefined;
    if (imagePreview) {
      const resp = await fetch(imagePreview);
      const blob = await resp.blob();
      receiptBlob = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }

    const movement: AccountingMovement = {
      id: crypto.randomUUID(),
      date: expenseForm.date,
      type: 'expense',
      category: expenseForm.category,
      concept: expenseForm.concept,
      supplier: expenseForm.supplier,
      amount_gross: amount,
      vat: 0,
      commission: 0,
      amount_net: amount,
      payment_method: 'Tarjeta',
      accounting_bucket: 'A',
      apartment_id: expenseForm.apartment_id || null,
      receipt_blob: receiptBlob,
      import_hash: crypto.randomUUID(),
      created_at: Date.now(),
      updated_at: Date.now()
    };

    await projectManager.getStore().saveMovement(movement);
    await projectManager.saveProject();
    alert("Gasto guardado con foto.");
    setActiveTab('MOVEMENTS');
    loadData();
    setImagePreview(null);
    setExpenseForm({ date: new Date().toISOString().split('T')[0], concept: '', supplier: '', amount: '', category: 'General', apartment_id: '' });
  };

  const downloadReceipt = (blobData: string, filename: string) => {
    const link = document.createElement('a');
    link.href = blobData;
    link.download = `recibo_${filename}.png`;
    link.click();
  };

  const exportDraft = () => {
    if (!fiscalProfile) return alert("Completa los Ajustes Fiscales para generar el borrador.");
    const content = `BORRADOR PARA GESTORÍA - RENTIKPRO\nPERIODO: ${filterMode === 'HISTORICAL' ? 'HISTÓRICO' : year}\n\nBalance: ${(kpi.income - kpi.expense).toFixed(2)}€`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Borrador_Fiscal.txt`; a.click();
  };

  const toggleSort = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

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
              <p className="text-sm text-amber-700 font-medium">Este proyecto está vacío. Comienza creando una propiedad o importa tus datos existentes.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={() => window.location.hash = '#/'} className="flex-1 md:flex-none px-6 py-3 bg-white border border-amber-200 text-amber-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-100 transition-colors">
              Cambiar Proyecto
            </button>
            <button onClick={() => window.location.hash = '#/importers'} className="flex-1 md:flex-none px-6 py-3 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200">
              Importar .sqlite
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3"><Wallet className="text-indigo-600" /> Contabilidad</h2>
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto max-w-[90vw]">
            {(['MOVEMENTS', 'SCAN_EXPENSE', 'CHARTS', 'TAX_DRAFT', 'FISCAL_SETTINGS'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {t === 'MOVEMENTS' ? 'Movimientos' : t === 'SCAN_EXPENSE' ? 'Escanear Gasto' : t === 'CHARTS' ? 'Gráficos' : t === 'TAX_DRAFT' ? 'Renta' : 'Fiscal'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto">
          {activeTab !== 'SCAN_EXPENSE' && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
                <Building2 size={14} className="text-slate-400" />
                <select value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)} className="bg-transparent font-bold text-xs outline-none">
                  <option value="ALL">Todas las Propiedades</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <select value={selectedApartmentId} onChange={e => setSelectedApartmentId(e.target.value)} disabled={selectedPropertyId === 'ALL'} className="bg-transparent font-bold text-xs outline-none disabled:opacity-50">
                  <option value="ALL">Todos los Apartamentos</option>
                  {filteredApartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 border border-indigo-600 rounded-2xl shadow-lg">
                <Calendar size={14} className="text-white" />
                <select
                  value={filterMode === 'HISTORICAL' ? 'HIST' : year}
                  onChange={e => {
                    if (e.target.value === 'HIST') {
                      setFilterMode('HISTORICAL');
                    } else {
                      setFilterMode('YEARLY');
                      setYear(Number(e.target.value));
                    }
                  }}
                  className="bg-transparent font-black text-xs outline-none text-white">
                  <option value="HIST" className="bg-slate-800">📊 TODO EL HISTÓRICO</option>
                  {availableYears.map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                  {availableYears.length === 0 && <option value={year} className="bg-slate-800">{year}</option>}
                </select>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 ring-indigo-100 transition-all w-full md:w-auto">
                <Search size={14} className="text-slate-400" />
                <input
                  placeholder="Concepto, categoría, proveedor..."
                  className="bg-transparent text-xs font-bold outline-none w-full md:w-40 placeholder:font-medium"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && <button onClick={() => setSearchTerm('')}><X size={12} className="text-slate-300 hover:text-rose-500" /></button>}
              </div>

              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${showDiagnostics
                  ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-inner'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
              >
                <AlertTriangle size={14} className={groupedMovements.duplicateCount > 0 && !showDiagnostics ? 'animate-pulse text-rose-500' : ''} />
                <span className="hidden sm:inline">{showDiagnostics ? 'Ocultar Diagnóstico' : `Diagnóstico (${groupedMovements.duplicateCount})`}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-[2rem] flex flex-col items-center gap-4 text-center animate-in zoom-in duration-300">
          <AlertCircle size={48} className="text-rose-500" />
          <div>
            <h3 className="text-xl font-bold text-rose-800">Error al cargar contabilidad</h3>
            <p className="text-rose-600 font-medium mt-1">{loadError}</p>
          </div>
          <button
            onClick={() => loadData()}
            className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
          >
            Reintentar Carga
          </button>

          <div className="w-full mt-6 bg-slate-900 rounded-2xl p-4 text-left overflow-hidden">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Logs de diagnóstico</p>
            <div className="max-h-40 overflow-y-auto font-mono text-[9px] text-emerald-400 space-y-1">
              {diagLogs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          </div>
        </div>
      )}

      {showDiagnostics && !loadError && (
        <div className="bg-slate-900 rounded-[2rem] p-6 mb-8 text-white animate-in slide-in-from-top duration-300 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <h4 className="text-sm font-black uppercase tracking-widest text-indigo-400">Consola de Diagnóstico</h4>
              {diagCounts && (
                <div className="flex gap-4 mt-1">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter bg-emerald-400/10 px-2 py-0.5 rounded">MOV_DB: {diagCounts.accounting}</span>
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter bg-indigo-400/10 px-2 py-0.5 rounded">BOOK_DB: {diagCounts.bookings}</span>
                </div>
              )}
              {diagProjects.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-[8px] text-slate-500 uppercase font-black">Otros Proyectos:</span>
                  {diagProjects.map(p => (
                    <span key={p.id} className="text-[8px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-400">
                      {p.name} ({p.sizeBytes} B)
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setDiagLogs([])} className="text-[10px] text-slate-500 hover:text-white underline">Limpiar logs</button>
          </div>
          <div className="space-y-1 font-mono text-[10px] max-h-60 overflow-y-auto custom-scrollbar">
            {diagLogs.map((log, idx) => (
              <div key={idx} className={log.includes('❌') ? 'text-rose-400' : log.includes('OK') ? 'text-emerald-400' : 'text-slate-300'}>
                {log}
              </div>
            ))}
            {diagLogs.length === 0 && <p className="text-slate-600 italic">No hay logs registrados todavía...</p>}
          </div>
        </div>
      )}

      {activeTab === 'MOVEMENTS' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-center bg-slate-100 p-1 rounded-2xl gap-2 shadow-inner">
            <button onClick={() => setBucket('A')} className={`px-6 py-2 rounded-xl text-xs font-bold ${bucket === 'A' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Oficial</button>
            <button onClick={() => setBucket('B')} className={`px-6 py-2 rounded-xl text-xs font-bold ${bucket === 'B' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Efectivo</button>
            <button onClick={() => setBucket('ALL')} className={`px-6 py-2 rounded-xl text-xs font-bold ${bucket === 'ALL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Todo</button>
          </div>

          {/* NEW FILTER BAR */}
          <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar:</span>
            </div>

            {/* TYPE FILTER */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="ALL">Todos los Tipos</option>
              <option value="income">🟢 Solo Ingresos</option>
              <option value="expense">🔴 Solo Gastos</option>
            </select>

            {/* PAYMENT METHOD FILTER */}
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="ALL">Todos los Métodos</option>
              {uniquePaymentMethods.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>

            {(filterType !== 'ALL' || filterPaymentMethod !== 'ALL') && (
              <button
                onClick={() => { setFilterType('ALL'); setFilterPaymentMethod('ALL'); }}
                className="ml-auto text-[10px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-3 py-1 rounded-lg"
              >
                <X size={12} /> Limpiar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100/50">
              <TrendingUp size={24} className="mb-4 opacity-50" />
              <p className="text-[10px] font-black uppercase opacity-60">Ingresos ({guestService.getAccountingBucketLabel(bucket)})</p>
              <h3 className="text-3xl font-black">{kpi.income.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</h3>
            </div>
            <div className="bg-rose-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-rose-100/50">
              <TrendingDown size={24} className="mb-4 opacity-50" />
              <p className="text-[10px] font-black uppercase opacity-60">Gastos ({guestService.getAccountingBucketLabel(bucket)})</p>
              <h3 className="text-3xl font-black">{kpi.expense.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</h3>
            </div>
            <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-200/50">
              <Wallet size={24} className="mb-4 opacity-50" />
              <p className="text-[10px] font-black uppercase opacity-60">Balance ({guestService.getAccountingBucketLabel(bucket)})</p>
              <h3 className="text-3xl font-black">{(kpi.income - kpi.expense).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</h3>
            </div>
          </div>

          {movements.length === 0 && diagCounts && diagCounts.bookings > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                <BarChart3 size={32} />
              </div>
              <div className="max-w-md">
                <h3 className="text-xl font-black text-indigo-900">Tu contabilidad está vacía</h3>
                <p className="text-sm text-indigo-700/80 font-medium mt-2">Hemos detectado {diagCounts.bookings} reservas confirmadas. ¿Quieres generar movimientos de ingreso automáticamente a partir de ellas?</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleGenerateBaseMovements}
                  disabled={isGenerating}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? <Clock className="animate-spin" size={18} /> : <Plus size={18} />}
                  Generar movimientos base desde reservas
                </button>
              </div>
            </div>
          )}

          {/* Estadísticas Avanzadas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promedio Mensual</p>
                <div className="group relative">
                  <Info size={14} className="text-slate-300 cursor-help hover:text-indigo-500" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                    Media de ingresos netos mensuales considerando solo meses con actividad.
                  </div>
                </div>
              </div>
              <h4 className="text-2xl font-black text-indigo-600">{advancedStats.monthlyAvg.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€</h4>
              <p className="text-xs text-slate-500 mt-1">{advancedStats.totalMonthsActive} meses activos</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🏆 Mejor Mes</p>
                <div className="group relative">
                  <Info size={14} className="text-slate-300 cursor-help hover:text-emerald-500" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                    Mes con mayor volumen de ingresos netos registrados.
                  </div>
                </div>
              </div>
              <h4 className="text-2xl font-black text-emerald-600">{advancedStats.bestMonth.month}</h4>
              <p className="text-xs text-slate-500 mt-1">{(advancedStats.bestMonth.income || 0).toLocaleString()}€</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📉 Peor Mes</p>
                <div className="group relative">
                  <Info size={14} className="text-slate-300 cursor-help hover:text-rose-500" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                    Mes con menor volumen de ingresos (excluyendo meses sin actividad).
                  </div>
                </div>
              </div>
              <h4 className="text-2xl font-black text-rose-600">{advancedStats.worstMonth.month}</h4>
              <p className="text-xs text-slate-500 mt-1">{(advancedStats.worstMonth.income || 0).toLocaleString()}€</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa de Ocupación</p>
                <div className="group relative">
                  <Info size={14} className="text-slate-300 cursor-help hover:text-purple-500" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                    Porcentaje del año con al menos un ingreso registrado.
                  </div>
                </div>
              </div>
              <h4 className="text-2xl font-black text-purple-600">{Math.round((advancedStats.totalMonthsActive / 12) * 100)}%</h4>
              <p className="text-xs text-slate-500 mt-1">{advancedStats.totalMonthsActive}/12 meses</p>
            </div>
          </div>

          {/* Top Performers */}
          {topPerformers.length > 0 && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-500" /> Top Performers ({filterMode === 'HISTORICAL' ? 'Histórico' : year})
              </h4>
              <div className="space-y-4">
                {topPerformers.map((apt, idx) => (
                  <div key={apt.id} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-slate-500">#{idx + 1}</span>
                    </div>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: apt.color || '#ccc' }}></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-slate-700">{apt.name}</span>
                        <span className="font-black text-sm text-indigo-600">{apt.income.toLocaleString()}€</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${apt.percentage}%`,
                            backgroundColor: apt.color || '#ccc'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass rounded-[3rem] border border-white/40 shadow-2xl shadow-slate-200/40 overflow-hidden overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                <tr>
                  <th className="px-8 py-6 cursor-pointer hover:text-indigo-600 transition-colors" onClick={toggleSort}>
                    <div className="flex items-center gap-2">Fecha {sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</div>
                  </th>
                  <th className="px-8 py-6">Concepto / Reserva</th>
                  <th className="px-8 py-6">Unidad</th>
                  <th className="px-8 py-6">Cat / Prov</th>
                  <th className="px-8 py-6">Método</th>
                  <th className="px-8 py-6 text-right">Neto</th>
                  <th className="px-8 py-6 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 text-xs font-bold">
                {groupedMovements.items.map((item) => {
                  if (item.type === 'group') {
                    const isExpanded = expandedGroups.has(item.id);
                    const firstM = item.movements[0];
                    const apt = apartments.find(a => a.id === firstM.apartment_id);

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => toggleGroup(item.id)}
                          className={`bg-indigo-50/40 border-l-4 border-indigo-500 hover:bg-indigo-100/40 transition-all cursor-pointer group ${isExpanded ? 'shadow-sm' : ''}`}
                        >
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown size={14} className="text-indigo-600" /> : <ChevronRight size={14} className="text-indigo-400" />}
                              <span className="text-slate-400 font-mono text-[10px]">{formatDateES(firstM.date)}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex flex-col">
                              <span className="text-indigo-900 font-black flex items-center gap-2 truncate max-w-md">
                                <CalendarRange size={14} className="shrink-0" /> {firstM.concept}
                              </span>
                              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
                                {item.movements.length} movimientos vinculados
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: apt?.color || '#ccc' }}></div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[80px]">{apt?.name || '---'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4"></td>
                          <td className="px-8 py-4">
                            <span className="px-2 py-0.5 bg-indigo-100/50 text-indigo-500 text-[8px] font-black rounded uppercase tracking-wider border border-indigo-100">Agrupado</span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="text-sm font-black text-indigo-700 tabular-nums">
                              {item.totalNet.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                            </div>
                          </td>
                          <td className="px-8 py-4"></td>
                        </tr>
                        {isExpanded && item.movements.map(m => {
                          const isDup = showDiagnostics && groupedMovements.duplicates.has(m.id);
                          return (
                            <tr key={m.id} className={`bg-white/50 border-l-4 border-indigo-200 hover:bg-indigo-50/30 transition-all group/sub ${isDup ? 'bg-rose-50/50' : ''}`}>
                              <td className="px-12 py-3 opacity-60">
                                <span className="text-slate-400 font-mono text-[9px]">{formatDateES(m.date)}</span>
                              </td>
                              <td className="px-8 py-3">
                                <div className="flex flex-col">
                                  <span className={`text-slate-700 font-bold text-[11px] flex items-center gap-2 ${isDup ? 'text-rose-700' : ''}`}>
                                    {m.concept}
                                    {isDup && <AlertTriangle size={12} className="text-rose-500" />}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-3 opacity-60 italic text-[10px] font-medium">{apt?.name}</td>
                              <td className="px-8 py-3">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black rounded uppercase tracking-wider">{m.category || m.supplier || 'General'}</span>
                              </td>
                              <td className="px-8 py-3 text-slate-400 font-medium text-[10px]">
                                <div className="flex items-center gap-2">
                                  <span>{m.payment_method}</span>
                                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[7px] font-black text-slate-400 uppercase">{guestService.getAccountingBucketLabel(m.accounting_bucket)}</span>
                                </div>
                              </td>
                              <td className={`px-8 py-3 text-right font-bold tabular-nums text-xs ${m.type === 'income' ? 'text-emerald-600/70' : 'text-rose-600/70'}`}>
                                {m.type === 'income' ? '+' : '-'}{m.amount_net.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                              </td>
                              <td className="px-8 py-3 text-center">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                  {m.receipt_blob && <button onClick={() => downloadReceipt(m.receipt_blob!, m.id)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"><Paperclip size={14} /></button>}
                                  <button onClick={() => handleDelete(m.id)} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  }

                  const m = item.movements[0];
                  const isZero = m.amount_net === 0;
                  const apt = apartments.find(a => a.id === m.apartment_id);
                  const isDuplicate = showDiagnostics && groupedMovements.duplicates.has(m.id);

                  return (
                    <tr key={m.id} className={`transition-all group border-l-4 ${m.reservation_id ? 'border-indigo-200 bg-indigo-50/10' : 'border-transparent'} ${isDuplicate ? 'bg-rose-50/50' : 'hover:bg-indigo-50/30'}`}>
                      <td className="px-8 py-5">
                        <span className="text-slate-400 font-mono text-[10px]">{formatDateES(m.date)}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`text-slate-800 font-bold ${isDuplicate ? 'text-rose-700' : ''}`}>{m.concept}</span>
                            {isDuplicate && <AlertTriangle size={14} className="text-rose-500 animate-pulse" />}
                            {!m.reservation_id && <span className="text-[8px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded font-black border border-slate-200 uppercase tracking-tighter">Sin vincular</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: apt?.color || '#ccc' }}></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[100px]">{apt?.name || '---'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-wider">{m.category || m.supplier || 'General'}</span>
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[80px]">{m.payment_method}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-400 uppercase">{guestService.getAccountingBucketLabel(m.accounting_bucket)}</span>
                        </div>
                      </td>
                      <td className={`px-8 py-5 text-right ${isZero ? 'text-rose-600 font-black' : (m.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}`}>
                        <div className="text-sm font-black tabular-nums">
                          {isZero ? (
                            <span className="flex items-center justify-end gap-1"><AlertCircle size={14} /> 0.00€</span>
                          ) : (
                            `${m.type === 'income' ? '+' : '-'}${m.amount_net.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {m.receipt_blob && (
                            <button onClick={() => downloadReceipt(m.receipt_blob!, m.id)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors" title="Descargar Factura">
                              <Paperclip size={16} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(m.id)} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredMovements.length === 0 && (
                  <tr><td colSpan={7} className="px-8 py-20 text-center text-slate-400 italic">No hay movimientos que coincidan con los filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'CHARTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-center">
              <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><PieChart size={18} className="text-indigo-500" /> Reparto de Ingresos</h4>
              <DonutChart data={pieData} title={selectedPropertyId === 'ALL' ? 'Por Propiedad' : 'Por Apartamento'} />
            </div>
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
              <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500" /> Ranking Ingresos</h4>
              <HorizontalRankingChart
                data={apartments.map(apt => {
                  const total = filteredMovements
                    .filter(m => m.apartment_id === apt.id && m.type === 'income')
                    .reduce((sum, m) => sum + (m.amount_net || 0), 0);
                  return { name: apt.name, value: total, color: apt.color || '#94a3b8' };
                }).filter(d => d.value > 0)}
              />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-lg font-black text-slate-800 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500" /> Evolución por Apartamento ({filterMode === 'HISTORICAL' ? 'Histórico' : year})</h4>
              </div>
              <HorizontalStackedBarChart data={stackedChartData} apartments={apartments} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'TAX_DRAFT' && (
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-12 animate-in fade-in">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-3xl font-black text-slate-800">Borrador Renta</h3>
              <p className="text-slate-500 mt-2">Cálculo basado en los filtros actuales y tu configuración fiscal.</p>
              {settings?.fiscal_type && (
                <span className="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                  Régimen: {settings.fiscal_type}
                </span>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (!settings?.accountant_email) {
                    alert('Por favor, configura el email de tu gestor en Configuración > Contacto.');
                    return;
                  }
                  exportDraft();
                  const subject = encodeURIComponent(`Borrador Renta ${year} - ${settings.fiscal_name || settings.business_name || 'RentikPro'}`);
                  const body = encodeURIComponent(`Hola,\n\nTe adjunto el borrador de la renta para el ejercicio ${year}.\n\nSaludos.`);
                  window.location.href = `mailto:${settings.accountant_email}?subject=${subject}&body=${body}`;
                  setTimeout(() => alert('Se ha abierto tu cliente de correo. Por favor, adjunta el archivo JSON que se acaba de descargar.'), 1000);
                }}
                className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-6 py-4 rounded-[2rem] font-bold shadow-sm hover:bg-indigo-200 transition-all"
              >
                <Mail size={20} /> Enviar al Gestor
              </button>
              <button onClick={exportDraft} className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black shadow-xl hover:scale-105 transition-all">
                <Download size={20} /> Descargar Borrador
              </button>
            </div>
          </div>

          {(!settings?.fiscal_id || !settings?.fiscal_type) && (
            <div className="p-8 bg-amber-50 border border-amber-200 rounded-[2rem] flex gap-5 text-amber-800">
              <AlertCircle className="shrink-0" size={24} />
              <div>
                <p className="font-black text-lg">Perfil Fiscal Incompleto</p>
                <p className="text-sm opacity-80">
                  Ve a <button onClick={() => window.location.hash = '#settings'} className="underline font-bold hover:text-amber-900">Configuración</button> para rellenar tu NIF y Tipo de Régimen.
                </p>
              </div>
            </div>
          )}

          <div className="p-10 bg-slate-50 rounded-[3rem] space-y-6 mt-8">
            <div className="flex justify-between items-center"><span className="font-bold text-slate-500">Ingresos Brutos</span><span className="text-2xl font-black text-emerald-600">+{kpi.income.toLocaleString()}€</span></div>
            <div className="flex justify-between items-center"><span className="font-bold text-slate-500">Gastos Deducibles</span><span className="text-2xl font-black text-rose-600">-{kpi.expense.toLocaleString()}€</span></div>
            <div className="pt-6 border-t border-slate-200 flex justify-between items-center"><span className="text-xl font-black text-slate-800">Rendimiento Neto</span><span className="text-3xl font-black text-slate-900">{(kpi.income - kpi.expense).toLocaleString()}€</span></div>
          </div>
        </div>
      )}

      {
        activeTab === 'SCAN_EXPENSE' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
            {/* OCR / Camera Area */}
            <div className="space-y-6">
              <div
                className="bg-slate-900 rounded-[2.5rem] p-1 overflow-hidden relative group cursor-pointer shadow-xl h-96"
                onClick={() => !isScanning && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleReceiptScan}
                />
                <div className="bg-slate-800 rounded-[2.2rem] h-full flex flex-col items-center justify-center relative overflow-hidden border-2 border-dashed border-slate-600 hover:border-indigo-500 transition-all">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Receipt Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-indigo-500/50">
                        <Camera size={32} />
                      </div>
                      <h4 className="text-white font-bold text-lg">Escanear Ticket</h4>
                      <p className="text-slate-400 text-sm mt-2">Sube una foto de la factura o ticket.</p>
                    </div>
                  )}
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      <ScanLine size={48} className="text-indigo-400 animate-spin mb-4" />
                      <p className="text-white font-black tracking-widest text-lg">EXTRAYENDO DATOS</p>
                      <div className="w-48 h-2 bg-slate-700 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Area */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <Receipt size={24} className="text-indigo-600" />
                <h3 className="text-xl font-black text-slate-800">Detalles del Gasto</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Importe</label>
                  <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border rounded-xl font-bold" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proveedor / Tienda</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" placeholder="Ej. Leroy Merlin" value={expenseForm.supplier} onChange={e => setExpenseForm({ ...expenseForm, supplier: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Concepto</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" placeholder="Ej. Pintura blanca 5L" value={expenseForm.concept} onChange={e => setExpenseForm({ ...expenseForm, concept: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                    <option>General</option>
                    <option>Mantenimiento</option>
                    <option>Limpieza</option>
                    <option>Suministros</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asignar Unidad</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={expenseForm.apartment_id} onChange={e => setExpenseForm({ ...expenseForm, apartment_id: e.target.value })}>
                    <option value="">(Global)</option>
                    {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleSaveExpense} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <Save size={20} /> Guardar Gasto con Foto
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
};
