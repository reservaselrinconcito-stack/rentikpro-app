
import React from 'react';
import { X, ExternalLink, UploadCloud, CheckCircle, Globe } from 'lucide-react';
import { WebSite } from '../types';

interface ManualPublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    site: WebSite;
}

export const ManualPublishModal: React.FC<ManualPublishModalProps> = ({ isOpen, onClose, site }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <UploadCloud className="text-indigo-600" /> Publicar Web (Manual)
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
                </div>

                <div className="p-8 space-y-8">
                    <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-sm flex items-center gap-3">
                        <CheckCircle className="shrink-0" size={20} />
                        <div>
                            <strong>¡ZIP generado con éxito!</strong>
                            <p>El archivo <code>{site.subdomain}-website.zip</code> se ha descargado en tu ordenador.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700">Siguientes Pasos (Cloudflare Pages):</h3>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">1</div>
                            <div>
                                <h4 className="font-bold text-slate-800">Accede a Cloudflare</h4>
                                <p className="text-sm text-slate-500 mb-2">Entra en tu cuenta o crea una gratis.</p>
                                <a href="https://dash.cloudflare.com/?to=/:account/pages" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
                                    Ir al Dashboard <ExternalLink size={10} />
                                </a>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">2</div>
                            <div>
                                <h4 className="font-bold text-slate-800">Crear Proyecto</h4>
                                <p className="text-sm text-slate-500">
                                    Ve a <strong>Workers & Pages</strong> &rarr; <strong>Create Application</strong> &rarr; pestaña <strong>Pages</strong>.
                                    <br />Selecciona <strong>"Upload Assets"</strong> (Subir recursos).
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">3</div>
                            <div>
                                <h4 className="font-bold text-slate-800">Subir tu Web</h4>
                                <p className="text-sm text-slate-500">
                                    Dale un nombre al proyecto (ej: <code>{site.subdomain}</code>) y arrastra el contenido descomprimido (o el ZIP si lo admite) a la zona de carga.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">4</div>
                            <div>
                                <h4 className="font-bold text-slate-800">¡Listo!</h4>
                                <p className="text-sm text-slate-500">
                                    Tu web estará online en segundos en un subdominio <code>*.pages.dev</code>.
                                    Puedes conectar tu propio dominio después en "Custom Domains".
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors">
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};
