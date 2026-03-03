/**
 * ui/GlobalErrorBoundary.tsx — Cortafuegos global de errores React.
 *
 * Envuelve TODA la app. Si cualquier componente lanza durante render,
 * se intercepta aquí y se muestra ErrorScreen en lugar de pantalla blanca.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GlobalErrorBoundary] Render error caught:', error, info.componentStack);
  }

  handleGoDemo = () => {
    window.location.href = '/?slug=demo';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafaf9',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        {/* Icono */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            fontSize: 32,
          }}
        >
          ⚠️
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1c1917', marginBottom: '0.5rem' }}>
          Algo salió mal
        </h1>

        <p style={{ color: '#78716c', maxWidth: 400, lineHeight: 1.6, marginBottom: '2rem' }}>
          Se produjo un error inesperado. Puedes intentar recargar la página
          o explorar la demo para ver cómo funciona el sistema.
        </p>

        {/* Detalle del error (solo en dev) */}
        {import.meta.env.DEV && this.state.error && (
          <pre
            style={{
              background: '#1c1917',
              color: '#fbbf24',
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              textAlign: 'left',
              maxWidth: 600,
              overflowX: 'auto',
              marginBottom: '2rem',
            }}
          >
            {this.state.error.message}
          </pre>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid #d6d3d1',
              background: '#fff',
              color: '#1c1917',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            🔄 Reintentar
          </button>

          <button
            onClick={this.handleGoDemo}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: '#ea580c',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            Ver Demo →
          </button>
        </div>
      </div>
    );
  }
}
