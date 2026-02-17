
import React from 'react';
import { EmailTemplateSpec, MediaAsset } from '../types';
import { Monitor, Smartphone } from 'lucide-react';

interface Props {
    spec: EmailTemplateSpec;
    mediaAssets: MediaAsset[];
    viewMode: 'desktop' | 'mobile';
    onViewModeChange: (mode: 'desktop' | 'mobile') => void;
}

export const EmailTemplatePreview: React.FC<Props> = ({ spec, mediaAssets, viewMode, onViewModeChange }) => {
    const getMediaUrl = (id?: string) => {
        if (!id) return '';
        const asset = mediaAssets.find(a => a.id === id);
        return asset ? `data:${asset.mime_type};base64,${asset.data_base64}` : '';
    };

    const heroImage = getMediaUrl(spec.hero.image_media_id);
    const logoImage = getMediaUrl(spec.header.logo_media_id);

    return (
        <div className="flex flex-col h-full bg-slate-100 rounded-3xl overflow-hidden shadow-inner relative">
            {/* Toggle View */}
            <div className="absolute top-4 right-4 flex bg-white/80 backdrop-blur shadow-sm rounded-xl p-1 z-10">
                <button
                    onClick={() => onViewModeChange('desktop')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'desktop' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Monitor size={18} />
                </button>
                <button
                    onClick={() => onViewModeChange('mobile')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'mobile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Smartphone size={18} />
                </button>
            </div>

            <div className={`flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start transition-all duration-500`}>
                <div
                    className="bg-white shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200"
                    style={{
                        width: viewMode === 'mobile' ? '375px' : '100%',
                        maxWidth: '600px',
                        minHeight: '400px',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                >
                    {/* Email Header */}
                    <div className="p-6 flex items-center gap-4 border-b border-slate-50">
                        {logoImage ? (
                            <img src={logoImage} alt="Logo" className="h-10 w-auto object-contain" />
                        ) : (
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold">
                                {spec.header.business_name[0]}
                            </div>
                        )}
                        <span className="font-bold text-slate-800">{spec.header.business_name}</span>
                    </div>

                    {/* Hero Section */}
                    <div className="relative">
                        {heroImage ? (
                            <img src={heroImage} alt="Hero" className="w-full h-48 object-cover" />
                        ) : (
                            <div className="w-full h-48 bg-slate-200 flex items-center justify-center text-slate-400 italic text-sm">
                                Sin imagen de portada
                            </div>
                        )}
                        <div className="p-8 bg-gradient-to-b from-transparent to-black/50 absolute bottom-0 left-0 right-0">
                            <h1 className="text-2xl font-black text-white drop-shadow-md">{spec.hero.title}</h1>
                            <p className="text-white/90 text-sm font-medium">{spec.hero.subtitle}</p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-8">
                        <div className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                            {spec.body.text}
                        </div>

                        {/* Offer Badge */}
                        {spec.offer.enabled && (
                            <div className="mt-8 p-6 bg-amber-50 rounded-2xl border-2 border-dashed border-amber-200 text-center">
                                <span className="inline-block px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black tracking-widest mb-2">
                                    {spec.offer.badge_text}
                                </span>
                                <p className="text-amber-900 font-black text-lg">{spec.offer.detail_text}</p>
                            </div>
                        )}

                        {/* CTA */}
                        {spec.cta.enabled && (
                            <div className="mt-8 text-center">
                                <a
                                    href={spec.cta.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:shadow-indigo-200 hover:scale-105 transition-all text-sm"
                                >
                                    {spec.cta.button_text}
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 p-8 text-center border-t border-slate-100">
                        <p className="text-slate-400 font-bold text-xs mb-2">Contacto: {spec.footer.phone}</p>
                        {spec.footer.social_links.length > 0 && (
                            <div className="flex justify-center gap-4 mb-4">
                                {spec.footer.social_links.map(link => (
                                    <span key={link} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{link}</span>
                                ))}
                            </div>
                        )}
                        {spec.footer.unsubscription_notice && (
                            <p className="text-[8px] text-slate-300 italic">
                                Este es un mensaje automático de {spec.header.business_name}.
                                Si no deseas recibir más comunicaciones, puedes darte de baja respondiendo a este email.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
