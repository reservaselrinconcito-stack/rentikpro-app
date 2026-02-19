import React, { useState, useEffect } from 'react';
import { SiteConfig } from '../types';
import { validateSlug, normalizeSlug } from '../slug';
import { Globe, Save, UploadCloud, AlertCircle, CheckCircle } from 'lucide-react';

interface PublishPanelProps {
    config: SiteConfig;
    onChange: (updates: Partial<SiteConfig>) => void;
    onSaveDraft: () => Promise<void>;
    onPublish: () => Promise<void>;
    isSaving: boolean;
    lastSavedAt?: number;
}

export const PublishPanel: React.FC<PublishPanelProps> = ({ config, onChange, onSaveDraft, onPublish, isSaving, lastSavedAt }) => {
    const [slugError, setSlugError] = useState<string | null>(null);

    // Validate on mount and change
    useEffect(() => {
        setSlugError(validateSlug(config.slug));
    }, [config.slug]);

    const handleSlugChange = (val: string) => {
        // Normalize on type (per requirements: lowercase, no accents, spaces to hyphens)
        // But maybe let user type freely and normalize on blur? 
        // Requirement: "convertir espacios a guiones", "normalizar acentos". 
        // Doing it live is usually better for "slug" inputs.
        const normalized = normalizeSlug(val);
        onChange({ slug: normalized });
    };

    const PREVIEW_BASE_URL = import.meta.env.VITE_PUBLIC_WEB_BASE || 'https://rp-web-6h9.pages.dev';
    const finalUrl = `${PREVIEW_BASE_URL}/?slug=${config.slug || '...'}`;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div>
                <h3 className="text-xl font-black text-slate-800">Publicar Sitio</h3>
                <p className="text-sm text-slate-500">Configura la dirección web y haz visible tu sitio.</p>
            </div>

            {/* Slug Config */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wide">Dirección Web (Slug)</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                    <Globe className="text-slate-400" size={20} />
                    <span className="text-slate-400 font-medium text-sm">rentik.pro/</span>
                    <input
                        className="flex-1 bg-transparent outline-none font-bold text-slate-800 placeholder-slate-300"
                        value={config.slug}
                        onChange={e => handleSlugChange(e.target.value)}
                        placeholder="nombre-de-tu-alojamiento"
                    />
                </div>

                {slugError ? (
                    <p className="mt-2 text-xs font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {slugError}
                    </p>
                ) : (
                    <p className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={12} /> URL válida
                    </p>
                )}

                <div className="mt-3 p-3 bg-indigo-50 rounded-lg">
                    <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">URL Final</p>
                    <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-700 underline break-all font-mono">
                        {finalUrl}
                    </a>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={onSaveDraft}
                    disabled={isSaving}
                    className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50"
                >
                    <Save size={24} className="text-slate-600 mb-2" />
                    <span className="font-bold text-slate-800">Guardar Borrador</span>
                    {lastSavedAt && <span className="text-[10px] text-slate-400 mt-1">Guardado {new Date(lastSavedAt).toLocaleTimeString()}</span>}
                </button>

                <button
                    onClick={onPublish}
                    disabled={!!slugError || isSaving}
                    className="flex flex-col items-center justify-center p-6 bg-slate-900 border border-slate-900 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
                >
                    <UploadCloud size={24} className="text-white mb-2" />
                    <span className="font-bold text-white">Publicar Ahora</span>
                    <span className="text-[10px] text-slate-400 mt-1">Hacer visible en internet</span>
                </button>
            </div>
        </div>
    );
};
