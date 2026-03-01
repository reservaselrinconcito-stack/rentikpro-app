import React from 'react';

export const Gallery: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, styles, variant = 'A' }) => {
    const title = data.title || "Galería";
    const images = data.images || [
        'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1c24240f38?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop',
    ];

    if (variant === 'B') {
        // Uniform Grid Variant
        return (
            <section className="py-24 bg-white relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16 max-w-2xl mx-auto">
                        <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs mb-2 block">Imágenes Exclusivas</span>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">{title}</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        {images.map((img: string, idx: number) => (
                            <div key={idx} className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg group">
                                <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )
    }

    // Default Variant A (Masonry)
    return (
        <section className="py-24 bg-slate-50 relative border-t border-slate-100">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">{title}</h2>
                    <p className="text-lg text-slate-600 font-medium">Conoce cada rincón de nuestros espacios antes de visitarnos.</p>
                </div>

                {/* Masonry/Grid Layout */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[300px]">
                    {images.map((img: string, idx: number) => {
                        // Make the first image span 2 rows/cols for visual impact
                        const isFeatured = idx === 0;
                        return (
                            <div
                                key={idx}
                                className={`relative rounded-3xl overflow-hidden shadow-md group ${isFeatured ? 'col-span-2 row-span-2' : ''}`}
                            >
                                <img
                                    src={img}
                                    alt={`Gallery image ${idx + 1}`}
                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors duration-500"></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
