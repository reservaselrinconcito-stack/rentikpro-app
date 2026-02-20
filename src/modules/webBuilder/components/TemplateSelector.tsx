import React from 'react';
import { TEMPLATES, TemplateDefinition, TemplateId } from '../templates';
import { CheckCircle2 } from 'lucide-react';

interface TemplateSelectorProps {
    selectedId: TemplateId | null;
    onSelect: (id: TemplateId) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ selectedId, onSelect }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
            {Object.values(TEMPLATES).map((tmpl) => (
                <div
                    key={tmpl.id}
                    onClick={() => onSelect(tmpl.id)}
                    className={`relative cursor-pointer group rounded-2xl border-2 transition-all overflow-hidden ${selectedId === tmpl.id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100 hover:border-slate-300'}`}
                >
                    {/* Thumbnail / Gradient Placeholder */}
                    <div className={`h-32 w-full ${tmpl.thumbnail || 'bg-slate-100'}`}></div>

                    {/* Content */}
                    <div className="p-4 bg-white">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            {tmpl.name}
                            {selectedId === tmpl.id && <CheckCircle2 size={16} className="text-indigo-600 fill-indigo-50" />}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tmpl.description}</p>
                    </div>

                    {/* Hover Effect Layer */}
                    <div className={`absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/5 transition-colors ${selectedId === tmpl.id ? 'bg-indigo-900/5' : ''}`}></div>
                </div>
            ))}
        </div>
    );
};
