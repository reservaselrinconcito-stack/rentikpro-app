import React from 'react';
import { ChannelConnection, CalendarEvent } from '../types';
import { dateFormat } from '../services/dateFormat';
import {
    X, Globe, Calendar, Link, Activity, Clock, ShieldCheck,
    AlertTriangle, FileText, CheckCircle2, XCircle, Clock4, ShieldAlert, RefreshCw
} from 'lucide-react';

interface ChannelDetailsModalProps {
    connection: ChannelConnection;
    events: CalendarEvent[];
    onClose: () => void;
    onRetry?: () => void;
}

export const ChannelDetailsModal: React.FC<ChannelDetailsModalProps> = ({ connection, events, onClose, onRetry }) => {

    // Statistics Calculation
    const stats = {
        total: events.length,
        confirmed: events.filter(e => e.status === 'confirmed').length,
        cancelled: events.filter(e => e.status === 'cancelled').length,
        allDay: events.filter(e => e.start_date.length === 10).length,
        timezone: events.filter(e => e.start_date.includes('T')).length,
        duration: events.filter(e => e.raw_data?.includes('DURATION')).length,
        rrule: events.filter(e => e.raw_data?.includes('RRULE')).length,
        // Approximate calculation for conflicts created by this channel
        // In a real scenario, this would require querying bookings with conflict_detected=true and source=CHANNEL_NAME
        // For now, we leave it as a placeholder or omit if not easily available.
    };

    // Capability Detection
    const enrichedCount = events.filter(e =>
        (e.description && e.description.length > 20) ||
        (e.summary && /guest|reserva|huesped/i.test(e.summary))
    ).length;

    const isEnriched = events.length > 0 && (enrichedCount / events.length) > 0.2; // 20% threshold

    const getIcon = () => {
        switch (connection.channel_name) {
            case 'AIRBNB': return <Globe size={24} className="text-rose-500" />;
            case 'BOOKING': return <Calendar size={24} className="text-blue-600" />;
            default: return <Link size={24} className="text-slate-500" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 rounded-t-[2.5rem]">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
                            {getIcon()}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">{connection.alias || connection.channel_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                                    {connection.channel_name}
                                </span>
                                {connection.force_direct && (
                                    <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <ShieldCheck size={10} /> Directo
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">

                    {/* Error Alert if needed */}
                    {(connection.last_status === 'ERROR' || connection.last_status === 'INVALID_TOKEN' || connection.last_status === 'TOKEN_CADUCADO') && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-top-2">
                            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                                <ShieldAlert size={24} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h4 className="font-black text-rose-800 text-sm uppercase tracking-tight">Error detectado</h4>
                                <p className="text-rose-600 text-xs mt-1 leading-relaxed">
                                    {(connection.last_status === 'INVALID_TOKEN' || connection.last_status === 'TOKEN_CADUCADO')
                                        ? "Token inválido/caducado. Pega un nuevo enlace."
                                        : (connection.sync_log || "Error desconocido durante la sincronización.")}
                                </p>
                            </div>
                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="px-6 py-2 bg-rose-600 text-white rounded-xl font-black text-[10px] hover:bg-rose-700 transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
                                >
                                    <RefreshCw size={12} /> Reintentar Ahora
                                </button>
                            )}
                        </div>
                    )}

                    {/* URL & Status */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-slate-400">URL iCal Source</span>
                            <span className="text-[10px] font-mono text-slate-400">{connection.connection_type}</span>
                        </div>
                        <div className="font-mono text-xs text-slate-600 break-all bg-white p-3 rounded-xl border border-slate-100">
                            {connection.ical_url}
                        </div>
                    </div>

                    {/* Sync Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border boundary-slate-200 p-5 rounded-2xl shadow-sm">
                            <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-3 text-sm">
                                <Activity size={16} className="text-indigo-500" /> Estado Sincronización
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Último Sync:</span>
                                    <span className="font-mono font-bold">{connection.last_sync > 0 ? dateFormat.formatTimestampForUser(connection.last_sync) : 'Nunca'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Estado:</span>
                                    <span className={`font-black px-2 rounded ${connection.last_status === 'OK' ? 'bg-emerald-100 text-emerald-600' : connection.last_status === 'INVALID_TOKEN' ? 'bg-rose-100 text-rose-700 border border-rose-200' : connection.last_status === 'ERROR' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {connection.last_status === 'INVALID_TOKEN' ? 'TOKEN INVÁLIDO' : connection.last_status}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Proxy Usado:</span>
                                    <span className="font-mono text-slate-600">
                                        {connection.sync_log?.includes('Proxy:')
                                            ? 'Sí (Worker/Corsproxy)'
                                            : connection.force_direct ? 'No (Directo)' : 'Auto'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border boundary-slate-200 p-5 rounded-2xl shadow-sm">
                            <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-3 text-sm">
                                <FileText size={16} className="text-blue-500" /> Capacidad Detectada
                            </h4>
                            <div className="flex flex-col gap-2">
                                {isEnriched ? (
                                    <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                                        <p className="font-bold text-indigo-700 text-xs mb-1">✨ iCal Enriquecido</p>
                                        <p className="text-[10px] text-indigo-600 leading-tight">
                                            Detectamos descripciones detalladas o nombres de huéspedes. RentikPro puede importar algunos datos extra.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                                        <p className="font-bold text-slate-700 text-xs mb-1">📅 Disponibilidad Simple</p>
                                        <p className="text-[10px] text-slate-500 leading-tight">
                                            Este iCal parece contener solo bloqueos de fechas sin detalles de huésped o precio.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Statistics Grid */}
                    <div>
                        <h4 className="font-black text-slate-800 mb-4 text-sm uppercase tracking-wide">Estadísticas del Último Pull</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard label="Total Eventos" value={stats.total} icon={<Calendar size={14} />} color="bg-slate-100 text-slate-600" />
                            <StatCard label="Confirmados" value={stats.confirmed} icon={<CheckCircle2 size={14} />} color="bg-emerald-100 text-emerald-600" />
                            <StatCard label="Cancelados" value={stats.cancelled} icon={<XCircle size={14} />} color="bg-rose-100 text-rose-600" />
                            <StatCard label="All Day" value={stats.allDay} icon={<Clock size={14} />} color="bg-blue-100 text-blue-600" />
                            <StatCard label="Con Timezone" value={stats.timezone} icon={<Globe size={14} />} color="bg-indigo-100 text-indigo-600" />
                            <StatCard label="Con Duration" value={stats.duration} icon={<Clock4 size={14} />} color="bg-violet-100 text-violet-600" />
                            <StatCard label="Recurrentes" value={stats.rrule} icon={<Activity size={14} />} color="bg-amber-100 text-amber-600" />
                        </div>
                    </div>

                    {/* Full Log */}
                    <div className="border-t border-slate-100 pt-6">
                        <h4 className="font-black text-slate-800 mb-3 text-sm uppercase tracking-wide">Sync Log Completo</h4>
                        <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl font-mono text-[10px] h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                            {connection.sync_log || "No hay logs disponibles."}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }: any) => (
    <div className={`p-3 rounded-xl border border-transparent ${color} bg-opacity-50`}>
        <div className="flex justify-between items-start mb-2 opacity-80">
            {icon}
            <span className="font-black text-lg">{value}</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
    </div>
);
