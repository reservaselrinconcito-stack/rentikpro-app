import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { projectManager } from '../services/projectManager';
import { isTauri } from '../utils/isTauri';

export const DemoBanner: React.FC = () => {
    const isProjectOpen = projectManager.isProjectLoaded();
    const isDemo = projectManager.getCurrentMode() === 'demo';
    const isTauriRuntime = isTauri();

    if (!isProjectOpen || !isDemo || isTauriRuntime) return null;

    const handleExit = async () => {
        if (window.confirm('¿Deseas salir del modo demo? Los cambios no se guardarán permanentemente.')) {
            await projectManager.closeProject();
            window.location.href = '#/';
            window.location.reload();
        }
    };

    return (
        <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold shadow-lg relative z-[100]">
            <div className="flex items-center gap-2">
                <Sparkles size={14} className="animate-pulse" />
                <span>MODO DEMO — Estás explorando RentikPro con datos de ejemplo.</span>
            </div>
            <button
                onClick={handleExit}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-all flex items-center gap-1 border border-white/20"
            >
                <span>Salir</span>
                <X size={12} />
            </button>
        </div>
    );
};
