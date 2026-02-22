import React, { useState, useEffect } from 'react';
import { projectManager } from '../services/projectManager';
import { useNavigate } from 'react-router-dom';
import {
    Activity, ShieldCheck, AlertTriangle, Database,
    Save, Layout, CheckCircle2, XCircle, Search,
    RefreshCw, Info, Copy, ExternalLink, Clock, MapPin,
    Wrench, RotateCcw, AlertCircle
} from 'lucide-react';
import { APP_VERSION } from '../src/version';
import { toast } from 'sonner';
import { notifyDataChanged } from '../services/dataRefresher';

interface DiagResult {
    label: string;
    status: 'ok' | 'fail' | 'warn';
    msg: string;
}

export const Diagnostics: React.FC = () => {
    const navigate = useNavigate();
    const [projectId, setProjectId] = useState<string>('');
    const [storageMode, setStorageMode] = useState<string>('');
    const [tables, setTables] = useState<string[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [saveStatus, setSaveStatus] = useState<string>('');
    const [lastSave, setLastSave] = useState<number>(0);
    const [checks, setChecks] = useState<DiagResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [timezone, setTimezone] = useState<string>('');
    const [dashboardMetrics, setDashboardMetrics] = useState<Record<string, number>>({});
    const [useFallback, setUseFallback] = useState<boolean>(false);
    const [fixLogs, setFixLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setFixLogs(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const runDiagnostics = async () => {
        setLoading(true);
        const store = projectManager.getStore();
        const pm = projectManager as any;

        try {
            // 1. Basic Info
            const currentId = localStorage.getItem('rentik_last_project') || pm.currentProjectId || 'Unknown';
            setProjectId(currentId);
            setStorageMode(pm.storageMode || 'Unknown');
            setSaveStatus(pm.fileSaveState || 'idle');
            setLastSave(pm.lastSyncedAt || 0);

            const settings = await store.getSettings();
            setTimezone(settings.default_timezone || 'UTC');

            // 2. Database Tables
            const tableRows = await store.query("SELECT name FROM sqlite_master WHERE type='table'");
            const tableNames = tableRows.map((r: any) => r.name);
            setTables(tableNames);

            // 3. Counts
            const q = (table: string) => store.query(`SELECT COUNT(*) as c FROM ${table}`).then((r: any) => r[0]?.c || 0).catch(() => 0);
            const [bookingsCount, accounting, travelers, cleanings, messages, conversations] = await Promise.all([
                q('bookings'),
                q('accounting_movements'),
                q('travelers'),
                q('cleaning_tasks'),
                q('messages'),
                q('conversations')
            ]);

            const openConversations = await store.query("SELECT COUNT(*) as c FROM conversations WHERE status = 'open'").then((r: any) => r[0]?.c || 0).catch(() => 0);

            const newCounts = {
                bookings: bookingsCount,
                accounting_movements: accounting,
                travelers,
                cleaning_tasks: cleanings,
                messages,
                conversations_total: conversations,
                conversations_open: openConversations
            };
            setCounts(newCounts);

            // 4. Dashboard Metrics (Heuristics)
            const tz = settings.default_timezone || 'Europe/Madrid';
            const activePropId = projectManager.getActivePropertyId();

            let arrivals = 0, departures = 0, active = 0, pending = 0, upcoming = 0;
            let fallback = false;

            try {
                const arrList = await store.getUpcomingArrivals(0, activePropId, tz);
                arrivals = arrList.length;
                const depList = await store.query("SELECT COUNT(*) as c FROM bookings WHERE check_out = ?", [new Date().toLocaleDateString('en-CA')]).then((r: any) => r[0]?.c || 0);
                departures = depList;
                // Simplified active count for diag
                active = await store.query("SELECT COUNT(*) as c FROM bookings WHERE check_in <= ? AND check_out > ?", [new Date().toLocaleDateString('en-CA'), new Date().toLocaleDateString('en-CA')]).then((r: any) => r[0]?.c || 0);

                const pendList = await store.getPendingCheckins(1, activePropId, tz);
                pending = pendList.length;

                const upList = await store.getUpcomingArrivals(7, activePropId, tz);
                upcoming = upList.length;

                if (accounting === 0 && bookingsCount > 0) fallback = true;
            } catch (err) {
                console.warn("Heuristics failed", err);
            }

            setDashboardMetrics({ arrivals, departures, active, pending, upcoming });
            setUseFallback(fallback);

            // 5. Heuristic Checks
            const newChecks: DiagResult[] = [];

            // Metrics Coherence
            if (fallback) {
                newChecks.push({
                    label: 'Coherencia de Métricas',
                    status: 'warn',
                    msg: 'Contabilidad vacía con reservas existentes. Modo fallback activo.'
                });
            } else if (bookingsCount > 0 && isNaN(arrivals)) {
                newChecks.push({ label: 'Coherencia de Métricas', status: 'fail', msg: 'Error de cálculo en llegadas (NaN).' });
            } else {
                newChecks.push({
                    label: 'Coherencia de Métricas',
                    status: 'ok',
                    msg: 'Datos de reservas y contabilidad sincronizados.'
                });
            }

            // Check specific tables
            const requiredTables = ['bookings', 'accounting_movements', 'media_assets', 'conversations', 'cleaning_tasks'];
            requiredTables.forEach(t => {
                if (tableNames.includes(t)) {
                    newChecks.push({ label: `Tabla: ${t}`, status: 'ok', msg: `Presente en el esquema.` });
                } else {
                    newChecks.push({ label: `Tabla: ${t}`, status: 'fail', msg: `Falta en el esquema. Requiere migración.` });
                }
            });

            // Saving stuck
            if (pm.storageMode === 'file' && pm.isSavingToFile) {
                const savingDuration = Date.now() - (pm.lastSyncedAt || Date.now());
                if (savingDuration > 15000) {
                    newChecks.push({ label: 'Estado Guardado', status: 'fail', msg: 'Posible bloqueo: guardado dura > 15s.' });
                } else {
                    newChecks.push({ label: 'Estado Guardado', status: 'warn', msg: 'Operación de guardado en curso...' });
                }
            } else if (pm.storageMode === 'file') {
                newChecks.push({ label: 'Estado Guardado', status: 'ok', msg: 'Sistema de persistencia en reposo.' });
            }

            setChecks(newChecks);
        } catch (err) {
            console.error("Diag failed:", err);
            addLog("Error en ejecución de diagnósticos: " + (err as any).message);
        } finally {
            setLoading(false);
        }
    };

    const copyReport = () => {
        const report = {
            timestamp: new Date().toISOString(),
            app_version: APP_VERSION,
            project_id: projectId,
            storage_mode: storageMode,
            timezone,
            counts,
            metrics: dashboardMetrics,
            checks,
            tables,
            fix_logs: fixLogs
        };
        navigator.clipboard.writeText(JSON.stringify(report, null, 2));
        toast.success("Informe copiado al portapapeles");
    };

    // --- AUTO-FIX ACTIONS ---

    const fixMediaAssets = async () => {
        if (!confirm("Esto creará la tabla 'media_assets' si falta. ¿Continuar?")) return;
        try {
            const store = projectManager.getStore();
            await store.execute(`
        CREATE TABLE IF NOT EXISTS media_assets (
          id TEXT PRIMARY KEY,
          site_id TEXT,
          filename TEXT,
          mime_type TEXT,
          size INTEGER,
          data_base64 TEXT,
          width INTEGER,
          height INTEGER,
          created_at INTEGER
        )
      `);
            addLog("Auto-Fix: Tabla media_assets creada/verificada.");
            toast.success("Esquema corregido");
            runDiagnostics();
        } catch (e) {
            addLog("Auto-Fix Fallido: " + (e as any).message);
            toast.error("Error al corregir esquema");
        }
    };

    const fixSavingStuck = () => {
        if (!confirm("Esto reseteará el estado de guardado interno. ¿Continuar?")) return;
        try {
            if ((projectManager as any).forceResetSavingState) {
                (projectManager as any).forceResetSavingState();
                addLog("Auto-Fix: Estado de guardado reseteado manualmente.");
                toast.success("Estado de guardado reseteado");
                runDiagnostics();
            } else {
                toast.error("Función no disponible en esta versión");
            }
        } catch (e) {
            toast.error("Error al resetear estado");
        }
    };

    const rebuildCache = () => {
        addLog("Auto-Fix: Notificando cambio global de datos (rebuild).");
        notifyDataChanged('all');
        runDiagnostics();
        toast.success("Caché invalidada y refrescada");
    };

    const showBlockingReason = () => {
        const pm = projectManager as any;
        let reason = "Contexto actual OK.";
        if (!pm.currentProjectId) reason = "BLOQUEO: No hay project_id activo en ProjectManager.";
        else if (!pm.store?.initialized) reason = "BLOQUEO: El almacén de datos (Store) no está inicializado.";

        addLog("Diagnóstico Nav: " + reason);
        alert(reason);
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-200">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">Centro de Diagnósticos</h2>
                        <p className="text-slate-500 font-medium">Validación de runtime, integridad de DB y Auto-Fix PRO.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={copyReport}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-xl shadow-slate-200"
                    >
                        <Copy size={16} /> Copiar Informe
                    </button>
                    <button
                        onClick={runDiagnostics}
                        className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all hover:rotate-180 duration-500"
                    >
                        <RefreshCw size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DiagCard title="Project ID" value={projectId} icon={Search} color="text-indigo-600" />
                <DiagCard title="Contexto" value={`${storageMode.toUpperCase()} | v${APP_VERSION}`} icon={Database} color="text-blue-600" />
                <DiagCard title="Estado Auto-save" value={saveStatus.toUpperCase()} icon={Save} color={saveStatus === 'error' ? 'text-rose-600' : 'text-emerald-600'} />
                <DiagCard title="Zona Horaria" value={timezone} icon={MapPin} color="text-amber-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">

                    <Section title="Auto-Fix (Acciones Seguras)" icon={Wrench}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FixButton
                                label="Reparar Esquema DB"
                                desc="Crea tablas faltantes (media_assets)"
                                onClick={fixMediaAssets}
                            />
                            <FixButton
                                label="Resetear Guardado"
                                desc="Desbloquea 'Guardando...' infinito"
                                onClick={fixSavingStuck}
                                disabled={!(projectManager as any).isSavingToFile}
                            />
                            <FixButton
                                label="Refrescar Caché"
                                desc="Recalcula índices y vista Dashboard"
                                onClick={rebuildCache}
                            />
                            <FixButton
                                label="Analizar Bloqueos"
                                desc="Detecta por qué fallan navegaciones"
                                onClick={showBlockingReason}
                            />
                        </div>
                        {fixLogs.length > 0 && (
                            <div className="mt-6 p-4 bg-slate-900 rounded-2xl font-mono text-[10px] text-indigo-300">
                                {fixLogs.map((log, i) => (
                                    <div key={i} className="mb-1">{log}</div>
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section title="Dashboard Coherence" icon={Activity}>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <MetricBox label="Llegadas Hoy" value={dashboardMetrics.arrivals || 0} />
                            <MetricBox label="Salidas Hoy" value={dashboardMetrics.departures || 0} />
                            <MetricBox label="Activos Hoy" value={dashboardMetrics.active || 0} />
                            <MetricBox label="Checkins H+M" value={dashboardMetrics.pending || 0} />
                            <MetricBox label="Arrivals 7D" value={dashboardMetrics.upcoming || 0} />
                        </div>
                        <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <Info size={16} className="text-slate-400" />
                                <p className="text-xs font-bold text-slate-600">Origen de Datos actual:</p>
                            </div>
                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${useFallback ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {useFallback ? 'Bookings Fallback' : 'Accounting movements'}
                            </span>
                        </div>
                    </Section>

                    <Section title="Database Integrity" icon={Database}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <DataCounter label="Reservas" count={counts.bookings} />
                                <DataCounter label="Movimientos" count={counts.accounting_movements} />
                                <DataCounter label="Viajeros" count={counts.travelers} />
                                <DataCounter label="Limpiezas" count={counts.cleaning_tasks} />
                                <DataCounter label="Conversaciones" count={counts.conversations_total} sub={`${counts.conversations_open} open`} />
                                <DataCounter label="Mensajes" count={counts.messages} />
                            </div>
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                {checks.map((c, i) => (
                                    <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between ${c.status === 'ok' ? 'bg-emerald-50 border-emerald-100' :
                                            c.status === 'warn' ? 'bg-amber-50 border-amber-100' :
                                                'bg-rose-50 border-rose-100'
                                        }`}>
                                        <div className="flex items-center gap-3">
                                            {c.status === 'ok' ? <CheckCircle2 className="text-emerald-600" /> :
                                                c.status === 'warn' ? <AlertTriangle className="text-amber-600" /> :
                                                    <XCircle className="text-rose-600" />}
                                            <div>
                                                <p className="font-black text-slate-800 text-sm">{c.label}</p>
                                                <p className="text-xs text-slate-500">{c.msg}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                </div>

                <div className="space-y-8">
                    <Section title="Navigation Tests" icon={ExternalLink}>
                        <div className="space-y-3">
                            <NavButton label="Inbox / Buzón" target="/buzon" onClick={() => navigate('/buzon')} />
                            <NavButton label="Check-ins" target="/checkins" onClick={() => navigate('/checkins')} />
                            <NavButton label="Calendario" target="/calendario" onClick={() => navigate('/calendario')} />
                        </div>
                    </Section>

                    <Section title="Schema Structure" icon={Layout}>
                        <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {tables.map(t => (
                                <span key={t} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </Section>

                    {lastSave > 0 && (
                        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200">
                            <Clock size={32} className="mb-4 opacity-50" />
                            <h3 className="text-xl font-black mb-1">Última Sincronización</h3>
                            <p className="text-sm text-emerald-100 font-medium mb-4">
                                {new Date(lastSave).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-emerald-700 w-fit px-3 py-1 rounded-full">
                                <CheckCircle2 size={12} /> Persistencia OK
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DiagCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: string }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-2">
        <div className={`p-3 bg-slate-50 rounded-xl w-fit ${color}`}><Icon size={20} /></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-lg font-black text-slate-800 truncate">{value.length > 20 ? value.substring(0, 20) + '...' : value}</p>
    </div>
);

const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 rounded-xl"><Icon size={20} /></div>
            {title}
        </h3>
        {children}
    </div>
);

const MetricBox = ({ label, value }: { label: string, value: number }) => (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-xl font-black ${isNaN(value) ? 'text-rose-500' : 'text-slate-800'}`}>
            {isNaN(value) ? 'ERR' : value}
        </p>
    </div>
);

const DataCounter = ({ label, count, sub }: { label: string, count: number, sub?: string }) => (
    <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-slate-800">{count}</p>
        {sub && <p className="text-[9px] text-indigo-500 font-bold">{sub}</p>}
    </div>
);

const NavButton = ({ label, target, onClick }: { label: string, target: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-2xl transition-all group"
    >
        <div className="text-left">
            <p className="text-sm font-black text-slate-800">{label}</p>
            <p className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-400">{target}</p>
        </div>
        <ExternalLink size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
    </button>
);

const FixButton = ({ label, desc, onClick, disabled }: { label: string, desc: string, onClick: () => void, disabled?: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${disabled ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-50 active:scale-95'
            }`}
    >
        <div className={`p-3 rounded-xl transition-colors ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
            <RotateCcw size={20} />
        </div>
        <div>
            <p className="text-sm font-black text-slate-800">{label}</p>
            <p className="text-[10px] text-slate-400 font-medium">{desc}</p>
        </div>
    </button>
);
