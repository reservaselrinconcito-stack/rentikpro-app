import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowDownCircle, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { updateService, UpdateStatus } from '../services/updateService';
import { isTauri } from '../utils/isTauri';

export const UpdateButton: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus>(updateService.getStatus());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const unsub = updateService.subscribe(setStatus);
    return unsub;
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!isTauri()) return null;

  const handleCheck = async () => {
    await updateService.checkForUpdates();
    const s = updateService.getStatus();
    if (s.state === 'up-to-date') setToast('Ya tienes la última versión');
  };

  const handleInstall = async () => {
    await updateService.downloadAndInstall();
  };

  const handleRelaunch = async () => {
    await updateService.relaunch();
  };

  const { state, availableVersion, downloadedBytes, totalBytes, error } = status;
  const isLoading = state === 'checking' || state === 'downloading';
  const pct = totalBytes && downloadedBytes ? Math.round((downloadedBytes / totalBytes) * 100) : null;

  return (
    <div className="px-2 mt-3">
      {/* Toast */}
      {toast && (
        <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-xl animate-fade-in">
          <CheckCircle2 size={10} /> {toast}
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="mb-2 flex items-start gap-1.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-2 rounded-xl leading-tight">
          <AlertCircle size={10} className="shrink-0 mt-px" /> {error}
        </div>
      )}

      {/* Main button */}
      {state === 'ready' ? (
        <button
          onClick={handleRelaunch}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors active:scale-[0.98] shadow-md shadow-indigo-200"
        >
          <RotateCcw size={11} /> Reiniciar para aplicar
        </button>
      ) : state === 'available' ? (
        <button
          onClick={handleInstall}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors active:scale-[0.98] shadow-md shadow-emerald-100"
        >
          <ArrowDownCircle size={11} /> Actualizar a {availableVersion}
        </button>
      ) : state === 'downloading' ? (
        <div className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wide">Descargando…</span>
            {pct !== null && <span className="text-[9px] font-black text-indigo-400">{pct}%</span>}
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-1">
            <div
              className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
              style={{ width: pct !== null ? `${pct}%` : '40%' }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={handleCheck}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/60 hover:bg-white border border-white/80 hover:border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          {state === 'checking' ? 'Buscando…' : 'Buscar actualización'}
        </button>
      )}
    </div>
  );
};
