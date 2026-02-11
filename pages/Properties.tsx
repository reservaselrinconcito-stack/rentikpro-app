import React, { useState, useEffect, useCallback } from 'react';
import { projectManager } from '../services/projectManager';
import { Property, Apartment } from '../types';
import { notifyDataChanged } from '../services/dataRefresher';
import { publicCalendarExporter } from '../services/publicCalendarExporter';
import { 
  Plus, Search, Trash2, Edit2, X, AlertCircle, CheckCircle2, 
  ChevronRight, Building2, LayoutGrid, Palette, ArrowLeft,
  Globe, Code, Copy, ExternalLink, MousePointer, Download, FileJson, RefreshCw
} from 'lucide-react';

// --- WIDGET GENERATOR MODAL ---
const BookingWidgetModal = ({ property, onClose }: { property: Property, onClose: () => void }) => {
  const [accentColor, setAccentColor] = useState('#4F46E5');
  const [showTitle, setShowTitle] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // URL Base Simulada (En producción apuntaría a tu despliegue de Cloudflare Pages o Vercel)
  const baseUrl = "https://bookings.rentik.pro"; 
  const publicUrl = `${baseUrl}/widget/${property.id}?color=${accentColor.replace('#', '')}&showTitle=${showTitle}`;
  const iframeCode = `<iframe src="${publicUrl}" width="100%" height="700" frameborder="0" style="border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></iframe>`;

  const copyToClipboard = (text: string, type: 'LINK' | 'CODE') => {
    navigator.clipboard.writeText(text);
    if (type === 'LINK') { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
    if (type === 'CODE') { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
  };

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
        const data = await publicCalendarExporter.export(property.id);
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `public_calendar_${property.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e: any) {
        alert("Error exportando calendario: " + e.message);
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-white/20 flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left: Configuration */}
        <div className="w-full md:w-1/2 p-8 border-r border-slate-100 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
               <Globe className="text-indigo-600"/> Motor de Reservas
             </h3>
             <button onClick={onClose} className="md:hidden p-2 bg-slate-100 rounded-full"><X size={20}/></button>
          </div>
          
          <p className="text-slate-500 text-sm mb-8">
            Genera el código de integración para <strong>{property.name}</strong>. Copia y pega este código en tu sitio web (WordPress, Wix, Squarespace).
          </p>

          <div className="space-y-6">
            {/* Color Picker */}
            <div>
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Personalización</label>
               <div className="flex gap-3">
                  {['#4F46E5', '#059669', '#DC2626', '#EA580C', '#000000'].map(c => (
                    <button 
                      key={c}
                      onClick={() => setAccentColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${accentColor === c ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                     <input type="checkbox" checked={showTitle} onChange={e => setShowTitle(e.target.checked)} className="accent-indigo-600"/>
                     <span className="text-xs font-bold text-slate-600">Mostrar Título</span>
                  </div>
               </div>
            </div>

            {/* Direct Link */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
               <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <ExternalLink size={12}/> URL Pública Directa
                  </label>
                  {copiedLink && <span className="text-[10px] font-bold text-emerald-600 animate-pulse">¡Copiado!</span>}
               </div>
               <div className="flex gap-2">
                  <input readOnly value={publicUrl} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 outline-none select-all"/>
                  <button onClick={() => copyToClipboard(publicUrl, 'LINK')} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                     <Copy size={16}/>
                  </button>
               </div>
            </div>

            {/* Embed Code */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
               <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Code size={12}/> Código Iframe (Embed)
                  </label>
                  <button 
                    onClick={() => copyToClipboard(iframeCode, 'CODE')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${copiedCode ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                     {copiedCode ? <CheckCircle2 size={12}/> : <Copy size={12}/>}
                     {copiedCode ? 'Copiado' : 'Copiar Código'}
                  </button>
               </div>
               <textarea 
                 readOnly 
                 value={iframeCode} 
                 className="w-full h-32 bg-transparent text-indigo-100 font-mono text-[11px] outline-none resize-none"
               />
            </div>

            {/* Export JSON Button */}
            <div className="pt-4 border-t border-slate-100">
                <button 
                    onClick={handleExportJson} 
                    disabled={isExporting}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                    {isExporting ? <RefreshCw size={14} className="animate-spin"/> : <FileJson size={14}/>}
                    {isExporting ? 'Generando...' : 'Descargar public_calendar.json'}
                </button>
                <p className="text-[9px] text-center text-slate-400 mt-2">
                    Archivo estático para integración manual (API-less).
                </p>
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="w-full md:w-1/2 bg-slate-100 p-8 flex flex-col justify-center relative">
           <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/50 hover:bg-white rounded-full transition-colors hidden md:block"><X size={20}/></button>
           <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vista Previa (Simulación)</p>
           
           <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 w-full max-w-sm mx-auto transform transition-all duration-500 h-[500px] flex flex-col">
              {/* Fake Widget Header */}
              {showTitle && (
                <div className="p-6 pb-2">
                   <h4 className="font-black text-xl text-slate-800">{property.name}</h4>
                   <p className="text-xs text-slate-400">Reserva directa al mejor precio</p>
                </div>
              )}
              
              {/* Fake Calendar/Form */}
              <div className="p-6 space-y-4 flex-1">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                       <p className="text-[9px] uppercase font-bold text-slate-400">Llegada</p>
                       <p className="text-sm font-bold text-slate-700">-- / -- / --</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                       <p className="text-[9px] uppercase font-bold text-slate-400">Salida</p>
                       <p className="text-sm font-bold text-slate-700">-- / -- / --</p>
                    </div>
                 </div>
                 
                 <div className="border border-slate-100 rounded-xl p-1">
                    <div className="grid grid-cols-7 text-center mb-2 text-[9px] font-bold text-slate-400 pt-2">
                       <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-600 pb-2">
                       {[...Array(30)].map((_, i) => (
                          <div key={i} className={`aspect-square flex items-center justify-center rounded-lg ${i === 14 || i === 15 ? 'text-white' : 'hover:bg-slate-50'}`} style={i === 14 || i === 15 ? { backgroundColor: accentColor } : {}}>
                             {i+1}
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="mt-auto">
                    <button className="w-full py-3 rounded-xl text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2" style={{ backgroundColor: accentColor }}>
                       <MousePointer size={14}/> VER DISPONIBILIDAD
                    </button>
                    <p className="text-[8px] text-center text-slate-300 mt-2 flex items-center justify-center gap-1">
                       <CheckCircle2 size={8}/> Pagos Seguros con RentikPro
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export const Properties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  
  // Modals
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [isAptModalOpen, setIsAptModalOpen] = useState(false);
  const [widgetProp, setWidgetProp] = useState<Property | null>(null); 
  
  // Forms
  const [editingPropId, setEditingPropId] = useState<string | null>(null);
  const [propForm, setPropForm] = useState({ name: '', description: '' });
  
  const [editingAptId, setEditingAptId] = useState<string | null>(null);
  const [aptForm, setAptForm] = useState({ name: '', color: '#4F46E5' });

  // Status
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3000);
  };

  const loadProperties = useCallback(async () => {
    try {
      const list = await projectManager.getStore().getProperties();
      setProperties(list);
    } catch (err) {
      showFeedback('error', 'Error al cargar propiedades');
    }
  }, []);

  const loadApartments = useCallback(async (propId: string) => {
    try {
      const list = await projectManager.getStore().getApartments(propId);
      setApartments(list);
    } catch (err) {
      showFeedback('error', 'Error al cargar apartamentos');
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (selectedProperty) {
      loadApartments(selectedProperty.id);
    }
  }, [selectedProperty, loadApartments]);

  // --- PROPERTY CRUD ---
  const handlePropSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propForm.name.trim()) return showFeedback('error', 'El nombre es obligatorio');
    
    try {
      const prop: Property = {
        id: editingPropId || crypto.randomUUID(),
        name: propForm.name,
        description: propForm.description,
        created_at: editingPropId ? (properties.find(p => p.id === editingPropId)?.created_at || Date.now()) : Date.now()
      };
      await projectManager.getStore().saveProperty(prop);
      await loadProperties();
      if (selectedProperty?.id === prop.id) setSelectedProperty(prop);
      setIsPropModalOpen(false);
      showFeedback('success', 'Propiedad guardada');
      notifyDataChanged();
    } catch (err) {
      showFeedback('error', 'Error al guardar propiedad');
    }
  };

  const handlePropDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta propiedad? Todos sus apartamentos asociados también se borrarán.')) return;
    try {
      await projectManager.getStore().deleteProperty(id);
      await loadProperties();
      if (selectedProperty?.id === id) setSelectedProperty(null);
      showFeedback('success', 'Propiedad eliminada');
      notifyDataChanged();
    } catch (err) {
      showFeedback('error', 'Error al eliminar propiedad');
    }
  };

  // --- APARTMENT CRUD ---
  const handleAptSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    if (!aptForm.name.trim()) return showFeedback('error', 'El nombre es obligatorio');

    try {
      const apt: Apartment = {
        id: editingAptId || crypto.randomUUID(),
        property_id: selectedProperty.id,
        name: aptForm.name,
        color: aptForm.color,
        created_at: editingAptId ? (apartments.find(a => a.id === editingAptId)?.created_at || Date.now()) : Date.now()
      };
      await projectManager.getStore().saveApartment(apt);
      await loadApartments(selectedProperty.id);
      setIsAptModalOpen(false);
      showFeedback('success', 'Apartamento guardado');
      notifyDataChanged();
    } catch (err) {
      showFeedback('error', 'Error al guardar apartamento');
    }
  };

  const handleAptDelete = async (id: string) => {
    if (!confirm('¿Eliminar este apartamento?')) return;
    try {
      await projectManager.getStore().deleteApartment(id);
      if (selectedProperty) await loadApartments(selectedProperty.id);
      showFeedback('success', 'Apartamento eliminado');
      notifyDataChanged();
    } catch (err) {
      showFeedback('error', 'Error al eliminar apartamento');
    }
  };

  // --- VIEWS ---
  if (selectedProperty) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedProperty(null)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{selectedProperty.name}</h2>
            <p className="text-slate-500">{selectedProperty.description || 'Sin descripción'}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
                <LayoutGrid size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Apartamentos / Unidades</h3>
            </div>
            <button 
              onClick={() => {
                setEditingAptId(null);
                setAptForm({ name: '', color: '#4F46E5' });
                setIsAptModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold transition-all active:scale-95 shadow-lg shadow-indigo-100"
            >
              <Plus size={18} /> Nuevo Apartamento
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apartments.map(apt => (
              <div key={apt.id} className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-slate-300 transition-all group bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-12 rounded-full shadow-sm" style={{ backgroundColor: apt.color }}></div>
                  <div>
                    <h4 className="font-bold text-slate-800">{apt.name}</h4>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{apt.color}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingAptId(apt.id);
                      setAptForm({ name: apt.name, color: apt.color });
                      setIsAptModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleAptDelete(apt.id)} className="p-2 text-slate-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {apartments.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                <LayoutGrid size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 italic">No hay apartamentos creados en esta propiedad.</p>
              </div>
            )}
          </div>
        </div>

        {/* Apartment Modal */}
        {isAptModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-2xl font-black text-slate-800">{editingAptId ? 'Editar Unidad' : 'Nueva Unidad'}</h3>
                <button onClick={() => setIsAptModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24}/></button>
              </div>
              <form onSubmit={handleAptSave} className="p-8 space-y-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre / Número</label>
                  <input 
                    required placeholder="Ej. Apto 101, Loft A..."
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                    value={aptForm.name} onChange={e => setAptForm({...aptForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Color en Calendario</label>
                  <div className="flex gap-4 items-center">
                    <input 
                      type="color" 
                      className="w-16 h-16 rounded-2xl cursor-pointer border-none bg-transparent"
                      value={aptForm.color} onChange={e => setAptForm({...aptForm, color: e.target.value})}
                    />
                    <input 
                      className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm uppercase"
                      value={aptForm.color} onChange={e => setAptForm({...aptForm, color: e.target.value})}
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                  Guardar Apartamento
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Propiedades</h2>
          <p className="text-slate-500">Listado general de complejos y edificios.</p>
        </div>
        <button 
          onClick={() => {
            setEditingPropId(null);
            setPropForm({ name: '', description: '' });
            setIsPropModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold transition-all active:scale-95 shadow-lg shadow-indigo-100"
        >
          <Plus size={18} /> Crear Propiedad
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties.map(p => (
          <div key={p.id} className="group relative bg-white border border-slate-200 rounded-[2rem] p-8 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer" onClick={() => setSelectedProperty(p)}>
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Building2 size={32} />
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={() => {
                    setEditingPropId(p.id);
                    setPropForm({ name: p.name, description: p.description });
                    setIsPropModalOpen(true);
                  }}
                  className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handlePropDelete(p.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">{p.name}</h3>
            <p className="text-slate-500 text-sm line-clamp-2 mb-6 h-10">{p.description || 'Sin descripción adicional.'}</p>
            
            <div className="flex items-center justify-between pt-6 border-t border-slate-50 gap-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                Gestionar Apartamentos <ChevronRight size={16} />
              </div>
              
              {/* NEW WIDGET BUTTON */}
              <button 
                onClick={(e) => { e.stopPropagation(); setWidgetProp(p); }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2 transition-colors"
              >
                 <Globe size={12}/> Motor Reservas
              </button>
            </div>
          </div>
        ))}
        {properties.length === 0 && (
          <div className="col-span-full py-32 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem]">
            <Building2 size={64} className="mx-auto text-slate-200 mb-6" />
            <h4 className="text-xl font-bold text-slate-400">Tu portafolio está vacío</h4>
            <p className="text-slate-400 mt-1 italic">Crea una propiedad para empezar a añadir unidades.</p>
          </div>
        )}
      </div>

      {/* Property Modal */}
      {isPropModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800">{editingPropId ? 'Editar Propiedad' : 'Nueva Propiedad'}</h3>
              <button onClick={() => setIsPropModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24}/></button>
            </div>
            <form onSubmit={handlePropSave} className="p-8 space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre del Complejo</label>
                <input 
                  required placeholder="Ej. Residencial Las Palmeras..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                  value={propForm.name} onChange={e => setPropForm({...propForm, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción</label>
                <textarea 
                  placeholder="Detalles sobre la ubicación, servicios..." rows={3}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                  value={propForm.description} onChange={e => setPropForm({...propForm, description: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                Guardar Propiedad
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Widget Generator Modal */}
      {widgetProp && (
         <BookingWidgetModal property={widgetProp} onClose={() => setWidgetProp(null)} />
      )}

      {/* Global Status Notification */}
      {status && (
        <div className={`fixed bottom-8 right-8 flex items-center gap-3 p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 z-50 ${
          status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-bold">{status.msg}</p>
        </div>
      )}
    </div>
  );
};