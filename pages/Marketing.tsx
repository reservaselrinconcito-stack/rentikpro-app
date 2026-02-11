
import React, { useState, useEffect, useMemo } from 'react';
import { projectManager } from '../services/projectManager';
import { MarketingTemplate, Traveler, MarketingCampaign, Coupon } from '../types';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import {
   Megaphone, Gift, Users, Filter, Mail, Copy,
   Download, FileText, CheckCircle2, AlertCircle,
   ChevronRight, Calendar, UserPlus, Send, History, Search, X,
   Ticket, Heart, PartyPopper, Clock, Bot, MousePointer, Printer, Sparkles, MapPin, Trophy
} from 'lucide-react';

type Tab = 'CAMPAIGNS' | 'COUPONS' | 'BIRTHDAYS' | 'SEGMENTS' | 'TEMPLATES';

export const Marketing: React.FC = () => {
   const [activeTab, setActiveTab] = useState<Tab>('CAMPAIGNS');
   const [travelersData, setTravelersData] = useState<any[]>([]);
   const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
   const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
   const [coupons, setCoupons] = useState<Coupon[]>([]);

   const [selectedSegment, setSelectedSegment] = useState<'ALL' | 'RECURRING'>('ALL');
   const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
   const [templateForm, setTemplateForm] = useState<Partial<MarketingTemplate>>({ name: '', subject: '', body: '' });

   const loadData = async () => {
      const store = projectManager.getStore();
      try {
         const [data, tList, cList, coupList] = await Promise.all([
            store.getTravelersMarketingData(),
            store.getMarketingTemplates(),
            store.getCampaigns(),
            store.getCoupons()
         ]);
         setTravelersData(data);
         setTemplates(tList);
         setCoupons(coupList);

         // Iniciar campañas por defecto si no existen
         if (cList.length === 0) {
            const defaults: MarketingCampaign[] = [
               { id: crypto.randomUUID(), type: 'birthday', name: 'Felicitación de Cumpleaños', automation_level: 'automatic', enabled: true, created_at: Date.now() },
               { id: crypto.randomUUID(), type: 'anniversary', name: 'Aniversario de Estancia', automation_level: 'semi', enabled: false, created_at: Date.now() },
               { id: crypto.randomUUID(), type: 'seasonal', name: 'San Valentín (14 Feb)', automation_level: 'manual', config_json: '02-14', enabled: false, created_at: Date.now() }
            ];
            for (const c of defaults) await store.saveCampaign(c);
            setCampaigns(defaults);
         } else {
            setCampaigns(cList);
         }

      } catch (err) { console.error(err); }
   };

   useEffect(() => { loadData(); }, []);
   useDataRefresh(loadData);

   // --- STATS ---
   const stats = useMemo(() => {
      const now = new Date();
      const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return {
         birthdaysToday: travelersData.filter(t => t.fecha_nacimiento?.includes(todayStr)).length,
         recurrentCount: travelersData.filter(t => t.total_stays >= 2).length,
         activeCampaigns: campaigns.filter(c => c.enabled).length
      };
   }, [travelersData, campaigns]);

   const upcomingBirthdays = useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentYear = today.getFullYear();

      return travelersData
         .filter(t => t.fecha_nacimiento && t.fecha_nacimiento.length > 5)
         .map(t => {
            // Manejar formatos YYYY-MM-DD
            const birthDate = new Date(t.fecha_nacimiento);
            if (isNaN(birthDate.getTime())) return null;

            let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

            // Si ya pasó este año, es el siguiente
            if (nextBirthday < today) {
               nextBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
            }

            const diffTime = nextBirthday.getTime() - today.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const turningAge = nextBirthday.getFullYear() - birthDate.getFullYear();

            return { ...t, nextBirthday, daysRemaining, turningAge };
         })
         .filter(Boolean)
         .sort((a, b) => a.daysRemaining - b.daysRemaining);
   }, [travelersData]);

   // --- LOGIC ---
   const handleCampaignToggle = async (c: MarketingCampaign) => {
      const updated = { ...c, enabled: !c.enabled };
      await projectManager.getStore().saveCampaign(updated);
      loadData();
   };

   const handleCampaignConfig = async (c: MarketingCampaign, level: 'automatic' | 'semi' | 'manual') => {
      const updated = { ...c, automation_level: level };
      await projectManager.getStore().saveCampaign(updated);
      loadData();
   };

   const handleGenerateCoupon = async () => {
      const code = 'PROMO-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      await projectManager.getStore().saveCoupon({
         id: crypto.randomUUID(),
         code,
         discount_type: 'percentage',
         discount_value: 10,
         status: 'active',
         created_at: Date.now()
      });
      loadData();
   };

   const handleDeleteCoupon = async (id: string) => {
      if (confirm('¿Borrar cupón?')) {
         await projectManager.getStore().deleteCoupon(id);
         loadData();
      }
   };

   const saveTemplate = async () => {
      await projectManager.getStore().saveMarketingTemplate({
         id: templateForm.id || crypto.randomUUID(),
         name: templateForm.name || 'Sin nombre',
         subject: templateForm.subject || '',
         body: templateForm.body || '',
         created_at: Date.now()
      });
      setIsTemplateModalOpen(false);
      loadData();
   };

   // --- FILTRADO DE SEGMENTOS ---
   const filteredSegments = useMemo(() => {
      if (selectedSegment === 'RECURRING') {
         // Recurrentes = Han repetido (2+ estancias), ordenados por cantidad de visitas (no noches)
         return travelersData.filter(t => t.total_stays >= 2).sort((a, b) => b.total_stays - a.total_stays);
      }
      return travelersData; // ALL
   }, [travelersData, selectedSegment]);

   return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
               <h2 className="text-4xl font-black text-slate-800 tracking-tight">Marketing</h2>
               <p className="text-slate-500 font-medium italic">Automatización y fidelización de huéspedes.</p>
            </div>
            <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1 shadow-inner">
               {(['CAMPAIGNS', 'COUPONS', 'BIRTHDAYS', 'SEGMENTS', 'TEMPLATES'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                     {t === 'CAMPAIGNS' ? 'Campañas' : t === 'COUPONS' ? 'Cupones' : t === 'BIRTHDAYS' ? 'Cumpleaños' : t === 'SEGMENTS' ? 'Segmentos' : 'Plantillas'}
                  </button>
               ))}
            </div>
         </div>

         {/* KPI Cards Interactivas */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
               onClick={() => setActiveTab('BIRTHDAYS')}
               className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-4 hover:border-pink-200 hover:shadow-lg transition-all group text-left"
            >
               <div className="bg-pink-100 text-pink-500 p-4 rounded-2xl group-hover:scale-110 transition-transform"><PartyPopper size={24} /></div>
               <div><p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-pink-400">Cumpleaños Hoy</p><h3 className="text-2xl font-black text-slate-800">{stats.birthdaysToday}</h3></div>
            </button>

            <button
               onClick={() => setActiveTab('CAMPAIGNS')}
               className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-4 hover:border-indigo-200 hover:shadow-lg transition-all group text-left"
            >
               <div className="bg-indigo-100 text-indigo-500 p-4 rounded-2xl group-hover:scale-110 transition-transform"><Megaphone size={24} /></div>
               <div><p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-indigo-400">Campañas Activas</p><h3 className="text-2xl font-black text-slate-800">{stats.activeCampaigns}</h3></div>
            </button>

            <button
               onClick={() => { setActiveTab('SEGMENTS'); setSelectedSegment('RECURRING'); }}
               className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-200 hover:shadow-lg transition-all group text-left"
            >
               <div className="bg-emerald-100 text-emerald-500 p-4 rounded-2xl group-hover:scale-110 transition-transform"><Users size={24} /></div>
               <div><p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-emerald-400">Clientes Recurrentes</p><h3 className="text-2xl font-black text-slate-800">{stats.recurrentCount}</h3></div>
            </button>
         </div>

         {activeTab === 'CAMPAIGNS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
               {campaigns.map(c => (
                  <div key={c.id} className={`p-8 rounded-[3rem] border-2 transition-all ${c.enabled ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-50' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                     <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-2xl ${c.type === 'birthday' ? 'bg-pink-100 text-pink-500' : c.type === 'seasonal' ? 'bg-rose-100 text-rose-500' : 'bg-amber-100 text-amber-500'}`}>
                           {c.type === 'birthday' ? <PartyPopper size={32} /> : c.type === 'seasonal' ? <Heart size={32} /> : <Clock size={32} />}
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${c.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                              {c.enabled ? 'ACTIVA' : 'PAUSADA'}
                           </span>
                           <button onClick={() => handleCampaignToggle(c)} className={`w-12 h-6 rounded-full p-1 transition-colors ${c.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${c.enabled ? 'translate-x-6' : ''}`}></div>
                           </button>
                        </div>
                     </div>
                     <h3 className="text-2xl font-black text-slate-800 mb-2">{c.name}</h3>
                     <p className="text-slate-500 text-sm mb-6">
                        {c.type === 'birthday' && "Envía felicitaciones el día del cumpleaños."}
                        {c.type === 'seasonal' && "Campaña programada para fechas especiales."}
                        {c.type === 'anniversary' && "Recordatorio tras 1 año de la estancia."}
                     </p>

                     <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                           <div className="flex items-center gap-3 text-slate-600 font-bold text-xs">
                              {c.automation_level === 'automatic' ? <Bot size={16} /> : c.automation_level === 'semi' ? <Sparkles size={16} /> : <MousePointer size={16} />}
                              Nivel de Automatización
                           </div>
                           <select
                              value={c.automation_level}
                              onChange={(e) => handleCampaignConfig(c, e.target.value as any)}
                              className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none"
                           >
                              <option value="automatic">Automática</option>
                              <option value="semi">Semi-Auto</option>
                              <option value="manual">Manual</option>
                           </select>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                           <div className="flex items-center gap-3 text-slate-600 font-bold text-xs">
                              <FileText size={16} /> Plantilla de Email
                           </div>
                           <select
                              className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none max-w-[120px]"
                              value={c.template_id || ''}
                              onChange={async (e) => {
                                 const updated = { ...c, template_id: e.target.value };
                                 await projectManager.getStore().saveCampaign(updated);
                                 loadData();
                              }}
                           >
                              <option value="">Seleccionar...</option>
                              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                           </select>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}

         {activeTab === 'COUPONS' && (
            <div className="space-y-8 animate-in fade-in">
               <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black text-slate-800">Generador de Cupones</h3>
                  <button onClick={handleGenerateCoupon} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg hover:scale-105 transition-all">
                     + Generar Nuevo
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {coupons.map(coupon => (
                     <div key={coupon.id} className="relative group bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col sm:flex-row h-auto sm:h-48">
                        {/* Ticket Stub Visual */}
                        <div className="bg-slate-900 p-6 flex flex-col justify-center items-center text-white sm:w-1/3 relative overflow-hidden">
                           <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
                           <Ticket size={32} className="mb-2 opacity-50" />
                           <span className="text-4xl font-black">{coupon.discount_value}%</span>
                           <span className="text-[8px] uppercase tracking-widest opacity-60">Descuento</span>
                        </div>
                        {/* Ticket Body */}
                        <div className="p-6 flex-1 flex flex-col justify-between sm:w-2/3">
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código Promocional</p>
                              <div className="flex items-center gap-3">
                                 <p className="text-2xl font-black text-slate-800 font-mono tracking-wider">{coupon.code}</p>
                                 <button onClick={() => navigator.clipboard.writeText(coupon.code)} className="text-slate-300 hover:text-indigo-600"><Copy size={16} /></button>
                              </div>
                           </div>
                           <div className="flex justify-between items-end mt-4">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${coupon.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                 {coupon.status}
                              </span>
                              <div className="flex gap-2">
                                 <button className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-xl" title="Imprimir" onClick={() => alert("Función de impresión en desarrollo")}><Printer size={18} /></button>
                                 <button className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl" onClick={() => handleDeleteCoupon(coupon.id)}><X size={18} /></button>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
                  {coupons.length === 0 && (
                     <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem]">
                        <Ticket size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-400 italic">No hay cupones activos. Genera uno para tus campañas.</p>
                     </div>
                  )}
               </div>
            </div>
         )}

         {activeTab === 'BIRTHDAYS' && (
            <div className="space-y-6 animate-in fade-in">
               <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <PartyPopper className="text-pink-500" /> Próximos Cumpleaños
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingBirthdays.map((t) => (
                     <div key={t.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:border-pink-200 hover:shadow-lg transition-all">
                        {/* Visual indicator for today */}
                        {t.daysRemaining === 0 && <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">Hoy!</div>}

                        <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center font-black text-lg">
                           {t.nombre[0]}
                        </div>
                        <div className="flex-1">
                           <p className="font-black text-slate-800 text-sm truncate">{t.nombre} {t.apellidos}</p>
                           <p className="text-xs font-bold text-slate-400">
                              {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(t.nextBirthday)}
                              <span className="ml-1 text-slate-300">• {t.turningAge} años</span>
                           </p>
                        </div>
                        <div className="text-right">
                           <span className={`text-xl font-black ${t.daysRemaining === 0 ? 'text-pink-600' : 'text-slate-800'}`}>
                              {t.daysRemaining === 0 ? 'HOY' : t.daysRemaining}
                           </span>
                           <p className="text-[8px] uppercase font-black text-slate-400">{t.daysRemaining === 1 ? 'Día' : t.daysRemaining === 0 ? '' : 'Días'}</p>
                        </div>
                     </div>
                  ))}
                  {upcomingBirthdays.length === 0 && (
                     <div className="col-span-full py-20 text-center text-slate-400 italic border-2 border-dashed border-slate-200 rounded-[3rem]">
                        <PartyPopper size={48} className="mx-auto text-slate-200 mb-4" />
                        <p>No se han encontrado fechas de nacimiento válidas en los registros.</p>
                     </div>
                  )}
               </div>
            </div>
         )}

         {activeTab === 'SEGMENTS' && (
            <div className="space-y-6 animate-in fade-in">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                     <Users className="text-emerald-500" />
                     {selectedSegment === 'RECURRING' ? 'Clientes Recurrentes (+2 Estancias)' : 'Todos los Huéspedes'}
                  </h3>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                     <button onClick={() => setSelectedSegment('ALL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedSegment === 'ALL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Todos</button>
                     <button onClick={() => setSelectedSegment('RECURRING')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedSegment === 'RECURRING' ? 'bg-emerald-500 shadow-sm text-white' : 'text-slate-400'}`}>Recurrentes</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSegments.map(t => (
                     <div key={t.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${t.total_stays >= 2 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                              {t.nombre[0]}
                           </div>
                           <div className="overflow-hidden">
                              <p className="font-bold text-slate-800 truncate">{t.nombre} {t.apellidos}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold">
                                 <MapPin size={10} /> {t.nacionalidad || '---'}
                              </div>
                           </div>
                        </div>

                        <div className="flex gap-2">
                           <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                              <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Visitas</p>
                              <p className={`text-xl font-black ${t.total_stays >= 2 ? 'text-emerald-600' : 'text-slate-700'}`}>{t.total_stays}</p>
                           </div>
                           <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                              <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Última</p>
                              <p className="text-xs font-bold text-slate-600 py-1">{t.last_checkout || '-'}</p>
                           </div>
                        </div>

                        {t.total_stays >= 2 && (
                           <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl text-emerald-700 text-xs font-bold">
                              <Trophy size={14} className="text-emerald-500" /> Cliente VIP
                           </div>
                        )}
                     </div>
                  ))}
                  {filteredSegments.length === 0 && (
                     <div className="col-span-full py-20 text-center text-slate-400 italic">
                        No se encontraron viajeros en este segmento.
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* Template Modal Reutilizado */}
         {isTemplateModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden">
                  <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                     <h3 className="text-2xl font-black text-slate-800">{templateForm.id ? 'Editar' : 'Nueva'} Plantilla</h3>
                     <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400"><X size={28} /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre Interno</label>
                        <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Ej. Felicitación Cumpleaños" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Asunto del Email</label>
                        <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={templateForm.subject} onChange={e => setTemplateForm({ ...templateForm, subject: e.target.value })} placeholder="Ej. ¡Felicidades {{nombre}}!" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cuerpo del Mensaje</label>
                        <textarea rows={6} className="w-full p-4 bg-slate-50 border rounded-2xl font-medium" value={templateForm.body} onChange={e => setTemplateForm({ ...templateForm, body: e.target.value })} placeholder="Hola {{nombre}}, queríamos desearte..." />
                        <p className="mt-2 text-[9px] text-slate-400 italic">Variables: {'{{nombre}}'}, {'{{apellidos}}'}, {'{{email}}'}</p>
                     </div>
                     <button onClick={saveTemplate} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-xl hover:bg-slate-800 transition-all">Guardar Plantilla</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
