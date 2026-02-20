import React, { useState } from 'react';
import { SiteConfig } from '../types';
import {
    User, Type, Image as ImageIcon, MapPin,
    MessageSquare, UploadCloud, Globe, Phone, ListChecks
} from 'lucide-react';

// --- TYPES & STEPS ---

export type WizardStep = 'content' | 'media' | 'seo';

interface WizardStepsProps {
    step: WizardStep;
    config: SiteConfig;
    onChange: (updates: Partial<SiteConfig>) => void;
}

// --- SUB-COMPONENTS ---

const ContentStep: React.FC<{ config: SiteConfig, onChange: (u: Partial<SiteConfig>) => void }> = ({ config, onChange }) => {
    const updateBrand = (f: string, v: string) => onChange({ brand: { ...config.brand, [f]: v } });
    const updateHero = (f: string, v: string) => onChange({ hero: { ...config.hero, [f]: v } });
    const updateContact = (f: string, v: string) => onChange({ contact: { ...config.contact, [f]: v } });

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            {/* BRAND */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={16} /> Identidad</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Nombre del Sitio (Brand)</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={config.brand.name}
                            onChange={e => updateBrand('name', e.target.value)}
                            placeholder="Ej. Casa Rural El Valle"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Eslogan (Tagline)</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={config.brand.tagline || ''}
                            onChange={e => updateBrand('tagline', e.target.value)}
                            placeholder="Ej. Descanso y naturaleza..."
                        />
                    </div>
                </div>
            </div>

            {/* HERO TEXT */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Type size={16} /> Portada</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Título Principal</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={config.hero.title}
                            onChange={e => updateHero('title', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Subtítulo</label>
                        <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none h-20"
                            value={config.hero.subtitle}
                            onChange={e => updateHero('subtitle', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* CONTACT */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Phone size={16} /> Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp / Teléfono</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={config.contact.whatsapp || ''}
                            onChange={e => updateContact('whatsapp', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={config.contact.email}
                            onChange={e => updateContact('email', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const MediaStep: React.FC<{ config: SiteConfig, onChange: (u: Partial<SiteConfig>) => void }> = ({ config, onChange }) => {
    const updateHero = (f: string, v: string) => onChange({ hero: { ...config.hero, [f]: v } });

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ImageIcon size={16} /> Imagen de Portada</h3>

                <div className="space-y-4">
                    {config.hero.imageUrl && (
                        <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
                            <img src={config.hero.imageUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white font-bold text-xs">Cambiar Imagen</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                            value={config.hero.imageUrl}
                            onChange={e => updateHero('imageUrl', e.target.value)}
                            placeholder="https://..."
                        />
                        <button className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100"><UploadCloud size={18} /></button>
                    </div>
                    <p className="text-[10px] text-slate-400">Pega una URL o usa el botón para subir (simulado).</p>
                </div>
            </div>

            {/* Placeholder for Gallery Management - could be expanded later */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 opacity-60">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ListChecks size={16} /> Galería</h3>
                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">Próximamente</span>
                </div>
                <p className="text-xs text-slate-400">La gestión avanzada de galería estará disponible en la próxima actualización.</p>
            </div>
        </div>
    );
};

const SeoStep: React.FC<{ config: SiteConfig, onChange: (u: Partial<SiteConfig>) => void }> = ({ config, onChange }) => {
    // We update config root or a nested 'seo' object if we had one. 
    // Currently SiteConfig doesn't have a dedicated 'seo' object in 'types.ts' visible in context, 
    // but the `rp-web/site.js` uses `config.title` (root?). 
    // Let's assume we map 'brand.name' to title if needed or add SEO fields to types.
    // For now, let's assume we edit `brand.name` as title and add `seo_description` if supported.
    // Wait, `types.ts` has `brand`, `hero`... looking at defaults.ts from memory.
    // Let's just edit `brand.tagline` as description proxy or add checks.

    // Actually, `WebsiteBuilder.tsx` used `seo_title`, `seo_description` on the `WebSite` object, 
    // NOT inside `SiteConfig` JSON.
    // BUT `rp-web` renders based on `SiteConfig`. 
    // So we need `SiteConfig` to have SEO fields or we inject them during publish.
    // `rp-web/site.js` uses `config.seo_description` at line 40.
    // So `SiteConfig` needs these fields. We will cast/add them arbitrarily for now as Partial.

    const updateSeo = (field: string, val: string) => {
        onChange({ [field]: val } as any);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Globe size={16} /> Optimización (SEO)</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Título SEO (Meta Title)</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={(config as any).seo_title || config.brand.name || ''}
                            onChange={e => updateSeo('seo_title', e.target.value)}
                            placeholder="Título que aparece en Google..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Descripción (Meta Description)</label>
                        <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none h-24"
                            value={(config as any).seo_description || ''}
                            onChange={e => updateSeo('seo_description', e.target.value)}
                            placeholder="Breve descripción para buscadores..."
                        />
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xl">G</div>
                <div>
                    <p className="text-xs text-indigo-800 font-bold truncate w-64">{(config as any).seo_title || config.brand.name || 'Título de tu web'}</p>
                    <p className="text-[10px] text-green-700 truncate">https://{(config as any).slug || 'tu-sitio'}.rentik.pro</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2">{(config as any).seo_description || 'Descripción de tu sitio web...'}</p>
                </div>
            </div>
        </div>
    );
};

export const WizardSteps: React.FC<WizardStepsProps> = (props) => {
    switch (props.step) {
        case 'content': return <ContentStep {...props} />;
        case 'media': return <MediaStep {...props} />;
        case 'seo': return <SeoStep {...props} />;
        default: return null;
    }
};
