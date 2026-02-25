
import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Instagram, MessageCircle, Mail, Link as LinkIcon, FileText, Check } from 'lucide-react';
import { MarketingCampaign, WebSite } from '../types';
import JSZip from 'jszip';
import { copyToClipboard } from '../utils/clipboard';

interface CampaignContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: MarketingCampaign;
    linkedSite?: WebSite;
}

export const CampaignContentModal: React.FC<CampaignContentModalProps> = ({ isOpen, onClose, campaign, linkedSite }) => {
    const [activeTab, setActiveTab] = useState<'SOCIAL' | 'MESSAGING' | 'LINKS'>('SOCIAL');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!isOpen) return null;

    // Base URL: Use linked site subdomain or a placeholder
    const baseUrl = linkedSite
        ? `https://${linkedSite.subdomain}.pages.dev`
        : `https://tu-dominio.com`;

    // --- GENERATORS ---
    const generateCopies = () => {
        const cname = campaign.name;
        const type = campaign.type;

        return {
            insta_short: `¡${cname}! 🌟\n\nNo dejes pasar esta oportunidad única. Reserva ahora y disfruta de una experiencia inolvidable.\n\n👇 Link en bio\n#rentikpro #vacaciones #oferta`,
            insta_long: `✨ ${cname} ✨\n\n¿Buscas una escapada perfecta? Hemos preparado algo especial para ti.\n\nDisfruta de nuestros alojamientos con todas las comodidades y al mejor precio garantizado durante esta campaña.\n\n✅ Cancelación flexible\n✅ Mejor precio directo\n✅ Atención 24/7\n\n📅 ¡Solo por tiempo limitado!\n\n👉 Reserva aquí: ${baseUrl}?utm_source=instagram&utm_medium=social\n\n#viajes #alquiler #relax #promocion`,
            story: `Diapositiva 1: "¿Buscas plan?" (Foto bonita)\nDiapositiva 2: "¡${cname}!" (Texto grande)\nDiapositiva 3: "Haz click en el enlace 👇" (Sticker Link)`,
            whatsapp: `Hola! 👋\n\nQueríamos avisarte de nuestra nueva campaña: *${cname}*.\n\nSi estás pensando en una escapada, ahora es el mejor momento.\n\nEcha un vistazo aquí 👉 ${baseUrl}?utm_source=whatsapp&utm_medium=chat\n\n¡Te esperamos!`,
            email_subject: `🎁 Oferta Especial: ${cname}`,
            email_body: `Hola,\n\nEsperamos que estés genial.\n\nHemos lanzado "${cname}" y pensamos que te podría interesar.\n\nEs una oportunidad perfecta para disfrutar de unos días de descanso con nosotros.\n\nReserva directamente aquí para obtener el mejor precio:\n${baseUrl}?utm_source=email&utm_medium=newsletter\n\n¡Un saludo!`,
        };
    };

    const copies = generateCopies();

    const trackingLinks = [
        { channel: 'Instagram Bio', url: `${baseUrl}?utm_source=instagram&utm_medium=bio&utm_campaign=${campaign.id}` },
        { channel: 'Facebook Post', url: `${baseUrl}?utm_source=facebook&utm_medium=post&utm_campaign=${campaign.id}` },
        { channel: 'WhatsApp Status', url: `${baseUrl}?utm_source=whatsapp&utm_medium=status&utm_campaign=${campaign.id}` },
        { channel: 'Email Newsletter', url: `${baseUrl}?utm_source=email&utm_medium=newsletter&utm_campaign=${campaign.id}` },
    ];

    const handleCopy = (text: string, id: string) => {
        void copyToClipboard(text);
        setCopiedField(id);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleDownloadPack = async () => {
        const zip = new JSZip();

        // Text Copies
        const textContent = `
CAMPAÑA: ${campaign.name}
----------------------------------------

[INSTAGRAM SHORT]
${copies.insta_short}

----------------------------------------

[INSTAGRAM LONG]
${copies.insta_long}

----------------------------------------

[STORY GUIÓN]
${copies.story}

----------------------------------------

[WHATSAPP]
${copies.whatsapp}

----------------------------------------

[EMAIL]
Asunto: ${copies.email_subject}
Cuerpo:
${copies.email_body}
`;
        zip.file("textos_redes.txt", textContent);

        // Tracking Links CSV
        const csvContent = "Canal,URL\n" + trackingLinks.map(l => `${l.channel},${l.url}`).join("\n");
        zip.file("enlaces_tracking.csv", csvContent);

        // Generate
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pack_contenido_${campaign.name.replace(/\s+/g, '_').toLowerCase()}.zip`;
        a.click();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Pack de Contenidos</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase">{campaign.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
                </div>

                <div className="flex border-b border-slate-100 px-6 gap-6">
                    <button onClick={() => setActiveTab('SOCIAL')} className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'SOCIAL' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Redes Sociales</button>
                    <button onClick={() => setActiveTab('MESSAGING')} className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'MESSAGING' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Mensajería</button>
                    <button onClick={() => setActiveTab('LINKS')} className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'LINKS' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Enlaces & Tracking</button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">

                    {activeTab === 'SOCIAL' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 font-bold text-slate-700"><Instagram size={18} className="text-pink-500" /> Post (Corto)</h4>
                                <div className="relative group">
                                    <textarea readOnly className="w-full h-32 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 resize-none focus:outline-none" value={copies.insta_short}></textarea>
                                    <button onClick={() => handleCopy(copies.insta_short, 'insta_short')} className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600">
                                        {copiedField === 'insta_short' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 font-bold text-slate-700"><Instagram size={18} className="text-pink-500" /> Post (Largo)</h4>
                                <div className="relative group">
                                    <textarea readOnly className="w-full h-32 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 resize-none focus:outline-none" value={copies.insta_long}></textarea>
                                    <button onClick={() => handleCopy(copies.insta_long, 'insta_long')} className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600">
                                        {copiedField === 'insta_long' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div className="col-span-full space-y-4">
                                <h4 className="flex items-center gap-2 font-bold text-slate-700"><Instagram size={18} className="text-pink-500" /> Stories (Guión)</h4>
                                <div className="relative group">
                                    <textarea readOnly className="w-full h-24 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 resize-none focus:outline-none" value={copies.story}></textarea>
                                    <button onClick={() => handleCopy(copies.story, 'story')} className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600">
                                        {copiedField === 'story' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'MESSAGING' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 font-bold text-slate-700"><MessageCircle size={18} className="text-emerald-500" /> WhatsApp Broadcast</h4>
                                <div className="relative group">
                                    <textarea readOnly className="w-full h-40 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 resize-none focus:outline-none" value={copies.whatsapp}></textarea>
                                    <button onClick={() => handleCopy(copies.whatsapp, 'whatsapp')} className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600">
                                        {copiedField === 'whatsapp' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 font-bold text-slate-700"><Mail size={18} className="text-indigo-500" /> Email Marketing</h4>
                                <div className="relative group">
                                    <div className="space-y-2">
                                        <input readOnly className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 mb-2" value={copies.email_subject} />
                                        <textarea readOnly className="w-full h-28 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 resize-none focus:outline-none" value={copies.email_body}></textarea>
                                    </div>
                                    <button onClick={() => handleCopy(copies.email_body, 'email')} className="absolute bottom-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600">
                                        {copiedField === 'email' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'LINKS' && (
                        <div className="space-y-4">
                            {trackingLinks.map((link, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-indigo-200 transition-all">
                                    <div className="overflow-hidden flex-1 mr-4">
                                        <p className="text-[10px] uppercase font-black text-slate-400 mb-1">{link.channel}</p>
                                        <p className="text-xs font-mono text-slate-600 truncate">{link.url}</p>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(link.url, `link_${i}`)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${copiedField === `link_${i}` ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {copiedField === `link_${i}` ? <Check size={14} /> : <Copy size={14} />}
                                        Copy
                                    </button>
                                </div>
                            ))}
                            {!linkedSite && (
                                <div className="bg-amber-50 text-amber-600 p-4 rounded-xl text-xs flex items-center gap-2">
                                    <FileText size={16} />
                                    <span>Esta campaña no tiene una Landing Page vinculada aún. Los enlaces apuntan a tu dominio principal.</span>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end bg-white">
                    <button
                        onClick={handleDownloadPack}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg hover:bg-slate-800 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Download size={16} /> Descargar Pack Completo (.zip)
                    </button>
                </div>
            </div>
        </div>
    );
};
