
import React, { useState } from 'react';
import { EmailTemplateSpec, MediaAsset } from '../types';
import { Image as ImageIcon, Type, Hash, Link as LinkIcon, Trash2, Layout, CheckCircle2, X } from 'lucide-react';

interface Props {
    spec: EmailTemplateSpec;
    onChange: (newSpec: EmailTemplateSpec) => void;
    mediaAssets: MediaAsset[];
}

export const EmailTemplateEditor: React.FC<Props> = ({ spec, onChange, mediaAssets }) => {
    const [selectedSection, setSelectedSection] = useState<string>('header');
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [mediaTarget, setMediaTarget] = useState<{ section: string, field: string } | null>(null);

    const updateSpec = (section: keyof EmailTemplateSpec, field: string, value: any) => {
        const newSpec = { ...spec };
        (newSpec[section] as any)[field] = value;
        onChange(newSpec);
    };

    const handleOpenMedia = (section: string, field: string) => {
        setMediaTarget({ section, field });
        setIsMediaModalOpen(true);
    };

    const handleSelectMedia = (assetId: string) => {
        if (mediaTarget) {
            updateSpec(mediaTarget.section as any, mediaTarget.field, assetId);
        }
        setIsMediaModalOpen(false);
        setMediaTarget(null);
    };

    const getMediaUrl = (id?: string) => {
        if (!id) return '';
        const asset = mediaAssets.find(a => a.id === id);
        return asset ? `data:${asset.mime_type};base64,${asset.data_base64}` : '';
    };

    const sections = [
        { id: 'header', label: 'Encabezado', icon: <Layout size={18} /> },
        { id: 'hero', label: 'Portada (Hero)', icon: <ImageIcon size={18} /> },
        { id: 'body', label: 'Cuerpo Texto', icon: <Type size={18} /> },
        { id: 'offer', label: 'Oferta / Cupón', icon: <Hash size={18} /> },
        { id: 'cta', label: 'Botón Acción', icon: <LinkIcon size={18} /> },
        { id: 'footer', label: 'Pie de Página', icon: <X size={18} className="rotate-45" /> },
    ];

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/50">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelectedSection(s.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${selectedSection === s.id ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        {s.icon} {s.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-auto p-8 space-y-8 animate-in fade-in duration-300">
                {selectedSection === 'header' && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre del Negocio</label>
                            <input
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={spec.header.business_name}
                                onChange={(e) => updateSpec('header', 'business_name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Logo (Opcional)</label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
                                    {spec.header.logo_media_id ? (
                                        <img src={getMediaUrl(spec.header.logo_media_id)} className="w-full h-full object-contain" />
                                    ) : (
                                        <ImageIcon className="text-slate-300" size={32} />
                                    )}
                                </div>
                                <button
                                    onClick={() => handleOpenMedia('header', 'logo_media_id')}
                                    className="px-5 py-3 bg-white border border-slate-200 text-slate-600 font-black text-xs rounded-xl hover:bg-slate-50 shadow-sm"
                                >
                                    {spec.header.logo_media_id ? 'Cambiar Logo' : 'Seleccionar Logo'}
                                </button>
                                {spec.header.logo_media_id && (
                                    <button onClick={() => updateSpec('header', 'logo_media_id', undefined)} className="text-rose-500 hover:text-rose-600 p-2"><Trash2 size={20} /></button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedSection === 'hero' && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Título Portada</label>
                            <input
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={spec.hero.title}
                                onChange={(e) => updateSpec('hero', 'title', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Subtítulo</label>
                            <input
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={spec.hero.subtitle}
                                onChange={(e) => updateSpec('hero', 'subtitle', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Imagen Hero</label>
                            <div
                                className="w-full h-48 bg-slate-100 rounded-3xl overflow-hidden relative group cursor-pointer border-2 border-dashed border-slate-200"
                                onClick={() => handleOpenMedia('hero', 'image_media_id')}
                            >
                                {spec.hero.image_media_id ? (
                                    <img src={getMediaUrl(spec.hero.image_media_id)} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <ImageIcon size={48} />
                                        <span className="font-bold text-xs uppercase tracking-widest">Seleccionar Imagen</span>
                                    </div>
                                )}
                                {spec.hero.image_media_id && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-black text-xs uppercase tracking-widest">Cambiar Imagen</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedSection === 'body' && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Texto Principal</label>
                            <textarea
                                rows={10}
                                className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-medium leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={spec.body.text}
                                onChange={(e) => updateSpec('body', 'text', e.target.value)}
                            />
                            <p className="mt-4 text-[10px] text-slate-400 italic font-bold">Variables soportadas: {'{{nombre}}'}, {'{{apellidos}}'}, {'{{email}}'}</p>
                        </div>
                    </div>
                )}

                {selectedSection === 'offer' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <span className="font-black text-xs text-slate-700 uppercase tracking-widest">Mostrar Sección Oferta</span>
                            <button
                                onClick={() => updateSpec('offer', 'enabled', !spec.offer.enabled)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${spec.offer.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${spec.offer.enabled ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                        {spec.offer.enabled && (
                            <>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Texto Distintivo (Badge)</label>
                                    <input
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-amber-600 uppercase tracking-widest"
                                        value={spec.offer.badge_text}
                                        onChange={(e) => updateSpec('offer', 'badge_text', e.target.value)}
                                        placeholder="Ej. REGALO / 10% OFF"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Detalle de la Oferta</label>
                                    <input
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                                        value={spec.offer.detail_text}
                                        onChange={(e) => updateSpec('offer', 'detail_text', e.target.value)}
                                        placeholder="Ej. Un detalle especial por tu cumpleaños"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {selectedSection === 'cta' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <span className="font-black text-xs text-slate-700 uppercase tracking-widest">Mostrar Botón Acción</span>
                            <button
                                onClick={() => updateSpec('cta', 'enabled', !spec.cta.enabled)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${spec.cta.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${spec.cta.enabled ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                        {spec.cta.enabled && (
                            <>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Texto del Botón</label>
                                    <input
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest"
                                        value={spec.cta.button_text}
                                        onChange={(e) => updateSpec('cta', 'button_text', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">URL Enlace</label>
                                    <input
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium"
                                        value={spec.cta.url}
                                        onChange={(e) => updateSpec('cta', 'url', e.target.value)}
                                        placeholder="https://..."
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {selectedSection === 'footer' && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Teléfono Contacto</label>
                            <input
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                                value={spec.footer.phone}
                                onChange={(e) => updateSpec('footer', 'phone', e.target.value)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <span className="font-black text-xs text-slate-700 uppercase tracking-widest">Aviso de Baja</span>
                            <button
                                onClick={() => updateSpec('footer', 'unsubscription_notice', !spec.footer.unsubscription_notice)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${spec.footer.unsubscription_notice ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${spec.footer.unsubscription_notice ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Media Selector Modal */}
            {isMediaModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-12 overflow-hidden">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Galería de Imágenes</h3>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Selecciona una imagen para tu plantilla</p>
                            </div>
                            <button onClick={() => setIsMediaModalOpen(false)} className="bg-white p-3 rounded-2xl shadow-sm text-slate-400 hover:text-rose-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-8">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {mediaAssets.length === 0 ? (
                                    <div className="col-span-full py-20 text-center text-slate-400 italic">
                                        <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                                        No hay imágenes cargadas en el sistema.
                                    </div>
                                ) : (
                                    mediaAssets.map(asset => (
                                        <button
                                            key={asset.id}
                                            onClick={() => handleSelectMedia(asset.id)}
                                            className="group relative aspect-video bg-slate-100 rounded-3xl overflow-hidden border-2 border-transparent hover:border-indigo-600 transition-all shadow-sm hover:shadow-xl"
                                        >
                                            <img src={`data:${asset.mime_type};base64,${asset.data_base64}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <CheckCircle2 className="text-white drop-shadow-lg" size={40} />
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
