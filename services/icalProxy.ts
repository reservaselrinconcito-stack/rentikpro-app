
/**
 * SERVICIO PROXY ICAL
 * Centraliza la lógica de construcción de URLs para evitar CORS.
 * 
 * Reglas de Producción:
 * 1. NO usar corsproxy.io (bloqueado/lento/inseguro).
 * 2. Usar exclusivamente el Worker de Cloudflare propio.
 * 3. Permitir override vía VITE_CM_PROXY_BASE para entornos de dev/staging.
 */

// URL Oficial de Producción (Hardcoded para máxima seguridad en runtime)
const OFFICIAL_WORKER_URL = "https://rentikpro-cm-proxy.reservas-elrinconcito.workers.dev/cm-proxy";

/**
 * Obtiene la URL base del proxy con validación estricta.
 */
export const getProxyBaseUrl = (): string => {
  // 1. Intentar leer variable de entorno Vite (con cast seguro para evitar error TS 'env does not exist')
  const envUrl = (import.meta as any).env?.VITE_CM_PROXY_BASE;

  // 2. Verificar si hay un override manual en LocalStorage (útil para debug)
  const stored = localStorage.getItem('rentikpro_proxy_url');

  if (stored) {
    // Validación de seguridad: Debe ser HTTPS y NO puede ser corsproxy.io
    if (stored.startsWith('https://') && !stored.includes('corsproxy.io')) {
      return stored;
    } else {
      console.warn("[iCalProxy] Proxy almacenado inválido o inseguro detectado. Restableciendo al oficial.");
      localStorage.removeItem('rentikpro_proxy_url');
    }
  }

  // 3. Retornar EnvVar o Fallback Oficial
  // Prioridad: ENV > OFFICIAL > NADA
  return envUrl || OFFICIAL_WORKER_URL;
};

/**
 * Construye la URL completa para el fetch.
 * @param targetUrl La URL original del iCal (Airbnb/Booking)
 */
export const constructProxyUrl = (targetUrl: string): string => {
  if (!targetUrl) return "";

  // Bypass para mocks de desarrollo
  if (targetUrl.startsWith('mock://') || targetUrl.includes('localhost')) {
    return targetUrl;
  }

  const baseUrl = getProxyBaseUrl();
  
  // Construcción robusta de query params (maneja si el worker ya tiene '?')
  const separator = baseUrl.includes('?') ? '&' : '?';
  
  return `${baseUrl}${separator}url=${encodeURIComponent(targetUrl)}`;
};
