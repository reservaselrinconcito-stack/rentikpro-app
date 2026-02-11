
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { projectManager } from '../services/projectManager';
import { AccountingMovement, Apartment, Property, FiscalProfile } from '../types';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { processImage, ScannedData } from '../services/ocrParser';
import { 
  TrendingUp, TrendingDown, Trash2, Filter, Search, Plus, X, 
  Wallet, BarChart3, FileText, Settings, Download, Save, AlertCircle, PieChart, Info, Calendar, Clock,
  ArrowDownUp, ArrowUp, ArrowDown, Building2, Camera, ScanLine, Receipt, Paperclip
} from 'lucide-react';

type Tab = 'MOVEMENTS' | 'CHARTS' | 'TAX_DRAFT' | 'FISCAL_SETTINGS' | 'SCAN_EXPENSE';
type FilterMode = 'MONTHLY' | 'YEARLY' | 'HISTORICAL';

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const monthsShort = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const formatDateES = (isoDate: string) => {
  if (!isoDate) return '-';
  try {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  } catch { return isoDate; }
};

// --- SVG COMPONENTS ---

const DonutChart = ({ data, title }: { data: { name: string; value: number; color: string }[], title: string }) => {
  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);
  
  if (total <= 0) return <div className="flex items-center justify-center h-48 w-48 text-slate-300 italic text-[10px] bg-slate-50 rounded-full border border-slate-100">Sin datos</div>;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full overflow-visible">
        {data.map((slice, i) => {
           if(slice.value <= 0) return null;
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
               stroke={slice.color}
               strokeWidth="12"
               strokeDasharray={`${currentDash} ${dashArray - currentDash}`}
               strokeDashoffset={0} 
               transform={`rotate(${prevPercent * 360} 50 50)`}
               className="hover:opacity-80 transition-all cursor-pointer"
             >
               <title>{slice.name}: {slice.value.toLocaleString()}€ ({Math.round(percent * 100)}%)</title>
             </circle>
           );
        })}
        <text x="50" y="45" textAnchor="middle" dy="0.3em" className="text-[10px] font-black fill-slate-700" transform="rotate(90 50 50)">
           {total.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
        </text>
         <text x="50" y="60" textAnchor="middle" dy="0.3em" className="text-[7px] font-bold fill-slate-400" transform="rotate(90 50 50)">
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
  const [filterMode, setFilterMode] = useState<FilterMode>('YEARLY');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [bucket, setBucket] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('ALL');

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

  const loadData = useCallback(async () => {
    const store = projectManager.getStore();
    try {
      const propId = selectedPropertyId === 'ALL' ? undefined : selectedPropertyId;
      const aptId = selectedApartmentId === 'ALL' ? undefined : selectedApartmentId;

      const [mList, pList, aList, fProfile, summary, series] = await Promise.all([
        store.getMovements('ALL'),
        store.getProperties(),
        store.getAllApartments(),
        store.getFiscalProfile(),
        store.getAccountingSummaryByApartment(year, bucket, propId),
        store.getAccountingTimeSeries(year, bucket, propId, aptId)
      ]);
      setMovements(mList);
      setProperties(pList);
      setApartments(aList);
      setFiscalProfile(fProfile);
      setAptSummary(summary || []);
      setTimeSeries(series || []);
    } catch (err) { console.error("Error contabilidad:", err); }
  }, [bucket, year, selectedPropertyId, selectedApartmentId]);
  
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
      const date = new Date(m.date);
      if(isNaN(date.getTime())) return true;

      const mYear = date.getFullYear();
      const mMonth = date.getMonth() + 1;

      if (filterMode === 'HISTORICAL') return true;
      if (filterMode === 'YEARLY') return mYear === year;
      if (filterMode === 'MONTHLY') return mYear === year && mMonth === month;
      
      return true;
    }).sort((a,b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [movements, filterMode, year, month, bucket, searchTerm, sortOrder, apartments, selectedPropertyId, selectedApartmentId]);

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
        return groupedStats.map((p, i) => ({
           name: p.name,
           value: p.income,
           color: `hsl(${210 + (i * 40)}, 70%, 50%)`
        })).filter(d => d.value > 0);
      } else {
        // Group by apartment inside selected property
        const propData = groupedStats.find(p => p.id === selectedPropertyId);
        return propData?.apartments.map((apt: any) => ({
           name: apt.apartment_name,
           value: apt.total_income,
           color: apt.apartment_color || '#ccc'
        })).filter((d:any) => d.value > 0) || [];
      }
  }, [groupedStats, selectedPropertyId]);

  const chartData = Array.from({length: 12}).map((_, i) => {
     const mLabel = (i+1).toString().padStart(2, '0');
     const data = timeSeries.find(s => s.month === mLabel) || { income: 0, expense: 0 };
     return { month: monthsShort[i], ...data };
  });

  const handleDelete = async (id: string) => {
    if(confirm("¿Eliminar este movimiento contable?")){
      await projectManager.getStore().deleteMovement(id);
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
         const amounts = numbers.map(n => parseFloat(n.replace(',', '.'))).sort((a,b) => b-a);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3"><Wallet className="text-indigo-600"/> Contabilidad</h2>
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
              <Building2 size={14} className="text-slate-400"/>
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

           {filterMode !== 'HISTORICAL' && (
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in">
                <Calendar size={14} className="text-slate-400"/>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-transparent font-bold text-xs outline-none">
                  {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
           )}

           <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 ring-indigo-100 transition-all w-full md:w-auto">
              <Search size={14} className="text-slate-400"/>
              <input 
                placeholder="Concepto, categoría, proveedor..." 
                className="bg-transparent text-xs font-bold outline-none w-full md:w-40 placeholder:font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && <button onClick={() => setSearchTerm('')}><X size={12} className="text-slate-300 hover:text-rose-500"/></button>}
           </div>
           </>
           )}
        </div>
      </div>

      {activeTab === 'MOVEMENTS' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-center bg-slate-100 p-1 rounded-2xl gap-2 shadow-inner">
            <button onClick={() => setBucket('A')} className={`px-6 py-2 rounded-xl text-xs font-bold ${bucket === 'A' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Caja A (Oficial)</button>
            <button onClick={() => setBucket('B')} className={`px-6 py-2 rounded-xl text-xs font-bold ${bucket === 'B' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Caja B (Efectivo)</button>
            <button onClick={() => setBucket('ALL')} className={`px-6 py-2 rounded-xl text-xs font-bold ${bucket === 'ALL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>A+B (Todo)</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100/50">
              <TrendingUp size={24} className="mb-4 opacity-50" />
              <p className="text-[10px] font-black uppercase opacity-60">Ingresos ({bucket})</p>
              <h3 className="text-3xl font-black">{kpi.income.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</h3>
            </div>
            <div className="bg-rose-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-rose-100/50">
              <TrendingDown size={24} className="mb-4 opacity-50" />
              <p className="text-[10px] font-black uppercase opacity-60">Gastos ({bucket})</p>
              <h3 className="text-3xl font-black">{kpi.expense.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</h3>
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
              <Wallet size={24} className="mb-4 opacity-50" />
              <p className="text-[10px] font-black uppercase opacity-60">Balance ({bucket})</p>
              <h3 className="text-3xl font-black">{(kpi.income - kpi.expense).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</h3>
            </div>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
             <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5 cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1" onClick={toggleSort}>
                      Fecha {sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                    </th>
                    <th className="px-6 py-5">Concepto</th>
                    <th className="px-6 py-5">Unidad</th>
                    <th className="px-6 py-5">Categoría / Proveedor</th>
                    <th className="px-6 py-5">Método</th>
                    <th className="px-6 py-5 text-right bg-indigo-50/30">Neto (Caja)</th>
                    <th className="px-6 py-5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold">
                  {filteredMovements.map(m => {
                    const isZero = m.amount_net === 0;
                    const apt = apartments.find(a => a.id === m.apartment_id);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5 text-slate-500 font-mono">{formatDateES(m.date)}</td>
                        <td className="px-6 py-5 text-slate-800">{m.concept}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: apt?.color || '#ccc' }}></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase">
                               {apt?.name || '---'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-slate-500 text-[11px]">{m.category || m.supplier || '-'}</td>
                        <td className="px-6 py-5 text-slate-500">{m.payment_method} <span className="text-[9px] text-slate-300">({m.accounting_bucket})</span></td>
                        
                        <td className={`px-6 py-5 text-right bg-indigo-50/10 ${isZero ? 'text-red-600 font-black text-sm' : (m.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}`}>
                          {isZero ? (
                             <span className="flex items-center justify-end gap-1"><AlertCircle size={12}/> 0.00€</span>
                          ) : (
                             `${m.type === 'income' ? '+' : '-'}${m.amount_net.toFixed(2)}€`
                          )}
                        </td>
                        <td className="px-6 py-5 text-center flex items-center justify-center gap-2">
                           {m.receipt_blob && (
                             <button onClick={() => downloadReceipt(m.receipt_blob!, m.id)} className="text-slate-300 hover:text-indigo-600 p-2" title="Descargar Factura">
                                <Paperclip size={16}/>
                             </button>
                           )}
                           <button onClick={() => handleDelete(m.id)} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={16}/></button>
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
                 <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><PieChart size={18} className="text-indigo-500"/> Reparto de Ingresos</h4>
                 <DonutChart data={pieData} title={selectedPropertyId === 'ALL' ? 'Por Propiedad' : 'Por Apartamento'}/>
              </div>
               <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                 <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> Desglose por Unidad</h4>
                 <UnitBreakdownBarChart data={groupedStats.find(p => p.id === selectedPropertyId)?.apartments} />
              </div>
           </div>
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center mb-8">
                    <h4 className="text-lg font-black text-slate-800 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> Evolución Anual</h4>
                 </div>
                 <BarChart data={chartData} />
              </div>
           </div>
        </div>
      )}
      
      {activeTab === 'TAX_DRAFT' && (
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-12 animate-in fade-in">
           <div className="flex justify-between items-start">
              <div>
                 <h3 className="text-3xl font-black text-slate-800">Borrador Renta</h3>
                 <p className="text-slate-500 mt-2">Cálculo basado en los filtros actuales.</p>
              </div>
              <button onClick={exportDraft} className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black shadow-xl hover:scale-105 transition-all">
                <Download size={20}/> Descargar Borrador
              </button>
           </div>
           {!fiscalProfile && (
             <div className="p-8 bg-amber-50 border border-amber-200 rounded-[2rem] flex gap-5 text-amber-800">
                <AlertCircle className="shrink-0" size={24}/>
                <div>
                   <p className="font-black text-lg">Perfil Fiscal Incompleto</p>
                   <p className="text-sm opacity-80">Rellena tus datos en la pestaña "Fiscal" para que el borrador sea válido.</p>
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

      {activeTab === 'FISCAL_SETTINGS' && (
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm max-w-4xl mx-auto animate-in fade-in">
           <h3 className="text-3xl font-black text-slate-800 mb-10">Configuración Fiscal</h3>
           <form onSubmit={handleSaveFiscal} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Régimen</label>
                 <select name="tipo_fiscal" defaultValue={fiscalProfile?.tipo_fiscal} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none">
                    <option value="IRPF_PARTICULAR">IRPF Particular (Rendimientos Inmob.)</option>
                    <option value="AUTONOMO">Autónomo (Actividad Económica)</option>
                    <option value="SOCIEDAD_SL">Sociedad Mercantil (S.L.)</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIF / CIF</label>
                 <input name="nif_cif" defaultValue={fiscalProfile?.nif_cif} required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" placeholder="B12345678" />
              </div>
              <div className="col-span-full space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo o Razón Social</label>
                 <input name="nombre_razon_social" defaultValue={fiscalProfile?.nombre_razon_social} required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Domicilio Fiscal</label>
                 <input name="domicilio_fiscal" defaultValue={fiscalProfile?.domicilio_fiscal} required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provincia</label>
                 <input name="provincia" defaultValue={fiscalProfile?.provincia} required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
              </div>
              <div className="col-span-full pt-8 flex justify-end">
                 <button type="submit" className="flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-3xl font-black shadow-xl hover:bg-indigo-600 transition-all active:scale-95">
                    <Save size={20}/> Guardar Cambios Fiscales
                 </button>
              </div>
           </form>
        </div>
      )}
      
       {activeTab === 'SCAN_EXPENSE' && (
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
                 <Receipt size={24} className="text-indigo-600"/>
                 <h3 className="text-xl font-black text-slate-800">Detalles del Gasto</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha</label>
                    <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Importe</label>
                    <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border rounded-xl font-bold" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                 </div>
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proveedor / Tienda</label>
                 <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" placeholder="Ej. Leroy Merlin" value={expenseForm.supplier} onChange={e => setExpenseForm({...expenseForm, supplier: e.target.value})} />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Concepto</label>
                 <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" placeholder="Ej. Pintura blanca 5L" value={expenseForm.concept} onChange={e => setExpenseForm({...expenseForm, concept: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</label>
                    <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                       <option>General</option>
                       <option>Mantenimiento</option>
                       <option>Limpieza</option>
                       <option>Suministros</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asignar Unidad</label>
                    <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={expenseForm.apartment_id} onChange={e => setExpenseForm({...expenseForm, apartment_id: e.target.value})}>
                       <option value="">(Global)</option>
                       {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                 </div>
              </div>
              <button onClick={handleSaveExpense} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                 <Save size={20}/> Guardar Gasto con Foto
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
