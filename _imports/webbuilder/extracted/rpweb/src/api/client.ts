/**
 * api/client.ts — Cliente HTTP base para RentikPro.
 *
 * Maneja timeouts, headers comunes y errores de red.
 * Nunca lanza errores silenciosamente; propaga tipado.
 */

const DEFAULT_TIMEOUT_MS = 8_000;

export class ApiError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'NETWORK' | 'SERVER' | 'TIMEOUT',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  publicToken?: string;
  timeoutMs?: number;
}

export async function apiFetch<T>(
  config: ApiClientConfig,
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${config.baseUrl.replace(/\/$/, '')}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(config.publicToken ? { 'X-PUBLIC-TOKEN': config.publicToken } : {}),
      },
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 0, `Request timed out: ${path}`);
    }
    throw new ApiError('NETWORK', 0, `Network error: ${err?.message ?? 'unknown'}`);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) throw new ApiError('NOT_FOUND', 404, `Not found: ${path}`);
  if (response.status === 401 || response.status === 403) {
    throw new ApiError('UNAUTHORIZED', response.status, `Unauthorized: ${path}`);
  }
  if (!response.ok) {
    throw new ApiError('SERVER', response.status, `Server error ${response.status}: ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  config: ApiClientConfig,
  path: string,
  body: unknown,
): Promise<T> {
  const url = `${config.baseUrl.replace(/\/$/, '')}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(config.publicToken ? { 'X-PUBLIC-TOKEN': config.publicToken } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    throw new ApiError('NETWORK', 0, `Network error: ${err?.message ?? 'unknown'}`);
  }

  if (!response.ok) {
    throw new ApiError('SERVER', response.status, `POST ${path} → ${response.status}`);
  }

  return response.json() as Promise<T>;
}
