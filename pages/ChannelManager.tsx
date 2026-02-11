
import React, { useState, useEffect, useCallback } from 'react';
import { projectManager } from '../services/projectManager';
import { Property, Apartment, ChannelConnection, Booking } from '../types';
import { syncEngine, getProxyUrl } from '../services/syncEngine';
import { syncScheduler, SyncInterval } from '../services/syncScheduler';
import { networkMonitor } from '../services/networkMonitor';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { 
  RefreshCw, Plus, Trash2, Link, AlertTriangle, CheckCircle2, 
  ExternalLink, Calendar, Building2, Globe, ShieldAlert, ArrowRight,
  Wifi, Clock, Settings, Play, X, Lock, History, ChevronRight, LayoutGrid,
  MoreVertical, Power, HelpCircle, AlertCircle, Server, Copy, Eye
} from 'lucide-react';

// --- SUBCOMPONENTS ---

const ConnectionBadge = ({ type }: { type: string }) => {
  if (type === 'AIRBNB') return <span className="flex items-center gap-1.5 bg-[#FF5A5F] text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide"><Globe size={10}/> Airbnb</span>;
  if (type === 'BOOKING') return <span className="flex items-center gap-1.5 bg-[#003580] text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide"><Calendar size={10}/> Booking</span>;
  return <span className="flex items-center gap-1.5 bg-slate-600 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide"><Link size={10}/> {type}</span>;
};

const StatusDot = ({ status, enabled, lastSync }: { status: string, enabled: boolean, lastSync: number }) => {
  if (!enabled) return <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Pausado</div>;
  
  let color = 'bg-slate-300';
  let text = 'Pendiente';
  let textColor = 'text-slate-500';
  
  if (status === 'OK') { color = 'bg-emerald-500'; text = 'Sincronizado'; textColor = 'text-emerald-600'; }
  else if (status === 'ERROR') { color = 'bg-rose-500'; text = 'Error'; textColor = 'text-rose-600'; }
  else if (status === 'OFFLINE') { color = 'bg-amber-500'; text = 'Offline'; textColor = 'text-amber-600'; }

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
       {lastSync > 0 && <span className="text-[9px] text-slate-400 font-mono pl-3.5 mt-0.5">{new Date(lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
    </div>
  );
};

export const ChannelManager: React.FC = () => {
  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // UI State
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  
  // Settings
  const [isOnline, setIsOnline] = useState(networkMonitor.isOnline());
  const [syncInterval, setSyncInterval] = useState<SyncInterval>(syncScheduler.getInterval());

  // Modals
  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const [connForm, setConnForm] = useState<Partial<ChannelConnection>>({ channel_name: 'AIRBNB', ical_url: '', alias: '', priority: 50, enabled: true, force_direct: false });
  
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(getProxyUrl());

  const loadData = useCallback(async () => {
    const store = projectManager.getStore();
    try {
      const [p, a, c, b] = await Promise.all([
        store.getProperties(),
        store.getAllApartments(),
        store.getChannelConnections(),
        store.getBookings()
      ]);
      setProperties(p);
      setApartments(a);
      setConnections(c);
      setBookings(b);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useDataRefresh(loadData);

  useEffect(() => {
    return networkMonitor.subscribe(setIsOnline);
  }, []);

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
    setIsConnModalOpen(false);
    setConnForm({ channel_name: 'AIRBNB', ical_url: '', alias: '', priority: 50, enabled: true, force_direct: false });
    loadData();
  };

  const handleDeleteConnection = async (id: string) => {
    if (confirm("¿Eliminar fuente? Las reservas ya importadas se mantendrán (desvinculadas), pero no se actualizarán.")) {
      await projectManager.getStore().deleteChannelConnection(id);
      loadData();
    }
  };

  const saveProxyConfig = () => {
    localStorage.setItem('rentikpro_proxy_url', proxyUrl);
    setIsConfigModalOpen(false);
    alert("Configuración de Proxy guardada.");
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
    await syncScheduler.triggerNow();
    setSyncingId(null);
    loadData();
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

     // 2. Cancel conflicting
     b1.status = 'cancelled';
     b1.conflict_detected = false;
     b2.status = 'cancelled';
     b2.conflict_detected = false;
     
     await store.saveBooking(b1);
     await store.saveBooking(b2);
     loadData();
  };

  // --- RENDER HELPERS ---

  const conflicts = bookings.filter(b => b.conflict_detected && b.status !== 'cancelled');
  const conflictGroups: Record<string, Booking[]> = {};
  conflicts.forEach(b => {
     if (!conflictGroups[b.apartment_id]) conflictGroups[b.apartment_id] = [];
     conflictGroups[b.apartment_id].push(b);
  });

  const selectedApt = apartments.find(a => a.id === selectedAptId);
  const aptConnections = connections.filter(c => c.apartment_id === selectedAptId);

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in pb-20">
      
      {/* HEADER GLOBAL */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <RefreshCw className={`text-indigo-600 ${syncingId === 'GLOBAL' ? 'animate-spin' : ''}`}/> Channel Manager
          </h2>
          <p className="text-slate-500 font-medium text-sm flex items-center gap-2 mt-2">
             <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
             {isOnline ? 'Sistema Online • Sincronización Automática' : 'Sistema Offline • Cambios en cola local'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-100">
           <button onClick={() => setIsConfigModalOpen(true)} className="p-3 bg-white hover:bg-slate-200 rounded-2xl text-slate-500 transition-colors shadow-sm" title="Configurar Proxy">
              <Server size={16}/>
           </button>
           <div className="flex items-center gap-2 px-5 py-3 bg-white rounded-2xl shadow-sm border border-slate-100">
              <Clock size={16} className="text-slate-400"/>
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
              {syncingId === 'GLOBAL' ? 'Sincronizando...' : 'Sincronizar Todo'} <Play size={10} fill="currentColor"/>
           </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-0">
         
         {/* SIDEBAR: NAVIGATION */}
         <div className={`lg:col-span-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${selectedAptId ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
               <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                  <LayoutGrid size={14}/> Propiedades
               </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
               {properties.map(p => (
                  <div key={p.id}>
                     <div className="flex items-center gap-2 mb-3 px-2">
                        <Building2 size={16} className="text-indigo-400"/>
                        <span className="font-bold text-sm text-slate-800">{p.name}</span>
                     </div>
                     <div className="space-y-2">
                        {apartments.filter(a => a.property_id === p.id).map(a => {
                           const hasConflict = conflicts.some(b => b.apartment_id === a.id);
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
                                    <div className={`w-1.5 h-8 rounded-full ${isSelected ? 'bg-white/30' : ''}`} style={{backgroundColor: isSelected ? undefined : a.color}}></div>
                                    <div>
                                       <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>{a.name}</p>
                                       <p className={`text-[9px] font-medium ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                          {aptConns.length} conexiones
                                       </p>
                                    </div>
                                 </div>
                                 <div className="flex gap-1">
                                    {hasConflict && <div className="p-1 bg-amber-400 text-white rounded-full animate-pulse"><AlertTriangle size={12}/></div>}
                                    {hasError && <div className="p-1 bg-rose-400 text-white rounded-full"><AlertCircle size={12}/></div>}
                                    {!hasConflict && !hasError && isSelected && <ChevronRight size={16} className="text-indigo-300"/>}
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
                  <LayoutGrid size={14}/> Dashboard General
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
                        <button onClick={() => setSelectedAptId(null)} className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-800"><ArrowRight size={20} className="rotate-180"/></button>
                        <div className="w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center text-white font-black text-2xl" style={{backgroundColor: selectedApt.color}}>
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
                           <RefreshCw size={14} className={syncingId === selectedApt.id ? 'animate-spin' : ''}/> Sincronizar
                        </button>
                        <button 
                           onClick={() => { setConnForm({channel_name: 'AIRBNB', ical_url: '', alias: '', priority: 50, enabled: true, force_direct: false}); setIsConnModalOpen(true); }}
                           className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                           <Plus size={16}/> Añadir Fuente
                        </button>
                     </div>
                  </div>

                  {/* Sources List Grid */}
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
                     <div className="flex flex-col gap-4">
                        {aptConnections.map(conn => (
                           <div key={conn.id} className={`group bg-white border rounded-3xl p-1 transition-all ${conn.enabled ? 'border-slate-200 hover:border-indigo-300 hover:shadow-lg' : 'border-slate-100 opacity-60'}`}>
                              <div className="flex flex-col md:flex-row items-center gap-4 p-4">
                                 
                                 {/* Icon */}
                                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${conn.enabled ? 'bg-slate-50 group-hover:bg-indigo-50' : 'bg-slate-100 grayscale'}`}>
                                    {conn.channel_name === 'AIRBNB' ? <Globe className="text-rose-500" size={24}/> : conn.channel_name === 'BOOKING' ? <Calendar className="text-blue-600" size={24}/> : <Link className="text-slate-500" size={24}/>}
                                 </div>

                                 {/* Info Content */}
                                 <div className="flex-1 min-w-0 w-full md:w-auto text-center md:text-left">
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                                       <h4 className="font-bold text-slate-800 text-base truncate max-w-[200px]">{conn.alias || conn.channel_name}</h4>
                                       <ConnectionBadge type={conn.channel_name}/>
                                       {conn.force_direct && <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded border border-amber-200">DIRECT</span>}
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 flex items-center gap-2 max-w-full">
                                       <span className="text-[10px] font-mono text-slate-400 truncate flex-1">{conn.ical_url}</span>
                                       <button onClick={() => navigator.clipboard.writeText(conn.ical_url)} className="text-slate-300 hover:text-indigo-500 transition-colors"><Copy size={12}/></button>
                                    </div>
                                 </div>

                                 {/* Divider for Mobile */}
                                 <div className="w-full h-px bg-slate-50 md:hidden"></div>

                                 {/* Status & Priority */}
                                 <div className="flex items-center gap-6 md:border-l md:border-slate-100 md:pl-6">
                                    <StatusDot status={conn.last_status} enabled={conn.enabled} lastSync={conn.last_sync}/>
                                    
                                    <div className="flex flex-col items-center">
                                       <span className="text-[9px] font-black uppercase text-slate-300 mb-1">Prio</span>
                                       <div className="flex items-end gap-0.5 h-4">
                                          <div className={`w-1 rounded-sm ${conn.priority >= 20 ? 'bg-indigo-300' : 'bg-slate-200'} h-2`}></div>
                                          <div className={`w-1 rounded-sm ${conn.priority >= 50 ? 'bg-indigo-400' : 'bg-slate-200'} h-3`}></div>
                                          <div className={`w-1 rounded-sm ${conn.priority >= 80 ? 'bg-indigo-600' : 'bg-slate-200'} h-4`}></div>
                                       </div>
                                       <span className="text-[9px] font-bold text-slate-500 mt-0.5">{conn.priority}</span>
                                    </div>
                                 </div>

                                 {/* Actions */}
                                 <div className="flex gap-2 w-full md:w-auto justify-end border-t md:border-0 border-slate-50 pt-3 md:pt-0 mt-2 md:mt-0">
                                    <button 
                                       onClick={() => { setConnForm(conn); setIsConnModalOpen(true); }} 
                                       className="p-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl transition-all shadow-sm"
                                       title="Configurar"
                                    >
                                       <Settings size={16}/>
                                    </button>
                                    <button 
                                       onClick={() => handleDeleteConnection(conn.id)} 
                                       className="p-2.5 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 rounded-xl transition-all shadow-sm"
                                       title="Eliminar"
                                    >
                                       <Trash2 size={16}/>
                                    </button>
                                 </div>
                              </div>
                           </div>
                        ))}
                        
                        {aptConnections.length === 0 && (
                           <div className="flex flex-col items-center justify-center py-20 text-center opacity-60 border-2 border-dashed border-slate-200 rounded-[3rem]">
                              <Link size={48} className="text-slate-300 mb-4"/>
                              <h4 className="text-xl font-bold text-slate-400">Sin conexiones configuradas</h4>
                              <p className="text-sm text-slate-400 max-w-xs mt-2">Añade enlaces iCal de Airbnb, Booking o VRBO para sincronizar el calendario automáticamente.</p>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Apartment Logs & Footer */}
                  <div className="bg-slate-900 text-slate-300 border-t border-slate-800">
                     <button onClick={() => setShowLogs(!showLogs)} className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors">
                        <span className="flex items-center gap-2"><History size={14}/> Log de Sincronización</span>
                        {showLogs ? <ChevronRight size={14} className="rotate-90"/> : <ChevronRight size={14}/>}
                     </button>
                     {showLogs && (
                        <div className="p-6 pt-0 space-y-2 border-t border-slate-800 max-h-48 overflow-y-auto font-mono text-[10px]">
                           {aptConnections.map(c => (
                              <div key={c.id} className="flex justify-between items-center py-1">
                                 <div className="flex items-center gap-2">
                                    <span className={c.last_status === 'ERROR' && c.enabled ? 'text-rose-400' : 'text-emerald-400'}>●</span>
                                    <span className="opacity-70">{c.alias || c.channel_name}:</span>
                                 </div>
                                 <span className="opacity-50 text-right truncate max-w-[300px]">{c.sync_log || 'Sin actividad reciente'}</span>
                              </div>
                           ))}
                           {aptConnections.length === 0 && <p className="opacity-30">No hay fuentes para mostrar logs.</p>}
                        </div>
                     )}
                  </div>
               </div>
            ) : (
               // DEFAULT DASHBOARD VIEW
               <div className="space-y-8 animate-in slide-in-from-left-4 h-full overflow-y-auto p-1">
                  {/* Conflict Center */}
                  {conflicts.length > 0 ? (
                     <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] border border-amber-100 p-8 shadow-xl shadow-amber-100/50">
                        <div className="flex items-center gap-4 mb-8">
                           <div className="p-4 bg-white text-amber-600 rounded-2xl shadow-sm"><ShieldAlert size={32}/></div>
                           <div>
                              <h3 className="text-2xl font-black text-amber-900">Conflictos de Disponibilidad</h3>
                              <p className="text-amber-800/70 font-medium text-sm">Acción requerida: {conflicts.length} reservas solapadas.</p>
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
                                          <Building2 size={12}/> {aptName}
                                       </span>
                                       <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg flex items-center gap-2">
                                          <Calendar size={12}/> {b1.check_in} <ArrowRight size={10}/> {b1.check_out}
                                       </span>
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row items-stretch gap-4">
                                       {/* Option A */}
                                       <button 
                                          onClick={() => resolveConflict(b1.id, b2.id)}
                                          className="flex-1 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md transition-all text-left group relative"
                                       >
                                          <div className="flex justify-between items-start mb-2">
                                             <span className="font-black text-slate-800 text-lg group-hover:text-indigo-700">{b1.source}</span>
                                             {b1.source === 'BOOKING' && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Prio Alta</span>}
                                          </div>
                                          <p className="text-xs text-slate-500 font-medium">Mantener esta reserva</p>
                                          <div className="mt-4 pt-4 border-t border-slate-200 group-hover:border-indigo-200 flex justify-between items-center">
                                             <span className="text-slate-400 text-xs font-mono">{b1.total_price}€</span>
                                             <CheckCircle2 size={18} className="text-slate-300 group-hover:text-indigo-500"/>
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
                                          <p className="text-xs text-slate-500 font-medium">Mantener esta reserva</p>
                                          <div className="mt-4 pt-4 border-t border-slate-200 group-hover:border-indigo-200 flex justify-between items-center">
                                             <span className="text-slate-400 text-xs font-mono">{b2.total_price}€</span>
                                             <CheckCircle2 size={18} className="text-slate-300 group-hover:text-indigo-500"/>
                                          </div>
                                       </button>
                                    </div>

                                    {/* Manual Override */}
                                    <div className="mt-4 text-center">
                                       <button onClick={() => resolveAsManualBlock(b1, b2)} className="text-xs font-bold text-slate-400 hover:text-rose-500 flex items-center justify-center gap-1 mx-auto transition-colors">
                                          <Lock size={12}/> Bloquear fechas manualmente (Cancelar ambas)
                                       </button>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  ) : (
                     <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-6">
                        <div className="bg-emerald-50 p-6 rounded-full text-emerald-500 mb-2 shadow-lg shadow-emerald-50"><CheckCircle2 size={48}/></div>
                        <div>
                           <h3 className="text-3xl font-black text-slate-800">Todo Sincronizado</h3>
                           <p className="text-slate-500 mt-2 max-w-md mx-auto">No hay conflictos de disponibilidad pendientes. Tus calendarios están al día.</p>
                        </div>
                     </div>
                  )}

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                        <div className="flex justify-between items-start">
                           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Link size={20}/></div>
                           <span className="text-3xl font-black text-slate-800">{connections.length}</span>
                        </div>
                        <div>
                           <p className="font-bold text-slate-700">Conexiones Totales</p>
                           <p className="text-xs text-slate-400">Canales activos</p>
                        </div>
                     </div>
                     <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                        <div className="flex justify-between items-start">
                           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><RefreshCw size={20}/></div>
                           <span className="text-3xl font-black text-slate-800">{connections.filter(c => c.last_status === 'OK').length}</span>
                        </div>
                        <div>
                           <p className="font-bold text-slate-700">Estado Salud</p>
                           <p className="text-xs text-slate-400">Fuentes sincronizando OK</p>
                        </div>
                     </div>
                     <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                        <div className="flex justify-between items-start">
                           <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><Building2 size={20}/></div>
                           <span className="text-3xl font-black text-slate-800">{apartments.length}</span>
                        </div>
                        <div>
                           <p className="font-bold text-slate-700">Apartamentos</p>
                           <p className="text-xs text-slate-400">Gestionados</p>
                        </div>
                     </div>
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
                  <button onClick={() => setIsConnModalOpen(false)}><X size={20} className="text-slate-400"/></button>
               </div>
               
               <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                     <span className="text-xs font-bold text-slate-600 flex items-center gap-2"><Power size={14}/> Estado Conexión</span>
                     <button 
                        onClick={() => setConnForm({...connForm, enabled: !connForm.enabled})}
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
                       onChange={e => setConnForm({...connForm, channel_name: e.target.value as any})}
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
                        onChange={e => setConnForm({...connForm, alias: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400">URL del Calendario (iCal)</label>
                     <input 
                        className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-xs mt-1"
                        placeholder="https://..."
                        value={connForm.ical_url}
                        onChange={e => setConnForm({...connForm, ical_url: e.target.value})}
                     />
                     <div className="mt-2 flex flex-col gap-1">
                        <p className="text-[9px] text-slate-400 flex items-center gap-1"><ExternalLink size={10}/> Copia el enlace de exportación de tu OTA.</p>
                        <p className="text-[9px] text-indigo-400 font-bold cursor-pointer hover:underline" onClick={() => setConnForm({...connForm, ical_url: 'http://localhost:5173/mock_airbnb.ics'})}>Usar Mock Airbnb (Test)</p>
                        <p className="text-[9px] text-indigo-400 font-bold cursor-pointer hover:underline" onClick={() => setConnForm({...connForm, ical_url: 'http://localhost:5173/mock_booking.ics'})}>Usar Mock Booking (Test)</p>
                     </div>
                  </div>
                  
                  {/* PROXY SETTINGS */}
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-1"><ShieldAlert size={10}/> Modo Avanzado</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <input 
                           type="checkbox" 
                           id="forceDirect"
                           className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                           checked={connForm.force_direct || false}
                           onChange={e => setConnForm({...connForm, force_direct: e.target.checked})}
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
                           onChange={e => setConnForm({...connForm, priority: Number(e.target.value)})}
                        />
                        <span className="font-black text-slate-700 w-8 text-right">{connForm.priority}</span>
                     </div>
                     <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                        <HelpCircle size={10}/> A mayor número, mayor prioridad.
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
                  <button onClick={() => setIsConfigModalOpen(false)}><X size={20} className="text-slate-400"/></button>
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
    </div>
  );
};
