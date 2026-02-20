import React from 'react';
import { SiteConfigLegacy as SiteConfig, ThemeId } from '../types';
import { LayoutTemplate, CheckCircle2 } from 'lucide-react';

interface TemplateOption {
    id: ThemeId;
    name: string;
    description: string;
    imageColor: string;
}

const TEMPLATES: TemplateOption[] = [
    {
        id: 'modernWarm',
        name: 'Moderno Cálido',
        description: 'Diseño limpio con tonos tierra y tipografía sans-serif. Ideal para apartamentos urbanos.',
        imageColor: 'bg-orange-100'
    },
    {
        id: 'rusticPremium',
        name: 'Rústico Premium',
        description: 'Elegancia clásica para casas rurales y villas con encanto.',
        imageColor: 'bg-stone-200'
    },
    {
        id: 'minimalLux',
        name: 'Minimal Luxury',
        description: 'Espacios en blanco, fotos grandes y detalles dorados. Para propiedades de alto standing.',
        imageColor: 'bg-slate-900'
    }
];

interface TemplatePickerProps {
    config: SiteConfig;
    onChange: (updates: Partial<SiteConfig>) => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ config, onChange }) => {
    return (
        <div className="space-y-6 animate-in fade-in">
            <div>
                <h3 className="text-xl font-black text-slate-800">Elige tu Diseño</h3>
                <p className="text-sm text-slate-500">Selecciona una plantilla base. Podrás personalizar colores y fotos después.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {TEMPLATES.map(tmpl => (
                    <div
                        key={tmpl.id}
                        onClick={() => onChange({ themeId: tmpl.id })}
                        className={`relative cursor-pointer group rounded-2xl border-2 transition-all overflow-hidden ${config.themeId === tmpl.id ? 'border-indigo-600 ring-2 ring-indigo-100 ring-offset-2' : 'border-slate-200 hover:border-indigo-300'}`}
                    >
                        <div className={`h-32 ${tmpl.imageColor} flex items-center justify-center`}>
                            <LayoutTemplate className={`w-12 h-12 opacity-20 ${tmpl.id === 'minimalLux' ? 'text-white' : 'text-slate-900'}`} />
                        </div>
                        <div className="p-4 bg-white">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-slate-800">{tmpl.name}</h4>
                                {config.themeId === tmpl.id && <CheckCircle2 className="text-indigo-600 fill-indigo-50" size={20} />}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{tmpl.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
