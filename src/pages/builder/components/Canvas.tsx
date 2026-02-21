import React from 'react';
import { WebsiteRenderer } from '../../../modules/webBuilder/components/WebsiteRenderer';
import { SiteConfigV1 } from '../../../modules/webBuilder/types';
import { BuilderDevice } from '../types';

interface CanvasProps {
    config: SiteConfigV1;
    device: BuilderDevice;
    selectedBlockId: string | null;
    onSelectBlock: (id: string | null) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    config, device, selectedBlockId, onSelectBlock
}) => {
    // Determine canvas width based on device
    const widthMap = {
        mobile: 'w-[375px]',
        tablet: 'w-[768px]',
        desktop: 'w-full'
    };

    return (
        <main className="flex-1 bg-slate-100 overflow-y-auto p-12 flex justify-center custom-scrollbar relative">
            <div className={`transition-all duration-500 ease-in-out bg-white shadow-2xl relative min-h-full ${widthMap[device]} overflow-hidden`}>

                {/* Visual selection layer (Invisible overlay with pointers) */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {config.pages['/']?.blocks.map(block => (
                        <div
                            key={`outline-${block.id}`}
                            style={{
                                // This is a bit tricky without knowing actual heights, 
                                // but we'll use a CSS strategy where the block itself handles the click
                            }}
                        />
                    ))}
                </div>

                {/* THE RENDERER */}
                <div className="relative group">
                    {/* We wrap the blocks in a clickable container */}
                    <div className="builder-canvas-blocks">
                        {config.pages['/']?.blocks.map((block, idx) => (
                            <div
                                key={block.id}
                                onClickCapture={(e) => {
                                    e.stopPropagation();
                                    onSelectBlock(block.id);
                                }}
                                className={`relative group/block transition-all cursor-pointer
                                    ${selectedBlockId === block.id
                                        ? 'ring-2 ring-indigo-500 ring-inset ring-offset-0 z-20'
                                        : 'hover:ring-1 hover:ring-indigo-300 hover:ring-inset'
                                    }
                                `}
                            >
                                {/* Selection Indicator */}
                                {selectedBlockId === block.id && (
                                    <div className="absolute -top-6 left-0 bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-t-lg z-30 uppercase tracking-widest">
                                        {block.type}
                                    </div>
                                )}

                                <WebsiteRenderer
                                    config={{ ...config, pages: { '/': { ...config.pages['/'], blocks: [block] } } }}
                                />

                                <div className="absolute inset-0 bg-transparent" />
                            </div>
                        ))}
                    </div>
                </div>

                {config.pages['/']?.blocks.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center pointer-events-none">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-dashed border-slate-200">
                            <span className="text-4xl">✨</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">Tu lienzo está vacío</h2>
                        <p className="text-sm text-slate-400 max-w-xs">Añade bloques desde la biblioteca de la izquierda para empezar a construir tu sitio.</p>
                    </div>
                )}
            </div>

            {/* Device Background indicators */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/80 backdrop-blur shadow-sm rounded-full border border-slate-200 text-[10px] font-bold text-slate-400 z-0">
                Lienzo: {device === 'desktop' ? '100% Pantalla' : device === 'tablet' ? '768px (Tablet)' : '375px (Móvil)'}
            </div>
        </main>
    );
};
