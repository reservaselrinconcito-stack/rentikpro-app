
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { wrapFetchForCoreMode } from './src/core/coreModeGuards';

wrapFetchForCoreMode();

const rootElement = document.getElementById('root');
if (!rootElement) {
  // Never hard-crash into a blank screen.
  console.error('[boot] Could not find #root element to mount to');
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <div style="max-width:640px;width:100%;border:1px solid #e2e8f0;border-radius:24px;padding:24px;">
        <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:800;color:#0f172a;">RentikPro no pudo arrancar</h1>
        <p style="margin:0 0 16px 0;color:#475569;">No se encontró el contenedor <code>#root</code>. Revisa la consola para más detalles.</p>
        <button onclick="location.reload()" style="padding:10px 14px;border-radius:14px;border:1px solid #cbd5e1;background:#2563eb;color:#fff;font-weight:800;cursor:pointer;">Recargar</button>
      </div>
    </div>
  `;
  throw new Error('Missing root element');
}

const root = ReactDOM.createRoot(rootElement);
try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (e) {
  console.error('[boot] Fatal render error', e);
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <div style="max-width:640px;width:100%;border:1px solid #e2e8f0;border-radius:24px;padding:24px;">
        <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:800;color:#0f172a;">RentikPro encontró un error crítico</h1>
        <p style="margin:0 0 16px 0;color:#475569;">La app no pudo renderizar. Revisa la consola y usa “Recuperar”.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button onclick="(function(){try{localStorage.removeItem('active_project_id');localStorage.removeItem('active_project_mode');localStorage.removeItem('rp_last_project_path');localStorage.removeItem('rp_last_project_json');Object.keys(localStorage).filter(k=>k.startsWith('sync_state_')).forEach(k=>localStorage.removeItem(k));}catch(_){} location.reload();})()" style="padding:10px 14px;border-radius:14px;border:1px solid #cbd5e1;background:#0f172a;color:#fff;font-weight:800;cursor:pointer;">Recuperar</button>
          <button onclick="location.reload()" style="padding:10px 14px;border-radius:14px;border:1px solid #cbd5e1;background:#2563eb;color:#fff;font-weight:800;cursor:pointer;">Recargar</button>
        </div>
      </div>
    </div>
  `;
}
