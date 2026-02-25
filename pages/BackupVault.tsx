import React, { useState, useEffect, useRef } from 'react';
import { Archive, Download, Upload, ShieldCheck, AlertCircle, RefreshCw, FileArchive, ArrowLeft, Terminal } from 'lucide-react';
import { ProjectManager, projectManager } from '../services/projectManager';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { isTauri } from '../utils/isTauri';
import { workspaceManager } from '../services/workspaceManager';

export const BackupVault = () => {
    const navigate = useNavigate();
    const [lastBackup, setLastBackup] = useState<string | null>(null);
    const [lastRestore, setLastRestore] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [localBackups, setLocalBackups] = useState<string[]>([]);
    const [selectedLocalBackup, setSelectedLocalBackup] = useState<string>('');
    const tauri = isTauri();

    useEffect(() => {
        const backupDate = localStorage.getItem('rentik_last_backup_date');
        if (backupDate) setLastBackup(new Date(backupDate).toLocaleString());

        const restoreDate = localStorage.getItem('rentik_last_restore_date');
        if (restoreDate) setLastRestore(new Date(restoreDate).toLocaleString());
    }, []);

    useEffect(() => {
        if (!tauri) return;
        const load = async () => {
            try {
                const list = await workspaceManager.listBackups();
                setLocalBackups(list);
                setSelectedLocalBackup(list[0] || '');
            } catch {
                // ignore (workspace might not be configured yet)
            }
        };
        load();
    }, [tauri]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleExport = async () => {
        let popup: Window | null = null;
        try {
            setIsExporting(true);
            setLogs([]); // Clear previous logs
            addLog("Iniciando exportación de backup...");

            // Tauri workspace: create local backup file in /backups/.
            if (tauri && workspaceManager.getWorkspacePath()) {
                addLog('Creando backup local en workspace...');
                const { filename } = await workspaceManager.createBackup();
                const list = await workspaceManager.listBackups();
                setLocalBackups(list);
                setSelectedLocalBackup(filename);
                addLog(`✅ Backup local creado: ${filename}`);
                toast.success('Backup local creado en /backups/');
                setLastBackup(new Date().toLocaleString());
                return;
            }

            // SAFARI FIX: Open popup synchronously before async work
            popup = window.open('', '_blank');
            if (popup) {
                popup.document.write('Generando backup... Espere por favor.');
            } else {
                addLog("⚠️ Popup bloqueado. Se intentará descarga directa (puede fallar en iOS).");
            }

            // Force UI update
            await new Promise(r => setTimeout(r, 100));

            addLog("Generando archivo ZIP...");
            const { blob, filename } = await projectManager.exportFullBackupZip();
            const url = URL.createObjectURL(blob);

            if (popup && !popup.closed) {
                popup.document.body.innerHTML = `<a id="dl" href="${url}" download="${filename}">Descargando...</a>`;
                const a = popup.document.getElementById('dl');
                if (a) a.click();
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    popup.close();
                }, 2000);
            } else {
                // Fallback
                ProjectManager.triggerDownload(blob, filename);
                setTimeout(() => URL.revokeObjectURL(url), 30000);
            }

            addLog(`✅ Export generado: ${filename} (${(blob.size / 1024).toFixed(0)} KB)`);
            toast.success("Backup creado y descargado correctamente");
            setLastBackup(new Date().toLocaleString());
        } catch (e) {
            if (popup && !popup.closed) popup.close();
            console.error(e);
            addLog(`ERROR: ${e}`);
            toast.error("Error al crear el backup");
        } finally {
            setIsExporting(false);
        }
    };

    const handleSaveBackupInFolder = async () => {
        try {
            if (!tauri) {
                toast.error('Esta opción solo está disponible en escritorio (Tauri).');
                return;
            }

            setIsExporting(true);
            setLogs([]);
            addLog('Selecciona carpeta destino...');

            const dialog = await import('@tauri-apps/plugin-dialog');
            const picked = await dialog.open({
                directory: true,
                multiple: false,
                title: 'Guardar backup en...'
            });

            if (!picked) return;
            const dir = Array.isArray(picked) ? (picked[0] || '') : picked;
            if (!dir) return;

            addLog('Generando backup (.rentikpro)...');
            const { blob, filename } = await projectManager.exportFullBackupZip();
            const bytes = new Uint8Array(await blob.arrayBuffer());

            const pathApi = await import('@tauri-apps/api/path');
            const fs = await import('@tauri-apps/plugin-fs');
            const filePath = await pathApi.join(dir, filename);

            await (fs as any).writeFile(filePath, bytes);

            addLog(`✅ Backup guardado en: ${filePath}`);
            toast.success('Backup guardado correctamente');
            setLastBackup(new Date().toLocaleString());
        } catch (e: any) {
            console.error('[BackupVault] Save backup in folder failed', e);
            addLog(`ERROR: ${e?.message || String(e)}`);
            toast.error(e?.message || String(e));
        } finally {
            setIsExporting(false);
        }
    };


    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("ADVERTENCIA: Restaurar un backup SOBREESCRIBIRÁ todos los datos actuales. ¿Estás seguro?")) {
            e.target.value = '';
            return;
        }

        try {
            setIsImporting(true);
            setLogs([]); // Clear logs
            addLog(`Archivo seleccionado: ${file.name}`);

            // Tauri workspace: import into workspace on disk.
            if (tauri && workspaceManager.getWorkspacePath()) {
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

                const projectId = localStorage.getItem('rp_workspace_project_id') || 'workspace';
                const name = localStorage.getItem('rp_workspace_name') || workspaceManager.getWorkspaceDisplayName();
                addLog('Cargando DB importada...');
                await projectManager.loadProjectFromSqliteBytes(dbBytes, {
                    projectId,
                    name,
                    mode: 'real',
                    setAsActive: false,
                    startAutoSave: true,
                    persistToIdb: false,
                });

                toast.success('Restauración completada en el workspace');
                setLastRestore(new Date().toLocaleString());
                setTimeout(() => navigate('/'), 1200);
                return;
            }

            if (file.name.endsWith('.zip') || file.name.endsWith('.rentikpro')) {
                await projectManager.importFullBackupZip(file, (msg) => addLog(msg));
            } else if (file.name.endsWith('.sqlite')) {
                addLog("Detectado formato legacy .sqlite");
                await projectManager.importProjectFromFile(file);
                addLog("Restauración completada.");
            } else {
                throw new Error("Formato no soportado. Usa .rentikpro, .zip o .sqlite");
            }

            toast.success("Restauración completada");
            setLastRestore(new Date().toLocaleString());

            // Delay navigation slightly so user sees success message
            setTimeout(() => {
                navigate('/');
            }, 1500);

        } catch (e: any) {
            console.error(e);
            addLog(`ERROR FATAL: ${e.message}`);
            toast.error("Error al restaurar: " + e.message);
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    const handleRestoreLocalBackup = async () => {
        if (!selectedLocalBackup) return;
        if (!confirm('ADVERTENCIA: Restaurar un backup local SOBREESCRIBIRA los datos actuales del workspace. ¿Continuar?')) return;
        try {
            setIsImporting(true);
            setLogs([]);
            addLog(`Restaurando backup local: ${selectedLocalBackup}`);
            const dbBytes = await workspaceManager.restoreBackup(selectedLocalBackup);
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
            addLog('✅ Restauración local completada');
            toast.success('Backup local restaurado');
            setLastRestore(new Date().toLocaleString());
            setTimeout(() => navigate('/'), 1200);
        } catch (e: any) {
            addLog(`ERROR FATAL: ${e?.message || e}`);
            toast.error('Error al restaurar: ' + (e?.message || String(e)));
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <ShieldCheck size={32} className="text-indigo-600" />
                        Backup Vault
                    </h1>
                    <p className="text-slate-500 mt-1">Gestión segura de copias de seguridad locales.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* EXPORT CARD */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-indigo-100 flex flex-col items-center text-center hover:shadow-2xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    <div className="bg-indigo-50 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Download size={48} className="text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Crear Backup Completo</h2>
                    <p className="text-slate-500 mb-8 max-w-xs">
                        {tauri && workspaceManager.getWorkspacePath()
                            ? 'Crea un backup local dentro del workspace (/backups/).'
                            : 'Descarga un archivo .rentikpro con toda tu base de datos, configuraciones y sitios web.'}
                    </p>

                    <button
                        onClick={handleExport}
                        disabled={isExporting || isImporting}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? <RefreshCw className="animate-spin" /> : <FileArchive />}
                        {isExporting ? "Generando..." : (tauri && workspaceManager.getWorkspacePath() ? 'Crear Backup Local' : 'Descargar Backup')}
                    </button>

                    {tauri && (
                        <button
                            onClick={handleSaveBackupInFolder}
                            disabled={isExporting || isImporting}
                            className="w-full mt-3 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-black text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Guardar backup en...
                        </button>
                    )}

                    <div className="mt-6 flex flex-col gap-1 text-xs text-slate-400">
                        {lastBackup ? (
                            <span className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                Último backup: <span className="font-mono text-slate-600 font-bold">{lastBackup}</span>
                            </span>
                        ) : (
                            <span className="italic opacity-60">Aún no hay backups recientes</span>
                        )}
                    </div>
                </div>

                {/* IMPORT CARD */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 flex flex-col items-center text-center hover:shadow-2xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                    <div className="bg-emerald-50 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Upload size={48} className="text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Restaurar Backup</h2>
                    <p className="text-slate-500 mb-8 max-w-xs">
                        {tauri && workspaceManager.getWorkspacePath()
                            ? 'Restaura un backup local del workspace o importa un archivo externo.'
                            : 'Recupera tus datos subiendo un archivo de backup previo (.rentikpro / .zip).'}
                        <br /><span className="text-red-500 font-bold text-xs mt-2 block">⚠️ Sobreescribirá los datos actuales</span>
                    </p>

                    {tauri && workspaceManager.getWorkspacePath() && (
                        <div className="w-full mb-4">
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedLocalBackup}
                                    onChange={(e) => setSelectedLocalBackup(e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                    disabled={isImporting || isExporting}
                                >
                                    <option value="" disabled>{localBackups.length ? 'Selecciona backup local' : 'Sin backups locales'}</option>
                                    {localBackups.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleRestoreLocalBackup}
                                    disabled={!selectedLocalBackup || isImporting || isExporting}
                                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
                                >
                                    Restaurar
                                </button>
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold mt-2">
                                Carpeta: {workspaceManager.getWorkspaceDisplayName()} / backups
                            </div>
                        </div>
                    )}

                    <div className="relative w-full">
                        <button
                            disabled={isImporting || isExporting}
                            className="w-full py-4 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImporting ? <RefreshCw className="animate-spin" /> : <Upload />}
                            {isImporting ? "Restaurando..." : "Seleccionar Archivo"}
                        </button>
                        <input
                            type="file"
                            accept=".rentikpro,.zip,.sqlite"
                            onChange={handleImport}
                            disabled={isImporting || isExporting}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    <div className="mt-6 flex flex-col gap-1 text-xs text-slate-400">
                        {lastRestore ? (
                            <span className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                Última restauración: <span className="font-mono text-emerald-600 font-bold">{lastRestore}</span>
                            </span>
                        ) : (
                            <span className="italic opacity-60">Sin restauraciones recientes</span>
                        )}
                    </div>
                </div>
            </div>

            {/* LOG BOX */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-inner font-mono text-sm overflow-hidden">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                    <h3 className="text-slate-400 font-bold flex items-center gap-2">
                        <Terminal size={16} /> Activity Log
                    </h3>
                    {logs.length > 0 && (
                        <button onClick={() => setLogs([])} className="text-xs text-slate-500 hover:text-white transition-colors">
                            Clear
                        </button>
                    )}
                </div>
                <div className="h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-2">
                    {logs.length === 0 ? (
                        <div className="text-slate-600 italic py-8 text-center">Esperando acciones...</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="text-slate-300 border-l-2 border-slate-700 pl-3 py-0.5 animate-in fade-in slide-in-from-left-2 duration-300">
                                {log}
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>

            <div className="mt-8 bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <ShieldCheck size={16} /> Nota de Seguridad
                </h3>
                <p className="text-sm text-slate-500">
                    Los backups se generan localmente en tu navegador. Tus datos nunca se envían a ningún servidor externo.
                    Guarda el archivo descargado en un lugar seguro.
                </p>
            </div>
        </div>
    );
};
