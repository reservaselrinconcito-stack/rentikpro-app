import React from 'react';
import { MapPin, Users, Bed, Wifi, ChevronRight } from 'lucide-react';

export const ApartmentsGrid: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, styles }) => {
    const title = data.title || "Nuestros Alojamientos";
    const subtitle = data.subtitle || "Encuentra el lugar perfecto para tu próxima escapada con todas las comodidades.";

    // Mock data for preview, in real environment this would be populated from properties list
    const items = data.items || [
        {
            id: '1', title: 'Ático con Vistas al Mar', location: 'Centro Histórico',
            guests: 4, bedrooms: 2, price: '120€',
            image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=800&auto=format&fit=crop'
        },
        {
            id: '2', title: 'Villa Rústica con Piscina', location: 'Montaña',
            guests: 8, bedrooms: 4, price: '250€',
            image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=800&auto=format&fit=crop'
        },
        {
            id: '3', title: 'Estudio Moderno', location: 'Zona de Negocios',
            guests: 2, bedrooms: 1, price: '85€',
            image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop'
        }
    ];

    return (
        <section className="py-24 bg-slate-50 relative" id="apartments">
            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">{title}</h2>
                    <p className="text-lg text-slate-600 font-medium">{subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {items.map((item: any) => (
                        <div key={item.id} className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col">
                            {/* Image Wrapper */}
                            <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg font-black text-slate-900 z-10">
                                    {item.price}
                                    {item.price !== 'Consultar' && <span className="text-xs font-bold text-slate-500 font-sans">/noche</span>}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 flex flex-col flex-1">
                                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                                    <MapPin size={14} /> {item.location}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4 line-clamp-2">{item.title}</h3>

                                {/* Amenities Mini-grid */}
                                <div className="flex items-center gap-4 text-sm font-bold text-slate-500 mb-8 pb-8 border-b border-slate-100 mt-auto">
                                    <div className="flex items-center gap-1.5"><Users size={16} className="text-slate-400" /> {item.guests} </div>
                                    <div className="flex items-center gap-1.5"><Bed size={16} className="text-slate-400" /> {item.bedrooms} </div>
                                    <div className="flex items-center gap-1.5"><Wifi size={16} className="text-slate-400" /> WiFi</div>
                                </div>

                                <button className="w-full bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 py-4 rounded-xl font-black transition-colors flex items-center justify-center gap-2 group-hover:bg-slate-900 group-hover:text-white">
                                    Ver Disponibilidad <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
