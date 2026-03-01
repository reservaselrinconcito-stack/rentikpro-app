import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Layout, ArrowRight } from 'lucide-react';
import { APARTMENTS } from '../constants';

const Apartments: React.FC = () => {
  return (
    <div className="bg-stone-50 min-h-screen pt-12 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">Nuestros Alojamientos</h1>
          <p className="text-stone-600 max-w-2xl mx-auto">
            Cada rincón ha sido restaurado con materiales nobles y equipado con la última tecnología domótica de RentikPro para garantizar tu confort.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {APARTMENTS.map((apt) => (
            <div key={apt.id} className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group">
              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={apt.imageUrl} 
                  alt={apt.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full font-bold text-stone-900 shadow-sm">
                  {apt.price}€ <span className="text-xs font-normal text-stone-500">/ noche</span>
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex gap-4 mb-4 text-stone-500 text-sm">
                  <span className="flex items-center gap-1 bg-stone-100 px-3 py-1 rounded-full">
                    <Users size={16} /> {apt.capacity} Huéspedes
                  </span>
                  <span className="flex items-center gap-1 bg-stone-100 px-3 py-1 rounded-full">
                    <Layout size={16} /> {apt.rooms} Hab.
                  </span>
                </div>

                <h2 className="font-serif text-2xl text-stone-900 mb-3">{apt.name}</h2>
                <p className="text-stone-600 mb-6 leading-relaxed">
                  {apt.shortDescription}
                </p>

                <div className="flex items-center justify-between border-t border-stone-100 pt-6">
                  <div className="flex flex-wrap gap-2 max-w-[70%]">
                    {apt.features.slice(0, 3).map((feat, i) => (
                      <span key={i} className="text-xs text-stone-400">• {feat}</span>
                    ))}
                  </div>
                  <Link 
                    to={`/apartamentos/${apt.slug}`}
                    className="flex items-center justify-center w-12 h-12 bg-stone-900 rounded-full text-white hover:bg-orange-700 transition-colors"
                  >
                    <ArrowRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {/* Coming Soon Card */}
          <Link to="/proximamente" className="block relative bg-stone-200 rounded-3xl overflow-hidden min-h-[400px] flex items-center justify-center group cursor-pointer border-2 border-dashed border-stone-300 hover:border-orange-300 transition-all">
            <div className="text-center p-8">
               <span className="block text-4xl mb-4 opacity-30">✨</span>
               <h3 className="font-serif text-2xl text-stone-500 mb-2">La Cabaña del Bosque</h3>
               <p className="text-stone-400 mb-6">Próximamente</p>
               <span className="inline-block px-6 py-2 border border-stone-400 rounded-full text-stone-500 text-sm group-hover:bg-stone-800 group-hover:text-white group-hover:border-stone-800 transition-all">
                 Unirse a lista de espera
               </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Apartments;