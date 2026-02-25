
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Building2, CalendarRange, Wallet, Globe, RefreshCw, Landmark, ScanFace, MessageSquare, Database, Save, XCircle, Activity, Sparkles, ExternalLink, ShieldAlert, ShieldCheck, Megaphone, Settings, Menu, X, ClipboardList, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Bug, Loader2, HardDrive, Mail
} from 'lucide-react';
import { projectManager } from '../services/projectManager';
import { DebugOverlay } from './DebugOverlay';

import { APP_VERSION } from '../src/version';
import { AppVersion } from '../src/components/AppVersion';
import { ICalDebugPanel } from './ICalDebugPanel';
import { ProjectSwitcherModal } from './ProjectSwitcherModal';
import { CheckCircle, AlertCircle, Cloud, CloudOff } from 'lucide-react';
import { syncCoordinator } from '../services/syncCoordinator';
import { isTauri } from '../utils/isTauri';
import { getDbReady, isDbReady } from '../services/sqliteStore';
import { useMaintenance } from '../src/hooks/useMaintenance';
import { MaintenanceOverlay } from '../src/components/MaintenanceOverlay';

interface LayoutProps {
  children: React.ReactNode;
  onSave: () => void;
  onClose: () => void;
}


const NavItem = ({ to, icon: Icon, label, external, onClick }: { to: string; icon: any; label: string; external?: boolean; onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  const baseClasses = "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden";

  if (external) {
    return (
      <a href={to} className={`${baseClasses} text-slate-500 hover:bg-white/50 hover:text-slate-900`}>
        <Icon size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
        <span className="text-sm font-bold flex-1">{label}</span>
        <ExternalLink size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  return (
    <Link to={to} onClick={onClick} className={`${baseClasses} ${isActive
      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200/50 font-black'
      : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
      }`}>
      <Icon size={18} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'} transition-colors`} />
      <span className="text-sm tracking-tight">{label}</span>
      {isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>}
    </Link>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, onSave, onClose }) => {
  const isTauriRuntime = isTauri();
  const hasWorkspace = (() => {
    if (!isTauriRuntime) return false;
    try { return !!localStorage.getItem('rp_workspace_path'); } catch { return false; }
  })();
  const projectName = (() => {
    if (hasWorkspace) {
      try {
        return localStorage.getItem('rp_workspace_name') || 'Workspace';
      } catch {
        return 'Workspace';
      }
    }
    return projectManager.getProjectName();
  })();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const [booted, setBooted] = useState(() => isDbReady());
  const [bootError, setBootError] = useState<any>(null);

  const { enabled: maintenanceEnabled, reason: maintenanceReason } = useMaintenance();
  const navigate = useNavigate();
  const location = useLocation();

  // File-mode save state (polls every 500ms — zero cost when in 'idb' mode)
  const [fileSaveState, setFileSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fileDisplayName, setFileDisplayName] = useState<string>('Sin archivo');
  const isFileMode = projectManager.getStorageMode() === 'file';

  useEffect(() => {
    if (!isFileMode) return;
    const interval = setInterval(() => {
      setFileSaveState(projectManager.getFileSaveState());
      setFileDisplayName(projectManager.getFileDisplayName());
    }, 500);
    return () => clearInterval(interval);
  }, [isFileMode]);

  // FileSaveBadge — shown only in file mode
  const FileSaveBadge = () => {
    if (!isFileMode) return null;
    const stateConfig = {
      idle: { icon: <HardDrive size={11} />, label: fileDisplayName, color: 'text-sky-600 bg-sky-50 border-sky-100' },
      saving: { icon: <Loader2 size={11} className="animate-spin" />, label: 'Guardando…', color: 'text-amber-600 bg-amber-50 border-amber-100' },
      saved: { icon: <CheckCircle size={11} />, label: 'Guardado', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
      error: { icon: <AlertCircle size={11} />, label: 'Error al guardar', color: 'text-rose-600 bg-rose-50 border-rose-100' },
    };
    const { icon, label, color } = stateConfig[fileSaveState];
    return (
      <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg border w-full ${color}`}
        title={fileDisplayName}>
        {icon}
        <span className="truncate max-w-[140px]">{label}</span>
      </div>
    );
  };

  // Sync Status
  const [isSyncing, setIsSyncing] = useState(false);
  useEffect(() => {
    return syncCoordinator.subscribe(setIsSyncing);
  }, []);

  // DB readiness gate: avoid crashes from querying before init.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await getDbReady();
        if (!cancelled) setBooted(true);
      } catch (e) {
        if (!cancelled) setBootError(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const SyncStatusBadge = () => {
    if (!isSyncing) return null;
    return (
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg border text-indigo-600 bg-indigo-50 border-indigo-100 animate-pulse">
        <RefreshCw size={11} className="animate-spin" />
        <span>Nube Sync...</span>
      </div>
    );
  };

  const isDebugMode = location.search.includes('debug=1');
  const diagnosticsEnabled = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return !!import.meta.env.DEV || import.meta.env.VITE_ENABLE_DIAGNOSTICS === '1' || params.get('diag') === '1' || localStorage.getItem('rp_enable_diagnostics') === '1';
    } catch {
      return !!import.meta.env.DEV || import.meta.env.VITE_ENABLE_DIAGNOSTICS === '1';
    }
  })();

  useEffect(() => {
    // Optional: Auto-open if query param present and we just loaded?
    // For now, let the user click the link in settings/tools
  }, [location.search]);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const [uiScale, setUiScale] = useState(1.0);

  // Load and Apply UI Scale
  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const store = projectManager.getStore();

        // Race hardening: DB might not be ready yet during boot/restore.
        const ready = await store.waitForReady(10, 100);
        if (!ready) return;
        if (cancelled) return;

        const settings = await store.getSettings();
        if (cancelled) return;
        if (settings.ui_scale) {
          setUiScale(settings.ui_scale);
          document.documentElement.style.setProperty('--ui-scale', settings.ui_scale.toString());
        }
      } catch (e) {
        // Degrade gracefully (defaults) without unhandled rejections.
        console.warn('[Layout] UI scale load skipped:', e);
      }
    };
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateScale = async (newScale: number) => {
    const clamped = Math.min(1.2, Math.max(0.9, parseFloat(newScale.toFixed(2))));
    setUiScale(clamped);
    document.documentElement.style.setProperty('--ui-scale', clamped.toString());

    // Persist
    try {
      const store = projectManager.getStore();
      const ready = await store.waitForReady(10, 100);
      if (!ready) return;
      const settings = await store.getSettings();
      await store.saveSettings({ ...settings, ui_scale: clamped });
    } catch (e) {
      console.warn('[Layout] UI scale save skipped:', e);
    }
  };

  const ZoomControls = () => (
    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md p-1 rounded-xl border border-white/40">
      <button
        onClick={() => updateScale(uiScale - 0.1)}
        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white/50 rounded-lg transition-all"
        title="Disminuir tamaño"
      >
        <ZoomOut size={16} />
      </button>
      <div className="px-2 text-[10px] font-black text-slate-600 w-10 text-center">
        {Math.round(uiScale * 100)}%
      </div>
      <button
        onClick={() => updateScale(uiScale + 0.1)}
        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white/50 rounded-lg transition-all"
        title="Aumentar tamaño"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onClick={() => updateScale(1.0)}
        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white/50 rounded-lg transition-all"
        title="Resetear"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/calendar" icon={Calendar} label="Calendario" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/channel-manager" icon={RefreshCw} label="Channel Manager" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/comms" icon={MessageSquare} label="Buzón Unificado" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/properties" icon={Building2} label="Propiedades" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/bookings" icon={CalendarRange} label="Reservas" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/travelers" icon={Users} label="Viajeros" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/checkin-scan" icon={ScanFace} label="Check-in Scan" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/cleaning" icon={ClipboardList} label="Limpiezas" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/maintenance" icon={AlertTriangle} label="Mantenimiento" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/marketing" icon={Megaphone} label="Marketing" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/accounting" icon={Wallet} label="Contabilidad" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/registry" icon={Landmark} label="Registro / Ventanilla" onClick={mobile ? handleNavClick : undefined} />

      <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Create2Web</div>
      <NavItem to="/website-builder" icon={Globe} label="Mis Sitios" onClick={mobile ? handleNavClick : undefined} />

      <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Herramientas</div>
      <NavItem to="/importers" icon={ShieldAlert} label="Importadores" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/email-bookings" icon={Mail} label="Reservas por Email" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/qa" icon={Activity} label="Calidad / Tests" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/backup" icon={ShieldCheck} label="Backup Vault" onClick={mobile ? handleNavClick : undefined} />
      <NavItem to="/settings" icon={Settings} label="Configuración" onClick={mobile ? handleNavClick : undefined} />
      {diagnosticsEnabled && (
        <NavItem to="/diagnostics" icon={Bug} label="Diagnostics" onClick={mobile ? handleNavClick : undefined} />
      )}

      {isDebugMode && (
        <button
          onClick={() => {
            setDebugPanelOpen(true);
            if (mobile) setMobileMenuOpen(false);
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all font-black"
        >
          <Bug size={18} />
          <span className="text-sm tracking-tight uppercase">DEBUG ICAL</span>
        </button>
      )}

      <div className="pt-4 pb-2 px-2">
        <a href="/apps/channel_manager.html" target="_blank" className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">
          <ExternalLink size={10} /> Abrir Visor Standalone
        </a>
      </div>
    </>
  );

  if (bootError) {
    return (
      <>
        <div>Startup error</div>
        {maintenanceEnabled && <MaintenanceOverlay reason={maintenanceReason} />}
      </>
    );
  }

  if (!booted) {
    return (
      <>
        <div>Initializing...</div>
        {maintenanceEnabled && <MaintenanceOverlay reason={maintenanceReason} />}
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] bg-none text-slate-900 relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-200/30 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Mobile Header */}
      <header className="md:hidden glass border-b border-white/40 px-4 py-4 flex items-center justify-between shrink-0 z-20 sticky top-0">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:text-indigo-600">
          <Menu size={24} />
        </button>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-indigo-600">
            <div className="p-1 rounded-xl shadow-lg shadow-indigo-200 overflow-hidden bg-indigo-600">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div className="text-xl font-black leading-none">RentikPro</div>
          </div>
          <AppVersion />
        </div>
        <button onClick={onSave} className="p-2 -mr-2 text-slate-600 hover:text-indigo-600">
          <Save size={20} />
        </button>
      </header>

      <div className="flex flex-1 relative z-10">
        {/* Desktop Sidebar */}
        <aside className="w-72 glass border-r border-white/40 flex flex-col select-none hidden md:flex sticky top-0 h-screen">
          <div className="p-8">
            <div className="flex flex-col gap-2 mb-10">
              <div className="flex items-center gap-4 text-indigo-600">
                <div className="p-1.5 rounded-2xl shadow-xl shadow-indigo-200/50 overflow-hidden bg-indigo-600">
                  <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" />
                </div>
                <div className="text-2xl font-black tracking-tight leading-none">RentikPro</div>
              </div>
              <AppVersion />
            </div>

            {projectManager.getCurrentMode() === 'demo' && (
              <div className="mb-6 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4">
                <div className="bg-amber-500 text-white p-1.5 rounded-xl shadow-lg shadow-amber-500/30"><AlertTriangle size={16} /></div>
                <div>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.1em] leading-none">DEMO MODE</p>
                  <p className="text-[9px] text-amber-600/80 leading-tight mt-1 font-bold">Sin cambios reales</p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (!hasWorkspace) setSwitcherOpen(true);
              }}
              disabled={hasWorkspace}
              className={`w-full text-left bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm flex items-center gap-4 group transition-all active:scale-[0.98] ${hasWorkspace ? 'opacity-60 cursor-default' : 'hover:bg-white/60 hover:border-indigo-200'}`}
            >
              <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform"><Database size={20} /></div>
              <div className="overflow-hidden flex-1">
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1 opacity-70 flex justify-between">
                  <span>{hasWorkspace ? 'WORKSPACE' : 'PROYECTO'}</span>
                  <span className="font-mono opacity-50 uppercase">{projectManager.getCurrentProjectId()?.substring(0, 8)}...</span>
                </p>
                <p className="text-sm font-black text-slate-700 truncate">{projectName}</p>

                {projectManager.isProjectEmpty() ? (
                  <div className="flex items-center gap-1 text-[8px] font-black text-amber-600 uppercase mt-1 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 w-fit">
                    <AlertCircle size={10} /> Proyecto Vacío
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase mt-1 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 w-fit">
                    <CheckCircle size={10} /> Datos OK
                  </div>
                )}
              </div>
            </button>

            {/* UI SCALE CONTROLS - Desktop (though logic is mobile-only) */}
            <div className="mt-4 px-2">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mb-2 ml-1 opacity-70">Escala interfaz (Móvil)</p>
              <ZoomControls />
            </div>

            {isFileMode && (
              <div className="mt-3 px-2">
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1.5 ml-1 opacity-70">Archivo de proyecto</p>
                <FileSaveBadge />
              </div>
            )}

            <div className="mt-3 px-2">
              <SyncStatusBadge />
            </div>
          </div>
          <nav className="flex-1 px-4 pb-6 space-y-1.5 overflow-y-auto custom-scrollbar">
            <NavContent />
          </nav>
          <div className="p-6 bg-white/30 border-t border-white/40 space-y-3">
            <button onClick={onSave} className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all font-black text-xs"><Save size={18} />GUARDAR CAMBIOS</button>
            <button onClick={onClose} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-400 hover:text-rose-500 transition-colors text-[10px] font-black uppercase tracking-[0.2em] active:scale-95"><XCircle size={16} />Cerrar Sesión</button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>

            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-50 z-50 flex flex-col md:hidden shadow-2xl">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-indigo-600">
                      <div className="p-1 rounded-lg shadow-md overflow-hidden bg-indigo-600">
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                      </div>
                      <span className="text-xl font-black tracking-tight">RentikPro</span>
                    </div>
                    <AppVersion />
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (!hasWorkspace) setSwitcherOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  disabled={hasWorkspace}
                  className={`w-full text-left bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 active:scale-95 transition-all ${hasWorkspace ? 'opacity-60 cursor-default' : ''}`}
                >
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Database size={16} /></div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1 flex justify-between">
                      <span>{hasWorkspace ? 'WORKSPACE' : 'PROYECTO'}</span>
                      <span className="font-mono text-[8px] opacity-40 uppercase">{projectManager.getCurrentProjectId()?.substring(0, 8)}...</span>
                    </p>
                    <p className="text-xs font-bold text-slate-700 truncate">{projectName}</p>
                    {projectManager.isProjectEmpty() ? (
                      <div className="flex items-center gap-1 text-[8px] font-black text-amber-600 uppercase mt-0.5 bg-amber-50 px-1 py-0.5 rounded-md border border-amber-100 w-fit">
                        <AlertCircle size={8} /> Proyecto Vacío
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase mt-0.5 bg-emerald-50 px-1 py-0.5 rounded-md border border-emerald-100 w-fit">
                        <CheckCircle size={8} /> Datos OK
                      </div>
                    )}
                  </div>
                </button>
                {/* UI SCALE CONTROLS - Mobile Drawer */}
                <div className="mt-4">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mb-2 ml-1">Tamaño de Interfaz</p>
                  <ZoomControls />
                </div>
                {isFileMode && (
                  <div className="mt-3">
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1.5 ml-1">Archivo</p>
                    <FileSaveBadge />
                  </div>
                )}
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                <NavContent mobile={true} />
              </nav>
              <div className="p-4 bg-slate-100/50 border-t border-slate-200 space-y-2">
                <button onClick={() => { onSave(); setMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all font-bold text-xs shadow-sm"><Save size={16} />Guardar</button>
                <button onClick={() => { onClose(); setMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest"><XCircle size={14} />Cerrar</button>
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-x-auto lg:overflow-x-visible relative flex flex-col pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar md:p-10 p-6 relative" style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}>{children}</div>
        </main>
      </div>

      <ICalDebugPanel isOpen={debugPanelOpen} onClose={() => setDebugPanelOpen(false)} />
      {!hasWorkspace && <ProjectSwitcherModal isOpen={switcherOpen} onClose={() => setSwitcherOpen(false)} />}

      {/* DEBUG OVERLAY (Global Errors) */}
      <DebugOverlay />

      {maintenanceEnabled && <MaintenanceOverlay reason={maintenanceReason} />}
    </div>
  );
};
