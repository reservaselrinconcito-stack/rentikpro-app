import { CORE_MODE } from "../config/appMode";

export function wrapFetchForCoreMode() {
  if (!CORE_MODE) return;
  const original = window.fetch.bind(window);

  const shouldAllow = (urlLike: string): boolean => {
    try {
      const u = new URL(urlLike, window.location.href);

      // Allow same-origin requests so local assets (e.g. sql.js wasm) keep working.
      if (u.origin === window.location.origin) return true;

      // Allow local app schemes used by desktop runtimes.
      if (u.protocol === 'tauri:' || u.protocol === 'asset:' || u.protocol === 'file:') return true;

      return false;
    } catch {
      // If it cannot be parsed as URL, treat it as local.
      return true;
    }
  };

  window.fetch = async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : (input?.url ?? String(input));
    if (shouldAllow(url)) {
      return original(input, init);
    }
    console.warn("[CORE_MODE] blocked fetch:", url);
    // Devuelve 204 para no romper UIs que esperan Response
    return new Response("", { status: 204 });
  };

  // Si existe axios, bloquearlo también
  const w = window as any;
  if (w.axios) {
    // Preserve original so we can still use same-origin axios requests if needed.
    if (!w.axios.request.__CORE_MODE_ORIGINAL__) {
      w.axios.request.__CORE_MODE_ORIGINAL__ = w.axios.request.bind(w.axios);
    }
    const originalAxiosRequest = w.axios.request.__CORE_MODE_ORIGINAL__;

    w.axios.request = async (...args: any[]) => {
      const cfg = args?.[0];
      const url = (typeof cfg === 'string') ? cfg : (cfg?.url ?? String(cfg));
      if (shouldAllow(url)) {
        return (await originalAxiosRequest(...args)) as any;
      }
      console.warn("[CORE_MODE] blocked axios request:", cfg?.url ?? cfg);
      return { status: 204, data: null, headers: {}, config: cfg };
    };
  }
}
