/**
 * src/pages/WebsiteBuilder.tsx — Editor Web Ferrari (v2)
 *
 * WYSIWYG editor integrado en RentikPro.
 * - Datos reales desde projectManager
 * - Autosave con debounce (900ms)
 * - Publish real via publishAdapter (snapshot + siteConfig → Worker KV)
 * - Inline text editing (contentEditable)
 * - Drag & drop de imágenes (drop zone en Hero)
 * - Reordenar secciones
 * - ErrorBoundary: nunca pantalla en blanco
 * - VersionChecker corregido: solo alerta si remote > current (semver)
 */

import React, { useState, useEffect, useCallback, useRef, Component } from 'react';
import {
    Plus, Globe, ChevronLeft, Loader2, Palette,
    X, Monitor, Tablet as TabletIcon, Smartphone,
    Undo2, Redo2, Save, CloudIcon, ChevronRight,
    AlertTriangle, RefreshCw, CheckCircle2, CloudOff,
    Eye
} from 'lucide-react';

// Services & API
import { projectManager } from '@/services/projectManager';
import { useDataRefresh } from '@/services/dataRefresher';
import { WebSite, Property } from '@/types';
import { saveSiteConfig } from '../modules/webBuilder/api';
import { migrateToV1, hydrateConfig } from '../modules/webBuilder/adapters';
import { generateSlug } from '../modules/webBuilder/slug';
import { DEFAULT_SITE_CONFIG_V1 } from '../modules/webBuilder/defaults';
import { BUILDER_TEMPLATES } from './builder/templates';
import { useBuilder } from './builder/hooks/useBuilder';
import { SidebarLeft } from './builder/components/SidebarLeft';
import { SidebarRight } from './builder/components/SidebarRight';
import { Canvas } from './builder/components/Canvas';
import { toast } from 'sonner';
import { generateV0Config } from '../modules/webBuilder/v0Generator';
import { publishAdapter } from '../services/publishAdapter';
import { APP_VERSION } from '../version';
import { TemplateOnboarding } from '../modules/webBuilder/components/TemplateOnboarding';
import { PROPERTY_TEMPLATES, PropertyTemplate } from '../modules/webBuilder/templates/propertyTemplates';

// ─── ErrorBoundary ─────────────────────────────────────────────────────────────

interface EBState { hasError: boolean; error?: Error; }

class BuilderErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
    state: EBState = { hasError: false };

    static getDerivedStateFromError(error: Error): EBState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[WebsiteBuilder] Uncaught error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-6 p-12">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle size={36} className="text-red-500" />
                    </div>
                    <div className="text-center max-w-md">
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Error en el Editor</h2>
                        <p className="text-slate-500 text-sm mb-2">{this.state.error?.message}</p>
                        <p className="text-slate-400 text-xs">Los cambios guardados están seguros.</p>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: undefined })}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-colors"
                    >
                        <RefreshCw size={16} /> Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ─── VersionChecker ────────────────────────────────────────────────────────────
// BUG FIX: Only alert when remote > current (numeric semver), never in dev.

function parseSemver(v: string): number[] {
    return (v ?? '0.0.0').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
}

function isSemverGreater(remote: string, current: string): boolean {
    const r = parseSemver(remote);
    const c = parseSemver(current);
    for (let i = 0; i < 3; i++) {
        if ((r[i] ?? 0) > (c[i] ?? 0)) return true;
        if ((r[i] ?? 0) < (c[i] ?? 0)) return false;
    }
    return false;
}

function useVersionChecker() {
    useEffect(() => {
        // Skip in dev mode entirely
        if (import.meta.env.DEV || import.meta.env.VITE_DISABLE_VERSION_CHECK === 'true') return;

        const checkVersion = async () => {
            try {
                const versionUrl = import.meta.env.VITE_VERSION_CHECK_URL;
                if (!versionUrl) return;
                const res = await fetch(versionUrl, { cache: 'no-store' });
                if (!res.ok) return;
                const { version: remote } = await res.json();
                if (remote && isSemverGreater(remote, APP_VERSION)) {
                    toast('Nueva versión disponible', {
                        description: `v${remote} (actual: v${APP_VERSION})`,
                        action: { label: 'Actualizar', onClick: () => window.location.reload() },
                        duration: 10000,
                    });
                }
            } catch {
                // silent
            }
        };

        const timer = setTimeout(checkVersion, 5000);
        return () => clearTimeout(timer);
    }, []);
}

// ─── SaveStatusBadge ───────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const SaveStatusBadge: React.FC<{ status: SaveStatus; lastSavedAt?: Date | null }> = ({ status, lastSavedAt }) => {
    const map: Record<SaveStatus, { icon: React.ReactNode; text: string; cls: string }> = {
        idle: { icon: null, text: '', cls: '' },
        dirty: { icon: <CloudOff size={12} />, text: 'Sin guardar', cls: 'text-amber-600 bg-amber-50' },
        saving: { icon: <Loader2 size={12} className="animate-spin" />, text: 'Guardando...', cls: 'text-slate-500 bg-slate-50' },
        saved: { icon: <CheckCircle2 size={12} />, text: lastSavedAt ? `Guardado ${lastSavedAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Guardado', cls: 'text-emerald-600 bg-emerald-50' },
        error: { icon: <AlertTriangle size={12} />, text: 'Error al guardar', cls: 'text-red-600 bg-red-50' },
    };
    const m = map[status];
    if (!m.text) return null;
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black ${m.cls}`}>
            {m.icon}{m.text}
        </div>
    );
};

// ─── Main WebsiteBuilder ───────────────────────────────────────────────────────

const WebsiteBuilderInner: React.FC = () => {
    useVersionChecker();

    const PUBLIC_WEB_BASE = (import.meta.env.VITE_PUBLIC_WEB_BASE ?? 'https://rp-web-6h9.pages.dev').replace(/\/$/, '');

    const [websites, setWebsites] = useState<WebSite[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [liveUrl, setLiveUrl] = useState<string | null>(null);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<PropertyTemplate | null>(null);

    const {
        state, dispatch, undo, redo, canUndo, canRedo,
        reset, addBlock, moveBlock, removeBlock, updateBlock
    } = useBuilder(DEFAULT_SITE_CONFIG_V1);

    const { config, selectedBlockId, device, inspectorTab, isSaving } = state;

    const lastConfigSnapshot = useRef<string>('');
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedBlock = selectedBlockId
        ? config.pages['/']?.blocks.find(b => b.id === selectedBlockId) ?? null
        : null;

    const blockIndex = selectedBlock
        ? config.pages['/']?.blocks.findIndex(b => b.id === selectedBlockId)
        : -1;

    // ── DATA LOADING ──────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        try {
            const [wsList, propList] = await Promise.all([
                projectManager.getStore().getWebsites(),
                projectManager.getStore().getProperties(),
            ]);
            setWebsites(wsList ?? []);
            setProperties(propList ?? []);
        } catch (e) {
            console.error('[WebsiteBuilder] loadData failed:', e);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    useDataRefresh(loadData);

    // ── SITE SELECTION & HYDRATION ────────────────────────────────────────────
    useEffect(() => {
        if (!selectedSite) return;
        try {
            setSaveStatus('idle');
            setLastSavedAt(null);
            lastConfigSnapshot.current = '';
            const migrated = migrateToV1(selectedSite.sections_json, { name: selectedSite.name });
            reset(hydrateConfig(migrated));
        } catch (e) {
            console.error('[WebsiteBuilder] hydration failed:', e);
            reset(DEFAULT_SITE_CONFIG_V1);
        }
    }, [selectedSite?.id]);

    // ── SAVE ─────────────────────────────────────────────────────────────────
    const handleSave = useCallback(async (silent = false): Promise<boolean> => {
        if (!selectedSite) return false;
        setSaveStatus('saving');
        try {
            await saveSiteConfig(selectedSite, config);
            lastConfigSnapshot.current = JSON.stringify(config);
            setSaveStatus('saved');
            setLastSavedAt(new Date());
            if (!silent) toast.success('Cambios guardados');
            return true;
        } catch (e: any) {
            console.error('[WebsiteBuilder] save failed:', e);
            setSaveStatus('error');
            if (!silent) toast.error('Error al guardar');
            return false;
        }
    }, [selectedSite, config]);

    // ── AUTOSAVE (debounced 900ms) ────────────────────────────────────────────
    useEffect(() => {
        if (!selectedSite || saveStatus === 'saving') return;

        const snapshot = JSON.stringify(config);

        if (!lastConfigSnapshot.current) {
            lastConfigSnapshot.current = snapshot;
            return;
        }

        if (snapshot !== lastConfigSnapshot.current) {
            setSaveStatus('dirty');
        }

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            const nowSnap = JSON.stringify(config);
            if (nowSnap !== lastConfigSnapshot.current) {
                handleSave(true);
            }
        }, 900);

        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, [config, selectedSite?.id]);

    // ── PUBLISH ───────────────────────────────────────────────────────────────
    const handlePublish = async () => {
        if (!selectedSite) return;

        // Save first
        const saved = await handleSave(true);
        if (!saved) {
            toast.error('Guarda los cambios antes de publicar.');
            return;
        }

        setIsPublishing(true);
        toast.loading('Publicando sitio...');

        try {
            const propertyId = selectedSite.property_id ?? '';
            const slug = selectedSite.slug ?? selectedSite.subdomain ?? generateSlug(selectedSite.name ?? 'mi-sitio');

            const configToPublish = {
                ...config,
                slug,
                themeId: config.themeId || 'builder-standard',
            };

            const result = await publishAdapter.publish(propertyId, configToPublish, PUBLIC_WEB_BASE);

            toast.dismiss();
            if (result.success) {
                setLiveUrl(result.liveUrl ?? null);
            }
        } finally {
            setIsPublishing(false);
        }
    };

    // ── THEME ─────────────────────────────────────────────────────────────────
    const handleApplyTheme = (themeConfig: any) => {
        dispatch({ type: 'SET_THEME', payload: themeConfig });
        setShowThemeSelector(false);
        toast.success('Tema aplicado');
    };

    // ── AUTO GENERATE v0 ──────────────────────────────────────────────────────
    const handleAutoGenerate = async (property: Property) => {
        setShowAutoGenerateModal(false);
        const template = selectedTemplate;
        setSelectedTemplate(null);

        toast.loading(template ? `Generando ${template.name}...` : 'Generando web v0...');
        try {
            const snapshot = await projectManager.getStore().loadPropertySnapshot(property.id);

            let v1Config;
            if (template) {
                v1Config = template.seed({ name: property.name, location: property.location });
                // We might want to inject real apartments if the template has ApartmentsGrid
                const v0Base = generateV0Config(snapshot);
                const gridBlock = v1Config.pages['/'].blocks.find(b => b.type === 'ApartmentsGrid');
                if (gridBlock) {
                    const v0Grid = v0Base.pages['/'].blocks.find(b => b.type === 'ApartmentsGrid');
                    if (v0Grid) gridBlock.data.items = v0Grid.data.items;
                }
            } else {
                v1Config = generateV0Config(snapshot);
            }

            const newSite: WebSite = {
                id: `ws_${Math.random().toString(36).substr(2, 9)}`,
                name: property.name,
                property_id: property.id,
                subdomain: v1Config.slug || generateSlug(property.name),
                template_slug: 'v2',
                plan_type: 'pro',
                public_token: '',
                is_published: false,
                status: 'draft',
                theme_config: '{}',
                seo_title: property.name,
                seo_description: '',
                sections_json: JSON.stringify(v1Config),
                booking_config: '{}',
                property_ids_json: JSON.stringify([property.id]),
                allowed_origins_json: '[]',
                features_json: '{}',
                slug: v1Config.slug || generateSlug(property.name),
                created_at: Date.now(),
                updated_at: Date.now(),
            };

            await projectManager.getStore().saveWebsite(newSite);
            await loadData();
            toast.success(template ? `${template.name} generada` : 'Web v0 generada');

            const created = (await projectManager.getStore().getWebsites()).find(w => w.id === newSite.id);
            if (created) setSelectedSite(created);
        } catch (e: any) {
            console.error('[WebsiteBuilder] autoGenerate failed:', e);
            toast.error('Error al generar: ' + (e?.message ?? String(e)));
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: No site selected → dashboard
    // ─────────────────────────────────────────────────────────────────────────
    if (!selectedSite) {
        return (
            <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans overflow-y-auto border-t-4 border-indigo-600">
                <div className="max-w-6xl mx-auto">
                    <header className="flex justify-between items-end mb-12 flex-wrap gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-slate-800 mb-2">
                                Website Builder <span className="text-indigo-600">Ferrari</span>
                            </h1>
                            <p className="text-slate-500 font-medium">Gestiona tus páginas web con calidad Premium SaaS.</p>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <button
                                onClick={() => setShowAutoGenerateModal(true)}
                                className="bg-amber-100 text-amber-900 px-6 py-3 rounded-2xl font-black shadow-xl shadow-amber-100/50 flex items-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                <Globe size={20} /> Generar Web v0
                            </button>
                        </div>
                    </header>

                    {isLoadingData ? (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                            <Loader2 className="animate-spin mb-4" size={40} />
                            <span className="font-black uppercase tracking-widest text-xs">Cargando motores...</span>
                        </div>
                    ) : websites.length === 0 ? (
                        <TemplateOnboarding onSelect={(tmpl) => {
                            setSelectedTemplate(tmpl);
                            setShowAutoGenerateModal(true);
                        }} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                            {websites.map(ws => (
                                <div
                                    key={ws.id}
                                    onClick={() => setSelectedSite(ws)}
                                    className="bg-white border border-slate-100 rounded-[2.5rem] p-5 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full"
                                >
                                    <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2rem] mb-6 flex items-center justify-center relative overflow-hidden border border-slate-50 group-hover:border-indigo-100 transition-colors">
                                        <div className="text-slate-100 font-black text-6xl opacity-50 select-none group-hover:text-indigo-50 transition-colors">F</div>
                                        {(ws.is_published || ws.status === 'published') && (
                                            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                                Publicado
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-2 pb-2 flex-1">
                                        <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{ws.name ?? 'Sin Nombre'}</h3>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {ws.slug ?? ws.subdomain ?? 'sin slug'}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 pb-2">
                                        <div className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold text-center">
                                            Abrir Editor
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* AUTO-GENERATE MODAL */}
                {showAutoGenerateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAutoGenerateModal(false)} />
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative z-[101] overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800 mb-2">
                                            {selectedTemplate ? `Crear ${selectedTemplate.name}` : 'Generar Web v0'}
                                        </h2>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                            {selectedTemplate ? 'Selecciona una propiedad para esta plantilla' : 'Selecciona una propiedad'}
                                        </p>
                                    </div>
                                    <button onClick={() => { setShowAutoGenerateModal(false); setSelectedTemplate(null); }} className="p-4 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all">
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                                    {properties.length === 0 ? (
                                        <p className="text-center text-slate-400 py-12 font-bold">No tienes propiedades creadas.</p>
                                    ) : properties.map(prop => (
                                        <div
                                            key={prop.id}
                                            onClick={() => handleAutoGenerate(prop)}
                                            className="group flex items-center justify-between p-6 bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-100 rounded-[1.5rem] border border-slate-100 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    🏠
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-800">{prop.name}</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{prop.location ?? 'Sin ubicación'}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: Site selected → editor
    // ─────────────────────────────────────────────────────────────────────────

    // Mark editor mode so ApartmentsGrid can show placeholder in preview
    if (typeof window !== 'undefined') {
        (window as any).__RP_EDITOR_MODE__ = true;
    }

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* TOP BAR */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-50 shrink-0 shadow-sm">
                {/* Left */}
                <div className="flex items-center gap-5 min-w-0">
                    <button
                        onClick={() => { (window as any).__RP_EDITOR_MODE__ = false; setSelectedSite(null); }}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group shrink-0"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
                    </button>
                    <div className="h-6 w-px bg-slate-100 shrink-0" />
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0">F</div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-slate-800 leading-none mb-0.5 truncate max-w-[160px]">{selectedSite.name}</h1>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Ferrari Builder</p>
                        </div>
                    </div>
                    <SaveStatusBadge status={saveStatus} lastSavedAt={lastSavedAt} />
                </div>

                {/* Center: device + undo/redo */}
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        {[
                            { id: 'desktop', icon: Monitor, label: 'Desktop' },
                            { id: 'tablet', icon: TabletIcon, label: 'Tablet' },
                            { id: 'mobile', icon: Smartphone, label: 'Mobile' },
                        ].map(d => (
                            <button
                                key={d.id}
                                onClick={() => dispatch({ type: 'SET_DEVICE', payload: d.id as any })}
                                className={`p-2 rounded-xl transition-all ${device === d.id ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-indigo-400'}`}
                                title={d.label}
                            >
                                <d.icon size={18} />
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <button onClick={undo} disabled={!canUndo} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-800 transition-all active:scale-90 disabled:opacity-20" title="Deshacer (Ctrl+Z)">
                            <Undo2 size={18} />
                        </button>
                        <button onClick={redo} disabled={!canRedo} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-800 transition-all active:scale-90 disabled:opacity-20" title="Rehacer (Ctrl+Y)">
                            <Redo2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowThemeSelector(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
                    >
                        <Palette size={16} /> Temas
                    </button>

                    {liveUrl && (
                        <a
                            href={liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
                        >
                            <Eye size={16} /> Ver web
                        </a>
                    )}

                    <button
                        onClick={() => handleSave()}
                        disabled={saveStatus === 'saving'}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${saveStatus === 'saving' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}
                    >
                        <Save size={16} className={saveStatus === 'saving' ? 'animate-pulse' : ''} />
                        {saveStatus === 'saving' ? 'Guardando...' : 'Guardar'}
                    </button>

                    <button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl hover:shadow-indigo-100 disabled:opacity-50"
                    >
                        {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <CloudIcon size={16} />}
                        {isPublishing ? 'Publicando...' : 'Publicar'}
                    </button>
                </div>
            </header>

            {/* 3-COLUMN LAYOUT */}
            <div className="grid grid-cols-[260px_1fr_320px] flex-1 overflow-hidden">
                <div className="min-w-0 overflow-hidden border-r border-slate-200 bg-white">
                    <SidebarLeft onAddBlock={addBlock} />
                </div>
                <div className="min-w-0 overflow-hidden">
                    <Canvas
                        config={config}
                        device={device}
                        selectedBlockId={selectedBlockId}
                        onSelectBlock={(id) => dispatch({ type: 'SELECT_BLOCK', payload: id })}
                    />
                </div>
                <div className="min-w-0 overflow-hidden border-l border-slate-200 bg-white">
                    <SidebarRight
                        selectedBlock={selectedBlock}
                        tab={inspectorTab}
                        setTab={(t) => dispatch({ type: 'SET_INSPECTOR_TAB', payload: t })}
                        device={device}
                        onUpdateBlock={updateBlock}
                        onRemoveBlock={removeBlock}
                        onMoveBlock={moveBlock}
                        blockIndex={blockIndex}
                    />
                </div>
            </div>

            {/* THEME SELECTOR MODAL */}
            {showThemeSelector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-20">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowThemeSelector(false)} />
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl relative z-[101] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 flex flex-col max-h-[85vh]">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800 mb-2">Diseños Ferrari</h2>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Estilos Premium listos para usar</p>
                                </div>
                                <button onClick={() => setShowThemeSelector(false)} className="p-4 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">
                                {BUILDER_TEMPLATES.map(template => (
                                    <div
                                        key={template.id}
                                        className="group relative flex flex-col bg-slate-50 border border-slate-100 rounded-[2rem] p-6 hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
                                        onClick={() => template.config.theme && handleApplyTheme(template.config.theme)}
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <Palette size={20} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 mb-2">{template.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-6 line-clamp-2">{template.description}</p>
                                        <div className="mt-auto flex items-center gap-2">
                                            <div className="flex -space-x-1">
                                                {template.config.theme?.colors && Object.values(template.config.theme.colors).slice(0, 3).map((c: any, i) => (
                                                    <div key={i} className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-auto opacity-0 group-hover:opacity-100 transition-opacity">Seleccionar</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Exported component with ErrorBoundary ────────────────────────────────────

export const WebsiteBuilder: React.FC = () => (
    <BuilderErrorBoundary>
        <WebsiteBuilderInner />
    </BuilderErrorBoundary>
);
