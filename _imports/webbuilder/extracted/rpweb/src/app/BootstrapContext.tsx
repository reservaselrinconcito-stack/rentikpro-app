/**
 * app/BootstrapContext.tsx — Contexto global del estado de bootstrap.
 *
 * Provee: property, apartments, availability, slug, lang, source, status.
 * No hay llamadas a API en componentes de UI — todo viene de aquí.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import type { BootstrapState } from '../domain/types';

// ─── Context ──────────────────────────────────────────────────────────────────

const BootstrapContext = createContext<BootstrapState | null>(null);

export const BootstrapProvider: React.FC<{
  state: BootstrapState;
  children: ReactNode;
}> = ({ state, children }) => (
  <BootstrapContext.Provider value={state}>{children}</BootstrapContext.Provider>
);

// ─── Hook de consumo ──────────────────────────────────────────────────────────

export function useBootstrapState(): BootstrapState {
  const ctx = useContext(BootstrapContext);
  if (!ctx) {
    throw new Error('useBootstrapState must be used inside BootstrapProvider');
  }
  return ctx;
}

/** Shorthand para propiedad (siempre disponible dentro de ready/demo) */
export function useProperty() {
  const { property } = useBootstrapState();
  if (!property) throw new Error('useProperty called before property is available');
  return property;
}

export function useApartments() {
  return useBootstrapState().apartments;
}

export function useAvailability() {
  return useBootstrapState().availability;
}
