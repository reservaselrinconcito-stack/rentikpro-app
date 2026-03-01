/**
 * App.tsx — Punto de entrada SaaS multi-tenant.
 *
 * Capas:
 *  GlobalErrorBoundary → previene pantalla blanca total
 *  BrowserRouter → gestión de rutas
 *  Routes → /:lang/:slug, /:slug, / → AppShell
 *
 * El resto de la lógica vive en AppShell + useBootstrap.
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GlobalErrorBoundary } from './ui/GlobalErrorBoundary';
import { AppShell } from './app/AppShell';

const App: React.FC = () => (
  <GlobalErrorBoundary>
    <BrowserRouter>
      <Routes>
        {/*
          Soporte de rutas multi-tenant:
          /es/mi-slug      → lang=es, slug=mi-slug  (i18n ready)
          /mi-slug         → slug=mi-slug
          /                → missing slug → MissingSlugScreen
        */}
        <Route path="/:lang/:slug/*" element={<AppShell />} />
        <Route path="/:slug/*" element={<AppShell />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  </GlobalErrorBoundary>
);

export default App;
