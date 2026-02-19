import React, { useState, useEffect, useCallback } from 'react';
import {
   ArrowLeft, RefreshCw, Globe, CheckCircle2, AlertCircle, Save, X,
   Layout, Layers, Send, GripVertical, Eye, EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { WebSite } from '../types';
import { WebSpec, normalizeWebSpec, createDefaultSections } from '../services/webSpec';

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


   // --- PREVIEW URL ---
   const getPreviewUrl = () => {
      const baseUrl = (import.meta.env.VITE_PUBLIC_SITE_BASE_URL || window.location.origin).replace(/\/$/, '');
      return `${baseUrl}/${slugDraft}`;
   };

   const copyToClipboard = () => {
      navigator.clipboard.writeText(getPreviewUrl());
      // Todo: visual feedback
   };

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

            <div className="flex gap-2">
               <button
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors flex items-center gap-2"
               >
                  {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  Guardar
               </button>
               {activeTab === 'publish' && (
                  <button
                     onClick={() => handleSave(true)}
                     disabled={isSaving}
                     className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                     <Globe size={16} /> Publicar
                  </button>
               )}
            </div>
         </div>

         {/* MAIN CONTENT */}
         <div className="flex-1 flex overflow-hidden">

            {/* SIDEBAR TABS */}
            <div className="w-16 bg-white border-r flex flex-col items-center py-6 gap-6 shrink-0 z-20">
               <TabIcon icon={Layout} label="Diseño" active={activeTab === 'template'} onClick={() => setActiveTab('template')} />
               <TabIcon icon={Layers} label="Bloques" active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
               <TabIcon icon={Send} label="Publicar" active={activeTab === 'publish'} onClick={() => setActiveTab('publish')} />
            </div>

            {/* PANEL AREA */}
            <div className="w-[400px] bg-white border-r flex flex-col shrink-0 overflow-y-auto">

               {activeTab === 'template' && (
                  <div className="p-6 space-y-6">
                     <h2 className="font-bold text-xl">Elige tu estilo</h2>
                     <div className="space-y-4">
                        {TEMPLATES.map(t => (
                           <div
                              key={t.id}
                              onClick={() => updateWebSpec(prev => ({ ...prev, templateId: t.id as any }))}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${webSpec.templateId === t.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                           >
                              <div className={`h-24 ${t.color} rounded-lg mb-3 shadow-inner opacity-80`}></div>
                              <div className="flex justify-between items-center">
                                 <div>
                                    <h3 className="font-bold text-slate-800">{t.name}</h3>
                                    <p className="text-xs text-slate-500">{t.desc}</p>
                                 </div>
                                 {webSpec.templateId === t.id && <div className="bg-indigo-600 text-white p-1 rounded-full"><CheckCircle2 size={16} /></div>}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {activeTab === 'content' && (
                  <div className="p-6 space-y-6">
                     <h2 className="font-bold text-xl">Contenido de la Página</h2>

                     {/* BRANDING */}
                     <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                        <label className="text-xs font-bold uppercase text-slate-400">Nombre del Alojamiento</label>
                        <input
                           value={webSpec.brand.name}
                           onChange={e => updateWebSpec(prev => ({ ...prev, brand: { ...prev.brand, name: e.target.value } }))}
                           className="w-full p-2 border rounded-lg text-sm font-semibold"
                        />
                     </div>

                     {/* SECTIONS LIST */}
                     <div className="space-y-2">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2">Secciones</p>
                        {webSpec.sections.map((section, idx) => (
                           <div key={section.id} className="bg-white border hover:border-indigo-200 rounded-lg p-3 transition-all group">
                              <div className="flex items-center gap-3">
                                 <div className="text-slate-300 cursor-grab active:cursor-grabbing"><GripVertical size={16} /></div>

                                 <div className="flex-1">
                                    <h4 className="font-semibold text-sm capitalize">{section.type}</h4>
                                    <p className="text-[10px] text-slate-400 font-mono">{section.id}</p>
                                 </div>

                                 <div className="flex items-center gap-2">
                                    <button
                                       onClick={() => toggleSection(section.id, !section.enabled)}
                                       className={`p-1.5 rounded-md transition-colors ${section.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                       {section.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                 </div>
                              </div>

                              {section.type === 'hero' && section.enabled && (
                                 <div className="mt-3 pt-3 border-t grid gap-2">
                                    <input
                                       placeholder="Título Principal"
                                       value={section.data.title || ''}
                                       onChange={e => {
                                          const newVal = e.target.value;
                                          updateWebSpec(prev => ({
                                             ...prev,
                                             sections: prev.sections.map(s => s.id === 'hero' ? { ...s, data: { ...s.data, title: newVal } } : s)
                                          }));
                                       }}
                                       className="text-sm p-2 border rounded bg-slate-50"
                                    />
                                    <input
                                       placeholder="Subtítulo"
                                       value={section.data.subtitle || ''}
                                       onChange={e => {
                                          const newVal = e.target.value;
                                          updateWebSpec(prev => ({
                                             ...prev,
                                             sections: prev.sections.map(s => s.id === 'hero' ? { ...s, data: { ...s.data, subtitle: newVal } } : s)
                                          }));
                                       }}
                                       className="text-sm p-2 border rounded bg-slate-50"
                                    />
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {activeTab === 'publish' && (
                  <div className="p-6 space-y-6">
                     <h2 className="font-bold text-xl">Configuración de URL</h2>

                     <div className="space-y-4">
                        <div>
                           <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Dirección Web (Slug)</label>
                           <div className="flex items-center border rounded-xl overflow-hidden bg-slate-50 focus-within:ring-2 ring-indigo-500/20">
                              <span className="pl-4 pr-1 text-slate-400 text-sm font-mono">
                                 {(import.meta.env.VITE_PUBLIC_SITE_BASE_URL || window.location.origin).replace(/\/$/, '')}/
                              </span>
                              <input
                                 value={slugDraft}
                                 onChange={e => {
                                    setSlugDraft(e.target.value);
                                    setSlugManuallyEdited(true);
                                 }}
                                 className="flex-1 p-3 bg-transparent outline-none font-mono text-sm text-slate-800 font-bold"
                              />
                           </div>
                           <p className="text-xs text-slate-400 mt-2">Esta es la dirección única donde tus huéspedes verán tu página.</p>
                        </div>

                        <div className="pt-6 border-t space-y-3">
                           <h3 className="font-bold text-sm text-slate-800">Previsualización</h3>

                           {!import.meta.env.VITE_PUBLIC_SITE_BASE_URL && (
                              <div className="p-3 bg-amber-50 rounded-lg text-amber-700 text-xs flex gap-2">
                                 <AlertCircle size={16} />
                                 <span>Base URL no configurada (VITE_PUBLIC_SITE_BASE_URL)</span>
                              </div>
                           )}

                           <div className="flex gap-2">
                              <a
                                 href={getPreviewUrl()}
                                 target="_blank"
                                 rel="noreferrer"
                                 className="flex-1 block p-4 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors group text-left"
                              >
                                 <div className="flex items-center gap-2 text-indigo-700 font-bold mb-1">
                                    <Globe size={16} /> Abrir Página Web
                                 </div>
                                 <p className="text-xs text-indigo-600/70 truncate group-hover:underline font-mono">
                                    {getPreviewUrl()}
                                 </p>
                              </a>
                              <button
                                 onClick={copyToClipboard}
                                 className="px-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
                                 title="Copiar URL"
                              >
                                 <div className="flex flex-col items-center gap-1">
                                    <RefreshCw size={16} className="rotate-90" /> {/* Using refresh icon as distinct from link for now */}
                                    <span className="text-[10px] font-bold">COPIAR</span>
                                 </div>
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* PREVIEW AREA (IFRAME MOCK) */}
            <div className="flex-1 bg-slate-100 p-8 flex justify-center items-start overflow-y-auto">
               <div className="w-full max-w-[400px] h-[800px] bg-white rounded-[3rem] shadow-2xl border-8 border-slate-800 relative overflow-hidden flex flex-col">
                  {/* PHONE NOTCH */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>

                  {/* PHONE HEADER */}
                  <div className="h-14 bg-white/90 backdrop-blur border-b flex items-center justify-between px-6 pt-2 shrink-0 z-10 sticky top-0">
                     <span className="font-bold text-sm truncate">{webSpec.brand.name}</span>
                     <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
                  </div>

                  {/* PHONE CONTENT PREVIEW */}
                  <div className="flex-1 overflow-y-auto pb-10">
                     {/* HERO PREVIEW */}
                     {webSpec.sections.find(s => s.id === 'hero' && s.enabled) && (
                        <div className="h-48 bg-slate-200 relative flex items-center justify-center text-center p-6 bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=500&q=60)` }}>
                           <div className="absolute inset-0 bg-black/30"></div>
                           <div className="relative text-white z-10">
                              <h1 className="font-bold text-2xl leading-tight mb-2">
                                 {webSpec.sections.find(s => s.id === 'hero')?.data.title || 'Título'}
                              </h1>
                              <p className="text-xs opacity-90">
                                 {webSpec.sections.find(s => s.id === 'hero')?.data.subtitle || 'Subtítulo'}
                              </p>
                           </div>
                        </div>
                     )}

                     {/* APARTMENTS PREVIEW (MOCK) */}
                     {webSpec.sections.find(s => s.id === 'apartments' && s.enabled) && (
                        <div className="p-4 space-y-4">
                           <h3 className="font-bold text-lg">Nuestros Alojamientos</h3>
                           <div className="space-y-3">
                              {[1, 2].map(i => (
                                 <div key={i} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                    <div className="h-32 bg-slate-100"></div>
                                    <div className="p-3">
                                       <div className="h-4 w-3/4 bg-slate-200 rounded mb-2"></div>
                                       <div className="h-3 w-1/2 bg-slate-100 rounded"></div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${slugManuallyEdited ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
               {slugManuallyEdited ? <RefreshCw size={16} className="rotate-45" /> : <RefreshCw size={16} className="animate-spin-slow" />}
            </div>
            <div>
               <p className="text-xs font-bold">{slugManuallyEdited ? 'Slug Manual' : 'Sincronización Activa'}</p>
               <p className="text-[10px] text-slate-500">{slugManuallyEdited ? 'Editas la URL de forma independiente' : 'La URL sigue cambios en el nombre'}</p>
            </div>
         </div>
      </div>
   );
};

const TabIcon = ({ icon: Icon, label, active, onClick }: any) => (
   <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 w-full transition-colors relative ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
   >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-50' : ''}`}>
         <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className="text-[10px] font-bold">{label}</span>
      {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-l-full"></div>}
   </button>
);
