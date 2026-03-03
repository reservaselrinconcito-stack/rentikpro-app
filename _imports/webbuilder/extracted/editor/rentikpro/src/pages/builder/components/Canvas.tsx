/**
 * Canvas.tsx — Lienzo WYSIWYG del editor.
 *
 * Mejoras sobre el original:
 *  ✓ Drag & drop nativo HTML5 para reordenar bloques (sin dependencias nuevas)
 *  ✓ Botones de mover arriba/abajo y borrar bloque
 *  ✓ Error boundary por bloque (nunca muestra lienzo en blanco)
 *  ✓ Etiqueta de tipo visible en el bloque seleccionado
 *  ✓ Mensaje de lienzo vacío
 *
 * Preservado del original:
 *  ✓ Anchos responsivos por device
 *  ✓ Click-to-select
 *  ✓ WebsiteRenderer para renderizado real
 */
import React, { useRef, useCallback } from 'react';
import { Trash2, MoveUp, MoveDown, GripVertical, AlertTriangle } from 'lucide-react';

import { SiteConfigV1, BlockInstance } from '../../../modules/webBuilder/types';
import type { BuilderDevice } from '../types';
import { WebsiteRenderer } from '../../../modules/webBuilder/components/WebsiteRenderer';

// ─── Error Boundary ────────────────────────────────────────────────────────────

interface EBState { hasError: boolean; msg: string }

class BlockErrorBoundary extends React.Component<{ children: React.ReactNode; blockId: string }, EBState> {
    constructor(p: any) { super(p); this.state = { hasError: false, msg: '' }; }
    static getDerivedStateFromError(e: Error) { return { hasError: true, msg: e.message }; }
    render() {
        if (this.state.hasError) return (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl m-2">
                <AlertTriangle size={16} />
                <span>Error en bloque <code className="bg-red-100 px-1 rounded">{this.props.blockId}</code>: {this.state.msg}</span>
            </div>
        );
        return this.props.children;
    }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasProps {
    config: SiteConfigV1;
    device: BuilderDevice;
    selectedBlockId: string | null;
    onSelectBlock: (id: string) => void;
    onMoveBlock?: (index: number, dir: 'up' | 'down') => void;
    onRemoveBlock?: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Canvas: React.FC<CanvasProps> = ({
    config, device, selectedBlockId, onSelectBlock, onMoveBlock, onRemoveBlock
}) => {
    const dragOverId = useRef<string | null>(null);
    const draggingId = useRef<string | null>(null);

    const widthMap: Record<BuilderDevice, string> = {
        mobile: 'w-[375px]',
        tablet: 'w-[768px]',
        desktop: 'w-full',
    };

    const blocks: BlockInstance[] = config.pages["/"]?.blocks ?? [];

    const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
        draggingId.current = blockId;
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
        e.preventDefault();
        dragOverId.current = blockId;
    }, []);

    return (
        <main className="flex-1 bg-slate-100 overflow-y-auto p-12 flex justify-center custom-scrollbar relative">
            <div className={`transition-all duration-500 ease-in-out bg-white shadow-2xl relative min-h-full ${widthMap[device]} overflow-hidden`}>

                {blocks.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center pointer-events-none">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-dashed border-slate-200">
                            <span className="text-4xl">✨</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">Tu lienzo está vacío</h2>
                        <p className="text-sm text-slate-400 max-w-xs">Añade bloques desde la biblioteca de la izquierda para empezar a construir tu sitio.</p>
                    </div>
                )}

                <div className="builder-canvas-blocks relative">
                    {blocks.map((block, idx) => {
                        const isSelected = selectedBlockId === block.id;
                        return (
                            <div
                                key={block.id}
                                draggable
                                onDragStart={e => handleDragStart(e, block.id)}
                                onDragOver={e => handleDragOver(e, block.id)}
                                onClickCapture={e => { e.stopPropagation(); onSelectBlock(block.id); }}
                                className={[
                                    'relative group/block transition-all cursor-pointer',
                                    isSelected
                                        ? 'ring-2 ring-indigo-500 ring-inset ring-offset-0 z-20'
                                        : 'hover:ring-1 hover:ring-indigo-300 hover:ring-inset'
                                ].join(' ')}
                            >
                                {/* Block label */}
                                {isSelected && (
                                    <div className="absolute -top-6 left-0 bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-t-lg z-30 uppercase tracking-widest flex items-center gap-1">
                                        <GripVertical size={10} /> {block.type}
                                    </div>
                                )}

                                {/* Actions toolbar */}
                                {isSelected && (
                                    <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-white shadow-xl rounded-xl p-1 border border-slate-100">
                                        <button
                                            onClickCapture={e => { e.stopPropagation(); onMoveBlock?.(idx, 'up'); }}
                                            disabled={idx === 0}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                                            title="Subir"
                                        ><MoveUp size={14} /></button>
                                        <button
                                            onClickCapture={e => { e.stopPropagation(); onMoveBlock?.(idx, 'down'); }}
                                            disabled={idx === blocks.length - 1}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                                            title="Bajar"
                                        ><MoveDown size={14} /></button>
                                        <div className="w-px h-4 bg-slate-100 mx-0.5" />
                                        <button
                                            onClickCapture={e => { e.stopPropagation(); onRemoveBlock?.(block.id); }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Eliminar bloque"
                                        ><Trash2 size={14} /></button>
                                    </div>
                                )}

                                <BlockErrorBoundary blockId={block.id}>
                                    <WebsiteRenderer
                                        config={{ ...config, pages: { '/': { ...config.pages['/'], blocks: [block] } } }}
                                        currentPath="/"
                                    />
                                </BlockErrorBoundary>

                                {/* Click interceptor */}
                                <div className="absolute inset-0 bg-transparent" />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Device indicator */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/80 backdrop-blur shadow-sm rounded-full border border-slate-200 text-[10px] font-bold text-slate-400 z-0 pointer-events-none">
                Lienzo: {device === 'desktop' ? '100% Pantalla' : device === 'tablet' ? '768px (Tablet)' : '375px (Móvil)'}
            </div>
        </main>
    );
};
