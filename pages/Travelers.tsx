
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { Traveler, Stay } from '../types';
import { useDataRefresh } from '../services/dataRefresher';
import { Search, MapPin, UserCheck, ChevronRight, Users, MessageCircle, Trophy } from 'lucide-react';
import { guestService } from '../services/guestService';
import { Booking } from '../types';

export const Travelers: React.FC = () => {
  const navigate = useNavigate();
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'LIST' | 'STAYS'>('LIST');

  const [bookings, setBookings] = useState<Booking[]>([]);

  const loadData = useCallback(async () => {
    const store = projectManager.getStore();
    const [tList, sList, bList] = await Promise.all([
      store.getTravelers(),
      store.getStays(),
      store.getBookings()
    ]);
    setTravelers(tList);
    setStays(sList);
    setBookings(bList);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useDataRefresh(loadData);

  const filteredTravelers = travelers.filter(t =>
    `${t.nombre} ${t.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.documento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Viajeros
            <span className="bg-slate-100 text-slate-500 text-sm px-3 py-1 rounded-full font-bold">
              {filteredTravelers.length} / {travelers.length}
            </span>
          </h2>
          <p className="text-slate-500">Base de datos central de huéspedes e historial de estancias.</p>
        </div>
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
          <button onClick={() => setActiveTab('LIST')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'LIST' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Directorio</button>
          <button onClick={() => setActiveTab('STAYS')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'STAYS' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Historial Global</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <Search className="text-slate-400" size={20} />
          <input
            type="text" placeholder="Buscar por nombre o documento..."
            className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {activeTab === 'LIST' ? (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Huésped</th>
                <th className="px-8 py-5">Contacto</th>
                <th className="px-8 py-5">Identidad</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTravelers.map(t => (
                <tr
                  key={t.id}
                  className="group hover:bg-slate-50/50 transition-all cursor-pointer"
                  onClick={() => navigate(`/travelers/${t.id}`)}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black shrink-0">
                        {t.nombre?.[0] || '?'}{t.apellidos?.[0] || ''}
                      </div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {t.nombre} {t.apellidos}
                        {guestService.isRecurrent(t, bookings, travelers) && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-tighter">
                            <Trophy size={10} /> Recurrente
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm">
                    <div className="text-slate-600 font-medium">{t.email || 'Sin email'}</div>
                    <div className="text-slate-400 text-xs">{t.telefono || '-'}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                      <MapPin size={10} /> {t.nacionalidad || '---'} | {t.documento}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right flex justify-end gap-2 items-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/comms', { state: { travelerId: t.id } }); }}
                      className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="Enviar Mensaje"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button className="text-slate-300 group-hover:text-indigo-600 transition-colors">
                      <ChevronRight size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTravelers.length === 0 && (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">No se encontraron viajeros.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Huésped</th>
                <th className="px-8 py-5">Check-in / Out</th>
                <th className="px-8 py-5">Origen / Importación</th>
                <th className="px-8 py-5">Asignación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stays.map(s => {
                const t = travelers.find(trav => trav.id === s.traveler_id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-5 font-bold text-slate-800">{t?.nombre} {t?.apellidos}</td>
                    <td className="px-8 py-5 text-sm text-slate-600">
                      {s.check_in} <span className="text-slate-300">→</span> {s.check_out}
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md">{s.source}</span>
                    </td>
                    <td className="px-8 py-5">
                      {s.apartment_id ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <UserCheck size={14} /> Auto-asignado
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-500 italic">Pendiente de unidad</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {stays.length === 0 && (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">No hay historial de estancias registrado.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
