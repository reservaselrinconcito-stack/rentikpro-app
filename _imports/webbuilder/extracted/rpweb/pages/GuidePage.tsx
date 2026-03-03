import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { GUIDES } from '../constants';
import { ArrowLeft } from 'lucide-react';

const GuidePage: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  
  if (!type || !GUIDES[type]) {
    return <Navigate to="/" replace />;
  }

  const data = GUIDES[type];

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="relative h-[50vh]">
        <img src={data.imageUrl} alt={data.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-stone-900/50"></div>
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16">
          <div className="max-w-4xl mx-auto">
            <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-6 text-sm transition-colors">
               <ArrowLeft size={16} className="mr-2" /> Volver al inicio
            </Link>
            <h1 className="font-serif text-4xl md:text-6xl text-white font-bold mb-2">{data.title}</h1>
            <p className="text-xl text-stone-200 font-light">{data.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="prose prose-stone prose-lg">
           <p className="lead text-2xl text-stone-800 font-serif leading-relaxed mb-8">
             {data.content}
           </p>
           {/* Placeholder for more extended content */}
           <p className="text-stone-600 mb-6">
             En El Rinconcito Matarraña, creemos que la experiencia rural debe ser inmersiva. 
             Por eso hemos preparado esta guía para que aproveches al máximo tu estancia en Fuentespalda.
           </p>
           <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 my-8">
             <h3 className="font-serif text-xl text-orange-900 mb-2">¿Sabías qué?</h3>
             <p className="text-orange-800 text-sm">
               Puedes consultar información detallada sobre este tema preguntando a nuestro asistente virtual RentikPro una vez confirmes tu reserva.
             </p>
           </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-stone-200">
           <h4 className="font-bold text-stone-900 mb-4">Otras guías de interés</h4>
           <div className="flex flex-wrap gap-3">
              {Object.keys(GUIDES).filter(k => k !== type).map(k => (
                <Link key={k} to={`/guias/${k}`} className="bg-white border border-stone-200 px-4 py-2 rounded-full text-sm text-stone-600 hover:border-orange-300 hover:text-orange-700 transition-colors">
                  {GUIDES[k].title}
                </Link>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default GuidePage;