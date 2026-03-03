import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export const Location: React.FC<{ data: any; styles?: any; variant?: string; theme?: any }> = ({ data, styles }) => {
    const title = data.title || "Dónde encontrarnos";
    const address = data.address || "Calle Principal 123, 28001 Madrid, España";
    const description = data.description || "A solo 5 minutos andando de las principales atracciones turísticas y con fácil acceso al transporte público.";
    const embedUrl = data.mapEmbedUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12148.8898950567!2d-3.71261!3d40.418464!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd422997800a3c81%3A0xc436dec1618c2269!2sMadrid!5e0!3m2!1sen!2ses!4v1699999999999!5m2!1sen!2ses";

    return (
        <section className="py-24 bg-white relative">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row gap-16 max-w-7xl mx-auto items-center">

                    {/* Map Side */}
                    <div className="w-full lg:w-3/5">
                        <div className="bg-slate-100 rounded-[3rem] p-4 shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-indigo-600/10 pointer-events-none z-10 group-hover:bg-transparent transition-colors duration-500"></div>
                            <iframe
                                src={embedUrl}
                                className="w-full aspect-[4/3] rounded-[2.5rem] border-0 grayscale group-hover:grayscale-0 transition-all duration-700"
                                allowFullScreen={false}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Map"
                            ></iframe>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="w-full lg:w-2/5">
                        <div className="mb-8 p-6 bg-slate-50 rounded-3xl inline-flex text-indigo-600">
                            <MapPin size={48} />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">{title}</h2>

                        <p className="text-xl text-slate-600 font-medium mb-8 leading-relaxed">
                            {description}
                        </p>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                            <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-2">Dirección</h4>
                            <p className="text-lg font-black text-slate-800">{address}</p>
                        </div>

                        <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black hover:bg-slate-900 transition-colors shadow-xl shadow-indigo-200 inline-flex items-center gap-3"
                        >
                            Cómo Llegar <Navigation size={20} className="fill-indigo-400 text-indigo-400" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};
