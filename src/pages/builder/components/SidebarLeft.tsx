import React from 'react';
import {
    Layout, Type, Image as ImageIcon,
    Share2, Square, Columns,
    MessageSquare, MapPin,
    PlusCircle, Calendar
} from 'lucide-react';

interface BlockTemplate {
    type: string;
    label: string;
    icon: any;
    category: 'basic' | 'content' | 'media' | 'social';
    description: string;
}

const AVAILABLE_BLOCKS: BlockTemplate[] = [
    { type: 'Hero', label: 'Portada (Hero)', icon: Layout, category: 'basic', description: 'Imagen principal y título de impacto' },
    { type: 'Navigation', label: 'Navegación', icon: Columns, category: 'basic', description: 'Menú superior y enlaces' },
    { type: 'Features', label: 'Amenities', icon: Columns, category: 'basic', description: 'Servicios: piscina, wifi, aire...' },
    { type: 'CTA', label: 'Botón de Reserva', icon: Layout, category: 'basic', description: 'Acceso directo a la reserva' },
    { type: 'Location', label: 'Ubicación (Mapa)', icon: MapPin, category: 'basic', description: 'Mapa de Google y dirección' },
    { type: 'ApartmentsGrid', label: 'Catálogo Unidades', icon: Square, category: 'content', description: 'Listado de apartamentos' },
    { type: 'AvailabilityCalendar', label: 'Calendario', icon: Calendar, category: 'content', description: 'Disponibilidad en tiempo real' },
    { type: 'Gallery', label: 'Galería Fotos', icon: ImageIcon, category: 'media', description: 'Fotos del alojamiento' },
    { type: 'ContactFooter', label: 'Footer', icon: Layout, category: 'basic', description: 'Pie de página con contacto' },
];

interface SidebarLeftProps {
    onAddBlock: (type: string) => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({ onAddBlock }) => {
    const categories = [
        { id: 'basic', label: 'Estructura' },
        { id: 'content', label: 'Contenido' },
        { id: 'media', label: 'Multimedia' },
        { id: 'social', label: 'Social' },
    ];

    return (
        <aside className="w-full bg-white flex flex-col h-full z-40 shrink-0 select-none">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Biblioteca de Bloques</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">
                {categories.map(cat => (
                    <div key={cat.id}>
                        <h3 className="text-[11px] font-bold text-slate-400 mb-3 px-1">{cat.label}</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {AVAILABLE_BLOCKS.filter(b => b.category === cat.id).map(block => (
                                <button
                                    key={block.type}
                                    onClick={() => onAddBlock(block.type)}
                                    className="group flex flex-col p-3 rounded-2xl border border-slate-100 bg-white hover:border-indigo-500 hover:shadow-md transition-all text-left relative overflow-hidden active:scale-95"
                                >
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="p-2 bg-slate-50 rounded-xl text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <block.icon size={18} />
                                        </div>
                                        <span className="font-bold text-slate-700 text-sm group-hover:text-indigo-700 transition-colors">{block.label}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed pl-11">
                                        {block.description}
                                    </p>
                                    <PlusCircle
                                        size={14}
                                        className="absolute top-3 right-3 text-slate-200 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};
