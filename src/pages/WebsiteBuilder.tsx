import React, { useState, useEffect, useCallback } from 'react';
import { projectManager } from '@/services/projectManager';
import { WebSite } from '@/types';
import { useDataRefresh } from '@/services/dataRefresher';
import {
   Loader2, Plus, ArrowRight, ArrowLeft, Check,
   LayoutTemplate, PenTool, Image as ImageIcon, Globe, Play, Settings, Layers, FileText
} from 'lucide-react';

// Modules
import { SiteConfigV1 } from '../modules/webBuilder/types';
import { BUILDER_TEMPLATES } from '../modules/webBuilder/templates';
import { DEFAULT_SITE_CONFIG_V1 } from '../modules/webBuilder/defaults';
import { migrateToV1, hydrateConfig, validateConfig } from '../modules/webBuilder/adapters';
import { saveSiteConfig, publishSiteConfig, checkSlugCollision } from '../modules/webBuilder/api';
import { normalizeSlug } from '../modules/webBuilder/slug';

// Components
import { BuilderHeader } from '../modules/webBuilder/components/BuilderHeader';
import { LivePreview } from '../modules/webBuilder/components/LivePreview';
import { AssetManager } from '../modules/webBuilder/components/AssetManager';
import { ImageFieldEditor } from '../modules/webBuilder/components/ImageFieldEditor';
import { useHistory } from '../modules/webBuilder/hooks/useHistory';

// --- TYPES ---
type BuilderStep = 'pages' | 'theme' | 'library' | 'publish';

const STEPS: { id: BuilderStep, label: string, icon: any }[] = [
   { id: 'pages', label: 'Páginas', icon: Layers },
   { id: 'theme', label: 'Estilos', icon: LayoutTemplate },
   { id: 'library', label: 'Librería', icon: ImageIcon },
   { id: 'publish', label: 'Publicar', icon: Globe },
];


export const WebsiteBuilder: React.FC = () => {
   // Global Data
   const [websites, setWebsites] = useState<WebSite[]>([]);
   const [isLoadingData, setIsLoadingData] = useState(true);

   // Selection & Config
   const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);
   const { state: config, set: setConfig, undo, redo, canUndo, canRedo, reset: resetConfig } = useHistory<SiteConfigV1>(DEFAULT_SITE_CONFIG_V1);
   const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle');

   // Builder State
   const [currentStep, setCurrentStep] = useState<BuilderStep>('pages');
   const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop'); // Default desktop for editor
   const [isSaving, setIsSaving] = useState(false);

   const [hasChanges, setHasChanges] = useState(false);
   const [isDirty, setIsDirty] = useState(false);

   // Publish State
   const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
   const [publishMessage, setPublishMessage] = useState<string>('');
   const [publishedUrl, setPublishedUrl] = useState<string>('');

   // Modals
   const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

   // --- DATA LOADING ---
   const loadData = useCallback(async () => {
      try {
         const wsList = await projectManager.getStore().getWebsites();
         setWebsites(wsList || []);
      } catch (e) {
         console.error("Error loading data", e);
      } finally {
         setIsLoadingData(false);
      }
   }, []);

   useEffect(() => { loadData(); }, [loadData]);
   useDataRefresh(loadData);

   // Navigation Guard
   useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
         if (isDirty) {
            e.preventDefault();
            e.returnValue = '';
         }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
   }, [isDirty]);

   // Load Site Logic
   useEffect(() => {
      if (selectedSite) {
         try {
            // Raw migration/hydration
            const migrated = migrateToV1(selectedSite.sections_json, {
               name: selectedSite.name,
               email: 'info@rentik.pro'
            });
            // Ensure deep merged defaults always
            const validated = hydrateConfig(migrated);

            resetConfig(validated);
            setHasChanges(false);
            setIsDirty(false);
            setSaveStatus('saved');

            setCurrentStep('pages');

         } catch (e) {
            console.error("Load failed", e);
            resetConfig(DEFAULT_SITE_CONFIG_V1);
            setSaveStatus('idle');
         }
      }
   }, [selectedSite, resetConfig]);

   // --- KEYBOARD SHORTCUTS ---
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         // CMD+Z / CTRL+Z
         if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
         }
         // CMD+SHIFT+Z / CTRL+SHIFT+Z
         if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            redo();
         }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, [undo, redo]);

   // --- AUTOSAVE ---
   const autoSaveTimeout = React.useRef<NodeJS.Timeout | null>(null);
   useEffect(() => {
      if (!selectedSite || saveStatus === 'saving' || saveStatus === 'saved' || saveStatus === 'idle') return;

      if (saveStatus === 'unsaved') {
         if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
         autoSaveTimeout.current = setTimeout(() => {
            handleSave(true);
         }, 5000); // Autosave in 5 seconds
      }

      return () => {
         if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      };
   }, [config, saveStatus, selectedSite]);

   // --- HANDLERS ---

   const handleConfigChange = (updates: Partial<SiteConfigV1>) => {
      setConfig(prev => hydrateConfig({ ...prev, ...updates }));
      setHasChanges(true);
      setIsDirty(true);
      setSaveStatus('unsaved');
   };

   const handleSave = async (silent = false) => {
      if (!selectedSite) return;
      setIsSaving(true);
      if (silent) setSaveStatus('saving');

      try {
         // Validate before save?
         const errors = validateConfig(config);
         if (errors.length > 0 && !silent) {
            // warning?
         }

         await saveSiteConfig(selectedSite, config);
         if (!silent) await loadData();

         // Update local ref
         setSelectedSite(prev => prev ? ({ ...prev, updated_at: Date.now() }) : null);
         setHasChanges(false);
         setIsDirty(false);
         setSaveStatus('saved');
         if (!silent) alert("Guardado correctamente");
      } catch (e) {
         console.error(e);
         setSaveStatus('error');
         if (!silent) alert("Error al guardar");
      } finally {
         setIsSaving(false);
      }
   };

   const handlePublish = async () => {
      if (!selectedSite) return;
      setIsSaving(true);
      setPublishStatus('publishing');
      setPublishMessage('');

      try {
         // 1. Determine slug
         let baseSlug = normalizeSlug(config.slug || config.globalData?.brandName || selectedSite.name || 'sitio');

         // 2. Collision check loop
         let finalSlug = baseSlug;
         let suffix = 1;
         let isCollision = true;

         while (isCollision) {
            const exists = await checkSlugCollision(finalSlug);

            if (!exists) {
               isCollision = false;
            } else if (exists && finalSlug === selectedSite.subdomain && selectedSite.is_published) {
               // It's already ours and published, we can overwrite
               isCollision = false;
            } else {
               // Real collision with another site
               finalSlug = `${baseSlug}-${suffix}`;
               suffix++;
               if (suffix > 99) break; // Infinite loop guard
            }
         }

         // 3. Prepare final config and state
         const now = new Date().toISOString();
         const finalConfig = {
            ...config,
            slug: finalSlug,
            updatedAt: now
         };

         // Ensure UI is updated
         setConfig(finalConfig);

         // 4. Publish to Worker + KV
         await publishSiteConfig(finalSlug, finalConfig);

         // 5. Persist locally to IndexedDB/SQLite
         const updatedWebSite: WebSite = {
            ...selectedSite,
            status: 'published',
            subdomain: finalSlug,
            is_published: true,
            updated_at: Date.now(),
            sections_json: JSON.stringify(finalConfig)
         };

         await projectManager.getStore().saveWebsite(updatedWebSite);

         // 6. Update local state and finish
         await loadData();
         setSelectedSite(updatedWebSite);
         setHasChanges(false);
         setIsDirty(false);
         setSaveStatus('saved');

         const publicBase = import.meta.env.VITE_PUBLIC_WEB_BASE || "https://rp-web.pages.dev";
         const publicUrl = publicBase.includes('?')
            ? `${publicBase}&slug=${finalSlug}`
            : `${publicBase}/?slug=${finalSlug}`;

         setPublishedUrl(publicUrl);
         setPublishStatus('success');

      } catch (e: any) {
         console.error("Publishing error:", e);
         setPublishStatus('error');

         if (e.message && e.message.includes('No autorizado')) {
            setPublishMessage('Error 401: Autorización denegada. El token de Admin (VITE_ADMIN_TOKEN) es ausente o inválido.');
         } else {
            setPublishMessage(`Error 500: Fallo en el servidor al publicar (${e.message || 'Desconocido'}).`);
         }
      } finally {
         setIsSaving(false);
      }
   };

   const handleTemplateChange = (templateId: string) => {
      const template = BUILDER_TEMPLATES.find(t => t.id === templateId);
      if (!template) return;

      const updatedPages = { ...config.pages };
      const homePage = updatedPages['/'];
      if (homePage) {
         homePage.blocks = homePage.blocks.map(block => ({
            ...block,
            variant: template.defaultVariants[block.type] || block.variant || 'A'
         }));
      }

      handleConfigChange({
         theme: template.theme,
         pages: updatedPages
      });
   };

   const handleVariantChange = (blockId: string, newVariant: string) => {
      const updatedPages = { ...config.pages };
      const homePage = updatedPages['/'];
      if (homePage) {
         homePage.blocks = homePage.blocks.map(block =>
            block.id === blockId ? { ...block, variant: newVariant } : block
         );
      }
      handleConfigChange({ pages: updatedPages });
   };

   const handleNext = () => {
      const idx = STEPS.findIndex(s => s.id === currentStep);
      if (idx < STEPS.length - 1) {
         setCurrentStep(STEPS[idx + 1].id);
      }
   };

   const handleBack = () => {
      const idx = STEPS.findIndex(s => s.id === currentStep);
      if (idx > 0) {
         setCurrentStep(STEPS[idx - 1].id);
      }
   };

   const handleCreate = async () => {
      const newSiteId = crypto.randomUUID();
      const newSite: WebSite = {
         id: newSiteId,
         name: 'Nueva Web',
         subdomain: `site-${Date.now().toString(36).slice(-6)}`,
         status: 'draft',
         sections_json: JSON.stringify(DEFAULT_SITE_CONFIG_V1),
         created_at: Date.now(),
         updated_at: Date.now(),
         theme_config: JSON.stringify({ primary_color: '#000000' }),
         property_ids_json: '[]',
         seo_title: '',
         seo_description: '',
         booking_config: '{}', allowed_origins_json: '[]', features_json: '{}',
         public_token: crypto.randomUUID(), plan_type: 'basic', is_published: false, template_slug: 'default'
      };
      await projectManager.getStore().saveWebsite(newSite);
      await loadData();
      const created = (await projectManager.getStore().getWebsites()).find((w: any) => w.id === newSiteId);
      if (created) setSelectedSite(created);
   };

   // --- RENDER ---

   if (!selectedSite) {
      return (
         <div className="min-h-screen bg-slate-50 p-8 pt-20 animate-in fade-in">
            <div className="max-w-6xl mx-auto">
               <div className="flex justify-between items-center mb-10">
                  <div>
                     <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Mis Sitios Web</h1>
                     <p className="text-slate-500">Crea páginas web profesionales en minutos.</p>
                  </div>
                  <button onClick={handleCreate} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200">
                     <Plus size={20} /> Crear Nueva Web
                  </button>
               </div>

               {isLoadingData ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {websites.map(ws => (
                        <div key={ws.id} onClick={() => setSelectedSite(ws)} className="bg-white border border-slate-200 rounded-[2.5rem] p-4 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
                           <div className="aspect-video bg-slate-100 rounded-[2rem] mb-6 flex items-center justify-center relative overflow-hidden">
                              <div className="text-slate-300 font-black text-6xl opacity-20 select-none">WEB</div>
                              {ws.status === 'published' && <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Publicado</div>}
                           </div>
                           <div className="px-4 pb-4">
                              <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{ws.name || 'Sin Nombre'}</h3>
                              <p className="text-xs text-slate-400 font-mono mb-4 truncate">{ws.subdomain}</p>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                 <span>Editado hace {Math.floor((Date.now() - ws.updated_at) / (1000 * 60 * 60 * 24))} días</span>
                              </div>
                           </div>
                        </div>
                     ))}
                     {websites.length === 0 && (
                        <div className="col-span-3 text-center py-20 text-slate-400">
                           No tienes sitios creados. ¡Crea el primero!
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>
      );
   }

   // --- BUILDER LAYOUT ---
   return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">

         {/* HEADER */}
         <BuilderHeader
            siteName={selectedSite.name || 'Sitio Sin Nombre'}
            onNameChange={(name) => {
               setSelectedSite({ ...selectedSite, name });
               setHasChanges(true);
               setIsDirty(true);
               setSaveStatus('unsaved');
            }}
            onBack={() => {
               if (isDirty && !confirm("Tienes cambios sin guardar. ¿Salir?")) return;
               setSelectedSite(null);
            }}
            device={device}
            setDevice={setDevice}
            onSave={() => handleSave(false)}
            onPublish={handlePublish}
            isSaving={isSaving}
            hasChanges={hasChanges}
            status={selectedSite.status || 'draft'}
            liveUrl={selectedSite.status === 'published' ? selectedSite.subdomain : undefined}
            saveStatus={saveStatus}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
         />

         <div className="flex-1 flex overflow-hidden">

            {/* LEFT: WIZARD (Scrollable) */}
            <div className="w-full lg:w-[480px] bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl">

               {/* STEPS INDICATOR */}
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  {STEPS.map((s, idx) => {
                     const isActive = s.id === currentStep;
                     const isPast = STEPS.findIndex(st => st.id === currentStep) > idx;
                     return (
                        <div key={s.id} className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'opacity-100 scale-110' : isPast ? 'opacity-50' : 'opacity-30 grayscale'}`}>
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : isPast ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                              {isPast ? <Check size={14} /> : <s.icon size={14} />}
                           </div>
                           <span className="text-[9px] font-bold uppercase tracking-wide">{s.label}</span>
                        </div>
                     );
                  })}
               </div>

               {/* CONTENT AREA */}
               <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                  <div className="mb-6">
                     <h2 className="text-2xl font-black text-slate-800 mb-1">{STEPS.find(s => s.id === currentStep)?.label}</h2>
                     <p className="text-sm text-slate-400 font-medium">Configura tu sitio web paso a paso.</p>
                  </div>

                  {currentStep === 'pages' && (
                     <div className="space-y-4 animate-in fade-in">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-6">
                           <p className="text-sm text-indigo-800 font-medium">Gestiona los bloques de tu página principal. Cambia la variante visual de cada uno.</p>
                        </div>
                        {config.pages['/']?.blocks.map(block => (
                           <div key={block.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between w-full">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                                       <Layers size={18} />
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-slate-800">{block.type}</h4>
                                       <p className="text-[10px] text-slate-400 font-mono tracking-wider">{block.id}</p>
                                    </div>
                                 </div>
                                 <select
                                    value={block.variant || 'A'}
                                    onChange={(e) => handleVariantChange(block.id, e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer"
                                 >
                                    <option value="A">Variante A (Defecto)</option>
                                    <option value="B">Variante B (Alternativa)</option>
                                    <option value="C">Variante C (Minimalista)</option>
                                 </select>
                              </div>

                              {(block.type === 'Hero' || block.type === 'Features') && (
                                 <div className="mt-4 pt-4 border-t border-slate-100 w-full">
                                    <ImageFieldEditor
                                       label={`Fondo del bloque ${block.type}`}
                                       imageUrl={block.data.imageUrl || (block.type === 'Hero' ? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?q=80&w=800&auto=format&fit=crop')}
                                       imageFocal={block.data.imageFocal}
                                       imageFit={block.data.imageFit}
                                       assets={config.assets || []}
                                       onChange={(newData) => {
                                          const updatedPages = { ...config.pages };
                                          const homePage = updatedPages['/'];
                                          if (homePage) {
                                             homePage.blocks = homePage.blocks.map(b =>
                                                b.id === block.id ? { ...b, data: { ...b.data, ...newData } } : b
                                             );
                                          }
                                          handleConfigChange({ pages: updatedPages });
                                       }}
                                    />
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  )}

                  {currentStep === 'library' && (
                     <div className="animate-in fade-in h-[600px] flex flex-col">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-6 flex-shrink-0">
                           <p className="text-sm text-indigo-800 font-medium">Sube y gestiona las imágenes para usarlas en los bloques de tu sitio web.</p>
                        </div>
                        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                           <AssetManager
                              assets={config.assets || []}
                              onAssetsChange={assets => handleConfigChange({ assets })}
                           />
                        </div>
                     </div>
                  )}

                  {currentStep === 'theme' && (
                     <div className="space-y-6 animate-in fade-in">
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-6">
                           <p className="text-sm text-emerald-800 font-medium">Cambiar de plantilla aplicará nuevos estilos y variantes por defecto a tus bloques <strong className="font-black">sin borrar tu contenido</strong>.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                           {BUILDER_TEMPLATES.map(template => (
                              <div
                                 key={template.id}
                                 onClick={() => handleTemplateChange(template.id)}
                                 className="bg-white border-2 border-slate-100 p-5 rounded-3xl cursor-pointer hover:border-indigo-500 hover:shadow-xl transition-all group"
                              >
                                 <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{template.name}</h3>
                                    <div className="flex gap-1">
                                       <div className="w-4 h-4 rounded-full" style={{ backgroundColor: template.theme.colors.primary }}></div>
                                       <div className="w-4 h-4 rounded-full" style={{ backgroundColor: template.theme.colors.secondary }}></div>
                                       <div className="w-4 h-4 rounded-full" style={{ backgroundColor: template.theme.colors.background }}></div>
                                    </div>
                                 </div>
                                 <p className="text-sm text-slate-500 font-medium leading-relaxed">{template.description}</p>

                                 <button className="mt-4 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    Aplicar Plantilla
                                 </button>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {currentStep === 'publish' && (
                     <div className="space-y-6 text-center py-10 animate-in fade-in slide-in-from-bottom-4">

                        {publishStatus === 'idle' || publishStatus === 'publishing' ? (
                           <>
                              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                 <Play size={32} fill="currentColor" />
                              </div>
                              <h3 className="text-xl font-black text-slate-800">¡Todo Listo!</h3>
                              <p className="text-sm text-slate-500 max-w-xs mx-auto">Tu sitio web está configurado y listo para lanzarse. Verifica la vista previa y pulsa publicar.</p>

                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left max-w-sm mx-auto">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Slug (Dirección Web)</label>
                                 <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                                    <span className="text-xs text-slate-400 font-mono">https://</span>
                                    <input
                                       className="flex-1 font-mono text-sm font-bold outline-none text-slate-700"
                                       value={config.slug}
                                       onChange={e => handleConfigChange({ slug: e.target.value })}
                                       placeholder="mi-negocio"
                                    />
                                    <span className="text-xs text-slate-400 font-mono">.rentik.pro</span>
                                 </div>
                              </div>

                              <button onClick={handlePublish} disabled={publishStatus === 'publishing'} className="w-full max-w-sm bg-indigo-600 text-white py-4 rounded-xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50">
                                 {publishStatus === 'publishing' ? <Loader2 className="animate-spin" /> : <Globe size={20} />}
                                 {publishStatus === 'publishing' ? 'ENVIANDO AL SERVIDOR...' : 'PUBLICAR SITIO AHORA'}
                              </button>
                           </>
                        ) : null}

                        {publishStatus === 'success' && (
                           <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl max-w-md mx-auto animate-in zoom-in-95">
                              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
                                 <Check size={32} />
                              </div>
                              <h3 className="text-2xl font-black text-emerald-900 mb-2">¡Sito Web Publicado!</h3>
                              <p className="text-emerald-700 text-sm mb-6">Tu página está ahora en vivo y accesible para todo el mundo en internet.</p>

                              <div className="bg-white border border-emerald-100 p-3 rounded-xl mb-6">
                                 <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">URL Pública</p>
                                 <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-mono font-bold hover:underline break-all">
                                    {publishedUrl}
                                 </a>
                              </div>

                              <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="w-full inline-flex justify-center bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">
                                 Abrir en pestaña nueva <ArrowRight size={18} className="ml-2" />
                              </a>
                              <button onClick={() => setPublishStatus('idle')} className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600">
                                 Volver al Editor
                              </button>
                           </div>
                        )}

                        {publishStatus === 'error' && (
                           <div className="bg-red-50 border border-red-200 p-8 rounded-3xl max-w-md mx-auto animate-in zoom-in-95">
                              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                 <span className="text-2xl font-black">!</span>
                              </div>
                              <h3 className="text-xl font-black text-red-900 mb-2">Fallo al Publicar</h3>
                              <p className="text-red-700 text-sm mb-6">{publishMessage}</p>

                              <button onClick={() => setPublishStatus('idle')} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all">
                                 Intentar de nuevo
                              </button>
                           </div>
                        )}
                     </div>
                  )}

               </div>

               {/* BOTTOM NAV */}
               <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                  <button onClick={handleBack} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 flex items-center gap-2">
                     <ArrowLeft size={14} /> Anterior
                  </button>

                  {currentStep !== 'publish' && (
                     <button onClick={handleNext} className="px-6 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg hover:shadow-slate-300 transition-all">
                        Siguiente Paso <ArrowRight size={14} />
                     </button>
                  )}
               </div>
            </div>

            {/* CENTER/RIGHT: LIVE PREVIEW (Sticky) */}
            <div className="flex-1 bg-slate-200/50 relative overflow-hidden flex items-center justify-center">
               <LivePreview config={config} device={device} />
            </div>

         </div>

      </div >
   );
};