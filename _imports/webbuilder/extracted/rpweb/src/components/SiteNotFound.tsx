import React from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SiteNotFound: React.FC<{ slug?: string }> = ({ slug }) => {
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center font-sans">
            <div className="max-w-md w-full">
                <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-full bg-rose-50 text-rose-600">
                    <AlertCircle size={48} />
                </div>

                <h1 className="text-4xl font-serif text-stone-900 mb-4">404 - No Encontrado</h1>
                <p className="text-stone-500 font-light mb-8 text-lg">
                    No hemos podido encontrar el sitio solicitado: <br />
                    <span className="font-bold text-stone-800 break-all">"{slug || 'desconocido'}"</span>
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-100 text-stone-800 py-4 px-6 rounded-2xl border border-stone-200 shadow-sm transition-all font-bold"
                    >
                        <RefreshCw size={20} /> Reintentar Carga
                    </button>

                    <Link
                        to="/"
                        className="w-full flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-700 text-white py-4 px-6 rounded-2xl shadow-lg shadow-orange-200 transition-all font-bold"
                    >
                        <Home size={20} /> Volver al Inicio
                    </Link>
                </div>

                <p className="mt-12 text-stone-400 text-xs">
                    Si crees que esto es un error, contacta con soporte de RentikPro.
                </p>
            </div>
        </div>
    );
};
