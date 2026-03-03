import React from 'react';
import { Smartphone, Clock, Shield, Key } from 'lucide-react';
import { ENV } from '../constants';

const RentikPro: React.FC = () => {
  return (
    <div className="bg-stone-900 text-stone-300 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
           <div className="inline-block mb-4">
             <span className="font-bold text-3xl text-white tracking-tight">RentikPro</span>
             <span className="text-emerald-500 font-bold text-3xl">.</span>
           </div>
           <h1 className="text-4xl md:text-6xl font-serif text-white mb-6">La hospitalidad del futuro <br/>es invisible.</h1>
           <p className="text-xl text-stone-400 max-w-2xl mx-auto">
             El Rinconcito Matarraña confía en RentikPro para ofrecerte una experiencia fluida, segura y personalizada.
           </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {[
            { icon: Key, title: "Smart Access", desc: "Olvídate de las llaves. Accede con un código seguro único para tu estancia." },
            { icon: Clock, title: "24/7 Support", desc: "Asistencia inmediata en cualquier momento a través del Chatbot inteligente." },
            { icon: Smartphone, title: "Guest App", desc: "Guías, recomendaciones y control domótico desde tu móvil. Sin descargas." },
            { icon: Shield, title: "Pagos Seguros", desc: "Pasarela de pagos encriptada y gestión de reservas transparente." }
          ].map((item, i) => (
            <div key={i} className="bg-stone-800/50 p-8 rounded-3xl border border-stone-700 hover:bg-stone-800 transition-colors">
               <item.icon size={32} className="text-emerald-500 mb-6" />
               <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
               <p className="text-sm text-stone-400">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-emerald-900 to-stone-900 rounded-3xl p-8 md:p-16 text-center border border-emerald-800/50">
           <h2 className="text-3xl font-serif text-white mb-6">¿Eres propietario de un alojamiento rural?</h2>
           <p className="text-stone-300 mb-8 max-w-xl mx-auto">
             Descubre cómo RentikPro puede transformar la gestión de tu negocio, automatizando procesos y mejorando la experiencia del huésped.
           </p>
           <a 
             href={ENV.RENTIKPRO_WEB_BASE} 
             target="_blank" 
             rel="noopener noreferrer"
             className="inline-block bg-white text-stone-900 px-8 py-4 rounded-full font-bold hover:bg-emerald-50 transition-colors"
           >
             Visitar RentikPro Web
           </a>
        </div>
      </div>
    </div>
  );
};

export default RentikPro;