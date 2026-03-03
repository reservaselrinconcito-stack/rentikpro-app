import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Wifi, CheckCircle, Shield, MapPin, Calendar } from 'lucide-react';
import { APARTMENTS } from '../constants';
import { RentikBadge } from '../components/RentikBadge';

const ApartmentDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const apartment = APARTMENTS.find(a => a.slug === slug);

  if (!apartment) {
    return <div className="p-20 text-center">Apartamento no encontrado. <Link to="/apartamentos" className="text-orange-700">Volver</Link></div>;
  }

  return (
    <div className="bg-stone-50 pb-20">
      {/* Header Image */}
      <div className="relative h-[60vh] w-full">
        <img src={apartment.imageUrl} alt={apartment.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16">
          <div className="max-w-7xl mx-auto">
            <RentikBadge className="mb-4 bg-white/20 text-white backdrop-blur-md border-transparent" />
            <h1 className="font-serif text-4xl md:text-6xl text-white font-bold">{apartment.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        <div className="grid lg:grid-cols-3 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl mb-8">
              <div className="flex justify-between items-start mb-8 border-b border-stone-100 pb-8">
                <div>
                  <h2 className="text-2xl font-serif text-stone-900 mb-2">Descripción</h2>
                  <p className="text-stone-600 leading-relaxed text-lg">
                    {apartment.description}
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-serif text-stone-900 mb-6">Comodidades Premium</h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {apartment.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-stone-600">
                    <CheckCircle size={18} className="text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Tech Highlight */}
              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                <div className="flex items-center gap-3 mb-3">
                  <Shield size={20} className="text-emerald-700" />
                  <h4 className="font-bold text-stone-800">Estancia Gestionada por RentikPro</h4>
                </div>
                <p className="text-sm text-stone-500 mb-4">
                  Disfruta de una experiencia sin llaves físicas. Recibirás tu código de acceso digital 24h antes de tu llegada.
                  Cualquier incidencia se gestiona al instante desde nuestro chatbot inteligente.
                </p>
                <Link to="/rentikpro" className="text-xs font-semibold text-emerald-700 uppercase tracking-wider hover:underline">
                  Saber más sobre la tecnología
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar Booking */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-8 shadow-xl sticky top-24">
              <div className="flex justify-between items-end mb-6">
                <span className="text-3xl font-serif font-bold text-stone-900">{apartment.price}€</span>
                <span className="text-stone-500 mb-1">/ noche</span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="border border-stone-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-orange-300 transition-colors">
                  <span className="text-stone-500 text-sm">Fechas</span>
                  <Calendar size={18} className="text-stone-400" />
                </div>
                <div className="border border-stone-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-orange-300 transition-colors">
                  <span className="text-stone-500 text-sm">Huéspedes</span>
                  <span className="text-stone-900 font-medium">{apartment.capacity} Adultos</span>
                </div>
              </div>

              <button className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-900/20 mb-4">
                Reservar Ahora
              </button>
              
              <p className="text-xs text-center text-stone-400">
                No se te cobrará nada todavía. <br/>
                Gestión segura via motor RentikPro.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ApartmentDetail;