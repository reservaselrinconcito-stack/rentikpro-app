import React, { useState, useRef, useEffect } from 'react';
import { ImageAsset } from '../types';
import { Image as ImageIcon, Crosshair, Check, ChevronDown, Move } from 'lucide-react';

interface ImageFieldEditorProps {
    label?: string;
    imageUrl: string;
    imageFocal?: { x: number; y: number };
    imageFit?: 'cover' | 'contain';
    assets: ImageAsset[];
    onChange: (data: { imageUrl?: string; imageFocal?: { x: number; y: number }; imageFit?: 'cover' | 'contain' }) => void;
}

export const ImageFieldEditor: React.FC<ImageFieldEditorProps> = ({
    label = "Imagen de Fondo",
    imageUrl,
    imageFocal = { x: 50, y: 50 },
    imageFit = 'cover',
    assets,
    onChange
}) => {
    const [isSelecting, setIsSelecting] = useState(false);
    const [isPositioning, setIsPositioning] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleLibrarySelect = (url: string) => {
        onChange({ imageUrl: url });
        setIsSelecting(false);
    };

    const handleFocalClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPositioning || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

        onChange({ imageFocal: { x: Math.round(x), y: Math.round(y) } });
    };

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{label}</span>
                <button
                    onClick={() => setIsSelecting(!isSelecting)}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                    <ImageIcon size={14} />
                    Cambiar
                </button>
            </div>

            {isSelecting ? (
                <div className="bg-white border text-center border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto custom-scrollbar mb-4">
                    <p className="text-xs font-bold text-slate-500 mb-3">Elige desde tu Librería ({assets.length})</p>
                    {assets.length === 0 ? (
                        <p className="text-xs text-slate-400">No hay imágenes. Súbelas en la pestaña "Librería".</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {assets.map(asset => (
                                <div
                                    key={asset.id}
                                    onClick={() => handleLibrarySelect(asset.url)}
                                    className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 ${imageUrl === asset.url ? 'border-indigo-500' : 'border-transparent hover:border-slate-300'}`}
                                >
                                    <img src={asset.url} className="w-full h-full object-cover" />
                                    {imageUrl === asset.url && (
                                        <div className="absolute top-1 right-1 bg-indigo-500 text-white p-0.5 rounded-full">
                                            <Check size={12} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}

            {/* Preview and Focal Point Editor */}
            <div className="relative aspect-video bg-slate-200 rounded-lg overflow-hidden group mb-4"
                ref={containerRef}
                onClick={handleFocalClick}
                style={{ cursor: isPositioning ? 'crosshair' : 'default' }}
            >
                <img
                    src={imageUrl}
                    className="w-full h-full"
                    style={{
                        objectFit: imageFit,
                        objectPosition: `${imageFocal.x}% ${imageFocal.y}%`,
                        opacity: isPositioning ? 0.8 : 1
                    }}
                />

                {/* Focal Point Indicator */}
                <div
                    className="absolute w-4 h-4 bg-indigo-500 border-2 border-white rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200"
                    style={{
                        left: `${imageFocal.x}%`,
                        top: `${imageFocal.y}%`,
                        opacity: 1
                    }}
                >
                    <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                </div>

                {/* Overlay Toggle for Positioning */}
                {!isPositioning && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsPositioning(true); }}
                        className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-indigo-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-md flex items-center gap-1 backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Crosshair size={12} /> Ajustar Foco
                    </button>
                )}

                {isPositioning && (
                    <div className="absolute inset-x-0 bottom-0 bg-indigo-900/90 text-white text-xs font-medium p-2 text-center flex items-center justify-between backdrop-blur-md">
                        <span className="flex items-center gap-1"><Move size={12} /> Haz clic para mover el centro</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsPositioning(false); }}
                            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
                        >
                            Listo
                        </button>
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-bold text-slate-600">Comportamiento</span>
                <select
                    value={imageFit}
                    onChange={(e) => onChange({ imageFit: e.target.value as 'cover' | 'contain' })}
                    className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-md px-2 py-1 outline-none"
                >
                    <option value="cover">Rellenar (Cover)</option>
                    <option value="contain">Contener (Contain)</option>
                </select>
            </div>

            <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-bold text-slate-600">Coordenadas (x,y)</span>
                <span className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">
                    {imageFocal.x}%, {imageFocal.y}%
                </span>
            </div>
        </div>
    );
};
