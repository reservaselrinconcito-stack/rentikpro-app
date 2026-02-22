import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
   Plus, Globe,
   ChevronLeft, Loader2, Palette,
   X, Monitor, Tablet as TabletIcon, Smartphone,
   Undo2, Redo2, Save, CloudIcon
} from 'lucide-react';

// Services & API
import { projectManager } from '@/services/projectManager';
import { useDataRefresh } from '@/services/dataRefresher';
import { WebSite } from '@/types';
import { saveSiteConfig, siteConfigApi } from '../modules/webBuilder/api';
import { migrateToV1, hydrateConfig } from '../modules/webBuilder/adapters';
import { generateSlug } from '../modules/webBuilder/slug';
import { DEFAULT_SITE_CONFIG_V1 } from '../modules/webBuilder/defaults';
import { BUILDER_TEMPLATES } from './builder/templates';

// Builder v2 Components
import { useBuilder } from './builder/hooks/useBuilder';
import { SidebarLeft } from './builder/components/SidebarLeft';
import { SidebarRight } from './builder/components/SidebarRight';
import { Canvas } from './builder/components/Canvas';
import { toast } from 'sonner';

export const WebsiteBuilder: React.FC = () => {
   // Selection state
   const [websites, setWebsites] = useState<WebSite[]>([]);
   const [isLoadingData, setIsLoadingData] = useState(true);
   const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);
   const [showThemeSelector, setShowThemeSelector] = useState(false);

   /**
    * Base URL donde vive la web pública (rp-web).
    * Ajusta esto a tu dominio real (p. ej. https://tusitio.com) cuando lo tengas definido.
    */
   const PUBLIC_WEB_BASE = 'https://rp-web.pages.dev';

   // Core Builder Hook
   const {
      state, dispatch, undo, redo, canUndo, canRedo,
      reset, addBlock, moveBlock, removeBlock, updateBlock
   } = useBuilder(DEFAULT_SITE_CONFIG_V1);

   const { config, selectedBlockId, device, inspectorTab, isSaving } = state;
   // UI-only save status (no cambia formato de datos)
   const [isDirty, setIsDirty] = useState(false);
   const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
   const lastConfigSnapshot = useRef<string>('');
   const selectedBlock = selectedBlockId
      ? config.pages['/']?.blocks.find(b => b.id === selectedBlockId) || null
      : null;

   const blockIndex = selectedBlock
      ? config.pages['/']?.blocks.findIndex(b => b.id === selectedBlockId)
      : -1;

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

   // --- SITE SELECTION & HYDRATION ---
   useEffect(() => {
      if (selectedSite) {
         try {
            // Reset UI save status on site change
            setIsDirty(false);
            setLastSavedAt(null);
            lastConfigSnapshot.current = '';
            const migrated = migrateToV1(selectedSite.sections_json, {
               name: selectedSite.name,
               email: 'info@rentik.pro'
            });
            const validated = hydrateConfig(migrated);
            reset(validated);
            dispatch({ type: 'SET_SAVING', payload: false });
         } catch (e) {
            console.error("Hydration failed", e);
            reset(DEFAULT_SITE_CONFIG_V1);
         }
      }
   }, [selectedSite, reset]);

   // --- SAVE LOGIC ---
   const handleSave = useCallback(async (silent = false) => {
      if (!selectedSite) return;
      dispatch({ type: 'SET_SAVING', payload: true });
      try {
         await saveSiteConfig(selectedSite, config);
         if (!silent) {
            toast.success("Cambios guardados");
            await loadData();
         }
         setIsDirty(false);
         setLastSavedAt(new Date());
         dispatch({ type: 'SET_SAVING', payload: false });
      } catch (e) {
         console.error("Save failed", e);
         toast.error("Error al guardar");
      }
   }, [selectedSite, config, loadData]);

   // --- AUTOSAVE ---
   const autoSaveTimer = useRef<any>(null);
   useEffect(() => {
      if (!selectedSite) return;
      if (isSaving) return;

      // Detect "dirty" with a lightweight snapshot (UI-only)
      const snapshot = JSON.stringify(config);
      if (!lastConfigSnapshot.current) {
         lastConfigSnapshot.current = snapshot;
         return;
      }
      if (snapshot !== lastConfigSnapshot.current) {
         setIsDirty(true);
      }

      // Debounced autosave (silencioso)
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
         // Evita autosave si no hay cambios
         const nowSnap = JSON.stringify(config);
         if (nowSnap === lastConfigSnapshot.current) return;
         lastConfigSnapshot.current = nowSnap;
         handleSave(true);
      }, 900);

      return () => clearTimeout(autoSaveTimer.current);
   }, [config, selectedSite, isSaving, handleSave]);

   // --- PUBLISH ---
   const handlePublish = async () => {
      if (!selectedSite) return;
      try {
         const slug = selectedSite.slug || generateSlug(selectedSite.name);
         toast.loading("Publicando sitio...");
         await siteConfigApi.publishConfig(slug, config, 'VITE_ADMIN_TOKEN_MOCK');
         toast.success("¡Sitio publicado con éxito!");
      } catch (e) {
         toast.error("Error al publicar");
      }
   };

   const publicUrl = selectedSite?.slug ? `${PUBLIC_WEB_BASE}/${selectedSite.slug}` : '';

   // --- THEME ---
   const handleApplyTheme = (themeConfig: any) => {
      dispatch({ type: 'SET_THEME', payload: themeConfig });
      setShowThemeSelector(false);
      toast.success("Tema aplicado");
   };

   if (!selectedSite) {
      return (
         <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans overflow-y-auto border-t-4 border-red-600">
            <div className="max-w-6xl mx-auto">
               <header className="flex justify-between items-end mb-12">
                  <div>
                     <h1 className="text-4xl font-black text-slate-800 mb-2">Website Builder <span className="text-indigo-600">Ferrari</span></h1>
                     <p className="text-slate-500 font-medium">Gestiona tus páginas web con calidad Premium SaaS.</p>
                  </div>
                  <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-2 hover:translate-y-[-2px] transition-all active:scale-95">
                     <Plus size={20} /> Crear Nuevo Sitio
                  </button>
               </header>

               {isLoadingData ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                     <Loader2 className="animate-spin mb-4" size={40} />
                     <span className="font-black uppercase tracking-widest text-xs">Cargando Motores...</span>
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
                              {ws.status === 'published' && (
                                 <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-black px-3 py-1.2 rounded-full uppercase tracking-widest shadow-lg">Publicado</div>
                              )}
                           </div>
                           <div className="px-2 pb-2">
                              <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{ws.name || 'Sin Nombre'}</h3>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 <span>V2 • Actualizado recently</span>
                              </div>
                           </div>
                           <div className="mt-auto pt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">Abrir Editor</button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      );
   }

   return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900 border-t-4 border-red-600">
         {/* TOP BAR PRO */}
         <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-50 shrink-0 shadow-sm">
            <div className="flex items-center gap-6">
               <button
                  onClick={() => setSelectedSite(null)}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group"
               >
                  <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
               </button>
               <div className="h-6 w-px bg-slate-100" />
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xs">F</div>
                  <div>
                     <h1 className="text-sm font-black text-slate-800 leading-none mb-1 max-w-[150px] truncate">{selectedSite.name}</h1>
                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Ferrari PRO Builder</p>
                  </div>
               </div>
            </div>

            {/* CENTER: Save status + Responsive switch + History */}
            <div className="flex items-center gap-4">
               {/* Save Status */}
               <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                  {isSaving ? (
                     <>
                        <Loader2 size={14} className="animate-spin text-amber-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Guardando…</span>
                     </>
                  ) : isDirty ? (
                     <>
                        <Save size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Cambios sin guardar</span>
                     </>
                  ) : (
                     <>
                        <CloudIcon size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                           Guardado{lastSavedAt ? ` · ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                     </>
                  )}
               </div>

               {/* Responsive switch */}
               <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  {[
                     { id: 'desktop', icon: Monitor, label: 'Desktop' },
                     { id: 'tablet', icon: TabletIcon, label: 'Tablet' },
                     { id: 'mobile', icon: Smartphone, label: 'Mobile' }
                  ].map(d => (
                     <button
                        key={d.id}
                        onClick={() => dispatch({ type: 'SET_DEVICE', payload: d.id as any })}
                        className={`p-2 rounded-xl transition-all ${device === d.id ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-indigo-400'}`}
                        title={d.label}
                        aria-label={d.label}
                     >
                        <d.icon size={18} />
                     </button>
                  ))}
               </div>

               {/* Undo / Redo */}
               <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <button onClick={undo} disabled={!canUndo} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-800 transition-all active:scale-90 disabled:opacity-20">
                     <Undo2 size={18} />
                  </button>
                  <button onClick={redo} disabled={!canRedo} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-800 transition-all active:scale-90 disabled:opacity-20">
                     <Redo2 size={18} />
                  </button>
               </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
               <button
                  onClick={() => setShowThemeSelector(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
               >
                  <Palette size={16} /> Temas
               </button>
               <button
                  onClick={() => {
                     if (!publicUrl) {
                        toast.error("Falta slug para ver la web");
                        return;
                     }
                     window.open(publicUrl, "_blank", "noopener,noreferrer");
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200"
                  title={publicUrl || "Configura el slug para ver la web"}
               >
                  <Globe size={16} /> Ver web
               </button>
               <button
                  onClick={() => handleSave()}
                  className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${isSaving ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400'}
                        `}
               >
                  <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
                  {isSaving ? 'Guardando...' : 'Guardar'}
               </button>
               <button
                  onClick={handlePublish}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl hover:shadow-indigo-100"
               >
                  <CloudIcon size={16} /> Publicar
               </button>
            </div>
         </header>

         {/* MAIN LAYOUT: 3 columns */}
         <div className="grid grid-cols-[260px_1fr_320px] h-[calc(100vh-56px)] overflow-hidden">
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

         {/* Theme Selector Modal */}
         {showThemeSelector && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-20">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowThemeSelector(false)} />
               <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl relative z-[101] overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-10 flex flex-col h-full max-h-[85vh]">
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
                              onClick={() => handleApplyTheme(template.config.theme)}
                           >
                              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                 <Palette size={20} />
                              </div>
                              <h3 className="text-lg font-black text-slate-800 mb-2">{template.name}</h3>
                              <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-6 truncate">{template.description}</p>

                              <div className="mt-auto flex items-center gap-2">
                                 <div className="flex -space-x-1">
                                    {Object.values(template.config.theme.colors).slice(0, 3).map((c: any, i) => (
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