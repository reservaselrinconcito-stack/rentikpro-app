import React, { useState } from 'react';
import { SiteConfig } from '../types';
import { ChevronDown, ChevronRight, User, Home, MapPin, Phone, MessageSquare, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';

interface SectionEditorProps {
    config: SiteConfig;
    onChange: (updates: Partial<SiteConfig>) => void;
    properties: any[]; // Passed from parent
}

export const SectionEditor: React.FC<SectionEditorProps> = ({ config, onChange, properties }) => {
    const [openSection, setOpenSection] = useState<string | null>('brand');

    const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

    // Helpers for deep updates
    const updateBrand = (field: keyof SiteConfig['brand'], val: string) => {
        onChange({ brand: { ...config.brand, [field]: val } });
    };

    const updateHero = (field: keyof SiteConfig['hero'], val: string) => {
        onChange({ hero: { ...config.hero, [field]: val } });
    };

    const updateContact = (field: keyof SiteConfig['contact'], val: string) => {
        onChange({ contact: { ...config.contact, [field]: val } });
    };

    const updateLocation = (field: keyof SiteConfig['location'], val: any) => {
        onChange({ location: { ...config.location, [field]: val } });
    };

    // Toggle property selection
    const toggleProperty = (property: any) => {
        const currentItems = config.apartments?.items || [];
        const exists = currentItems.find(p => p.id === property.id);

        let newItems;
        if (exists) {
            newItems = currentItems.filter(p => p.id !== property.id);
        } else {
            // Map property to ApartmentSummary
            newItems = [...currentItems, {
                id: property.id,
                name: property.name,
                description: property.description,
                photos: property.photos || [], // Assuming property has photos
                capacity: property.capacity,
                priceStart: property.price
            }];
        }

        onChange({
            apartments: {
                ...config.apartments,
                items: newItems,
                title: config.apartments?.title || 'Nuestros Alojamientos'
            }
        });
    };

    return (
        <div className="space-y-4 animate-in fade-in pb-20">

            {/* 1. Identity */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
                <button onClick={() => toggle('brand')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={18} /></div>
                        <span className="font-bold text-slate-700 text-sm">Identidad y Marca</span>
                    </div>
                    {openSection === 'brand' ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {openSection === 'brand' && (
                    <div className="p-4 pt-0 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                        <div className="mt-4">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre del Negocio</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.brand.name}
                                onChange={e => updateBrand('name', e.target.value)}
                                placeholder="Ej. Casa Rural El Roble"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Eslogan (Tagline)</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.brand.tagline || ''}
                                onChange={e => updateBrand('tagline', e.target.value)}
                                placeholder="Donde la naturaleza te abraza..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Hero */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
                <button onClick={() => toggle('hero')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><ImageIcon size={18} /></div>
                        <span className="font-bold text-slate-700 text-sm">Portada (Hero)</span>
                    </div>
                    {openSection === 'hero' ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {openSection === 'hero' && (
                    <div className="p-4 pt-0 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                        <div className="mt-4">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Título Principal</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.hero.title || ''}
                                onChange={e => updateHero('title', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Subtítulo</label>
                            <textarea className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400 resize-none h-20"
                                value={config.hero.subtitle || ''}
                                onChange={e => updateHero('subtitle', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">URL Imagen Fondo</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400 font-mono text-xs"
                                value={config.hero.imageUrl || ''}
                                onChange={e => updateHero('imageUrl', e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Apartments (Properties) */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
                <button onClick={() => toggle('apartments')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Home size={18} /></div>
                        <span className="font-bold text-slate-700 text-sm">Alojamientos</span>
                    </div>
                    {openSection === 'apartments' ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {openSection === 'apartments' && (
                    <div className="p-4 pt-0 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                        <div className="mt-4">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Título Sección</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.apartments?.title || 'Nuestros Alojamientos'}
                                onChange={e => onChange({ apartments: { ...config.apartments, title: e.target.value } })}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">Seleccionar Propiedades</label>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg p-2">
                                {properties.map(p => {
                                    const isSelected = config.apartments?.items?.some(item => item.id === p.id);
                                    return (
                                        <div key={p.id} onClick={() => toggleProperty(p)} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                                {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                            </div>
                                            <span className={`text-xs font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>{p.name}</span>
                                        </div>
                                    );
                                })}
                                {properties.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4">No hay propiedades disponibles.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Location */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
                <button onClick={() => toggle('location')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><MapPin size={18} /></div>
                        <span className="font-bold text-slate-700 text-sm">Ubicación</span>
                    </div>
                    {openSection === 'location' ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {openSection === 'location' && (
                    <div className="p-4 pt-0 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                        <div className="mt-4">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Dirección Visible</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.location?.addressText || ''}
                                onChange={e => updateLocation('addressText', e.target.value)}
                                placeholder="Calle Principal 123, Girona"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">URL Google Maps (Embed)</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400 font-mono text-xs"
                                value={config.location?.mapUrl || ''}
                                onChange={e => updateLocation('mapUrl', e.target.value)}
                                placeholder="https://www.google.com/maps/embed?..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 5. Contact */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
                <button onClick={() => toggle('contact')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Phone size={18} /></div>
                        <span className="font-bold text-slate-700 text-sm">Contacto</span>
                    </div>
                    {openSection === 'contact' ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {openSection === 'contact' && (
                    <div className="p-4 pt-0 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                        <div className="mt-4">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Email Público</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.contact.email || ''}
                                onChange={e => updateContact('email', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">WhatsApp / Teléfono</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.contact.whatsapp || ''}
                                onChange={e => updateContact('whatsapp', e.target.value)}
                                placeholder="+34 600..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 6. Chatbot */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
                <button onClick={() => toggle('chatbot')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><MessageSquare size={18} /></div>
                        <span className="font-bold text-slate-700 text-sm">Chatbot AI</span>
                    </div>
                    {openSection === 'chatbot' ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {openSection === 'chatbot' && (
                    <div className="p-4 pt-0 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl mb-4">
                            <input type="checkbox" id="cb_enabled"
                                checked={config.chatbot?.enabled}
                                onChange={e => onChange({ chatbot: { ...config.chatbot, enabled: e.target.checked } })}
                                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="cb_enabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Habilitar widget en la web</label>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};
