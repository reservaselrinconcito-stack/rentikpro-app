
import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { projectManager } from './services/projectManager';
import { syncScheduler } from './services/syncScheduler';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RescueMode } from './pages/RescueMode'; // [NEW]
import { CleaningPage } from './pages/Cleaning';
import { MaintenancePage } from './pages/Maintenance';
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
const BackupVault = React.lazy(() => import('./pages/BackupVault').then(m => ({ default: m.BackupVault })));

import { Toaster } from 'sonner';
import { VersionChecker } from './components/VersionChecker';

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

import { StartupScreen } from './pages/StartupScreen';

// Remove old LandingScreen component entirely

const App: React.FC = () => {
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [bootError, setBootError] = useState<Error | null>(null);
  const [isRescueMode, setIsRescueMode] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // BOOT CHECK
  useEffect(() => {
    const init = async () => {
      try {
        await projectManager.initialize();
        (window as any).projectManager = projectManager;
        if (projectManager.isProjectLoaded()) {
          setIsProjectOpen(true);
        }
      } catch (e) {
        console.error("Initialization failed", e);
      } finally {
        setInitializing(false);
      }
    };

    // 0. RESET HATCH
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      console.warn("RESET REQUESTED. Clearing project state...");
      projectManager.closeProject().then(() => {
        setIsProjectOpen(false);
        window.history.replaceState({}, '', '/'); // Clean URL
        setInitializing(false);
      });
      return;
    }

    // 1. Check URL Hash for emergency rescue
    if (window.location.hash === '#/rescue') {
      setIsRescueMode(true);
      setInitializing(false);
    } else {
      init();
    }

    // 2. Global Error Handler for initial mounting (optional but good)
    const handleError = (event: ErrorEvent) => {
      // If critical error occurs very early
      // console.error("Global captured:", event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // UseEffect for Project Context Updates
  useEffect(() => {
    try {
      if (isProjectOpen) {
        syncScheduler.start();
      } else {
        syncScheduler.stop();
      }
    } catch (e: any) {
      console.error("Error setting up syncScheduler during boot:", e);
    }
  }, [isProjectOpen]);

  // If in rescue mode, render immediately
  if (isRescueMode || bootError) {
    return <RescueMode error={bootError} />;
  }

  if (initializing) {
    return <PageLoader />;
  }

  if (!isProjectOpen) {
    return <StartupScreen onOpen={() => setIsProjectOpen(true)} />;
  }

  const handleSave = async () => {
    try {
      await projectManager.saveProject();
      alert("Proyecto guardado correctamente.");
    } catch (err) {
      alert("Error al guardar: " + err);
    }
  };

  const handleClose = async () => {
    const isDemo = projectManager.getCurrentMode() === 'demo';
    if (isDemo || window.confirm("¿Deseas cerrar el proyecto actual? Asegúrate de haber guardado tus cambios.")) {
      setIsProjectOpen(false);
      try {
        await projectManager.closeProject();
      } catch (err) {
        console.warn("Soft error closing project background task:", err);
      }
    }
  };

  const handleExitDemo = async () => {
    if (confirm("¿Salir del modo demo? Todos los datos de prueba se cerrarán.")) {
      await projectManager.exitDemo();
      setIsProjectOpen(false);
    }
  };

  return (
    <ErrorBoundary onError={(error) => setBootError(error)}>
      <>
        <Toaster />
        <VersionChecker />
        <Router>
          <Layout onSave={handleSave} onClose={handleClose}>
            {projectManager.getCurrentMode() === 'demo' && (
              <div className="md:hidden bg-amber-500 text-white text-xs font-bold text-center py-1">
                MODO DEMO ACTIVADO
              </div>
            )}
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/travelers" element={<Travelers />} />
                <Route path="/travelers/:id" element={<TravelerDetail />} />
                <Route path="/checkin-scan" element={<CheckInScan />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/bookings/:id" element={<Bookings />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/cleaning" element={<CleaningPage store={projectManager.getStore()} />} />
                <Route path="/maintenance" element={<MaintenancePage store={projectManager.getStore()} />} />
                <Route path="/accounting" element={<Accounting />} />
                <Route path="/registry" element={<Registry />} />
                <Route path="/website-builder" element={<WebsiteBuilder />} />
                <Route path="/prompt-builder" element={<PromptBuilder />} />
                <Route path="/settings" element={<Settings onSave={handleSave} />} />
                <Route path="/comms" element={<Communications />} />
                <Route path="/channel-manager" element={<ChannelManager />} />
                <Route path="/importers" element={<Importers />} />
                <Route path="/qa" element={<QualityAssurance />} />
                <Route path="/backup" element={<BackupVault />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/calendar/event/:id" element={<Calendar />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </>
    </ErrorBoundary>
  );
};

export default App;
