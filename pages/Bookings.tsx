
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { bookingRequestImporter } from '../services/bookingRequestImporter';
import { Booking, Property, Traveler, Apartment, AccountingMovement } from '../types';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { Plus, Calendar, Trash2, CheckCircle, Clock, XCircle, X, MessageCircle, Edit2, AlertCircle, FileInput, Upload } from 'lucide-react';

export const Bookings: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [allApartments, setAllApartments] = useState<Apartment[]>([]);
  const [formApartments, setFormApartments] = useState<Apartment[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState<Partial<Booking>>({ 
    property_id: '', 
    apartment_id: '', 
    traveler_id: '', 
    check_in: '', 
    check_out: '', 
    status: 'pending', 
    total_price: 0,
    guests: 1,
    source: 'manual' // Default
  });
  
  // Extra form field for Payment Method (mapped to accounting)
  const [paymentMethod, setPaymentMethod] = useState<string>('Transferencia');

  const loadData = useCallback(async () => {
    const store = projectManager.getStore();
    try {
      const [b, p, t, a] = await Promise.all([
        store.getBookings(), 
        store.getProperties(), 
        store.getTravelers(),
        store.getAllApartments()
      ]);
      setBookings(b.sort((x, y) => y.check_in.localeCompare(x.check_in)));
      setProperties(p);
      setTravelers(t);
      setAllApartments(a);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useDataRefresh(loadData);

  useEffect(() => {
    if (form.property_id) {
      projectManager.getStore().getApartments(form.property_id).then(setFormApartments);
    } else {
      setFormApartments([]);
    }
  }, [form.property_id]);

  const openEditModal = async (b: Booking) => {
    setEditingBookingId(b.id);
    setForm({
       property_id: b.property_id,
       apartment_id: b.apartment_id,
       traveler_id: b.traveler_id,
       check_in: b.check_in,
       check_out: b.check_out,
       status: b.status,
       total_price: b.total_price,
       guests: b.guests,
       source: b.source
    });
    
    // Try to find associated movement to preload payment method
    const movements = await projectManager.getStore().getMovements('ALL');
    const mov = movements.find(m => m.reservation_id === b.id);
    if (mov) setPaymentMethod(mov.payment_method);
    else setPaymentMethod('Transferencia');

    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingBookingId(null);
    setForm({ 
      property_id: projectManager.getActivePropertyId(), // Block 11-D: Default to active
      apartment_id: '', traveler_id: '', 
      check_in: '', check_out: '', status: 'pending', 
      total_price: 0, guests: 1, source: 'manual' 
    });
    setPaymentMethod('Transferencia');
    setIsModalOpen(true);
  };

  const handleImportRequest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await bookingRequestImporter.import(text);
      
      if (result.success) {
        alert(result.message);
        notifyDataChanged();
        loadData();
      } else {
        alert("Error: " + result.message);
      }
    } catch (err: any) {
      alert("Error crítico importando solicitud: " + err.message);
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const store = projectManager.getStore();
    
    const b: Booking = {
      id: editingBookingId || crypto.randomUUID(),
      property_id: form.property_id || '',
      apartment_id: form.apartment_id || '',
      traveler_id: form.traveler_id || '',
      check_in: form.check_in || '',
      check_out: form.check_out || '',
      status: form.status as any || 'pending',
      total_price: Number(form.total_price) || 0,
      guests: Number(form.guests) || 1,
      source: form.source || 'manual',
      created_at: editingBookingId ? (bookings.find(bo => bo.id === editingBookingId)?.created_at || Date.now()) : Date.now(),
      // Preserve external ref if editing
      external_ref: editingBookingId ? bookings.find(bo => bo.id === editingBookingId)?.external_ref : undefined
    };
    
    await store.saveBooking(b);
    
    // INTEGRACIÓN CONTABLE (Regla de Negocio Bloque 6)
    // "Una Reserva = Un ingreso contable"
    // Si confirmada, actualizamos o creamos el movimiento.
    if (b.status === 'confirmed') {
      const allMovements = await store.getMovements('ALL');
      let movement = allMovements.find(m => m.reservation_id === b.id);
      
      const travelerName = travelers.find(t=>t.id===b.traveler_id)?.nombre || 'Huésped';
      const concept = `Reserva ${b.source} - ${travelerName} (${b.check_in})`;
      
      // Regla: Efectivo -> Base B
      const bucket = paymentMethod.toLowerCase() === 'efectivo' ? 'B' : 'A';

      if (movement) {
         // Update existing movement
         movement.amount_gross = b.total_price;
         movement.amount_net = b.total_price; // Assuming no commission logic here yet
         movement.date = b.check_in;
         movement.payment_method = paymentMethod;
         movement.accounting_bucket = bucket;
         movement.concept = concept;
         movement.updated_at = Date.now();
         await store.saveMovement(movement);
      } else {
         // Create new if strictly confirmed and didn't exist
         const newMov: AccountingMovement = {
            id: crypto.randomUUID(),
            date: b.check_in,
            type: 'income',
            category: 'Alquiler',
            concept: concept,
            apartment_id: b.apartment_id,
            reservation_id: b.id,
            traveler_id: b.traveler_id,
            amount_gross: b.total_price,
            vat: 0,
            commission: 0,
            amount_net: b.total_price,
            payment_method: paymentMethod,
            accounting_bucket: bucket,
            platform: b.source,
            import_hash: btoa(b.id + Date.now()).slice(0, 24),
            created_at: Date.now(),
            updated_at: Date.now()
         };
         await store.saveMovement(newMov);
      }
    }

    notifyDataChanged();
    loadData();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar reserva permanentemente? Esto no borra el apunte contable asociado si existe.')) {
      await projectManager.getStore().deleteBooking(id);
      notifyDataChanged();
      loadData();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Listado de Reservas</h2>
          <p className="text-slate-500">Gestión de reservas e integración contable automática.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".json" 
            className="hidden" 
            onChange={handleImportRequest} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-white text-slate-600 border border-slate-200 px-6 py-4 rounded-3xl font-bold text-xs shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-2"
            title="Importar booking_request.json"
          >
            <Upload size={16}/> Importar Solicitud
          </button>
          <button onClick={openNewModal} className="bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black text-xs shadow-xl shadow-indigo-100 hover:scale-105 transition-all flex items-center gap-2">
            <Plus size={16}/> Añadir Reserva
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-8 py-5">Unidad / Propiedad</th>
              <th className="px-8 py-5">Huésped</th>
              <th className="px-8 py-5">Origen</th>
              <th className="px-8 py-5">Fechas</th>
              <th className="px-8 py-5">Importe</th>
              <th className="px-8 py-5">Estado</th>
              <th className="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.map(b => (
              <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                   <div className="font-bold text-slate-800">{allApartments.find(a => a.id === b.apartment_id)?.name || 'N/A'}</div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase">{properties.find(p => p.id === b.property_id)?.name || 'N/A'}</div>
                </td>
                <td className="px-8 py-5 font-bold text-slate-700">{travelers.find(t => t.id === b.traveler_id)?.nombre || 'Huésped desconocido'}</td>
                <td className="px-8 py-5">
                   <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${b.source === 'WEBSITE_IMPORT' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                      {b.source}
                   </span>
                </td>
                <td className="px-8 py-5 text-xs text-slate-500 font-bold">
                   {b.check_in} al {b.check_out}
                   {b.conflict_detected && <span className="block text-[9px] text-rose-500 font-black mt-1 flex items-center gap-1"><AlertCircle size={10}/> CONFLICTO</span>}
                </td>
                <td className={`px-8 py-5 font-black ${b.total_price === 0 ? 'text-rose-500' : 'text-slate-900'}`}>
                   {b.total_price}€
                   {b.total_price === 0 && <AlertCircle size={12} className="inline ml-1 mb-0.5" title="Revisar precio"/>}
                </td>
                <td className="px-8 py-5">
                   {b.status === 'confirmed' ? (
                     <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Confirmada</span>
                   ) : (
                     <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Pendiente</span>
                   )}
                </td>
                <td className="px-8 py-5 text-right flex justify-end gap-2">
                  <button onClick={() => openEditModal(b)} className="text-slate-300 hover:text-indigo-600 transition-colors p-2 bg-slate-50 rounded-xl" title="Editar"><Edit2 size={18}/></button>
                  <button 
                    onClick={() => navigate('/comms', { state: { travelerId: b.traveler_id } })}
                    className="text-slate-300 hover:text-indigo-600 transition-colors p-2 bg-slate-50 rounded-xl"
                    title="Enviar Mensaje"
                  >
                    <MessageCircle size={18}/>
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 bg-slate-50 rounded-xl"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={7} className="px-8 py-20 text-center text-slate-400 italic">No hay reservas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
               <h3 className="text-2xl font-black text-slate-800">{editingBookingId ? 'Editar Reserva' : 'Nueva Reserva Manual'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={28}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Propiedad</label>
                    <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.property_id} onChange={e => setForm({...form, property_id: e.target.value})}>
                      <option value="">Seleccionar...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Apartamento</label>
                    <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.apartment_id} onChange={e => setForm({...form, apartment_id: e.target.value})} disabled={!form.property_id}>
                      <option value="">Seleccionar...</option>
                      {formApartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Huésped</label>
                 <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.traveler_id} onChange={e => setForm({...form, traveler_id: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {travelers.map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellidos}</option>)}
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Entrada</label><input type="date" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.check_in} onChange={e => setForm({...form, check_in: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Salida</label><input type="date" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.check_out} onChange={e => setForm({...form, check_out: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Precio Total</label><input type="number" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.total_price} onChange={e => setForm({...form, total_price: Number(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Nº Personas</label><input type="number" min="1" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.guests} onChange={e => setForm({...form, guests: Number(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Estado</label>
                   <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmada</option>
                   </select>
                 </div>
              </div>
              
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                 <h4 className="font-bold text-slate-700 text-sm mb-3">Integración Contable</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Método de Pago</label>
                       <select className="w-full p-3 bg-white border rounded-xl font-medium" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                          <option value="Transferencia">Transferencia</option>
                          <option value="Bizum">Bizum</option>
                          <option value="Tarjeta">Tarjeta (Stripe/TPV)</option>
                          <option value="Efectivo">Efectivo (Caja B)</option>
                          <option value="Pasarela OTA">Cobrado por OTA</option>
                       </select>
                    </div>
                    <div className="flex items-center">
                       <p className="text-xs text-slate-500 italic mt-4">
                          {paymentMethod === 'Efectivo' 
                             ? "⚠ Se asignará al Bucket 'B' automáticamente." 
                             : "✓ Se asignará al Bucket 'A' (Oficial)."}
                       </p>
                    </div>
                 </div>
              </div>

              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-xl hover:bg-slate-800 transition-all">Guardar Reserva</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
