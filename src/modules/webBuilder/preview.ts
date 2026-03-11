/**
 * src/pages/builder/webpro/preview.ts — WebPro Real-Time Preview
 *
 * Abre una nueva pestaña con preview en vivo del sitio.
 * Usa postMessage para sincronizar cambios del editor en tiempo real,
 * sin necesidad de recargar la pestaña.
 *
 * API pública:
 *   openPreviewWindow(config) → PreviewHandle
 *   handle.update(config)     → void (actualiza en < 50ms)
 *   handle.close()            → void
 *   handle.isAlive()          → boolean
 */

import { SiteConfigV1 } from './types';
import { exportHtml } from './export';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PreviewHandle {
  update: (config: SiteConfigV1) => void;
  close: () => void;
  isAlive: () => boolean;
  focus: () => void;
}

// ─── postMessage protocol ───────────────────────────────────────────────────────
// Editor → Preview:  { type: 'WEBPRO_UPDATE', html: string, scrollY: number }
// Preview → Editor:  { type: 'WEBPRO_READY' }  (on load)

const MSG_UPDATE = 'WEBPRO_UPDATE';
const MSG_READY  = 'WEBPRO_READY';

// ─── Preview shell HTML ─────────────────────────────────────────────────────────
// Este HTML se carga en la nueva pestaña. Contiene un <iframe> que recibe
// el HTML del sitio vía postMessage. Así podemos actualizar sin recargar.

function buildShellHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebPro Preview ⚡</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }

    #toolbar {
      height: 44px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
      z-index: 100;
    }

    .toolbar-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 20px;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    .toolbar-url {
      flex: 1;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 5px 12px;
      color: #94a3b8;
      font-size: 11px;
      font-family: monospace;
    }

    .toolbar-hint {
      color: #475569;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
    }

    #update-flash {
      position: fixed;
      top: 44px;
      right: 0;
      left: 0;
      height: 2px;
      background: linear-gradient(90deg, #4f46e5, #10b981);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.15s ease;
      z-index: 200;
    }
    #update-flash.active { transform: scaleX(1); }

    #frame-wrapper {
      position: absolute;
      top: 44px;
      bottom: 0;
      left: 0;
      right: 0;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }

    /* Loading overlay */
    #loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      color: #94a3b8;
      gap: 16px;
      font-size: 14px;
      font-weight: 600;
      z-index: 50;
      transition: opacity 0.3s;
    }
    #loading.hidden { opacity: 0; pointer-events: none; }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #334155;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>

  <div id="toolbar">
    <div class="toolbar-badge">
      <div class="live-dot"></div>
      WebPro Preview
    </div>
    <div class="toolbar-url" id="url-bar">localhost:5173 · vista previa en vivo</div>
    <span class="toolbar-hint">✏️ Los cambios del editor se reflejan aquí al instante</span>
  </div>

  <div id="update-flash"></div>

  <div id="frame-wrapper">
    <div id="loading">
      <div class="spinner"></div>
      Esperando el editor…
    </div>
    <iframe id="preview-frame" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
  </div>

  <script>
    const frame = document.getElementById('preview-frame');
    const loading = document.getElementById('loading');
    const flash = document.getElementById('update-flash');
    let lastScrollY = 0;

    function flashBar() {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 300);
    }

    function writeHtml(html) {
      // Preserve scroll position via script injected into the html
      const withScroll = html.replace('</head>', [
        '<style>',
        'html, body {',
        'min-height: 100%;',
        'overflow-x: hidden !important;',
        'overflow-y: auto !important;',
        '}',
        '</style>',
        '</head>'
      ].join('')).replace('</body>', \`
        <script>
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'WEBPRO_SET_SCROLL') {
              window.scrollTo(0, e.data.y);
            }
          });
        <\\/script>
      </body>\`);
      frame.srcdoc = withScroll;
      frame.onload = () => {
        // Restore scroll
        frame.contentWindow?.postMessage({ type: 'WEBPRO_SET_SCROLL', y: lastScrollY }, '*');
      };
    }

    // Listen for updates from the editor
    window.addEventListener('message', function(e) {
      if (!e.data || e.data.type !== '${MSG_UPDATE}') return;

      const { html, scrollY } = e.data;
      lastScrollY = scrollY ?? frame.contentWindow?.scrollY ?? lastScrollY;

      // First message: hide loading
      if (loading && !loading.classList.contains('hidden')) {
        loading.classList.add('hidden');
        frame.style.opacity = '1';
      }

      writeHtml(html);
      flashBar();
    });

    // Tell the editor we're ready
    window.addEventListener('load', function() {
      if (window.opener) {
        window.opener.postMessage({ type: '${MSG_READY}' }, '*');
      }
    });

    // Also send ready immediately (opener might already be listening)
    if (window.opener) {
      window.opener.postMessage({ type: '${MSG_READY}' }, '*');
    }
  </script>
</body>
</html>`;
}

// ─── openPreviewWindow ──────────────────────────────────────────────────────────

export function openPreviewWindow(config: SiteConfigV1): PreviewHandle {
  // Build shell and open in new tab
  const shellHtml = buildShellHtml();
  const blob = new Blob([shellHtml], { type: 'text/html' });
  const shellUrl = URL.createObjectURL(blob);

  const win = window.open(shellUrl, '_blank', 'noopener=no');

  if (!win) {
    // Popup blocked
    console.warn('[WebPro Preview] Ventana bloqueada. Permite popups para esta página.');
    URL.revokeObjectURL(shellUrl);
    // Return a no-op handle
    return {
      update: () => {},
      close: () => {},
      isAlive: () => false,
      focus: () => {},
    };
  }

  // Revoke shell blob after a bit
  setTimeout(() => URL.revokeObjectURL(shellUrl), 5000);

  let ready = false;
  let pendingConfig: SiteConfigV1 | null = config;

  // Listen for READY message from preview
  const onMessage = (e: MessageEvent) => {
    if (e.source !== win) return;
    if (e.data?.type === MSG_READY) {
      ready = true;
      if (pendingConfig) {
        sendUpdate(pendingConfig);
        pendingConfig = null;
      }
    }
  };
  window.addEventListener('message', onMessage);

  function sendUpdate(cfg: SiteConfigV1) {
    if (!win || win.closed) return;
    const html = exportHtml(cfg);
    win.postMessage({ type: MSG_UPDATE, html }, '*');
  }

  // Fallback: try to send after 1.5s even if no READY received
  const fallbackTimer = setTimeout(() => {
    if (!ready && pendingConfig) {
      sendUpdate(pendingConfig);
      pendingConfig = null;
      ready = true;
    }
  }, 1500);

  const handle: PreviewHandle = {
    update(cfg: SiteConfigV1) {
      if (!ready) {
        pendingConfig = cfg;
        return;
      }
      sendUpdate(cfg);
    },
    close() {
      window.removeEventListener('message', onMessage);
      clearTimeout(fallbackTimer);
      if (win && !win.closed) win.close();
    },
    isAlive() {
      return !!win && !win.closed;
    },
    focus() {
      if (win && !win.closed) win.focus();
    },
  };

  return handle;
}
