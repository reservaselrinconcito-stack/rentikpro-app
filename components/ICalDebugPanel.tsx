
import React, { useState, useEffect } from 'react';
import { X, Clipboard, Trash2, ShieldAlert, Bug, RefreshCw, Terminal } from 'lucide-react';
import { iCalLogger, ICalLogEntry } from '../services/iCalLogger';

interface ICalDebugPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ICalDebugPanel: React.FC<ICalDebugPanelProps> = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState<ICalLogEntry[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLogs(iCalLogger.getLogs());
            // Refresh logs every 2 seconds if open
            const interval = setInterval(() => {
                setLogs(iCalLogger.getLogs());
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(iCalLogger.getReport());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClear = () => {
        if (window.confirm('¿Limpiar todos los logs de depuración iCal?')) {
            iCalLogger.clearLogs();
            setLogs([]);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Bug size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">iCal Debug Console</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Sincronización & Diagnóstico</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Action Bar */}
                <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                            <RefreshCw size={12} className="animate-spin" />
                            Live Monitoring
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                            {logs.length} entradas en buffer
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-xs font-black uppercase tracking-tight"
                        >
                            <Trash2 size={16} /> Limpiar
                        </button>
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-black shadow-sm ${copied
                                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                                    : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
                                }`}
                        >
                            {copied ? <><Clipboard size={18} /> ¡Copiado!</> : <><Clipboard size={18} /> Copiar Reporte</>}
                        </button>
                    </div>
                </div>

                {/* Logs List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-slate-900 custom-scrollbar font-mono text-[11px]">
                    {logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
                            <Terminal size={48} className="opacity-20 mb-4" />
                            <p className="font-sans text-sm font-bold uppercase tracking-widest opacity-40">No hay logs disponibles</p>
                            <p className="font-sans text-xs mt-2 opacity-30 text-center max-w-xs">Inicia una sincronización para ver datos de depuración en tiempo real.</p>
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className={`p-3 rounded-xl border flex gap-4 ${log.level === 'ERROR' ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' :
                                    log.level === 'WARN' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' :
                                        'bg-slate-800/50 border-white/5 text-slate-300'
                                }`}>
                                <div className="shrink-0 w-20 opacity-50 font-black">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                                <div className="shrink-0 w-16">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${log.level === 'ERROR' ? 'bg-rose-500 text-white' :
                                            log.level === 'WARN' ? 'bg-amber-500 text-slate-900' :
                                                'bg-slate-700 text-slate-300'
                                        }`}>
                                        {log.level}
                                    </span>
                                </div>
                                <div className="shrink-0 w-24 font-black text-indigo-400 uppercase tracking-tighter">
                                    [{log.step}]
                                </div>
                                <div className="flex-1 break-words">
                                    <span className="font-bold">{log.message}</span>
                                    {log.details && (
                                        <pre className="mt-1.5 overflow-x-auto p-2 bg-black/30 rounded-lg text-[9px] text-slate-400">
                                            {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )).reverse() // Most recent first
                    )}
                </div>

                {/* Footer Area with user feedback on VRBO/Other platforms */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-slate-400 italic text-[10px]">
                    <ShieldAlert size={14} className="shrink-0" />
                    <p>Los reportes de depuración ayudan a diagnosticar problemas de TLS, CORS o cambios en los formatos de Vrbo y Airbnb. Los datos sensibles (URLs) se anonimizan parcialmente.</p>
                </div>
            </div>
        </div>
    );
};
