import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WebsiteBuilder: React.FC = () => {
   const navigate = useNavigate();

   return (
      <div className="p-8 max-w-4xl mx-auto">
         <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-8 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
            Volver
         </button>

         <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Constructor Web en Mantenimiento</h1>
            <p className="text-slate-600 mb-8">
               Estamos actualizando la infraestructura para soportar sitios web multi-tenant de alto rendimiento.
               El editor antiguo ha sido desactivado temporalmente mientras migramos al nuevo sistema de plantillas.
            </p>
            <div className="inline-block bg-indigo-50 text-indigo-700 px-6 py-3 rounded-lg font-medium">
               Upgrade en curso: v2 Public Website Engine
            </div>
         </div>
      </div>
   );
};
