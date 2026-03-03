import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; fallbackTitle?: string; }
interface State { hasError: boolean; error: string; }

export class BuilderErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: '' };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error: error.message || 'Error desconocido' };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[BuilderErrorBoundary]', error, info);
    }

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-12 text-center bg-white">
                <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6 border-2 border-rose-200">
                    <span className="text-4xl">⚠️</span>
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">
                    {this.props.fallbackTitle ?? 'Error al cargar el editor'}
                </h2>
                <p className="text-sm text-rose-500 font-mono bg-rose-50 rounded-xl px-4 py-2 max-w-md mb-6 break-all">
                    {this.state.error}
                </p>
                <button
                    onClick={() => { this.setState({ hasError: false, error: '' }); window.location.reload(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl transition-colors shadow-lg"
                >
                    <RefreshCw size={14} /> Reintentar
                </button>
            </div>
        );
    }
}
