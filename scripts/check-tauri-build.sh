#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "[release:mac] ERROR: $1" >&2
  exit 1
}

test -f dist/index.html || fail "dist/index.html no existe. Ejecuta build primero."

if grep -q "registerSW" dist/index.html; then
  fail "dist/index.html contiene 'registerSW' (inyeccion PWA/SW detectada)"
fi

if grep -q "virtual:pwa-register" dist/index.html; then
  fail "dist/index.html contiene 'virtual:pwa-register' (no debe aparecer en build Tauri)"
fi

if grep -q "serviceWorker.register" dist/index.html; then
  fail "dist/index.html contiene 'serviceWorker.register'"
fi

test ! -f dist/registerSW.js || fail "dist/registerSW.js existe"
test ! -f dist/sw.js || fail "dist/sw.js existe"

if ls dist/workbox-*.js >/dev/null 2>&1; then
  fail "dist/workbox-*.js existe"
fi

echo "[release:mac] OK: build tauri sin PWA/SW"
