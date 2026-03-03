/**
 * app/AppShell.tsx — Shell central del SaaS multi-tenant.
 *
 * Arquitectura:
 *  Router → AppShell → useBootstrap (state machine)
 *  → según status: LoadingScreen | MissingSlugScreen | NotFoundScreen | ErrorScreen | Template
 *
 * PROHIBIDO retornar null. Siempre hay algo que renderizar.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useBootstrap } from './useBootstrap';
import { BootstrapProvider } from './BootstrapContext';
import { resolveTemplate } from '../templates/registry';
import {
  LoadingScreen,
  MissingSlugScreen,
  NotFoundScreen,
  ErrorScreen,
  DemoBanner,
} from '../ui/screens';
import { DevOverlay } from '../ui/DevOverlay';

// Langs soportados — si :lang no está aquí, es en realidad un slug
const SUPPORTED_LANGS = new Set(['es', 'en', 'eu', 'ca', 'fr', 'de']);

// ─── AppShell ─────────────────────────────────────────────────────────────────

export const AppShell: React.FC = () => {
  const params = useParams<{ slug?: string; lang?: string }>();

  /**
   * Resuelve el slug real según la combinación de parámetros de ruta.
   *
   * Casos:
   *  - /:lang/:slug  → lang en SUPPORTED_LANGS → slug = params.slug
   *  - /:lang/:slug  → lang NO en SUPPORTED_LANGS → slug = params.lang (es un slug, no lang)
   *  - /:slug        → slug = params.slug
   *  - /             → slug = undefined → MissingSlug
   */
  let pathSlug: string | undefined;

  if (params.lang && params.slug) {
    // Ruta /:lang/:slug
    if (SUPPORTED_LANGS.has(params.lang)) {
      // Es un lang real: /es/mi-slug
      pathSlug = params.slug;
    } else {
      // El "lang" es en realidad el slug: /mi-slug/subruta
      pathSlug = params.lang;
    }
  } else {
    // Ruta /:slug o /
    pathSlug = params.slug;
  }

  const bootstrap = useBootstrap(pathSlug);
  const overlay = <DevOverlay state={bootstrap} />;

  // ── 1. Loading ──────────────────────────────────────────────────────────────
  if (bootstrap.status === 'loading') {
    return (
      <>
        <LoadingScreen />
        {overlay}
      </>
    );
  }

  // ── 2. Sin slug → pantalla elegante informativa ─────────────────────────────
  if (bootstrap.status === 'missing_slug') {
    return (
      <>
        <MissingSlugScreen />
        {overlay}
      </>
    );
  }

  // ── 3. Slug no existe en backend ────────────────────────────────────────────
  if (bootstrap.status === 'notfound') {
    return (
      <>
        <NotFoundScreen slug={bootstrap.slug} />
        {overlay}
      </>
    );
  }

  // ── 4. Error inesperado ─────────────────────────────────────────────────────
  if (bootstrap.status === 'error') {
    return (
      <>
        <ErrorScreen error={bootstrap.error} />
        {overlay}
      </>
    );
  }

  // ── 5. Ready o Demo → renderizar plantilla ──────────────────────────────────
  const themeId = bootstrap.property?.theme?.themeId;
  const Template = resolveTemplate(themeId);

  return (
    <BootstrapProvider state={bootstrap}>
      <>
        <Template />
        {/* Banner de demo no intrusivo si los datos son de ejemplo */}
        {(bootstrap.status === 'demo' || bootstrap.source !== 'api') && (
          <DemoBanner source={bootstrap.source} />
        )}
        {overlay}
      </>
    </BootstrapProvider>
  );
};
