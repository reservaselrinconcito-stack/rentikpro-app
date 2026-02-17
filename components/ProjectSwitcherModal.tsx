import React, { useState, useEffect } from 'react';
import { X, Database, Play, CheckCircle, AlertCircle, Trash2, Clock } from 'lucide-react';
import { projectPersistence, ProjectMetadata } from '../services/projectPersistence';
import { projectManager } from '../services/projectManager';
import { notifyDataChanged } from '../services/dataRefresher';

interface ProjectSwitcherModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectSwitcherModal: React.FC<ProjectSwitcherModalProps> = ({ isOpen, onClose }) => {
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const activeId = projectManager.getCurrentProjectId();

    useEffect(() => {
        if (isOpen) {
            loadProjects();
        }
    }, [isOpen]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const list = await projectPersistence.listProjects();
            setProjects(list);
        } catch (e) {
            console.error("Error loading projects:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = async (id: string) => {
        if (id === activeId) {
            onClose();
            return;
        }

        setLoading(true);
        const success = await projectManager.loadProject(id);
        if (success) {
            notifyDataChanged();
            onClose();
        } else {
            alert("Error al cambiar de proyecto.");
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mis Proyectos</h2>
                        <p className="text-slate-500 text-sm">Cambia de entorno de trabajo rápidamente.</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all shadow-sm border border-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                    {loading && projects.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cargando biblioteca...</p>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                                <Database size={32} />
                            </div>
                            <p className="text-slate-500 font-bold">No se han encontrado proyectos.</p>
                        </div>
                    ) : (
                        projects.map(p => {
                            const isActive = p.id === activeId;
                            const isEmpty = (p.bookingsCount || 0) === 0 && (p.accountingCount || 0) === 0;

                            return (
                                <div
                                    key={p.id}
                                    className={`group p-5 rounded-3xl border-2 transition-all flex items-center justify-between ${isActive
                                        ? 'bg-indigo-50 border-indigo-200 shadow-md shadow-indigo-100'
                                        : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-indigo-500 transition-colors'
                                            }`}>
                                            <Database size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className={`font-black tracking-tight ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>{p.name}</h3>
                                                {isActive && (
                                                    <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-full tracking-widest">Activo</span>
                                                )}
                                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full tracking-widest ${p.mode === 'demo' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                                    }`}>
                                                    {p.mode}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                                <div className="flex items-center gap-1"><Clock size={12} /> {new Date(p.lastModified).toLocaleDateString()}</div>
                                                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                <div className="font-mono uppercase">{p.id.substring(0, 12)}...</div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                {isEmpty ? (
                                                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold border border-amber-100">
                                                        <AlertCircle size={10} /> Proyecto Vacío
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100">
                                                        <CheckCircle size={10} /> {p.bookingsCount || 0} resv • {p.accountingCount || 0} mov
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-400">{(p.sizeBytes / 1024).toFixed(0)} KB</span>
                                            </div>
                                        </div>
                                    </div>

                                    {!isActive && (
                                        <button
                                            onClick={() => handleSwitch(p.id)}
                                            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <Play size={14} fill="currentColor" /> Activar
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Selecciona un proyecto para cargar sus datos</p>
                    <button
                        onClick={() => {
                            window.location.hash = '/';
                            onClose();
                        }}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:text-indigo-700 transition-colors"
                    >
                        Pantalla de Inicio →
                    </button>
                </div>
            </div>
        </div>
    );
};
