import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { projectManager } from './services/projectManager';
import { syncScheduler } from './services/syncScheduler';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CORE_MODE } from './src/config/appMode';
import { RescueMode } from './pages/RescueMode'; // [NEW]
import { CleaningPage } from './pages/Cleaning';
import { MaintenancePage } from './pages/Maintenance';
import { Building2, FilePlus, FileUp, ShieldCheck, ChevronRight } from 'lucide-react';

// Helper to handle lazy loading failures (Module not found/Failed to fetch)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  React.lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.localStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        // A la primera señal de error de red en un chunk, forzamos recarga
        window.localStorage.setItem('page-has-been-force-refreshed', 'true');
        return window.location.reload();
      }
      throw error;
    }
  });

// Lazy load páginas pesadas para reducir el bundle inicial
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Properties = lazyWithRetry(() => import('./pages/Properties').then(m => ({ default: m.Properties })));
const Travelers = lazyWithRetry(() => import('./pages/Travelers').then(m => ({ default: m.Travelers })));
const TravelerDetail = lazyWithRetry(() => import('./pages/TravelerDetail').then(m => ({ default: m.TravelerDetail })));
const CheckInScan = lazyWithRetry(() => import('./pages/CheckInScan').then(m => ({ default: m.CheckInScan })));
const Bookings = lazyWithRetry(() => import('./pages/Bookings').then(m => ({ default: m.Bookings })));
const Accounting = lazyWithRetry(() => import('./pages/Accounting').then(m => ({ default: m.Accounting })));
const Importers = lazyWithRetry(() => import('./pages/Importers').then(m => ({ default: m.Importers })));
const Calendar = lazyWithRetry(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Marketing = lazyWithRetry(() => import('./pages/Marketing').then(m => ({ default: m.Marketing })));
const Registry = lazyWithRetry(() => import('./pages/Registry').then(m => ({ default: m.Registry })));
const WebsiteBuilder = lazyWithRetry(() => import('./pages/WebsiteBuilder').then(m => ({ default: m.WebsiteBuilder })));
const Diagnostics = lazyWithRetry(() => import('./pages/Diagnostics').then(m => ({ default: m.Diagnostics })));
const Communications = lazyWithRetry(() => import('./pages/Communications').then(m => ({ default: m.Communications })));
const ChannelManager = lazyWithRetry(() => import('./pages/ChannelManager').then(m => ({ default: m.ChannelManager })));
const QualityAssurance = lazyWithRetry(() => import('./pages/QualityAssurance').then(m => ({ default: m.QualityAssurance })));
const Settings = lazyWithRetry(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const BackupVault = lazyWithRetry(() => import('./pages/BackupVault').then(m => ({ default: m.BackupVault })));
const EmailBookings = lazyWithRetry(() => import('./pages/EmailBookings').then(m => ({ default: m.EmailBookings })));

import { Toaster } from 'sonner';
import { VersionChecker } from './components/VersionChecker';
import { isTauri } from './utils/isTauri';

// Boot-aware loading component — subscribes to the workspace state machine
// so users always see exactly what is happening.
import { getWorkspaceBootState, onBootStateChange, type WorkspaceBootState } from './src/services/workspaceBootState';

const phaseLabels: Record<string, string> = {
  CHECK_CONFIG: "Leyendo configuración…",
  VALIDATE_PATH: "Validando workspace…",
  WAITING_MATERIALIZATION: "Esperando descarga de iCloud…",
  OPENING_DB: "Abriendo base de datos…",
  READY: "Listo",
  MISSING: "Workspace no disponible",
};

const BootProgress: React.FC = () => {
  const [boot, setBoot] = React.useState<WorkspaceBootState>(getWorkspaceBootState);
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => onBootStateChange(setBoot), []);

  // Live countdown when waiting for materialization
  React.useEffect(() => {
    if (boot.state !== "WAITING_MATERIALIZATION") { setElapsed(0); return; }
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - boot.startedAt) / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [boot]);

  const label = phaseLabels[boot.state] || "Iniciando…";
  const showCountdown = boot.state === "WAITING_MATERIALIZATION";

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none animate-in fade-in">
      <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 border-t-indigo-600" />
      <p className="text-sm font-bold text-slate-500 tracking-wide">{label}</p>
      {showCountdown && (
        <p className="text-xs text-slate-400 font-mono tabular-nums">
          {elapsed}s / {Math.round((boot as any).timeoutMs / 1000)}s
        </p>
      )}
      {"path" in boot && (
        <code className="text-[10px] text-slate-300 font-mono max-w-md truncate" title={(boot as any).path}>
          {(boot as any).path}
        </code>
      )}
    </div>
  );
};

// Loading component for lazy routes (NOT for boot)
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

        // If user explicitly requested the startup screen (e.g. from ProjectSwitcherModal),
        // skip auto-loading the last active project and show the startup selector instead.
        const forceStart = sessionStorage.getItem('forceShowStart') === '1';
        if (forceStart) {
          sessionStorage.removeItem('forceShowStart');
          // Don't auto-load; fall through to show StartupScreen
        } else if (projectManager.isProjectLoaded()) {
          setIsProjectOpen(true);
        } else if (CORE_MODE) {
          // CORE_MODE: always allow entering the app offline without login/licensing.
          // If nothing is loaded, create a local blank project as a safe default.
          // EXCEPTION (Tauri): do NOT fall back to IDB projects automatically.
          // If the workspace is missing/moved/iCloud-lazy, StartupScreen must handle recovery.
          const tauri = isTauri();
          if (tauri) {
            // fall through: show StartupScreen
          } else {
            try {
              const ok = await projectManager.createBlankProject();
              if (ok) setIsProjectOpen(true);
            } catch (e) {
              console.warn('[CORE_MODE] Failed creating blank project, showing StartupScreen', e);
            }
          }
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
      if (CORE_MODE) {
        // Offline core mode: do not start background sync loops.
        syncScheduler.stop();
        return;
      }
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

  return (
    <ErrorBoundary onError={(error) => setBootError(error)}>
      <Router>
        <Toaster />
        <VersionChecker />
        {initializing ? (
          <BootProgress />
        ) : !isProjectOpen ? (
          <StartupScreen onOpen={() => setIsProjectOpen(true)} />
        ) : (
          <Layout onSave={handleSave} onClose={handleClose}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/calendario" element={<Navigate to="/calendar" replace />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/travelers" element={<Travelers />} />
                <Route path="/travelers/:id" element={<TravelerDetail />} />
                <Route path="/checkin-scan" element={<CheckInScan />} />
                <Route path="/checkins" element={<Navigate to="/checkin-scan" replace />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/bookings/:id" element={<Bookings />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/cleaning" element={<CleaningPage store={projectManager.getStore()} />} />
                <Route path="/limpiezas" element={<Navigate to="/cleaning" replace />} />
                <Route path="/maintenance" element={<MaintenancePage store={projectManager.getStore()} />} />
                <Route path="/accounting" element={<Accounting />} />
                <Route path="/registry" element={<Registry />} />
                <Route path="/email-bookings" element={<EmailBookings />} />
                <Route path="/website-builder" element={<WebsiteBuilder />} />
                <Route path="/settings" element={<Settings onSave={handleSave} />} />
                <Route path="/comms" element={<Communications />} />
                <Route path="/buzon" element={<Navigate to="/comms" replace />} />
                <Route path="/channel-manager" element={<ChannelManager />} />
                <Route path="/importers" element={<Importers />} />
                <Route path="/qa" element={<QualityAssurance />} />
                <Route path="/diagnostics" element={<Diagnostics />} />
                <Route path="/backup" element={<BackupVault />} />
                <Route path="/calendar/event/:id" element={<Calendar />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </Layout>
        )}
      </Router>
    </ErrorBoundary>
  );
};

export default App;
