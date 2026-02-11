
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { Property, Apartment, Traveler, Stay } from '../types';
import { processImage, ScannedData } from '../services/ocrParser';
import { 
  Camera, Upload, Save, UserPlus, FileText, CheckCircle2, 
  AlertCircle, ArrowLeft, RefreshCw, ScanLine
} from 'lucide-react';

export const CheckInScan: React.FC = () => {
  const navigate = useNavigate();
  
  // Data Context
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  
  // Selection State
  const [selectedProp, setSelectedProp] = useState<string>('');
  const [selectedApt, setSelectedApt] = useState<string>('');
  
  // Scan State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Traveler>>({
    nombre: '',
    apellidos: '',
    documento: '',
    tipo_documento: 'DNI',
    fecha_nacimiento: '',
    nacionalidad: 'ESP',
    email: '',
    telefono: ''
  });

  const [existingTravelerId, setExistingTravelerId] = useState<string | null>(null);

  useEffect(() => {
    const loadInit = async () => {
      const store = projectManager.getStore();
      const props = await store.getProperties();
      setProperties(props);
      
      // Block 11-D: Default to active property if available
      const activeId = projectManager.getActivePropertyId();
      if (props.some(p => p.id === activeId)) {
         setSelectedProp(activeId);
      } else if (props.length > 0) {
        setSelectedProp(props[0].id);
      }
    };
    loadInit();
  }, []);

  useEffect(() => {
    if (selectedProp) {
      const loadApts = async () => {
        const apts = await projectManager.getStore().getApartments(selectedProp);
        setApartments(apts);
        if (apts.length > 0) setSelectedApt(apts[0].id);
        else setSelectedApt('');
      };
      loadApts();
    }
  }, [selectedProp]);

  // Define this BEFORE it is used in handleImageSelect
  const checkExistingTraveler = async (docId: string) => {
    const store = projectManager.getStore();
    const travelers = await store.getTravelers();
    const existing = travelers.find(t => t.documento.toUpperCase() === docId.toUpperCase());
    
    if (existing) {
      setExistingTravelerId(existing.id);
      // Merge data: prefer existing valid data, overwrite empty fields with scan
      setFormData(prev => ({
        ...prev,
        nombre: existing.nombre || prev.nombre,
        apellidos: existing.apellidos || prev.apellidos,
        email: existing.email || prev.email,
        telefono: existing.telefono || prev.telefono,
      }));
      setScanError("Viajero ya registrado. Datos actualizados.");
    } else {
      setExistingTravelerId(null);
    }
  };

  // Handle Image Selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setScanError(null);
    setIsScanning(true);
    setScanProgress(0);

    try {
      const result: ScannedData = await processImage(file, (progress) => {
        setScanProgress(Math.round(progress * 100));
      });

      // Update form with scanned data
      setFormData(prev => ({
        ...prev,
        nombre: result.nombre || prev.nombre,
        apellidos: result.apellidos || prev.apellidos,
        documento: result.documento || prev.documento,
        tipo_documento: result.tipo_documento,
        fecha_nacimiento: result.fecha_nacimiento || prev.fecha_nacimiento,
        nacionalidad: result.nacionalidad || prev.nacionalidad,
      }));

      // Check if traveler exists
      if (result.documento) {
        checkExistingTraveler(result.documento);
      }

    } catch (error) {
      console.error(error);
      setScanError("No se pudo leer el documento. Intenta mejorar la iluminación o rellenar manualmente.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.documento) {
      alert("Nombre y Documento son obligatorios");
      return;
    }

    try {
      const store = projectManager.getStore();
      const travelerId = existingTravelerId || crypto.randomUUID();
      
      const traveler: Traveler = {
        id: travelerId,
        nombre: formData.nombre || '',
        apellidos: formData.apellidos || '',
        tipo_documento: formData.tipo_documento || 'DNI',
        documento: formData.documento || '',
        fecha_nacimiento: formData.fecha_nacimiento || '',
        telefono: formData.telefono || '',
        email: formData.email || '',
        nacionalidad: formData.nacionalidad || '',
        created_at: existingTravelerId ? (await store.getTravelerById(travelerId))?.created_at || Date.now() : Date.now(),
        updated_at: Date.now()
      };

      await store.saveTraveler(traveler);

      // Create Check-in (Stay)
      const stay: Stay = {
        id: crypto.randomUUID(),
        traveler_id: travelerId,
        apartment_id: selectedApt || null,
        check_in: new Date().toISOString().split('T')[0], // Today
        check_out: '', // Open ended or manual edit later
        source: 'CHECKIN_SCAN',
        created_at: Date.now()
      };

      await store.saveStay(stay);

      alert("Viajero guardado y Check-in registrado correctamente.");
      navigate('/travelers');

    } catch (error) {
      console.error(error);
      alert("Error al guardar datos.");
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkin_${formData.documento || 'scan'}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
          <ArrowLeft size={24} className="text-slate-400"/>
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Check-in Scan</h2>
          <p className="text-slate-500 text-sm">Escaneo de documentos OCR y registro rápido.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Capture & Preview */}
        <div className="space-y-6">
          {/* Context Selectors */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={16}/> Contexto del Registro
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Propiedad</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={selectedProp}
                  onChange={e => setSelectedProp(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Apartamento</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={selectedApt}
                  onChange={e => setSelectedApt(e.target.value)}
                  disabled={!selectedProp}
                >
                  <option value="">Sin asignar</option>
                  {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Camera / Upload Area */}
          <div 
            className="bg-slate-900 rounded-[2.5rem] p-1 overflow-hidden relative group cursor-pointer shadow-xl"
            onClick={() => !isScanning && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" // Forces back camera on mobile
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageSelect}
            />
            
            <div className="bg-slate-800 rounded-[2.2rem] h-80 flex flex-col items-center justify-center relative overflow-hidden border-2 border-dashed border-slate-600 hover:border-indigo-500 transition-all">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-indigo-500/50">
                    <Camera size={32} />
                  </div>
                  <h4 className="text-white font-bold text-lg">Tocar para Escanear</h4>
                  <p className="text-slate-400 text-sm mt-2">DNI, Pasaporte o Documento ID</p>
                </div>
              )}

              {isScanning && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <RefreshCw size={48} className="text-indigo-400 animate-spin mb-4" />
                  <p className="text-white font-black tracking-widest text-lg">PROCESANDO OCR</p>
                  <div className="w-48 h-2 bg-slate-700 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                  </div>
                  <p className="text-indigo-300 text-xs mt-2 font-mono">{scanProgress}%</p>
                </div>
              )}
            </div>
          </div>

          {scanError && (
            <div className="bg-amber-50 text-amber-700 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-amber-100">
              <AlertCircle size={20} className="shrink-0" />
              {scanError}
            </div>
          )}
        </div>

        {/* Right Column: Data Form */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <ScanLine className="text-indigo-600"/> Datos Extraídos
            </h3>
            {existingTravelerId && (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                Viajero Existente
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Nombre</label>
                <input 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Apellidos</label>
                <input 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  value={formData.apellidos}
                  onChange={e => setFormData({...formData, apellidos: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Documento</label>
                <input 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                  value={formData.documento}
                  onChange={e => setFormData({...formData, documento: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Tipo</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  value={formData.tipo_documento}
                  onChange={e => setFormData({...formData, tipo_documento: e.target.value})}
                >
                  <option value="DNI">DNI / NIE</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Nacimiento</label>
                <input 
                  type="date"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  value={formData.fecha_nacimiento}
                  onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Nacionalidad</label>
                <input 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                  maxLength={3}
                  value={formData.nacionalidad}
                  onChange={e => setFormData({...formData, nacionalidad: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1 pt-4 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase">Email (Opcional)</label>
              <input 
                type="email"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div className="pt-6 flex flex-col gap-3">
            <button 
              onClick={handleSave}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={20} /> Guardar Viajero & Check-in
            </button>
            
            <button 
              onClick={handleExportJSON}
              className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
            >
              <FileText size={16} /> Exportar JSON (Parte)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
