
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { projectManager } from '../services/projectManager';
import { channelManager } from '../services/channelManager'; // Unified Manager
import { whatsAppService } from '../services/whatsappSync'; // Still need specific methods like getTemplates
import {
   Conversation, Message, Traveler, Property, MarketingTemplate, CommunicationChannel, CommunicationAccount, EmailConfig, WhatsAppConfig
} from '../types';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import {
   Search, Filter, Send, Paperclip, MessageCircle, Mail, MessageSquare,
   Check, CheckCheck, Clock, Archive, MoreVertical, ArrowLeft, Phone,
   FileText, Sparkles, X, ChevronDown, Plus, Settings, Trash2, Wifi, WifiOff, RefreshCw, Smartphone, Zap, AlertTriangle, AlertCircle, ShieldCheck,
   Wand2, Bot
} from 'lucide-react';

const formatTime = (ts: number) => {
   const date = new Date(ts);
   const now = new Date();
   if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
   }
   return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
};

const ChannelIcon = ({ channel, size = 16 }: { channel: string, size?: number }) => {
   switch (channel) {
      case 'WHATSAPP': return <MessageCircle size={size} className="text-emerald-500" />;
      case 'EMAIL': return <Mail size={size} className="text-blue-500" />;
      case 'SMS': return <MessageSquare size={size} className="text-indigo-500" />;
      default: return <Sparkles size={size} className="text-slate-400" />;
   }
};

export const Communications: React.FC = () => {
   const location = useLocation();
   // Data State
   const [conversations, setConversations] = useState<(Conversation & { traveler?: Traveler, property?: Property })[]>([]);
   const [selectedId, setSelectedId] = useState<string | null>(null);
   const [messages, setMessages] = useState<Message[]>([]);
   const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
   const [accounts, setAccounts] = useState<CommunicationAccount[]>([]);
   const [decryptedConfigs, setDecryptedConfigs] = useState<Record<string, any>>({});

   // UI State
   const [searchTerm, setSearchTerm] = useState('');
   const [filterStatus, setFilterStatus] = useState<'OPEN' | 'ARCHIVED' | 'ALL'>('OPEN');
   const [inputMessage, setInputMessage] = useState('');
   const [isTemplateOpen, setIsTemplateOpen] = useState(false);
   const [isSettingsOpen, setIsSettingsOpen] = useState(false);
   const [inputChannel, setInputChannel] = useState<CommunicationChannel>('EMAIL');
   const [isOnline, setIsOnline] = useState(navigator.onLine);

   // AI Assistant State
   const [isAiThinking, setIsAiThinking] = useState(false);
   const [aiSuggestions, setAiSuggestions] = useState<{ tone: string, text: string }[]>([]);

   // WhatsApp Specifics
   const [isWAModalOpen, setIsWAModalOpen] = useState(false);
   const [selectedWATemplate, setSelectedWATemplate] = useState<any>(null);
   const [waVariables, setWaVariables] = useState<string[]>([]);

   // Account Form
   const [newAccountType, setNewAccountType] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
   const [emailForm, setEmailForm] = useState<Partial<EmailConfig>>({ provider: 'GMAIL', email: '', imap_host: 'imap.gmail.com', smtp_host: 'smtp.gmail.com' });
   const [waForm, setWaForm] = useState<Partial<WhatsAppConfig>>({ phone_number_id: '', waba_id: '', access_token: '' });
   const [showAccountForm, setShowAccountForm] = useState(false);

   // Ref for scroll
   const messagesEndRef = useRef<HTMLDivElement>(null);

   // Init Service
   useEffect(() => {
      channelManager.startBackgroundSync();

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
         channelManager.stop();
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
      };
   }, []);

   const loadData = useCallback(async () => {
      const store = projectManager.getStore();
      try {
         const [convs, travs, props, accs] = await Promise.all([
            store.getConversations(filterStatus),
            store.getTravelers(),
            store.getProperties(),
            store.getAccounts()
         ]);

         const enriched = convs.map(c => ({
            ...c,
            traveler: travs.find(t => t.id === c.traveler_id),
            property: props.find(p => p.id === c.property_id)
         }));
         setConversations(enriched);
         setAccounts(accs);

         // Load config mapping for display (e.g. showing "Gmail" provider)
         // For security, we don't expose full passwords in this mapping usually, just metadata
         const decrypted = await channelManager.getDecryptedAccounts();
         const configMap: Record<string, any> = {};
         decrypted.forEach(d => configMap[d.account.id] = d.config);
         setDecryptedConfigs(configMap);

      } catch (e) { console.error(e); }
   }, [filterStatus]);

   const loadMessages = useCallback(async (convId: string) => {
      const msgs = await projectManager.getStore().getMessages(convId);
      setMessages(msgs);
      if (msgs.length > 0) {
         const last = msgs[msgs.length - 1];
         if (last.direction === 'INBOUND' || last.direction === 'OUTBOUND') {
            setInputChannel(last.channel);
         }
      }
   }, []);

   const loadTemplates = useCallback(async () => {
      setTemplates(await projectManager.getStore().getMarketingTemplates());
   }, []);

   useEffect(() => { loadData(); loadTemplates(); }, [loadData, loadTemplates]);
   useDataRefresh(loadData, ['all']);

   // --- DEEP LINKING HANDLER ---
   useEffect(() => {
      const handleDeepLink = async () => {
         const state = location.state as { travelerId?: string };
         const searchParams = new URLSearchParams(location.search);
         const searchId = searchParams.get('search');

         if (searchId) {
            setSelectedId(searchId);
            // Clean URL
            window.history.replaceState({}, document.title, location.pathname);
            return;
         }

         if (state?.travelerId) {
            const store = projectManager.getStore();
            let conv = await store.getConversationByTravelerId(state.travelerId);

            if (!conv) {
               const traveler = await store.getTravelerById(state.travelerId);
               if (traveler) {
                  const newConv: Conversation = {
                     id: crypto.randomUUID(),
                     traveler_id: traveler.id,
                     property_id: projectManager.getActivePropertyId(), // Block 11-D
                     subject: `Chat con ${traveler.nombre}`,
                     status: 'OPEN',
                     last_message_at: Date.now(),
                     last_message_preview: 'Conversación iniciada',
                     unread_count: 0,
                     tags_json: '[]',
                     created_at: Date.now(),
                     updated_at: Date.now(),
                     last_message_direction: 'OUTBOUND'
                  };
                  await store.saveConversation(newConv);
                  conv = newConv;
                  await loadData();
               }
            }

            if (conv) {
               setSelectedId(conv.id);
               window.history.replaceState({}, document.title);
            }
         }
      };
      handleDeepLink();
   }, [location.state, loadData]);

   useEffect(() => {
      if (selectedId) {
         loadMessages(selectedId);
         setAiSuggestions([]); // Clear AI on switch
      }
   }, [selectedId, loadMessages]);

   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [messages]);

   // --- HELPERS ---

   const is24hWindowOpen = (conv: Conversation | undefined) => {
      if (!conv) return false;
      if (conv.last_message_direction !== 'INBOUND') return false;
      const diff = Date.now() - conv.last_message_at;
      const hours = diff / (1000 * 60 * 60);
      return hours < 24;
   };

   const handleRetryMessage = async (msg: Message) => {
      const store = projectManager.getStore();
      msg.status = 'PENDING';
      msg.retry_count = 0;
      msg.error_message = undefined;
      await store.saveMessage(msg);
      notifyDataChanged();
      if (isOnline) channelManager.forceProcess();
   };

   const handleSendMessage = async () => {
      if (!selectedId) return;
      if (!inputMessage.trim() && inputChannel !== 'WHATSAPP') return;

      const accountId = accounts.find(a => a.type === inputChannel)?.id || 'default';
      const conv = conversations.find(c => c.id === selectedId);

      if (inputChannel === 'WHATSAPP' && !is24hWindowOpen(conv) && !selectedWATemplate) {
         alert("Ventana de 24h cerrada. Debes usar una plantilla de WhatsApp.");
         setIsWAModalOpen(true);
         return;
      }

      const newMessage: Message = {
         id: crypto.randomUUID(),
         conversation_id: selectedId,
         account_id: accountId,
         direction: 'OUTBOUND',
         channel: inputChannel,
         status: 'PENDING',
         body: inputMessage,
         content_type: selectedWATemplate ? 'template' : 'text/plain',
         metadata_json: selectedWATemplate ? JSON.stringify({
            name: selectedWATemplate.name,
            language: selectedWATemplate.language,
            components: [
               {
                  type: 'body',
                  parameters: waVariables.map(v => ({ type: 'text', text: v }))
               }
            ]
         }) : undefined,
         created_at: Date.now(),
         retry_count: 0
      };

      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
      setSelectedWATemplate(null);
      setWaVariables([]);
      setAiSuggestions([]); // Clean AI suggestions on send

      await projectManager.getStore().saveMessage(newMessage);

      if (conv) {
         await projectManager.getStore().saveConversation({
            ...conv,
            last_message_at: Date.now(),
            last_message_preview: newMessage.body.substring(0, 50),
            last_message_direction: 'OUTBOUND',
            status: 'OPEN'
         });
         loadData();
      }

      if (isOnline) channelManager.forceProcess();
   };

   // --- AI ASSISTANT LOGIC (MOCK) ---
   const triggerAiAssistant = async () => {
      if (isAiThinking || !selectedId) return;
      setIsAiThinking(true);
      setAiSuggestions([]);

      // Get context from last message
      const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
      const contextText = lastMsg?.body.toLowerCase() || '';
      const travelerName = selectedConv?.traveler?.nombre || 'Huésped';

      // Simulate Network/Processing Delay
      setTimeout(() => {
         let suggestions = [];

         // Simple keyword matching for demo
         if (contextText.includes('wifi') || contextText.includes('internet') || contextText.includes('clave')) {
            suggestions = [
               { tone: 'Directo', text: `Hola ${travelerName}, la red es "RentikGuest" y la clave: "Wifi2024".` },
               { tone: 'Formal', text: `Estimado/a ${travelerName}, le informo que la clave del WiFi es "Wifi2024". ¿Necesita algo más?` }
            ];
         } else if (contextText.includes('llegada') || contextText.includes('check-in') || contextText.includes('hora') || contextText.includes('entrar')) {
            suggestions = [
               { tone: 'Estándar', text: `La hora de entrada es a partir de las 15:00. Las llaves están en la caja de seguridad.` },
               { tone: 'Amigable', text: `¡Hola! Podéis entrar cuando queráis a partir de las 15:00. ¡Buen viaje!` }
            ];
         } else if (contextText.includes('gracias')) {
            suggestions = [
               { tone: 'Cortés', text: `¡A vosotros! Disfrutad de la estancia.` },
               { tone: 'Cierre', text: `Gracias a ti. Quedo a tu disposición para cualquier cosa.` }
            ];
         } else {
            // Generic fallback
            suggestions = [
               { tone: 'Saludo', text: `Hola ${travelerName}, ¿en qué puedo ayudarte hoy?` },
               { tone: 'Confirmación', text: `Recibido, lo reviso y te digo algo en unos minutos.` }
            ];
         }

         setAiSuggestions(suggestions);
         setIsAiThinking(false);
      }, 1200);
   };

   const insertAiSuggestion = (text: string) => {
      setInputMessage(text);
      setAiSuggestions([]);
   };

   // ... (Rest of existing helper functions: createDummyConversation, handleSaveAccount, etc.)
   const createDummyConversation = async () => {
      const store = projectManager.getStore();
      const travelers = await store.getTravelers();
      if (travelers.length === 0) return alert("Crea un viajero primero");

      const convId = crypto.randomUUID();
      const c: Conversation = {
         id: convId,
         traveler_id: travelers[0].id,
         property_id: projectManager.getActivePropertyId(), // Block 11-D
         subject: 'Nueva consulta',
         status: 'OPEN',
         last_message_at: Date.now(),
         last_message_preview: 'Hola, me interesa el apartamento...',
         unread_count: 1,
         tags_json: '[]',
         created_at: Date.now(),
         updated_at: Date.now(),
         last_message_direction: 'INBOUND'
      };
      await store.saveConversation(c);
      loadData();
      setSelectedId(convId);
   };

   const handleSaveAccount = async () => {
      if (newAccountType === 'EMAIL' && (!emailForm.email || !emailForm.imap_host)) return;
      if (newAccountType === 'WHATSAPP' && (!waForm.phone_number_id)) return;

      const acc: CommunicationAccount = {
         id: crypto.randomUUID(),
         name: newAccountType === 'EMAIL' ? emailForm.email! : `WhatsApp Business (${waForm.phone_number_id?.slice(-4)})`,
         type: newAccountType,
         property_id: null,
         is_active: true,
         config_json: '', // Filled by manager
         created_at: Date.now()
      };

      // Prepare Raw Config
      const rawConfig = newAccountType === 'EMAIL' ? { ...emailForm } : { ...waForm };

      // Use ChannelManager to encrypt and save
      await channelManager.saveAccount(acc, rawConfig);

      setEmailForm({ provider: 'GMAIL', email: '', imap_host: '', smtp_host: '' });
      setWaForm({ phone_number_id: '', waba_id: '', access_token: '' });
      setShowAccountForm(false);
      loadData();
   };

   const handleDeleteAccount = async (id: string) => {
      if (confirm("¿Eliminar cuenta?")) {
         await projectManager.getStore().deleteAccount(id);
         loadData();
      }
   };

   const filteredConversations = conversations.filter(c =>
      c.traveler?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.traveler?.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject?.toLowerCase().includes(searchTerm.toLowerCase())
   );

   const selectedConv = conversations.find(c => c.id === selectedId);
   const window24h = is24hWindowOpen(selectedConv);

   return (
      <div className="flex h-[calc(100vh-2rem)] md:h-full bg-slate-100 md:bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 md:border-none relative">

         {/* SETTINGS MODAL */}
         {isSettingsOpen && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur flex flex-col animate-in fade-in">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                  <h3 className="text-xl font-black text-slate-800">Cuentas Conectadas</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full space-y-8">
                  {/* Account List */}
                  <div className="space-y-4">
                     {accounts.map(acc => {
                        const decrypted = decryptedConfigs[acc.id] || {};
                        return (
                           <div key={acc.id} className="p-4 border rounded-2xl flex justify-between items-center bg-white shadow-sm">
                              <div className="flex items-center gap-3">
                                 <div className={`p-3 rounded-xl ${acc.type === 'WHATSAPP' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {acc.type === 'WHATSAPP' ? <MessageCircle size={20} /> : <Mail size={20} />}
                                 </div>
                                 <div>
                                    <p className="font-bold text-slate-800">{acc.name}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                       {acc.type} • {acc.type === 'EMAIL' ? decrypted.provider : 'Meta Graph API'}
                                       <span className="bg-emerald-100 text-emerald-700 px-1 rounded flex items-center gap-0.5" title="Conexión Segura"><ShieldCheck size={10} /></span>
                                    </p>
                                 </div>
                              </div>
                              <button onClick={() => handleDeleteAccount(acc.id)} className="text-rose-400 hover:text-rose-600 p-2"><Trash2 size={18} /></button>
                           </div>
                        );
                     })}
                     {accounts.length === 0 && <p className="text-center text-slate-400 italic">No hay cuentas configuradas.</p>}
                  </div>

                  {/* Add New Form */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-black text-slate-700">Añadir Canal</h4>
                        {!showAccountForm && <button onClick={() => setShowAccountForm(true)} className="bg-indigo-600 text-white p-2 rounded-full"><Plus size={16} /></button>}
                     </div>

                     {showAccountForm && (
                        <div className="space-y-4 animate-in slide-in-from-top-2">
                           <div className="flex bg-slate-200 p-1 rounded-xl mb-4">
                              <button onClick={() => setNewAccountType('EMAIL')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${newAccountType === 'EMAIL' ? 'bg-white shadow' : 'text-slate-500'}`}>Email (IMAP)</button>
                              <button onClick={() => setNewAccountType('WHATSAPP')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${newAccountType === 'WHATSAPP' ? 'bg-white shadow' : 'text-slate-500'}`}>WhatsApp API</button>
                           </div>

                           {newAccountType === 'EMAIL' ? (
                              <>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="text-[10px] font-black uppercase text-slate-400">Proveedor</label>
                                       <select className="w-full p-3 bg-white border rounded-xl font-bold" value={emailForm.provider} onChange={e => setEmailForm({ ...emailForm, provider: e.target.value as any })}>
                                          <option value="GMAIL">Gmail</option>
                                          <option value="OUTLOOK">Outlook</option>
                                          <option value="CUSTOM">Otro (IMAP/SMTP)</option>
                                       </select>
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black uppercase text-slate-400">Email</label>
                                       <input className="w-full p-3 bg-white border rounded-xl font-bold" placeholder="usuario@email.com" value={emailForm.email} onChange={e => setEmailForm({ ...emailForm, email: e.target.value })} />
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="text-[10px] font-black uppercase text-slate-400">IMAP Host</label>
                                       <input className="w-full p-3 bg-white border rounded-xl" value={emailForm.imap_host} onChange={e => setEmailForm({ ...emailForm, imap_host: e.target.value })} />
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black uppercase text-slate-400">SMTP Host</label>
                                       <input className="w-full p-3 bg-white border rounded-xl" value={emailForm.smtp_host} onChange={e => setEmailForm({ ...emailForm, smtp_host: e.target.value })} />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400">Contraseña (App Password)</label>
                                    <input type="password" className="w-full p-3 bg-white border rounded-xl" placeholder="••••••••" onChange={e => setEmailForm({ ...emailForm, encrypted_password: e.target.value })} />
                                    <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1"><ShieldCheck size={10} /> Se cifrará antes de guardar.</p>
                                 </div>
                              </>
                           ) : (
                              <>
                                 <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 mb-2">
                                    Requiere una cuenta configurada en <strong>Facebook Developers</strong> (WhatsApp Business API).
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400">Phone Number ID</label>
                                    <input className="w-full p-3 bg-white border rounded-xl font-mono" placeholder="100000000000000" value={waForm.phone_number_id} onChange={e => setWaForm({ ...waForm, phone_number_id: e.target.value })} />
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400">WhatsApp Business Account ID</label>
                                    <input className="w-full p-3 bg-white border rounded-xl font-mono" placeholder="200000000000000" value={waForm.waba_id} onChange={e => setWaForm({ ...waForm, waba_id: e.target.value })} />
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400">System User Access Token</label>
                                    <input type="password" className="w-full p-3 bg-white border rounded-xl font-mono" placeholder="EAAG..." value={waForm.access_token} onChange={e => setWaForm({ ...waForm, access_token: e.target.value })} />
                                    <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1"><ShieldCheck size={10} /> Se cifrará antes de guardar.</p>
                                 </div>
                              </>
                           )}

                           <div className="flex justify-end gap-2 pt-2">
                              <button onClick={() => setShowAccountForm(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                              <button onClick={handleSaveAccount} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black shadow-lg">Guardar Cuenta</button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* WHATSAPP TEMPLATE MODAL */}
         {isWAModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
               <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
                  <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                     <h3 className="text-lg font-black text-emerald-800 flex items-center gap-2"><MessageCircle size={20} /> Iniciar Chat 24h</h3>
                     <button onClick={() => setIsWAModalOpen(false)}><X size={20} className="text-emerald-600" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                     <p className="text-xs text-slate-500">
                        La ventana de 24 horas está cerrada. Para iniciar la conversación, debes enviar una <strong>Plantilla Aprobada</strong> por Meta.
                     </p>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">Seleccionar Plantilla</label>
                        <select
                           className="w-full p-3 bg-slate-50 border rounded-xl font-bold mt-1"
                           onChange={e => {
                              const tmpl = whatsAppService.getTemplates().find(t => t.name === e.target.value);
                              setSelectedWATemplate(tmpl);
                              const count = (tmpl?.components[0]?.text.match(/{{/g) || []).length;
                              setWaVariables(new Array(count).fill(''));
                           }}
                        >
                           <option value="">Seleccionar...</option>
                           {whatsAppService.getTemplates().map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        </select>
                     </div>

                     {selectedWATemplate && (
                        <div className="space-y-2">
                           <p className="text-xs font-medium text-slate-600 bg-slate-100 p-3 rounded-lg border border-slate-200 italic">
                              "{selectedWATemplate.components[0].text}"
                           </p>
                           {waVariables.map((_, i) => (
                              <input
                                 key={i}
                                 placeholder={`Variable {{${i + 1}}}`}
                                 className="w-full p-2 border rounded-lg text-sm"
                                 value={waVariables[i]}
                                 onChange={e => {
                                    const newVars = [...waVariables];
                                    newVars[i] = e.target.value;
                                    setWaVariables(newVars);
                                 }}
                              />
                           ))}
                        </div>
                     )}

                     <button
                        onClick={() => {
                           const body = selectedWATemplate.components[0].text.replace(/{{(\d+)}}/g, (_: any, i: any) => waVariables[parseInt(i) - 1] || `{{${i}}}`);
                           setInputMessage(body);
                           handleSendMessage();
                           setIsWAModalOpen(false);
                        }}
                        disabled={!selectedWATemplate}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-all"
                     >
                        Enviar Plantilla
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* --- LISTA DE CONVERSACIONES (SIDEBAR) --- */}
         <div className={`w-full md:w-96 bg-white border-r border-slate-200 flex flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}>
            {/* Header Lista */}
            <div className="p-4 border-b border-slate-100 space-y-4">
               <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Buzón</h2>
                  <div className="flex gap-2">
                     <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors" title="Configurar Cuentas"><Settings size={16} /></button>
                     <button onClick={createDummyConversation} className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors" title="Nuevo Chat"><FileText size={16} /></button>
                  </div>
               </div>

               <div className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-lg ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {isOnline ? 'Online - Sincronizando' : 'Modo Offline - Cola Activa'}
               </div>

               {/* Search */}
               <div className="relative group">
                  <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input
                     type="text"
                     placeholder="Buscar..."
                     className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>

               {/* Filtros Rápidos */}
               <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  <button onClick={() => setFilterStatus('OPEN')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${filterStatus === 'OPEN' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Abiertos</button>
                  <button onClick={() => setFilterStatus('ARCHIVED')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${filterStatus === 'ARCHIVED' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Archivados</button>
                  <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Todos</button>
               </div>
            </div>

            {/* Lista Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
               {filteredConversations.map(c => (
                  <div
                     key={c.id}
                     onClick={() => setSelectedId(c.id)}
                     className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors relative ${selectedId === c.id ? 'bg-indigo-50/50 border-indigo-100' : ''}`}
                  >
                     {c.unread_count > 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"></div>}

                     <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                           <h3 className={`text-sm truncate ${c.unread_count > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                              {c.traveler?.nombre ? `${c.traveler.nombre} ${c.traveler.apellidos}` : c.subject}
                           </h3>
                           {c.property && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black uppercase rounded">{c.property.name.slice(0, 10)}...</span>}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">{formatTime(c.last_message_at)}</span>
                     </div>

                     <div className="flex justify-between items-end">
                        <p className={`text-xs line-clamp-2 pr-4 ${c.unread_count > 0 ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                           {c.last_message_preview}
                        </p>
                        <div className="shrink-0 opacity-50">
                           <MessageSquare size={14} className="text-slate-400" />
                        </div>
                     </div>
                  </div>
               ))}

               {filteredConversations.length === 0 && (
                  <div className="p-8 text-center text-slate-400 italic text-sm">
                     No hay conversaciones.
                  </div>
               )}
            </div>
         </div>

         {/* --- VISTA DE CHAT (MAIN) --- */}
         <div className={`flex-1 flex flex-col bg-slate-50 md:bg-white relative ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
            {!selectedId ? (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-300 select-none">
                  <MessageSquare size={64} className="mb-4 text-slate-200" />
                  <p className="font-black text-lg">Selecciona una conversación</p>
               </div>
            ) : (
               <>
                  {/* Chat Header */}
                  <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                     <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedId(null)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
                           <ArrowLeft size={20} />
                        </button>
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-black shadow-lg shadow-indigo-200">
                           {selectedConv?.traveler?.nombre?.[0] || 'U'}
                        </div>
                        <div>
                           <h3 className="font-black text-slate-800 leading-tight">
                              {selectedConv?.traveler?.nombre ? `${selectedConv.traveler.nombre} ${selectedConv.traveler.apellidos}` : selectedConv?.subject}
                           </h3>
                           <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1"><Mail size={10} /> {selectedConv?.traveler?.email || '-'}</span>
                              {selectedConv?.traveler?.telefono && <span className="flex items-center gap-1"><Phone size={10} /> {selectedConv?.traveler?.telefono}</span>}
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-2 items-center">
                        {inputChannel === 'WHATSAPP' && (
                           <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 ${window24h ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {window24h ? <Zap size={10} /> : <AlertTriangle size={10} />}
                              {window24h ? 'Sesión Activa' : '24h Cerrada'}
                           </span>
                        )}
                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Archivar">
                           <Archive size={18} />
                        </button>
                     </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
                     {messages.map((msg, i) => {
                        const isMe = msg.direction === 'OUTBOUND';
                        const showAvatar = !isMe && (i === 0 || messages[i - 1].direction === 'OUTBOUND');

                        return (
                           <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} group`}>
                              {!isMe && (
                                 <div className={`w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                    {selectedConv?.traveler?.nombre?.[0] || 'U'}
                                 </div>
                              )}

                              <div className="max-w-[85%] md:max-w-[70%]">
                                 {/* Bubble */}
                                 <div className={`
                          px-4 pt-3 pb-2 text-sm leading-relaxed shadow-sm relative
                          ${isMe
                                       ? `${msg.channel === 'WHATSAPP' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white rounded-t-2xl rounded-bl-2xl rounded-br-md`
                                       : 'bg-white text-slate-800 border border-slate-200 rounded-t-2xl rounded-br-2xl rounded-bl-md'
                                    }
                          ${msg.status === 'FAILED' ? 'border-red-500 border-2' : ''}
                       `}>
                                    {/* Channel Badge for Inbound */}
                                    {!isMe && (
                                       <div className="absolute -top-2 -left-2 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                                          <ChannelIcon channel={msg.channel} size={12} />
                                       </div>
                                    )}

                                    <div className="whitespace-pre-wrap">{msg.body}</div>

                                    {/* Metadata Inside Bubble */}
                                    <div className="flex items-center justify-end gap-1.5 text-[10px] mt-2 -mr-1">
                                       <span className={`${isMe ? 'text-white/70' : 'text-slate-400'}`}>{formatTime(msg.created_at)}</span>
                                       {isMe && (
                                          <span className={`${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                                             {msg.status === 'READ' ? <CheckCheck size={14} className="text-blue-400" /> :
                                                msg.status === 'DELIVERED' ? <CheckCheck size={14} /> :
                                                   msg.status === 'SENT' ? <Check size={14} /> :
                                                      msg.status === 'PENDING' ? <Clock size={14} className="text-amber-400/70" /> :
                                                         msg.status === 'FAILED' ? <AlertCircle size={14} className="text-rose-400/70" /> : null}
                                          </span>
                                       )}
                                    </div>
                                 </div>

                                 {/* Error and Retry outside */}
                                 {msg.status === 'FAILED' && (
                                    <div className={`mt-1.5 flex items-center gap-2 text-[10px] ${isMe ? 'justify-end' : `justify-start`}`}>
                                       <span className="text-red-500 font-medium">{msg.error_message}</span>
                                       <button onClick={() => handleRetryMessage(msg)} className="text-blue-500 font-bold hover:underline">Reintentar</button>
                                    </div>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                     <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="bg-white border-t border-slate-200 relative">
                     {/* AI Suggestions Panel */}
                     {(aiSuggestions.length > 0) && (
                        <div className="absolute bottom-full left-0 right-0 p-4 bg-slate-50/90 backdrop-blur-md border-t border-slate-200 shadow-xl z-20 flex flex-col gap-2 rounded-t-3xl animate-in slide-in-from-bottom-4">
                           <div className="flex justify-between items-center mb-1 px-1">
                              <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
                                 <Bot size={14} /> Sugerencias IA
                              </div>
                              <button onClick={() => setAiSuggestions([])} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                           </div>
                           <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                              {aiSuggestions.map((s, idx) => (
                                 <button
                                    key={idx}
                                    onClick={() => insertAiSuggestion(s.text)}
                                    className="flex-shrink-0 w-64 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-left hover:border-indigo-300 hover:shadow-md transition-all group"
                                 >
                                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 block group-hover:text-indigo-500">{s.tone}</span>
                                    <p className="text-xs text-slate-700 line-clamp-3">{s.text}</p>
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}

                     <div className="p-4">
                        {/* Toolbar */}
                        <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar">
                           <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
                              <button onClick={() => setInputChannel('EMAIL')} className={`p-1.5 rounded-md transition-all ${inputChannel === 'EMAIL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Mail size={16} /></button>
                              <button onClick={() => setInputChannel('WHATSAPP')} className={`p-1.5 rounded-md transition-all ${inputChannel === 'WHATSAPP' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}><MessageCircle size={16} /></button>
                              <button onClick={() => setInputChannel('SMS')} className={`p-1.5 rounded-md transition-all ${inputChannel === 'SMS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><MessageSquare size={16} /></button>
                           </div>
                           <div className="w-px h-6 bg-slate-200 mx-1"></div>

                           {/* AI Magic Wand */}
                           <button
                              onClick={triggerAiAssistant}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${isAiThinking ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                              disabled={isAiThinking}
                           >
                              <Wand2 size={14} className={isAiThinking ? 'animate-spin' : ''} /> {isAiThinking ? 'Pensando...' : 'Asistente'}
                           </button>

                           <button
                              onClick={() => setIsTemplateOpen(!isTemplateOpen)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase hover:bg-slate-200 transition-colors whitespace-nowrap"
                           >
                              <Sparkles size={14} /> Plantillas
                           </button>
                           {inputChannel === 'WHATSAPP' && !window24h && (
                              <button onClick={() => setIsWAModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100 transition-colors whitespace-nowrap animate-pulse">
                                 <Zap size={14} /> Reabrir 24h
                              </button>
                           )}
                        </div>

                        {/* Standard Templates Popover */}
                        {isTemplateOpen && (
                           <div className="absolute bottom-20 left-4 right-4 md:left-auto md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-20 animate-in slide-in-from-bottom-2">
                              <div className="flex justify-between items-center px-3 py-2 border-b border-slate-50 mb-1">
                                 <span className="text-xs font-black text-slate-400 uppercase">Plantillas Guardadas</span>
                                 <button onClick={() => setIsTemplateOpen(false)}><X size={14} className="text-slate-400" /></button>
                              </div>
                              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                 {templates.map(t => (
                                    <button
                                       key={t.id}
                                       onClick={() => { setInputMessage(t.body); setIsTemplateOpen(false); }}
                                       className="w-full text-left p-2 hover:bg-slate-50 rounded-xl text-xs"
                                    >
                                       <p className="font-bold text-slate-700">{t.name}</p>
                                       <p className="text-slate-400 truncate">{t.subject}</p>
                                    </button>
                                 ))}
                                 {templates.length === 0 && <p className="p-4 text-center text-xs text-slate-400 italic">No hay plantillas creadas en Marketing.</p>}
                              </div>
                           </div>
                        )}

                        {/* Text Input */}
                        <div className={`flex items-end gap-2 bg-slate-50 p-2 rounded-[1.5rem] border transition-all ${inputChannel === 'WHATSAPP' && !window24h ? 'border-rose-200 bg-rose-50 opacity-80' : 'border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300'}`}>
                           <button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors"><Paperclip size={20} /></button>
                           <textarea
                              value={inputMessage}
                              onChange={e => setInputMessage(e.target.value)}
                              placeholder={inputChannel === 'WHATSAPP' && !window24h ? "Ventana 24h cerrada. Usa una plantilla." : `Escribir mensaje por ${inputChannel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}...`}
                              className="flex-1 bg-transparent border-none outline-none text-sm font-medium py-3 max-h-32 resize-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                              rows={1}
                              disabled={inputChannel === 'WHATSAPP' && !window24h}
                              onKeyDown={e => {
                                 if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                 }
                              }}
                           />
                           <button
                              onClick={handleSendMessage}
                              disabled={(!inputMessage.trim() && !(inputChannel === 'WHATSAPP' && !window24h))}
                              className={`p-3 text-white rounded-full shadow-md transition-all ${inputChannel === 'WHATSAPP' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} disabled:opacity-50 disabled:hover:bg-indigo-600`}
                           >
                              <Send size={18} className={inputMessage.trim() ? 'translate-x-0.5' : ''} />
                           </button>
                        </div>
                     </div>
                  </div>
               </>
            )}
         </div>
      </div>
   );
};
