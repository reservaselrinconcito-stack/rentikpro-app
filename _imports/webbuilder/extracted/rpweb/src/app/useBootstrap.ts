/**
 * app/useBootstrap.ts — Máquina de estados central del SaaS.
 *
 * Responsabilidades:
 *  1. Resuelve slug desde ?slug=, /{slug}, /{lang}/{slug}
 *  2. Determina el idioma (lang)
 *  3. Llama a safeLoadAll(slug)
 *  4. Devuelve BootstrapState tipado
 *
 * REGLA: La UI SOLO renderiza basándose en `status`.
 * REGLA: Este hook NUNCA devuelve null. Status inicial = 'loading'.
 */

import { useState, useEffect, useRef } from 'react';
import { safeLoadAll } from '../domain/safeData';
import { DEMO_PROPERTY, DEMO_APARTMENTS, DEMO_AVAILABILITY } from '../demo/demoData';
import type { BootstrapState } from '../domain/types';

// ─── Slug resolution ──────────────────────────────────────────────────────────

const KNOWN_ROUTES = new Set([
  'apartamentos', 'apartamento', 'a',
  'experiencias', 'guias', 'blog',
  'contacto', 'disponibilidad', 'rentikpro',
  'proximamente',
  'assets', 'api', 'admin', 'public',
]);

const SUPPORTED_LANGS = ['es', 'en', 'eu', 'ca', 'fr', 'de'];

function resolveSlugAndLang(
  pathSlug?: string, // Viene de React Router /:slug
): { slug: string | null; lang: string } {
  // 1. Query param ?slug=
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get('slug')?.trim();
  if (querySlug) {
    return { slug: querySlug, lang: params.get('lang') ?? detectLang() };
  }

  // 2. Slug inyectado desde React Router
  if (pathSlug) {
    // Caso: /{lang}/{slug} → pathSlug = lang, sub-ruta = slug
    if (SUPPORTED_LANGS.includes(pathSlug)) {
      // El lang está en el primer segmento; el slug real viene en el sub-path
      const subParts = window.location.pathname
        .split('/')
        .filter(Boolean)
        .slice(1); // quitar el lang
      const candidate = subParts[0];
      if (candidate && !KNOWN_ROUTES.has(candidate)) {
        return { slug: candidate, lang: pathSlug };
      }
      // Si solo hay /{lang}/ sin slug real → missing
      return { slug: null, lang: pathSlug };
    }

    // No es un idioma: es el slug directo
    if (!KNOWN_ROUTES.has(pathSlug)) {
      return { slug: pathSlug, lang: detectLang() };
    }
  }

  // 3. Path directo desde window (sin React Router)
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && SUPPORTED_LANGS.includes(segments[0])) {
    return { slug: segments[1] || null, lang: segments[0] };
  }
  if (segments.length >= 1 && !KNOWN_ROUTES.has(segments[0])) {
    return { slug: segments[0], lang: detectLang() };
  }

  return { slug: null, lang: detectLang() };
}

function detectLang(): string {
  const nav = navigator.language?.split('-')[0] ?? 'es';
  return SUPPORTED_LANGS.includes(nav) ? nav : 'es';
}

const DEMO_SLUGS = new Set(['demo', 'pepito', 'test', 'preview']);

// ─── Hook ─────────────────────────────────────────────────────────────────────

const INITIAL_STATE: BootstrapState = {
  status: 'loading',
  slug: null,
  lang: 'es',
  property: null,
  apartments: [],
  availability: null,
  source: 'demo',
  error: null,
  debug: null,
};

export function useBootstrap(pathSlug?: string): BootstrapState {
  const [state, setState] = useState<BootstrapState>(INITIAL_STATE);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const { slug, lang } = resolveSlugAndLang(pathSlug);

    // ── Sin slug → MissingSlug ──────────────────────────────────────────────
    if (!slug) {
      const now = Date.now();
      const skipped = { ok: false, at: null, errCode: null, errMessage: null } as const;
      setState({
        status: 'missing_slug',
        slug: null,
        lang,
        property: DEMO_PROPERTY,
        apartments: DEMO_APARTMENTS,
        availability: DEMO_AVAILABILITY,
        source: 'demo',
        error: null,
        debug: {
          startedAt: now,
          finishedAt: now,
          property: skipped,
          apartments: skipped,
          availability: skipped,
        },
      });
      return;
    }

    // ── Slug de demo explícito ──────────────────────────────────────────────
    if (DEMO_SLUGS.has(slug.toLowerCase())) {
      const now = Date.now();
      const skipped = { ok: false, at: null, errCode: null, errMessage: null } as const;
      setState({
        status: 'demo',
        slug,
        lang,
        property: { ...DEMO_PROPERTY, slug },
        apartments: DEMO_APARTMENTS,
        availability: DEMO_AVAILABILITY,
        source: 'demo',
        error: null,
        debug: {
          startedAt: now,
          finishedAt: now,
          property: skipped,
          apartments: skipped,
          availability: skipped,
        },
      });
      return;
    }

    // ── Carga real ──────────────────────────────────────────────────────────
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token') || undefined;

        const result = await safeLoadAll(slug, token);

        if (!mountedRef.current) return;

        if (result.notFound) {
          setState({
            status: 'notfound',
            slug,
            lang,
            property: result.property,
            apartments: result.apartments,
            availability: result.availability,
            source: 'demo',
            error: null,
            debug: result.debug ?? null,
          });
          return;
        }

        // source='demo' cuando la API falló → mode 'demo' para informar al usuario
        const finalStatus = result.source === 'demo' ? 'demo' : 'ready';

        setState({
          status: finalStatus,
          slug,
          lang,
          property: result.property,
          apartments: result.apartments,
          availability: result.availability,
          source: result.source,
          error: null,
          debug: result.debug ?? null,
        });
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[useBootstrap] Unexpected error:', err);
        setState({
          status: 'error',
          slug,
          lang,
          property: DEMO_PROPERTY,
          apartments: DEMO_APARTMENTS,
          availability: DEMO_AVAILABILITY,
          source: 'demo',
          error: err instanceof Error ? err : new Error(String(err)),
          debug: null,
        });
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [pathSlug]);

  return state;
}
