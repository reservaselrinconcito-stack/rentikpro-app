import React, { useState, useEffect, useCallback } from 'react';
import { projectManager } from '@/services/projectManager';
import { WebSite } from '@/types';
import { useDataRefresh } from '@/services/dataRefresher';
import {
   Loader2, Plus, ArrowRight, ArrowLeft, Check,
   LayoutTemplate, PenTool, Image as ImageIcon, Globe, Play, Settings
} from 'lucide-react';

// Modules
import { SiteConfig } from '@/modules/webBuilder/types';
import { DEFAULT_SITE_CONFIG } from '@/modules/webBuilder/defaults';
import { migrateConfig, hydrateConfig, validateConfig } from '@/modules/webBuilder/adapters';
import { saveSiteConfig, publishSiteConfig } from '@/modules/webBuilder/api';
import { getTemplateConfig, TemplateId } from '@/modules/webBuilder/templates';

// Components
import { BuilderHeader } from '@/modules/webBuilder/components/BuilderHeader';
import { TemplateSelector } from '@/modules/webBuilder/components/TemplateSelector';
import { WizardSteps, WizardStep } from '@/modules/webBuilder/components/WizardSteps';
import { LivePreview } from '@/modules/webBuilder/components/LivePreview';
import { PromptBuilder } from '@/components/PromptBuilder';


// --- TYPES ---
type BuilderStep = 'template' | WizardStep | 'publish';

const STEPS: { id: BuilderStep, label: string, icon: any }[] = [
   { id: 'template', label: 'Plantilla', icon: LayoutTemplate },
   { id: 'content', label: 'Contenido', icon: PenTool },
   { id: 'media', label: 'Imágenes', icon: ImageIcon },
   { id: 'seo', label: 'SEO', icon: Globe },
   { id: 'publish', label: 'Publicar', icon: Play },
];

export const WebsiteBuilder: React.FC = () => {
   // Global Data
   const [websites, setWebsites] = useState<WebSite[]>([]);
   const [isLoadingData, setIsLoadingData] = useState(true);

   // Selection & Config
   const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);
   const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);

   // Builder State
   const [currentStep, setCurrentStep] = useState<BuilderStep>('template');
   const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
   const [isSaving, setIsSaving] = useState(false);
   const [hasChanges, setHasChanges] = useState(false);
   const [isDirty, setIsDirty] = useState(false);

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
            const migrated = migrateConfig(selectedSite.sections_json, {
               name: selectedSite.name,
               email: 'info@rentik.pro'
            });
            // Ensure deep merged defaults always
            const validated = hydrateConfig(migrated);

            setConfig(validated);
            setHasChanges(false);
            setIsDirty(false);

            // If new site (default config), start at template
            // If existing, maybe start at content? Let's default to 'template' to allow changing it, 
            // or 'content' if we want to be nice.
            // Let's stick to 'template' for this simplified flow so user sees where they are.
            setCurrentStep('template');

         } catch (e) {
            console.error("Load failed", e);
            setConfig(DEFAULT_SITE_CONFIG);
         }
      }
   }, [selectedSite]);

   // --- HANDLERS ---

   const handleConfigChange = (updates: Partial<SiteConfig>) => {
      // Must hydrate to ensure no partial state ever exists
      setConfig(prev => hydrateConfig({ ...prev, ...updates }));
      setHasChanges(true);
      setIsDirty(true);
   };

   const handleTemplateSelect = (tmplId: TemplateId) => {
      const tmplConfig = getTemplateConfig(tmplId);
      // Merge template config but PRESERVE content user might have managed if switching
      // Actually, template switch might change structure.
      // Strategy: Apply template structure/theme, keep brand/contact/images if possible.

      const newConfig = {
         ...tmplConfig,
         slug: config.slug, // Keep slug
         brand: { ...tmplConfig.brand, ...config.brand }, // Keep user brand
         contact: { ...tmplConfig.contact, ...config.contact }, // Keep contact
         // Keep hero text but maybe reset image if template has a specific mood? 
         // Let's keep user hero text if they typed it.
         hero: {
            ...tmplConfig.hero,
            title: (config.hero.title !== DEFAULT_SITE_CONFIG.hero.title) ? config.hero.title : tmplConfig.hero.title,
            imageUrl: (config.hero.imageUrl && config.hero.imageUrl !== DEFAULT_SITE_CONFIG.hero.imageUrl) ? config.hero.imageUrl : tmplConfig.hero.imageUrl
         },
         // Keep SEO
         // seo_title... (implicit in config types we added/casted)
      };

      handleConfigChange(newConfig);
   };

   const handleSave = async (silent = false) => {
      if (!selectedSite) return;
      setIsSaving(true);
      try {
         // Validate before save?
         const errors = validateConfig(config);
         if (errors.length > 0 && !silent) {
            // warning?
         }

         await saveSiteConfig(selectedSite, config);
         await loadData();

         // Update local ref
         setSelectedSite(prev => prev ? ({ ...prev, updated_at: Date.now() }) : null);
         setHasChanges(false);
         setIsDirty(false);
         if (!silent) alert("Guardado correctamente");
      } catch (e) {
         console.error(e);
         if (!silent) alert("Error al guardar");
      } finally {
         setIsSaving(false);
      }
   };

   const handlePublish = async () => {
      if (!selectedSite) return;
      setIsSaving(true);
      try {
         await saveSiteConfig(selectedSite, config);
         await publishSiteConfig(config);

         const updated = {
            ...selectedSite,
            status: 'published' as const,
            subdomain: config.slug,
            is_published: true,
            updated_at: Date.now()
         };
         await projectManager.getStore().saveWebsite(updated);

         await loadData();
         setSelectedSite(updated);
         setHasChanges(false);
         setIsDirty(false);
         alert("¡Sitio publicado con éxito!");
      } catch (e: any) {
         console.error(e);
         alert(`Error al publicar: ${e.message}`);
      } finally {
         setIsSaving(false);
      }
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
         sections_json: JSON.stringify(DEFAULT_SITE_CONFIG),
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
               setHasChanges(true); setIsDirty(true);
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

                  {currentStep === 'template' && (
                     <TemplateSelector
                        selectedId={config.themeId as any}
                        onSelect={handleTemplateSelect}
                     />
                  )}

                  {['content', 'media', 'seo'].includes(currentStep) && (
                     <WizardSteps
                        step={currentStep as WizardStep}
                        config={config}
                        onChange={handleConfigChange}
                     />
                  )}

                  {currentStep === 'publish' && (
                     <div className="space-y-6 text-center py-10 animate-in fade-in slide-in-from-bottom-4">
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

                        <button onClick={handlePublish} disabled={isSaving} className="w-full max-w-sm bg-indigo-600 text-white py-4 rounded-xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                           {isSaving ? <Loader2 className="animate-spin" /> : <Globe size={20} />}
                           {isSaving ? 'Publicando...' : 'PUBLICAR SITIO AHORA'}
                        </button>
                     </div>
                  )}

               </div>

               {/* BOTTOM NAV */}
               <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                  {currentStep === 'template' ? (
                     <div className="flex items-center gap-2">
                        <button onClick={() => setIsAdvancedOpen(true)} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-2 transition-colors">
                           <Settings size={14} /> Avanzado (Beta)
                        </button>
                     </div>
                  ) : (
                     <button onClick={handleBack} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 flex items-center gap-2">
                        <ArrowLeft size={14} /> Anterior
                     </button>
                  )}

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

         {/* ADVANCED MODAL (PROMPT BUILDER) */}
         {isAdvancedOpen && (
            <PromptBuilder
               onClose={() => setIsAdvancedOpen(false)}
               currentSite={selectedSite}
               mode="MODAL"
            />
         )}

      </div>
   );
};