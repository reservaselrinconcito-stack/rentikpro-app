
import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { projectManager } from './services/projectManager';
import { syncScheduler } from './services/syncScheduler';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Building2, FilePlus, FileUp, ShieldCheck, ChevronRight } from 'lucide-react';

// Lazy load páginas pesadas para reducir el bundle inicial
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Properties = React.lazy(() => import('./pages/Properties').then(m => ({ default: m.Properties })));
const Travelers = React.lazy(() => import('./pages/Travelers').then(m => ({ default: m.Travelers })));
const TravelerDetail = React.lazy(() => import('./pages/TravelerDetail').then(m => ({ default: m.TravelerDetail })));
const CheckInScan = React.lazy(() => import('./pages/CheckInScan').then(m => ({ default: m.CheckInScan })));
const Bookings = React.lazy(() => import('./pages/Bookings').then(m => ({ default: m.Bookings })));
const Accounting = React.lazy(() => import('./pages/Accounting').then(m => ({ default: m.Accounting })));
const Importers = React.lazy(() => import('./pages/Importers').then(m => ({ default: m.Importers })));
const Calendar = React.lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Marketing = React.lazy(() => import('./pages/Marketing').then(m => ({ default: m.Marketing })));
const Registry = React.lazy(() => import('./pages/Registry').then(m => ({ default: m.Registry })));
const WebsiteBuilder = React.lazy(() => import('./pages/WebsiteBuilder').then(m => ({ default: m.WebsiteBuilder })));
const Communications = React.lazy(() => import('./pages/Communications').then(m => ({ default: m.Communications })));
const ChannelManager = React.lazy(() => import('./pages/ChannelManager').then(m => ({ default: m.ChannelManager })));
const QualityAssurance = React.lazy(() => import('./pages/QualityAssurance').then(m => ({ default: m.QualityAssurance })));
const PromptBuilder = React.lazy(() => import('./pages/PromptBuilder').then(m => ({ default: m.PromptBuilder })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

const LandingScreen = ({ onOpen }: { onOpen: () => void }) => {
  const isTauri = !!(window as any).__TAURI_INTERNALS__;
  const handleCreate = async () => { if (await projectManager.createNewProject()) onOpen(); };
  const handleOpenNative = async () => { if (await projectManager.openProject()) onOpen(); };
  const handleOpenFileBrowser = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await projectManager.importProjectFromFile(file);
        onOpen();
      } catch (err) {
        alert("Error al abrir archivo: " + err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 select-none animate-in fade-in duration-500">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden w-full max-w-5xl flex flex-col md:flex-row min-h-[500px]">
        <div className="bg-indigo-600 p-12 text-white md:w-2/5 flex flex-col justify-between">
          <div>
            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6"><Building2 size={32} /></div>
            <h1 className="text-4xl font-black tracking-tight mb-4">RentikPro</h1>
            <p className="text-indigo-100 text-lg leading-relaxed">Gestión inmobiliaria nativa y segura.</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/10">
              <ShieldCheck className="text-indigo-200 shrink-0" size={20} /><p className="text-xs text-indigo-100 font-medium">Datos 100% locales en SQLite.</p>
            </div>
          </div>
        </div>
        <div className="p-12 md:w-3/5 flex flex-col justify-center space-y-8 bg-white">
          <h2 className="text-2xl font-black text-slate-800">Comenzar</h2>
          <div className="grid gap-4">
            <button onClick={handleCreate} className="group flex items-center justify-between p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all">
              <div className="flex items-center gap-4"><div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors"><FilePlus size={24} /></div><div className="text-left"><h3 className="font-bold text-slate-800">Nuevo Proyecto</h3><p className="text-xs text-slate-500">Crea una base de datos vacía.</p></div></div><ChevronRight className="text-slate-300 group-hover:text-indigo-500" size={20} />
            </button>
            <div className="relative">
              <button onClick={isTauri ? handleOpenNative : undefined} className="w-full flex items-center justify-between p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                <div className="flex items-center gap-4"><div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors"><FileUp size={24} /></div><div className="text-left"><h3 className="font-bold text-slate-800">Abrir Existente</h3><p className="text-xs text-slate-500">Sincroniza con .sqlite.</p></div></div><ChevronRight className="text-slate-300 group-hover:text-indigo-500" size={20} />
              </button>
              {!isTauri && <input type="file" accept=".sqlite" onChange={handleOpenFileBrowser} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  useEffect(() => {
    if (isProjectOpen) {
      syncScheduler.start();
    } else {
      syncScheduler.stop();
    }
  }, [isProjectOpen]);

  const handleSave = async () => {
    try {
      await projectManager.saveProject();
      alert("Proyecto guardado correctamente.");
    } catch (err) {
      alert("Error al guardar: " + err);
    }
  };

  const handleClose = async () => {
    if (window.confirm("¿Deseas cerrar el proyecto actual? Asegúrate de haber guardado tus cambios.")) {
      setIsProjectOpen(false);
      try {
        await projectManager.closeProject();
      } catch (err) {
        console.warn("Soft error closing project background task:", err);
      }
    }
  };

  if (!isProjectOpen) return <LandingScreen onOpen={() => setIsProjectOpen(true)} />;

  return (
    <ErrorBoundary>
      <Router>
        <Layout onSave={handleSave} onClose={handleClose}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/travelers" element={<Travelers />} />
              <Route path="/travelers/:id" element={<TravelerDetail />} />
              <Route path="/checkin-scan" element={<CheckInScan />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/accounting" element={<Accounting />} />
              <Route path="/registry" element={<Registry />} />
              <Route path="/website-builder" element={<WebsiteBuilder />} />
              <Route path="/prompt-builder" element={<PromptBuilder />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/comms" element={<Communications />} />
              <Route path="/channel-manager" element={<ChannelManager />} />
              <Route path="/importers" element={<Importers />} />
              <Route path="/qa" element={<QualityAssurance />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
