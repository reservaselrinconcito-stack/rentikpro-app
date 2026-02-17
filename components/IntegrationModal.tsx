
import React, { useState } from 'react';
import { X, Copy, Check, Globe, Code, ExternalLink } from 'lucide-react';
import { WebSite } from '../types';

interface IntegrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    site: WebSite;
}

export const IntegrationModal: React.FC<IntegrationModalProps> = ({ isOpen, onClose, site }) => {
    const [customDomain, setCustomDomain] = useState('');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!isOpen) return null;

    const baseUrl = customDomain
        ? (customDomain.startsWith('http') ? customDomain : `https://${customDomain}`)
        : `https://${site.subdomain}.pages.dev`;

    const bookingUrl = `${baseUrl}/reservar.html`;

    const iframeSnippet = `<iframe src="${bookingUrl}" style="width:100%;height:900px;border:0;border-radius:8px;"></iframe>`;

    const buttonSnippet = `<a href="${bookingUrl}" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Reservar Ahora</a>`;

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Code className="text-indigo-600" /> Integrar Motor de Reservas
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">

                    {/* Domain Configuration */}
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <label className="text-xs font-black text-indigo-400 uppercase tracking-widest block mb-2">Dominio de la Web</label>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    className="w-full p-3 rounded-xl border border-indigo-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder={`Ej. ${site.subdomain}.pages.dev (Dejar vacío para usar este por defecto)`}
                                    value={customDomain}
                                    onChange={e => setCustomDomain(e.target.value)}
                                />
                                <p className="text-[10px] text-indigo-400 mt-1 pl-1">
                                    Si has conectado un dominio personalizado en Cloudflare, escríbelo aquí para actualizar los snippets.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Option A: Direct Link */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><ExternalLink size={16} /></div>
                            <h3 className="font-bold text-slate-700">A. Enlace Directo</h3>
                        </div>
                        <p className="text-xs text-slate-500">Úsalo en botones de redes sociales, emails o WhatsApp.</p>

                        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
                            <code className="flex-1 text-xs text-slate-600 font-mono px-2 truncate">{bookingUrl}</code>
                            <button
                                onClick={() => handleCopy(bookingUrl, 'url')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${copiedField === 'url' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm border border-slate-200'}`}
                            >
                                {copiedField === 'url' ? <Check size={14} /> : <Copy size={14} />}
                                {copiedField === 'url' ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100"></div>

                    {/* Option B: Iframe Embed */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Code size={16} /></div>
                            <h3 className="font-bold text-slate-700">B. Widget (Iframe)</h3>
                        </div>
                        <p className="text-xs text-slate-500">Copia y pega este código en tu Wordpress, Wix o Squarespace para incrustar el motor.</p>

                        <div className="relative group">
                            <pre className="bg-slate-900 text-indigo-100 p-4 rounded-xl text-[10px] font-mono overflow-x-auto border border-slate-800">
                                {iframeSnippet}
                            </pre>
                            <button
                                onClick={() => handleCopy(iframeSnippet, 'iframe')}
                                className={`absolute top-2 right-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${copiedField === 'iframe' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur'}`}
                            >
                                {copiedField === 'iframe' ? <Check size={12} /> : <Copy size={12} />}
                                {copiedField === 'iframe' ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    {/* Option C: Button Embed */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><Code size={16} /></div>
                            <h3 className="font-bold text-slate-700">C. Botón HTML</h3>
                        </div>
                        <p className="text-xs text-slate-500">Un botón listo para pegar en cualquier web HTML.</p>

                        <div className="relative group">
                            <pre className="bg-slate-900 text-rose-100 p-4 rounded-xl text-[10px] font-mono overflow-x-auto border border-slate-800">
                                {buttonSnippet}
                            </pre>
                            <button
                                onClick={() => handleCopy(buttonSnippet, 'btn')}
                                className={`absolute top-2 right-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${copiedField === 'btn' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur'}`}
                            >
                                {copiedField === 'btn' ? <Check size={12} /> : <Copy size={12} />}
                                {copiedField === 'btn' ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
