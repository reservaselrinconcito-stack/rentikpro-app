import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Leaf, Wifi, Coffee } from 'lucide-react';
import { WeatherWidget } from '../components/WeatherWidget';
import { APARTMENTS } from '../constants';
import { RentikBadge } from '../components/RentikBadge';

const Home: React.FC = () => {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src="https://picsum.photos/1920/1080?random=20" 
            alt="Vistas del Matarraña" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-stone-900/40"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent opacity-90"></div>
        </div>

        {/* Content Container */}
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-24 md:pb-32">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            {/* Left Text */}
            <div className="lg:col-span-8">
              <RentikBadge className="mb-6 border-white/30 text-white bg-white/10 hover:bg-white/20" />
              <h1 className="font-serif text-5xl md:text-7xl text-white font-bold leading-tight mb-6">
                Desconexión <br/> <span className="text-orange-200 italic">Pura y Natural.</span>
              </h1>
              <p className="text-lg md:text-xl text-stone-200 max-w-2xl mb-8 font-light">
                Descubre el silencio en Fuentespalda. Apartamentos rurales de diseño con tecnología invisible para tu confort absoluto.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  to="/apartamentos" 
                  className="bg-orange-700 text-white px-8 py-4 rounded-full font-medium hover:bg-orange-800 transition-all shadow-lg hover:shadow-orange-900/20"
                >
                  Ver Apartamentos
                </Link>
                <Link 
                  to="/guias/calidad-aire" 
                  className="bg-white/10 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full font-medium hover:bg-white/20 transition-all"
                >
                  Nuestra Filosofía
                </Link>
              </div>
            </div>

            {/* Right Widget - Floating */}
            <div className="lg:col-span-4 hidden lg:block">
              <div className="transform transition-transform hover:-translate-y-2 duration-300">
                <WeatherWidget />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Widget Section */}
      <section className="lg:hidden px-4 -mt-16 relative z-10 mb-12">
        <WeatherWidget />
      </section>

      {/* Introduction */}
      <section className="py-20 bg-stone-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-orange-700 font-medium tracking-wider text-sm uppercase mb-4 block">Matarraña Experience</span>
          <h2 className="font-serif text-4xl text-stone-900 mb-6">Lujo no es tener cosas, es tener tiempo y espacio.</h2>
          <p className="text-stone-600 text-lg leading-relaxed">
            En "El Rinconcito", fusionamos la arquitectura tradicional de piedra con interiores contemporáneos y cálidos. 
            Gestionados por <strong>RentikPro</strong>, te garantizamos una estancia sin fricciones: check-in digital, 
            atención 24/7 y una casa que te espera a la temperatura perfecta.
          </p>
        </div>
      </section>

      {/* Featured Apartments */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
               <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-2">Nuestros Espacios</h2>
               <p className="text-stone-500">Diseñados para el descanso.</p>
            </div>
            <Link to="/apartamentos" className="hidden md:flex items-center gap-2 text-orange-700 font-medium hover:underline">
              Ver todos <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {APARTMENTS.slice(0, 2).map((apt) => (
              <Link to={`/apartamentos/${apt.slug}`} key={apt.id} className="group block">
                <div className="relative overflow-hidden rounded-3xl aspect-[4/3] mb-6">
                  <img 
                    src={apt.imageUrl} 
                    alt={apt.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-stone-800">
                    Desde {apt.price}€/noche
                  </div>
                </div>
                <h3 className="font-serif text-2xl text-stone-900 mb-2 group-hover:text-orange-700 transition-colors">{apt.name}</h3>
                <p className="text-stone-500 mb-4 line-clamp-2">{apt.shortDescription}</p>
                <div className="flex gap-4 text-sm text-stone-400">
                   <span className="flex items-center gap-1"><Star size={14} className="text-orange-400 fill-orange-400"/> 4.98</span>
                   <span>• {apt.capacity} Personas</span>
                   <span>• {apt.rooms} Habitaciones</span>
                </div>
              </Link>
            ))}
          </div>
          
          <div className="mt-8 text-center md:hidden">
            <Link to="/apartamentos" className="inline-flex items-center gap-2 text-orange-700 font-medium hover:underline">
              Ver todos los apartamentos <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* RentikPro Integration Showcase */}
      <section className="py-24 bg-stone-900 text-stone-300 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-900/20 to-transparent"></div>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-block bg-emerald-900/50 border border-emerald-800 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold mb-6">
                  POWERED BY RENTIKPRO
                </div>
                <h2 className="font-serif text-3xl md:text-4xl text-white mb-6">
                  Tecnología Invisible <br/> Confort Tangible
                </h2>
                <p className="text-lg text-stone-400 mb-8">
                  Tu descanso es sagrado. Por eso utilizamos RentikPro para gestionar todo lo que no ves, 
                  para que disfrutes de lo que sientes.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    { icon: Wifi, text: "Wifi 5G de alta velocidad dedicado" },
                    { icon: Leaf, text: "Climatización inteligente pre-llegada" },
                    { icon: Coffee, text: "Concierge digital 24/7 en tu móvil" }
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-4">
                      <div className="bg-stone-800 p-2 rounded-lg text-orange-500">
                        <item.icon size={20} />
                      </div>
                      <span className="font-medium">{item.text}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/rentikpro" className="text-white border-b border-orange-500 pb-1 hover:text-orange-500 transition-colors">
                  Descubre cómo funciona nuestra gestión inteligente
                </Link>
              </div>
              <div className="relative">
                 {/* Mockup of App Interface */}
                 <div className="bg-stone-800 border border-stone-700 rounded-3xl p-6 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="flex justify-between items-center mb-6 border-b border-stone-700 pb-4">
                      <span className="font-bold text-white">Mi Estancia</span>
                      <span className="text-emerald-500 text-xs bg-emerald-900/30 px-2 py-1 rounded">Activa</span>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-stone-700/50 p-4 rounded-xl flex justify-between items-center">
                        <span className="text-sm">Código de Acceso</span>
                        <span className="font-mono text-xl text-white tracking-widest">8492 #</span>
                      </div>
                      <div className="bg-stone-700/50 p-4 rounded-xl">
                        <span className="text-sm block mb-2">Clima</span>
                        <div className="flex justify-between items-end">
                           <span className="text-2xl text-white">21.5°C</span>
                           <span className="text-xs text-stone-400">Ajustando...</span>
                        </div>
                      </div>
                      <div className="bg-orange-600 p-4 rounded-xl text-white text-center font-medium cursor-pointer hover:bg-orange-700">
                        Chat con Recepción
                      </div>
                    </div>
                 </div>
              </div>
            </div>
         </div>
      </section>
    </div>
  );
};

export default Home;