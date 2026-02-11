
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { Traveler, Stay } from '../types';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, 
  Fingerprint, Globe, User, History, 
  CheckCircle2, AlertCircle, Building2, MessageCircle
} from 'lucide-react';

export const TravelerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [traveler, setTraveler] = useState<Traveler | null>(null);
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const store = projectManager.getStore();
        const [t, s] = await Promise.all([
          store.getTravelerById(id),
          store.getStaysByTravelerId(id)
        ]);
        setTraveler(t);
        setStays(s);
      } catch (err) {
        console.error("Error loading traveler detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!traveler) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertCircle size={48} className="mx-auto text-rose-500" />
        <h3 className="text-xl font-bold text-slate-800">Viajero no encontrado</h3>
        <button 
          onClick={() => navigate('/travelers')}
          className="text-indigo-600 font-bold hover:underline"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center gap-6">
        <button 
          onClick={() => navigate('/travelers')}
          className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded">Ficha de Huésped</span>
            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-tighter">ID: {traveler.id.slice(0, 8)}</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">
            {traveler.nombre} {traveler.apellidos}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-8">
            <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center text-3xl font-black mb-8 shadow-xl shadow-indigo-100 mx-auto">
              {traveler.nombre?.[0]}{traveler.apellidos?.[0]}
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Fingerprint size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{traveler.tipo_documento || 'Documento'}</p>
                  <p className="font-bold text-slate-800">{traveler.documento}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nacionalidad</p>
                  <p className="font-bold text-slate-800">{traveler.nacionalidad || 'No especificada'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fecha de Nacimiento</p>
                  <p className="font-bold text-slate-800">{traveler.fecha_nacimiento || '---'}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
              <button 
                onClick={() => navigate('/comms', { state: { travelerId: traveler.id } })}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 mb-4"
              >
                <MessageCircle size={20}/> Enviar Mensaje
              </button>
              
              <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <Mail size={16} className="text-slate-300" />
                {traveler.email || 'Sin correo electrónico'}
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <Phone size={16} className="text-slate-300" />
                {traveler.telefono || 'Sin teléfono'}
              </div>
            </div>
          </div>
          
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6">
             <div className="flex items-center gap-3 text-indigo-600 mb-2">
                <CheckCircle2 size={18} />
                <span className="font-bold text-sm">Estado de Registro</span>
             </div>
             <p className="text-xs text-indigo-500 font-medium">Huésped registrado en el sistema local desde {new Date(traveler.created_at).toLocaleDateString()}. Todos los datos están cifrados en su base de datos local.</p>
          </div>
        </div>

        {/* History Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900 rounded-xl text-white">
                  <History size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-800">Historial de Estancias</h3>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stays.length} Registros</span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Check-in / Out</th>
                    <th className="px-8 py-5">Unidad</th>
                    <th className="px-8 py-5">Fuente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stays.map(stay => (
                    <tr key={stay.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                          {stay.check_in} <span className="text-slate-300 font-normal">→</span> {stay.check_out}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {stay.apartment_id ? (
                           <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
                              <Building2 size={14} /> Unidad Asignada
                           </div>
                        ) : (
                          <div className="text-slate-400 italic text-xs">Pendiente de asignar</div>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                          {stay.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {stays.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center">
                        <History size={48} className="mx-auto text-slate-100 mb-4" />
                        <p className="text-slate-400 italic">Este huésped no tiene estancias registradas todavía.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
