import React, { useState } from 'react';
import { SiteConfigLegacy as SiteConfig } from '../types';
import { User, Image as ImageIcon, Home, MapPin, Phone, MessageSquare, Play, UploadCloud } from 'lucide-react';

interface PropertyInspectorProps {
    config: SiteConfig;
    selectedSectionId: string | null;
    onChange: (updates: Partial<SiteConfig>) => void;
    properties: any[];
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({ config, selectedSectionId, onChange, properties }) => {

    // Helpers
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

    // Helper to toggle properties
    const toggleProperty = (property: any) => {
        const currentItems = config.apartments?.items || [];
        const exists = currentItems.find(p => p.id === property.id);

        let newItems;
        if (exists) {
            newItems = currentItems.filter(p => p.id !== property.id);
        } else {
            newItems = [...currentItems, {
                id: property.id,
                name: property.name,
                description: property.description,
                photos: property.photos || [],
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


    if (!selectedSectionId) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs text-center p-8">
                Selecciona una sección a la izquierda para editar sus propiedades.
            </div>
        );
    }

    return (
        <div className="h-full bg-white flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Propiedades</span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">{selectedSectionId}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* BRAND */}
                {selectedSectionId === 'brand' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre del Negocio</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.brand.name}
                                onChange={e => updateBrand('name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Eslogan</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.brand.tagline || ''}
                                onChange={e => updateBrand('tagline', e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* HERO */}
                {selectedSectionId === 'hero' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Título Principal</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.hero.title || ''}
                                onChange={e => updateHero('title', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Subtítulo</label>
                            <textarea className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400 resize-none h-24"
                                value={config.hero.subtitle || ''}
                                onChange={e => updateHero('subtitle', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Imagen de Fondo (URL)</label>
                            <div className="flex gap-2">
                                <input className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono outline-none focus:border-indigo-400"
                                    value={config.hero.imageUrl || ''}
                                    onChange={e => updateHero('imageUrl', e.target.value)}
                                />
                                <button className="p-3 bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600"><UploadCloud size={16} /></button>
                            </div>
                            {config.hero.imageUrl && (
                                <div className="mt-2 rounded-lg overflow-hidden h-32 border border-slate-200">
                                    <img src={config.hero.imageUrl} className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Texto Botón (CTA)</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.hero.ctaLabel || ''}
                                onChange={e => updateHero('ctaLabel', e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* APARTMENTS */}
                {selectedSectionId === 'apartments' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Título de la Sección</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.apartments?.title || ''}
                                onChange={e => onChange({ apartments: { ...config.apartments, title: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">Propiedades Visibles</label>
                            <p className="text-[10px] text-slate-400 mb-2">Selecciona las propiedades que quieres mostrar en la portada.</p>
                            <div className="space-y-2 border border-slate-100 rounded-lg p-2 max-h-60 overflow-y-auto">
                                {properties.map(p => {
                                    const isSelected = config.apartments?.items?.some(item => item.id === p.id);
                                    return (
                                        <div key={p.id} onClick={() => toggleProperty(p)} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                            </div>
                                            <span className={`text-xs font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>{p.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* LOCATION */}
                {selectedSectionId === 'location' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Dirección Texto</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.location?.addressText || ''}
                                onChange={e => updateLocation('addressText', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Google Maps Embed URL</label>
                            <textarea className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono outline-none focus:border-indigo-400 h-24"
                                value={config.location?.mapUrl || ''}
                                onChange={e => updateLocation('mapUrl', e.target.value)}
                                placeholder='<iframe src="...">'
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Pega aquí el enlace de "Insertar mapa" de Google Maps.</p>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <input type="checkbox" id="map_enabled"
                                checked={config.location?.mapEnabled}
                                onChange={e => updateLocation('mapEnabled', e.target.checked)}
                                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="map_enabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Mostrar Mapa</label>
                        </div>
                    </div>
                )}

                {/* CONTACT */}
                {selectedSectionId === 'contact' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Email Contacto</label>
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
                            />
                        </div>
                    </div>
                )}

                {/* CHATBOT */}
                {selectedSectionId === 'chatbot' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <div className="p-2 bg-white rounded-full text-indigo-600"><MessageSquare size={16} /></div>
                            <div>
                                <h4 className="text-sm font-bold text-indigo-900">Asistente IA</h4>
                                <p className="text-[10px] text-indigo-700">Responde dudas 24/7 y capta reservas.</p>
                            </div>
                            <div className="flex-1"></div>
                            <input type="checkbox"
                                checked={config.chatbot?.enabled}
                                onChange={e => onChange({ chatbot: { ...config.chatbot, enabled: e.target.checked } })}
                                className="w-6 h-6 accent-indigo-600 rounded cursor-pointer"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Mensaje de Bienvenida</label>
                            <input className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400"
                                value={config.chatbot?.welcomeMessage || ''}
                                onChange={e => onChange({ chatbot: { ...config.chatbot, welcomeMessage: e.target.value } })}
                                placeholder="¡Hola! ¿En qué puedo ayudarte?"
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
