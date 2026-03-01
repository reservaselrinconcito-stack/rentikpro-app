![Release Pipeline](https://github.com/reservaselrinconcito-stack/rentikpro-app/actions/workflows/release.yml/badge.svg)
![Release Healthcheck](https://github.com/reservaselrinconcito-stack/rentikpro-app/actions/workflows/release-healthcheck.yml/badge.svg)

# RentikPro - Property Management App

This is a file-based property management application designed for Tauri.

## Tech Stack
- **Frontend**: React 18+, TypeScript, Tailwind CSS
- **Database**: SQLite (via `sql.js` in browser, native SQLite in Tauri)
- **Icons**: Lucide React

## Local Development (Browser Preview)
```bash
npm install
npm run dev
```

## Desktop Development (Tauri)
To run as a native desktop app:
1. Ensure you have the [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) installed.
2. Run:
```bash
npm run tauri dev
```

## Demo Build (Nexora)
Para generar el build de demostración publicable en `/rentikpro/demo/` (Cloudflare Pages):

```bash
npm run build:demo
# Para probar localmente en puerto 4173:
npm run preview:demo
```

## 🧪 Guía de Pruebas (Modo Demo & Aislamiento)

### 1. Build Web Demo (Nexora/Production)
Verificar aislamiento total:
- **Seed**: Acceder a `?seed=user_test_A`. Los cambios deben persistir solo bajo esta semilla.
- **Prefix**: Confirmar que en `localStorage` las claves empiezan por `rp_demo_`.
- **IndexedDB**: Ver en DevTools que la DB es `rp_demo_persistence`.
- **FS Bypass**: En modo demo, la app ignora rutas reales de Tauri y auto-carga un `demo_project`.

### 2. Modo Real (Desktop / Localhost)
Confirmar que el modo real no se ve afectado:
- **Localhost**: `npm run dev` no debe mostrar banner de demo ni forzar modo demo.
- **Tauri**: La app nativa (`npm run tauri dev`) tiene prohibido entrar en modo demo por defecto para proteger los datos reales del usuario.

## Project Concept
Unlike SaaS apps, RentikPro stores data in standard SQLite files (`*.rentikpro.sqlite`). 
The user can manage these files like regular documents, allowing for easy backups, 
versioning, and multi-device sync via cloud folders (iCloud, Dropbox, etc).
