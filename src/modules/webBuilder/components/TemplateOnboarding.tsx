import React from 'react';
import { PROPERTY_TEMPLATES, PropertyTemplate } from '../templates/propertyTemplates';
import { ArrowRight, Layout } from 'lucide-react';

interface TemplateOnboardingProps {
    onSelect: (template: PropertyTemplate) => void;
}

export const TemplateOnboarding: React.FC<TemplateOnboardingProps> = ({ onSelect }) => {
    return (
        <div className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                    <Layout size={14} /> Empezar con una plantilla
                </div>
                <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight">Crea tu web profesional</h2>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                    Selecciona el tipo de alojamiento para configurar automáticamente las mejores secciones y contenidos.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {PROPERTY_TEMPLATES.map((tmpl) => (
                    <div
                        key={tmpl.id}
                        onClick={() => onSelect(tmpl)}
                        className="group relative bg-white border border-slate-100 rounded-[3rem] p-10 hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.15)] hover:-translate-y-2 transition-all cursor-pointer overflow-hidden flex flex-col items-center text-center"
                    >
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[4rem] group-hover:bg-indigo-600 group-hover:w-full group-hover:h-full group-hover:rounded-none transition-all duration-500 ease-in-out -z-0 opacity-0 group-hover:opacity-5"></div>

                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm group-hover:shadow-indigo-200">
                                {tmpl.icon}
                            </div>

                            <h3 className="text-2xl font-black text-slate-800 mb-4 group-hover:text-indigo-600 transition-colors">{tmpl.name}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-10 font-medium">
                                {tmpl.description}
                            </p>

                            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest bg-indigo-50 px-6 py-3 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                Crear con esta plantilla <ArrowRight size={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
