import React from 'react';
import { SiteConfigLegacy as SiteConfig } from '../types';
import {
    LayoutTemplate, Image as ImageIcon, Home, MapPin,
    Phone, MessageSquare, GripVertical, Eye, EyeOff, Trash2
} from 'lucide-react';

interface SectionManagerProps {
    config: SiteConfig;
    selectedSectionId: string | null;
    onSelectSection: (id: string) => void;
    onReorder: (newOrder: string[]) => void;
}

const SECTION_LABELS: Record<string, string> = {
    hero: 'Portada (Hero)',
    apartments: 'Alojamientos',
    location: 'Ubicación',
    contact: 'Contacto',
    brand: 'Identidad y Marca',
    chatbot: 'Chatbot AI'
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
    hero: <ImageIcon size={16} />,
    apartments: <Home size={16} />,
    location: <MapPin size={16} />,
    contact: <Phone size={16} />,
    brand: <LayoutTemplate size={16} />,
    chatbot: <MessageSquare size={16} />
};

export const SectionManager: React.FC<SectionManagerProps> = ({
    config, selectedSectionId, onSelectSection, onReorder
}) => {
    // We combine the fixed structure with the order array
    // 'brand' and 'chatbot' might not be in sectionOrder if they are fixed/global, 
    // but user wanted 'A) Izquierda: lista de Secciones'.
    // Let's assume 'sectionOrder' drives the main content flow. 
    // 'Brand' is usually global, 'Chatbot' is a widget. 
    // But for simplicity let's list them or at least the ordered ones.

    // Default fallback if order is empty
    const order = config.sectionOrder && config.sectionOrder.length > 0
        ? config.sectionOrder
        : ['hero', 'apartments', 'location', 'contact'];

    const handleMove = (index: number, direction: -1 | 1) => {
        const newOrder = [...order];
        if (index + direction < 0 || index + direction >= newOrder.length) return;
        const temp = newOrder[index];
        newOrder[index] = newOrder[index + direction];
        newOrder[index + direction] = temp;
        onReorder(newOrder);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-4 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Estructura de la Web</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* Fixed "Global" Sections (optional to show here or separate) */}

                <div
                    onClick={() => onSelectSection('brand')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${selectedSectionId === 'brand' ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 hover:border-slate-300'}`}
                >
                    <div className="text-slate-400">{SECTION_ICONS['brand']}</div>
                    <span className="text-sm font-bold text-slate-700 flex-1">Identidad y Marca</span>
                </div>

                <div className="my-2 border-t border-slate-100"></div>

                {/* Ordered Sections */}
                {order.map((sectionId, index) => (
                    <div
                        key={sectionId}
                        onClick={() => onSelectSection(sectionId)}
                        className={`group p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${selectedSectionId === sectionId ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                        {/* Drag Handle (Visual only for now unless we implement dnd) */}
                        <div className="text-slate-300 cursor-grab active:cursor-grabbing"><GripVertical size={14} /></div>

                        <div className={`text-slate-500 ${selectedSectionId === sectionId ? 'text-indigo-600' : ''}`}>
                            {SECTION_ICONS[sectionId] || <LayoutTemplate size={16} />}
                        </div>

                        <span className="text-sm font-bold text-slate-700 flex-1 select-none">
                            {SECTION_LABELS[sectionId] || sectionId}
                        </span>

                        {/* Reorder Buttons (Simple) */}
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleMove(index, -1); }}
                                disabled={index === 0}
                                className="p-0.5 hover:bg-slate-200 rounded text-[8px] disabled:opacity-30"
                            >▲</button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleMove(index, 1); }}
                                disabled={index === order.length - 1}
                                className="p-0.5 hover:bg-slate-200 rounded text-[8px] disabled:opacity-30"
                            >▼</button>
                        </div>
                    </div>
                ))}

                <div className="my-2 border-t border-slate-100"></div>

                <div
                    onClick={() => onSelectSection('chatbot')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${selectedSectionId === 'chatbot' ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 hover:border-slate-300'}`}
                >
                    <div className="text-slate-400">{SECTION_ICONS['chatbot']}</div>
                    <span className="text-sm font-bold text-slate-700 flex-1">Chatbot & Lead Magnet</span>
                </div>

                {/* Add Section Placeholder */}
                <button className="w-full py-3 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-50 transition-colors mt-4">
                    + Añadir Sección
                </button>
            </div>
        </div>
    );
};
