import React from 'react';
import {
    Monitor, Tablet, Smartphone,
    Undo2, Redo2, Save, Play,
    ChevronLeft, Loader2, Check
} from 'lucide-react';
import { BuilderDevice } from '../types';

interface BuilderHeaderProps {
    siteName: string;
    onBack: () => void;
    device: BuilderDevice;
    setDevice: (d: BuilderDevice) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onSave: () => void;
    onPublish: () => void;
    saveStatus: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
    siteName, onBack,
    device, setDevice,
    undo, redo, canUndo, canRedo,
    onSave, onPublish, saveStatus
}) => {
    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50 shrink-0 shadow-sm">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-3 w-1/3">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                    <ChevronLeft size={20} />
                </button>
                <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                <h1 className="font-bold text-slate-800 text-sm truncate">{siteName}</h1>
                {saveStatus === 'saved' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full animate-in fade-in zoom-in duration-300">
                        <Check size={10} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Guardado</span>
                    </div>
                )}
                {saveStatus === 'saving' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                        <Loader2 size={10} className="animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Guardando</span>
                    </div>
                )}
            </div>

            {/* Center: Device & Undo/Redo */}
            <div className="flex items-center gap-6 w-1/3 justify-center">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['desktop', 'tablet', 'mobile'] as BuilderDevice[]).map(d => (
                        <button
                            key={d}
                            onClick={() => setDevice(d)}
                            className={`p-1.5 rounded-lg transition-all ${device === d ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {d === 'desktop' && <Monitor size={16} />}
                            {d === 'tablet' && <Tablet size={16} />}
                            {d === 'mobile' && <Smartphone size={16} />}
                        </button>
                    ))}
                </div>

                <div className="h-4 w-[1px] bg-slate-200" />

                <div className="flex items-center gap-1">
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className={`p-1.5 rounded-lg transition-colors ${canUndo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-200'}`}
                        title="Deshacer (Ctrl+Z)"
                    >
                        <Undo2 size={18} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className={`p-1.5 rounded-lg transition-colors ${canRedo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-200'}`}
                        title="Rehacer (Ctrl+Shift+Z)"
                    >
                        <Redo2 size={18} />
                    </button>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-1/3 justify-end">
                <button
                    onClick={onSave}
                    disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all
                        ${saveStatus === 'unsaved'
                            ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-lg'
                            : 'bg-slate-50 text-slate-300 cursor-not-allowed'}
                    `}
                >
                    <Save size={14} />
                    Guardar
                </button>
                <button
                    onClick={onPublish}
                    className="px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all ml-1"
                >
                    <Play size={14} fill="currentColor" />
                    PUBLICAR
                </button>
            </div>
        </header>
    );
};
