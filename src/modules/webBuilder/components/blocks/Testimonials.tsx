import React from 'react';
import { Quote, Star } from 'lucide-react';

export const Testimonials: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, styles }) => {
    const title = data.title || "Lo que dicen de nosotros";
    const reviews = data.reviews || [
        {
            name: "María Gómez",
            location: "Madrid, ES",
            text: "Una experiencia inmejorable. El apartamento estaba impecable, con todas las comodidades y la ubicación perfecta. La atención fue de 10.",
            rating: 5
        },
        {
            name: "James Wilson",
            location: "Londres, UK",
            text: "Stunning views and an incredibly smooth check-in process. The host was very responsive and helpful. Would definitely return!",
            rating: 5
        },
        {
            name: "Laura Martínez",
            location: "Barcelona, ES",
            text: "Ideal para desconectar. Un entorno precioso, mucho silencio por las noches y cerca de todo lo interesante. Muy recomendable.",
            rating: 4
        }
    ];

    return (
        <section className="py-24 bg-white relative">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-50/50 -skew-x-12 transform origin-top hidden lg:block z-0"></div>

            <div className="container mx-auto px-6 relative z-10 text-center">
                <Quote size={64} className="mx-auto text-indigo-100 mb-6" />
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-16">{title}</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto text-left">
                    {reviews.map((r: any, i: number) => (
                        <div key={i} className="bg-slate-50 p-8 rounded-[2.5rem] relative group hover:-translate-y-2 transition-transform duration-300">
                            <div className="flex gap-1 mb-6 text-yellow-400">
                                {Array.from({ length: r.rating }).map((_, j) => <Star key={j} size={20} className="fill-current" />)}
                            </div>

                            <p className="text-lg text-slate-700 font-medium mb-8 italic leading-relaxed">
                                "{r.text}"
                            </p>

                            <div className="flex items-center gap-4 mt-auto">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-xl">
                                    {r.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{r.name}</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{r.location}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
