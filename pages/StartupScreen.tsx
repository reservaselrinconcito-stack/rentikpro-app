import React, { useState, useEffect, useRef } from 'react';
import { Play, FilePlus, Upload, ShieldCheck, Gamepad2, ArrowRight, Loader2, CheckCircle, AlertCircle, Database, FolderOpen, FileText, Download, RefreshCw, Globe } from 'lucide-react';
import { APP_VERSION } from '../src/version';
import { projectManager } from '../services/projectManager';
import { projectPersistence, ProjectMetadata } from '../services/projectPersistence'; // Import persistence
import { notifyDataChanged } from '../services/dataRefresher';
import { createProject, openProject, pickProjectFolder, getLastOpenedProjectPath, validateProject } from '../services/projectFolderManager';
import { isTauri as isTauriRuntime } from '../utils/isTauri';
import { workspaceManager } from '../services/workspaceManager';
import { toast } from 'sonner';
import { getWorkspaceBootState, setWorkspaceBootState } from "../services/workspaceBootState";
import { chooseFolder, switchWorkspace, openWorkspaceFolder, isICloudWorkspace, openICloudDriveFolder } from "../services/workspaceInfo";
import { exists } from "@tauri-apps/plugin-fs";
import { waitForPathToExist } from '../src/services/workspaceManager';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function waitForExists(path: string, totalMs: number) {
    const start = Date.now();
    while (Date.now() - start < totalMs) {
        try { if (await exists(path)) return true; } catch { }
        await sleep(500);
    }
    return false;
}

const joinPath = async (a: string, b: string): Promise<string> => {
    try {
        const mod = await import('@tauri-apps/api/path');
        return await mod.join(a, b);
    } catch {
        // Fallback for non-Tauri/web. (Not used in web flow.)
        return a.replace(/\/+$/, '') + '/' + b;
    }
};

const StartupScreenTauri = ({ onOpen }: { onOpen: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [loadingLog, setLoadingLog] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [workspacePath, setWorkspacePath] = useState<string | null>(() => workspaceManager.getWorkspacePath());
    const mountedRef = useRef(true);

    // MISSING state is handled by the parent StartupScreen component.
    // If we reach here, boot state is NOT "MISSING".

    // Clear any stale boot error flag on mount.
    useEffect(() => {
        try { localStorage.removeItem('rp_workspace_boot_error'); } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const formatWorkspaceError = (e: any): string => {
        const msg = e?.message || String(e);
        if (msg.includes('Workspace folder does not exist')) {
            return 'Workspace no disponible: la carpeta no existe (puede haberse movido o iCloud aun no la ha descargado).';
        }
        if (msg.includes("Missing database.sqlite")) {
            return "Workspace no disponible: falta 'database.sqlite' en la carpeta.";
        }
        return msg;
    };

    const doOpenAndLoad = async (path: string) => {
        const res = await workspaceManager.openWorkspace(path);
        let meta: any = {};
        try { meta = JSON.parse(res.workspaceJson || '{}'); } catch { meta = {}; }
        const projectId = (meta?.id || 'workspace').toString();
        const name = (meta?.name || workspaceManager.getWorkspaceDisplayName()).toString();

        localStorage.setItem('rp_workspace_project_id', projectId);
        localStorage.setItem('rp_workspace_name', name);

        await projectManager.loadProjectFromSqliteBytes(res.dbBytes, {
            projectId,
            name,
            mode: 'real',
            setAsActive: false,
            startAutoSave: true,
            persistToIdb: false,
        });
    };

    const openAndLoad = async (path: string, opts?: { toastOnError?: boolean }) => {
        if (mountedRef.current) {
            setLoading(true);
            setError(null);
            setLoadingLog('Abriendo workspace...');
        }
        try {
            await doOpenAndLoad(path);
            notifyDataChanged('all');
            onOpen();
        } catch (e: any) {
            const msg = formatWorkspaceError(e);
            if (mountedRef.current) setError(msg);
            if (opts?.toastOnError !== false) toast.error(msg);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const retryOpenWorkspace = async () => {
        const p = workspaceManager.getWorkspacePath();
        if (!p) return;
        setLoading(true);
        setError(null);
        let lastErr: any = null;
        const tries = 12;
        for (let i = 0; i < tries; i++) {
            if (!mountedRef.current) return;
            setLoadingLog(`Reintentando workspace... (${i + 1}/${tries})`);
            try {
                // If the folder is missing (moved/iCloud lazy), wait a bit before attempting open.
                const existsNow = await waitForPathToExist(p, { retries: 1, delayMs: 1 });
                if (!existsNow) {
                    await new Promise(r => setTimeout(r, 400));
                    continue;
                }
                await doOpenAndLoad(p);
                notifyDataChanged('all');
                onOpen();
                return;
            } catch (e: any) {
                lastErr = e;
                await new Promise(r => setTimeout(r, 400));
            }
        }

        const msg = formatWorkspaceError(lastErr);
        if (mountedRef.current) setError(msg);
        toast.error(msg);
        if (mountedRef.current) setLoading(false);
    };

    useEffect(() => {
        if (!workspacePath) return;
        openAndLoad(workspacePath);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pickWorkspaceFolder = async () => {
        try {
            const dialog = await import('@tauri-apps/plugin-dialog');
            const picked = await dialog.open({
                directory: true,
                multiple: false,
                title: 'Elegir carpeta de trabajo',
            });
            if (!picked) return null;
            if (Array.isArray(picked)) return picked[0] || null;
            return picked;
        } catch (e: any) {
            throw new Error(e?.message || 'No se pudo abrir el selector de carpetas');
        }
    };

    const chooseWorkspace = async (opts: { openAfterSetup: boolean }): Promise<string | null> => {
        try {
            if (mountedRef.current) setError(null);
            const picked = await pickWorkspaceFolder();
            if (!picked) return;
            if (mountedRef.current) {
                setWorkspacePath(picked);
                setLoading(true);
                setLoadingLog('Preparando workspace...');
            }
            await workspaceManager.setupWorkspace(picked);
            toast.success('Workspace listo');
            if (opts.openAfterSetup) {
                await openAndLoad(picked);
            }
            return picked;
        } catch (e: any) {
            const msg = e?.message || String(e);
            if (mountedRef.current) setError(msg);
            toast.error(msg);
            return null;
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const handleChooseWorkspace = async () => {
        await chooseWorkspace({ openAfterSetup: true });
    };

    const handleRestoreExternal = async (file: File) => {
        try {
            const currentPath = workspaceManager.getWorkspacePath();
            if (!currentPath) {
                // Pick/setup workspace but DO NOT open yet (avoid unmount mid-restore).
                const picked = await chooseWorkspace({ openAfterSetup: false });
                if (!picked) return;
            }
            const wsPath = workspaceManager.getWorkspacePath();
            if (!wsPath) return;

            if (!confirm('ADVERTENCIA: Restaurar un backup SOBREESCRIBIRA todos los datos del workspace actual. ¿Continuar?')) {
                return;
            }

            if (mountedRef.current) {
                setLoading(true);
                setError(null);
                setLoadingLog('Importando backup externo...');
            }

            let dbBytes: Uint8Array;
            if (file.name.endsWith('.sqlite')) {
                const buf = await file.arrayBuffer();
                dbBytes = new Uint8Array(buf);
                await workspaceManager.saveCurrentWorkspace(dbBytes);
            } else if (file.name.endsWith('.zip') || file.name.endsWith('.rentikpro')) {
                dbBytes = await workspaceManager.importExternalBackupZip(file);
            } else {
                throw new Error('Formato no soportado. Usa .rentikpro, .zip o .sqlite');
            }

            if (mountedRef.current) setLoadingLog('Cargando base de datos restaurada...');
            const projectId = localStorage.getItem('rp_workspace_project_id') || 'workspace';
            const name = localStorage.getItem('rp_workspace_name') || workspaceManager.getWorkspaceDisplayName();
            await projectManager.loadProjectFromSqliteBytes(dbBytes, {
                projectId,
                name,
                mode: 'real',
                setAsActive: false,
                startAutoSave: true,
                persistToIdb: false,
            });

            toast.success('Backup restaurado en el workspace');
            notifyDataChanged('all');
            onOpen();
        } catch (e: any) {
            const msg = e?.message || String(e);
            if (mountedRef.current) setError(msg);
            toast.error(msg);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 w-full">
                <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-400/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="w-16 h-16 bg-indigo-600 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden animate-pulse">
                            <img src="/logo.png" alt="Loading..." className="w-12 h-12 object-contain" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-slate-800 font-black text-xl tracking-tight">{loadingLog || 'Cargando...'}</p>
                        <p className="text-slate-500 text-sm mt-2">Workspace: {workspaceManager.getWorkspaceDisplayName()}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center p-6 w-full">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto bg-rose-100 text-rose-600">
                        <AlertCircle size={40} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Workspace no disponible</h2>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">{error}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                        <button
                            onClick={retryOpenWorkspace}
                            className="w-full py-4 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} /> Reintentar
                        </button>

                        <button
                            onClick={handleChooseWorkspace}
                            className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                        >
                            <FolderOpen size={18} /> Elegir carpeta de trabajo
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    await openICloudDriveFolder();
                                } catch (e: any) {
                                    console.error('[StartupScreen] openICloudDriveFolder failed', e);
                                    toast.error(e?.message || String(e));
                                }
                            }}
                            className="w-full py-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <FolderOpen size={18} /> Abrir iCloud Drive
                        </button>

                        <div className="relative">
                            <button
                                className="w-full py-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Upload size={18} /> Restaurar backup externo
                            </button>
                            <input
                                type="file"
                                accept=".rentikpro,.zip,.sqlite"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = '';
                                    if (!f) return;
                                    await handleRestoreExternal(f);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Welcome state
    return (
        <div className="flex items-center justify-center p-6 w-full">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto bg-indigo-600 shadow-xl shadow-indigo-200 overflow-hidden">
                    <img src="/logo.png" alt="Welcome" className="w-14 h-14 object-contain" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bienvenido</h2>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">Elige una carpeta para tu workspace. Dentro se guardaran: database.sqlite, settings, media y backups.</p>
                </div>

                <button
                    onClick={handleChooseWorkspace}
                    className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                    <FolderOpen size={18} /> Elegir carpeta de trabajo
                </button>

                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Single Workspace (Tauri)</div>
            </div>
        </div>
    );
};

const StartupScreenLegacy = ({ onOpen }: { onOpen: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [recentProjects, setRecentProjects] = useState<ProjectMetadata[]>([]);
    const [supportsFile] = useState(() =>
        typeof window !== 'undefined' &&
        typeof (window as any).showOpenFilePicker === 'function' &&
        typeof (window as any).showSaveFilePicker === 'function'
    );

    const isTauri = isTauriRuntime();
    const lastProjectPath = getLastOpenedProjectPath();

    // Fix for missing definitions
    const legacyProjects: any[] = [];
    const handleExportLegacy = (id: string) => console.log('Export legacy', id);
    const handleMigrateLegacy = (id: string) => console.log('Migrate legacy', id);

    useEffect(() => {
        loadRecent();
    }, []);

    const loadRecent = async () => {
        try {
            const projects = await projectPersistence.listProjects();
            // Filter out demo project from "recent real projects" list if we want to treat it distinct
            // But maybe good to show it too. Let's show all for now, or maybe emphasize the top one.
            setRecentProjects(projects);
        } catch (e) {
            console.error("Failed to list projects", e);
        }
    };

    const [loadingLog, setLoadingLog] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [loadingTimer, setLoadingTimer] = useState<number>(0);
    const [lastAction, setLastAction] = useState<(() => Promise<void>) | null>(null);

    useEffect(() => {
        let interval: any;
        if (loading) {
            setLoadingTimer(0);
            interval = setInterval(() => {
                setLoadingTimer(t => t + 1);
            }, 1000);
        } else {
            setLoadingTimer(0);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const wrapAction = async (name: string, action: () => Promise<void>) => {
        setLoading(true);
        setError(null);
        setLoadingLog(name + "...");
        setLastAction(() => action);

        try {
            await action();
            // Success: notify and finish
            notifyDataChanged();
            onOpen();
        } catch (err: any) {
            console.error(`[Startup] ${name} failed:`, err);
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditor = () => wrapAction("Iniciando Editor", async () => {
        if (!projectManager.isProjectLoaded()) {
            await projectManager.createDemoProject((msg) => setLoadingLog(msg));
        }
        sessionStorage.setItem('pendingNavigation', '/website-builder');
    });

    const handleCreate = () => wrapAction("Creando proyecto nuevo", async () => {
        setLoadingLog("Inicializando base de datos...");
        const success = await projectManager.createBlankProject();
        if (!success) throw new Error("No se pudo crear el proyecto.");
    });

    const handleDemo = () => wrapAction("Preparando demo", async () => {
        const success = await projectManager.createDemoProject((msg) => {
            setLoadingLog(msg);
        });
        if (!success) throw new Error("Error al generar datos demo.");
    });

    const handleResetEnvironment = async () => {
        setLoadingLog("Limpiando entorno...");
        localStorage.removeItem('active_project_id');
        localStorage.removeItem('active_project_mode');
        setError(null);
        setLoading(false);
        setLastAction(null);
    };

    const handleClearDemoCache = async () => {
        setLoadingLog("Borrando caché demo...");
        try {
            await projectPersistence.deleteProject('demo_project');
            await handleDemo();
        } catch (e: any) {
            setError("Error borrando caché: " + e.message);
        }
    };

    const handleOpenRecent = (id: string) => wrapAction("Cargando proyecto", async () => {
        const success = await projectManager.loadProject(id);
        if (!success) throw new Error("No se pudo cargar el proyecto seleccionado.");
    });

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.sqlite';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                wrapAction("Importando archivo", async () => {
                    await projectManager.importProjectFromFile(file);
                });
            }
        };
        input.click();
    };

    const handleOpenFile = () => wrapAction("Abriendo proyecto desde archivo", async () => {
        await projectManager.openProjectFromFile();
    });

    const handleNewFile = () => wrapAction("Creando proyecto en archivo", async () => {
        await projectManager.createNewProjectFileAndInit('rentikpro.rentikpro');
    });

    const handleCreateFolderProject = () => wrapAction('Creando proyecto (carpeta)', async () => {
        const parent = await pickProjectFolder();
        if (!parent) return;

        // Desktop: create a new project folder inside the chosen parent.
        // This avoids relying on the OS picker to create new folders.
        const name = `Proyecto ${new Date().toLocaleDateString()}`;
        const safeName = name.replace(/[\\/:*?"<>|]/g, '-').trim();
        const projectFolder = await joinPath(parent, safeName);

        try {
            const fs = await import('@tauri-apps/plugin-fs');
            // v2 plugin uses mkdir
            await (fs as any).mkdir(projectFolder, { recursive: true });
        } catch {
            // If it already exists, write_project_folder will fail gracefully.
        }

        await createProject(projectFolder, { name });
    });

    const handleOpenFolderProject = () => wrapAction('Abriendo proyecto (carpeta)', async () => {
        const folder = await pickProjectFolder();
        if (!folder) return;
        const v = await validateProject(folder);
        if (!v.ok) throw new Error(v.error || 'Carpeta de proyecto inválida');
        await openProject(folder);
    });

    const handleOpenLastFolderProject = () => wrapAction('Abriendo último proyecto', async () => {
        if (!lastProjectPath) throw new Error('No hay último proyecto guardado');
        const v = await validateProject(lastProjectPath);
        if (!v.ok) throw new Error(v.error || 'Carpeta de proyecto inválida');
        await openProject(lastProjectPath);
    });

    if (loading || error) {
        const isTimeout = loadingTimer > 12; // 12s threshold
        const showRecovery = error || isTimeout;

        if (showRecovery) {
            return (
                <div className="flex items-center justify-center p-6 w-full">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto ${error ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                            {error ? <ShieldCheck size={40} /> : <Loader2 size={40} className="animate-spin" />}
                        </div>

                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                {error ? "Vaya, algo ha fallado" : "Está tardando más de lo normal"}
                            </h2>
                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                                {error
                                    ? `Error: ${error}`
                                    : "El proceso de inicialización parece haberse detenido. Puedes intentar recuperar el sistema a continuación."}
                            </p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                <span>Registro de pasos</span>
                                <span>{loadingTimer}s</span>
                            </div>
                            <div className="text-xs text-indigo-600 font-bold bg-white p-3 rounded-xl border border-indigo-50 shadow-sm text-left flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                {loadingLog || "Iniciando..."}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                            {lastAction && (
                                <button
                                    onClick={() => lastAction()}
                                    className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                                >
                                    <Play size={18} fill="currentColor" /> Reintentar Acción
                                </button>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleResetEnvironment}
                                    className="py-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-bold text-xs transition-all"
                                >
                                    Reset Entorno
                                </button>
                                <button
                                    onClick={handleClearDemoCache}
                                    className="py-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-bold text-xs transition-all"
                                >
                                    Limpiar Demo
                                </button>
                            </div>
                            <button
                                onClick={() => { setLoading(false); setError(null); }}
                                className="py-2 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest"
                            >
                                Cancelar y volver
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-center py-20 w-full">
                <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-400/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="w-16 h-16 bg-indigo-600 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden animate-pulse">
                            <img src="/logo.png" alt="Loading..." className="w-12 h-12 object-contain" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-slate-800 font-black text-xl tracking-tight">{loadingLog || "Cargando..."}</p>
                        <p className="text-slate-400 text-xs mt-1 font-bold uppercase tracking-widest animate-pulse">
                            Paso actual • {loadingTimer}s
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Find the most recent "real" project to suggest continuing
    const lastRealProject = recentProjects.find(p => p.mode === 'real');
    const activeId = localStorage.getItem('active_project_id');

    return (
        <div className="flex items-center justify-center p-2 select-none animate-in fade-in duration-500 w-full">
            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-0 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">

                {/* Left Side: Brand & Welcome */}
                <div className="bg-indigo-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 L100 0 L100 100 Z" fill="currentColor" />
                        </svg>
                    </div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-6 overflow-hidden border border-white/30 shadow-xl">
                            <img src="/logo.png" alt="RentikPro" className="w-12 h-12 object-contain" />
                        </div>
                        <h1 className="text-4xl font-black mb-2 tracking-tight">RentikPro</h1>
                        <p className="text-indigo-100 text-lg font-medium">Gestión profesional de alquiler vacacional.</p>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/10 rounded-lg"><Upload size={18} /></div>
                            <div>
                                <h3 className="font-semibold">Local & Privado</h3>
                                <p className="text-sm text-indigo-200">Tus datos nunca salen de tu dispositivo.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/10 rounded-lg"><Gamepad2 size={18} /></div>
                            <div>
                                <h3 className="font-semibold">Modo Demo</h3>
                                <p className="text-sm text-indigo-200">Prueba todas las funcionalidades sin miedo.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 text-xs text-indigo-300">
                        v{(import.meta as any).env?.VITE_APP_VERSION || '0.1.0'} • Build {(import.meta as any).env?.VITE_BUILD_TIME ? new Date((import.meta as any).env?.VITE_BUILD_TIME).toLocaleDateString() : 'Dev'}
                    </div>
                </div>

                {/* Right Side: Actions */}
                <div className="p-12 flex flex-col justify-center space-y-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Bienvenido</h2>
                        <p className="text-slate-500 text-sm">Selecciona cómo quieres empezar hoy.</p>
                    </div>

                    {!isTauri && (
                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Descargar Aplicación Escritorio</p>

                            {/* macOS Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <a
                                    href="https://github.com/reservaselrinconcito-stack/rentikpro-app/releases/latest/download/RentikPro-mac-arm64.dmg"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                >
                                    <Download size={14} /> Mac Apple Silicon (M1/M2/M3)
                                </a>
                                <a
                                    href="https://github.com/reservaselrinconcito-stack/rentikpro-app/releases/latest/download/RentikPro-mac-x64.dmg"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <Download size={14} /> Mac Intel
                                </a>
                            </div>

                            {/* Windows Section */}
                            <a
                                href="https://github.com/reservaselrinconcito-stack/rentikpro-app/releases/latest/download/RentikPro-win.exe"
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                <Download size={14} /> Descargar para Windows (.exe)
                            </a>

                            <div className="text-[9px] text-slate-400 font-bold mt-2 px-1">
                                Para la mejor experiencia (offline y gestión de archivos), recomendamos la versión instalable.
                            </div>
                        </div>
                    )}

                    {isTauri && (
                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proyecto (carpeta)</p>
                                    {lastProjectPath ? (
                                        <p className="mt-2 text-xs font-mono text-slate-500 truncate">{lastProjectPath}</p>
                                    ) : (
                                        <p className="mt-2 text-xs font-bold text-slate-400">Sin proyecto reciente</p>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {lastProjectPath && (
                                        <button
                                            onClick={handleOpenLastFolderProject}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700"
                                        >
                                            Abrir último
                                        </button>
                                    )}
                                    <button
                                        onClick={handleOpenFolderProject}
                                        className="px-4 py-2 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                                    >
                                        Abrir carpeta
                                    </button>
                                    <button
                                        onClick={handleCreateFolderProject}
                                        className="px-4 py-2 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                                    >
                                        Crear carpeta
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {isTauri && legacyProjects.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-3xl p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Datos antiguos detectados</p>
                                <p className="text-xs text-slate-500 font-bold mt-2">
                                    Proyectos guardados en IndexedDB (legacy). Recomendado: exportar backup y migrar a carpeta.
                                </p>

                                <div className="mt-4 space-y-2">
                                    {legacyProjects.slice(0, 4).map(p => (
                                        <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-800 truncate">{p.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 truncate">{new Date(p.lastModified).toLocaleString()}</p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleExportLegacy(p.id)}
                                                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                >
                                                    Exportar backup
                                                </button>
                                                <button
                                                    onClick={() => handleMigrateLegacy(p.id)}
                                                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-indigo-600 text-white hover:bg-indigo-700"
                                                >
                                                    Migrar a carpeta
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {lastRealProject && (
                            <button onClick={() => handleOpenRecent(lastRealProject.id)} className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 hover:border-indigo-300 transition-all group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm group-hover:scale-110 transition-transform">
                                        <Play size={20} fill="currentColor" />
                                    </div>
                                    <div className="text-left flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-indigo-900 truncate">Continuar Proyecto</h3>
                                            {lastRealProject.id === activeId && (
                                                <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[7px] font-black uppercase tracking-widest rounded">Último activo</span>
                                            )}
                                            {((lastRealProject.bookingsCount || 0) === 0 && (lastRealProject.accountingCount || 0) === 0) ? (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[8px] font-black uppercase tracking-widest border border-amber-200">
                                                    <AlertCircle size={8} /> Vacío
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[8px] font-black uppercase tracking-widest border border-emerald-200">
                                                    <CheckCircle size={8} /> {lastRealProject.bookingsCount || 0} resv • {lastRealProject.accountingCount || 0} mov
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-indigo-600 truncate max-w-[180px]">{lastRealProject.name}</p>
                                    </div>
                                </div>
                                <ArrowRight size={18} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

                        <button onClick={handleOpenEditor} className="w-full flex items-center justify-between p-4 bg-indigo-600/5 border border-indigo-600/20 rounded-xl hover:bg-indigo-600/10 hover:border-indigo-600/30 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                                    <Globe size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-indigo-900">Editor web</h3>
                                    <p className="text-xs text-indigo-600/70 font-medium">Configura y publica tu sitio</p>
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="h-px bg-slate-100 my-4" />

                        <button onClick={handleCreate} className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <FilePlus size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800">Nuevo Proyecto</h3>
                                    <p className="text-xs text-slate-500">Base de datos vacía</p>
                                </div>
                            </div>
                        </button>

                        <button onClick={handleDemo} className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-500 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                    <Gamepad2 size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800">Ver Demo</h3>
                                    <p className="text-xs text-slate-500">Datos de prueba generados</p>
                                </div>
                            </div>
                        </button>

                        <button onClick={handleImport} className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <Upload size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800">Importar</h3>
                                    <p className="text-xs text-slate-500">Desde archivo .sqlite</p>
                                </div>
                            </div>
                        </button>

                        {/* ── File System Access API (Chrome/Edge only) ── */}
                        <div className="h-px bg-slate-100 my-1" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1"
                            title={supportsFile ? '' : 'Solo disponible en Chrome / Edge'}>
                            Modo Escritorio {!supportsFile && <span className="text-amber-500">· No disponible en este navegador</span>}
                        </p>

                        <button
                            onClick={supportsFile ? handleOpenFile : undefined}
                            disabled={!supportsFile}
                            title={supportsFile ? 'Abre un archivo .rentikpro desde disco' : 'Disponible en Chrome / Edge'}
                            className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all group ${supportsFile
                                ? 'bg-white border-slate-200 hover:border-sky-500 hover:shadow-md cursor-pointer'
                                : 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${supportsFile ? 'bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    <FolderOpen size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800">Abrir proyecto (archivo)</h3>
                                    <p className="text-xs text-slate-500">Abre .rentikpro desde disco</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={supportsFile ? handleNewFile : undefined}
                            disabled={!supportsFile}
                            title={supportsFile ? 'Crea un nuevo proyecto guardado como archivo' : 'Disponible en Chrome / Edge'}
                            className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all group ${supportsFile
                                ? 'bg-white border-slate-200 hover:border-violet-500 hover:shadow-md cursor-pointer'
                                : 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${supportsFile ? 'bg-violet-50 text-violet-600 group-hover:bg-violet-500 group-hover:text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    <FileText size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800">Nuevo proyecto (archivo)</h3>
                                    <p className="text-xs text-slate-500">Guarda en disco directamente</p>
                                </div>
                            </div>
                        </button>

                        {recentProjects.length > 1 && (
                            <div className="pt-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Otros Proyectos Guardados</p>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {recentProjects.filter(p => !lastRealProject || p.id !== lastRealProject.id).map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleOpenRecent(p.id)}
                                            className={`w-full flex items-center justify-between p-3 border rounded-xl hover:border-indigo-200 transition-all group shadow-sm ${p.id === activeId ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <Database size={16} className={`${p.id === activeId ? 'text-indigo-600' : 'text-slate-400'} group-hover:text-indigo-500`} />
                                                <div className="text-left overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`text-xs font-bold truncate ${p.id === activeId ? 'text-indigo-900' : 'text-slate-700'}`}>{p.name}</h4>
                                                        {p.id === activeId && (
                                                            <span className="px-1 py-0.5 bg-indigo-600 text-white text-[6px] font-black uppercase rounded">Activo</span>
                                                        )}
                                                        {((p.bookingsCount || 0) === 0 && (p.accountingCount || 0) === 0) ? (
                                                            <span className="text-[8px] font-black text-amber-500 uppercase">Vacío</span>
                                                        ) : (
                                                            <span className="text-[8px] font-black text-emerald-500 uppercase">{p.bookingsCount || 0} res / {p.accountingCount || 0} mov</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export const StartupScreen = ({ onOpen }: { onOpen: () => void }) => {
    const isTauri = isTauriRuntime();
    const boot = getWorkspaceBootState();

    if (boot.state === "MISSING") {
        return <StartupRecoveryScreen path={boot.path} message={boot.message} onOpen={onOpen} />;
    }

    return isTauri ? <StartupScreenTauri onOpen={onOpen} /> : <StartupScreenLegacy onOpen={onOpen} />;
};

// ─── Recovery Screen (deterministic, never freezes UI) ───────────────────────

function pathBadge(p: string): { label: string; color: string } {
    if (p.includes("Mobile Documents/com~apple~CloudDocs")) return { label: "iCloud", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    if (p.includes("Google Drive") || p.includes("GoogleDrive")) return { label: "Google Drive", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Local", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

const StartupRecoveryScreen: React.FC<{
    path: string;
    message?: string;
    onOpen: () => void;
}> = ({ path, message, onOpen }) => {
    const [retrying, setRetrying] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [retryFailed, setRetryFailed] = useState(false);
    const abortRef = useRef(false);

    const badge = pathBadge(path);

    // Live countdown during retry
    useEffect(() => {
        if (!retrying) return;
        const start = Date.now();
        const t = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 250);
        return () => clearInterval(t);
    }, [retrying]);

    const handleRetry = async () => {
        setRetrying(true);
        setRetryFailed(false);
        setElapsed(0);
        abortRef.current = false;

        // Wait up to 30 seconds, checking every 500 ms
        const deadline = Date.now() + 30_000;
        let found = false;
        while (Date.now() < deadline && !abortRef.current) {
            try {
                if (await exists(path)) { found = true; break; }
            } catch { /* ignore */ }
            await new Promise(r => setTimeout(r, 500));
        }

        if (found && !abortRef.current) {
            // Path materialized — try to actually open the workspace
            try {
                setWorkspaceBootState({ state: "OPENING_DB", path });
                await projectManager.initialize();
                if (projectManager.isProjectLoaded()) {
                    setWorkspaceBootState({ state: "READY", path });
                    onOpen();
                    return;
                }
            } catch (e) {
                console.warn("[Recovery] Re-init after materialization failed", e);
            }
        }

        setRetrying(false);
        if (!found) {
            setRetryFailed(true);
            toast.error("Sigue sin aparecer. Abre la carpeta en Finder o elige otra ubicación.");
        }
    };

    const handleChooseFolder = async () => {
        try {
            const dir = await chooseFolder();
            if (!dir) return;
            await switchWorkspace(dir); // persists + reloads
        } catch (e: any) {
            console.error("[Recovery] chooseFolder failed", e);
            toast.error(e?.message || "Error al cambiar workspace");
        }
    };

    const handleOpenFinder = async () => {
        try {
            // Open the parent folder so the user can see the workspace (or its placeholder)
            const { dirname } = await import("@tauri-apps/api/path");
            const parent = await dirname(path);
            await openWorkspaceFolder(parent);
        } catch (e) {
            try { await openWorkspaceFolder(path); } catch { /* best effort */ }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 w-full">
            <div className="max-w-xl w-full bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-10 space-y-6">

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-rose-50 text-rose-600">
                    <AlertCircle size={32} />
                </div>

                {/* Title + Badge */}
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Workspace no disponible</h2>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0 ${badge.color}`}>
                            {badge.label}
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        {message || "La ruta guardada no existe o aún no está descargada."}
                    </p>
                </div>

                {/* Path */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Ruta guardada</div>
                    <code className="block text-xs font-mono text-slate-600 break-all bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        {path}
                    </code>
                </div>

                {/* Retry progress */}
                {retrying && (
                    <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <Loader2 size={18} className="animate-spin text-indigo-600" />
                        <div>
                            <p className="text-sm font-bold text-indigo-800">Esperando descarga…</p>
                            <p className="text-xs text-indigo-500 font-mono tabular-nums">{elapsed}s / 30s</p>
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                        disabled={retrying}
                        className="px-4 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={handleRetry}
                    >
                        <RefreshCw size={16} className={retrying ? "animate-spin" : ""} />
                        {retrying ? "Reintentando…" : "Reintentar (30s)"}
                    </button>

                    <button
                        disabled={retrying}
                        className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={handleOpenFinder}
                    >
                        <FolderOpen size={16} /> Abrir en Finder
                    </button>

                    <button
                        disabled={retrying}
                        className="px-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 sm:col-span-2 disabled:opacity-50"
                        onClick={handleChooseFolder}
                    >
                        <Database size={16} /> Elegir otra carpeta…
                    </button>
                </div>

                {/* Helper notice */}
                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2 opacity-70">
                    <AlertCircle size={10} />
                    {isICloudWorkspace(path)
                        ? "Si el workspace está en iCloud, Finder puede tardar unos segundos en descargarlo."
                        : "Si la carpeta fue movida o renombrada, selecciona la nueva ubicación."}
                </div>
            </div>
        </div>
    );
};
