
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { Property, Booking, AccountingMovement, ChannelConnection } from '../types';
import { TrendingUp, Home, Calendar, Users, AlertTriangle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color, onClick }: { label: string, value: string | number, icon: any, color: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200' : ''}`}
  >
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    const fetchData = async () => {
      const store = projectManager.getStore();
      const [props, bookings, txs, connections] = await Promise.all([
        store.getProperties(),
        store.getBookings(),
        store.getMovements(),
        store.getChannelConnections()
      ]);
      
      // General Stats
      const revenue = txs
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount_net, 0);

      setStats({
        properties: props.length,
        bookings: bookings.filter(b => b.status === 'confirmed').length,
        revenue,
        travelers: new Set(bookings.map(b => b.traveler_id)).size
      });

      // Channel Manager Stats
      setCmStats({
        activeConnections: connections.filter(c => c.enabled).length,
        conflicts: bookings.filter(b => b.conflict_detected && b.status !== 'cancelled').length,
        errors: connections.filter(c => c.enabled && c.last_status === 'ERROR').length
      });
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Panel de Control</h2>
          <p className="text-slate-500">Resumen general de tu negocio de alquiler.</p>
        </div>
      </div>

      {/* CHANNEL MANAGER ALERTS */}
      {(cmStats.conflicts > 0 || cmStats.errors > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {cmStats.conflicts > 0 && (
             <div onClick={() => navigate('/channel-manager')} className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors group">
                <div className="flex items-center gap-3 text-amber-800">
                   <div className="p-2 bg-amber-200 rounded-lg text-amber-800"><AlertTriangle size={20}/></div>
                   <div>
                      <h4 className="font-bold text-sm">Conflictos de Disponibilidad</h4>
                      <p className="text-xs opacity-80">{cmStats.conflicts} reservas requieren tu atención inmediata.</p>
                   </div>
                </div>
                <ArrowRight size={18} className="text-amber-400 group-hover:text-amber-700 group-hover:translate-x-1 transition-all"/>
             </div>
           )}
           {cmStats.errors > 0 && (
             <div onClick={() => navigate('/channel-manager')} className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-colors group">
                <div className="flex items-center gap-3 text-rose-800">
                   <div className="p-2 bg-rose-200 rounded-lg text-rose-800"><RefreshCw size={20}/></div>
                   <div>
                      <h4 className="font-bold text-sm">Error de Sincronización</h4>
                      <p className="text-xs opacity-80">{cmStats.errors} conexiones han fallado recientemente.</p>
                   </div>
                </div>
                <ArrowRight size={18} className="text-rose-400 group-hover:text-rose-700 group-hover:translate-x-1 transition-all"/>
             </div>
           )}
        </div>
      )}

      {/* MAIN STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Propiedades" value={stats.properties} icon={Home} color="bg-blue-500" onClick={() => navigate('/properties')} />
        <StatCard label="Reservas Activas" value={stats.bookings} icon={Calendar} color="bg-indigo-500" onClick={() => navigate('/bookings')} />
        <StatCard label="Ingresos Totales" value={`${stats.revenue.toLocaleString()}€`} icon={TrendingUp} color="bg-emerald-500" onClick={() => navigate('/accounting')} />
        <StatCard label="Huéspedes" value={stats.travelers} icon={Users} color="bg-purple-500" onClick={() => navigate('/travelers')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity / Status */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h4 className="text-lg font-black text-slate-800 mb-6">Estado del Sistema</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-5 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className={`p-3 rounded-full ${cmStats.activeConnections > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                   <RefreshCw size={20} className={cmStats.activeConnections > 0 ? 'animate-spin-slow' : ''}/>
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sincronización</p>
                   <p className="text-slate-700 font-bold text-sm">
                      {cmStats.activeConnections > 0 ? `${cmStats.activeConnections} canales activos` : 'Sin conexiones'}
                   </p>
                </div>
             </div>
             
             <div className="p-5 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                   <CheckCircle2 size={20}/>
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Motor de Reservas</p>
                   <p className="text-slate-700 font-bold text-sm">Operativo (Local)</p>
                </div>
             </div>
          </div>
          
          <div className="mt-8">
             <h5 className="text-sm font-bold text-slate-700 mb-4">Accesos Directos</h5>
             <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                <button onClick={() => navigate('/channel-manager')} className="px-5 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0">
                   Configurar Canales
                </button>
                <button onClick={() => navigate('/bookings')} className="px-5 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0">
                   Nueva Reserva
                </button>
                <button onClick={() => navigate('/checkin-scan')} className="px-5 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0">
                   Escanear DNI
                </button>
             </div>
          </div>
        </div>

        {/* Occupation Chart Placeholder */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
          <h4 className="text-lg font-black text-slate-800 mb-4">Ocupación</h4>
          <div className="flex-1 bg-slate-50 rounded-3xl flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
            <Calendar size={40} className="mb-2 opacity-50"/>
            <span className="text-xs font-medium">Datos insuficientes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
