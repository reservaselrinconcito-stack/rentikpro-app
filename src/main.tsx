// Global error hooks (before React render)
// Keep this module side-effectful: importing it installs handlers once.

const w = window as any;

if (!w.__rp_global_error_handlers_installed) {
  w.__rp_global_error_handlers_installed = true;

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandledrejection]', (event as any).reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    const anyEvent: any = event as any;
    console.error('[window.error]', anyEvent.error || anyEvent.message);
  });
}
