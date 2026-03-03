import React, { useMemo, useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useApartmentsPricingSync } from '../hooks/useApartmentsPricingSync';
import { getAvailability, getPublicApartments } from '../integrations/rentikpro/api';

const CACHE_KEY_PREFIX = 'rp_apts_';
const CACHE_TTL = 10 * 60 * 1000;

type PublicAptsDebug = {
  fetchedAt: string;
  mode: 'raw' | 'api';
  url?: string;
  status?: number;
  ok?: boolean;
  headers?: Record<string, string | null>;
  error?: string | null;
  data: unknown;
};

function maskToken(token?: string) {
  if (!token) return null;
  const t = String(token);
  if (t.length <= 8) return '********';
  return `${t.slice(0, 4)}...${t.slice(-4)}`;
}

function readLocalCache(key: string): { ts: number; data: unknown } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: unknown; data?: unknown };
    if (typeof parsed.ts !== 'number') return null;
    return { ts: parsed.ts, data: parsed.data };
  } catch {
    return null;
  }
}

export default function Debug() {
  useSEO({ title: '__debug', noindex: true, description: 'Dev debug route' });

  const siteConfig = useSiteConfig();
  const apartments = useApartmentsPricingSync();

  const [publicApts, setPublicApts] = useState<PublicAptsDebug | null>(null);
  const [publicAptsLoading, setPublicAptsLoading] = useState(false);

  const [avFrom, setAvFrom] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [avTo, setAvTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [availability, setAvailability] = useState<unknown>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const env = useMemo(() => {
    const workerUrl = import.meta.env.VITE_RP_WORKER_URL as string | undefined;
    const propertyId = import.meta.env.VITE_RP_PROPERTY_ID as string | undefined;
    const token = import.meta.env.VITE_RP_PUBLIC_TOKEN as string | undefined;
    return {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      debugRouteEnabled: import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_ROUTE === 'true',
      rentikpro: {
        workerUrl: workerUrl ?? null,
        propertyId: propertyId ?? null,
        publicTokenMasked: maskToken(token),
        hasAllPublicEnv: Boolean(workerUrl && propertyId && token),
      },
    };
  }, []);

  const cacheKey = useMemo(() => {
    const propertyId = (import.meta.env.VITE_RP_PROPERTY_ID as string | undefined) ?? 'default';
    return `${CACHE_KEY_PREFIX}${propertyId}`;
  }, []);

  const cacheInfo = useMemo(() => {
    const cached = readLocalCache(cacheKey);
    if (!cached) return { key: cacheKey, exists: false as const };
    const ageMs = Date.now() - cached.ts;
    return {
      key: cacheKey,
      exists: true as const,
      ts: cached.ts,
      tsIso: new Date(cached.ts).toISOString(),
      ageMs,
      ttlMs: CACHE_TTL,
      isValid: ageMs < CACHE_TTL,
      data: cached.data,
    };
  }, [cacheKey]);

  async function fetchPublicApartments() {
    setPublicAptsLoading(true);
    try {
      const workerUrl = import.meta.env.VITE_RP_WORKER_URL as string | undefined;
      const propertyId = import.meta.env.VITE_RP_PROPERTY_ID as string | undefined;
      const token = import.meta.env.VITE_RP_PUBLIC_TOKEN as string | undefined;

      if (workerUrl && propertyId && token) {
        const url = `${workerUrl}/public/apartments?propertyId=${propertyId}`;
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'X-PUBLIC-TOKEN': token,
          },
        });
        const text = await res.text().catch(() => '');
        let data: unknown = text;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          // keep raw text
        }

        const headers: Record<string, string | null> = {
          date: res.headers.get('date'),
          'cache-control': res.headers.get('cache-control'),
          age: res.headers.get('age'),
          etag: res.headers.get('etag'),
          'last-modified': res.headers.get('last-modified'),
          'x-cache': res.headers.get('x-cache'),
          'cf-cache-status': res.headers.get('cf-cache-status'),
        };

        setPublicApts({
          fetchedAt: new Date().toISOString(),
          mode: 'raw',
          url,
          status: res.status,
          ok: res.ok,
          headers,
          error: res.ok ? null : `HTTP ${res.status}`,
          data,
        });
        return;
      }

      const apiResult = await getPublicApartments();
      setPublicApts({
        fetchedAt: new Date().toISOString(),
        mode: 'api',
        error: apiResult.error,
        data: apiResult,
      });
    } catch (err) {
      setPublicApts({
        fetchedAt: new Date().toISOString(),
        mode: 'api',
        error: err instanceof Error ? err.message : 'Unexpected error',
        data: null,
      });
    } finally {
      setPublicAptsLoading(false);
    }
  }

  async function fetchAvailability() {
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    try {
      const result = await getAvailability(avFrom, avTo);
      setAvailability(result);
    } catch (err) {
      setAvailability(null);
      setAvailabilityError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setAvailabilityLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="font-serif text-3xl">/__debug</h1>
          <p className="text-sm text-ink-muted mt-2">
            Ruta de diagnostico (dev). Noindex activo.
          </p>
        </div>
        <div className="text-xs text-ink-muted text-right">
          <div>mode: <span className="font-mono">{String(env.mode)}</span></div>
          <div>dev: <span className="font-mono">{String(env.dev)}</span></div>
        </div>
      </div>

      <section className="bg-cream-light border border-cream-dark rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-sans text-sm uppercase tracking-wider">Site config snapshot</h2>
          <div className="text-xs text-ink-muted">id: <span className="font-mono">{siteConfig.id}</span></div>
        </div>
        <pre className="mt-4 text-xs overflow-auto bg-cream rounded-lg p-4 border border-cream-dark font-mono">
          {JSON.stringify(siteConfig, null, 2)}
        </pre>
      </section>

      <section className="bg-cream-light border border-cream-dark rounded-xl p-5 mb-6">
        <h2 className="font-sans text-sm uppercase tracking-wider">RentikPro env</h2>
        <pre className="mt-4 text-xs overflow-auto bg-cream rounded-lg p-4 border border-cream-dark font-mono">
          {JSON.stringify(env, null, 2)}
        </pre>
      </section>

      <section className="bg-cream-light border border-cream-dark rounded-xl p-5 mb-6">
        <h2 className="font-sans text-sm uppercase tracking-wider">Public apartments cache</h2>
        <div className="mt-2 text-xs text-ink-muted">
          localStorage key: <span className="font-mono">{cacheInfo.key}</span>
        </div>
        <pre className="mt-4 text-xs overflow-auto bg-cream rounded-lg p-4 border border-cream-dark font-mono">
          {JSON.stringify(cacheInfo, null, 2)}
        </pre>
      </section>

      <section className="bg-cream-light border border-cream-dark rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-sans text-sm uppercase tracking-wider">publicBasePrice por apartamento</h2>
          <div className="text-xs text-ink-muted">count: <span className="font-mono">{apartments.length}</span></div>
        </div>
        <pre className="mt-4 text-xs overflow-auto bg-cream rounded-lg p-4 border border-cream-dark font-mono">
          {JSON.stringify(
            apartments.map(a => ({
              slug: a.slug,
              name: a.name,
              priceFromLocal: a.priceFrom,
              publicBasePrice: a.publicBasePrice ?? null,
              currency: a.currency ?? null,
            })),
            null,
            2,
          )}
        </pre>
      </section>

      <section className="bg-cream-light border border-cream-dark rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-sans text-sm uppercase tracking-wider">Public apartments payload + headers</h2>
          <button
            className="px-3 py-2 rounded-lg bg-forest text-cream text-xs"
            onClick={fetchPublicApartments}
            disabled={publicAptsLoading}
          >
            {publicAptsLoading ? 'Cargando...' : 'Consultar'}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Si hay ENV completa, hace fetch directo y muestra headers accesibles por CORS. Si no, usa el wrapper <span className="font-mono">getPublicApartments()</span>.
        </p>
        <pre className="mt-4 text-xs overflow-auto bg-cream rounded-lg p-4 border border-cream-dark font-mono">
          {JSON.stringify(publicApts, null, 2)}
        </pre>
      </section>

      <section className="bg-cream-light border border-cream-dark rounded-xl p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-sans text-sm uppercase tracking-wider">Availability sample (manual)</h2>
          <button
            className="px-3 py-2 rounded-lg bg-rust text-cream text-xs"
            onClick={fetchAvailability}
            disabled={availabilityLoading}
          >
            {availabilityLoading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <label className="text-xs">
            <div className="text-ink-muted mb-1">from</div>
            <input
              className="w-full px-3 py-2 rounded-lg border border-cream-dark bg-cream font-mono text-xs"
              value={avFrom}
              onChange={e => setAvFrom(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </label>
          <label className="text-xs">
            <div className="text-ink-muted mb-1">to</div>
            <input
              className="w-full px-3 py-2 rounded-lg border border-cream-dark bg-cream font-mono text-xs"
              value={avTo}
              onChange={e => setAvTo(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </label>
        </div>

        {availabilityError && (
          <div className="mt-3 text-xs text-rust">{availabilityError}</div>
        )}

        <pre className="mt-4 text-xs overflow-auto bg-cream rounded-lg p-4 border border-cream-dark font-mono">
          {JSON.stringify(availability, null, 2)}
        </pre>
      </section>
    </div>
  );
}
