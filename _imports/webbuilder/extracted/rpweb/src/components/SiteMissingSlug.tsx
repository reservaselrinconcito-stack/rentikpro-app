import React from 'react';
import { Rocket, ArrowRight, Play } from 'lucide-react';

export const SiteMissingSlug: React.FC = () => {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-orange-100">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500" />

            <div className="max-w-2xl w-full">
                <div className="mb-12 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-orange-50 text-orange-600 ring-8 ring-orange-50/50">
                    <Rocket size={40} className="animate-pulse" />
                </div>

                <h1 className="text-5xl font-black text-stone-900 mb-6 tracking-tight leading-tight">
                    Tu sitio premium <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-600">
                        está casi listo.
                    </span>
                </h1>

                <p className="text-xl text-stone-500 font-light mb-12 max-w-lg mx-auto leading-relaxed">
                    Solo falta identificar qué negocio quieres visualizar. Elige una de las siguientes opciones para comenzar la experiencia.
                </p>

                <div className="grid md:grid-cols-2 gap-6 text-left">
                    <div className="group bg-stone-50 hover:bg-white p-8 rounded-[2.5rem] border border-stone-100 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-100 transition-all duration-500 cursor-pointer">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                            <Play size={24} className="text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-stone-900 mb-2">Ver Demo Mode</h3>
                        <p className="text-sm text-stone-500 mb-6 leading-relaxed">Explora todas las funcionalidades premium con datos de ejemplo cuidadosamente curados.</p>
                        <a href="/?slug=pepito" className="inline-flex items-center text-orange-600 font-bold group/link">
                            Lanzar Demo <ArrowRight size={18} className="ml-2 group-hover/link:translate-x-1 transition-transform" />
                        </a>
                    </div>

                    <div className="group bg-stone-900 p-8 rounded-[2.5rem] border border-stone-800 hover:shadow-2xl hover:shadow-stone-200 transition-all duration-500">
                        <div className="w-12 h-12 bg-stone-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                            <Rocket size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Usar tu propio Slug</h3>
                        <p className="text-sm text-stone-400 mb-6 leading-relaxed">Si ya tienes una cuenta en RentikPro, usa tu slug personalizado en la URL.</p>
                        <div className="bg-stone-800 p-3 rounded-xl text-[10px] font-mono text-stone-300 border border-stone-700">
                            {window.location.origin}/tu-slug
                        </div>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-stone-100 flex flex-col items-center gap-4">
                    <p className="text-xs text-stone-400 uppercase tracking-widest font-black">Powered by RentikPro Public Engine</p>
                </div>
            </div>
        </div>
    );
};
