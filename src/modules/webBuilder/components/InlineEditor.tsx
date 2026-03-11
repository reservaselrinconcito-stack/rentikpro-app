/**
 * InlineEditor.tsx
 *
 * Panel de edición rápida de texto que aparece al hacer doble clic en un bloque.
 * Extrae automáticamente los campos de texto del bloque y los presenta como
 * campos editables inline. Los cambios se aplican en tiempo real al canvas.
 *
 * Filosofía: sin paneles secundarios intimidantes — edita el texto donde está.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BlockInstance } from '../types';
import { X, Check, Edit3 } from 'lucide-react';

// ─── Text field descriptor ─────────────────────────────────────────────────────

interface TextField {
    key: string;       // dot-path into block.data, e.g. "headline" or "cta.label"
    label: string;     // human label
    multiline: boolean;
    value: string;
}

// ─── Extract text fields from block data ───────────────────────────────────────

function extractTextFields(block: BlockInstance): TextField[] {
    const fields: TextField[] = [];
    const data = block.data ?? {};

    // Field map by block type — most common text fields per block
    const FIELD_MAP: Record<string, Array<{ key: string; label: string; multiline?: boolean }>> = {
        Hero: [
            { key: 'headline', label: 'Título principal' },
            { key: 'subheadline', label: 'Subtítulo', multiline: true },
            { key: 'ctaLabel', label: 'Botón CTA' },
            { key: 'secondaryCtaLabel', label: 'Botón secundario' },
        ],
        Navigation: [
            { key: 'brandName', label: 'Nombre marca' },
            { key: 'ctaLabel', label: 'Botón CTA' },
        ],
        Features: [
            { key: 'headline', label: 'Título sección' },
            { key: 'subheadline', label: 'Subtítulo', multiline: true },
        ],
        Stats: [
            { key: 'headline', label: 'Título sección' },
            { key: 'subheadline', label: 'Subtítulo' },
        ],
        Testimonials: [
            { key: 'headline', label: 'Título sección' },
            { key: 'subheadline', label: 'Subtítulo' },
        ],
        Pricing: [
            { key: 'headline', label: 'Título sección' },
            { key: 'subheadline', label: 'Subtítulo', multiline: true },
        ],
        FAQ: [
            { key: 'headline', label: 'Título sección' },
            { key: 'subheadline', label: 'Subtítulo' },
        ],
        CTA: [
            { key: 'headline', label: 'Título CTA' },
            { key: 'subheadline', label: 'Subtítulo', multiline: true },
            { key: 'ctaLabel', label: 'Botón principal' },
            { key: 'secondaryCtaLabel', label: 'Botón secundario' },
        ],
        ContactForm: [
            { key: 'headline', label: 'Título' },
            { key: 'subheadline', label: 'Subtítulo', multiline: true },
            { key: 'ctaLabel', label: 'Texto del botón' },
        ],
        NewsletterSignup: [
            { key: 'headline', label: 'Título' },
            { key: 'subheadline', label: 'Subtítulo' },
            { key: 'placeholder', label: 'Placeholder email' },
            { key: 'ctaLabel', label: 'Botón' },
        ],
        Team: [
            { key: 'headline', label: 'Título sección' },
            { key: 'subheadline', label: 'Subtítulo' },
        ],
        Location: [
            { key: 'headline', label: 'Título' },
            { key: 'address', label: 'Dirección' },
            { key: 'phone', label: 'Teléfono' },
            { key: 'email', label: 'Email' },
        ],
        ContactFooter: [
            { key: 'brandName', label: 'Nombre marca' },
            { key: 'tagline', label: 'Tagline', multiline: true },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Teléfono' },
        ],
    };

    const typedMap = FIELD_MAP[block.type] ?? [];

    // Render defined fields
    for (const fd of typedMap) {
        const val = getNestedValue(data, fd.key);
        if (typeof val === 'string') {
            fields.push({ key: fd.key, label: fd.label, multiline: !!fd.multiline, value: val });
        }
    }

    // Fallback: auto-discover string fields if no map entry
    if (fields.length === 0) {
        const TEXT_KEYS = ['headline', 'title', 'subheadline', 'subtitle', 'description',
            'ctaLabel', 'label', 'tagline', 'text', 'caption', 'address', 'phone', 'email'];
        for (const key of TEXT_KEYS) {
            if (typeof data[key] === 'string') {
                fields.push({
                    key,
                    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
                    multiline: key === 'description' || key === 'subheadline' || key === 'tagline',
                    value: data[key],
                });
            }
        }
    }

    return fields;
}

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function setNestedValue(obj: any, path: string, value: string): any {
    const keys = path.split('.');
    const result = { ...obj };
    let cur = result;
    for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...(cur[keys[i]] ?? {}) };
        cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    return result;
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface InlineEditorProps {
    block: BlockInstance;
    anchorRef: React.RefObject<HTMLElement>; // the block's DOM element
    onUpdate: (id: string, data: Record<string, any>) => void;
    onClose: () => void;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({ block, anchorRef, onUpdate, onClose }) => {
    const [localData, setLocalData] = useState<Record<string, string>>(() => {
        const fields = extractTextFields(block);
        const map: Record<string, string> = {};
        fields.forEach(f => { map[f.key] = f.value; });
        return map;
    });
    const [isDirty, setIsDirty] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const fields = extractTextFields(block);

    // Position the panel near the block
    const [pos, setPos] = useState({ top: 0, left: 0 });
    useEffect(() => {
        if (!anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        setPos({
            top: rect.top + window.scrollY,
            left: Math.min(rect.left + rect.width + 8, window.innerWidth - 360),
        });
    }, [anchorRef]);

    // Click outside to close (save first)
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                handleSave();
                onClose();
            }
        };
        document.addEventListener('mousedown', handler, true);
        return () => document.removeEventListener('mousedown', handler, true);
    }, [localData]);

    const handleChange = useCallback((key: string, value: string) => {
        setLocalData(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
        // Live update as you type
        let newData = { ...(block.data ?? {}) };
        newData = setNestedValue(newData, key, value);
        onUpdate(block.id, newData);
    }, [block, onUpdate]);

    const handleSave = useCallback(() => {
        let newData = { ...(block.data ?? {}) };
        Object.entries(localData).forEach(([key, val]) => {
            newData = setNestedValue(newData, key, val);
        });
        onUpdate(block.id, newData);
        setIsDirty(false);
    }, [block, localData, onUpdate]);

    if (fields.length === 0) {
        return (
            <div
                ref={panelRef}
                className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-80"
                style={{ top: pos.top, left: pos.left }}
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Edición inline</span>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={14} /></button>
                </div>
                <p className="text-sm text-slate-400">Este bloque no tiene campos de texto editables inline. Usa el inspector de la derecha.</p>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-80"
            style={{ top: pos.top, left: Math.max(8, pos.left) }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                    <Edit3 size={13} className="text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Editar · {block.type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {isDirty && (
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black hover:bg-emerald-600 transition-colors"
                        >
                            <Check size={10} /> Guardar
                        </button>
                    )}
                    <button onClick={() => { handleSave(); onClose(); }} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Fields */}
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {fields.map(field => (
                    <div key={field.key}>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            {field.label}
                        </label>
                        {field.multiline ? (
                            <textarea
                                value={localData[field.key] ?? ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white resize-none transition-colors placeholder-slate-300"
                                placeholder={`Escribe ${field.label.toLowerCase()}…`}
                            />
                        ) : (
                            <input
                                type="text"
                                value={localData[field.key] ?? ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                className="w-full px-3 py-2 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors placeholder-slate-300"
                                placeholder={`Escribe ${field.label.toLowerCase()}…`}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 text-center">
                    Los cambios se aplican al instante · <kbd className="font-mono bg-slate-200 px-1 rounded">Esc</kbd> para cerrar
                </p>
            </div>
        </div>
    );
};
