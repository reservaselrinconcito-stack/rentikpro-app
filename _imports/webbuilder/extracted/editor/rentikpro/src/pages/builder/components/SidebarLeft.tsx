/**
 * SidebarLeft.tsx — Biblioteca de bloques del editor.
 *
 * Añadidos sobre el original:
 *  ✓ Bloque AvailabilityCalendar en categoría "Contenido"
 *  ✓ Filtro de búsqueda
 *  ✓ Bloques bloqueados con icono escudo
 */
import React, { useState } from 'react';
import {
    Layout, Type, Image as ImageIcon, Share2, Square, Columns,
    MessageSquare, MapPin, PlusCircle, Calendar, Search, Shield, Star,
} from 'lucide-react';

interface BlockTemplate {
    type: string;
    label: string;
    icon: any;
    category: 'basic' | 'content' | 'media' | 'social';
    description: string;
    locked?: boolean;
}

const AVAILABLE_BLOCKS: BlockTemplate[] = [
    { type: 'Hero', label: 'Hero', icon: Layout, category: 'basic', description: 'Portada impactante con imagen y CTA' },
    { type: 'Navigation', label: 'Navegación', icon: Columns, category: 'basic', description: 'Menú superior y enlaces de sección' },
    { type: 'Features', label: 'Características', icon: Columns, category: 'basic', description: 'Lista de beneficios con iconos' },
    { type: 'Pricing', label: 'Tarifas', icon: Star, category: 'basic', description: 'Planes de precios y reserva' },
    { type: 'CTA', label: 'Llamada a Acción', icon: Layout, category: 'basic', description: 'Botón destacado para conversión' },
    { type: 'Location', label: 'Ubicación', icon: MapPin, category: 'basic', description: 'Dirección del alojamiento' },
    { type: 'Text', label: 'Texto', icon: Type, category: 'content', description: 'Bloque de texto libre' },
    { type: 'FAQ', label: 'FAQ', icon: MessageSquare, category: 'content', description: 'Preguntas frecuentes en acordeón' },
    { type: 'ApartmentsGrid', label: 'Apartamentos', icon: Square, category: 'content', description: 'Listado automático de unidades reales' },
    { type: 'AvailabilityCalendar', label: 'Disponibilidad', icon: Calendar, category: 'content', description: 'Calendario con fechas disponibles' },
    { type: 'ContactForm', label: 'Formulario', icon: MessageSquare, category: 'content', description: 'Captura de leads y consultas' },
    { type: 'Gallery', label: 'Galería', icon: ImageIcon, category: 'media', description: 'Cuadrícula de fotos del proyecto' },
    { type: 'Testimonials', label: 'Testimonios', icon: MessageSquare, category: 'social', description: 'Reseñas de clientes satisfechos' },
    { type: 'TrustBadges', label: 'Trust Badges', icon: Share2, category: 'social', description: 'Sellos de confianza y certificaciones' },
];

interface SidebarLeftProps {
    onAddBlock: (type: string) => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({ onAddBlock }) => {
    const [search, setSearch] = useState('');

    const categories = [
        { id: 'basic', label: 'Estructura' },
        { id: 'content', label: 'Contenido' },
        { id: 'media', label: 'Multimedia' },
        { id: 'social', label: 'Social' },
    ];

    const filtered = AVAILABLE_BLOCKS.filter(b =>
        !search || b.label.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-full z-40 shrink-0 select-none shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Biblioteca de Bloques</h2>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Buscar bloque…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-100 rounded-xl text-slate-700 placeholder-slate-300 outline-none focus:border-indigo-300 transition-colors"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                {categories.map(cat => {
                    const catBlocks = filtered.filter(b => b.category === cat.id);
                    if (catBlocks.length === 0) return null;
                    return (
                        <div key={cat.id}>
                            <h3 className="text-[11px] font-bold text-slate-400 mb-3 px-1">{cat.label}</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {catBlocks.map(block => (
                                    <button
                                        key={block.type}
                                        onClick={() => onAddBlock(block.type)}
                                        disabled={block.locked}
                                        className="group flex flex-col p-3 rounded-2xl border border-slate-100 bg-white hover:border-indigo-500 hover:shadow-md transition-all text-left relative overflow-hidden active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-slate-50 rounded-xl text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <block.icon size={18} />
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm group-hover:text-indigo-700 transition-colors">{block.label}</span>
                                            {block.locked && <Shield size={12} className="text-amber-400 ml-auto" />}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed pl-11">{block.description}</p>
                                        {!block.locked && (
                                            <PlusCircle size={14} className="absolute top-3 right-3 text-slate-200 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 bg-indigo-50 border-t border-indigo-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black tracking-tighter">PRO</div>
                    <div>
                        <p className="text-[10px] font-bold text-indigo-900 leading-tight">SaaS Premium</p>
                        <p className="text-[9px] text-indigo-500">Datos reales + publicación directa</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
