import React, { useState } from 'react';
import {
  FolderOpen, FolderSymlink, RefreshCw, Cloud, HardDrive,
  CheckCircle2, Info, Wifi, WifiOff, AlertTriangle,
  RotateCcw, Upload
} from 'lucide-react';
import { APP_VERSION, SCHEMA_VERSION } from '@/src/version';
import { toast } from 'sonner';
import { useSyncState, getLocalProvider, getWebDavProvider } from '@/src/services/sync/useSyncState';

const isCapacitorApp = (): boolean =>
  typeof (window as any).Capacitor !== 'undefined' &&
  !!(window as any).Capacitor?.isNativePlatform?.();

async function getWorkspaceUtils() {
  return import('@/services/workspaceInfo');
}
async function getWorkspaceMoverUtils() {
  return import('@/services/workspaceMover');
}

function formatDate(ts: number | null) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(ts));
}

const FIXED_PROJECT_ID = 'main';
const FIXED_PROJECT_NAME = 'RentikPro';

export function Settings() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const isICloud = !!(workspacePath?.includes('Mobile Documents/com~apple~CloudDocs'));
  const [isSwitching, setIsSwitching] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showWebDavForm, setShowWebDavForm] = useState(false);
  const [webdavUrl, setWebdavUrl] = useState('');
  const [webdavUser, setWebdavUser] = useState('');
  const [webdavPass, setWebdavPass] = useState('');
  const [testingConn, setTestingConn] = useState(false);

  React.useEffect(() => {
    if (!isCapacitorApp()) {
      getWorkspaceUtils().then(({ getWorkspacePath }) => {
        setWorkspacePath(getWorkspacePath());
        setWorkspaceLoaded(true);
      }).catch(() => setWorkspaceLoaded(true));
    } else {
      setWorkspaceLoaded(true);
    }
  }, []);

  const {
    syncing, lastResult, savedState, activeProvider,
    setActiveProvider, runSync, restoreBackup, webdavProvider,
  } = useSyncState(FIXED_PROJECT_ID, FIXED_PROJECT_NAME);

  const handleSwitch = async () => {
    setIsSwitching(true);
    try {
      const { chooseFolder, switchWorkspace } = await getWorkspaceUtils();
      const dir = await chooseFolder();
      if (!dir) return;
      await switchWorkspace(dir);
      setWorkspacePath(dir);
      toast.success('Workspace cambiado correctamente');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cambiar workspace');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleMove = async () => {
    setIsMoving(true);
    try {
      const { chooseDestinationFolder, moveWorkspaceToFolder } = await getWorkspaceMoverUtils();
      const destRoot = await chooseDestinationFolder();
      if (!destRoot) return;
      await moveWorkspaceToFolder(destRoot);
      toast.success('Workspace movido correctamente');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al mover workspace');
    } finally {
      setIsMoving(false);
    }
  };

  const handleChooseFolder = async () => {
    try {
      const lp = getLocalProvider();
      await lp.chooseFolder();
      setActiveProvider('local');
      toast.success('Carpeta de sincronización configurada');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al seleccionar carpeta');
    }
  };

  const handleSaveWebDav = async () => {
    if (!webdavUrl || !webdavUser) {
      toast.error('URL y usuario son obligatorios');
      return;
    }
    webdavProvider.configure({ url: webdavUrl, user: webdavUser, pass: webdavPass });
    setActiveProvider('webdav');
    setShowWebDavForm(false);
    toast.success('WebDAV configurado');
  };

  const handleTestWebDav = async () => {
    if (!webdavUrl || !webdavUser) { toast.error('Rellena URL y usuario primero'); return; }
    setTestingConn(true);
    const tmp = getWebDavProvider();
    tmp.configure({ url: webdavUrl, user: webdavUser, pass: webdavPass }, false);
    const ok = await tmp.testConnection();
    setTestingConn(false);
    if (ok) toast.success('Conexión WebDAV correcta');
    else toast.error('No se pudo conectar. Verifica URL y credenciales.');
  };

  const handleSync = async () => {
    await runSync();
    if (lastResult?.success) {
      toast.success(lastResult.direction === 'up' ? 'Datos subidos a la nube' : 'Datos actualizados desde la nube');
    } else if (lastResult?.error) {
      toast.error(lastResult.error);
    }
  };

  const handleRestoreBackup = async () => {
    const ok = await restoreBackup();
    if (ok) toast.success('Backup local restaurado');
    else toast.error('No hay backup local disponible');
  };

  const lastSyncState = savedState;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-800 mb-1">Configuración</h1>
          <p className="text-slate-400 text-sm font-medium">Almacenamiento, sincronización y preferencias de RentikPro.</p>
        </div>

        {/* ── Sync Card ─────────────────────────────── */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center gap-3">
            <Cloud size={20} className="text-indigo-500" />
            <div>
              <h2 className="text-base font-black text-slate-800">Sincronización</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {activeProvider === 'local' ? 'Carpeta / Archivos' : activeProvider === 'webdav' ? 'WebDAV / Nube' : 'Sin configurar'}
              </p>
            </div>
            {lastSyncState?.lastSyncStatus === 'ok' && (
              <div className="ml-auto flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-black">
                <CheckCircle2 size={12} /> Sync OK
              </div>
            )}
            {lastSyncState?.lastSyncStatus === 'error' && (
              <div className="ml-auto flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-[10px] font-black">
                <AlertTriangle size={12} /> Error
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Provider selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Provider activo</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Local folder */}
                <button
                  onClick={async () => {
                    if (activeProvider !== 'local') await handleChooseFolder();
                  }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${activeProvider === 'local' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}
                >
                  <FolderOpen size={20} className={activeProvider === 'local' ? 'text-indigo-600 mb-2' : 'text-slate-400 mb-2'} />
                  <p className={`text-xs font-black ${activeProvider === 'local' ? 'text-indigo-700' : 'text-slate-600'}`}>Carpeta / Archivos</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">iCloud Drive, Documentos, USB</p>
                  {activeProvider === 'local' && getLocalProvider().isConfigured() && (
                    <p className="text-[9px] text-indigo-500 font-mono mt-1 truncate">{getLocalProvider().getFolderLabel()}</p>
                  )}
                </button>

                {/* WebDAV */}
                <button
                  onClick={() => setShowWebDavForm(v => !v)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${activeProvider === 'webdav' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}
                >
                  <Wifi size={20} className={activeProvider === 'webdav' ? 'text-indigo-600 mb-2' : 'text-slate-400 mb-2'} />
                  <p className={`text-xs font-black ${activeProvider === 'webdav' ? 'text-indigo-700' : 'text-slate-600'}`}>WebDAV / Nube</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Nextcloud, iCloud DAV, otros</p>
                  {activeProvider === 'webdav' && webdavProvider.isConfigured() && (
                    <p className="text-[9px] text-indigo-500 font-mono mt-1 truncate">{webdavProvider.getConfig()?.url}</p>
                  )}
                </button>
              </div>
            </div>

            {/* WebDAV form */}
            {showWebDavForm && (
              <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Configurar WebDAV</p>
                <input
                  type="url" placeholder="https://nextcloud.tudominio.com/remote.php/dav/files/usuario"
                  value={webdavUrl} onChange={e => setWebdavUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-indigo-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text" placeholder="Usuario"
                    value={webdavUser} onChange={e => setWebdavUser(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-indigo-400"
                  />
                  <input
                    type="password" placeholder="Contraseña / Token"
                    value={webdavPass} onChange={e => setWebdavPass(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleTestWebDav}
                    disabled={testingConn}
                    className="flex items-center gap-1.5 py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors disabled:opacity-50"
                  >
                    {testingConn ? <RefreshCw size={13} className="animate-spin" /> : <WifiOff size={13} />}
                    Probar
                  </button>
                  <button
                    onClick={handleSaveWebDav}
                    className="flex-1 py-2 px-3 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors"
                  >
                    Guardar WebDAV
                  </button>
                </div>
              </div>
            )}

            {/* Sync status bar */}
            {lastSyncState && (
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>Último sync</span>
                  <span className="font-mono">{formatDate(lastSyncState.lastSyncAt)}</span>
                </div>
                {lastSyncState.lastSyncStatus === 'error' && lastSyncState.lastError && (
                  <p className="text-[10px] text-red-500 font-medium">{lastSyncState.lastError}</p>
                )}
                {lastSyncState.conflictPolicy && (
                  <div className="flex items-center gap-1 text-[9px] text-slate-300">
                    <Info size={9} /> Política: {lastSyncState.conflictPolicy}
                  </div>
                )}
              </div>
            )}

            {/* Sync actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={syncing || !activeProvider}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                {syncing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
                {syncing ? 'Sincronizando…' : 'Sync ahora'}
              </button>
              {lastSyncState?.localBackupAvailable && (
                <button
                  onClick={handleRestoreBackup}
                  className="flex items-center gap-2 py-3 px-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl text-xs font-black hover:bg-amber-100 transition-all"
                  title="Restaurar backup local (antes del último sync descendente)"
                >
                  <RotateCcw size={15} /> Restaurar backup
                </button>
              )}
            </div>

            {lastResult && (
              <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${lastResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {lastResult.success
                  ? <><CheckCircle2 size={14} /> {lastResult.direction === 'up' ? 'Subido' : lastResult.direction === 'down' ? 'Descargado' : 'Sin cambios'}{lastResult.conflict ? ' (conflicto resuelto: last-write-wins)' : ''}</>
                  : <><AlertTriangle size={14} /> {lastResult.error}</>
                }
              </div>
            )}
          </div>
        </div>

        {/* ── Workspace Card (desktop / Tauri only) ─ */}
        {!isCapacitorApp() && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-3">
              {isICloud ? <Cloud size={20} className="text-indigo-500" /> : <HardDrive size={20} className="text-slate-500" />}
              <div>
                <h2 className="text-base font-black text-slate-800">Workspace de datos</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {isICloud ? 'iCloud Drive' : 'Almacenamiento local'}
                </p>
              </div>
              {workspacePath && (
                <div className="ml-auto flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-black">
                  <CheckCircle2 size={12} /> Activo
                </div>
              )}
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ubicación actual</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <code className="flex-1 text-xs text-slate-600 font-mono break-all">{workspacePath ?? '—'}</code>
                  {workspacePath && (
                    <button onClick={async () => { const { openWorkspaceFolder } = await getWorkspaceUtils(); openWorkspaceFolder(workspacePath!); }} className="shrink-0 p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors" title="Abrir en Finder">
                      <FolderOpen size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleSwitch} disabled={isSwitching} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl text-xs font-black transition-all disabled:opacity-50">
                  {isSwitching ? <RefreshCw size={15} className="animate-spin" /> : <FolderOpen size={15} />}
                  Cambiar ubicación…
                </button>
                <button onClick={handleMove} disabled={isMoving} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl text-xs font-black transition-all disabled:opacity-50">
                  {isMoving ? <RefreshCw size={15} className="animate-spin" /> : <FolderSymlink size={15} />}
                  Mover workspace a…
                </button>
              </div>
              {isICloud && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 font-medium leading-relaxed">El workspace está en iCloud Drive. Asegúrate de que iCloud esté sincronizado antes de abrir la app.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── App Info ───────────────────────────────── */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-black text-slate-800">Información de la app</h2>
          <div className="space-y-3">
            {[
              { label: 'Versión', value: `v${APP_VERSION}` },
              { label: 'Versión de esquema', value: String(SCHEMA_VERSION) },
              { label: 'Plataforma', value: isCapacitorApp() ? 'Móvil (Capacitor)' : typeof (window as any).__TAURI__ !== 'undefined' ? 'Desktop (Tauri)' : 'Web' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                <span className="text-xs font-black text-slate-700 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
