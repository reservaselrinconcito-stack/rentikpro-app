
import React, { useState, useEffect, useMemo } from 'react';
import { projectManager } from '../services/projectManager';
import { Booking, Apartment, Property, Traveler } from '../types';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { 
  ChevronLeft, ChevronRight, Filter, 
  X, Trash2, CalendarDays, Clock, AlertTriangle
} from 'lucide-react';

type ViewMode = 'monthly' | 'weekly' | 'yearly';

const toDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  const loadData = async () => {
    const store = projectManager.getStore();
    try {
      const [bList, pList, tList, aList] = await Promise.all([
        store.getBookings(),
        store.getProperties(),
        store.getTravelers(),
        store.getAllApartments()
      ]);
      setBookings(bList);
      setProperties(pList);
      setTravelers(tList);
      setApartments(aList);
    } catch (err) { console.error("Error cargando calendario:", err); }
  };

  useEffect(() => { loadData(); }, []);
  useDataRefresh(loadData);

  // --- ALGORITMO DE SLOTTING (CARRILES) ---
  const bookingSlots = useMemo(() => {
    // Ordenamos por fecha de entrada
    const sorted = [...bookings].filter(b => b.status !== 'cancelled').sort((a, b) => {
      const diff = a.check_in.localeCompare(b.check_in);
      if (diff !== 0) return diff;
      return b.check_out.localeCompare(a.check_out);
    });

    const slots: string[] = []; // Guarda la fecha HASTA la cual el slot está ocupado
    const mapping = new Map<string, number>();

    sorted.forEach(b => {
      if (selectedPropertyId !== 'all' && b.property_id !== selectedPropertyId) return;

      let placed = false;
      // Buscar el primer slot donde quepa esta reserva
      for (let i = 0; i < slots.length; i++) {
        // CAMBIO CLAVE: Para que se solapen visualmente en el día de cambio,
        // la nueva reserva solo cabe en el slot si su entrada es ESTRICTAMENTE MAYOR 
        // que la salida de la anterior. Si es IGUAL (mismo día), hay colisión y debe bajar de línea.
        if (b.check_in > slots[i]) {
          mapping.set(b.id, i);
          slots[i] = b.check_out;
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        mapping.set(b.id, slots.length);
        slots.push(b.check_out);
      }
    });

    return mapping;
  }, [bookings, selectedPropertyId]);

  const getBookingsForDate = (date: Date) => {
    const dStr = toDateStr(date);
    return bookings.filter(b => {
        if(b.status === 'cancelled') return false;
        if(selectedPropertyId !== 'all' && b.property_id !== selectedPropertyId) return false;
        // CAMBIO CLAVE: Incluimos el día de check_out en la visualización (<=)
        return dStr >= b.check_in && dStr <= b.check_out;
    });
  };

  const upcomingBookings = useMemo(() => {
    const today = toDateStr(new Date());
    return bookings
      .filter(b => b.check_in >= today && b.status !== 'cancelled')
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
      .slice(0, 5);
  }, [bookings]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'monthly') {
      const firstDay = new Date(year, month, 1).getDay();
      const offset = firstDay === 0 ? 6 : firstDay - 1; 
      const days = [];
      
      for (let i = offset - 1; i >= 0; i--) {
         const d = new Date(year, month, -i);
         days.push({ date: d, currentMonth: false, dateStr: toDateStr(d) });
      }
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
         const d = new Date(year, month, i);
         days.push({ date: d, currentMonth: true, dateStr: toDateStr(d) });
      }
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
         const d = new Date(year, month + 1, i);
         days.push({ date: d, currentMonth: false, dateStr: toDateStr(d) });
      }
      return days;
    } 
    return [];
  }, [currentDate, viewMode]);

  const navigateDate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'monthly') d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Compacto */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
               <CalendarDays size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">Calendario</h2>
               <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                 <span>Vista Mensual</span>
                 <span>•</span>
                 <span>{viewMode === 'yearly' ? currentDate.getFullYear() : `${new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(currentDate)} ${currentDate.getFullYear()}`}</span>
               </div>
            </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
            <button onClick={() => setViewMode('monthly')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'monthly' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Mes</button>
            <button onClick={() => setViewMode('yearly')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'yearly' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Año</button>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl flex items-center p-1">
            <button onClick={() => navigateDate(-1)} className="p-2 text-slate-400 hover:text-slate-800"><ChevronLeft size={20}/></button>
            <button onClick={() => navigateDate(1)} className="p-2 text-slate-400 hover:text-slate-800"><ChevronRight size={20}/></button>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 rounded-2xl border border-slate-100">
             <Filter size={14} className="text-slate-400"/>
             <select className="bg-transparent text-[10px] font-bold text-slate-600 outline-none uppercase tracking-wide py-2" value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)}>
                <option value="all">Todas las Propiedades</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
          </div>
        </div>
      </div>

      {viewMode === 'yearly' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, idx) => (
            <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
               <h4 className="text-[10px] font-black text-slate-400 text-center uppercase mb-3">{new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(currentDate.getFullYear(), idx, 1))}</h4>
               <div className="grid grid-cols-7 gap-1">
                 {Array.from({ length: new Date(currentDate.getFullYear(), idx + 1, 0).getDate() }, (_, i) => i + 1).map(d => {
                    const bookingsOnDay = getBookingsForDate(new Date(currentDate.getFullYear(), idx, d));
                    const apt = bookingsOnDay[0] ? apartments.find(a => a.id === bookingsOnDay[0].apartment_id) : null;
                    const isConflict = bookingsOnDay.some(b => b.conflict_detected);
                    const bg = isConflict ? '#f87171' : (apt?.color || (bookingsOnDay.length > 0 ? '#4f46e5' : null));
                    return (
                        <div key={d} className={`aspect-square rounded-[4px] text-[6px] flex items-center justify-center font-bold ${bg ? 'text-white' : 'text-slate-300'}`} style={{ backgroundColor: bg || 'transparent' }}>
                            {d}
                        </div>
                    );
                 })}
               </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISTA MENSUAL CONTINUA CON SLOTS */
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden select-none">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d, i) => (
               <div key={d} className={`py-3 text-center text-[10px] font-black uppercase tracking-widest ${i >= 5 ? 'text-rose-400' : 'text-slate-400'}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 border-b border-slate-200">
            {calendarDays.map((day, i) => {
              const dayBookings = getBookingsForDate(day.date);
              const isToday = day.dateStr === toDateStr(new Date());

              const slotsInDay = dayBookings.map(b => bookingSlots.get(b.id) ?? -1);
              const maxSlot = Math.max(-1, ...slotsInDay);

              const renderSlots = Array.from({ length: maxSlot + 1 }, (_, slotIndex) => {
                  return dayBookings.find(b => bookingSlots.get(b.id) === slotIndex) || null;
              });

              return (
                <div key={i} className={`min-h-[140px] bg-white relative flex flex-col ${!day.currentMonth ? 'bg-slate-50/50' : ''}`}>
                  <div className="p-2 flex justify-between items-start z-10 relative pointer-events-none">
                     <span className={`text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : (day.currentMonth ? 'text-slate-700' : 'text-slate-300')}`}>
                        {day.date.getDate()}
                     </span>
                  </div>

                  <div className="flex-1 flex flex-col pt-1 w-full relative z-20">
                    {renderSlots.map((b, idx) => {
                      if (!b) {
                          return <div key={`spacer-${idx}`} className="h-[22px] mb-[2px]"></div>;
                      }

                      const apt = apartments.find(a => a.id === b.apartment_id);
                      const traveler = travelers.find(t => t.id === b.traveler_id);
                      
                      const isStart = b.check_in === day.dateStr;
                      const isEnd = b.check_out === day.dateStr; 
                      
                      let roundedClass = 'rounded-md'; 
                      let marginClass = 'mx-1'; 

                      if (isStart && !isEnd) {
                          roundedClass = 'rounded-l-md rounded-r-none';
                          marginClass = 'ml-1 -mr-px'; 
                      } else if (!isStart && isEnd) {
                          roundedClass = 'rounded-l-none rounded-r-md';
                          marginClass = '-ml-px mr-1'; 
                      } else if (!isStart && !isEnd) {
                          roundedClass = 'rounded-none';
                          marginClass = '-mx-px'; 
                      } else if (isStart && isEnd) {
                          roundedClass = 'rounded-md'; 
                          marginClass = 'mx-1';
                      }

                      const baseColor = apt?.color || '#94a3b8';
                      const isConflict = b.conflict_detected;
                      
                      const style = isConflict 
                        ? { 
                            backgroundImage: `repeating-linear-gradient(45deg, ${baseColor}, ${baseColor} 5px, #ef4444 5px, #ef4444 10px)`,
                            border: '1px solid #ef4444'
                          } 
                        : { backgroundColor: baseColor };

                      return (
                          <div 
                            key={b.id} 
                            onClick={(e) => { e.stopPropagation(); setViewingBooking(b); setIsViewModalOpen(true); }}
                            className={`
                              h-[22px] mb-[2px] text-white text-[10px] font-bold flex items-center px-2 cursor-pointer
                              hover:brightness-110 transition-all shadow-sm relative z-30
                              ${roundedClass} ${marginClass}
                              ${isConflict ? 'animate-pulse' : ''}
                            `}
                            style={style}
                            title={`${traveler?.nombre} (${b.guests}pax) - ${apt?.name} ${isConflict ? '[CONFLICTO]' : ''}`}
                          >
                            {(isStart || day.date.getDay() === 1) && (
                               <span className="truncate w-full drop-shadow-md whitespace-nowrap flex items-center gap-1">
                                 {isConflict && <AlertTriangle size={8} className="text-white fill-white"/>}
                                 {traveler?.nombre} {b.guests ? `${b.guests}px` : ''}
                               </span>
                            )}
                          </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tarjeta de Próximas Reservas */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Clock className="text-indigo-600"/> Próximas Llegadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingBookings.map(b => {
             const apt = apartments.find(a => a.id === b.apartment_id);
             const trav = travelers.find(t => t.id === b.traveler_id);
             return (
               <div key={b.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 hover:bg-slate-100 transition-colors">
                  <div className="w-2 h-12 rounded-full" style={{ backgroundColor: apt?.color || '#ccc' }}></div>
                  <div className="flex-1">
                     <p className="font-bold text-slate-800">{trav?.nombre} {trav?.apellidos}</p>
                     <p className="text-xs text-slate-500 font-bold">{b.check_in} <span className="text-slate-300 mx-1">→</span> {b.check_out}</p>
                  </div>
                  <div className="text-right">
                     <span className="text-lg font-black text-indigo-900">{b.guests || 1}</span>
                     <p className="text-[8px] uppercase font-black text-slate-400">PAX</p>
                  </div>
               </div>
             );
          })}
          {upcomingBookings.length === 0 && <p className="text-slate-400 italic">No hay llegadas previstas próximamente.</p>}
        </div>
      </div>

      {/* Modal Detalle */}
      {isViewModalOpen && viewingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-800"><X size={24}/></button>
            
            {viewingBooking.conflict_detected && (
               <div className="bg-amber-100 text-amber-700 p-4 rounded-2xl mb-6 flex items-center gap-3 border border-amber-200">
                  <AlertTriangle size={24}/>
                  <div className="text-xs font-bold">
                     <p className="uppercase mb-1">Conflicto Detectado</p>
                     <p className="opacity-80">Esta reserva se solapa con otra. Revisa el Channel Manager.</p>
                  </div>
               </div>
            )}

            <h3 className="text-2xl font-black text-slate-800 mb-6">Detalle de Reserva</h3>
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidad Asignada</p>
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 rounded-full" style={{ backgroundColor: apartments.find(a => a.id === viewingBooking.apartment_id)?.color }}></div>
                   <p className="text-lg font-bold text-slate-800">{apartments.find(a => a.id === viewingBooking.apartment_id)?.name || 'Sin Asignar'}</p>
                </div>
              </div>
              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Huésped</p>
                <div className="flex justify-between items-end">
                   <p className="text-xl font-black text-indigo-900">{travelers.find(t => t.id === viewingBooking.traveler_id)?.nombre || 'Huésped'}</p>
                   <span className="text-lg font-black text-indigo-600 bg-white px-3 py-1 rounded-xl shadow-sm">{viewingBooking.guests || 1} PAX</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Entrada</p>
                    <p className="font-bold text-lg text-slate-700">{viewingBooking.check_in}</p>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Salida</p>
                    <p className="font-bold text-lg text-slate-700">{viewingBooking.check_out}</p>
                </div>
              </div>
            </div>
            <button onClick={async () => { 
                if(confirm("¿Estás seguro?")) {
                    await projectManager.getStore().deleteBooking(viewingBooking.id); 
                    setIsViewModalOpen(false); 
                    loadData(); 
                    notifyDataChanged(); 
                }
            }} className="w-full mt-8 py-4 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors"><Trash2 size={18}/> Eliminar Reserva</button>
          </div>
        </div>
      )}
    </div>
  );
};
