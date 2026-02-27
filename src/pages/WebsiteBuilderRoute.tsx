/**
 * src/pages/WebsiteBuilderRoute.tsx
 *
 * Thin route wrapper that gates on the "web_builder" feature flag.
 * Import this in your main router (App.tsx / Router.tsx):
 *
 *   import { WebsiteBuilderRoute } from './pages/WebsiteBuilderRoute';
 *   // ...
 *   <Route path="/website-builder" element={<WebsiteBuilderRoute />} />
 *
 * If you use a NavBar/Sidebar component, add an entry like:
 *   { icon: Globe, label: 'Website Builder', path: '/website-builder' }
 */

import React, { Suspense } from 'react';
import { WebsiteBuilder } from './WebsiteBuilder';
import { Loader2, AlertCircle, RefreshCcw, Home } from 'lucide-react';

/**
 * Robust Error Boundary for the Website Builder Route
 */
class RouteErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            const isChunkError = this.state.error?.name === 'ChunkLoadError' ||
                (this.state.error?.message && this.state.error.message.includes('Loading chunk'));

            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">
                        {isChunkError ? 'Error de Conexión' : 'Opps! Algo salió mal'}
                    </h2>
                    <p className="text-slate-500 max-w-md mb-8">
                        {isChunkError
                            ? 'No se pudieron cargar los archivos necesarios. Esto suele ocurrir tras una actualización o por una conexión inestable.'
                            : 'El editor web ha experimentado un error inesperado al cargar.'}
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            <RefreshCcw size={18} /> Reintentar
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
                        >
                            <Home size={18} /> Volver al Inicio
                        </button>
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                        <pre className="mt-8 p-4 bg-slate-900 text-slate-300 text-[10px] rounded-lg text-left max-w-2xl overflow-auto border border-slate-800">
                            {this.state.error?.stack || String(this.state.error)}
                        </pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

const LoadingFallback = () => (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
            <Loader2 className="animate-spin" size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-1">Cargando Editor Ferrari</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Iniciando motores v3...</p>
    </div>
);

const WebsiteBuilderRoute: React.FC = () => {
    return (
        <RouteErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
                <WebsiteBuilder />
            </Suspense>
        </RouteErrorBoundary>
    );
};

export default WebsiteBuilderRoute;
