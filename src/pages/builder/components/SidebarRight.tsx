import React from 'react';
import {
    Type, Image as ImageIcon, Palette,
    Settings, Maximize, AlignLeft,
    AlignCenter, AlignRight, Trash2,
    MoveUp, MoveDown
} from 'lucide-react';
import { BlockInstance } from '../../../modules/webBuilder/types';
import { InspectorTab, BuilderDevice } from '../types';

interface SidebarRightProps {
    selectedBlock: BlockInstance | null;
    tab: InspectorTab;
    setTab: (tab: InspectorTab) => void;
    device: BuilderDevice;
    onUpdateBlock: (id: string, updates: Partial<BlockInstance>) => void;
    onRemoveBlock: (id: string) => void;
    onMoveBlock: (idx: number, dir: 'up' | 'down') => void;
    blockIndex: number;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
    selectedBlock, tab, setTab, device, onUpdateBlock,
    onRemoveBlock, onMoveBlock, blockIndex
}) => {
    if (!selectedBlock) {
        return (
            <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full z-40 shrink-0 select-none shadow-sm animate-in slide-in-from-right duration-300">
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400">
                    <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                        <Settings size={24} className="opacity-40" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2">Editor de Bloques</h3>
                    <p className="text-[11px] leading-relaxed">Selecciona cualquier elemento del lienzo para editar su contenido y apariencia.</p>
                </div>
            </aside>
        );
    }

    const updateData = (key: string, value: any) => {
        onUpdateBlock(selectedBlock.id, {
            data: { ...selectedBlock.data, [key]: value }
        });
    };

    const updateStyle = (key: string, value: any) => {
        onUpdateBlock(selectedBlock.id, {
            styles: {
                ...selectedBlock.styles,
                [device]: { ...selectedBlock.styles[device], [key]: value }
            }
        });
    };

    const getStyleValue = (key: string) => {
        const val = selectedBlock.styles[device]?.[key as keyof typeof selectedBlock.styles.desktop];
        // Fallback to desktop if current device style is missing
        if (val === undefined && device !== 'desktop') {
            return selectedBlock.styles.desktop?.[key as keyof typeof selectedBlock.styles.desktop] || '';
        }
        return val || '';
    };

    return (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full z-40 shrink-0 select-none shadow-sm animate-in slide-in-from-right duration-300">
            {/* Header / Tabs */}
            <div className="p-2 border-b border-slate-100 flex gap-1 bg-slate-50/30">
                {(['content', 'style', 'settings'] as InspectorTab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
                            ${tab === t ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}
                        `}
                    >
                        {t === 'content' && 'Contenido'}
                        {t === 'style' && 'Diseño'}
                        {t === 'settings' && 'Ajustes'}
                    </button>
                ))}
            </div>

            {/* Editing for: [DEVICE ICON] */}
            <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Editando: <span className="text-indigo-600">{device}</span></span>
                <span className="opacity-50 italic">Overrides activos</span>
            </div>

            {/* Content Tab */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {tab === 'content' && (
                    <div className="p-5 space-y-6">
                        {/* Common Block Controls */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedBlock.type}</h4>
                                <p className="text-[9px] text-slate-300 font-mono tracking-tighter">{selectedBlock.id}</p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => onMoveBlock(blockIndex, 'up')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                    <MoveUp size={14} />
                                </button>
                                <button onClick={() => onMoveBlock(blockIndex, 'down')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                    <MoveDown size={14} />
                                </button>
                                <button onClick={() => onRemoveBlock(selectedBlock.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Configurable content depending on type */}
                        {Object.entries(selectedBlock.data).map(([key, val]) => {
                            if (typeof val === 'string' && (key.toLowerCase().includes('text') || key === 'title' || key === 'subtitle' || key === 'ctaLabel' || key === 'kicker')) {
                                return (
                                    <div key={key} className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest block">{key}</label>
                                        <textarea
                                            value={val}
                                            onChange={e => updateData(key, e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-medium outline-none focus:border-indigo-500 transition-colors resize-none"
                                            rows={2}
                                        />
                                    </div>
                                );
                            }
                            return null;
                        })}

                        {selectedBlock.data.imageUrl !== undefined && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest block">Imagen URL</label>
                                <div className="flex gap-2">
                                    <input
                                        value={selectedBlock.data.imageUrl}
                                        onChange={e => updateData('imageUrl', e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-medium outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    <button className="p-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                        <ImageIcon size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'style' && (
                    <div className="p-5 space-y-8">
                        {/* Spacing */}
                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                <Maximize size={12} className="text-indigo-500" /> Geometría
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Padding (px)</span>
                                    <input
                                        type="number"
                                        value={parseInt(String(getStyleValue('padding') || '0'))}
                                        onChange={e => updateStyle('padding', `${e.target.value}px`)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-bold outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Máx Ancho</span>
                                    <input
                                        type="text"
                                        placeholder="1200px"
                                        value={getStyleValue('maxWidth') as string}
                                        onChange={e => updateStyle('maxWidth', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-bold outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Colors */}
                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                <Palette size={12} className="text-indigo-500" /> Colores & Fondo
                            </h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Fondo</span>
                                    <input
                                        type="color"
                                        value={getStyleValue('backgroundColor') as string || '#ffffff'}
                                        onChange={e => updateStyle('backgroundColor', e.target.value)}
                                        className="w-10 h-10 rounded-full border-4 border-slate-100 overflow-hidden cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Texto</span>
                                    <input
                                        type="color"
                                        value={getStyleValue('color') as string || '#000000'}
                                        onChange={e => updateStyle('color', e.target.value)}
                                        className="w-10 h-10 rounded-full border-4 border-slate-100 overflow-hidden cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1.5 pt-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Opacidad Superposición</span>
                                    <input
                                        type="range" min="0" max="1" step="0.1"
                                        value={getStyleValue('overlayOpacity') as number || 0}
                                        onChange={e => updateStyle('overlayOpacity', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Alignment */}
                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                <AlignLeft size={12} className="text-indigo-500" /> Alineación
                            </h4>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {[
                                    { id: 'left', icon: AlignLeft },
                                    { id: 'center', icon: AlignCenter },
                                    { id: 'right', icon: AlignRight },
                                ].map(align => (
                                    <button
                                        key={align.id}
                                        onClick={() => updateStyle('textAlign', align.id)}
                                        className={`flex-1 py-1.5 rounded-lg flex justify-center transition-all 
                                            ${getStyleValue('textAlign') === align.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
                                        `}
                                    >
                                        <align.icon size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'settings' && (
                    <div className="p-5 space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Visibilidad</h4>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-xs font-bold text-slate-600">Ocultar en este dispositivo</span>
                                <input
                                    type="checkbox"
                                    checked={getStyleValue('display') === 'none'}
                                    onChange={e => updateStyle('display', e.target.checked ? 'none' : 'block')}
                                    className="w-10 h-5 bg-slate-200 rounded-full appearance-none checked:bg-indigo-600 transition-colors cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                                />
                            </div>
                        </div>

                        <div className="pt-10 border-t border-slate-50">
                            <button
                                onClick={() => onRemoveBlock(selectedBlock.id)}
                                className="w-full py-4 text-xs font-black text-red-500 bg-red-50 hover:bg-red-100 transition-colors rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest"
                            >
                                <Trash2 size={14} /> Eliminar Bloque
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
