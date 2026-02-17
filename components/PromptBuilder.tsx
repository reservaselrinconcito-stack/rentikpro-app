
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { projectManager } from '../services/projectManager'; // Import projectManager
import { WebSite } from '../types';
import { PROMPT_TEMPLATES, TemplateId, PromptInputs, PromptTemplate, CONTEXT_WHITELIST } from '../services/promptTemplates';
import { promptHistory, PromptRecord } from '../services/promptHistoryStore';
import {
  Sparkles, X, Edit2, History, Star, LayoutTemplate, RefreshCw, CreditCard,
  Image as ImageIcon, Search, Megaphone, MapPin, Wrench, CheckCircle2,
  ToggleLeft, ToggleRight, Copy, Bot, List, Zap, ExternalLink, Trash2, Save,
  Upload, Download, FileCode, FileDown, RotateCcw, ArrowRight
} from 'lucide-react';

const IconMap = ({ name, size = 16, className = "" }: { name: string, size?: number, className?: string }) => {
  switch (name) {
    case 'LayoutTemplate': return <LayoutTemplate size={size} className={className} />;
    case 'RefreshCw': return <RefreshCw size={size} className={className} />;
    case 'CreditCard': return <CreditCard size={size} className={className} />;
    case 'Image': return <ImageIcon size={size} className={className} />;
    case 'Search': return <Search size={size} className={className} />;
    case 'Megaphone': return <Megaphone size={size} className={className} />;
    case 'MapPin': return <MapPin size={size} className={className} />;
    case 'Wrench': return <Wrench size={size} className={className} />;
    default: return <Sparkles size={size} className={className} />;
  }
};

interface PromptBuilderProps {
  onClose?: () => void;
  currentSite?: WebSite | null;
  mode?: 'MODAL' | 'PAGE';
  initialTemplateId?: TemplateId;
  onApply?: () => void; // Add onApply prop
}

export const PromptBuilder: React.FC<PromptBuilderProps> = ({ onClose, currentSite, mode = 'MODAL', initialTemplateId, onApply }) => {
  const [activeTab, setActiveTab] = useState<'EDITOR' | 'HISTORY' | 'FAVORITES'>('EDITOR');
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId>(initialTemplateId || 'WEB_CREATE_FULL');
  const [isStrict, setIsStrict] = useState(() => localStorage.getItem('pb_strict') === 'true');

  const [inputs, setInputs] = useState<PromptInputs>({
    concept: localStorage.getItem('pb_concept') || '',
    audience: localStorage.getItem('pb_audience') || '',
    tone: localStorage.getItem('pb_tone') || 'Cercano y Profesional',
    style: localStorage.getItem('pb_style') || 'Moderno',
    language: 'es-ES',
    location: '',
    error_details: '',
    campaign_goal: '',
    campaign_offer: '',
    campaign_dates: '',
    area_pois: '',
    preserve_structure: false,
    payment_methods: 'Transferencia, Bizum',
    current_json: '',
    full_context_site: currentSite
  });

  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [jsonResult, setJsonResult] = useState(''); // New state for pasting AI result
  const [historyRecords, setHistoryRecords] = useState<PromptRecord[]>([]);
  const [favoriteRecords, setFavoriteRecords] = useState<PromptRecord[]>([]);

  // Page Mode State
  const [availableSites, setAvailableSites] = useState<WebSite[]>([]);
  const [selectedTargetSiteId, setSelectedTargetSiteId] = useState<string>('');

  // Refs
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // Update context if it changes from props
  useEffect(() => {
    if (currentSite) {
      setInputs(prev => ({ ...prev, full_context_site: currentSite }));
    }
  }, [currentSite]);

  const loadHistory = useCallback(async () => {
    const recent = await promptHistory.getRecent(20);
    const favs = await promptHistory.getFavorites();
    setHistoryRecords(recent);
    setFavoriteRecords(favs);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Load sites for PAGE mode
  useEffect(() => {
    if (mode === 'PAGE') {
      projectManager.getStore().getWebsites().then(sites => {
        setAvailableSites(sites);
        if (sites.length > 0) setSelectedTargetSiteId(sites[0].id);
      });
    }
  }, [mode]);

  // Handle Initial Template Prop
  useEffect(() => {
    if (initialTemplateId) {
      setSelectedTemplateId(initialTemplateId);
      // If it's the refinement template, prep load
      if (initialTemplateId === 'WEB_REFINE_IMPORTED' && currentSite) {
        handleImportActive();
      }
    }
  }, [initialTemplateId, currentSite]);

  // Persist Common Fields
  useEffect(() => { localStorage.setItem('pb_concept', inputs.concept || ''); }, [inputs.concept]);
  useEffect(() => { localStorage.setItem('pb_audience', inputs.audience || ''); }, [inputs.audience]);
  useEffect(() => { localStorage.setItem('pb_tone', inputs.tone || ''); }, [inputs.tone]);
  useEffect(() => { localStorage.setItem('pb_style', inputs.style || ''); }, [inputs.style]);
  useEffect(() => { localStorage.setItem('pb_strict', String(isStrict)); }, [isStrict]);

  const updateInput = (field: keyof PromptInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const template = PROMPT_TEMPLATES[selectedTemplateId];
    if (template) {
      setGeneratedPrompt(template.buildPrompt(inputs, isStrict));
    }
  }, [selectedTemplateId, inputs, isStrict]);

  const activeTemplate = PROMPT_TEMPLATES[selectedTemplateId];
  const whitelist = CONTEXT_WHITELIST[selectedTemplateId];

  // --- ACTIONS ---

  const saveToHistory = async (isFavorite: boolean = false) => {
    if (!generatedPrompt) return;

    const record: PromptRecord = {
      id: crypto.randomUUID(),
      templateId: selectedTemplateId,
      templateName: activeTemplate.name,
      summary: inputs.concept?.slice(0, 50) || inputs.campaign_goal?.slice(0, 50) || activeTemplate.description,
      fullPrompt: generatedPrompt,
      inputs: { ...inputs, full_context_site: null },
      isFavorite,
      createdAt: Date.now()
    };
    await promptHistory.save(record);
    loadHistory();
  };

  const handleCopy = () => {
    if (!generatedPrompt) return;

    navigator.clipboard.writeText(generatedPrompt)
      .then(() => {
        saveToHistory(false);
        alert("Prompt copiado al portapapeles y guardado en historial.");
      })
      .catch(() => {
        if (outputRef.current) {
          outputRef.current.select();
          alert("No se pudo copiar automáticamente. El texto ha sido seleccionado, por favor usa Ctrl+C.");
        }
      });
  };

  const handleOpenAIStudio = () => {
    if (!generatedPrompt) return;
    saveToHistory(false);
    // URL exacta solicitada en Prompt 8/8
    const url = `https://aistudio.google.com/app/prompts/new_chat?prompt=${encodeURIComponent(generatedPrompt)}`;
    window.open(url, '_blank');
  };

  const handleManualSave = () => {
    saveToHistory(false);
    alert("Prompt guardado en historial.");
  };

  const handleRestore = (record: PromptRecord) => {
    setSelectedTemplateId(record.templateId);
    setInputs({ ...record.inputs, full_context_site: currentSite });
    setActiveTab('EDITOR');
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    await promptHistory.toggleFavorite(id, !currentStatus);
    loadHistory();
  };

  const handleDeleteRecord = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("¿Eliminar del historial?")) {
      await promptHistory.delete(id);
      loadHistory();
    }
  };

  // --- JSON IO HANDLERS ---

  const handleImportActive = () => {
    if (!currentSite) return;
    try {
      const json = JSON.stringify(currentSite, null, 2);
      setInputs(prev => ({
        ...prev,
        current_json: json,
        full_context_site: null // Disconnect live object to use manual text
      }));
    } catch (e) { console.error(e); }
  };

  const handleLoadPublic = async () => {
    try {
      const res = await fetch('/webspec.json');
      if (!res.ok) throw new Error("Archivo no encontrado");
      const text = await res.text();
      setInputs(prev => ({ ...prev, current_json: text, full_context_site: null }));
    } catch (err: any) {
      alert("Error cargando /webspec.json: " + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setInputs(prev => ({ ...prev, current_json: text, full_context_site: null }));
    e.target.value = '';
  };

  const handleExportJson = () => {
    if (!inputs.current_json) return alert("Nada que exportar.");
    const blob = new Blob([inputs.current_json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webspec_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- APPLY LOGIC ---
  const handleApplyToSite = async () => {
    if (!generatedPrompt) return; // Should be the JSON output actually? 
    // Wait, generatedPrompt is the PROMPT, not the OUTPUT. 
    // The user has to COPY the prompt to ChatGPT, get JSON, and PASTE it back?
    // No, the "Web Refiner" template output IS the JSON if we are mocking the AI, 
    // BUT normally the user executes the prompt elsewhere.
    // HOWEVER, looking at `QuickWebWizard` (not visible here but implied), or the user request:
    // "Prompt Builder genera texto pero no se aplica."
    // If the user pastes the Result JSON into an input, THEN we can apply it.
    // OR if we are simulating the AI generation (which we aren't, we are building the prompt).

    // AH! The user flow is: 
    // 1. Build Prompt.
    // 2. Copy to ChatGPT.
    // 3. Get JSON.
    // 4. Paste JSON into "Importar" or... 
    // 5. User wants to "Apply". 

    // Wait, if this is just a Prompt Builder, we don't have the result yet!
    // Unless... the user pastes the result back *somewhere*?
    // OR does the user expect us to CALL the AI? 
    // The request says: "validates response is WebSpec". 
    // Implies we have the response.

    // Let's assume the user pastes the AI Output into `current_json` or a new "Output / Result" field?
    // Currently `inputs.current_json` is the INPUT to the prompt.

    // Checking the code... `generatedPrompt` IS the prompt text.
    // There is no field for "AI Output".
    // But wait, if we are in "Refine" mode, we might want to Paste the result into `current_json`?
    // No, `current_json` is used to build the prompt.

    // Let's add an "AI Output / JSON Result" textarea to the UI where the user can paste the result.
    // AND/OR if we have an AI integration (Google Gemini/OpenAI), we could call it.
    // But strictly reading the request: "PromptBuilder genera texto". It generates the PROMPT.
    // So the user MUST paste the result back.

    // Let's check the UI for `PromptBuilder`. It has inputs. It shows the generated prompt.
    // It does NOT seem to have a "Paste Result Here" section yet.
    // I should add a "Paste Result & Apply" section? 
    // OR maybe the user implies I should automagically apply it? 
    // "Genera texto pero no se aplica" -> The prompt text? No, that doesn't make sense.

    // Let's look at `PromptBuilder.tsx` lines 343+ (render).
    // It shows `generatedPrompt` in a textarea.
    // Maybe I should add a "Resultado JSON" textarea below the prompt?

    // For now, I'll add a section "Pegar Resultado JSON" and the "Aplicar" button checks THAT.
  };

  // Actually, I'll implement a "Paste JSON from AI" modal or section. 
  // Let's add a state `jsonResult` and a text area for it.

  // RE-READING `WebsiteBuilder.tsx`:
  // It has a `sections_json` textarea. 

  // Let's add `jsonResult` state.

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
              <option value="Alegre">Alegre</option>
              <option value="Moderno">Moderno</option>
              <option value="Minimalista">Minimalista</option>
              <option value="Premium">Premium</option>
              <option value="Familiar">Familiar</option>
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Puntos de Interés / Rutas</label>
            <textarea className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none resize-none h-24" placeholder="Ej. Museo Dalí, Playa de Aro..." value={inputs.area_pois} onChange={e => updateInput('area_pois', e.target.value)} />
          </div>
        );
      case 'campaign_goal':
        return (
          <div key="campaign_goal" className="space-y-2 animate-in fade-in">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Objetivo / Campaña</label>
            <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none" placeholder="Ej. Black Friday, Llenar Agosto..." value={inputs.campaign_goal} onChange={e => updateInput('campaign_goal', e.target.value)} />
          </div>
        );
      case 'campaign_offer':
        return (
          <div key="campaign_offer" className="space-y-2 animate-in fade-in">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Oferta (Campaña)</label>
            <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none" placeholder="Ej. 2x1, Descuento 20%..." value={inputs.campaign_offer} onChange={e => updateInput('campaign_offer', e.target.value)} />
          </div>
        );
      case 'campaign_dates':
        return (
          <div key="campaign_dates" className="space-y-2 animate-in fade-in">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fechas (Campaña)</label>
            <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none" placeholder="Ej. 1-15 Agosto..." value={inputs.campaign_dates} onChange={e => updateInput('campaign_dates', e.target.value)} />
          </div>
        );
      case 'payment_methods':
        return (
          <div key="payment_methods" className="space-y-2 animate-in fade-in">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Métodos de Pago</label>
            <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none" placeholder="Ej. Bizum, Tarjeta..." value={inputs.payment_methods} onChange={e => updateInput('payment_methods', e.target.value)} />
          </div>
        );
      case 'preserve_structure':
        return (
          <div key="preserve_structure" className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl animate-in fade-in">
            <input type="checkbox" id="ps_check" checked={inputs.preserve_structure} onChange={e => updateInput('preserve_structure', e.target.checked)} className="w-5 h-5 accent-indigo-600 rounded cursor-pointer" />
            <label htmlFor="ps_check" className="text-xs font-bold text-slate-700 cursor-pointer select-none">No tocar estructura de archivos</label>
          </div>
        );
      case 'error_details':
        return (
          <div key="error_details" className="space-y-2 animate-in fade-in">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Detalles del Error</label>
            <textarea className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl font-mono text-xs text-red-800 outline-none h-24" placeholder="Describe el problema JSON..." value={inputs.error_details} onChange={e => updateInput('error_details', e.target.value)} />
          </div>
        );
      case 'current_json':
        return (
          <div key="current_json" className="space-y-2 animate-in fade-in">
            <div className="flex justify-between items-end mb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Contexto JSON
                {inputs.full_context_site ? (
                  <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100"><Zap size={8} /> Auto</span>
                ) : (
                  <span className="text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-100"><Edit2 size={8} /> Manual</span>
                )}
              </label>
              <div className="flex gap-1">
                <button onClick={handleImportActive} className="p-1.5 bg-slate-100 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-400 transition-all border border-transparent hover:border-slate-200" title="Cargar Web Activa"><FileCode size={12} /></button>
                <button onClick={handleLoadPublic} className="p-1.5 bg-slate-100 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-400 transition-all border border-transparent hover:border-slate-200" title="Cargar /webspec.json"><FileDown size={12} /></button>
                <input type="file" ref={jsonFileRef} className="hidden" accept=".json" onChange={handleFileUpload} />
                <button onClick={() => jsonFileRef.current?.click()} className="p-1.5 bg-slate-100 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-400 transition-all border border-transparent hover:border-slate-200" title="Subir Archivo"><Upload size={12} /></button>
                <button onClick={handleExportJson} className="p-1.5 bg-slate-100 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-400 transition-all border border-transparent hover:border-slate-200" title="Descargar JSON"><Download size={12} /></button>
              </div>
            </div>
            <div className="relative">
              <textarea
                className={`w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl font-mono text-[10px] text-slate-500 outline-none h-32 focus:bg-white focus:border-indigo-300 transition-colors custom-scrollbar ${inputs.full_context_site ? 'opacity-50' : ''}`}
                value={inputs.full_context_site ? '--- Contexto Automático Activo (Site Cargado) ---\nPulsa el botón de código para editar manualmente.' : inputs.current_json}
                onChange={e => {
                  // Switching to manual mode on typing
                  setInputs(prev => ({ ...prev, current_json: e.target.value, full_context_site: null }));
                }}
                placeholder="Pega aquí el JSON del sitio o usa la barra superior para cargar..."
              />
            </div>
          </div>
        );
      default: return null;
    }
  };

  const containerClass = mode === 'MODAL'
    ? "bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden border border-white/20 flex flex-col lg:flex-row h-[90vh]"
    : "bg-white rounded-[2.5rem] shadow-sm w-full overflow-hidden border border-slate-200 flex flex-col lg:flex-row h-full";

  return (
    <div className={mode === 'MODAL' ? "fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" : "h-full p-6"}>
      <div className={containerClass}>
        {/* Left Sidebar */}
        <div className="w-full lg:w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
          <div className="p-6 pb-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="text-indigo-600" size={24} /> Prompt Builder
              </h3>
              {mode === 'MODAL' && onClose && <button onClick={onClose} className="lg:hidden p-2 bg-slate-200 rounded-full"><X size={20} /></button>}
            </div>

            <div className="flex bg-slate-200 p-1 rounded-xl">
              {['EDITOR', 'HISTORY', 'FAVORITES'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'EDITOR' ? <Edit2 size={12} /> : tab === 'HISTORY' ? <History size={12} /> : <Star size={12} />}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-6">
            {activeTab === 'EDITOR' ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seleccionar Plantilla</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(Object.values(PROMPT_TEMPLATES) as PromptTemplate[]).map(tmpl => (
                      <button
                        key={tmpl.id} onClick={() => setSelectedTemplateId(tmpl.id)}
                        className={`text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${selectedTemplateId === tmpl.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                      >
                        <div className={`p-2 rounded-lg ${selectedTemplateId === tmpl.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}><IconMap name={tmpl.icon} size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-xs truncate">{tmpl.name}</p>
                          {selectedTemplateId === tmpl.id && <p className="text-[9px] opacity-80 truncate">{tmpl.description}</p>}
                        </div>
                        {selectedTemplateId === tmpl.id && <CheckCircle2 size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-slate-200 w-full"></div>
                <div className="space-y-4">
                  {activeTemplate.inputFields.map(field => renderField(field))}
                </div>
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
                  <div><span className="text-xs font-bold text-slate-700 block">Modo Estricto</span><span className="text-[10px] text-slate-400">Solo código JSON.</span></div>
                  <button onClick={() => setIsStrict(!isStrict)} className={`text-2xl transition-colors ${isStrict ? 'text-indigo-600' : 'text-slate-300'}`}>{isStrict ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}</button>
                </div>
              </>
            ) : activeTab === 'HISTORY' ? (
              <div className="space-y-3">
                {historyRecords.map(rec => {
                  const tmpl = PROMPT_TEMPLATES[rec.templateId] || activeTemplate;
                  return (
                    <div key={rec.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2"><div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><IconMap name={tmpl.icon} size={14} /></div><span className="font-bold text-xs text-slate-800">{tmpl.name}</span></div>
                        <button onClick={(e) => handleToggleFavorite(e, rec.id, rec.isFavorite)} className={`text-slate-300 hover:text-amber-400 transition-colors ${rec.isFavorite ? 'text-amber-400' : ''}`}><Star size={14} fill={rec.isFavorite ? "currentColor" : "none"} /></button>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mb-3">{rec.summary}</p>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                        <span className="text-[9px] font-medium text-slate-400">{new Date(rec.createdAt).toLocaleDateString()}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleRestore(rec)} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-bold hover:bg-indigo-100 transition-colors">
                            <RotateCcw size={10} /> Reutilizar
                          </button>
                          <button onClick={(e) => handleDeleteRecord(e, rec.id)} className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {historyRecords.length === 0 && <div className="text-center py-10 text-slate-400"><History size={32} className="mx-auto mb-2 opacity-30" /><p className="text-xs italic">Historial vacío.</p></div>}
              </div>
            ) : (
              <div className="space-y-3">
                {favoriteRecords.map(rec => {
                  const tmpl = PROMPT_TEMPLATES[rec.templateId] || activeTemplate;
                  return (
                    <div key={rec.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2"><div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg"><IconMap name={tmpl.icon} size={14} /></div><span className="font-bold text-xs text-slate-800">{tmpl.name}</span></div>
                        <button onClick={(e) => handleToggleFavorite(e, rec.id, rec.isFavorite)} className="text-amber-400 hover:text-amber-500"><Star size={14} fill="currentColor" /></button>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mb-3">{rec.summary}</p>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                        <span className="text-[9px] font-medium text-slate-400">{new Date(rec.createdAt).toLocaleDateString()}</span>
                        <button onClick={() => handleRestore(rec)} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-bold hover:bg-emerald-100 transition-colors">
                          <ArrowRight size={10} /> Cargar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {favoriteRecords.length === 0 && <div className="text-center py-10 text-slate-400"><Star size={32} className="mx-auto mb-2 opacity-30" /><p className="text-xs italic">Sin favoritos.</p></div>}
              </div>
            )}
          </div>
        </div>

        {/* Right Output */}
        <div className="w-full lg:w-2/3 bg-slate-900 p-8 flex flex-col relative text-white">
          {mode === 'MODAL' && onClose && <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors hidden lg:block"><X size={20} /></button>}
          <div className="mb-4">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-1"><Bot size={14} /> Prompt Generado</label>
            <p className="text-xs text-slate-400">Plantilla: <strong>{activeTemplate.name}</strong></p>
          </div>

          <textarea
            ref={outputRef}
            readOnly
            value={generatedPrompt}
            className="flex-1 bg-black/30 rounded-2xl border border-white/10 p-6 font-mono text-xs text-indigo-100 overflow-y-auto custom-scrollbar mb-6 resize-none outline-none focus:border-indigo-500/50 transition-colors"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><List size={12} /> Campos Activos</h4>
              <ul className="space-y-1">
                {activeTemplate.inputFields.map(f => (
                  <li key={f} className="text-xs text-slate-300 flex items-center gap-2 capitalize"><div className={`w-1.5 h-1.5 rounded-full ${inputs[f] ? 'bg-emerald-500' : 'bg-white/20'}`}></div> {f.replace('_', ' ')}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Zap size={12} /> Contexto Incluido (Whitelist)</h4>
              {whitelist ? (
                <div className="text-xs text-slate-300">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Keys: <span className="font-mono text-indigo-300">{whitelist.rootKeys.join(', ')}</span></li>
                    {whitelist.sectionTypes && <li>Secciones: <span className="font-mono text-indigo-300">{whitelist.sectionTypes.join(', ')}</span></li>}
                  </ul>
                </div>
              ) : <p className="text-xs text-slate-500 italic">Contexto completo (Sin filtros).</p>}
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={handleManualSave} className="px-6 py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2" title="Guardar en historial"><Save size={18} /></button>
            <button onClick={handleCopy} className="flex-1 py-4 bg-white text-slate-900 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all shadow-xl active:scale-95"><Copy size={18} /> COPIAR</button>
            <button onClick={handleOpenAIStudio} className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl active:scale-95"><ExternalLink size={18} /> ABRIR AI STUDIO</button>
          </div>
        </div>
      </div>
    </div>
  );
};
