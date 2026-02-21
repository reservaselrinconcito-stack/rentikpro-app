import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
   Plus, Search, Globe, Layout,
   ArrowLeft, Loader2, Play
} from 'lucide-react';

// Services & API
import { projectManager } from '@/services/projectManager';
import { useDataRefresh } from '@/services/dataRefresher';
import { WebSite } from '@/types';
import { saveSiteConfig, publishSiteConfig, checkSlugCollision } from '../modules/webBuilder/api';
import { migrateToV1, hydrateConfig } from '../modules/webBuilder/adapters';
import { normalizeSlug } from '../modules/webBuilder/slug';
import { DEFAULT_SITE_CONFIG_V1 } from '../modules/webBuilder/defaults';
import { SiteConfigV1 } from '../modules/webBuilder/types';

// Builder v2 Components
import { useBuilder } from './builder/hooks/useBuilder';
import { BuilderHeader } from './builder/components/BuilderHeader';
import { SidebarLeft } from './builder/components/SidebarLeft';
import { SidebarRight } from './builder/components/SidebarRight';
import { Canvas } from './builder/components/Canvas';

export const WebsiteBuilder: React.FC = () => {
   // Selection state
   const [websites, setWebsites] = useState<WebSite[]>([]);
   const [isLoadingData, setIsLoadingData] = useState(true);
   const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);

   // Initial state for the builder (we'll sync this when site is selected)
   const {
      state, dispatch, undo, redo, canUndo, canRedo,
      reset, addBlock, moveBlock
   } = useBuilder(DEFAULT_SITE_CONFIG_V1);

   const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle');

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
            const migrated = migrateToV1(selectedSite.sections_json, {
               name: selectedSite.name,
               email: 'info@rentik.pro'
            });
            const validated = hydrateConfig(migrated);
            reset(validated);
            setSaveStatus('saved');
         } catch (e) {
            console.error("Hydration failed", e);
            reset(DEFAULT_SITE_CONFIG_V1);
            setSaveStatus('idle');
         }
      }
   }, [selectedSite, reset]);

   // --- SAVE LOGIC ---
   const handleSave = useCallback(async (silent = false) => {
      if (!selectedSite) return;
      setSaveStatus('saving');
      try {
         await saveSiteConfig(selectedSite, state.config);
         if (!silent) await loadData();

         // Re-fetch or update selected site to refresh timestamp
         const updated = await projectManager.getStore().getWebsites();
         const current = updated.find(w => w.id === selectedSite.id);
         if (current) setSelectedSite(current);

         setSaveStatus('saved');
      } catch (e) {
         console.error("Save failed", e);
         setSaveStatus('error');
      }
   }, [selectedSite, state.config, loadData]);

   // --- AUTOSAVE ---
   const autoSaveTimer = useRef<any>(null);
   useEffect(() => {
      if (saveStatus === 'unsaved') {
         if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
         autoSaveTimer.current = setTimeout(() => handleSave(true), 5000);
      }
      return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
   }, [state.config, saveStatus, handleSave]);

   // Detect changes to trigger unsaved state
   useEffect(() => {
      if (saveStatus === 'saved' || saveStatus === 'idle') {
         // We only want to set unsaved if the config actually diverged from what we know is saved
         // But simple way for now:
         setSaveStatus('unsaved');
      }
   }, [state.config]);

   // --- KEYBOARD SHORTCUTS ---
   useEffect(() => {
      const handleKeys = (e: KeyboardEvent) => {
         if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) redo(); else undo();
         }
         if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
         }
      };
      window.addEventListener('keydown', handleKeys);
      return () => window.removeEventListener('keydown', handleKeys);
   }, [undo, redo, handleSave]);

   if (!selectedSite) {
      return (
         <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans overflow-y-auto">
            <div className="max-w-6xl mx-auto">
               <header className="flex justify-between items-end mb-12">
                  <div>
                     <h1 className="text-4xl font-black text-slate-800 mb-2">Website Builder <span className="text-indigo-600">2.0</span></h1>
                     <p className="text-slate-500 font-medium">Gestiona y publica tus páginas web con calidad SaaS premium.</p>
                  </div>
                  <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-2 hover:translate-y-[-2px] transition-all active:scale-95">
                     <Plus size={20} /> Crear Nuevo Sitio
                  </button>
               </header>

               {isLoadingData ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                     <Loader2 className="animate-spin mb-4" size={40} />
                     <span className="font-black uppercase tracking-widest text-xs">Cargando Proyectos...</span>
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
                              <div className="text-slate-100 font-black text-6xl opacity-50 select-none group-hover:text-indigo-50 transition-colors">WEB</div>
                              {ws.status === 'published' && (
                                 <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-black px-3 py-1.2 rounded-full uppercase tracking-widest shadow-lg">Publicado</div>
                              )}
                           </div>
                           <div className="px-2 pb-2">
                              <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{ws.name || 'Sin Nombre'}</h3>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 <span>Editado hace {Math.floor((Date.now() - ws.updated_at) / (1000 * 60 * 60 * 24))} días</span>
                              </div>
                           </div>
                           <div className="mt-auto pt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">Editar</button>
                              <button className="p-2 border border-slate-100 rounded-xl text-slate-400 hover:bg-slate-50"><Globe size={16} /></button>
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
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
         <BuilderHeader
            siteName={selectedSite.name || 'Sin Nombre'}
            onBack={() => {
               if (saveStatus === 'unsaved' && !confirm('Tienes cambios sin guardar. ¿Salir?')) return;
               setSelectedSite(null);
            }}
            device={state.device}
            setDevice={(d) => dispatch({ type: 'SET_DEVICE', payload: d })}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onSave={handleSave}
            onPublish={() => alert('Publishing flow coming in Phase 6')}
            saveStatus={saveStatus}
         />

         <div className="flex-1 flex overflow-hidden">
            <SidebarLeft onAddBlock={addBlock} />

            <Canvas
               config={state.config}
               device={state.device}
               selectedBlockId={state.selectedBlockId}
               onSelectBlock={(id) => dispatch({ type: 'SELECT_BLOCK', payload: id })}
            />

            <SidebarRight
               selectedBlock={state.config.pages['/']?.blocks.find(b => b.id === state.selectedBlockId) || null}
               tab={state.inspectorTab}
               setTab={(t) => dispatch({ type: 'SET_INSPECTOR_TAB', payload: t })}
               onUpdateBlock={(id, updates) => dispatch({ type: 'UPDATE_BLOCK', payload: { id, updates } })}
               onRemoveBlock={(id) => dispatch({ type: 'REMOVE_BLOCK', payload: id })}
               onMoveBlock={moveBlock}
               blockIndex={state.config.pages['/']?.blocks.findIndex(b => b.id === state.selectedBlockId) ?? -1}
            />
         </div>
      </div>
   );
};