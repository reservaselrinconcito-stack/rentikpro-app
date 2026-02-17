
import React, { useState, useEffect } from 'react';
import { Property, Apartment, WebSite } from '../types';
import { projectManager } from '../services/projectManager';
import { X, Check, ChevronRight, Home, Phone, Palette, Wand2, Globe } from 'lucide-react';

interface QuickWebWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (site: WebSite) => Promise<void>;
}

type StyleOption = 'MODERN' | 'FAMILY' | 'PREMIUM';

export const QuickWebWizard: React.FC<QuickWebWizardProps> = ({ isOpen, onClose, onGenerate }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data
    const [properties, setProperties] = useState<Property[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);

    // Form State
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [selectedApartmentIds, setSelectedApartmentIds] = useState<string[]>([]);
    const [contact, setContact] = useState({ email: '', phone: '', location: '' });
    const [style, setStyle] = useState<StyleOption>('MODERN');
    const [language, setLanguage] = useState<'ES' | 'EN'>('ES');

    useEffect(() => {
        if (isOpen) {
            loadData();
            // Reset state
            setStep(1);
            setSelectedPropertyId('');
            setSelectedApartmentIds([]);
            setContact({ email: '', phone: '', location: '' });
            setStyle('MODERN');
        }
    }, [isOpen]);

    const loadData = async () => {
        const store = projectManager.getStore();
        const props = await store.getProperties();
        setProperties(props);
        // Pre-select if only one
        if (props.length === 1) setSelectedPropertyId(props[0].id);
    };

    // Load apartments when property changes
    useEffect(() => {
        if (selectedPropertyId) {
            projectManager.getStore().getApartments(selectedPropertyId).then(apts => {
                setApartments(apts);
                setSelectedApartmentIds(apts.map(a => a.id)); // Default all
            });
        }
    }, [selectedPropertyId]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const property = properties.find(p => p.id === selectedPropertyId)!;

            // 1. Theme Config
            let themeConfig: any = { font_family: 'Inter', layout_mode: 'modern' };
            if (style === 'MODERN') themeConfig = { primary_color: '#4F46E5', font_family: 'Inter', layout_mode: 'modern', border_radius: '1.5rem' };
            if (style === 'FAMILY') themeConfig = { primary_color: '#10B981', font_family: 'Nunito', layout_mode: 'friendly', border_radius: '2rem' };
            if (style === 'PREMIUM') themeConfig = { primary_color: '#0F172A', secondary_color: '#D4AF37', font_family: 'Playfair Display', layout_mode: 'elegant', border_radius: '0px' };

            // 2. Sections Generation
            const heroImage = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80'; // Placeholder

            const sections = [
                {
                    id: 'hero',
                    type: 'hero',
                    content: {
                        title: property.name,
                        subtitle: style === 'PREMIUM' ? 'Exclusividad y confort en cada detalle.' : 'Tu hogar lejos de casa.',
                        bg_image: heroImage,
                        cta_text: 'Reservar Ahora'
                    }
                },
                {
                    id: 'properties',
                    type: 'properties',
                    content: {
                        title: 'Nuestros Alojamientos',
                        filter_ids: selectedApartmentIds
                    }
                },
                {
                    id: 'booking_cta',
                    type: 'booking_cta',
                    content: {
                        title: '¿Listo para tu escapada?',
                        subtitle: 'Reserva directamente con nosotros y consigue el mejor precio garantizado.',
                        img_url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80'
                    }
                },
                {
                    id: 'contact',
                    type: 'contact',
                    content: {
                        title: 'Contáctanos',
                        email: contact.email,
                        phone: contact.phone,
                        address: contact.location,
                        location_url: '' // Could generate google maps link if address is good
                    }
                }
            ];

            // 3. SEO & Metadata
            const slug = property.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const subdomain = `${slug}-${Date.now().toString(36).slice(-4)}`;

            const newSite: WebSite = {
                id: crypto.randomUUID(),
                name: property.name + ' (Web Rápida)',
                subdomain: subdomain,
                status: 'draft',
                theme_config: themeConfig,
                seo_title: `${property.name} | Alquiler Vacacional`,
                seo_description: `Reserva tu estancia en ${property.name}. Mejor precio garantizado. ${contact.location}.`,
                sections_json: JSON.stringify(sections, null, 2),
                booking_config: { min_stay: 2, max_stay: 30 },
                property_ids_json: JSON.stringify([selectedPropertyId]),
                created_at: Date.now(),
                updated_at: Date.now()
            };

            await onGenerate(newSite);
            onClose();

        } catch (e) {
            console.error(e);
            alert('Error generando la web. Revisa los datos.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Wand2 className="text-indigo-600" /> Web Rápida
                        </h2>
                        <p className="text-slate-500 text-sm">Genera tu sitio web en 4 pasos sencillos.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} className="text-slate-500" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Home size={20} /> 1. Propiedad y Alojamientos</h3>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400">Selecciona Propiedad</label>
                                <select
                                    className="w-full p-4 border rounded-xl font-bold bg-slate-50 outline-none focus:border-indigo-500 transition-colors"
                                    value={selectedPropertyId}
                                    onChange={e => setSelectedPropertyId(e.target.value)}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            {selectedPropertyId && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-400">Alojamientos a Incluir</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {apartments.map(apt => (
                                            <div key={apt.id}
                                                onClick={() => {
                                                    if (selectedApartmentIds.includes(apt.id)) setSelectedApartmentIds(selectedApartmentIds.filter(id => id !== apt.id));
                                                    else setSelectedApartmentIds([...selectedApartmentIds, apt.id]);
                                                }}
                                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedApartmentIds.includes(apt.id) ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <div className={`w-5 h-5 rounded flex items-center justify-center ${selectedApartmentIds.includes(apt.id) ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                                    {selectedApartmentIds.includes(apt.id) && <Check size={14} className="text-white" />}
                                                </div>
                                                <span className="font-bold text-slate-700 text-sm">{apt.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Phone size={20} /> 2. Datos de Contacto</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase text-slate-400">Email Público</label>
                                    <input value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} className="w-full p-3 border rounded-xl bg-slate-50 font-medium" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase text-slate-400">Teléfono / WhatsApp</label>
                                    <input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} className="w-full p-3 border rounded-xl bg-slate-50 font-medium" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase text-slate-400">Ubicación / Dirección</label>
                                <input value={contact.location} onChange={e => setContact({ ...contact, location: e.target.value })} className="w-full p-3 border rounded-xl bg-slate-50 font-medium" placeholder="Ej: Calle Mayor 1, Madrid" />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Palette size={20} /> 3. Estilo y Personalización</h3>

                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { id: 'MODERN', label: 'Moderno', color: 'bg-indigo-600', font: 'Inter' },
                                    { id: 'FAMILY', label: 'Familiar', color: 'bg-emerald-500', font: 'Nunito' },
                                    { id: 'PREMIUM', label: 'Premium', color: 'bg-slate-900', font: 'Serif' },
                                ].map(opt => (
                                    <div key={opt.id}
                                        onClick={() => setStyle(opt.id as StyleOption)}
                                        className={`p-6 rounded-2xl border cursor-pointer text-center transition-all ${style === opt.id ? 'border-indigo-600 ring-2 ring-indigo-100 ring-offset-2' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className={`w-12 h-12 ${opt.color} rounded-full mx-auto mb-3 shadow-lg`}></div>
                                        <div className="font-bold text-slate-700">{opt.label}</div>
                                        <div className="text-xs text-slate-400 mt-1">{opt.font}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400">Idioma Principal</label>
                                <div className="flex gap-4">
                                    <button onClick={() => setLanguage('ES')} className={`flex-1 p-3 rounded-xl border font-bold transition-all ${language === 'ES' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>Español</button>
                                    <button onClick={() => setLanguage('EN')} className={`flex-1 p-3 rounded-xl border font-bold transition-all ${language === 'EN' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>English</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300 text-center py-8">
                            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Globe size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800">¡Todo Listo!</h3>
                            <p className="text-slate-500 max-w-md mx-auto">
                                Vamos a generar tu sitio web <strong>{style}</strong> para <strong>{properties.find(p => p.id === selectedPropertyId)?.name}</strong> con <strong>{selectedApartmentIds.length}</strong> alojamientos.
                            </p>
                            <div className="flex justify-center gap-2 text-xs text-slate-400">
                                <span>SEO Optimizado ✓</span>
                                <span> • </span>
                                <span>Diseño Responsive ✓</span>
                                <span> • </span>
                                <span>Booking CTA ✓</span>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between">
                    {step > 1 ? (
                        <button onClick={() => setStep(step - 1)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">Atrás</button>
                    ) : (
                        <div></div>
                    )}

                    {step < 4 ? (
                        <button
                            disabled={!selectedPropertyId || (step === 1 && selectedApartmentIds.length === 0)}
                            onClick={() => setStep(step + 1)}
                            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            Siguiente <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-xl shadow-indigo-200 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            {loading ? 'Generando...' : 'Generar Mi Web'} <Wand2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
