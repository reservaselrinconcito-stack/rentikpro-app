/**
 * ui/screens/index.tsx — Pantallas de estado del bootstrap.
 *
 * Una pantalla por cada status posible.
 * NINGUNA devuelve null. Todas son autosuficientes.
 */

import React from 'react';

// ─── Shared styles ────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#fafaf9',
  fontFamily: 'Inter, system-ui, sans-serif',
  padding: '2rem',
  textAlign: 'center',
};

const iconCircle = (bg: string): React.CSSProperties => ({
  width: 80,
  height: 80,
  borderRadius: '50%',
  background: bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '1.5rem',
  fontSize: 36,
  margin: '0 auto 1.5rem',
});

const ctaButton = (primary: boolean): React.CSSProperties => ({
  padding: '0.875rem 1.75rem',
  borderRadius: '0.75rem',
  border: primary ? 'none' : '1.5px solid #d6d3d1',
  background: primary ? '#ea580c' : '#fff',
  color: primary ? '#fff' : '#1c1917',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.95rem',
  textDecoration: 'none',
  display: 'inline-block',
});

// ─── LoadingScreen ─────────────────────────────────────────────────────────────

export const LoadingScreen: React.FC = () => (
  <div style={containerStyle}>
    <div
      style={{
        width: 44,
        height: 44,
        border: '4px solid #e7e5e4',
        borderTopColor: '#ea580c',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '1rem',
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ color: '#78716c', fontSize: 14, fontWeight: 500 }}>Cargando...</p>
  </div>
);

// ─── MissingSlugScreen ────────────────────────────────────────────────────────

export const MissingSlugScreen: React.FC = () => (
  <div style={containerStyle}>
    <div style={iconCircle('#fff7ed')}>🏡</div>

    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem' }}>
      Web Excelense · SaaS
    </h1>
    <p style={{ color: '#78716c', maxWidth: 420, lineHeight: 1.7, marginBottom: '2rem' }}>
      Este motor de plantillas se conecta a tu propiedad en RentikPro.
      Para ver un sitio específico, accede con tu slug:
    </p>

    <code
      style={{
        background: '#1c1917',
        color: '#fbbf24',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        fontSize: '0.85rem',
        marginBottom: '2rem',
        display: 'block',
      }}
    >
      {window.location.origin}/<span style={{ color: '#34d399' }}>tu-slug</span>
    </code>

    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <a href="/?slug=demo" style={ctaButton(true)}>
        🎮 Ver Demo
      </a>
      <a href="https://rentikpro.com" target="_blank" rel="noopener noreferrer" style={ctaButton(false)}>
        Ir a RentikPro →
      </a>
    </div>
  </div>
);

// ─── NotFoundScreen ───────────────────────────────────────────────────────────

export const NotFoundScreen: React.FC<{ slug?: string | null }> = ({ slug }) => (
  <div style={containerStyle}>
    <div style={iconCircle('#fef2f2')}>🔍</div>

    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem' }}>
      404 — No encontrado
    </h1>
    <p style={{ color: '#78716c', maxWidth: 400, lineHeight: 1.7, marginBottom: '2rem' }}>
      No existe ninguna propiedad con el identificador{' '}
      <strong style={{ color: '#1c1917' }}>"{slug ?? 'desconocido'}"</strong>.
      <br />
      Comprueba el slug o contacta con soporte.
    </p>

    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <button onClick={() => window.location.reload()} style={ctaButton(false)}>
        🔄 Reintentar
      </button>
      <a href="/?slug=demo" style={ctaButton(true)}>
        Ver Demo →
      </a>
    </div>
  </div>
);

// ─── ErrorScreen ──────────────────────────────────────────────────────────────

export const ErrorScreen: React.FC<{ error?: Error | null }> = ({ error }) => (
  <div style={containerStyle}>
    <div style={iconCircle('#fef2f2')}>⚠️</div>

    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem' }}>
      Error inesperado
    </h1>
    <p style={{ color: '#78716c', maxWidth: 400, lineHeight: 1.7, marginBottom: '2rem' }}>
      Se produjo un error al cargar la aplicación.
      Los datos de demo están disponibles mientras se resuelve el problema.
    </p>

    {import.meta.env.DEV && error && (
      <pre
        style={{
          background: '#1c1917',
          color: '#fbbf24',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          fontSize: '0.7rem',
          textAlign: 'left',
          maxWidth: 520,
          overflowX: 'auto',
          marginBottom: '1.5rem',
        }}
      >
        {error.message}
      </pre>
    )}

    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <button onClick={() => window.location.reload()} style={ctaButton(false)}>
        🔄 Reintentar
      </button>
      <a href="/?slug=demo" style={ctaButton(true)}>
        Ir a Demo →
      </a>
    </div>
  </div>
);

// ─── DemoBanner ───────────────────────────────────────────────────────────────

/** Banner no intrusivo que avisa cuando se muestran datos de demo */
export const DemoBanner: React.FC<{ source: string }> = ({ source }) => {
  const [visible, setVisible] = React.useState(true);
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1c1917',
        color: '#fbbf24',
        padding: '0.6rem 1.25rem',
        borderRadius: '9999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        zIndex: 9999,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
      }}
    >
      <span>🎮 Modo demo — datos de ejemplo {source === 'mixed' ? '(API parcial)' : ''}</span>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          padding: 0,
          fontSize: '1rem',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
};
