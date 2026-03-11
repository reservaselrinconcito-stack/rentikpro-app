import React, { useState } from 'react';
import {
    Layout, Type, Image as ImageIcon,
    Share2, Square, Columns,
    MessageSquare, MapPin,
    PlusCircle, Calendar, Users, BarChart3,
    Star, Send, Layers,
    ChevronRight
} from 'lucide-react';
import { WEBPRO_TEMPLATES, WebProTemplate } from '../templates';
import { SiteConfigV1 } from '../types';

// ─── Block Catalog ─────────────────────────────────────────────────────────────

interface BlockDef {
    type: string;
    label: string;
    icon: any;
    category: 'structure' | 'content' | 'media' | 'conversion';
    description: string;
    emoji: string;
}

const BLOCK_CATALOG: BlockDef[] = [
    // Structure
    { type: 'Navigation', label: 'Navbar', icon: Columns, category: 'structure', description: 'Menú superior fijo', emoji: '📌' },
    { type: 'Hero', label: 'Hero', icon: Layout, category: 'structure', description: 'Portada con imagen y CTA', emoji: '🦸' },
    { type: 'Stats', label: 'Estadísticas', icon: BarChart3, category: 'structure', description: 'Números impactantes en fila', emoji: '📊' },
    { type: 'LogoCloud', label: 'Logos', icon: Star, category: 'structure', description: 'Marcas de referencia', emoji: '🏆' },
    // Content
    { type: 'Features', label: 'Características', icon: Columns, category: 'content', description: 'Grid de beneficios con iconos', emoji: '⚡' },
    { type: 'Team', label: 'Equipo', icon: Users, category: 'content', description: 'Perfiles del equipo', emoji: '👥' },
    { type: 'ApartmentsGrid', label: 'Productos', icon: Square, category: 'content', description: 'Tarjetas de ítems/propiedades', emoji: '🏠' },
    { type: 'AvailabilityCalendar', label: 'Calendario', icon: Calendar, category: 'content', description: 'Disponibilidad en tiempo real', emoji: '📅' },
    { type: 'FAQ', label: 'FAQ', icon: MessageSquare, category: 'content', description: 'Preguntas frecuentes', emoji: '❓' },
    { type: 'Location', label: 'Ubicación', icon: MapPin, category: 'content', description: 'Dirección y horarios', emoji: '📍' },
    // Media
    { type: 'Gallery', label: 'Galería', icon: ImageIcon, category: 'media', description: 'Grid de imágenes', emoji: '🖼️' },
    { type: 'Testimonials', label: 'Testimonios', icon: MessageSquare, category: 'media', description: 'Reseñas de clientes', emoji: '⭐' },
    // Conversion
    { type: 'Pricing', label: 'Precios', icon: Layout, category: 'conversion', description: 'Planes y tarifas', emoji: '💳' },
    { type: 'CTA', label: 'Llamada acción', icon: Layout, category: 'conversion', description: 'Sección de conversión final', emoji: '🎯' },
    { type: 'ContactForm', label: 'Formulario', icon: MessageSquare, category: 'conversion', description: 'Captura de leads', emoji: '📧' },
    { type: 'NewsletterSignup', label: 'Newsletter', icon: Send, category: 'conversion', description: 'Suscripción por email', emoji: '✉️' },
    { type: 'TrustBadges', label: 'Trust Badges', icon: Share2, category: 'conversion', description: 'Sellos de confianza', emoji: '🛡️' },
    { type: 'ContactFooter', label: 'Footer', icon: Layers, category: 'conversion', description: 'Pie de página completo', emoji: '📄' },
];

const CATEGORIES = [
    { id: 'structure', label: 'Estructura', color: '#4f46e5' },
    { id: 'content', label: 'Contenido', color: '#059669' },
    { id: 'media', label: 'Multimedia', color: '#d97706' },
    { id: 'conversion', label: 'Conversión', color: '#e11d48' },
] as const;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SidebarLeftProps {
    onAddBlock: (type: string) => void;
    onApplyTemplate?: (config: SiteConfigV1) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const SidebarLeft: React.FC<SidebarLeftProps> = ({ onAddBlock, onApplyTemplate }) => {
    const [tab, setTab] = useState<'blocks' | 'templates'>('blocks');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const filtered = activeCategory
        ? BLOCK_CATALOG.filter(b => b.category === activeCategory)
        : BLOCK_CATALOG;

    return (
        <aside className="w-full bg-white flex flex-col h-full z-40 shrink-0 select-none">

            {/* Tab Switcher */}
            <div className="p-2 border-b border-slate-100 flex gap-1">
                {(['blocks', 'templates'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        {t === 'blocks' ? '🧩 Bloques' : '✨ Plantillas'}
                    </button>
                ))}
            </div>

            {/* BLOCKS TAB */}
            {tab === 'blocks' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Category pills */}
                    <div className="p-3 border-b border-slate-50 flex gap-1.5 flex-wrap">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all
                                ${!activeCategory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            Todo
                        </button>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                style={activeCategory === cat.id ? { backgroundColor: cat.color, color: '#fff' } : {}}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all
                                    ${activeCategory === cat.id ? '' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Block grid */}
                    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
                        {filtered.map(block => (
                            <button
                                key={block.type}
                                onClick={() => onAddBlock(block.type)}
                                className="group flex flex-col items-center p-3 rounded-2xl border border-slate-100 bg-white hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-50 transition-all text-center relative overflow-hidden active:scale-95"
                            >
                                {/* Emoji thumbnail */}
                                <div className="w-12 h-10 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center mb-2 text-2xl transition-colors">
                                    {block.emoji}
                                </div>
                                <span className="font-black text-slate-700 text-[11px] group-hover:text-indigo-700 transition-colors leading-tight">
                                    {block.label}
                                </span>
                                <PlusCircle
                                    size={12}
                                    className="absolute top-2 right-2 text-slate-200 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* TEMPLATES TAB */}
            {tab === 'templates' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <div className="px-1 py-2">
                        <p className="text-[10px] text-slate-400 font-bold">
                            Carga una plantilla completa. Reemplaza el contenido actual.
                        </p>
                    </div>
                    {WEBPRO_TEMPLATES.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onApply={() => onApplyTemplate?.(template.config)}
                        />
                    ))}
                </div>
            )}
        </aside>
    );
};

// ─── Template Card ─────────────────────────────────────────────────────────────

const TemplateCard: React.FC<{ template: WebProTemplate; onApply: () => void }> = ({ template, onApply }) => {
    return (
        <div
            className="group relative flex flex-col bg-white border border-slate-100 rounded-2xl p-3.5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer overflow-hidden"
            onClick={onApply}
        >
            {/* Color bar */}
            <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-all group-hover:h-1.5"
                style={{ backgroundColor: template.previewColor }}
            />

            <div className="flex items-start gap-3 mt-1">
                <span className="text-2xl shrink-0">{template.emoji}</span>
                <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black text-slate-800 leading-tight">{template.name}</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{template.description}</p>
                </div>
                <ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-500 transition-colors shrink-0 mt-0.5" />
            </div>

            {/* Block count badge */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                <span
                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: template.previewColor }}
                >
                    {template.category}
                </span>
                <span className="text-[8px] text-slate-300 font-bold ml-auto">
                    {template.config.pages['/']?.blocks.length ?? 0} bloques
                </span>
            </div>
        </div>
    );
};
