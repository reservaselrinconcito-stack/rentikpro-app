import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Globe, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { WebSite } from '../types';

const generateSlug = (name: string): string => {
   return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
};

export const WebsiteBuilder: React.FC = () => {
   const navigate = useNavigate();

   const [site, setSite] = useState<WebSite | null>(null);
   const [siteDraft, setSiteDraft] = useState({
      name: '',
      slug: '',
      slugManuallyEdited: false
   });

   const [validationError, setValidationError] = useState<string | null>(null);
   const [isSaving, setIsSaving] = useState(false);

   // --- LOAD ---
   const loadSite = useCallback(async () => {
      const store = projectManager.getStore();
      const existing = await store.getMyWebsite();

      if (existing) {
         setSite(existing);
         let features: any = {};
         try { features = JSON.parse(existing.features_json || '{}'); } catch (e) { }

         setSiteDraft({
            name: existing.name || '',
            slug: existing.subdomain || '',
            slugManuallyEdited: !!features.slugManuallyEdited
         });
      } else {
         // Default state for new site
         setSiteDraft({
            name: '',
            slug: '',
            slugManuallyEdited: false
         });
      }
   }, []);

   useEffect(() => { loadSite(); }, [loadSite]);

   // --- SAVE ---
   const handleSave = async (draft = siteDraft) => {
      const store = projectManager.getStore();
      setIsSaving(true);

      try {
         const now = Date.now();
         const websiteToSave: WebSite = {
            id: site?.id || crypto.randomUUID(),
            property_id: site?.property_id || projectManager.getActivePropertyId() || 'prop_default',
            name: draft.name,
            subdomain: draft.slug,
            template_slug: site?.template_slug || 'universal-v1',
            plan_type: site?.plan_type || 'basic',
            public_token: site?.public_token || crypto.randomUUID(),
            is_published: site?.is_published || false,
            // Perist the manual flag in features_json as requested
            features_json: JSON.stringify({ slugManuallyEdited: draft.slugManuallyEdited }),
            theme_config: site?.theme_config || '{}',
            seo_title: site?.seo_title || draft.name,
            seo_description: site?.seo_description || '',
            sections_json: site?.sections_json || '[]',
            booking_config: site?.booking_config || '{}',
            property_ids_json: site?.property_ids_json || '[]',
            allowed_origins_json: site?.allowed_origins_json || '[]',
            created_at: site?.created_at || now,
            updated_at: now
         };

         await store.saveWebsite(websiteToSave);
         setSite(websiteToSave);
      } catch (err) {
         console.error("Failed to save website:", err);
      } finally {
         setIsSaving(false);
      }
   };

   // Auto-generación del slug (si no es manual)
   useEffect(() => {
      if (!siteDraft.slugManuallyEdited && siteDraft.name) {
         const newSlug = generateSlug(siteDraft.name);
         if (newSlug !== siteDraft.slug) {
            setSiteDraft(prev => ({ ...prev, slug: newSlug }));
         }
      }
   }, [siteDraft.name, siteDraft.slugManuallyEdited, siteDraft.slug]);

   // Validación del slug
   useEffect(() => {
      const slug = siteDraft.slug;
      if (slug.length > 0 && slug.length < 3) {
         setValidationError('El slug debe tener al menos 3 caracteres');
      } else if (slug.length > 50) {
         setValidationError('El slug no puede superar los 50 caracteres');
      } else if (slug.length > 0 && !/^[a-z0-9-]+$/.test(slug)) {
         setValidationError('Solo se permiten letras minúsculas, números y guiones');
      } else if (slug.startsWith('-') || slug.endsWith('-')) {
         setValidationError('El slug no puede empezar ni terminar con guión');
      } else if (slug.includes('--')) {
         setValidationError('No se permiten guiones consecutivos');
      } else {
         setValidationError(null);
      }
   }, [siteDraft.slug]);

   const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      const newDraft = { ...siteDraft, name: newName };
      setSiteDraft(newDraft);
      // Persist immediate change or debounced? Manual save button used here to be safe
   };

   const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Limpieza básica inmediata mientras escribe
      const val = e.target.value.toLowerCase().replace(/\s+/g, '-');
      setSiteDraft(prev => ({ ...prev, slug: val, slugManuallyEdited: true }));
   };

   const handleRegenerateSlug = () => {
      const regeneratedSlug = generateSlug(siteDraft.name);
      setSiteDraft(prev => ({
         ...prev,
         slug: regeneratedSlug,
         slugManuallyEdited: false
      }));
   };

   return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
         <div className="flex justify-between items-center">
            <button
               onClick={() => navigate(-1)}
               className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
               <ArrowLeft className="w-5 h-5" />
               Volver
            </button>

            <button
               onClick={() => handleSave()}
               disabled={isSaving || !!validationError}
               className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg ${isSaving ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'}`}
            >
               {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
               GUARDAR CAMBIOS
            </button>
         </div>

         <header>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Constructor de Web</h1>
            <p className="text-slate-500">Configura la identidad y dirección de tu página pública.</p>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 space-y-6">
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nombre de la Propiedad</label>
                  <input
                     type="text"
                     value={siteDraft.name}
                     onChange={handleNameChange}
                     placeholder="Ej: El Rinconcito Rural"
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-medium"
                  />
               </div>

               <div className="space-y-2">
                  <div className="flex justify-between items-center">
                     <label className="text-xs font-black uppercase tracking-widest text-slate-400">Slug de la URL</label>
                     {siteDraft.slugManuallyEdited && (
                        <button
                           onClick={handleRegenerateSlug}
                           className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-tighter"
                        >
                           <RefreshCw className="w-3 h-3" /> Regenerar automáticament
                        </button>
                     )}
                  </div>
                  <div className="relative">
                     <input
                        type="text"
                        value={siteDraft.slug}
                        onChange={handleSlugChange}
                        placeholder="el-rinconcito-rural"
                        className={`w-full px-5 py-4 bg-slate-50 border ${validationError ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-200'} rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-mono text-sm`}
                     />
                     <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {validationError ? (
                           <AlertCircle className="w-5 h-5 text-rose-500" />
                        ) : siteDraft.slug.length >= 3 ? (
                           <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : null}
                     </div>
                  </div>
                  {validationError && (
                     <p className="text-rose-500 text-[11px] font-bold pl-1">{validationError}</p>
                  )}
               </div>

               <div className="pt-4 p-5 bg-indigo-50/50 border border-indigo-100 rounded-3xl space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600">
                     <Globe size={16} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Previsualización de URL</span>
                  </div>
                  <p className="text-slate-700 font-mono text-xs break-all">
                     rp-web.pages.dev/<span className="text-indigo-600 font-bold">{siteDraft.slug || '...'}</span>
                  </p>
               </div>
            </div>

            <div className="space-y-6">
               <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
                  <h3 className="text-lg font-bold mb-4">Estado del Borrador</h3>
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${site ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                           {site ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        </div>
                        <div>
                           <p className="text-xs font-bold">{site ? 'Persistido en el Proyecto' : 'Pendiente de Guardar'}</p>
                           <p className="text-[10px] text-slate-500">{site ? `ID: ${site.id.slice(0, 8)}...` : 'Se creará al guardar por primera vez'}</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${siteDraft.slugManuallyEdited ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
                           {siteDraft.slugManuallyEdited ? <RefreshCw size={16} className="rotate-45" /> : <RefreshCw size={16} className="animate-spin-slow" />}
                        </div>
                        <div>
                           <p className="text-xs font-bold">{siteDraft.slugManuallyEdited ? 'Slug Manual' : 'Sincronización Activa'}</p>
                           <p className="text-[10px] text-slate-500">{siteDraft.slugManuallyEdited ? 'Editas la URL de forma independiente' : 'La URL sigue cambios en el nombre'}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
