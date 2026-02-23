
import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle, Clock, Eye, Database, Info, MessageSquare, ExternalLink } from 'lucide-react';
import { projectManager } from '../services/projectManager';
import { EmailIngest } from '../types';
import { emailSyncService } from '../services/emailSync';
import { toast } from 'sonner';

export const EmailBookings: React.FC = () => {
    const [ingests, setIngests] = useState<EmailIngest[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedIngest, setSelectedIngest] = useState<EmailIngest | null>(null);

    const loadIngests = async () => {
        setLoading(true);
        try {
            const store = projectManager.getStore();
            const data = await store.query("SELECT * FROM email_ingest ORDER BY created_at DESC LIMIT 100");
            setIngests(data.map((item: any) => ({
                ...item,
                parsed_json: item.parsed_json ? JSON.parse(item.parsed_json) : {},
                raw_links_json: item.raw_links_json ? JSON.parse(item.raw_links_json) : []
            })));
        } catch (error) {
            console.error("Error loading ingests:", error);
            toast.error("Error al cargar ingestas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIngests();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await emailSyncService.syncInbound();
            await loadIngests();
            toast.success("Sincronización completada");
        } catch (error) {
            console.error("Sync error:", error);
            toast.error("Error en sincronización");
        } finally {
            setSyncing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'LINKED': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle size={10} /> ENLAZADO</span>;
            case 'PARSED': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Database size={10} /> PARSEADO</span>;
            case 'NEEDS_MANUAL': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><AlertCircle size={10} /> MANUAL</span>;
            case 'ERROR': return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><XCircle size={10} /> ERROR</span>;
            default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> NUEVO</span>;
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Mail className="text-indigo-600" size={36} />
                        Reservas por Email
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Monitorea la ingesta automática de reservas desde Gmail</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 font-black"
                >
                    <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'SINCRONIZANDO...' : 'BUSCAR NUEVOS EMAILS'}
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="glass p-12 flex flex-col items-center justify-center text-slate-400 gap-4">
                            <RefreshCw size={48} className="animate-spin opacity-20" />
                            <p className="font-bold tracking-widest uppercase text-xs">Cargando ingestas...</p>
                        </div>
                    ) : ingests.length === 0 ? (
                        <div className="glass p-12 flex flex-col items-center justify-center text-slate-400 gap-4">
                            <Mail size={48} className="opacity-20" />
                            <p className="font-bold">No hay ingestas registradas aún.</p>
                        </div>
                    ) : (
                        ingests.map(ingest => (
                            <div
                                key={ingest.id}
                                onClick={() => setSelectedIngest(ingest)}
                                className={`glass p-4 cursor-pointer transition-all hover:border-indigo-200 border-2 ${selectedIngest?.id === ingest.id ? 'border-indigo-500 shadow-indigo-100' : 'border-white/40'}`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                        <div className={`p-3 rounded-2xl ${ingest.provider === 'BOOKING' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            <Mail size={20} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{ingest.provider} • {new Date(ingest.received_at).toLocaleDateString()}</p>
                                            <h3 className="font-black text-slate-800 truncate">{ingest.subject}</h3>
                                            <p className="text-xs text-slate-500 truncate">{ingest.from_addr}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        {getStatusBadge(ingest.status)}
                                        {ingest.parsed_json?.missing_fields?.length > 0 && (
                                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase">Datos Incompletos</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-6">
                    {selectedIngest ? (
                        <div className="glass p-6 sticky top-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-slate-800">Detalles de Ingesta</h2>
                                <button onClick={() => setSelectedIngest(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resumen del Parser</p>
                                    {selectedIngest.status === 'LINKED' || selectedIngest.status === 'PARSED' ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500 font-medium">Huésped:</span>
                                                <span className="text-slate-800 font-black">{selectedIngest.parsed_json.guest_name || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500 font-medium">Localizador:</span>
                                                <span className="text-slate-800 font-black">{selectedIngest.parsed_json.provider_reservation_id || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500 font-medium">Fechas:</span>
                                                <span className="text-slate-800 font-black">{selectedIngest.parsed_json.start_date} / {selectedIngest.parsed_json.end_date}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500 font-medium">Total:</span>
                                                <span className="text-indigo-600 font-black">{selectedIngest.parsed_json.total_price} {selectedIngest.parsed_json.currency}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">No se pudieron extraer datos estructurados.</p>
                                    )}
                                </div>

                                {selectedIngest.error_message && (
                                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertCircle size={14} />
                                            <p className="text-[10px] font-black uppercase tracking-wider">Error detectado</p>
                                        </div>
                                        <p className="text-xs font-bold leading-relaxed">{selectedIngest.error_message}</p>
                                    </div>
                                )}

                                {selectedIngest.parsed_json?.missing_fields?.length > 0 && (
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Info size={14} />
                                            <p className="text-[10px] font-black uppercase tracking-wider">Campos Faltantes</p>
                                        </div>
                                        <ul className="text-[10px] font-bold list-disc list-inside mt-2 space-y-1">
                                            {selectedIngest.parsed_json.missing_fields.map((f: string) => (
                                                <li key={f}>{f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenido del Correo</p>
                                    <div className="p-4 bg-white/50 border border-white/60 rounded-2xl max-h-60 overflow-y-auto custom-scrollbar">
                                        <pre className="text-[10px] font-mono whitespace-pre-wrap text-slate-600 leading-relaxed">
                                            {selectedIngest.body_text}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="glass p-8 flex flex-col items-center justify-center text-center text-slate-400 h-64 border-dashed">
                            <Eye size={32} className="opacity-20 mb-3" />
                            <p className="text-sm font-bold leading-tight">Selecciona una ingesta para ver los detalles del parsing.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helpfully added icons that were missing in import
const X = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const XCircle = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
