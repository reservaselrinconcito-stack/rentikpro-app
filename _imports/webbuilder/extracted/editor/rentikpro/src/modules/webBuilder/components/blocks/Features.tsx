import React from 'react';
import { CheckCircle2, CheckSquare } from 'lucide-react';

export const Features: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, styles, variant = 'A' }) => {
    const title = data.title || "¿Por qué elegirnos?";
    const features = data.features || [
        "Ubicaciones premium en el centro de la ciudad",
        "Limpieza profesional garantizada cada estancia",
        "Atención personalizada las 24 horas del día",
        "WiFi de alta velocidad perfecto para trabajar",
        "Check-in automatizado sin contacto",
        "Cocinas completamente equipadas"
    ];
    const image = data.imageUrl || 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?q=80&w=800&auto=format&fit=crop';

    const imageFocal = data.imageFocal || { x: 50, y: 50 };
    const imageFit = data.imageFit || 'cover';
    const imageStyle = {
        objectPosition: `${imageFocal.x}% ${imageFocal.y}%`,
        objectFit: imageFit as any
    };

    if (variant === 'B') {
        // Grid Variant
        return (
            <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">{title}</h2>
                        <p className="text-slate-400 font-medium">Todo listo para que disfrutes de tu estadía sin preocupaciones.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {features.map((feature: string, idx: number) => (
                            <div key={idx} className="bg-slate-800 border border-slate-700 p-8 rounded-3xl hover:-translate-y-2 transition-transform shadow-xl flex items-start gap-4">
                                <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-400 flex-shrink-0">
                                    <CheckSquare size={24} />
                                </div>
                                <p className="text-lg font-bold leading-relaxed">{feature}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Default Variant A (Image + List)
    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16 max-w-7xl mx-auto">

                    {/* Image Side */}
                    <div className="w-full lg:w-1/2 relative">
                        <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl shadow-indigo-200/50 aspect-square md:aspect-[4/3] lg:aspect-auto lg:h-[600px]">
                            <img src={image} className="w-full h-full" style={imageStyle} alt="Features" />
                        </div>
                        {/* Decorative blob behind image */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-50 rounded-full blur-3xl -z-10 opacity-70"></div>
                    </div>

                    {/* Content Side */}
                    <div className="w-full lg:w-1/2">
                        <span className="text-indigo-600 font-bold tracking-widest uppercase text-sm mb-4 block">Nuestra Promesa</span>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">{title}</h2>

                        <div className="space-y-6">
                            {features.map((feature: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                                    <div className="mt-1 bg-indigo-100 text-indigo-600 rounded-full p-1 flex-shrink-0">
                                        <CheckCircle2 size={20} className="fill-indigo-50" />
                                    </div>
                                    <p className="text-lg text-slate-700 font-medium leading-relaxed">{feature}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
