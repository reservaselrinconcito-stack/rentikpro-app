import React from 'react';
import {
    Type, Image as ImageIcon, Palette,
    Settings, Maximize, AlignLeft,
    AlignCenter, AlignRight, Trash2,
    MoveUp, MoveDown, Plus, X, Link
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

const STRING_FIELD_LABELS: Record<string, string> = {
    title: 'Título',
    subtitle: 'Subtítulo',
    ctaLabel: 'Etiqueta Botón',
    ctaHref: 'URL Botón',
    secondaryCtaLabel: 'Botón secundario',
    secondaryCtaHref: 'URL Botón secundario',
    kicker: 'Kicker',
    address: 'Dirección',
    phone: 'Teléfono',
    email: 'Email',
    brandName: 'Nombre del Alojamiento',
    text: 'Contenido',
    mapEmbed: 'Embed Google Maps',
    whatsappNumber: 'WhatsApp',
    whatsappMessage: 'Mensaje WhatsApp',
    bookingUrl: 'URL Reservas',
    seoTitle: 'Título SEO',
    seoDescription: 'Descripción SEO',
};

const URL_FIELDS = new Set(['ctaHref', 'secondaryCtaHref', 'bookingUrl', 'mapEmbed', 'imageUrl', 'logoUrl']);

function pickFile(onResult: (dataUrl: string) => void) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = (e: any) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => onResult(ev.target?.result as string);
        r.readAsDataURL(f);
    };
    inp.click();
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
        if (val === undefined && device !== 'desktop') {
            return selectedBlock.styles.desktop?.[key as keyof typeof selectedBlock.styles.desktop] || '';
        }
        return val || '';
    };

    const renderStringField = (key: string, val: string) => {
        const label = STRING_FIELD_LABELS[key] || key;
        const isUrl = URL_FIELDS.has(key);
        const isMultiLine = !isUrl && (key === 'subtitle' || key === 'text' || key === 'seoDescription' || key === 'whatsappMessage' || key === 'mapEmbed');
        return (
            <div key={key} className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                    {isUrl && <Link size={10} className="text-indigo-400" />}
                    {label}
                </label>
                {isMultiLine ? (
                    <textarea
                        value={val}
                        onChange={e => updateData(key, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-medium outline-none focus:border-indigo-500 transition-colors resize-none"
                        rows={3}
                    />
                ) : (
                    <input
                        type="text"
                        value={val}
                        onChange={e => updateData(key, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-medium outline-none focus:border-indigo-500 transition-colors"
                    />
                )}
            </div>
        );
    };

    const renderImageField = (key: string, val: string) => {
        const label = key === 'imageUrl' ? 'Imagen' : key === 'logoUrl' ? 'Logo' : key;
        return (
            <div key={key} className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">{label}</label>
                {val && (
                    <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-100 mb-2">
                        <img src={val} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        value={val}
                        onChange={e => updateData(key, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                        title="Subir imagen"
                        className="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shrink-0"
                        onClick={() => pickFile(dataUrl => updateData(key, dataUrl))}
                    >
                        <ImageIcon size={16} />
                    </button>
                </div>
            </div>
        );
    };

    const renderStringArrayField = (key: string, arr: string[]) => {
        const label = key === 'features' ? 'Amenities / Características' : key === 'images' ? 'Imágenes' : key;
        const isImages = key === 'images';
        return (
            <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</label>
                    <button
                        onClick={() => updateData(key, [...arr, isImages ? 'https://' : ''])}
                        className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <Plus size={10} /> Añadir
                    </button>
                </div>
                <div className="space-y-2">
                    {arr.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-start group">
                            {isImages ? (
                                <div className="flex-1 space-y-1">
                                    {item && item.startsWith('http') && (
                                        <img src={item} alt="" className="w-full h-16 object-cover rounded-lg mb-1" />
                                    )}
                                    <div className="flex gap-1.5">
                                        <input
                                            value={item}
                                            onChange={e => { const next = [...arr]; next[idx] = e.target.value; updateData(key, next); }}
                                            placeholder="https://..."
                                            className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-medium outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            title="Subir imagen"
                                            className="p-2 bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                            onClick={() => pickFile(dataUrl => { const next = [...arr]; next[idx] = dataUrl; updateData(key, next); })}
                                        >
                                            <ImageIcon size={12} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <input
                                    value={item}
                                    onChange={e => { const next = [...arr]; next[idx] = e.target.value; updateData(key, next); }}
                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-medium outline-none focus:border-indigo-500"
                                />
                            )}
                            <button
                                onClick={() => updateData(key, arr.filter((_, i) => i !== idx))}
                                className="mt-1 p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderBooleanField = (key: string, val: boolean) => {
        const label = key === 'showPrices' ? 'Mostrar precios' : key === 'showAvailability' ? 'Mostrar disponibilidad' : key;
        return (
            <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">{label}</span>
                <button
                    onClick={() => updateData(key, !val)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${val ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
            </div>
        );
    };

    const renderDataFields = () => {
        return Object.entries(selectedBlock.data).map(([key, val]) => {
            if (key === 'imageUrl' || key === 'logoUrl') {
                return renderImageField(key, val as string);
            }
            if (typeof val === 'string') {
                const isKnown = STRING_FIELD_LABELS[key] || key.toLowerCase().includes('text') || key.toLowerCase().includes('label') || key.toLowerCase().includes('href') || key.toLowerCase().includes('url') || key.toLowerCase().includes('title') || key.toLowerCase().includes('subtitle') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('email') || key.toLowerCase().includes('address') || key.toLowerCase().includes('name') || key.toLowerCase().includes('kicker') || key.toLowerCase().includes('message');
                if (isKnown) return renderStringField(key, val);
                return null;
            }
            if (typeof val === 'boolean') {
                return renderBooleanField(key, val);
            }
            if (Array.isArray(val) && (val.length === 0 || typeof val[0] === 'string')) {
                return renderStringArrayField(key, val as string[]);
            }
            return null;
        });
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

            <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Editando: <span className="text-indigo-600">{device}</span></span>
                <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded font-mono text-[9px]">{selectedBlock.type}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {tab === 'content' && (
                    <div className="p-5 space-y-5">
                        {/* Block controls */}
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] text-slate-300 font-mono tracking-tighter">{selectedBlock.id}</p>
                            <div className="flex gap-1">
                                <button onClick={() => onMoveBlock(blockIndex, 'up')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="Subir bloque">
                                    <MoveUp size={14} />
                                </button>
                                <button onClick={() => onMoveBlock(blockIndex, 'down')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="Bajar bloque">
                                    <MoveDown size={14} />
                                </button>
                                <button onClick={() => onRemoveBlock(selectedBlock.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Eliminar bloque">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        {renderDataFields()}
                    </div>
                )}

                {tab === 'style' && (
                    <div className="p-5 space-y-8">
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
                                <button
                                    onClick={() => updateStyle('display', getStyleValue('display') === 'none' ? 'block' : 'none')}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${getStyleValue('display') === 'none' ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${getStyleValue('display') === 'none' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
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
