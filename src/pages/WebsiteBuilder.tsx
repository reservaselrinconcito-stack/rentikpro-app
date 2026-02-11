import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { projectManager } from '../services/projectManager';
import { WebSite, Property, Apartment } from '../types';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { PROMPT_TEMPLATES, TemplateId, PromptInputs, PromptTemplate } from '../services/promptTemplates';
import { promptHistory, PromptRecord } from '../services/promptHistoryStore';
import { 
  Globe, LayoutTemplate, Palette, Type, MousePointer, ExternalLink, 
  Settings, Save, Plus, X, Laptop, Smartphone, CheckCircle2, ChevronRight, 
  Image as ImageIcon, Edit2, Play, Calendar, Search, Sparkles, Copy, Bot,
  ToggleLeft, ToggleRight, List, Zap, MapPin, Wrench, CreditCard, Megaphone,
  RefreshCw, History, Star, Trash2, ArrowRight, ArrowLeft, Code
} from 'lucide-react';

const SECTIONS_DEFAULT = [
  { id: 'hero', type: 'hero', content: { title: 'Bienvenido a tu Refugio', subtitle: 'Descubre nuestros alojamientos únicos.', bg_image: '' } },
  { id: 'properties', type: 'properties', content: { title: 'Nuestras Casas' } },
  { id: 'about', type: 'text', content: { title: 'Sobre Nosotros', body: 'Llevamos 10 años ofreciendo experiencias inolvidables en el mundo rural.' } },
  { id: 'contact', type: 'contact', content: { email: 'info@ejemplo.com', phone: '+34 600 000 000' } }
];

// --- ICON MAPPER ---
const IconMap = ({ name, size=16, className="" }: { name: string, size?: number, className?: string }) => {
  switch(name) {
    case 'LayoutTemplate': return <LayoutTemplate size={size} className={className}/>;
    case 'RefreshCw': return <RefreshCw size={size} className={className}/>;
    case 'CreditCard': return <CreditCard size={size} className={className}/>;
    case 'Image': return <ImageIcon size={size} className={className}/>;
    case 'Search': return <Search size={size} className={className}/>;
    case 'Megaphone': return <Megaphone size={size} className={className}/>;
    case 'MapPin': return <MapPin size={size} className={className}/>;
    case 'Wrench': return <Wrench size={size} className={className}/>;
    default: return <Sparkles size={size} className={className}/>;
  }
};

// --- PROMPT BUILDER COMPONENT ---
const PromptBuilderModal = ({ onClose, currentSite }: { onClose: () => void, currentSite?: WebSite | null }) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'EDITOR' | 'HISTORY' | 'FAVORITES'>('EDITOR');
  
  // Config State
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId>('WEB_CREATE_FULL');
  const [isStrict, setIsStrict] = useState(() => localStorage.getItem('pb_strict') === 'true');
  
  // Dynamic Inputs State
  const [inputs, setInputs] = useState<PromptInputs>({
    concept: localStorage.getItem('pb_concept') || '',
    audience: localStorage.getItem('pb_audience') || '',
    tone: localStorage.getItem('pb_tone') || 'Cercano y Profesional',
    style: localStorage.getItem('pb_style') || 'Moderno y Minimalista',
    language: 'es-ES',
    location: '',
    error_details: '',
    campaign_goal: '',
    area_pois: '',
    preserve_structure: false,
    payment_methods: 'Transferencia, Bizum',
    current_json: '', // We use full_context_site for smart trimming mainly
    full_context_site: currentSite
  });

  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [historyRecords, setHistoryRecords] = useState<PromptRecord[]>([]);

  // Load History
  const loadHistory = useCallback(async () => {
    const recs = await promptHistory.getAll();
    setHistoryRecords(recs);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Persist Common Fields
  useEffect(() => { localStorage.setItem('pb_concept', inputs.concept || ''); }, [inputs.concept]);
  useEffect(() => { localStorage.setItem('pb_audience', inputs.audience || ''); }, [inputs.audience]);
  useEffect(() => { localStorage.setItem('pb_tone', inputs.tone || ''); }, [inputs.tone]);
  useEffect(() => { localStorage.setItem('pb_style', inputs.style || ''); }, [inputs.style]);
  useEffect(() => { localStorage.setItem('pb_strict', String(isStrict)); }, [isStrict]);

  // Handle Input Change
  const updateInput = (field: keyof PromptInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  // Generate Prompt Logic
  useEffect(() => {
    const template = PROMPT_TEMPLATES[selectedTemplateId];
    if (template) {
      setGeneratedPrompt(template.buildPrompt(inputs, isStrict));
    }
  }, [selectedTemplateId, inputs, isStrict]);

  const activeTemplate = PROMPT_TEMPLATES[selectedTemplateId];

  // --- ACTIONS ---

  const saveToHistory = async (isFavorite: boolean = false) => {
    const record: PromptRecord = {
      id: crypto.randomUUID(),
      templateId: selectedTemplateId,
      templateName: activeTemplate.name,
      summary: inputs.concept?.slice(0, 50) || inputs.campaign_goal?.slice(0, 50) || activeTemplate.description,
      fullPrompt: generatedPrompt,
      inputs: { ...inputs, full_context_site: null }, // Don't save the heavy site object in history
      isFavorite,
      createdAt: Date.now()
    };
    await promptHistory.save(record);
    loadHistory();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    saveToHistory(false);
    alert("Prompt copiado y guardado en historial.");
  };

  const handleOpenAIStudio = () => {
    saveToHistory(false);
    const url = `https://aistudio.google.com/app/prompts/new_chat?prompt=${encodeURIComponent(generatedPrompt)}`;
    window.open(url, '_blank');
  };

  const handleRestore = (record: PromptRecord) => {
    setSelectedTemplateId(record.templateId);
    setInputs({
       ...record.inputs,
       full_context_site: currentSite // Re-attach current site context if available
    });
    setActiveTab('EDITOR');
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    await promptHistory.toggleFavorite(id, !currentStatus);
    loadHistory();
  };

  const handleDeleteRecord = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm("¿Eliminar del historial?")) {
      await promptHistory.delete(id);
      loadHistory();
    }
  };

  // Helper to render dynamic fields
  const renderField = (field: keyof PromptInputs) => {
    switch (field) {
      case 'concept':
        return (
          <div key="concept" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Concepto del Negocio</label>
             <textarea className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none resize-none h-24" placeholder="Ej. Alquiler de cabañas de madera..." value={inputs.concept} onChange={e => updateInput('concept', e.target.value)} />
          </div>
        );
      case 'audience':
        return (
          <div key="audience" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Público Objetivo</label>
             <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none" placeholder="Ej. Parejas jóvenes..." value={inputs.audience} onChange={e => updateInput('audience', e.target.value)} />
          </div>
        );
      case 'tone':
        return (
          <div key="tone" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tono de Voz</label>
             <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" value={inputs.tone} onChange={e => updateInput('tone', e.target.value)}>
                <option>Cercano y Profesional</option>
                <option>Corporativo y Serio</option>
                <option>Divertido y Alegre</option>
                <option>Lujoso y Exclusivo</option>
                <option>Inspirador y Poético</option>
             </select>
          </div>
        );
      case 'style':
        return (
          <div key="style" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Estilo Visual / Vibe</label>
             <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" value={inputs.style} onChange={e => updateInput('style', e.target.value)}>
                <option>Moderno y Minimalista</option>
                <option>Rústico y Acogedor</option>
                <option>Premium y Elegante</option>
                <option>Aventurero y Dinámico</option>
                <option>Familiar y Cálido</option>
             </select>
          </div>
        );
      case 'language':
        return (
          <div key="language" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Idioma</label>
             <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" value={inputs.language} onChange={e => updateInput('language', e.target.value)}>
                <option value="es-ES">Español (España)</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="fr-FR">Français</option>
                <option value="de-DE">Deutsch</option>
                <option value="ca-ES">Català</option>
             </select>
          </div>
        );
      case 'location':
        return (
          <div key="location" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ubicación / Área</label>
             <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none" placeholder="Ej. Costa Brava, Girona..." value={inputs.location} onChange={e => updateInput('location', e.target.value)} />
          </div>
        );
      case 'area_pois':
        return (
          <div key="area_pois" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Puntos de Interés / POIs</label>
             <textarea className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none resize-none h-24" placeholder="Ej. Playa de Aro, Museo Dalí, Restaurante Can Roca..." value={inputs.area_pois} onChange={e => updateInput('area_pois', e.target.value)} />
          </div>
        );
      case 'campaign_goal':
        return (
          <div key="campaign_goal" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Objetivo Campaña</label>
             <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none" placeholder="Ej. Llenar huecos en Agosto..." value={inputs.campaign_goal} onChange={e => updateInput('campaign_goal', e.target.value)} />
          </div>
        );
      case 'payment_methods':
        return (
          <div key="payment_methods" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Métodos de Pago Aceptados</label>
             <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none" placeholder="Ej. Bizum, Tarjeta, Transferencia, Efectivo..." value={inputs.payment_methods} onChange={e => updateInput('payment_methods', e.target.value)} />
          </div>
        );
      case 'preserve_structure':
        return (
          <div key="preserve_structure" className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl animate-in fade-in">
             <input type="checkbox" id="ps_check" checked={inputs.preserve_structure} onChange={e => updateInput('preserve_structure', e.target.checked)} className="w-5 h-5 accent-indigo-600 rounded cursor-pointer" />
             <label htmlFor="ps_check" className="text-xs font-bold text-slate-700 cursor-pointer select-none">No alterar estructura de secciones</label>
          </div>
        );
      case 'error_details':
        return (
          <div key="error_details" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Detalles del Error</label>
             <textarea className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl font-mono text-xs text-red-800 outline-none h-24" placeholder="Copia aquí el error o describe el problema..." value={inputs.error_details} onChange={e => updateInput('error_details', e.target.value)} />
          </div>
        );
      case 'current_json':
        return (
          <div key="current_json" className="space-y-2 animate-in fade-in">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                <span>Contexto JSON (Opcional)</span>
                {currentSite && <span className="text-emerald-500 flex items-center gap-1"><Zap size={10}/> Auto-Cargado</span>}
             </label>
             <div className="relative">
                <textarea 
                  className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl font-mono text-[10px] text-slate-500 outline-none h-24 focus:bg-white focus:border-indigo-300 transition-colors" 
                  value={inputs.current_json} 
                  onChange={e => updateInput('current_json', e.target.value)} 
                  placeholder={currentSite ? "Sobrescribir datos del sitio actual..." : "Pega aquí el JSON del sitio..."} 
                />
             </div>
          </div>
        );
      default: return null;
    }
  };

  const filteredHistory = useMemo(() => {
    if (activeTab === 'FAVORITES') return historyRecords.filter(r => r.isFavorite);
    return historyRecords;
  }, [historyRecords, activeTab]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden border border-white/20 flex flex-col lg:flex-row h-[90vh]">
        
        {/* Left Sidebar: Controls & History */}
        <div className="w-full lg:w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
          {/* Modal Header */}
          <div className="p-6 pb-2">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Sparkles className="text-indigo-600" size={24}/> Prompt Builder
                </h3>
                <button onClick={onClose} className="lg:hidden p-2 bg-slate-200 rounded-full"><X size={20}/></button>
             </div>
             
             {/* Tabs */}
             <div className="flex bg-slate-200 p-1 rounded-xl">
                <button onClick={() => setActiveTab('EDITOR')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'EDITOR' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                   <Edit2 size={12}/> Editor
                </button>
                <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                   <History size={12}/> Historial
                </button>
                <button onClick={() => setActiveTab('FAVORITES')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'FAVORITES' ? 'bg-white shadow text-amber-500' : 'text-slate-500 hover:text-slate-700'}`}>
                   <Star size={12}/> Favs
                </button>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-6">
            
            {activeTab === 'EDITOR' ? (
              <>
                {/* Template Selector */}
                <div className="space-y-2 animate-in slide-in-from-left-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seleccionar Plantilla</label>
                   <div className="grid grid-cols-1 gap-2">
                      {(Object.values(PROMPT_TEMPLATES) as PromptTemplate[]).map(tmpl => (
                         <button 
                            key={tmpl.id}
                            onClick={() => setSelectedTemplateId(tmpl.id)}
                            className={`text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${selectedTemplateId === tmpl.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                         >
                            <div className={`p-2 rounded-lg ${selectedTemplateId === tmpl.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                               <IconMap name={tmpl.icon} size={16}/>
                            </div>
                            <div className="flex-1 overflow-hidden">
                               <p className="font-bold text-xs truncate">{tmpl.name}</p>
                               {selectedTemplateId === tmpl.id && <p className="text-[9px] opacity-80 truncate">{tmpl.description}</p>}
                            </div>
                            {selectedTemplateId === tmpl.id && <CheckCircle2 size={16} className="text-white"/>}
                         </button>
                      ))}
                   </div>
                </div>

                <div className="h-px bg-slate-200 w-full"></div>

                {/* Dynamic Inputs */}
                <div className="space-y-4">
                   {activeTemplate.inputFields.map(field => renderField(field))}
                </div>

                {/* Modo Estricto */}
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
                   <div>
                      <span className="text-xs font-bold text-slate-700 block">Modo Estricto (JSON Only)</span>
                      <span className="text-[10px] text-slate-400">Sin texto adicional, solo código.</span>
                   </div>
                   <button onClick={() => setIsStrict(!isStrict)} className={`text-2xl transition-colors ${isStrict ? 'text-indigo-600' : 'text-slate-300'}`}>
                      {isStrict ? <ToggleRight size={32}/> : <ToggleLeft size={32}/>}
                   </button>
                </div>
              </>
            ) : (
              <div className="space-y-3 animate-in slide-in-from-right-2">
                 {filteredHistory.map(rec => {
                    const tmpl = PROMPT_TEMPLATES[rec.templateId] || activeTemplate;
                    return (
                       <div key={rec.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => handleRestore(rec)}>
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                   <IconMap name={tmpl.icon} size={14}/>
                                </div>
                                <span className="font-bold text-xs text-slate-800">{tmpl.name}</span>
                             </div>
                             <button onClick={(e) => handleToggleFavorite(e, rec.id, rec.isFavorite)} className={`text-slate-300 hover:text-amber-400 transition-colors ${rec.isFavorite ? 'text-amber-400' : ''}`}>
                                <Star size={14} fill={rec.isFavorite ? "currentColor" : "none"}/>
                             </button>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mb-3">{rec.summary}</p>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                             <span className="text-[9px] font-medium text-slate-400">{new Date(rec.createdAt).toLocaleDateString()}</span>
                             <button onClick={(e) => handleDeleteRecord(e, rec.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 size={12}/>
                             </button>
                          </div>
                       </div>
                    );
                 })}
                 {filteredHistory.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                       <History size={32} className="mx-auto mb-2 opacity-30"/>
                       <p className="text-xs italic">No hay historial guardado.</p>
                    </div>
                 )}
              </div>
            )}
          </div>
        </div>

        {/* Middle: Preview & Output */}
        <div className="w-full lg:w-2/3 bg-slate-900 p-8 flex flex-col relative text-white">
           <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors hidden lg:block"><X size={20}/></button>
           
           <div className="flex justify-between items-end mb-4">
              <div>
                 <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                    <Bot size={14}/> Prompt Generado
                 </label>
                 <p className="text-xs text-slate-400">Plantilla: <strong>{activeTemplate.name}</strong></p>
              </div>
           </div>

           <div className="flex-1 bg-black/30 rounded-2xl border border-white/10 p-6 font-mono text-xs text-indigo-100 overflow-y-auto custom-scrollbar mb-6 relative group">
              <div className="whitespace-pre-wrap">{generatedPrompt}</div>
           </div>

           {/* Info Panel & Actions */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><List size={12}/> Campos Activos</h4>
                 <ul className="space-y-1">
                    {activeTemplate.inputFields.map(f => (
                       <li key={f} className="text-xs text-slate-300 flex items-center gap-2 capitalize">
                          <div className={`w-1.5 h-1.5 rounded-full ${inputs[f] ? 'bg-emerald-500' : 'bg-white/20'}`}></div> 
                          {f.replace('_', ' ')}
                       </li>
                    ))}
                 </ul>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Zap size={16}/></div>
                    <span className="text-xs font-bold text-white">Recorte Inteligente</span>
                 </div>
                 <p className="text-[10px] text-slate-400 leading-relaxed">
                    El prompt incluye <strong>automáticamente</strong> solo las partes relevantes de tu WebSpec (ej. solo precios para "Pagos", solo SEO para "SEO").
                 </p>
              </div>
           </div>

           <div className="flex gap-4">
              <button 
                onClick={handleCopy}
                className="flex-1 py-4 bg-white text-slate-900 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all shadow-xl active:scale-95"
              >
                 <Copy size={18}/> COPIAR PROMPT
              </button>
              <button 
                onClick={handleOpenAIStudio}
                className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl active:scale-95"
              >
                 <ExternalLink size={18}/> ABRIR AI STUDIO
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

export const WebsiteBuilder: React.FC = () => {
  const [websites, setWebsites] = useState<WebSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  
  // JSON Editor State
  const [jsonError, setJsonError] = useState<string | null>(null);

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
                 <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-colors shadow-lg">
                    <Save size={16}/> Guardar
                 </button>
              </div>
           </div>

           <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: Config & JSON */}
              <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
                 <div className="flex-1 flex flex-col p-4">
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Code size={12}/> Estructura JSON (WebSpec)</label>
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

           {isPromptModalOpen && <PromptBuilderModal onClose={() => setIsPromptModalOpen(false)} currentSite={selectedSite} />}
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
           <button onClick={handleCreate} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl shadow-indigo-100 hover:scale-105 transition-all flex items-center gap-2">
              <Plus size={16}/> Crear Nueva Web
           </button>
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