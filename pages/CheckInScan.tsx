
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { Property, Apartment, Traveler, Stay, CheckInRequest, Booking } from '../types';
import { processImage, ScannedData } from '../services/ocrParser';
import { checkinService } from '../services/checkinService';
import {
  Camera, Upload, Save, UserPlus, FileText, CheckCircle2,
  AlertCircle, ArrowLeft, RefreshCw, ScanLine, Link2,
  Send, Mail, MessageCircle, Copy, Search, Calendar, User, Users,
  Globe, Check
} from 'lucide-react';
import { toast } from 'sonner';

export const CheckInScan: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [view, setView] = useState<'LIST' | 'SCAN'>(bookingId ? 'SCAN' : 'LIST');

  // Data Context
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<CheckInRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection State
  const [selectedProp, setSelectedProp] = useState<string>('');
  const [selectedApt, setSelectedApt] = useState<string>('');

  // Scan State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [targetBookingName, setTargetBookingName] = useState<string | null>(null);

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
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const store = projectManager.getStore();
    try {
      const [p, b, reqs] = await Promise.all([
        store.getProperties(),
        store.getBookings(),
        checkinService.regenerateRequests()
      ]);
      setProperties(p);
      setBookings(b);
      setRequests(reqs);

      if (bookingId) {
        const target = b.find(x => x.id === bookingId);
        if (target) {
          setTargetBookingName(target.guest_name || target.external_ref || 'Reserva');
          if (target.property_id) setSelectedProp(target.property_id);
          if (target.apartment_id) setSelectedApt(target.apartment_id);
        }
      } else {
        const activeId = projectManager.getActivePropertyId();
        if (p.some(prop => prop.id === activeId)) setSelectedProp(activeId);
        else if (p.length > 0) setSelectedProp(p[0].id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProp) {
      const loadApts = async () => {
        const apts = await projectManager.getStore().getApartments(selectedProp);
        setApartments(apts);
        if (!bookingId) {
          if (apts.length > 0) setSelectedApt(apts[0].id);
          else setSelectedApt('');
        }
      };
      loadApts();
    }
  }, [selectedProp, bookingId]);

  const handleSendEmail = async (req: CheckInRequest) => {
    const store = projectManager.getStore();
    const settings = await store.getSettings();

    if (!settings.smtp_host) {
      toast.error("Configura el SMTP en Ajustes para enviar emails");
      return;
    }

    const loader = toast.loading("Enviando email...");
    try {
      const link = checkinService.getPublicLink(req.token || '');
      // Note: Real SMTP sending would happen via a background task or worker.
      // For now we simulate and mark as sent.
      await checkinService.markAsSent(req.id);
      toast.success("Solicitud enviada por email", { id: loader });
      loadAll();
    } catch (e) {
      toast.error("Error al enviar email", { id: loader });
    }
  };

  const handleCopyWhatsApp = (req: CheckInRequest) => {
    const link = checkinService.getPublicLink(req.token || '');
    const message = `Hola! Por favor, completa el registro de viajeros para tu estancia usando este enlace: ${link}`;
    navigator.clipboard.writeText(message);
    toast.success("Mensaje copiado al portapapeles para WhatsApp");
    checkinService.markAsSent(req.id).then(() => loadAll());
  };

  const resizeImage = (file: File, maxSide: number = 1600): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSide) {
              height *= maxSide / width;
              width = maxSide;
            }
          } else {
            if (height > maxSide) {
              width *= maxSide / height;
              height = maxSide;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const checkExistingTraveler = async (docId: string) => {
    const store = projectManager.getStore();
    const travelers = await store.getTravelers();
    const existing = travelers.find(t => t.documento?.toUpperCase() === docId.toUpperCase());

    if (existing) {
      setExistingTravelerId(existing.id);
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setScanError(null);
    setIsScanning(true);
    setScanProgress(0);

    try {
      const resized = await resizeImage(file);
      const result: ScannedData = await processImage(resized, (progress) => {
        setScanProgress(Math.round(progress * 100));
      });

      setFormData(prev => ({
        ...prev,
        nombre: result.nombre || prev.nombre,
        apellidos: result.apellidos || prev.apellidos,
        documento: result.documento || prev.documento,
        tipo_documento: result.tipo_documento,
        fecha_nacimiento: result.fecha_nacimiento || prev.fecha_nacimiento,
        nacionalidad: result.nacionalidad || prev.nacionalidad,
      }));

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
      toast.error("Nombre y Documento son obligatorios");
      return;
    }

    const loader = toast.loading("Guardando viajero...");

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

      if (bookingId) {
        await store.updateReservation(bookingId, { traveler_id: travelerId }, 'CHECKIN_SCAN');
        toast.success(`Viajero vinculado a la reserva: ${targetBookingName}`, { id: loader });
      } else {
        const stay: Stay = {
          id: crypto.randomUUID(),
          traveler_id: travelerId,
          apartment_id: selectedApt || null,
          check_in: new Date().toISOString().split('T')[0],
          check_out: '',
          source: 'CHECKIN_SCAN',
          created_at: Date.now()
        };
        await store.saveStay(stay);
        toast.success("Viajero guardado y Check-in registrado correctamente.", { id: loader });
      }

      navigate('/travelers');
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar datos.", { id: loader });
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

  if (loading) return <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => view === 'SCAN' && !bookingId ? setView('LIST') : navigate('/')} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <ArrowLeft size={24} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Check-in Scan</h2>
            <p className="text-slate-500 text-sm">Registro de viajeros y solicitudes de check-in.</p>
          </div>
        </div>
        {!bookingId && view === 'LIST' && (
          <button
            onClick={() => setView('SCAN')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <ScanLine size={20} /> Escaneo Manual
          </button>
        )}
      </div>

      {view === 'LIST' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-8 rounded-[2rem] border border-white/40 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center gap-2">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-2"><Calendar size={24} /></div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Pendientes</p>
              <h3 className="text-4xl font-black text-slate-800">{requests.filter(r => r.status === 'PENDING').length}</h3>
            </div>
            <div className="glass p-8 rounded-[2rem] border border-white/40 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center gap-2">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-2"><Send size={24} /></div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Enviados</p>
              <h3 className="text-4xl font-black text-slate-800">{requests.filter(r => r.status === 'SENT').length}</h3>
            </div>
            <div className="glass p-8 rounded-[2rem] border border-white/40 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center gap-2">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl mb-2"><Check size={24} /></div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Completados</p>
              <h3 className="text-4xl font-black text-slate-800">{requests.filter(r => r.status === 'COMPLETED').length}</h3>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <Users size={24} className="text-indigo-600" /> Próximas Llegadas
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Calendar size={14} /> Próximos 7 días
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {requests.length > 0 ? requests.map(req => {
                const booking = bookings.find(b => b.id === req.booking_id);
                if (!booking) return null;
                return (
                  <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg">
                        {new Date(booking.check_in).getDate()}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-700">{booking.guest_name || 'Huésped desconocido'}</h4>
                        <p className="text-xs text-slate-400 font-medium">Ref: {req.locator || booking.external_ref || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter mb-1">Estado</p>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          req.status === 'SENT' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                          {req.status === 'PENDING' ? 'Pendiente' : req.status === 'SENT' ? 'Enviado' : 'Completado'}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {req.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleSendEmail(req)}
                              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                              title="Enviar por Email"
                            >
                              <Mail size={18} />
                            </button>
                            <button
                              onClick={() => handleCopyWhatsApp(req)}
                              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                              title="Copia para WhatsApp"
                            >
                              <MessageCircle size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setView('SCAN')}
                            className="px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                          >
                            Registrar Manual
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/checkin-scan?bookingId=${booking.id}`)}
                          className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          title="Escanear ahora"
                        >
                          <ScanLine size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-12 text-center flex flex-col items-center gap-4">
                  <div className="p-4 bg-slate-50 text-slate-300 rounded-full"><Users size={48} /></div>
                  <div className="max-w-xs mx-auto">
                    <h4 className="font-black text-slate-700">No hay check-ins próximos</h4>
                    <p className="text-sm text-slate-400">Todo al día. Las nuevas reservas aparecerán aquí automáticamente.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Capture & Preview */}
          <div className="space-y-6">
            {/* Context Selectors */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={16} /> Contexto del Registro
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
                capture="environment"
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
                <ScanLine className="text-indigo-600" /> Datos Extraídos
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
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Apellidos</label>
                  <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    value={formData.apellidos}
                    onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Documento</label>
                  <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                    value={formData.documento}
                    onChange={e => setFormData({ ...formData, documento: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Tipo</label>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    value={formData.tipo_documento}
                    onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}
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
                    onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nacionalidad</label>
                  <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                    maxLength={3}
                    value={formData.nacionalidad}
                    onChange={e => setFormData({ ...formData, nacionalidad: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1 pt-4 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase">Email (Opcional)</label>
                <input
                  type="email"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
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
              {bookingId && (
                <div className="p-4 bg-indigo-50 rounded-2xl flex items-center justify-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
                  <Link2 size={16} /> Vinculando a: {targetBookingName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
