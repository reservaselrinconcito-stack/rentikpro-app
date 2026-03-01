import React from 'react';
import { Mail, Phone, Instagram, Facebook } from 'lucide-react';

export const ContactFooter: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, styles, variant = 'A' }) => {
    // Ideally this comes from the SiteConfig 'brand' and 'contact' settings via global data context
    const brandName = data.brandName || "RentikPro";
    const email = data.email || "info@example.com";
    const phone = data.phone || "+34 600 000 000";
    const description = data.description || "Tu descanso es nuestra prioridad. Gestionamos propiedades únicas para experiencias inolvidables.";

    if (variant === 'B') {
        // Minimal Light Variant
        return (
            <footer className="bg-white border-t border-slate-100 py-12">
                <div className="container mx-auto px-6 text-center">
                    <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-widest">{brandName}</h3>
                    <p className="text-slate-500 font-medium max-w-lg mx-auto mb-8">{description}</p>

                    <div className="flex justify-center gap-6 mb-12">
                        <a href={`mailto:${email}`} className="text-slate-600 hover:text-indigo-600 font-bold transition-colors">{email}</a>
                        <a href={`tel:${phone}`} className="text-slate-600 hover:text-indigo-600 font-bold transition-colors">{phone}</a>
                    </div>

                    <div className="flex justify-center gap-4 mb-12">
                        <a href="#" className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm">
                            <Instagram size={20} />
                        </a>
                        <a href="#" className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm">
                            <Facebook size={20} />
                        </a>
                    </div>

                    <p className="text-slate-400 text-sm font-medium">&copy; {new Date().getFullYear()} {brandName}. Todos los derechos reservados.</p>
                </div>
            </footer>
        )
    }

    // Default Dark Variant A
    return (
        <footer className="bg-slate-900 text-slate-300 py-16">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand & Desc */}
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-widest">{brandName}</h3>
                        <p className="text-slate-400 font-medium leading-relaxed max-w-sm mb-8">
                            {description}
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors">
                                <Instagram size={18} />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors">
                                <Facebook size={18} />
                            </a>
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="text-white font-bold mb-6">Enlaces Rápidos</h4>
                        <ul className="space-y-4 font-medium">
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Inicio</a></li>
                            <li><a href="#apartments" className="hover:text-indigo-400 transition-colors">Alojamientos</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Servicios</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Términos y Condiciones</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white font-bold mb-6">Contacto</h4>
                        <ul className="space-y-4 font-medium">
                            <li className="flex items-center gap-3">
                                <Mail size={16} className="text-indigo-500" />
                                <a href={`mailto:${email}`} className="hover:text-indigo-400 transition-colors">{email}</a>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone size={16} className="text-indigo-500" />
                                <a href={`tel:${phone}`} className="hover:text-indigo-400 transition-colors">{phone}</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-800 text-sm md:flex justify-between items-center text-center">
                    <p>&copy; {new Date().getFullYear()} {brandName}. Todos los derechos reservados.</p>
                    <p className="mt-4 md:mt-0 text-slate-500 font-mono text-xs flex items-center justify-center md:justify-end gap-1">
                        Desarrollado con <span className="text-indigo-600 font-black">RentikPro</span>
                    </p>
                </div>
            </div>
        </footer>
    );
};
