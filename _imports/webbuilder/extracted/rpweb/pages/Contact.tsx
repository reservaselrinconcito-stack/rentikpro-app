import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="bg-stone-50 min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-stone-900 mb-8 text-center">Contacta con nosotros</h1>
        
        <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12">
           <form className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                 <label className="block text-sm font-medium text-stone-700 mb-2">Nombre</label>
                 <input type="text" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-orange-400 transition-colors" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-stone-700 mb-2">Email</label>
                 <input type="email" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-orange-400 transition-colors" />
               </div>
             </div>
             <div>
               <label className="block text-sm font-medium text-stone-700 mb-2">Mensaje</label>
               <textarea rows={4} className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-orange-400 transition-colors"></textarea>
             </div>
             <button type="button" className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl hover:bg-stone-800 transition-colors">
               Enviar Mensaje
             </button>
           </form>
           
           <div className="mt-8 text-center">
             <p className="text-stone-500 text-sm">
               ¿Duda urgente sobre una reserva existente? <br/>
               Utiliza el chat de <strong>RentikPro</strong> en tu confirmación de reserva.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;