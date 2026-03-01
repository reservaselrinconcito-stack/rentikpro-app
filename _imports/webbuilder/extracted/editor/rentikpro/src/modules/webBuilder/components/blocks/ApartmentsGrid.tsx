import React from 'react';
import { MapPin, Users, Bed, ChevronRight, Home } from 'lucide-react';

/**
 * ApartmentsGrid — bloque de listado de apartamentos.
 *
 * data.items se auto-rellena en generateConfigFromProperty()
 * a partir de projectManager.getStore().loadPropertySnapshot(propertyId).
 *
 * Si items está vacío muestra placeholders de demo para el editor.
 */
export const ApartmentsGrid: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, theme }) => {
    const title = data?.title ?? 'Nuestros Alojamientos';
    const subtitle = data?.subtitle ?? 'Encuentra el lugar perfecto para tu próxima escapada.';
    const primary = theme?.colors?.primary ?? '#4f46e5';

    const items = (data?.items ?? []).length > 0 ? data.items : [
        { id: 'd1', name: 'Apartamento Centro', location: 'Centro Histórico', guests: 4, bedrooms: 2, price: '120€', image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=800&auto=format&fit=crop' },
        { id: 'd2', name: 'Villa con Piscina', location: 'Montaña', guests: 8, bedrooms: 4, price: '250€', image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=800&auto=format&fit=crop' },
        { id: 'd3', name: 'Estudio Moderno', location: 'Puerto', guests: 2, bedrooms: 1, price: '85€', image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop' },
    ];

    return (
        <section className="py-24 bg-gray-50" id="apartments">
            <div className="container mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">{title}</h2>
                    <p className="text-lg text-gray-600">{subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {items.map((item: any) => (
                        <div key={item.id} className="bg-white rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col">
                            <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Home size={48} className="opacity-20" /></div>
                                )}
                                {item.price && (
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg font-black text-gray-900">
                                        {item.price}<span className="text-xs font-bold text-gray-500">/noche</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-8 flex flex-col flex-1">
                                {item.location && (
                                    <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider mb-3" style={{ color: primary }}>
                                        <MapPin size={14} /> {item.location}
                                    </div>
                                )}
                                <h3 className="text-2xl font-black text-gray-900 mb-4 line-clamp-2">{item.name}</h3>
                                {item.description && <p className="text-sm text-gray-500 mb-4 line-clamp-2">{item.description}</p>}
                                <div className="flex items-center gap-4 text-sm font-bold text-gray-500 mb-8 pb-8 border-b border-gray-100 mt-auto">
                                    {item.guests != null && <span className="flex items-center gap-1.5"><Users size={16} className="text-gray-400" /> {item.guests}</span>}
                                    {item.bedrooms != null && <span className="flex items-center gap-1.5"><Bed size={16} className="text-gray-400" /> {item.bedrooms}</span>}
                                </div>
                                <button className="w-full py-4 rounded-xl font-black transition-colors flex items-center justify-center gap-2 text-sm" style={{ backgroundColor: primary + '18', color: primary }}>
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
