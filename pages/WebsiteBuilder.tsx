
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { projectManager } from '../services/projectManager';
import { WebSite, Property, Apartment } from '../types';
import { useDataRefresh } from '../services/dataRefresher';
import { PromptBuilder } from '../components/PromptBuilder';
import { 
  Globe, LayoutTemplate, Palette, Type, MousePointer, ExternalLink, 
  Settings, Save, Plus, X, Laptop, Smartphone, CheckCircle2, ChevronRight, 
  Image as ImageIcon, Edit2, Play, Calendar, Search, Sparkles, Copy, Bot,
  ToggleLeft, ToggleRight, List, Zap, MapPin, Wrench, CreditCard, Megaphone,
  RefreshCw, History, Star, Trash2, ArrowRight, ArrowLeft, Code,
  Upload, Download, FileDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SECTIONS_DEFAULT = [
  { id: 'hero', type: 'hero', content: { title: 'Bienvenido a tu Refugio', subtitle: 'Descubre nuestros alojamientos únicos.', bg_image: '' } },
  { id: 'properties', type: 'properties', content: { title: 'Nuestras Casas' } },
  { id: 'about', type: 'text', content: { title: 'Sobre Nosotros', body: 'Llevamos 10 años ofreciendo experiencias inolvidables en el mundo rural.' } },
  { id: 'contact', type: 'contact', content: { email: 'info@ejemplo.com', phone: '+34 600 000 000' } }
];

// --- MAIN PAGE COMPONENT ---

export const WebsiteBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [websites, setWebsites] = useState<WebSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  
  // JSON Editor State
  const [jsonError, setJsonError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadWebsites = useCallback(async () => {
    const list = await projectManager.getStore().getWebsites();
    setWebsites(list);
  }, []);

  useEffect(() => { loadWebsites(); }, [loadWebsites]);
  useDataRefresh(loadWebsites);

  const sections = useMemo(() => {
    try {
      const parsed = JSON.parse(selectedSite?.sections_json || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [selectedSite?.sections_json]);

  const handleCreate = async () => {
    const newSite: WebSite = {
      id: crypto.randomUUID(),
      name: 'Nueva Web',
      subdomain: `site-${Date.now().toString(36).slice(-6)}`,
      status: 'draft',
      theme_config: { primary_color: '#4F46E5', font_family: 'Inter', layout_mode: 'modern' },
      seo_title: '',
      seo_description: '',
      sections_json: JSON.stringify(SECTIONS_DEFAULT, null, 2),
      booking_config: { min_stay: 2, max_stay: 30, advance_notice_days: 1, check_in_time: '15:00', check_out_time: '11:00' },
      property_ids_json: '[]',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    await projectManager.getStore().saveWebsite(newSite);
    loadWebsites();
    setSelectedSite(newSite);
  };

  const handleSave = async () => {
    if(!selectedSite) return;
    try {
       // Validate JSON
       JSON.parse(selectedSite.sections_json);
       await projectManager.getStore().saveWebsite({...selectedSite, updated_at: Date.now()});
       alert("Guardado correctamente");
       setJsonError(null);
       loadWebsites();
    } catch(e) {
       alert("Error: JSON inválido. Revisa la sintaxis.");
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm("¿Eliminar sitio web? Esta acción es irreversible.")) {
       await projectManager.getStore().deleteWebsite(id);
       loadWebsites();
       if(selectedSite?.id === id) setSelectedSite(null);
    }
  };

  const updateSectionJson = (val: string) => {
     if (selectedSite) {
        setSelectedSite({ ...selectedSite, sections_json: val });
        try {
           JSON.parse(val);
           setJsonError(null);
        } catch(e) {
           setJsonError("Sintaxis JSON inválida");
        }
     }
  };

  // --- WEBSPEC IMPORT/EXPORT LOGIC ---

  const handleExportWebSpec = () => {
    if (!selectedSite) return;
    try {
      const webSpec = {
        meta: { generator: "RentikPro Create2Web", version: "1.0" },
        name: selectedSite.name,
        subdomain: selectedSite.subdomain,
        theme_config: selectedSite.theme_config,
        booking_config: selectedSite.booking_config,
        seo: {
          title: selectedSite.seo_title,
          description: selectedSite.seo_description
        },
        sections: JSON.parse(selectedSite.sections_json)
      };

      const blob = new Blob([JSON.stringify(webSpec, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webspec-${selectedSite.subdomain}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Error al exportar: Revisa que el JSON de secciones sea válido.");
    }
  };

  const handleImportWebSpec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSite) return;

    try {
      const text = await file.text();
      const spec = JSON.parse(text);

      if (!spec.sections || !Array.isArray(spec.sections)) throw new Error("El archivo no parece un WebSpec válido (falta 'sections').");

      const updatedSite: WebSite = {
        ...selectedSite,
        name: spec.name || selectedSite.name,
        subdomain: spec.subdomain || selectedSite.subdomain,
        theme_config: spec.theme_config || selectedSite.theme_config,
        booking_config: spec.booking_config || selectedSite.booking_config,
        seo_title: spec.seo?.title || spec.seo_title || '',
        seo_description: spec.seo?.description || spec.seo_description || '',
        sections_json: JSON.stringify(spec.sections, null, 2),
        updated_at: Date.now()
      };

      setSelectedSite(updatedSite);
      alert("Importado correctamente. Revisa los cambios y pulsa Guardar.");
    } catch (err: any) {
      alert("Error importando JSON: " + err.message);
    }
    e.target.value = '';
  };

  const handleLoadFromPublic = async () => {
    if (!selectedSite) return;
    if (!confirm("Esto sobrescribirá la configuración actual con el archivo '/public/webspec.json'. ¿Continuar?")) return;

    try {
      const res = await fetch('/webspec.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const spec = await res.json();

      const updatedSite: WebSite = {
        ...selectedSite,
        name: spec.name || selectedSite.name,
        subdomain: spec.subdomain || selectedSite.subdomain,
        theme_config: spec.theme_config || selectedSite.theme_config,
        booking_config: spec.booking_config || selectedSite.booking_config,
        seo_title: spec.seo?.title || spec.seo_title || '',
        seo_description: spec.seo?.description || spec.seo_description || '',
        sections_json: JSON.stringify(spec.sections, null, 2),
        updated_at: Date.now()
      };

      setSelectedSite(updatedSite);
      alert("Cargado desde /public/webspec.json correctamente.");
    } catch (err: any) {
      alert("No se pudo cargar /webspec.json. Asegúrate de que el archivo existe en la carpeta pública.");
    }
  };

  // Simplified Render for Preview
  const renderSection = (s: any, idx: number) => {
     switch(s.type) {
        case 'hero':
           return (
              <div key={idx} className="relative h-64 bg-slate-900 flex items-center justify-center text-center p-6 bg-cover bg-center" style={{backgroundImage: s.content.bg_image ? `url(${s.content.bg_image})` : undefined}}>
                 <div className="relative z-10 text-white">
                    <h1 className="text-2xl font-black mb-2">{s.content.title}</h1>
                    <p className="text-sm opacity-90">{s.content.subtitle}</p>
                    <button className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold shadow-lg">Reservar Ahora</button>
                 </div>
                 <div className="absolute inset-0 bg-black/40"></div>
              </div>
           );
        case 'properties':
           return (
              <div key={idx} className="p-6 bg-slate-50">
                 <h2 className="text-lg font-bold text-slate-800 mb-4">{s.content.title}</h2>
                 <div className="grid grid-cols-2 gap-4">
                    {[1,2].map(i => (
                       <div key={i} className="bg-white rounded-xl h-32 border border-slate-100"></div>
                    ))}
                 </div>
              </div>
           );
        case 'contact':
           return (
              <div key={idx} className="p-8 bg-slate-900 text-white text-center">
                 <p className="font-bold text-sm mb-2">Contáctanos</p>
                 <p className="text-xs opacity-70">{s.content.email} • {s.content.phone}</p>
              </div>
           );
        default: // Text / Generic
           return (
              <div key={idx} className="p-6 bg-white">
                 <h3 className="font-bold text-slate-800 mb-2">{s.content.title}</h3>
                 <p className="text-sm text-slate-600 leading-relaxed">{s.content.body}</p>
              </div>
           );
     }
  };

  if (selectedSite) {
     return (
        <div className="h-full flex flex-col animate-in fade-in bg-slate-100 rounded-3xl overflow-hidden">
           {/* Top Bar */}
           <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <button onClick={() => setSelectedSite(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ArrowLeft size={20} className="text-slate-500"/></button>
                 <input 
                    className="font-black text-lg text-slate-800 bg-transparent outline-none focus:bg-slate-50 px-2 rounded-lg transition-colors"
                    value={selectedSite.name}
                    onChange={e => setSelectedSite({...selectedSite, name: e.target.value})}
                 />
                 <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${selectedSite.status === 'published' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {selectedSite.status}
                 </span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button onClick={() => setDevice('desktop')} className={`p-2 rounded-lg transition-all ${device === 'desktop' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><Laptop size={16}/></button>
                    <button onClick={() => setDevice('mobile')} className={`p-2 rounded-lg transition-all ${device === 'mobile' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><Smartphone size={16}/></button>
                 </div>
                 <div className="h-6 w-px bg-slate-200"></div>
                 <button onClick={() => setIsPromptModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">
                    <Sparkles size={16}/> Prompt AI
                 </button>
                 <button onClick={() => navigate('/prompt-builder')} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors border border-slate-200">
                    Generador de prompts
                 </button>
                 <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-colors shadow-lg">
                    <Save size={16}/> Guardar
                 </button>
              </div>
           </div>

           <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: Config & JSON */}
              <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
                 <div className="flex-1 flex flex-col p-4">
                    {/* File Toolbar */}
                    <div className="flex gap-2 mb-4 p-2 bg-slate-50 rounded-xl border border-slate-100">
                       <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportWebSpec} />
                       <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 text-[10px] font-bold text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-lg transition-all flex flex-col items-center gap-1">
                          <Upload size={14}/> Importar
                       </button>
                       <button onClick={handleExportWebSpec} className="flex-1 py-2 text-[10px] font-bold text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-lg transition-all flex flex-col items-center gap-1">
                          <Download size={14}/> Exportar
                       </button>
                       <button onClick={handleLoadFromPublic} className="flex-1 py-2 text-[10px] font-bold text-slate-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm rounded-lg transition-all flex flex-col items-center gap-1" title="Cargar /public/webspec.json">
                          <FileDown size={14}/> Reset
                       </button>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Code size={12}/> Configuración JSON</label>
                       {jsonError && <span className="text-[10px] font-bold text-rose-500 animate-pulse">{jsonError}</span>}
                    </div>
                    <textarea 
                       className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-[10px] leading-relaxed text-slate-600 outline-none focus:border-indigo-300 resize-none custom-scrollbar"
                       value={selectedSite.sections_json}
                       onChange={e => updateSectionJson(e.target.value)}
                       spellCheck={false}
                    />
                 </div>
                 {/* Basic Config */}
                 <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-800 mb-4">Configuración General</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Color Principal</label>
                          <div className="flex items-center gap-2">
                             <input type="color" className="w-8 h-8 rounded border-none cursor-pointer" value={selectedSite.theme_config.primary_color} onChange={e => setSelectedSite({...selectedSite, theme_config: {...selectedSite.theme_config, primary_color: e.target.value}})} />
                             <span className="text-xs font-mono text-slate-500">{selectedSite.theme_config.primary_color}</span>
                          </div>
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Subdominio</label>
                          <input className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold" value={selectedSite.subdomain} onChange={e => setSelectedSite({...selectedSite, subdomain: e.target.value})} />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Right Panel: Preview */}
              <div className="flex-1 bg-slate-100 flex items-center justify-center p-8 relative overflow-hidden">
                 <div className={`transition-all duration-500 bg-white shadow-2xl overflow-hidden flex flex-col relative ${device === 'mobile' ? 'w-[375px] h-[667px] rounded-[3rem] border-[8px] border-slate-800' : 'w-full h-full rounded-xl border border-slate-200'}`}>
                    {/* Fake Browser Bar for Desktop */}
                    {device === 'desktop' && (
                       <div className="bg-slate-50 border-b border-slate-100 p-2 flex items-center gap-2 px-4">
                          <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-400"></div><div className="w-3 h-3 rounded-full bg-amber-400"></div><div className="w-3 h-3 rounded-full bg-emerald-400"></div></div>
                          <div className="flex-1 bg-white border border-slate-200 rounded-md h-6 mx-4 flex items-center px-3 text-[10px] text-slate-400 font-medium">rentik.pro/{selectedSite.subdomain}</div>
                       </div>
                    )}
                    
                    {/* Render Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                       {sections.length > 0 ? sections.map((s: any, i: number) => renderSection(s, i)) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300">
                             <LayoutTemplate size={48} className="mb-4"/>
                             <p className="text-sm font-medium">Estructura Vacía</p>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           {isPromptModalOpen && <PromptBuilder onClose={() => setIsPromptModalOpen(false)} currentSite={selectedSite} mode="MODAL" />}
        </div>
     );
  }

  // LIST VIEW
  return (
     <div className="space-y-8 animate-in fade-in pb-20">
        <div className="flex justify-between items-center">
           <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                 <Globe className="text-indigo-600"/> Mis Sitios Web
              </h2>
              <p className="text-slate-500">Crea y gestiona páginas de aterrizaje para tus propiedades.</p>
           </div>
           <div className="flex gap-2">
              <button onClick={() => navigate('/prompt-builder')} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-2">
                 <Sparkles size={16}/> Generador de Prompts
              </button>
              <button onClick={handleCreate} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl shadow-indigo-100 hover:scale-105 transition-all flex items-center gap-2">
                 <Plus size={16}/> Crear Nueva Web
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {websites.map(ws => (
              <div key={ws.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-2 hover:shadow-xl hover:border-indigo-100 transition-all group cursor-pointer" onClick={() => setSelectedSite(ws)}>
                 <div className="bg-slate-100 rounded-[2rem] h-40 mb-4 flex items-center justify-center overflow-hidden relative">
                    {/* Mock Thumbnail */}
                    <LayoutTemplate size={48} className="text-slate-300 group-hover:scale-110 transition-transform duration-500"/>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-slate-600 shadow-sm">
                       {ws.status}
                    </div>
                 </div>
                 <div className="px-6 pb-6">
                    <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{ws.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mb-6 truncate">rentik.pro/{ws.subdomain}</p>
                    
                    <div className="flex justify-between items-center border-t border-slate-50 pt-4">
                       <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white"></div>
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white"></div>
                       </div>
                       <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }} 
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                       >
                          <Trash2 size={18}/>
                       </button>
                    </div>
                 </div>
              </div>
           ))}
           {websites.length === 0 && (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                 <Globe size={64} className="mx-auto text-slate-200 mb-6"/>
                 <h4 className="text-xl font-bold text-slate-400">No tienes sitios web creados</h4>
                 <p className="text-slate-400 mt-2 text-sm">Empieza generando uno con nuestro asistente IA.</p>
              </div>
           )}
        </div>
     </div>
  );
};
