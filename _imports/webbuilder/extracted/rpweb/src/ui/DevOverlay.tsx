import React from 'react';
import type { BootstrapState, BootstrapLoadStep } from '../domain/types';

function fmtTime(ts: number | null): string {
  if (!ts) return '--';
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return String(ts);
  }
}

function fmtStep(label: string, step: BootstrapLoadStep | null | undefined): string {
  if (!step) return `${label}: --`;
  if (!step.ok && step.at == null && !step.errCode) return `${label}: skipped`;
  const ok = step.ok ? 'ok' : 'fallback';
  const err = !step.ok && step.errCode ? ` (${step.errCode})` : '';
  return `${label}: ${ok} @ ${fmtTime(step.at)}${err}`;
}

export const DevOverlay: React.FC<{ state: BootstrapState }> = ({ state }) => {
  if (!import.meta.env.DEV) return null;

  const [open, setOpen] = React.useState(false);

  const shownStatus =
    state.status === 'ready' && state.source === 'mixed' ? 'mixed' : state.status;

  const dbg = state.debug ?? null;
  const totalMs =
    dbg?.startedAt && dbg?.finishedAt ? Math.max(0, dbg.finishedAt - dbg.startedAt) : null;

  const errors = dbg
    ? [dbg.property, dbg.apartments, dbg.availability]
        .filter((s) => !s.ok && s.errCode)
        .map((s) => s.errCode)
    : [];

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 10000,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 11,
        lineHeight: 1.35,
        color: '#e7e5e4',
        background: 'rgba(28, 25, 23, 0.92)',
        border: '1px solid rgba(250, 204, 21, 0.25)',
        borderRadius: 10,
        padding: open ? '10px 12px' : '8px 10px',
        maxWidth: 360,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        userSelect: 'text',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#fbbf24' }}>dev overlay</div>
          <div>
            slug: <span style={{ color: '#34d399' }}>{state.slug ?? '--'}</span>
          </div>
          <div>
            status: <span style={{ color: '#93c5fd' }}>{shownStatus}</span>
            {state.source ? <span style={{ color: '#a8a29e' }}> (source={state.source})</span> : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            border: '1px solid rgba(250, 204, 21, 0.25)',
            background: 'rgba(250, 204, 21, 0.08)',
            color: '#fbbf24',
            borderRadius: 8,
            padding: '4px 8px',
            cursor: 'pointer',
            font: 'inherit',
            fontWeight: 700,
          }}
          aria-label={open ? 'Collapse dev overlay' : 'Expand dev overlay'}
        >
          {open ? 'hide' : 'show'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 8, color: '#d6d3d1' }}>
          <div>url: {window.location.pathname + window.location.search}</div>
          <div>loaded: {dbg?.finishedAt ? fmtTime(dbg.finishedAt) : '--'}{totalMs != null ? ` (${(totalMs / 1000).toFixed(2)}s)` : ''}</div>
          <div>{fmtStep('property', dbg?.property)}</div>
          <div>{fmtStep('payload', dbg?.apartments)}</div>
          <div>{fmtStep('availability', dbg?.availability)}</div>
          <div>
            errors: {errors.length ? errors.join(', ') : '--'}
            {state.error ? <span style={{ color: '#fb7185' }}> (unexpected)</span> : null}
          </div>
        </div>
      )}
    </div>
  );
};
