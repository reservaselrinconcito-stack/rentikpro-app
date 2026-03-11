import React, { useState } from 'react';
import {
    Type, Image as ImageIcon, Palette,
    Settings, Maximize, AlignLeft,
    AlignCenter, AlignRight, Trash2,
    MoveUp, MoveDown, Sparkles
} from 'lucide-react';
import { BlockInstance } from '../types';
import { InspectorTab, BuilderDevice } from '../builderTypes';

interface SidebarRightProps {
    selectedBlock: BlockInstance | null;
    tab: InspectorTab;
    setTab: (tab: InspectorTab) => void;
    device: BuilderDevice;
    onUpdateBlock: (id: string, updates: Partial<BlockInstance>) => void;
    onRemoveBlock: (id: string) => void;
    onMoveBlock: (idx: number, dir: 'up' | 'down') => void;
    blockIndex: number;
    businessContext?: string;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
    selectedBlock, tab, setTab, device, onUpdateBlock,
    onRemoveBlock, onMoveBlock, blockIndex, businessContext = ''
}) => {
    const [showAI, setShowAI] = useState(false);
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
                {/* AI Button disabled for Phase 1 */}
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

                        {/* ── Variant Selector ─────────────────────────────── */}
                        <VariantSelector
                            blockType={selectedBlock.type}
                            currentVariant={selectedBlock.variant ?? 'A'}
                            onChange={(v) => onUpdateBlock(selectedBlock.id, { variant: v })}
                        />

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
                                    <button title="Arrastrar imagen o pegar URL" className="p-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = (e: any) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => updateData("imageUrl", ev.target?.result as string); r.readAsDataURL(f); }; inp.click(); }}>
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

// ─── Variant Selector ──────────────────────────────────────────────────────────

const BLOCK_VARIANTS: Record<string, Array<{ id: string; label: string; description: string; preview: string }>> = {
    Hero: [
        { id: 'A', label: 'Centrado', description: 'Texto centrado con imagen de fondo', preview: '▣' },
        { id: 'B', label: 'Split', description: 'Texto a la izquierda, imagen a la derecha', preview: '◧' },
        { id: 'C', label: 'Minimalista', description: 'Sin imagen, tipografía grande', preview: '▤' },
        { id: 'D', label: 'Video', description: 'Con overlay de video background', preview: '▶' },
    ],
    Features: [
        { id: 'A', label: 'Grid 3 cols', description: 'Iconos en rejilla de 3 columnas', preview: '▦' },
        { id: 'B', label: 'Lista', description: 'Características en lista vertical con checks', preview: '≡' },
        { id: 'C', label: 'Cards', description: 'Cards con sombra y hover effect', preview: '▣' },
        { id: 'D', label: 'Tabs', description: 'Características con pestañas interactivas', preview: '⊞' },
    ],
    Testimonials: [
        { id: 'A', label: 'Cards', description: 'Tarjetas con rating de estrellas', preview: '★' },
        { id: 'B', label: 'Carrusel', description: 'Slider con navegación por puntos', preview: '◷' },
        { id: 'C', label: 'Quote grande', description: 'Una cita destacada centrada', preview: '❝' },
        { id: 'D', label: 'Grid masonry', description: 'Múltiples reseñas en grid variable', preview: '▩' },
    ],
    CTA: [
        { id: 'A', label: 'Banner', description: 'Fondo de color sólido con CTA centrado', preview: '▬' },
        { id: 'B', label: 'Split', description: 'Texto a la izquierda, botones a la derecha', preview: '◧' },
        { id: 'C', label: 'Con imagen', description: 'Imagen de fondo con overlay y CTA', preview: '▣' },
        { id: 'D', label: 'Urgencia', description: 'Con contador regresivo y badge de descuento', preview: '⏱' },
    ],
    Pricing: [
        { id: 'A', label: 'Cards', description: 'Planes en tarjetas lado a lado', preview: '▦' },
        { id: 'B', label: 'Toggle mensual/anual', description: 'Switch para cambiar periodo', preview: '⇄' },
        { id: 'C', label: 'Tabla comparativa', description: 'Features por plan en tabla', preview: '⊞' },
    ],
    FAQ: [
        { id: 'A', label: 'Acordeón', description: 'Preguntas plegables una a una', preview: '≡' },
        { id: 'B', label: 'Dos columnas', description: 'Preguntas en dos columnas', preview: '◧' },
        { id: 'C', label: 'Con buscador', description: 'Barra de búsqueda + acordeón', preview: '⊕' },
    ],
    Stats: [
        { id: 'A', label: 'Horizontal', description: 'Estadísticas en fila', preview: '▬' },
        { id: 'B', label: 'Grid 2x2', description: 'Cuatro stats en cuadrícula', preview: '▦' },
        { id: 'C', label: 'Con iconos', description: 'Stats con icono grande arriba', preview: '★' },
    ],
    Navigation: [
        { id: 'A', label: 'Transparent', description: 'Navbar transparente que se solidifica al scroll', preview: '▬' },
        { id: 'B', label: 'Solid', description: 'Fondo sólido siempre visible', preview: '▣' },
        { id: 'C', label: 'Centrado', description: 'Logo centrado, links a ambos lados', preview: '◈' },
        { id: 'D', label: 'Minimal', description: 'Solo logo y un CTA', preview: '—' },
    ],
    ContactForm: [
        { id: 'A', label: 'Split', description: 'Info de contacto + formulario', preview: '◧' },
        { id: 'B', label: 'Centrado', description: 'Formulario centrado solo', preview: '▣' },
        { id: 'C', label: 'Con mapa', description: 'Mapa estático + formulario', preview: '⊕' },
    ],
    Team: [
        { id: 'A', label: 'Grid', description: 'Fotos en cuadrícula con hover', preview: '▦' },
        { id: 'B', label: 'Lista horizontal', description: 'Foto + bio en fila', preview: '▬' },
        { id: 'C', label: 'Cards grandes', description: 'Cards amplias con redes sociales', preview: '▣' },
    ],
};

const VariantSelector: React.FC<{
    blockType: string;
    currentVariant: string;
    onChange: (variant: string) => void;
}> = ({ blockType, currentVariant, onChange }) => {
    const variants = BLOCK_VARIANTS[blockType];
    if (!variants || variants.length <= 1) return null;

    return (
        <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Variante de diseño
            </label>
            <div className="grid grid-cols-2 gap-1.5">
                {variants.map(v => (
                    <button
                        key={v.id}
                        onClick={() => onChange(v.id)}
                        title={v.description}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all group ${currentVariant === v.id
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-100 bg-slate-50 hover:border-indigo-200 text-slate-600'
                            }`}
                    >
                        <span className="text-lg shrink-0 w-6 text-center">{v.preview}</span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black truncate">{v.label}</p>
                            <p className="text-[8px] text-slate-400 truncate leading-tight">{v.description}</p>
                        </div>
                        {currentVariant === v.id && (
                            <span className="ml-auto text-[8px] font-black text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-full shrink-0">✓</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
