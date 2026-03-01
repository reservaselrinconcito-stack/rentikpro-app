import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

export const Navigation: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, styles }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Fallbacks
    const brandName = data.brandName || "RentikPro";
    const links = data.links || [
        { label: 'Inicio', href: '/' },
        { label: 'Alojamientos', href: '#apartments' },
        { label: 'Contacto', href: '#contact' }
    ];

    return (
        <nav className="absolute top-0 left-0 w-full z-50 bg-transparent text-white border-b border-white/10">
            <div className="container mx-auto px-6 h-24 flex items-center justify-between">

                {/* Logo */}
                <a href={links[0]?.href} className="text-2xl font-black tracking-widest uppercase drop-shadow-md">
                    {brandName}
                </a>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8 font-bold text-sm tracking-wide">
                    {links.map((link: any, idx: number) => (
                        <a key={idx} href={link.href} className="hover:text-indigo-300 transition-colors drop-shadow-sm">
                            {link.label}
                        </a>
                    ))}
                    <button className="bg-white/10 hover:bg-white text-white hover:text-slate-900 border border-white/20 px-6 py-2.5 rounded-full transition-all backdrop-blur-md">
                        Reservar
                    </button>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                >
                    {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileOpen && (
                <div className="md:hidden bg-slate-900/95 backdrop-blur-xl absolute top-full left-0 w-full shadow-2xl border-t border-white/10 animate-in slide-in-from-top-2">
                    <div className="flex flex-col px-6 py-8 gap-6 font-bold text-lg text-center">
                        {links.map((link: any, idx: number) => (
                            <a
                                key={idx}
                                href={link.href}
                                className="block hover:text-indigo-400 transition-colors"
                                onClick={() => setIsMobileOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};
