import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Globe, CheckCircle2, AlertCircle, Save, X } from 'lucide-react';
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

const TEMPLATES = [
   { id: 'modern', name: 'Moderno', desc: 'Diseño limpio y espacioso', color: 'bg-indigo-500' },
   { id: 'classic', name: 'Clásico', desc: 'Elegancia tradicional', color: 'bg-slate-600' },
   { id: 'minimal', name: 'Minimal', desc: 'Solo lo esencial', color: 'bg-zinc-800' }
];

export const WebsiteBuilder: React.FC = () => {
   const navigate = useNavigate();
   const [activeTab, setActiveTab] = useState<'template' | 'content' | 'publish'>('content');

   const [site, setSite] = useState<WebSite | null>(null);
   const [webSpec, setWebSpec] = useState<WebSpec | null>(null);

   const [isSaving, setIsSaving] = useState(false);
   const [saveError, setSaveError] = useState<string | null>(null);
   const [validationError, setValidationError] = useState<string | null>(null);

   // Draft State for Slug (separate from WebSpec for validation/debouncing)
   const [slugDraft, setSlugDraft] = useState('');
   const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

   // --- LOAD ---
   const loadSite = useCallback(async () => {
      const store = projectManager.getStore();
      const existing = await store.loadWebsite();
      let spec: WebSpec;

      if (existing) {
         setSite(existing);
         setSlugDraft(existing.subdomain);

         // Parse and Normalize config_json
         let config: any = {};
         if (existing.config_json) {
            try {
               config = JSON.parse(existing.config_json);
            } catch (e) {
               console.error("Failed to parse config", e);
            }
         }
         spec = normalizeWebSpec(config);

         // Helper: if slug manually edited flag stored
         if (existing.features_json) {
            try {
               const feats = JSON.parse(existing.features_json);
               setSlugManuallyEdited(feats.slugManuallyEdited || false);
            } catch { }
         }
      } else {
         // NEW SITE
         const settings = await store.getSettings();
         const businessName = settings.business_name || 'Mi Alojamiento';

         spec = {
            version: 1,
            templateId: 'modern',
            brand: {
               name: businessName,
               phone: settings.contact_phone,
               email: settings.contact_email
            },
            theme: {},
            sections: createDefaultSections(),
            integrations: undefined
         };

         setSlugDraft(generateSlug(businessName));
      }

      setWebSpec(spec);
   }, []);

   useEffect(() => { loadSite(); }, [loadSite]);

   // --- SAVE ---
   const handleSave = async (publish = false) => {
      if (!webSpec) return;
      setIsSaving(true);
      setSaveError(null);

      const store = projectManager.getStore();
      const propertyId = site?.property_id || projectManager.getActivePropertyId() || 'prop_default';
      const publicToken = site?.public_token || crypto.randomUUID().replace(/-/g, '');

      try {
         // Prepare WebSpec for persistence
         const configToSave: WebSpec = {
            ...webSpec,
            integrations: {
               rentikpro: { propertyId, publicToken }
            }
         };

         const config_json = JSON.stringify(configToSave);
         const now = Date.now();

         const websiteToSave: WebSite = {
            id: site?.id || crypto.randomUUID(),
            property_id: propertyId,
            name: webSpec.brand.name,
            subdomain: slugDraft, // Use draft slug
            slug: slugDraft,
            template_slug: webSpec.templateId,
            plan_type: site?.plan_type || 'basic',
            public_token: publicToken,
            is_published: publish ? true : (site?.is_published || false),
            features_json: JSON.stringify({ slugManuallyEdited }),
            config_json,
            theme_config: JSON.stringify(webSpec.theme),
            // Legacy/SEO fallbacks
            seo_title: webSpec.brand.name,
            seo_description: '',
            sections_json: JSON.stringify(webSpec.sections),
            booking_config: '{}',
            property_ids_json: '[]',
            allowed_origins_json: '[]',
            created_at: site?.created_at || now,
            updated_at: now
         };

         await store.saveWebsite(websiteToSave);
         setSite(websiteToSave);
         if (publish) navigate(0); // Optional refresh/notify

      } catch (err: any) {
         console.error("Save failed", err);
         setSaveError(err.message || String(err));
      } finally {
         setIsSaving(false);
      }
   };

   // --- LOGIC ---
   const updateWebSpec = (fn: (prev: WebSpec) => WebSpec) => {
      setWebSpec(prev => prev ? fn(prev) : null);
   };

   const toggleSection = (id: string, enabled: boolean) => {
      updateWebSpec(prev => ({
         ...prev,
         sections: prev.sections.map(s => s.id === id ? { ...s, enabled } : s)
      }));
   };

   const moveSection = (index: number, direction: 'up' | 'down') => {
      if (!webSpec) return;
      const newSections = [...webSpec.sections];
      if (direction === 'up' && index > 0) {
         [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
      } else if (direction === 'down' && index < newSections.length - 1) {
         [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      }
      updateWebSpec(prev => ({ ...prev, sections: newSections }));
   };

   // Slug Sync
   useEffect(() => {
      if (!slugManuallyEdited && webSpec?.brand.name) {
         const newSlug = generateSlug(webSpec.brand.name);
         if (newSlug !== slugDraft) setSlugDraft(newSlug);
      }
   }, [webSpec?.brand.name, slugManuallyEdited, slugDraft]);


   if (!webSpec) return <div className="p-10 text-center">Cargando constructor...</div>;

   return (
      <div className="h-screen flex flex-col bg-slate-50">
         {/* HEADER */}
         <div className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0 z-10">
            <div className="flex items-center gap-4">
               <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                  <ArrowLeft size={20} />
               </button>
               <div>
                  <h1 className="font-bold text-lg text-slate-800">Constructor Web</h1>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                     {site?.is_published ? <span className="text-emerald-600 font-bold">● PUBLICADO</span> : <span className="text-amber-500 font-bold">● BORRADOR</span>}
                     <span className="text-slate-300">|</span> {slugDraft}
                  </p>
               </div>
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
               </div >
            </div >
         </div >
      </div >
   );
};
