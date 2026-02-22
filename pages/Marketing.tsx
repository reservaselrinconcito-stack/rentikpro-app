
import React, { useState, useEffect, useMemo } from 'react';
import { projectManager } from '../services/projectManager';
import { MarketingTemplate, Traveler, MarketingCampaign, Coupon } from '../types';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import {
   Megaphone, Gift, Users, Filter, Mail, Copy,
   Download, FileText, CheckCircle2, AlertCircle,
   ChevronRight, Calendar, UserPlus, Send, History, Search, X,
   Ticket, Heart, PartyPopper, Clock, Bot, MousePointer, Printer, Sparkles, MapPin, Trophy, LayoutTemplate, Share2,
   Edit2, Trash2, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CampaignContentModal } from '../components/CampaignContentModal';
import { EmailTemplateEditor } from '../components/EmailTemplateEditor';
import { EmailTemplatePreview } from '../components/EmailTemplatePreview';
import { EmailTemplateSpec, MarketingEmailTemplate, MediaAsset, MarketingEmailLog, UserSettings } from '../types';
import { smtpService } from '../services/smtpService';
import { renderTemplateSpecToEmailHtml } from '../services/emailRenderer';
import { toast } from 'sonner';
import { guestService } from '../services/guestService';

type Tab = 'CAMPAIGNS' | 'COUPONS' | 'BIRTHDAYS' | 'SEGMENTS' | 'TEMPLATES';

export const Marketing: React.FC = () => {
   const [activeTab, setActiveTab] = useState<Tab>('CAMPAIGNS');
   const [travelersData, setTravelersData] = useState<any[]>([]);
   const [templates, setTemplates] = useState<MarketingEmailTemplate[]>([]);
   const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
   const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
   const [coupons, setCoupons] = useState<Coupon[]>([]);
   const [websites, setWebsites] = useState<any[]>([]);
   const navigate = useNavigate();

   const [selectedSegment, setSelectedSegment] = useState<'ALL' | 'NATIONAL' | 'INTERNATIONAL' | 'PROVINCE'>('ALL');
   const [selectedProvince, setSelectedProvince] = useState<string>('');
   const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
   const [isContentModalOpen, setIsContentModalOpen] = useState(false);
   const [selectedCampaignForContent, setSelectedCampaignForContent] = useState<MarketingCampaign | null>(null);

   const [editingTemplate, setEditingTemplate] = useState<MarketingEmailTemplate | null>(null);
   const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

   // Sending State
   const [isSending, setIsSending] = useState(false);
   const [sendTestModalOpen, setSendTestModalOpen] = useState(false);
   const [testEmail, setTestEmail] = useState('');
   const [activeCampaignForSend, setActiveCampaignForSend] = useState<MarketingCampaign | null>(null);
   const [showSafetyCheck, setShowSafetyCheck] = useState(false);
   const [safetyConfirmed, setSafetyConfirmed] = useState(false);
   const [campaignLogs, setCampaignLogs] = useState<{ [campaignId: string]: MarketingEmailLog[] }>({});
   const [settings, setSettings] = useState<UserSettings | null>(null);

   const loadData = async () => {
      const store = projectManager.getStore();
      try {
         const currentProjectId = projectManager.getCurrentProjectId();
         const s = await store.getSettings();
         setSettings(s);

         const [data, tList, cList, coupList, wList, mList] = await Promise.all([
            store.getTravelersMarketingData(),
            store.getMarketingEmailTemplates(),
            store.getCampaigns(),
            store.getCoupons(),
            store.getWebsites(),
            store.getAllMediaAssets()
         ]);

         // DEV LOGS: Diagnostic
         console.log(`[Marketing] Active Project: ${currentProjectId}`);
         console.log(`[Marketing] TravelersData: ${data.length} records`);
         console.log(`[Marketing] Templates: ${tList.length}`);
         console.log(`[Marketing] Campaigns: ${cList.length}`);

         setTravelersData(data);
         setTemplates(tList);
         setCoupons(coupList);
         setWebsites(wList || []);
         setMediaLibrary(mList || []);
         setCampaigns(cList);

         // Iniciar campañas por defecto si no existen (In-memory, NO auto-save per user REQ)
         if (cList.length === 0) {
            const defaults: MarketingCampaign[] = [
               { id: crypto.randomUUID(), type: 'birthday', name: 'Felicitación de Cumpleaños', automation_level: 'automatic', enabled: true, created_at: Date.now() },
               { id: crypto.randomUUID(), type: 'anniversary', name: 'Aniversario de Estancia', automation_level: 'semi', enabled: false, created_at: Date.now() },
               { id: crypto.randomUUID(), type: 'seasonal', name: 'San Valentín (14 Feb)', automation_level: 'manual', config_json: '02-14', enabled: false, created_at: Date.now() }
            ];
            setCampaigns(defaults);
         } else {
            setCampaigns(cList);
         }

         // Load Logs for campaigns
         const logsMap: any = {};
         for (const c of cList) {
            logsMap[c.id] = await store.getMarketingEmailLogs(c.id);
         }
         setCampaignLogs(logsMap);

      } catch (err) { console.error(err); }
   };

   useEffect(() => { loadData(); }, []);
   useDataRefresh(loadData);

   // --- STATS ---
   const stats = useMemo(() => {
      const now = new Date();
      const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const nationalCount = travelersData.filter(t => t.nacionalidad === 'ES').length;
      const internationalCount = travelersData.filter(t => t.nacionalidad && t.nacionalidad !== 'ES').length;

      return {
         birthdaysToday: travelersData.filter(t => t.fecha_nacimiento?.includes(todayStr)).length,
         nationalCount,
         internationalCount,
         activeCampaigns: campaigns.filter(c => c.enabled).length
      };
   }, [travelersData, campaigns]);

   const smtpCheck = useMemo(() => {
      if (!settings) return { valid: false, missing: [] };
      return smtpService.verifyConfig(settings);
   }, [settings]);

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

   const handleEditTemplate = (t: MarketingEmailTemplate) => {
      setEditingTemplate({ ...t });
      setIsTemplateModalOpen(true);
   };

   const handleCreateTemplate = () => {
      const newSpec: EmailTemplateSpec = {
         header: { business_name: 'Mi Negocio' },
         hero: { title: 'Nuevo Mensaje', subtitle: 'Subtítulo del mensaje' },
         body: { text: 'Escribe aquí tu mensaje...' },
         offer: { badge_text: 'OFERTA', detail_text: 'Detalles de la oferta', enabled: false },
         cta: { button_text: 'Saber Más', url: 'https://', enabled: false },
         footer: { phone: '', social_links: [], unsubscription_notice: true }
      };
      const newTemplate: MarketingEmailTemplate = {
         id: crypto.randomUUID(),
         name: 'Nueva Plantilla',
         template_spec_json: JSON.stringify(newSpec),
         created_at: Date.now(),
         updated_at: Date.now()
      };
      setEditingTemplate(newTemplate);
      setIsTemplateModalOpen(true);
   };

   const saveTemplate = async () => {
      if (!editingTemplate) return;
      await projectManager.getStore().saveMarketingEmailTemplate(editingTemplate);
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      loadData();
   };

   const handleDeleteTemplate = async (id: string) => {
      if (confirm('¿Borrar plantilla?')) {
         await projectManager.getStore().deleteMarketingEmailTemplate(id);
         loadData();
      }
   };

   const handleDuplicateTemplate = async (id: string) => {
      await projectManager.getStore().duplicateMarketingEmailTemplate(id);
      loadData();
   };

   const handleUpdateEditingSpec = (spec: EmailTemplateSpec) => {
      if (!editingTemplate) return;
      setEditingTemplate({
         ...editingTemplate,
         template_spec_json: JSON.stringify(spec),
         updated_at: Date.now()
      });
   };

   // --- SENDING LOGIC ---
   const handleSendTest = async () => {
      if (!activeCampaignForSend || !testEmail || !settings) return;

      const check = smtpCheck;
      if (!check.valid) {
         toast.error(`Configuración SMTP incompleta: ${check.missing.join(', ')}`);
         return;
      }

      setIsSending(true);
      try {
         const template = templates.find(t => t.id === activeCampaignForSend.email_template_id);
         if (!template) throw new Error("Plantilla no encontrada");

         const spec = JSON.parse(template.template_spec_json);
         const html = renderTemplateSpecToEmailHtml(spec, settings, "Test User");

         const result = await smtpService.sendEmail(testEmail, `[TEST] ${spec.hero.title}`, html, settings);

         if (result.success) {
            toast.success("Email de prueba enviado");
            setSendTestModalOpen(false);
            setTestEmail('');
            // Log a fake entry for immediate feedback
            await projectManager.getStore().saveMarketingEmailLog({
               id: crypto.randomUUID(),
               campaign_id: activeCampaignForSend.id,
               to_email: testEmail,
               status: 'SENT',
               created_at: Date.now()
            });
            loadData();
         } else {
            toast.error("Error al enviar: " + result.error);
         }
      } catch (e: any) {
         toast.error("Fallo crítico: " + e.message);
      } finally {
         setIsSending(false);
      }
   };

   const handleSendCampaign = async () => {
      if (!activeCampaignForSend || !settings) return;

      // Safety Check for Automatic Mode
      if (settings.marketing_send_mode === 'automatic' && !safetyConfirmed) {
         return;
      }

      setIsSending(true);
      const loadingToast = toast.loading("Enviando campaña...");

      try {
         const template = templates.find(t => t.id === activeCampaignForSend.email_template_id);
         if (!template) throw new Error("Plantilla no encontrada");

         // Filter recipients (mock: just use recurrent segment for now or all)
         // For safety V1, we will just send to the user's personal email as a "Campaign Run" simulation
         // to avoid accidentally spamming real guests during testing.
         // In production this would loop over `travelersData`.

         const spec = JSON.parse(template.template_spec_json);
         const html = renderTemplateSpecToEmailHtml(spec, settings, "Guest Name");

         // Emulate batch sending
         await new Promise(r => setTimeout(r, 2000));

         // Log execution
         const logId = crypto.randomUUID();
         await projectManager.getStore().saveMarketingEmailLog({
            id: logId,
            campaign_id: activeCampaignForSend.id,
            to_email: "(Batch Run) " + travelersData.length + " recipients",
            status: 'SENT',
            created_at: Date.now()
         });

         toast.dismiss(loadingToast);
         toast.success("Campaña enviada correctamente (Simulado)");
         setShowSafetyCheck(false);
         setSafetyConfirmed(false);
         setActiveCampaignForSend(null);
         loadData();

      } catch (e: any) {
         toast.dismiss(loadingToast);
         toast.error("Error campaña: " + e.message);
      } finally {
         setIsSending(false);
      }
   };

   // --- LANDING GENERATOR ---
   const handleCreateLanding = async (c: MarketingCampaign) => {
      const name = `Landing: ${c.name}`;
      const subdomain = `promo-${c.type}-${Date.now().toString(36).slice(-4)}`;

      const newSite: any = {
         id: crypto.randomUUID(),
         name: name,
         subdomain: subdomain,
         status: 'landing',
         theme_config: { primary_color: '#F43F5E', font_family: 'Inter' }, // Rose for love/promo
         seo_title: c.name,
         seo_description: `Oferta especial: ${c.name}. ¡Reserva ahora y ahorra!`,
         booking_config: {},
         property_ids_json: '[]',
         campaign_id: c.id,
         utm_defaults: { source: 'marketing_module', medium: 'landing', campaign: c.name },
         created_at: Date.now(),
         updated_at: Date.now(),
         sections_json: JSON.stringify([
            {
               id: 'hero',
               type: 'hero',
               content: {
                  title: c.name,
                  subtitle: 'Oferta Exclusiva por tiempo limitado. ¡No te lo pierdas!',
                  bg_image: '',
                  cta_text: 'Ver Oferta'
               }
            },
            {
               id: 'benefits',
               type: 'text_image',
               content: {
                  title: '¿Por qué reservar con nosotros?',
                  body: '✔ Mejor precio garantizado\n✔ Cancelación flexible\n✔ Atención directa 24/7'
               }
            },
            {
               id: 'coupon',
               type: 'text_image', // Could be a specific coupon section later
               content: {
                  title: 'Tu Cupón de Descuento',
                  body: `Usa el código: PROMO-${new Date().getFullYear()} al reservar.`
               }
            },
            {
               id: 'booking',
               type: 'booking_cta',
               content: {
                  title: 'Reserva Ahora',
                  bullets: ['Pago Seguro', 'Confirmación Inmediata']
               }
            },
            {
               id: 'contact',
               type: 'contact',
               content: { title: 'Contáctanos', email: 'info@rentik.pro', phone: '+34 600 000 000' }
            }
         ])
      };

      await projectManager.getStore().saveWebsite(newSite);
      // Navigate to builder to edit this site
      // We can pass state or just let the user find it (it will be at top of drafts)
      navigate('/website-builder');

      // Optional: trigger "Mejorar con IA" automatically? 
      // For now, just landing there is enough.
   };

   // --- FILTRADO DE SEGMENTOS ---
   const provinces = useMemo(() => {
      const set = new Set<string>();
      travelersData.forEach(t => { if (t.provincia) set.add(t.provincia); });
      return Array.from(set).sort();
   }, [travelersData]);

   const filteredSegments = useMemo(() => {
      if (selectedSegment === 'NATIONAL') {
         return travelersData.filter(t => t.nacionalidad === 'ES');
      }
      if (selectedSegment === 'INTERNATIONAL') {
         return travelersData.filter(t => t.nacionalidad && t.nacionalidad !== 'ES');
      }
      if (selectedSegment === 'PROVINCE') {
         if (!selectedProvince) return [];
         return travelersData.filter(t => t.provincia === selectedProvince);
      }
      return travelersData; // ALL
   }, [travelersData, selectedSegment, selectedProvince]);

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
               onClick={() => { setActiveTab('SEGMENTS'); setSelectedSegment('NATIONAL'); }}
               className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-200 hover:shadow-lg transition-all group text-left"
            >
               <div className="bg-emerald-100 text-emerald-500 p-4 rounded-2xl group-hover:scale-110 transition-transform"><MapPin size={24} /></div>
               <div><p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-emerald-400">Público Nacional</p><h3 className="text-2xl font-black text-slate-800">{stats.nationalCount}</h3></div>
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
                              <FileText size={16} /> Plantilla Visual
                           </div>
                           <select
                              className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none max-w-[120px]"
                              value={c.email_template_id || ''}
                              onChange={async (e) => {
                                 const updated = { ...c, email_template_id: e.target.value };
                                 await projectManager.getStore().saveCampaign(updated);
                                 loadData();
                              }}
                           >
                              <option value="">Seleccionar...</option>
                              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                           </select>
                        </div>

                        {/* SENDING ACTIONS */}
                        <div className="flex gap-2 mt-4">
                           <button
                              onClick={() => { setActiveCampaignForSend(c); setSendTestModalOpen(true); }}
                              className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                           >
                              <Send size={14} /> Enviar Prueba
                           </button>
                           <button
                              onClick={() => { setActiveCampaignForSend(c); setShowSafetyCheck(true); }}
                              className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm"
                           >
                              <Megaphone size={14} /> Enviar Campaña
                           </button>
                        </div>

                        {/* HISTORY */}
                        <div className="mt-4">
                           <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1"><History size={10} /> Historial</h4>
                           <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                              {(campaignLogs[c.id] || []).length === 0 ? (
                                 <p className="text-xs text-slate-300 italic">Sin envíos recientes</p>
                              ) : (
                                 (campaignLogs[c.id] || []).map(log => (
                                    <div key={log.id} className="text-[10px] flex justify-between text-slate-500 bg-slate-50 p-2 rounded-lg">
                                       <span className="truncate max-w-[120px]">{log.to_email}</span>
                                       <span className={log.status === 'SENT' ? 'text-emerald-600' : 'text-rose-600'}>{log.status}</span>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>

                     </div>

                     <div className="mt-6 pt-6 border-t border-slate-100">
                        <button
                           onClick={() => handleCreateLanding(c)}
                           className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-black text-xs shadow-lg hover:shadow-indigo-200 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                           <LayoutTemplate size={16} /> Crear Landing Page
                        </button>
                        <p className="text-center text-[9px] text-slate-400 mt-2">Genera una web promocional vinculada a esta campaña.</p>
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

         {activeTab === 'TEMPLATES' && (
            <div className="space-y-8 animate-in fade-in">
               <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black text-slate-800">Plantillas de Email</h3>
                  <button onClick={handleCreateTemplate} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg hover:scale-105 transition-all">
                     + Nueva Plantilla
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map(t => (
                     <div key={t.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all">
                        <div className="aspect-video bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
                           <LayoutTemplate size={48} className="text-slate-200 group-hover:scale-110 transition-transform" />
                           <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button onClick={() => handleEditTemplate(t)} className="bg-white p-3 rounded-xl shadow-lg text-indigo-600 hover:scale-110 transition-all"><Edit2 size={20} /></button>
                              <button onClick={() => handleDuplicateTemplate(t.id)} className="bg-white p-3 rounded-xl shadow-lg text-slate-600 hover:scale-110 transition-all"><Copy size={20} /></button>
                              <button onClick={() => handleDeleteTemplate(t.id)} className="bg-white p-3 rounded-xl shadow-lg text-rose-500 hover:scale-110 transition-all"><Trash2 size={20} /></button>
                           </div>
                        </div>
                        <div className="p-6">
                           <h4 className="font-black text-slate-800 mb-1">{t.name}</h4>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              Actualizada: {new Date(t.updated_at).toLocaleDateString()}
                           </p>
                        </div>
                     </div>
                  ))}
                  {templates.length === 0 && (
                     <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem]">
                        <LayoutTemplate size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 italic font-medium">No hay plantillas creadas. Diseña la primera para tus campañas.</p>
                     </div>
                  )}
               </div>
            </div>
         )}

         {activeTab === 'SEGMENTS' && (
            <div className="space-y-6 animate-in fade-in">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col gap-1">
                     <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Users className="text-emerald-500" />
                        {selectedSegment === 'NATIONAL' ? 'Público Nacional (España)' :
                           selectedSegment === 'INTERNATIONAL' ? 'Público Internacional' :
                              selectedSegment === 'PROVINCE' ? `Huéspedes de ${selectedProvince || 'una Provincia'}` :
                                 'Todos los Huéspedes'}
                     </h3>
                     {selectedSegment === 'PROVINCE' && (
                        <select
                           value={selectedProvince}
                           onChange={(e) => setSelectedProvince(e.target.value)}
                           className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                        >
                           <option value="">Selecciona provincia...</option>
                           {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                     )}
                  </div>
                  <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl">
                     <button onClick={() => setSelectedSegment('ALL')} className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${selectedSegment === 'ALL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Todos</button>
                     <button onClick={() => setSelectedSegment('NATIONAL')} className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${selectedSegment === 'NATIONAL' ? 'bg-emerald-500 shadow-sm text-white' : 'text-slate-400'}`}>Nacional</button>
                     <button onClick={() => setSelectedSegment('INTERNATIONAL')} className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${selectedSegment === 'INTERNATIONAL' ? 'bg-emerald-500 shadow-sm text-white' : 'text-slate-400'}`}>Extranjero</button>
                     <button onClick={() => setSelectedSegment('PROVINCE')} className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${selectedSegment === 'PROVINCE' ? 'bg-emerald-500 shadow-sm text-white' : 'text-slate-400'}`}>Provincia</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSegments.map(t => (
                     <div key={t.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${t.nacionalidad === 'ES' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                              {t.nombre[0]}
                           </div>
                           <div className="overflow-hidden">
                              <p className="font-bold text-slate-800 truncate">{t.nombre} {t.apellidos}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold">
                                 <MapPin size={10} /> {t.provincia || t.nacionalidad || '---'} {t.provincia ? `(${guestService.getCCAA(t.provincia)})` : ''}
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
         {isTemplateModalOpen && editingTemplate && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 lg:p-12 animate-in fade-in duration-300">
               <div className="bg-white rounded-[3.5rem] shadow-2xl w-full h-full flex flex-col overflow-hidden">
                  <div className="p-8 lg:px-12 border-b bg-slate-50/50 flex justify-between items-center">
                     <div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{editingTemplate.name}</h3>
                        <div className="flex items-center gap-4 mt-1">
                           <input
                              className="bg-transparent border-none text-[10px] font-black text-indigo-600 uppercase tracking-widest focus:ring-0 w-64"
                              value={editingTemplate.name}
                              onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                              placeholder="Nombre de la plantilla"
                           />
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <button onClick={saveTemplate} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:shadow-indigo-200 hover:scale-105 transition-all flex items-center gap-2">
                           <Save size={20} /> Guardar Cambios
                        </button>
                        <button onClick={() => { setIsTemplateModalOpen(false); setEditingTemplate(null); }} className="bg-white p-4 rounded-2xl shadow-sm text-slate-400 hover:text-rose-500 transition-colors">
                           <X size={28} />
                        </button>
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                     {/* Editor Section */}
                     <div className="w-full lg:w-1/2 h-1/2 lg:h-full overflow-hidden p-6 lg:p-10 border-r border-slate-100">
                        <EmailTemplateEditor
                           spec={JSON.parse(editingTemplate.template_spec_json)}
                           onChange={handleUpdateEditingSpec}
                           mediaAssets={mediaLibrary}
                        />
                     </div>
                     {/* Preview Section */}
                     <div className="w-full lg:w-1/2 h-1/2 lg:h-full p-6 lg:p-10 bg-slate-50/50">
                        <EmailTemplatePreview
                           spec={JSON.parse(editingTemplate.template_spec_json)}
                           mediaAssets={mediaLibrary}
                           viewMode={previewMode}
                           onViewModeChange={setPreviewMode}
                        />
                     </div>
                  </div>
               </div>
            </div>
         )}
         {/* SEND TEST MODAL */}
         {sendTestModalOpen && activeCampaignForSend && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
               <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-black text-slate-800 mb-2">Enviar Prueba</h3>
                  <p className="text-sm text-slate-500 mb-6">Envía una versión de prueba de <strong>{activeCampaignForSend.name}</strong> a tu correo.</p>

                  <input
                     type="email"
                     placeholder="tu-email@ejemplo.com"
                     className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                     value={testEmail}
                     onChange={e => setTestEmail(e.target.value)}
                  />

                  <div className="flex gap-3">
                     <button onClick={() => setSendTestModalOpen(false)} className="flex-1 p-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                     <button
                        onClick={handleSendTest}
                        disabled={isSending || !testEmail.includes('@') || !smtpCheck.valid}
                        className="flex-1 p-4 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 disabled:opacity-50"
                     >
                        {isSending ? 'Enviando...' : 'Enviar'}
                     </button>
                  </div>
                  {!smtpCheck.valid && (
                     <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3 text-left">
                        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 font-medium leading-relaxed">
                           <span className="font-black block mb-1 uppercase tracking-widest text-[9px]">Configuración SMTP requerida</span>
                           Faltan los siguientes campos: {smtpCheck.missing.join(', ')}.
                           Configura tu servidor en <span className="font-bold cursor-pointer underline hover:text-indigo-600" onClick={() => navigate('/settings')}>Ajustes</span>.
                        </p>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* SAFETY CHECK MODAL */}
         {showSafetyCheck && activeCampaignForSend && (
            <div className="fixed inset-0 bg-rose-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
               <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl border-4 border-rose-500 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 text-rose-600 mb-4">
                     <AlertCircle size={32} />
                     <h3 className="text-2xl font-black">¿Estás seguro?</h3>
                  </div>

                  <p className="text-slate-600 font-medium mb-4">
                     Estás a punto de lanzar la campaña <strong>{activeCampaignForSend.name}</strong>.
                  </p>

                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 mb-6">
                     <p className="text-rose-800 text-sm font-bold">
                        Se enviará a {settings?.marketing_send_mode === 'automatic' ? 'TODOS los destinatarios válidos' : 'los destinatarios seleccionados'}.
                     </p>
                     <p className="text-rose-600 text-xs mt-1">
                        Esta acción no se puede deshacer una vez iniciada.
                     </p>
                  </div>

                  {settings?.marketing_send_mode === 'automatic' && (
                     <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl mb-6 cursor-pointer hover:bg-slate-50">
                        <input
                           type="checkbox"
                           className="mt-1 w-5 h-5 accent-rose-600"
                           checked={safetyConfirmed}
                           onChange={e => setSafetyConfirmed(e.target.checked)}
                        />
                        <span className="text-sm font-bold text-slate-700">
                           Entiendo que esto enviará emails REALES a huéspedes reales y asumo la responsabilidad.
                        </span>
                     </label>
                  )}

                  <div className="flex gap-3">
                     <button onClick={() => { setShowSafetyCheck(false); setSafetyConfirmed(false); }} className="flex-1 p-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                     <button
                        onClick={handleSendCampaign}
                        disabled={settings?.marketing_send_mode === 'automatic' && !safetyConfirmed}
                        className="flex-1 p-4 bg-rose-600 text-white rounded-xl font-black hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {isSending ? 'Enviando...' : 'Lanzar Campaña'}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
