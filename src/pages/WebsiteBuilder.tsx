import React, { useState, useEffect, useCallback } from 'react';
import { projectManager } from '../../services/projectManager';
import { WebSite } from '../../types';
import { useDataRefresh } from '../../services/dataRefresher';
import { Loader2, Plus } from 'lucide-react';

// New Module Imports
import { SiteConfig } from '../modules/webBuilder/types';
import { DEFAULT_SITE_CONFIG } from '../modules/webBuilder/defaults';
import { migrateConfig } from '../modules/webBuilder/adapters';
import { saveSiteConfig, publishSiteConfig } from '../modules/webBuilder/api';

// Components
import { BuilderHeader } from '../modules/webBuilder/components/BuilderHeader';
import { SectionManager } from '../modules/webBuilder/components/SectionManager';
import { PropertyInspector } from '../modules/webBuilder/components/PropertyInspector';
import { LivePreview } from '../modules/webBuilder/components/LivePreview';
import { PromptBuilder } from '@/components/PromptBuilder';

export const WebsiteBuilder: React.FC = () => {
   // Global Data
   const [websites, setWebsites] = useState<WebSite[]>([]);
   const [properties, setProperties] = useState<any[]>([]); // Full property list
   const [isLoadingData, setIsLoadingData] = useState(true);

   // Selection & Config
   const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);
   const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);

   // Editor State
   const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile'); // Default to mobile as it's "mobile-first" usually or helps focus
   const [selectedSectionId, setSelectedSectionId] = useState<string | null>('hero');
   const [isSaving, setIsSaving] = useState(false);
   const [hasChanges, setHasChanges] = useState(false);
   const [isDirty, setIsDirty] = useState(false); // Used for navigation guard

   // Modals
   const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

   // Load Initial Data
   const loadData = useCallback(async () => {
      try {
         const [wsList, propList] = await Promise.all([
            projectManager.getStore().getWebsites(),
            projectManager.getStore().getProperties()
         ]);
         setWebsites(wsList || []);
         setProperties(propList || []);
      } catch (e) {
         console.error("Error loading data", e);
      } finally {
         setIsLoadingData(false);
      }
   }, []);

   useEffect(() => { loadData(); }, [loadData]);
   useDataRefresh(loadData);

   // Navigation Guard (Simple window confirm)
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
            const migrated = migrateConfig(selectedSite.sections_json, {
               name: selectedSite.name,
               email: 'info@rentik.pro' // Fallback or fetch from user
            });

            // Ensure sectionOrder has defaults if migration missed it
            if (!migrated.sectionOrder || migrated.sectionOrder.length === 0) {
               migrated.sectionOrder = ['hero', 'apartments', 'location', 'contact'];
            }

            setConfig(migrated);
            setHasChanges(false);
            setIsDirty(false);
            // Default select first section
            setSelectedSectionId(migrated.sectionOrder[0] || 'brand');
         } catch (e) {
            console.error("Migration/Load failed", e);
            setConfig(DEFAULT_SITE_CONFIG);
         }
      }
   }, [selectedSite]);

   // Handlers
   const handleConfigChange = (updates: Partial<SiteConfig>) => {
      setConfig(prev => ({ ...prev, ...updates }));
      setHasChanges(true);
      setIsDirty(true);
   };

   const handleSectionReorder = (newOrder: string[]) => {
      handleConfigChange({ sectionOrder: newOrder });
   };

   const handleSave = async () => {
      if (!selectedSite) return;
      setIsSaving(true);
      try {
         await saveSiteConfig(selectedSite, config);
         await loadData();
         // Update local selectedSite ref to update timestamp
         setSelectedSite(prev => prev ? ({ ...prev, updated_at: Date.now() }) : null);
         setHasChanges(false);
         setIsDirty(false);
         // Show Toast (Using alert for now, ideally a Toast component)
         // alert("Guardado correctamente"); 
      } catch (e) {
         console.error(e);
         alert("Error al guardar");
      } finally {
         setIsSaving(false);
      }
   };

   const handlePublish = async () => {
      if (!selectedSite) return;
      if (confirm("¿Estás seguro de publicar los cambios? Se actualizará el sitio en vivo.")) {
         setIsSaving(true);
         try {
            await saveSiteConfig(selectedSite, config);
            await publishSiteConfig(config);

            // Update site status
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
         booking_config: '{}',
         allowed_origins_json: '[]',
         features_json: '{}',
         public_token: crypto.randomUUID(),
         plan_type: 'basic',
         is_published: false,
         template_slug: 'default'
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
                     <p className="text-slate-500">Gestiona y personaliza tus páginas de aterrizaje.</p>
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
                              {/* Placeholder specific to status */}
                              <div className="text-slate-300 font-black text-6xl opacity-20 select-none">WEB</div>
                              {ws.status === 'published' && <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Publicado</div>}
                           </div>
                           <div className="px-4 pb-4">
                              <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{ws.name || 'Sin Nombre'}</h3>
                              <p className="text-xs text-slate-400 font-mono mb-4 truncate">{ws.slug ? `${ws.slug}.rentik.pro` : ws.subdomain}</p>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                 <span>Modificado hace {Math.floor((Date.now() - ws.updated_at) / (1000 * 60 * 60 * 24))} días</span>
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

   // --- EDITOR LAYOUT ---
   return (
      <div className="h-screen flex flex-col bg-slate-100 overflow-hidden font-sans">

         {/* TOP BAR */}
         <BuilderHeader
            siteName={selectedSite.name || 'Sitio Sin Nombre'}
            onNameChange={(name) => {
               setSelectedSite({ ...selectedSite, name });
               setHasChanges(true);
               setIsDirty(true);
            }}
            onBack={() => {
               if (isDirty && !confirm("Tienes cambios sin guardar. ¿Salir?")) return;
               setSelectedSite(null);
            }}
            device={device}
            setDevice={setDevice}
            onSave={handleSave}
            onPublish={handlePublish}
            isSaving={isSaving}
            hasChanges={hasChanges}
            status={selectedSite.status || 'draft'}
            liveUrl={selectedSite.status === 'published' ? selectedSite.subdomain : undefined}
         />

         {/* WORKSPACE (3 COLUMNS) */}
         <div className="flex-1 flex overflow-hidden">

            {/* LEFT: SECTION MANAGER */}
            <div className="w-64 border-r border-slate-200 bg-white z-20 shadow-xl flex-shrink-0">
               <SectionManager
                  config={config}
                  selectedSectionId={selectedSectionId}
                  onSelectSection={setSelectedSectionId}
                  onReorder={handleSectionReorder}
               />
            </div>

            {/* CENTER: LIVE PREVIEW */}
            <div className="flex-1 bg-slate-200/50 relative overflow-hidden flex items-center justify-center">
               <LivePreview config={config} device={device} />
            </div>

            {/* RIGHT: PROPERTY INSPECTOR */}
            <div className="w-80 border-l border-slate-200 bg-white z-20 shadow-xl flex-shrink-0">
               <PropertyInspector
                  config={config}
                  selectedSectionId={selectedSectionId}
                  onChange={handleConfigChange}
                  properties={properties}
               />
            </div>

         </div>

         {/* MODALS */}
         {isPromptModalOpen && (
            <PromptBuilder
               onClose={() => setIsPromptModalOpen(false)}
               currentSite={selectedSite}
               mode="MODAL"
            />
         )}

      </div>
   );
};