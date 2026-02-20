import React from 'react';
import { Tablet, Smartphone, Monitor, Save, Globe, ArrowLeft, Loader2, Play, Undo2, Redo2, Cloud, CloudOff, CloudCog, CheckCircle2 } from 'lucide-react';
import { WebSite } from '@/types';

interface BuilderHeaderProps {
    siteName: string;
    onNameChange: (name: string) => void;
    onBack: () => void;
    device: 'mobile' | 'tablet' | 'desktop';
    setDevice: (d: 'mobile' | 'tablet' | 'desktop') => void;
    onSave: () => void;
    onPublish: () => void;
    isSaving: boolean;
    hasChanges: boolean;
    lastSavedRequest?: number;
    status: 'draft' | 'published';
    liveUrl?: string; // e.g. subdomain.rentik.pro
    saveStatus?: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
    siteName, onNameChange, onBack,
    device, setDevice,
    onSave, onPublish,
    isSaving, hasChanges,
    status, liveUrl,
    saveStatus = 'idle',
    canUndo = false,
    canRedo = false,
    onUndo, onRedo
}) => {
    return (
        <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between shrink-0 z-50">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-4 w-1/3">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors mr-2">
                    <ArrowLeft size={20} />
                </button>

                {/* Undo / Redo */}
                <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className={`p-1.5 rounded-lg transition-colors ${canUndo ? 'text-slate-600 hover:bg-white hover:shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                    >
                        <Undo2 size={16} />
                    </button>
                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        className={`p-1.5 rounded-lg transition-colors ${canRedo ? 'text-slate-600 hover:bg-white hover:shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                    >
                        <Redo2 size={16} />
                    </button>
                </div>

                <div className="flex flex-col ml-2">
                    <input
                        className="font-black text-slate-800 bg-transparent outline-none text-base placeholder-slate-300"
                        value={siteName}
                        onChange={e => onNameChange(e.target.value)}
                        placeholder="Nombre del Sitio"
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'published' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                            {status === 'published' ? 'PUBLICADO' : 'BORRADOR'}
                            {/* Autosave Indicator */}
                            {saveStatus === 'saving' && <span className="text-indigo-500 flex items-center gap-1"><CloudCog size={12} className="animate-spin" /> Guardando...</span>}
                            {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> Guardado</span>}
                            {saveStatus === 'unsaved' && <span className="text-amber-500 flex items-center gap-1"><CloudOff size={12} /> Cambios sin guardar</span>}
                            {saveStatus === 'error' && <span className="text-red-500 flex items-center gap-1"><CloudOff size={12} /> Error al guardar</span>}
                        </span>
                    </div>
                </div>
            </div>

            {/* Center: Device Selector */}
            <div className="flex items-center justify-center w-1/3">
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setDevice('desktop')}
                        className={`p-2 rounded-lg transition-all ${device === 'desktop' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Vista Escritorio"
                    >
                        <Monitor size={18} />
                    </button>
                    <button
                        onClick={() => setDevice('tablet')}
                        className={`p-2 rounded-lg transition-all ${device === 'tablet' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Vista Tablet"
                    >
                        <Tablet size={18} />
                    </button>
                    <button
                        onClick={() => setDevice('mobile')}
                        className={`p-2 rounded-lg transition-all ${device === 'mobile' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Vista Móvil"
                    >
                        <Smartphone size={18} />
                    </button>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-3 w-1/3">
                {liveUrl && (
                    <a href={`https://${liveUrl}.rentik.pro`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Ver en vivo">
                        <Globe size={20} />
                    </a>
                )}

                <button
                    onClick={onSave}
                    disabled={isSaving || !hasChanges}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all
                        ${hasChanges
                            ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-lg hover:shadow-slate-200'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                    `}
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {isSaving ? 'Guardando...' : 'Guardar'}
                </button>

                <button
                    onClick={onPublish}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 transition-all"
                >
                    <Play size={14} fill="currentColor" />
                    PUBLICAR
                </button>
            </div>
        </header>
    );
};
