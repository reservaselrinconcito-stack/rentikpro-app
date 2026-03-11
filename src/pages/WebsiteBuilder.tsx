import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, Globe,
    ChevronLeft, Loader2, Palette, Layers,
    X, Monitor, Tablet as TabletIcon, Smartphone,
    Undo2, Redo2, Save, CloudIcon, ChevronRight, Zap,
} from 'lucide-react';

// Services & API
import { projectManager } from '@/services/projectManager';
import { useDataRefresh } from '@/services/dataRefresher';
import { WebSite, Property } from '@/types';
import { saveSiteConfig, siteConfigApi } from '../modules/webBuilder/api';
import { migrateToV1, hydrateConfig } from '../modules/webBuilder/adapters';
import { generateSlug } from '../modules/webBuilder/slug';
import { DEFAULT_SITE_CONFIG_V1 } from '../modules/webBuilder/defaults';
import { SiteConfigV1 } from '../modules/webBuilder/types';
import { openPreviewWindow, type PreviewHandle } from '../modules/webBuilder/preview';

// Builder Components
import { useBuilder } from './builder/hooks/useBuilder';
import { SidebarLeft } from './builder/components/SidebarLeft';
import { SidebarRight } from './builder/components/SidebarRight';
import { Canvas } from './builder/components/Canvas';

// Templates
import { BUILDER_TEMPLATES } from './builder/templates';
import { publishAdapter } from '../../services/publishAdapter';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────

/** Base URL de la web pública (RPWeb) */
const PUBLIC_WEB_BASE = import.meta.env.VITE_PUBLIC_WEB_BASE || 'https://rp-web-6h9.pages.dev';

// ─── generateConfigFromProperty ──────────────────────────────────────────────

/**
 * Carga datos reales de la propiedad y genera un SiteConfigV1 inicial
 * con apartamentos, contacto y disponibilidad reales.
 */
async function generateConfigFromProperty(
    property: Property,
    themeId: string,
): Promise<SiteConfigV1> {
    const template = BUILDER_TEMPLATES.find(t => t.themeId === themeId) ?? BUILDER_TEMPLATES[1];
    const snapshot = await projectManager.getStore().loadPropertySnapshot(property.id);
    const { apartments, media } = snapshot;

    const activeApts = apartments.filter(a => a.is_active !== false);

    const slug = generateSlug(property.name);

    const config: SiteConfigV1 = {
        ...DEFAULT_SITE_CONFIG_V1,
        slug,
        themeId: template.themeId,
        theme: template.theme,
        globalData: {
            brandName: property.name,
            contactEmail: property.email || '',
            contactPhone: property.phone || '',
            socialLinks: {},
        },
        pages: {
            '/': {
                id: 'page-home',
                path: '/',
                title: property.name,
                description: property.description || 'Alojamiento premium',
                blocks: [
                    {
                        id: 'nav-1',
                        type: 'Navigation',
                        data: { brandName: property.name, logoUrl: property.logo || '' },
                        styles: {},
                    },
                    {
                        id: 'hero-1',
                        type: 'Hero',
                        data: {
                            title: property.name,
                            subtitle: property.description || 'Disfruta de una estancia inolvidable.',
                            ctaLabel: 'Ver Alojamientos',
                            ctaHref: '#apartments',
                            imageUrl: media[0]?.data_base64 || '',
                        },
                        styles: {},
                    },
                    {
                        id: 'trust-1',
                        type: 'TrustBadges',
                        data: {},
                        styles: {},
                    },
                    {
                        id: 'grid-1',
                        type: 'ApartmentsGrid',
                        data: {
                            title: 'Nuestros Alojamientos',
                            subtitle: 'Elige el espacio perfecto para tu escapada.',
                            items: activeApts.map(apt => ({
                                id: apt.id,
                                name: apt.name,
                                location: property.location || '',
                                guests: 2,
                                bedrooms: 1,
                                price: apt.publicBasePrice != null ? `${apt.publicBasePrice}${apt.currency || '€'}` : 'Consultar',
                                image: media.find(m => m.site_id === apt.id)?.data_base64 || media.find(m => m.site_id === property.id)?.data_base64 || '',
                            })),
                        },
                        styles: {},
                    },
                    {
                        id: 'calendar-1',
                        type: 'AvailabilityCalendar',
                        data: {
                            title: 'Disponibilidad',
                            subtitle: 'Consulta fechas libres en tiempo real.',
                            ctaLabel: 'Consultar Precio',
                            propertyId: property.id,
                        },
                        styles: {},
                    },
                    {
                        id: 'features-1',
                        type: 'Features',
                        data: {
                            title: 'Servicios Incluidos',
                            subtitle: 'Todo lo que necesitas para una estancia perfecta.',
                        },
                        styles: {},
                    },
                    {
                        id: 'pricing-1',
                        type: 'Pricing',
                        data: {
                            title: 'Nuestras Tarifas',
                            subtitle: 'Reserva directamente con nosotros para el mejor precio.',
                        },
                        styles: {},
                    },
                    {
                        id: 'cta-1',
                        type: 'CTA',
                        data: {
                            title: '¿Listo para tu próxima aventura?',
                            subtitle: 'Reserva ahora y vive la experiencia RentikPro.',
                            buttonLabel: 'Reservar Ahora',
                        },
                        styles: {},
                    },
                    {
                        id: 'location-1',
                        type: 'Location',
                        data: {
                            title: 'Dónde estamos',
                            address: property.location || 'Calle Principal, 123',
                        },
                        styles: {},
                    },
                    {
                        id: 'contact-1',
                        type: 'ContactForm',
                        data: {
                            title: 'Contacta con nosotros',
                            subtitle: '¿Tienes alguna duda? Escríbenos.',
                            submitLabel: 'Enviar Consulta',
                            propertyId: property.id,
                        },
                        styles: {},
                    },
                ],
            },
        },
    };

    return config;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WebsiteBuilder: React.FC = () => {
    // Selection state
    const [websites, setWebsites] = useState<WebSite[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [showNewSiteModal, setShowNewSiteModal] = useState(false);
    const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [pendingThemeId, setPendingThemeId] = useState('builder-standard');

    // Core Builder Hook
    const {
        state, dispatch, undo, redo, canUndo, canRedo,
        reset, addBlock, moveBlock, removeBlock, updateBlock
    } = useBuilder(DEFAULT_SITE_CONFIG_V1);

    const { config, selectedBlockId, device, inspectorTab, isSaving } = state;
    const [isDirty, setIsDirty] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const lastConfigSnapshot = useRef<string>('');
    const previewHandleRef = useRef<PreviewHandle | null>(null);

    const upsertWebsite = useCallback((site: WebSite) => {
        setWebsites(prev => {
            const exists = prev.some(w => w.id === site.id);
            if (!exists) return [site, ...prev];
            return prev.map(w => w.id === site.id ? site : w);
        });
    }, []);

    const selectedBlock = selectedBlockId
        ? config.pages['/']?.blocks.find(b => b.id === selectedBlockId) || null
        : null;
    const blockIndex = selectedBlock
        ? config.pages['/']?.blocks.findIndex(b => b.id === selectedBlockId)
        : -1;

    // ── Data loading ────────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        try {
            const [wsList, propList] = await Promise.all([
                projectManager.getStore().getWebsites(),
                projectManager.getStore().getProperties(),
            ]);
            const sites = wsList || [];
            setWebsites(sites);
            setProperties(propList || []);

            // Auto-create a starter site if none exist, so the builder never opens empty
            if (sites.length === 0 && (propList?.length || 0) > 0) {
                const starterSite: WebSite = {
                    id: 'ws_starter',
                    name: 'Mi Sitio Web',
                    property_id: (propList?.[0]?.id) || '',
                    subdomain: 'mi-sitio',
                    slug: 'mi-sitio',
                    template_slug: 'builder-standard',
                    plan_type: 'STARTER',
                    public_token: '',
                    is_published: false,
                    status: 'draft',
                    sections_json: JSON.stringify(DEFAULT_SITE_CONFIG_V1),
                    created_at: Date.now(),
                    updated_at: Date.now(),
                } as any;
                await projectManager.getStore().saveWebsite(starterSite);
                setWebsites([starterSite]);
                setSelectedSite(starterSite);
                reset(DEFAULT_SITE_CONFIG_V1);
            }
        } catch (e) {
            console.error('Error loading data', e);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    useDataRefresh(loadData);

    useEffect(() => () => {
        previewHandleRef.current?.close();
        previewHandleRef.current = null;
    }, []);

    useEffect(() => {
        if (previewHandleRef.current?.isAlive()) {
            previewHandleRef.current.update(config);
        }
    }, [config]);

    useEffect(() => {
        if (!selectedSite && previewHandleRef.current) {
            previewHandleRef.current.close();
            previewHandleRef.current = null;
        }
    }, [selectedSite]);

    // ── Site selection & hydration ──────────────────────────────────────────

    useEffect(() => {
        if (!selectedSite) return;
        try {
            setIsDirty(false);
            setLastSavedAt(null);
            lastConfigSnapshot.current = '';
            const migrated = migrateToV1(selectedSite.sections_json, {
                name: selectedSite.name,
                email: 'info@rentik.pro'
            });
            const validated = hydrateConfig(migrated);

            // Safety net: if still no blocks, inject defaults so canvas is never empty
            if ((validated.pages['/']?.blocks?.length ?? 0) === 0) {
                validated.pages['/'] = {
                    ...validated.pages['/'],
                    blocks: JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG_V1.pages['/'].blocks)),
                };
            }

            reset(validated);
            dispatch({ type: 'SET_SAVING', payload: false });
        } catch (e) {
            console.error('Hydration failed, resetting to defaults:', e);
            reset(DEFAULT_SITE_CONFIG_V1);
        }
    }, [selectedSite]);

    // ── Save ────────────────────────────────────────────────────────────────

    const handleSave = useCallback(async (silent = false) => {
        if (!selectedSite) return;
        dispatch({ type: 'SET_SAVING', payload: true });
        try {
            const savedSite = await saveSiteConfig(selectedSite, config);
            upsertWebsite(savedSite);
            if (!silent) toast.success('Cambios guardados');
            setIsDirty(false);
            setLastSavedAt(new Date());
        } catch (e) {
            console.error('Save failed', e);
            if (!silent) toast.error('Error al guardar');
        } finally {
            dispatch({ type: 'SET_SAVING', payload: false });
        }
    }, [selectedSite, config, upsertWebsite]);

    // ── Autosave ────────────────────────────────────────────────────────────

    const autoSaveTimer = useRef<any>(null);
    useEffect(() => {
        if (!selectedSite || isSaving) return;
        const snapshot = JSON.stringify(config);
        if (!lastConfigSnapshot.current) { lastConfigSnapshot.current = snapshot; return; }
        if (snapshot !== lastConfigSnapshot.current) setIsDirty(true);
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            const nowSnap = JSON.stringify(config);
            if (nowSnap === lastConfigSnapshot.current) return;
            lastConfigSnapshot.current = nowSnap;
            handleSave(true);
        }, 900);
        return () => clearTimeout(autoSaveTimer.current);
    }, [config, selectedSite, isSaving]);

    // ── Publish ─────────────────────────────────────────────────────────────

    const handlePublish = async () => {
        if (!selectedSite) return;
        setIsPublishing(true);
        try {
            await handleSave(true);

            const propertyId = (selectedSite as any).property_id || projectManager.getActivePropertyId();
            if (!propertyId) {
                throw new Error('Selecciona o genera el sitio desde una propiedad antes de publicarlo');
            }
            const websiteName = selectedSite.name || 'sitio';

            // Ensure themeId is set on config
            const configToPublish: SiteConfigV1 = {
                ...config,
                themeId: config.themeId || 'builder-standard',
                slug: config.slug || generateSlug(websiteName),
            };

            const publishedSlug = await publishAdapter.fullPublish(propertyId, websiteName, configToPublish);

            if (publishedSlug) {
                const publishedSite: WebSite = {
                    ...selectedSite,
                    sections_json: JSON.stringify(configToPublish),
                    slug: publishedSlug,
                    subdomain: publishedSlug,
                    template_slug: configToPublish.themeId || selectedSite.template_slug,
                    is_published: true,
                    status: 'published',
                    updated_at: Date.now(),
                };
                await projectManager.getStore().saveWebsite(publishedSite);
                setSelectedSite(publishedSite);
                upsertWebsite(publishedSite);

                const url = `${PUBLIC_WEB_BASE}/${publishedSlug}`;
                toast.success(
                    `¡Publicado! → ${url}`,
                    { action: { label: 'Ver', onClick: () => window.open(url, '_blank') } }
                );
            }
        } catch (e: any) {
            toast.error('Error al publicar: ' + (e.message || 'Error desconocido'));
        } finally {
            setIsPublishing(false);
        }
    };

    // ── Theme ────────────────────────────────────────────────────────────────

    const handleApplyTheme = (themeId: string) => {
        const template = BUILDER_TEMPLATES.find(t => t.id === themeId);
        if (!template) return;
        // SET_THEME updates design tokens; SET_CONFIG rebuilds with themeId at root
        dispatch({ type: 'SET_THEME', payload: template.theme });
        // Persist the themeId at root level by merging into full config
        const updatedConfig = { ...config, themeId: template.themeId, theme: template.theme };
        dispatch({ type: 'SET_CONFIG', payload: updatedConfig });
        setShowThemeSelector(false);
        toast.success(`Tema ${template.name} aplicado`);
    };

    const handleTemplateChoice = (themeId: string) => {
        if (properties.length === 0) {
            setShowThemeSelector(false);
            toast.error('Crea una propiedad antes de crear una web');
            return;
        }

        setPendingThemeId(themeId);
        setShowThemeSelector(false);

        if (properties.length === 1) {
            handleAutoGenerate(properties[0], themeId);
            return;
        }

        setShowAutoGenerateModal(true);
    };

    // ── Auto Generate ────────────────────────────────────────────────────────

    const handleAutoGenerate = async (property: Property, themeId: string = 'builder-standard') => {
        const toastId = toast.loading('Generando sitio desde datos reales…');
        console.log(`[WEBBUILDER] generate_start {propertyId: ${property.id}, themeId: ${themeId}}`);
        try {
            const config = await generateConfigFromProperty(property, themeId);

            const projectId = localStorage.getItem('active_project_id');
            const isDemo = projectId === 'demo_project' || property.id === 'demo_project';

            // Deterministic ID for demo to ensure UPSERT replaces the existing demo site
            const siteId = isDemo ? 'web_demo_1' : `ws_${Math.random().toString(36).substr(2, 9)}`;

            const newSite: WebSite = {
                id: siteId,
                name: property.name,
                property_id: property.id,
                subdomain: config.slug,
                slug: config.slug,
                template_slug: themeId,
                plan_type: 'STARTER',
                public_token: property.public_token || '',
                is_published: false,
                status: 'draft',
                sections_json: JSON.stringify(config),
                created_at: Date.now(),
                updated_at: Date.now(),
            } as any;

            await projectManager.getStore().saveWebsite(newSite);
            await loadData();
            setShowAutoGenerateModal(false);

            console.log(`[WEBBUILDER] generate_ok {sectionsCount: ${Object.keys(config.pages).length}, blocksCount: ${config.pages['/']?.blocks?.length}}`);
            toast.success('Sitio generado con datos reales', { id: toastId });

            // Find the canonical record (especially important in demo where saveWebsite might have adjusted values)
            const allSites = await projectManager.getStore().getWebsites();
            const created = allSites.find(w => w.id === siteId) || allSites.find(w => w.subdomain === config.slug);
            if (created) {
                setSelectedSite(created);
                // Ensure the canvas renders immediately with the generated config
                reset(config);
            }
        } catch (e: any) {
            console.error('[WEBBUILDER] generate_fail', e);
            toast.error('Error al generar: ' + e.message, { id: toastId });
        }
    };

    // ── Slug resolver ─────────────────────────────────────────────────────────

    const getPublicUrl = useCallback(() => {
        if (!selectedSite) return '';
        const slug = config.slug || selectedSite.slug || selectedSite.subdomain || '';
        const isPublished = selectedSite.is_published || selectedSite.status === 'published';

        console.log(`[WEBBUILDER] view_web_click {resolvedUrl: ${PUBLIC_WEB_BASE}/${slug}, is_published: ${isPublished}}`);

        return isPublished && slug ? `${PUBLIC_WEB_BASE}/${slug}` : '';
    }, [selectedSite, config.slug]);

    const handleOpenWebsite = () => {
        if (!selectedSite) return;

        const projectId = localStorage.getItem('active_project_id');
        const isDemo = projectId === 'demo_project';
        const isPublished = selectedSite.is_published || selectedSite.status === 'published';

        if (isDemo || !isPublished) {
            if (previewHandleRef.current?.isAlive()) {
                previewHandleRef.current.focus();
                previewHandleRef.current.update(config);
                return;
            }

            const handle = openPreviewWindow(config);
            if (!handle.isAlive()) {
                toast.error('Permite popups para abrir la previsualizacion');
                return;
            }
            previewHandleRef.current = handle;
            return;
        }

        const url = getPublicUrl();
        if (url) {
            window.open(url, '_blank');
        } else {
            toast.info('Publica primero el sitio');
        }
    };

    // ── Site list screen ─────────────────────────────────────────────────────

    if (!selectedSite) {
        return (
            <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans overflow-y-auto border-t-4 border-indigo-600">
                <div className="max-w-6xl mx-auto">
                    <header className="flex justify-between items-end mb-12">
                        <div>
                            <h1 className="text-4xl font-black text-slate-800 mb-2">Website Builder <span className="text-indigo-600">Pro</span></h1>
                            <p className="text-slate-500 font-medium">Gestiona tus páginas web con calidad Premium SaaS.</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setPendingThemeId('builder-standard');
                                    setShowAutoGenerateModal(true);
                                }}
                                className="bg-amber-100 text-amber-900 px-6 py-3 rounded-2xl font-black shadow-xl shadow-amber-100/50 flex items-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                <Zap size={20} /> Generar desde Propiedad
                            </button>
                            <button
                                onClick={() => setShowThemeSelector(true)}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                <Plus size={20} /> Crear Nuevo Sitio
                            </button>
                        </div>
                    </header>

                    {isLoadingData ? (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                            <Loader2 className="animate-spin mb-4" size={40} />
                            <span className="font-black uppercase tracking-widest text-xs">Cargando…</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                            {websites.map(ws => (
                                <div
                                    key={ws.id}
                                    onClick={() => setSelectedSite(ws)}
                                    className="bg-white border border-slate-100 rounded-[2.5rem] p-5 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full"
                                >
                                    <div className="aspect-[16/10] bg-slate-50 rounded-[2rem] mb-6 flex items-center justify-center relative overflow-hidden border border-slate-50 group-hover:border-indigo-100 transition-colors">
                                        <div className="text-slate-100 font-black text-6xl opacity-50 select-none group-hover:text-indigo-50 transition-colors">PRO</div>
                                        {(ws.is_published || (ws as any).status === 'published') && (
                                            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Publicado</div>
                                        )}
                                    </div>
                                    <div className="px-2 pb-2">
                                        <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{ws.name || 'Sin Nombre'}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <Layers size={12} /> <span>{(ws as any).template_slug || 'builder-standard'}</span>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">Abrir Editor</button>
                                    </div>
                                </div>
                            ))}
                            {websites.length === 0 && (
                                <div className="col-span-3 py-24 text-center text-slate-400">
                                    <Globe size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="font-bold mb-2">No tienes sitios web todavía</p>
                                    <p className="text-xs">Crea uno desde una propiedad o desde cero.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Auto-generate modal */}
                {showAutoGenerateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAutoGenerateModal(false)} />
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative z-[101] overflow-hidden">
                            <div className="p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800 mb-2">Generar desde Propiedad</h2>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Datos reales: apartamentos, precios y contacto</p>
                                    </div>
                                    <button onClick={() => setShowAutoGenerateModal(false)} className="p-4 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
                                </div>
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {properties.map(prop => {
                                        const hasSite = websites.some(w => (w as any).property_id === prop.id);
                                        return (
                                            <div key={prop.id} onClick={() => handleAutoGenerate(prop, pendingThemeId)}
                                                className="group flex items-center justify-between p-6 bg-slate-50 hover:bg-white hover:shadow-xl rounded-[1.5rem] border border-slate-100 transition-all cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">🏠</div>
                                                    <div>
                                                        <h3 className="font-black text-slate-800">{prop.name}</h3>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{prop.location || 'Sin ubicación'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {hasSite && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">Con Web</span>}
                                                    <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {properties.length === 0 && (
                                        <div className="py-12 text-center text-slate-400">
                                            <p className="font-bold">No tienes propiedades creadas.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Theme/new site selector */}
                {showThemeSelector && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-20">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowThemeSelector(false)} />
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl relative z-[101] overflow-hidden">
                            <div className="p-10 flex flex-col max-h-[85vh]">
                                <div className="flex items-center justify-between mb-10">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800 mb-2">Elige una Plantilla</h2>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Selecciona el diseño y elige la propiedad</p>
                                    </div>
                                    <button onClick={() => setShowThemeSelector(false)} className="p-4 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">
                                    {BUILDER_TEMPLATES.map(template => (
                                        <div key={template.id}
                                            className="group relative flex flex-col bg-slate-50 border border-slate-100 rounded-[2rem] p-6 hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
                                            onClick={() => handleTemplateChoice(template.themeId)}>
                                            <div className="w-full h-20 rounded-2xl mb-4 flex items-center justify-center text-2xl font-black" style={{ backgroundColor: template.theme.colors.background, color: template.theme.colors.primary, border: `2px solid ${template.theme.colors.border}` }}>
                                                {template.name[0]}
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 mb-2">{template.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-6">{template.description}</p>
                                            <div className="mt-auto flex items-center gap-2">
                                                <div className="flex -space-x-1">
                                                    {[template.theme.colors.primary, template.theme.colors.background, template.theme.colors.accent].map((c, i) => (
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
    }

    // ── Editor screen ─────────────────────────────────────────────────────────

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900 border-t-4 border-indigo-600">
            {/* TOP BAR */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-50 shrink-0 shadow-sm">
                <div className="flex items-center gap-6">
                    <button onClick={() => setSelectedSite(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group">
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
                    </button>
                    <div className="h-6 w-px bg-slate-100" />
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs">P</div>
                        <div>
                            <h1 className="text-sm font-black text-slate-800 leading-none mb-1 max-w-[180px] truncate">{selectedSite.name}</h1>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Website Builder Pro</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                        {isSaving ? (
                            <><Loader2 size={14} className="animate-spin text-amber-600" /><span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Guardando…</span></>
                        ) : isDirty ? (
                            <><Save size={14} className="text-slate-500" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sin guardar</span></>
                        ) : (
                            <><CloudIcon size={14} className="text-emerald-600" /><span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Guardado{lastSavedAt ? ` · ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span></>
                        )}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        {([{ id: 'desktop', icon: Monitor }, { id: 'tablet', icon: TabletIcon }, { id: 'mobile', icon: Smartphone }] as any[]).map(d => (
                            <button key={d.id} onClick={() => dispatch({ type: 'SET_DEVICE', payload: d.id })}
                                className={`p-2 rounded-xl transition-all ${device === d.id ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-indigo-400'}`}>
                                <d.icon size={18} />
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <button onClick={undo} disabled={!canUndo} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-800 transition-all disabled:opacity-20"><Undo2 size={18} /></button>
                        <button onClick={redo} disabled={!canRedo} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-800 transition-all disabled:opacity-20"><Redo2 size={18} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setShowThemeSelector(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100">
                        <Palette size={16} /> Temas
                    </button>
                    <button
                        onClick={handleOpenWebsite}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200">
                        <Globe size={16} /> Ver web
                    </button>
                    <button onClick={() => handleSave()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-slate-50 text-slate-400 hover:bg-slate-100">
                        <Save size={16} /> Guardar
                    </button>
                    <button onClick={handlePublish} disabled={isPublishing}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl hover:shadow-indigo-100 disabled:opacity-60">
                        {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <CloudIcon size={16} />}
                        {isPublishing ? 'Publicando…' : 'Publicar'}
                    </button>
                </div>
            </header>

            {/* MAIN LAYOUT */}
            <div className="grid grid-cols-[260px_1fr_320px] h-[calc(100vh-56px)] overflow-hidden">
                <div className="min-w-0 overflow-hidden border-r border-slate-200 bg-white">
                    <SidebarLeft onAddBlock={addBlock} />
                </div>
                <div className="min-w-0 overflow-hidden">
                    <Canvas
                        config={config}
                        device={device}
                        selectedBlockId={selectedBlockId}
                        onSelectBlock={id => dispatch({ type: 'SELECT_BLOCK', payload: id })}
                        onMoveBlock={moveBlock}
                        onRemoveBlock={removeBlock}
                        onInjectStarterBlocks={() => {
                            const starterBlocks = JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG_V1.pages['/'].blocks));
                            starterBlocks.forEach((b: any) => addBlock(b));
                        }}
                    />
                </div>
                <div className="min-w-0 overflow-hidden border-l border-slate-200 bg-white">
                    <SidebarRight
                        selectedBlock={selectedBlock}
                        tab={inspectorTab}
                        setTab={t => dispatch({ type: 'SET_INSPECTOR_TAB', payload: t })}
                        device={device}
                        onUpdateBlock={updateBlock}
                        onRemoveBlock={removeBlock}
                        onMoveBlock={moveBlock}
                        blockIndex={blockIndex}
                    />
                </div>
            </div>

            {/* Theme modal (from within editor) */}
            {showThemeSelector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-20">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowThemeSelector(false)} />
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl relative z-[101] overflow-hidden">
                        <div className="p-10 flex flex-col max-h-[85vh]">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800 mb-2">Cambiar Plantilla</h2>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aplica al sitio actual</p>
                                </div>
                                <button onClick={() => setShowThemeSelector(false)} className="p-4 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6">
                                {BUILDER_TEMPLATES.map(template => (
                                    <div key={template.id} onClick={() => handleApplyTheme(template.id)}
                                        className="group relative flex flex-col bg-slate-50 border border-slate-100 rounded-[2rem] p-6 hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden">
                                        <div className="w-full h-20 rounded-2xl mb-4 flex items-center justify-center text-2xl font-black" style={{ backgroundColor: template.theme.colors.background, color: template.theme.colors.primary, border: `2px solid ${template.theme.colors.border}` }}>
                                            {template.name[0]}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 mb-2">{template.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{template.description}</p>
                                        <div className="mt-auto pt-4 flex items-center gap-2">
                                            <div className="flex -space-x-1">
                                                {[template.theme.colors.primary, template.theme.colors.background, template.theme.colors.accent].map((c, i) => (
                                                    <div key={i} className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-auto opacity-0 group-hover:opacity-100 transition-opacity">Aplicar</span>
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
