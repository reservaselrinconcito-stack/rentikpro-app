/**
 * webpro-sdk.ts — WebPro White-Label SDK
 *
 * SDK mínimo para embeber WebPro en cualquier aplicación React.
 * Permite que terceros integren el editor con su propia marca,
 * colores, plantillas y comportamiento de guardado personalizado.
 *
 * Uso mínimo:
 * ─────────────────────────────────────────────────────────
 * import { WebProSDK, createWebProConfig } from './webpro-sdk';
 *
 * <WebProSDK
 *   config={createWebProConfig({
 *     brand: { name: 'MiApp Builder', primaryColor: '#ff6b35' },
 *     onSave: async (config) => myBackend.save(config),
 *   })}
 * />
 * ─────────────────────────────────────────────────────────
 *
 * API completa en SDKConfig (ver abajo).
 */

import React, { useState, useCallback, useEffect } from 'react';
import { SiteConfigV1 } from './types';
import { WEBPRO_TEMPLATES, WebProTemplate, cloneTemplateConfig } from './templates';
import { exportHtml } from './export';

// ─── SDK Config Type ───────────────────────────────────────────────────────────

export interface SDKBrand {
    /** Display name shown in the editor header */
    name: string;
    /** URL of your logo (SVG or PNG recommended, 32×32px) */
    logoUrl?: string;
    /** Primary brand color (hex) — overrides WebPro's default indigo */
    primaryColor?: string;
    /** Accent color for secondary elements */
    accentColor?: string;
    /** Custom CSS variables injected into the editor root */
    cssVars?: Record<string, string>;
}

export interface SDKTemplateFilter {
    /** Only show templates with these IDs */
    allowedTemplates?: string[];
    /** Hide templates with these IDs */
    blockedTemplates?: string[];
    /** Only show these categories */
    allowedCategories?: string[];
    /** Custom templates to add to the library */
    customTemplates?: WebProTemplate[];
}

export interface SDKFeatureFlags {
    /** Show/hide the Marketplace tab */
    showMarketplace?: boolean;
    /** Show/hide the Export HTML button */
    showExport?: boolean;
    /** Show/hide the Publish button */
    showPublish?: boolean;
    /** Show/hide the AI content generator */
    showAI?: boolean;
    /** Show/hide history (undo/redo & version panel) */
    showHistory?: boolean;
    /** Show/hide multi-page support */
    showMultiPage?: boolean;
    /** Show/hide the theme picker */
    showThemePicker?: boolean;
    /** If true, the editor occupies 100% of its container instead of a fixed full-screen layout */
    embedded?: boolean;
}

export interface SDKCallbacks {
    /**
     * Called whenever the user saves (manually or via autosave).
     * Return a promise — if it rejects, the editor shows an error toast.
     */
    onSave?: (config: SiteConfigV1) => Promise<void>;
    /**
     * Called when the user clicks "Publish" or "Export".
     * If not provided, falls back to HTML download.
     * Return { success: true, liveUrl?: string } or { success: false, error: string }
     */
    onPublish?: (config: SiteConfigV1) => Promise<{ success: boolean; liveUrl?: string; error?: string }>;
    /** Called when the user navigates back to the dashboard */
    onBack?: () => void;
    /** Called on every config change (real-time sync, analytics, etc.) */
    onChange?: (config: SiteConfigV1) => void;
    /** Called once the editor has mounted and is ready */
    onReady?: () => void;
}

export interface SDKConfig {
    brand: SDKBrand;
    templates?: SDKTemplateFilter;
    features?: SDKFeatureFlags;
    callbacks?: SDKCallbacks;
    /** Initial site config to load (optional — if omitted, shows new-site wizard) */
    initialConfig?: SiteConfigV1;
    /** Business context passed to the AI generator */
    businessContext?: string;
    /** Locale for the UI (currently only 'es' is fully supported) */
    locale?: 'es' | 'en';
}

// ─── SDK Context ───────────────────────────────────────────────────────────────

interface WebProSDKContext {
    config: SDKConfig;
    templates: WebProTemplate[];
    features: Required<SDKFeatureFlags>;
}

// Internal context for passing SDK config down the tree
import { createContext, useContext } from 'react';
const SDKCtx = createContext<WebProSDKContext | null>(null);
export const useSDKContext = () => useContext(SDKCtx)!;

// ─── Default feature flags ─────────────────────────────────────────────────────

const DEFAULT_FEATURES: Required<SDKFeatureFlags> = {
    showMarketplace: true,
    showExport: true,
    showPublish: true,
    showAI: true,
    showHistory: true,
    showMultiPage: true,
    showThemePicker: true,
    embedded: false,
};

// ─── createWebProConfig helper ──────────────────────────────────────────────

/**
 * Type-safe config factory with sensible defaults.
 * Use this instead of constructing SDKConfig manually.
 */
export function createWebProConfig(options: {
    brand: SDKBrand;
    templates?: SDKTemplateFilter;
    features?: Partial<SDKFeatureFlags>;
    callbacks?: SDKCallbacks;
    initialConfig?: SiteConfigV1;
    businessContext?: string;
    locale?: 'es' | 'en';
}): SDKConfig {
    return {
        brand: options.brand,
        templates: options.templates,
        features: { ...DEFAULT_FEATURES, ...options.features },
        callbacks: options.callbacks,
        initialConfig: options.initialConfig,
        businessContext: options.businessContext ?? '',
        locale: options.locale ?? 'es',
    };
}

// ─── CSS injection ─────────────────────────────────────────────────────────────

function injectBrandCSS(brand: SDKBrand): () => void {
    const id = 'webpro-sdk-brand';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement('style');
        el.id = id;
        document.head.appendChild(el);
    }

    const primary = brand.primaryColor ?? '#4f46e5';
    const accent = brand.accentColor ?? '#06b6d4';

    const vars: Record<string, string> = {
        '--fp-primary': primary,
        '--fp-accent': accent,
        '--fp-primary-dark': shadeColor(primary, -20),
        '--fp-primary-light': shadeColor(primary, 40),
        '--fp-primary-alpha': primary + '22',
        ...brand.cssVars,
    };

    el.textContent = `:root { ${Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(' ')} }
    .fp-primary { background-color: var(--fp-primary) !important; }
    .fp-primary-text { color: var(--fp-primary) !important; }
    .fp-border-primary { border-color: var(--fp-primary) !important; }`;

    return () => el?.remove();
}

function shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
    const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ─── WebProSDK Component ─────────────────────────────────────────────────────

interface WebProSDKProps {
    config: SDKConfig;
    /** Override the height of the editor container (default: 100vh in fullscreen, 100% in embedded) */
    height?: string;
    className?: string;
}

/**
 * Drop-in WebPro editor with white-label support.
 * Mounts the full editor branded with your config.
 */
export const WebProSDK: React.FC<WebProSDKProps> = ({ config, height, className = '' }) => {
    const features = { ...DEFAULT_FEATURES, ...config.features };

    // Filter templates per SDK config
    const templates = React.useMemo(() => {
        let list = [...WEBPRO_TEMPLATES, ...(config.templates?.customTemplates ?? [])];
        if (config.templates?.allowedTemplates?.length) {
            list = list.filter(t => config.templates!.allowedTemplates!.includes(t.id));
        }
        if (config.templates?.blockedTemplates?.length) {
            list = list.filter(t => !config.templates!.blockedTemplates!.includes(t.id));
        }
        if (config.templates?.allowedCategories?.length) {
            list = list.filter(t => config.templates!.allowedCategories!.includes(t.category));
        }
        return list;
    }, [config.templates]);

    // Inject brand CSS
    useEffect(() => {
        return injectBrandCSS(config.brand);
    }, [config.brand]);

    // Notify ready
    useEffect(() => {
        config.callbacks?.onReady?.();
    }, []);

    const containerStyle: React.CSSProperties = {
        height: height ?? (features.embedded ? '100%' : '100vh'),
        width: '100%',
        position: features.embedded ? 'relative' : 'fixed',
        inset: features.embedded ? undefined : 0,
        zIndex: features.embedded ? undefined : 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    };

    return (
        <SDKCtx.Provider value={{ config, templates, features }}>
            <div style={containerStyle} className={`webpro-sdk-root ${className}`}>
                <SDKEditorShell config={config} features={features} templates={templates} />
            </div>
        </SDKCtx.Provider>
    );
};

// ─── SDK Editor Shell (lightweight UI) ────────────────────────────────────────

const SDKEditorShell: React.FC<{
    config: SDKConfig;
    features: Required<SDKFeatureFlags>;
    templates: WebProTemplate[];
}> = ({ config, features, templates }) => {
    const [siteConfig, setSiteConfig] = useState<SiteConfigV1 | null>(config.initialConfig ?? null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showTemplates, setShowTemplates] = useState(!config.initialConfig);

    const brand = config.brand;
    const primary = brand.primaryColor ?? '#4f46e5';

    const handleSave = useCallback(async (cfg: SiteConfigV1) => {
        if (!config.callbacks?.onSave) return;
        setSaving(true);
        try {
            await config.callbacks.onSave(cfg);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e: any) {
            console.error('[WebPro SDK] Save failed:', e);
        } finally {
            setSaving(false);
        }
    }, [config.callbacks]);

    const handlePublish = useCallback(async (cfg: SiteConfigV1) => {
        if (!config.callbacks?.onPublish) {
            // Fallback: export HTML
            const html = exportHtml(cfg);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
            a.download = `${cfg.slug || 'sitio'}.html`;
            a.click();
            return;
        }
        const result = await config.callbacks.onPublish(cfg);
        if (result.success && result.liveUrl) {
            window.open(result.liveUrl, '_blank');
        }
    }, [config.callbacks]);

    // Template picker screen
    if (showTemplates) {
        return (
            <div className="h-full flex flex-col bg-slate-50">
                {/* SDK Header */}
                <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-4">
                    {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt={brand.name} className="h-8 w-auto" />
                    ) : (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
                            style={{ background: `linear-gradient(135deg, ${primary}, ${config.brand.accentColor ?? '#7c3aed'})` }}>
                            {brand.name.charAt(0)}
                        </div>
                    )}
                    <h1 className="font-black text-slate-900">{brand.name}</h1>
                    {config.callbacks?.onBack && (
                        <button onClick={config.callbacks.onBack} className="ml-auto text-sm text-slate-400 hover:text-slate-700 font-bold">
                            ← Salir
                        </button>
                    )}
                </header>

                {/* Template grid */}
                <div className="flex-1 overflow-y-auto p-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Elige una plantilla</h2>
                    <p className="text-slate-400 mb-8">{templates.length} plantillas disponibles</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {templates.map(t => (
                            <button
                                key={t.id}
                                onClick={async () => {
                                    // Removed demoMode dependency. For Phase 1, just clone the template config.
                                    const cfg = cloneTemplateConfig(t, t.config.slug || 'theme', brand.name);
                                    // cfg.globalData = { ...cfg.globalData, brandName: brand.name }; // Already handled in cloneTemplateConfig
                                    setSiteConfig(cfg);
                                    setShowTemplates(false);
                                }}
                                className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                <div className="h-20 flex items-center justify-center text-3xl" style={{ backgroundColor: t.previewColor + '22' }}>
                                    {t.emoji}
                                </div>
                                <div className="p-3 text-left">
                                    <p className="text-xs font-black text-slate-800">{t.name}</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">{t.config.pages['/']?.blocks.length} bloques</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!siteConfig) return null;

    // Editor header (SDK-branded)
    return (
        <div className="h-full flex flex-col bg-slate-50">
            <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">
                {brand.logoUrl ? (
                    <img src={brand.logoUrl} alt={brand.name} className="h-7 w-auto" />
                ) : (
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black"
                        style={{ background: `linear-gradient(135deg, ${primary}, ${config.brand.accentColor ?? '#7c3aed'})` }}>
                        {brand.name.charAt(0)}
                    </div>
                )}
                <span className="font-black text-slate-800 text-sm">{brand.name}</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-500 truncate">{siteConfig.globalData.brandName}</span>

                <div className="ml-auto flex items-center gap-2">
                    {saved && <span className="text-[10px] font-bold text-emerald-600">✓ Guardado</span>}
                    <button
                        onClick={() => handleSave(siteConfig)}
                        disabled={saving}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                    {features.showPublish && (
                        <button
                            onClick={() => handlePublish(siteConfig)}
                            className="px-4 py-2 text-white rounded-xl text-xs font-black transition-colors"
                            style={{ background: `linear-gradient(135deg, ${primary}, ${config.brand.accentColor ?? '#7c3aed'})` }}
                        >
                            Publicar
                        </button>
                    )}
                </div>
            </header>

            {/* Editor canvas placeholder — replace with full editor integration */}
            <div className="flex-1 flex items-center justify-center bg-slate-100">
                <div className="text-center p-12 max-w-md">
                    <div className="text-5xl mb-4">🛠️</div>
                    <h3 className="text-lg font-black text-slate-700 mb-2">SDK Editor Area</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Aquí se integra el canvas completo de WebPro (<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">WebsiteBuilder</code>).
                        Pasa el <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">siteConfig</code> como <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">initialConfig</code> al componente principal y conecta los callbacks.
                    </p>
                    <div className="mt-6 p-4 bg-white border border-slate-200 rounded-2xl text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Config activa</p>
                        <p className="text-xs font-mono text-slate-600">{siteConfig.globalData.brandName}</p>
                        <p className="text-xs font-mono text-slate-400">/{siteConfig.slug} · {Object.keys(siteConfig.pages).length} páginas</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Imperative API ────────────────────────────────────────────────────────────

/**
 * Imperative API for non-React environments or quick integrations.
 * Mounts WebPro into a DOM element.
 *
 * @example
 * const sdk = WebProAPI.mount('#my-container', {
 *   brand: { name: 'MyApp', primaryColor: '#ff6b35' },
 *   callbacks: { onSave: (cfg) => fetch('/api/save', { method: 'POST', body: JSON.stringify(cfg) }) }
 * });
 *
 * // Later:
 * sdk.unmount();
 * sdk.getSiteConfig();
 */
export const WebProAPI = {
    mount(selector: string | HTMLElement, options: Omit<WebProSDKProps, 'config'> & { brand: SDKBrand } & Omit<SDKConfig, 'brand'>) {
        const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!el) throw new Error(`[WebPro SDK] Element not found: ${selector}`);

        const { brand, features, templates, callbacks, initialConfig, businessContext, locale, ...rest } = options as any;
        const sdkConfig = createWebProConfig({ brand, features, templates, callbacks, initialConfig, businessContext, locale });

        // Dynamic import of ReactDOM to avoid bundling issues
        import('react-dom/client').then(({ createRoot }) => {
            const root = createRoot(el as HTMLElement);
            root.render(React.createElement(WebProSDK, { config: sdkConfig, ...rest }));
            (el as any).__webpro_root = root;
        });

        return {
            unmount: () => (el as any).__webpro_root?.unmount(),
            getSiteConfig: () => (el as any).__webpro_config as SiteConfigV1 | null,
        };
    },
};

// ─── Re-exports for convenience ────────────────────────────────────────────────

export type { SiteConfigV1, WebProTemplate };
export { WEBPRO_TEMPLATES, cloneTemplateConfig };
