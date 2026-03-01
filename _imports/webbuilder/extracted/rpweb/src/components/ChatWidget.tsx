import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, User, Bot, AlertCircle, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { ChatEngine, ChatAction } from '../lib/chatEngine';
import { sendLead } from '../integrations/rentikpro/client';
import { useChat } from '../context/ChatContext';
import { useTranslation } from 'react-i18next';
import { useSiteConfig } from '../site-config/useSiteConfig';

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    actions?: ChatAction[];
}

type ChatViewState = 'CHAT' | 'FORM' | 'SUCCESS';

const QUICK_REPLIES = [
    { label: "Ver disponibilidad", query: "disponibilidad" },
    { label: "Cómo llegar", query: "como llegar" },
    { label: "Contactar", query: "contacto" }
];

export const ChatWidget: React.FC = () => {
    const { t } = useTranslation();
    const { isOpen, openChat, closeChat } = useChat();
    const siteConfig = useSiteConfig();
    const [viewState, setViewState] = useState<ChatViewState>('CHAT');

    // Guard: Prevent crash if config is not ready
    if (!siteConfig || !siteConfig.brand) return null;

    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            sender: 'bot',
            text: `Hola 👋 Soy el asistente de ${siteConfig.brand.shortName || siteConfig.brand.name}. ¿Te ayudo con disponibilidad, actividades o dudas?`
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        message: ''
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen, isTyping]);

    const processQuery = async (query: string) => {
        if (!query.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: query
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulate thinking delay
        setTimeout(() => {
            const response = ChatEngine.analyze(query, siteConfig);
            setIsTyping(false);

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: response.text,
                actions: response.actions
            }]);
        }, 600 + Math.random() * 500);
    };

    const handleSendMessage = () => processQuery(inputValue);

    const handleActionClick = (action: ChatAction) => {
        if (action.type === 'LINK') {
            navigate(action.payload);
            if (window.innerWidth < 768) closeChat();
        } else if (action.type === 'ACTION') {
            if (action.payload === 'OPEN_CONTACT') {
                const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user')?.text || '';
                setFormData(prev => ({ ...prev, message: lastUserMsg }));
                setViewState('FORM');
            }
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await sendLead({
            name: formData.name,
            email: formData.contact.includes('@') ? formData.contact : undefined,
            phone: !formData.contact.includes('@') ? formData.contact : undefined,
            message: formData.message,
            source: 'chat_bot_form'
        });

        if (success) {
            setViewState('SUCCESS');
            setTimeout(() => {
                setViewState('CHAT');
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    sender: 'bot',
                    text: '¡Mensaje enviado! Te responderemos lo antes posible.'
                }]);
            }, 3000);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={openChat}
                className="fixed bottom-6 right-6 z-[9999] bg-stone-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 group"
                aria-label="Chat"
            >
                <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-stone-50 animate-pulse"></span>
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-stone-900 text-xs font-bold px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                    {t('chat.ask_assistant', 'Preguntar al asistente')}
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-[9999] w-full md:w-96 h-[80vh] md:h-[600px] bg-white md:rounded-[2rem] shadow-2xl flex flex-col border border-stone-200 overflow-hidden font-sans animate-in slide-in-from-bottom-10 fade-in duration-300">

            {/* Header */}
            <div className="bg-stone-900 text-white p-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-full">
                        <Bot size={20} className="text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-bold font-serif text-lg leading-none">{t('chat.title', 'Asistente')}</h3>
                        <span className="text-[10px] uppercase font-black tracking-widest text-stone-400">Rinconcito Matarraña</span>
                    </div>
                </div>
                <button onClick={closeChat} className="text-white/50 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {viewState === 'CHAT' ? (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50 scroll-smooth">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-stone-900 text-white rounded-br-none' : 'bg-white text-stone-700 rounded-bl-none border border-stone-100'
                                    }`}>
                                    {msg.text}
                                    {msg.actions && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {msg.actions.map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleActionClick(action)}
                                                    className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors border border-orange-100 text-left"
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center border border-stone-100">
                                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Replies */}
                    {messages.length === 1 && (
                        <div className="px-6 py-2 bg-stone-50 flex flex-wrap gap-2 overflow-x-auto no-scrollbar shrink-0">
                            {QUICK_REPLIES.map((chip, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => processQuery(chip.query)}
                                    className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-white border border-stone-200 text-stone-500 rounded-full hover:border-orange-200 hover:text-orange-700 transition-all shadow-sm"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-stone-100 shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={t('chat.placeholder', 'Escribe tu pregunta...')}
                                className="w-full bg-stone-100 border-0 rounded-xl pl-4 pr-12 py-4 text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all outline-none"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-stone-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <p className="text-center text-[9px] text-stone-300 mt-3 font-bold uppercase tracking-widest">
                            {t('chat.powered', 'Gestionado con RentikPro')}
                        </p>
                    </div>
                </>
            ) : viewState === 'FORM' ? (
                <div className="flex-1 p-8 bg-stone-50 overflow-y-auto">
                    <button
                        onClick={() => setViewState('CHAT')}
                        className="text-xs font-bold text-stone-400 hover:text-stone-600 mb-6 flex items-center gap-1 uppercase tracking-widest"
                    >
                        <X size={14} /> {t('common.cancel', 'Cancelar')}
                    </button>
                    <h4 className="font-serif text-2xl text-stone-900 mb-2">Enviar consulta</h4>
                    <p className="text-sm text-stone-500 mb-8">Déjanos tus datos y te responderemos personalmente.</p>

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Nombre (opcional)</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                                placeholder="Tu nombre"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Email o Teléfono</label>
                            <input
                                required
                                type="text"
                                value={formData.contact}
                                onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                                placeholder="ejemplo@email.com o 600000000"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Mensaje</label>
                            <textarea
                                required
                                rows={3}
                                value={formData.message}
                                onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                                placeholder="¿En qué te podemos ayudar?"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-colors shadow-lg"
                        >
                            Enviar al equipo
                        </button>
                    </form>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-stone-50 text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h4 className="font-serif text-2xl text-stone-900 mb-2">¡Recibido!</h4>
                    <p className="text-sm text-stone-500">Hemos enviado tu consulta al equipo. Pronto nos pondremos en contacto contigo.</p>
                </div>
            )}
        </div>
    );
};
