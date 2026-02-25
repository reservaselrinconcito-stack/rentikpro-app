import React from "react";

export function MaintenanceOverlay({ reason }: { reason?: string | null }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        pointerEvents: "all",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          width: 420,
          maxWidth: "90vw",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Mantenimiento en curso...
        </div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          {reason ? reason : "Procesando operacion critica. No cierres la app."}
        </div>
      </div>
    </div>
  );
}
