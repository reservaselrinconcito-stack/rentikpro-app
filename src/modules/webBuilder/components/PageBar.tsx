/**
 * PageBar.tsx
 *
 * Barra de pestañas de páginas debajo del toolbar principal.
 * Permite: cambiar de página, añadir páginas, renombrar y eliminar.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, ChevronDown, MoreHorizontal } from 'lucide-react';
import { SiteConfigV1, PageMeta } from '../types';

// ─── Page labels ───────────────────────────────────────────────────────────────

const PAGE_PRESETS: Array<{ slug: string; label: string }> = [
    { slug: '/about', label: 'Nosotros' },
    { slug: '/services', label: 'Servicios' },
    { slug: '/contact', label: 'Contacto' },
    { slug: '/blog', label: 'Blog' },
    { slug: '/pricing', label: 'Precios' },
    { slug: '/portfolio', label: 'Portfolio' },
    { slug: '/faq', label: 'FAQ' },
    { slug: '/legal', label: 'Legal' },
];

function getPageLabel(config: SiteConfigV1, slug: string): string {
    if (slug === '/') return 'Inicio';
    const meta = (config.pages[slug] as any)?.__label;
    if (meta) return meta;
    const preset = PAGE_PRESETS.find(p => p.slug === slug);
    return preset?.label ?? slug.replace('/', '').replace(/-/g, ' ');
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface PageBarProps {
    config: SiteConfigV1;
    currentPage: string;
    onSetPage: (slug: string) => void;
    onAddPage: (meta: PageMeta) => void;
    onRemovePage: (slug: string) => void;
    onRenamePage: (slug: string, label: string) => void;
}

export const PageBar: React.FC<PageBarProps> = ({
    config, currentPage, onSetPage, onAddPage, onRemovePage, onRenamePage
}) => {
    const pages = Object.keys(config.pages);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [renamingSlug, setRenamingSlug] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [contextMenu, setContextMenu] = useState<{ slug: string; x: number; y: number } | null>(null);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const renameRef = useRef<HTMLInputElement>(null);

    // Close menus on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
            setContextMenu(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (renamingSlug && renameRef.current) renameRef.current.focus();
    }, [renamingSlug]);

    function startRename(slug: string) {
        setRenamingSlug(slug);
        setRenameValue(getPageLabel(config, slug));
        setContextMenu(null);
    }

    function commitRename() {
        if (renamingSlug && renameValue.trim()) {
            onRenamePage(renamingSlug, renameValue.trim());
        }
        setRenamingSlug(null);
    }

    // Available presets (exclude already-added)
    const availablePresets = PAGE_PRESETS.filter(p => !pages.includes(p.slug));

    function addCustomPage() {
        const slug = `/pagina-${Date.now()}`;
        onAddPage({ slug, label: 'Nueva página', blocks: [] });
        setShowAddMenu(false);
        setRenamingSlug(slug);
        setRenameValue('Nueva página');
    }

    return (
        <div className="h-9 bg-white border-b border-slate-200 flex items-center px-4 gap-1 overflow-x-auto shrink-0 relative z-40">
            {/* Page tabs */}
            {pages.map(slug => {
                const label = getPageLabel(config, slug);
                const isActive = currentPage === slug;
                const isRenaming = renamingSlug === slug;

                return (
                    <div key={slug} className="relative flex items-center shrink-0">
                        {isRenaming ? (
                            <input
                                ref={renameRef}
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') commitRename();
                                    if (e.key === 'Escape') setRenamingSlug(null);
                                }}
                                className="h-7 px-2 border border-indigo-400 rounded-lg text-xs font-bold text-slate-800 focus:outline-none bg-white w-28"
                            />
                        ) : (
                            <button
                                onClick={() => onSetPage(slug)}
                                onDoubleClick={() => slug !== '/' && startRename(slug)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({ slug, x: e.clientX, y: e.clientY });
                                }}
                                className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${isActive
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                    }`}
                            >
                                {slug === '/' ? '🏠' : '📄'} {label}
                                {isActive && slug !== '/' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRemovePage(slug); }}
                                        className="ml-0.5 opacity-60 hover:opacity-100 hover:text-red-300 transition-all"
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Add page button */}
            <div className="relative" ref={addMenuRef}>
                <button
                    onClick={() => setShowAddMenu(v => !v)}
                    className="flex items-center gap-1 h-7 px-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-black transition-all"
                >
                    <Plus size={12} /> Añadir
                </button>

                {showAddMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px]">
                        {availablePresets.map(p => (
                            <button
                                key={p.slug}
                                onClick={() => { onAddPage({ slug: p.slug, label: p.label, blocks: [] }); setShowAddMenu(false); }}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                            >
                                📄 {p.label}
                                <span className="text-slate-400 font-mono ml-2 text-[9px]">{p.slug}</span>
                            </button>
                        ))}
                        {availablePresets.length > 0 && <div className="h-px bg-slate-100 mx-3" />}
                        <button
                            onClick={addCustomPage}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            ✏️ Página personalizada…
                        </button>
                    </div>
                )}
            </div>

            {/* Context menu (right-click) */}
            {contextMenu && (
                <div
                    className="fixed bg-white border border-slate-200 rounded-xl shadow-xl z-[300] overflow-hidden min-w-[140px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        onClick={() => startRename(contextMenu.slug)}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                        ✏️ Renombrar
                    </button>
                    {contextMenu.slug !== '/' && (
                        <button
                            onClick={() => { onRemovePage(contextMenu.slug); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50"
                        >
                            🗑️ Eliminar página
                        </button>
                    )}
                </div>
            )}

            {/* Page count hint */}
            <div className="ml-auto shrink-0 text-[9px] text-slate-300 font-bold">
                {pages.length} pág.
            </div>
        </div>
    );
};
