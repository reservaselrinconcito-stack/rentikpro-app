#!/usr/bin/env bash
set -euo pipefail

# Verify macOS code signing and Gatekeeper status for a built .app bundle.

APP_PATH="${1:-src-tauri/target/release/bundle/macos/RentikPro.app}"

if [[ ! -d "$APP_PATH" ]]; then
  echo "[verify] ERROR: App not found: $APP_PATH" >&2
  exit 1
fi

echo "[verify] App: $APP_PATH"

echo "[verify] codesign --verify (deep/strict)"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo "[verify] codesign -dv"
codesign -dv --verbose=4 "$APP_PATH" 2>&1 | sed -n '1,120p'

echo "[verify] spctl --assess (Gatekeeper)"
spctl --assess --type execute --verbose=4 "$APP_PATH"

echo "[verify] DONE"
