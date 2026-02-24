import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  onError?: (error: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare props to avoid TS error
  declare props: Readonly<ErrorBoundaryProps>;

  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      console.groupCollapsed('[ErrorBoundary] Uncaught React error');
      console.error(error);
      console.log('componentStack:', errorInfo.componentStack);
      console.groupEnd();
    } catch {
      console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  private handleWindowError = (event: ErrorEvent) => {
    if (this.state.hasError) return;
    const err = (event as any).error instanceof Error
      ? (event as any).error
      : new Error(event.message || 'Unhandled window error');
    console.error('[ErrorBoundary] window.error', err);
    this.setState({ hasError: true, error: err });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (this.state.hasError) return;
    const reason = (event as any).reason;
    const err = reason instanceof Error ? reason : new Error(String(reason || 'Unhandled promise rejection'));
    console.error('[ErrorBoundary] unhandledrejection', err);
    this.setState({ hasError: true, error: err });
  };

  public componentDidMount() {
    // Catch async boot errors too (not captured by React error boundaries).
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  public componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private async recover() {
    try {
      console.warn('[Recover] Resetting boot state and reloading...');
      localStorage.removeItem('active_project_id');
      localStorage.removeItem('active_project_mode');
      localStorage.removeItem('rp_last_project_path');
      localStorage.removeItem('rp_last_project_json');
      // Sync tracking keys are safe to drop; they will be re-created.
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('sync_state_')) localStorage.removeItem(k);
      }
    } catch (e) {
      console.warn('[Recover] localStorage reset failed', e);
    }

    // Best effort: clear SW/caches to avoid stale assets causing a blank screen after updates.
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister().catch(() => false)));
      }
    } catch (e) {
      console.warn('[Recover] serviceWorker cleanup failed', e);
    }
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k).catch(() => false)));
      }
    } catch (e) {
      console.warn('[Recover] caches cleanup failed', e);
    }

    window.location.reload();
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">Algo salió mal</h1>
            <p className="text-slate-500 mb-6 text-sm">
              La aplicación ha encontrado un error inesperado. No te preocupes, tus datos están seguros en la base de datos local.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl mb-6 text-left overflow-auto max-h-32 border border-slate-100">
              <code className="text-[10px] text-slate-400 font-mono">
                {this.state.error?.message || 'Error desconocido'}
              </code>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                <Home size={16} /> Ir al Inicio
              </button>
              <button
                onClick={() => this.recover()}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                title="Limpia el estado de arranque y recarga"
              >
                Recuperar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
              >
                <RefreshCw size={16} /> Recargar App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
