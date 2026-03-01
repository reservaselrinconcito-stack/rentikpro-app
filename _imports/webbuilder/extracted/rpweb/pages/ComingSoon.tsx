import React from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';

const ComingSoon: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/1920/1080?blur=10')] bg-cover bg-center"></div>
      
      <div className="relative z-10 max-w-2xl w-full bg-stone-800/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl border border-stone-700 shadow-2xl text-center">
        <span className="inline-block bg-orange-900/50 text-orange-400 border border-orange-800/50 px-3 py-1 rounded-full text-xs font-bold mb-6">
          Próxima Apertura 2024
        </span>
        <h1 className="font-serif text-4xl md:text-5xl text-white mb-4">La Cabaña del Bosque</h1>
        <p className="text-stone-300 text-lg mb-8">
          Estamos construyendo algo único. Una cabaña sostenible integrada totalmente en el pinar, 
          con techo de cristal para dormir bajo las estrellas.
        </p>

        <form className="max-w-md mx-auto flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
          <input 
            type="email" 
            placeholder="Tu email..." 
            className="flex-grow px-5 py-3 rounded-xl bg-stone-900 border border-stone-600 text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
          />
          <button className="bg-orange-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
            Avísame <Send size={16}/>
          </button>
        </form>
        <p className="text-xs text-stone-500 mt-4">
          Sé el primero en reservar. Sin spam, solo buenas noticias.
        </p>
        
        <div className="mt-8 pt-8 border-t border-stone-700">
           <Link to="/" className="text-stone-400 hover:text-white transition-colors text-sm">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;