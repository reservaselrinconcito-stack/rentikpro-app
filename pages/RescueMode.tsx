import React from 'react';
import { projectManager } from '../services/projectManager';
import { RefreshCw, Trash2, FilePlus, Download } from 'lucide-react';

interface RescueModeProps {
    error?: Error | null;
}

export const RescueMode: React.FC<RescueModeProps> = ({ error }) => {

    const handleCreateNew = async () => {
        try {
            if (confirm("Se creará un proyecto vacío en memoria. ¿Continuar?")) {
                await projectManager.createNewProject();
                window.location.hash = '/';
                window.location.reload();
            }
        } catch (e) {
            alert("Error creando proyecto: " + e);
        }
    };

    const handleReset = () => {
        // Double confirmation purely for safety
        if (confirm("⚠️ ¿RESET TOTAL? Esto borrará tus datos locales (IndexedDB/LocalStorage) para intentar arreglar el arranque.")) {
            if (confirm("¿Segurísimo? Esta acción es irreversible si no tienes backup.")) {
                localStorage.clear();
                sessionStorage.clear();
                // Clear IndexedDB if used (not heavily used yet but good practice for 'hard reset')
                alert("Datos borrados. Recargando...");
                window.location.hash = '/';
                window.location.reload();
            }
        }
    };

    const handleImport = () => {
        // Just force reload to importers, assuming router might work if we bypass crash logic
        // OR manually trigger file input if we duplicate logic.
        // Let's try to reload to specific route if possible, but if App crashes on boot, routing might fail.
        // Safer: Allow upload right here.
        document.getElementById('rescue-upload')?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await projectManager.importProjectFromFile(file);
                alert("Proyecto restaurado. Recargando...");
                window.location.hash = '/';
                window.location.reload();
            } catch (err) {
                alert("Error al restaurar: " + err);
            }
        }
    };

    return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6 font-sans">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
                <div className="bg-red-600 p-6 text-white">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        🚨 Modo Rescate
                    </h1>
                    <p className="text-red-100 mt-2">
                        La aplicación ha detectado un error crítico al arrancar. Usa estas opciones para recuperar el acceso.
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    {error && (
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 text-sm font-mono overflow-auto max-h-40">
                            <p className="font-bold text-slate-700">Error Técnico:</p>
                            <p className="text-red-600">{error.message}</p>
                            <p className="text-slate-500 mt-2 text-xs whitespace-pre-wrap">{error.stack}</p>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all text-left group"
                        >
                            <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
                                <FilePlus size={24} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-800">Crear Vacío</div>
                                <div className="text-xs text-slate-500">Inicia una base de datos nueva/temporal.</div>
                            </div>
                        </button>

                        <div className="relative">
                            <button
                                onClick={handleImport}
                                className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left group"
                            >
                                <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white">
                                    <Download size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800">Restaurar Backup</div>
                                    <div className="text-xs text-slate-500">Carga tu archivo .sqlite o .zip.</div>
                                </div>
                            </button>
                            <input
                                id="rescue-upload"
                                type="file"
                                accept=".sqlite,.zip"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left group"
                        >
                            <div className="bg-blue-100 p-3 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                                <RefreshCw size={24} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-800">Reintentar</div>
                                <div className="text-xs text-slate-500">Recargar la página por si fue algo puntual.</div>
                            </div>
                        </button>

                        <button
                            onClick={handleReset}
                            className="flex items-center gap-3 p-4 border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all text-left group"
                        >
                            <div className="bg-red-100 p-3 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-800">Reset Local</div>
                                <div className="text-xs text-slate-500">Borra caché y datos locales. (Peligroso)</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
