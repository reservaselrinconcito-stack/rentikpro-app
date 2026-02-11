import React, { useState, useEffect } from 'react';
import { projectManager } from '../services/projectManager';
import { syncEngine } from '../services/syncEngine';
import { networkMonitor } from '../services/networkMonitor';
import { ChannelConnection, CalendarEvent, Booking } from '../types';
import { 
  Activity, CheckCircle2, AlertTriangle, ShieldCheck, Play, 
  Wifi, WifiOff, RefreshCw, Zap, Server
} from 'lucide-react';

export const QualityAssurance: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isOnline, setIsOnline] = useState(networkMonitor.isOnline());
  const [testAptId, setTestAptId] = useState<string | null>(null);

  // Auto-subscribe to network
  useEffect(() => {
    return networkMonitor.subscribe(setIsOnline);
  }, []);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const setupTestEnv = async () => {
    addLog("Configurando entorno de pruebas...");
    const store = projectManager.getStore();
    
    // 1. Create Property & Apt
    const propId = 'test-prop-qa';
    const aptId = 'test-apt-qa';
    await store.saveProperty({ id: propId, name: 'QA Test Property', description: 'Auto-generated', created_at: Date.now() });
    await store.saveApartment({ id: aptId, property_id: propId, name: 'QA Unit 101', color: '#000000', created_at: Date.now() });
    setTestAptId(aptId);

    // 2. Clear previous bookings/events for this unit
    const allBookings = await store.getBookings();
    for (const b of allBookings) {
       if (b.apartment_id === aptId) await store.deleteBooking(b.id);
    }
    const conns = await store.getChannelConnections(aptId);
    for (const c of conns) {
       await store.deleteCalendarEventsByConnection(c.id);
       await store.deleteChannelConnection(c.id);
    }

    addLog("Entorno limpio. Unidad 'QA Unit 101' lista.");
    await refreshBookings(aptId);
  };

  const refreshBookings = async (aptId: string) => {
     const store = projectManager.getStore();
     const b = await store.getBookings();
     setBookings(b.filter(x => x.apartment_id === aptId));
  };

  // --- TEST 1: CONFLICT RESOLUTION ---
  const runTestConflict = async () => {
    if (!testAptId) return alert("Ejecuta 'Setup Environment' primero.");
    addLog("Iniciando Test 1: Resolución de Conflictos (Booking > Airbnb)");
    const store = projectManager.getStore();

    // 1. Create Mock Connections
    const connBooking: ChannelConnection = {
       id: 'conn-booking', apartment_id: testAptId, channel_name: 'BOOKING', 
       connection_type: 'ICAL', ical_url: 'mock://booking', priority: 90, 
       enabled: true, last_sync: 0, last_status: 'OK', created_at: Date.now(),
       alias: 'Booking Mock', sync_log: '', force_direct: false
    };
    const connAirbnb: ChannelConnection = {
       id: 'conn-airbnb', apartment_id: testAptId, channel_name: 'AIRBNB', 
       connection_type: 'ICAL', ical_url: 'mock://airbnb', priority: 50, 
       enabled: true, last_sync: 0, last_status: 'OK', created_at: Date.now(),
       alias: 'Airbnb Mock', sync_log: '', force_direct: false
    };
    await store.saveChannelConnection(connBooking);
    await store.saveChannelConnection(connAirbnb);

    // 2. Inject Conflicting Events (Same Dates)
    const dates = { start: '2025-06-01', end: '2025-06-05' };
    
    // Low Priority Event
    await store.saveCalendarEvent({
       id: 'evt-airbnb-1', connection_id: connAirbnb.id, external_uid: 'uid-airbnb-1',
       apartment_id: testAptId, property_id: 'test-prop-qa',
       start_date: dates.start, end_date: dates.end, status: 'confirmed', 
       summary: 'Airbnb Guest', description: '', created_at: Date.now(), updated_at: Date.now(),
       raw_data: ''
    });
    addLog(`Inyectado Evento Airbnb (Prio 50): ${dates.start}`);

    // High Priority Event
    await store.saveCalendarEvent({
       id: 'evt-booking-1', connection_id: connBooking.id, external_uid: 'uid-booking-1',
       apartment_id: testAptId, property_id: 'test-prop-qa',
       start_date: dates.start, end_date: dates.end, status: 'confirmed', 
       summary: 'Booking Guest', description: '', created_at: Date.now(), updated_at: Date.now(),
       raw_data: ''
    });
    addLog(`Inyectado Evento Booking (Prio 90): ${dates.start} (CONFLICTO)`);

    // 3. Run Sync Engine
    addLog("Ejecutando Motor de Sincronización...");
    const res = await syncEngine.syncApartment(testAptId);
    
    // 4. Verify
    await refreshBookings(testAptId);
    addLog(`Resultado Sync: ${res.conflicts} conflictos reportados.`);
    
    // Check winner
    const winner = bookings.find(b => b.status === 'confirmed');
    // Note: bookings state might need one more refresh cycle or fetch directly
    const finalBookings = (await store.getBookings()).filter(b => b.apartment_id === testAptId);
    
    const activeBooking = finalBookings.find(b => b.status === 'confirmed');
    if (activeBooking?.source === 'BOOKING') {
       addLog("✅ ÉXITO: Prevaleció Booking sobre Airbnb.");
    } else {
       addLog("❌ FALLO: La prioridad no se respetó correctamente.");
    }
  };

  // --- TEST 2: UPDATES ---
  const runTestUpdate = async () => {
     if (!testAptId) return;
     addLog("Iniciando Test 2: Actualización de Evento");
     const store = projectManager.getStore();
     
     // Change date of existing Booking event
     await store.saveCalendarEvent({
        id: 'evt-booking-1', connection_id: 'conn-booking', external_uid: 'uid-booking-1',
        apartment_id: testAptId, property_id: 'test-prop-qa',
        start_date: '2025-06-01', end_date: '2025-06-10', // Extended
        status: 'confirmed', summary: 'Booking Guest (Extended)', description: '', 
        created_at: Date.now(), updated_at: Date.now(),
        raw_data: ''
     });
     
     await syncEngine.syncApartment(testAptId);
     const b = (await store.getBookings()).find(x => x.external_ref === 'uid-booking-1');
     
     if (b?.check_out === '2025-06-10') addLog("✅ ÉXITO: Fecha actualizada correctamente.");
     else addLog(`❌ FALLO: Fecha no cambió (${b?.check_out}).`);
     
     refreshBookings(testAptId);
  };

  // --- TEST 3: CANCELLATION ---
  const runTestCancel = async () => {
     if (!testAptId) return;
     addLog("Iniciando Test 3: Cancelación de Evento");
     const store = projectManager.getStore();
     
     // Mark as cancelled in feed
     await store.saveCalendarEvent({
        id: 'evt-booking-1', connection_id: 'conn-booking', external_uid: 'uid-booking-1',
        apartment_id: testAptId, property_id: 'test-prop-qa',
        start_date: '2025-06-01', end_date: '2025-06-10', 
        status: 'cancelled', summary: 'Booking Guest', description: '', 
        created_at: Date.now(), updated_at: Date.now(),
        raw_data: ''
     });
     
     await syncEngine.syncApartment(testAptId);
     const b = (await store.getBookings()).find(x => x.external_ref === 'uid-booking-1');
     
     if (b?.status === 'cancelled') addLog("✅ ÉXITO: Reserva marcada como cancelada.");
     else addLog(`❌ FALLO: Estado es ${b?.status}.`);
     
     refreshBookings(testAptId);
  };

  // --- TEST 6: MOBILE PERF ---
  const runTestPerformance = async () => {
     if (!testAptId) return;
     addLog("Iniciando Test 6: Stress Test iOS (500 Eventos)");
     const store = projectManager.getStore();
     
     const start = performance.now();
     const events: CalendarEvent[] = [];
     
     // Generate 500 events
     for (let i = 0; i < 500; i++) {
        events.push({
           id: `perf-evt-${i}`, connection_id: 'conn-booking', external_uid: `uid-perf-${i}`,
           apartment_id: testAptId, property_id: 'test-prop-qa',
           start_date: '2026-01-01', end_date: '2026-01-02', 
           status: 'confirmed', summary: `Stress Test ${i}`, description: '', 
           created_at: Date.now(), updated_at: Date.now(),
           raw_data: ''
        });
     }
     
     // Batch insert manual (simulating heavy parse)
     for(const e of events) await store.saveCalendarEvent(e);
     
     const mid = performance.now();
     addLog(`Inserción DB: ${(mid - start).toFixed(2)}ms`);
     
     await syncEngine.syncApartment(testAptId);
     const end = performance.now();
     
     addLog(`Sincronización Total: ${(end - mid).toFixed(2)}ms`);
     if ((end-mid) < 2000) addLog("✅ ÉXITO: Rendimiento aceptable (<2s).");
     else addLog("⚠️ AVISO: Rendimiento lento.");
     
     refreshBookings(testAptId);
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
         <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
               <Activity className="text-indigo-600"/> Centro de Calidad
            </h2>
            <p className="text-slate-500">Suite de pruebas manuales y diagnósticos del sistema.</p>
         </div>
         <div className="flex gap-4 items-center">
            <div className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
               {isOnline ? <Wifi size={16}/> : <WifiOff size={16}/>}
               {isOnline ? 'Red Online' : 'Red Offline'}
            </div>
            <button onClick={setupTestEnv} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs hover:scale-105 transition-transform flex items-center gap-2">
               <RefreshCw size={16}/> Reset Entorno QA
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD 1 */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
               <div className="absolute top-0 right-0 bg-indigo-50 p-4 rounded-bl-[2rem] text-indigo-600"><ShieldCheck size={24}/></div>
               <h3 className="font-black text-lg text-slate-800 mb-2">1. Prioridad Canales</h3>
               <p className="text-xs text-slate-500 mb-4">Simula conflicto Booking vs Airbnb. Booking debe ganar automáticamente.</p>
               <button onClick={runTestConflict} className="w-full py-3 bg-indigo-50 text-indigo-700 font-black rounded-xl text-xs hover:bg-indigo-100 flex items-center justify-center gap-2">
                  <Play size={14}/> Ejecutar Test
               </button>
            </div>

            {/* CARD 2 */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
               <div className="absolute top-0 right-0 bg-blue-50 p-4 rounded-bl-[2rem] text-blue-600"><RefreshCw size={24}/></div>
               <h3 className="font-black text-lg text-slate-800 mb-2">2. Actualización</h3>
               <p className="text-xs text-slate-500 mb-4">Verifica que un cambio de fecha no duplica la reserva, sino que la actualiza.</p>
               <button onClick={runTestUpdate} className="w-full py-3 bg-blue-50 text-blue-700 font-black rounded-xl text-xs hover:bg-blue-100 flex items-center justify-center gap-2">
                  <Play size={14}/> Ejecutar Test
               </button>
            </div>

            {/* CARD 3 */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
               <div className="absolute top-0 right-0 bg-rose-50 p-4 rounded-bl-[2rem] text-rose-600"><AlertTriangle size={24}/></div>
               <h3 className="font-black text-lg text-slate-800 mb-2">3. Cancelación</h3>
               <p className="text-xs text-slate-500 mb-4">Un evento eliminado del feed debe marcarse como 'cancelled' en DB.</p>
               <button onClick={runTestCancel} className="w-full py-3 bg-rose-50 text-rose-700 font-black rounded-xl text-xs hover:bg-rose-100 flex items-center justify-center gap-2">
                  <Play size={14}/> Ejecutar Test
               </button>
            </div>

            {/* CARD 6 */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
               <div className="absolute top-0 right-0 bg-amber-50 p-4 rounded-bl-[2rem] text-amber-600"><Zap size={24}/></div>
               <h3 className="font-black text-lg text-slate-800 mb-2">6. Stress Test iOS</h3>
               <p className="text-xs text-slate-500 mb-4">Inserta 500 eventos y mide latencia de reconciliación.</p>
               <button onClick={runTestPerformance} className="w-full py-3 bg-amber-50 text-amber-700 font-black rounded-xl text-xs hover:bg-amber-100 flex items-center justify-center gap-2">
                  <Play size={14}/> Ejecutar Test
               </button>
            </div>

         </div>

         {/* LOGGER CONSOLE */}
         <div className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col shadow-xl h-[500px]">
            <h3 className="text-white font-black flex items-center gap-2 mb-4 uppercase tracking-widest text-xs">
               <Server size={16}/> Terminal de Salida
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-2 pr-2">
               {logs.map((l, i) => (
                  <div key={i} className="text-slate-300 border-l-2 border-indigo-500 pl-2 py-1">{l}</div>
               ))}
               {logs.length === 0 && <p className="text-slate-600 italic">Listo para pruebas...</p>}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700">
               <p className="text-slate-400 text-xs font-bold mb-2">Estado Actual (QA Unit)</p>
               <div className="flex flex-wrap gap-2">
                  {bookings.filter(b => b.status === 'confirmed').map(b => (
                     <span key={b.id} className="bg-emerald-900 text-emerald-400 text-[9px] px-2 py-1 rounded border border-emerald-700">
                        {b.source}: {b.check_in}
                     </span>
                  ))}
                  {bookings.filter(b => b.status === 'cancelled').map(b => (
                     <span key={b.id} className="bg-rose-900 text-rose-400 text-[9px] px-2 py-1 rounded border border-rose-700 line-through">
                        {b.source}
                     </span>
                  ))}
                  {bookings.length === 0 && <span className="text-slate-600 text-[10px]">Sin reservas activas</span>}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};