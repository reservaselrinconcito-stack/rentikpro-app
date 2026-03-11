import React, { useCallback, useRef, useState } from 'react';
import { WebsiteRenderer } from '../../../modules/webBuilder/components/WebsiteRenderer';
import { SiteConfigV1, BlockInstance } from '../types';
import { BuilderDevice } from '../builderTypes';
import { InlineEditor } from './InlineEditor';

interface CanvasProps {
    config: SiteConfigV1;
    device: BuilderDevice;
    selectedBlockId: string | null;
    inlineEditBlockId: string | null;
    currentPage: string;
    onSelectBlock: (id: string | null) => void;
    onStartInlineEdit: (id: string) => void;
    onStopInlineEdit: () => void;
    onUpdateBlock?: (id: string, updates: Partial<BlockInstance>) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    config, device, selectedBlockId, inlineEditBlockId, currentPage,
    onSelectBlock, onStartInlineEdit, onStopInlineEdit, onUpdateBlock
}) => {
    const widthMap: Record<BuilderDevice, string> = {
        mobile: 'w-[375px]',
        tablet: 'w-[768px]',
        desktop: 'w-full',
    };

    // Refs for each block element (for InlineEditor positioning)
    const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const inlineAnchorRef = useRef<HTMLElement | null>(null);

    // Current page blocks
    const pageBlocks = config.pages[currentPage]?.blocks ?? [];

    // Drag-and-drop image onto a block
    const handleDragOver = useCallback((e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, blockId: string) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith('image/') || !onUpdateBlock) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            onUpdateBlock(blockId, { data: { imageUrl: dataUrl } });
        };
        reader.readAsDataURL(file);
    }, [onUpdateBlock]);

    // Inline edit block lookup
    const inlineBlock = inlineEditBlockId
        ? pageBlocks.find(b => b.id === inlineEditBlockId) ?? null
        : null;
    const inlineAnchor = useRef<HTMLDivElement | null>(null);

    return (
        <main className="flex-1 bg-slate-100 overflow-y-auto p-12 flex justify-center custom-scrollbar relative h-full">
            <div
                className={`transition-all duration-500 ease-in-out bg-white shadow-2xl relative min-h-full ${widthMap[device]} overflow-hidden`}
                onClick={() => { onSelectBlock(null); onStopInlineEdit(); }}
            >
                <div className="builder-canvas-blocks">
                    {pageBlocks.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-dashed border-slate-200">
                                <span className="text-4xl">✨</span>
                            </div>
                            <h2 className="text-xl font-black text-slate-800 mb-2">Página vacía</h2>
                            <p className="text-sm text-slate-400 max-w-xs">Añade bloques desde la biblioteca de la izquierda.</p>
                        </div>
                    )}

                    {pageBlocks.map((block, idx) => (
                        <div
                            key={block.id}
                            ref={(el) => {
                                if (el) {
                                    blockRefs.current.set(block.id, el);
                                    if (block.id === inlineEditBlockId) inlineAnchor.current = el;
                                }
                            }}
                            onClickCapture={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.closest('a, button, input, textarea, select, form')) {
                                    e.preventDefault();
                                }
                                e.stopPropagation();
                                onSelectBlock(block.id);
                            }}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                onStartInlineEdit(block.id);
                            }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, block.id)}
                            className={`relative group/block transition-all cursor-pointer
                                ${selectedBlockId === block.id
                                    ? 'ring-2 ring-indigo-500 ring-inset ring-offset-0 z-20'
                                    : 'hover:ring-1 hover:ring-indigo-300 hover:ring-inset'
                                }
                                ${inlineEditBlockId === block.id ? 'ring-2 ring-violet-500 ring-inset z-30' : ''}
                            `}
                        >
                            {/* Block type badge */}
                            {selectedBlockId === block.id && (
                                <div className="absolute -top-6 left-0 bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-t-lg z-30 uppercase tracking-widest flex items-center gap-1.5">
                                    {block.type}
                                    <span className="opacity-60">#{idx + 1}</span>
                                    <span className="opacity-40 text-[8px]">· Doble clic para editar texto</span>
                                </div>
                            )}

                            {/* Inline edit indicator */}
                            {inlineEditBlockId === block.id && (
                                <div className="absolute -top-6 left-0 bg-violet-600 text-white text-[9px] font-black px-2 py-0.5 rounded-t-lg z-30 uppercase tracking-widest flex items-center gap-1.5">
                                    ✏️ Editando texto inline
                                </div>
                            )}

                            {/* Drop hint for image blocks */}
                            {selectedBlockId === block.id && 'imageUrl' in (block.data ?? {}) && (
                                <div className="absolute top-2 right-2 z-30 pointer-events-none">
                                    <span className="bg-indigo-500/80 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                                        Drop imagen aquí
                                    </span>
                                </div>
                            )}

                            <WebsiteRenderer
                                config={{ ...config, pages: { '/': { ...config.pages[currentPage], blocks: [block] } } }}
                                device={device}
                            />

                        </div>
                    ))}
                </div>
            </div>

            {/* InlineEditor panel */}
            {inlineBlock && inlineAnchor.current && (
                <InlineEditor
                    block={inlineBlock}
                    anchorRef={inlineAnchor as React.RefObject<HTMLElement>}
                    onUpdate={(id, data) => onUpdateBlock?.(id, { data })}
                    onClose={onStopInlineEdit}
                />
            )}

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/80 backdrop-blur shadow-sm rounded-full border border-slate-200 text-[10px] font-bold text-slate-400 z-0 pointer-events-none">
                {device === 'desktop' ? '100% Pantalla' : device === 'tablet' ? '768px (Tablet)' : '375px (Móvil)'}
            </div>
        </main>
    );
};
