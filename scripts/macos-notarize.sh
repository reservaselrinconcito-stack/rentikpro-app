#!/usr/bin/env bash
set -euo pipefail

# Notarize and staple a macOS DMG.
# Requires the DMG to already be code signed (Tauri build does this if a signing identity is available).
#
# Auth options:
# - Preferred: set NOTARYTOOL_KEYCHAIN_PROFILE (created via `xcrun notarytool store-credentials`).
# - Alternative: set APPLE_ID, APPLE_TEAM_ID, APPLE_APP_SPECIFIC_PASSWORD.

DMG_PATH="${1:-}"

if [[ -z "$DMG_PATH" ]]; then
  DMG_PATH=$(ls -1t src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null | head -n 1 || true)
fi

if [[ -z "$DMG_PATH" || ! -f "$DMG_PATH" ]]; then
  echo "[notarize] ERROR: DMG not found. Pass path as first arg or build first." >&2
  echo "[notarize] Expected: src-tauri/target/release/bundle/dmg/*.dmg" >&2
  exit 1
fi

echo "[notarize] DMG: $DMG_PATH"

if ! command -v xcrun >/dev/null 2>&1; then
  echo "[notarize] ERROR: xcrun not found (requires macOS Xcode CLT)." >&2
  exit 1
fi

if [[ -n "${NOTARYTOOL_KEYCHAIN_PROFILE:-}" ]]; then
  echo "[notarize] Using keychain profile: $NOTARYTOOL_KEYCHAIN_PROFILE"
  xcrun notarytool submit "$DMG_PATH" --keychain-profile "$NOTARYTOOL_KEYCHAIN_PROFILE" --wait
else
  : "${APPLE_ID:?Missing APPLE_ID (or set NOTARYTOOL_KEYCHAIN_PROFILE)}"
  : "${APPLE_TEAM_ID:?Missing APPLE_TEAM_ID (or set NOTARYTOOL_KEYCHAIN_PROFILE)}"
  : "${APPLE_APP_SPECIFIC_PASSWORD:?Missing APPLE_APP_SPECIFIC_PASSWORD (or set NOTARYTOOL_KEYCHAIN_PROFILE)}"
  echo "[notarize] Using APPLE_ID+TEAM_ID+APP_SPECIFIC_PASSWORD"
  xcrun notarytool submit "$DMG_PATH" --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_SPECIFIC_PASSWORD" --wait
fi

echo "[notarize] Stapling..."
xcrun stapler staple -v "$DMG_PATH"

echo "[notarize] Validating staple..."
xcrun stapler validate -v "$DMG_PATH" || true

echo "[notarize] Gatekeeper assessment (best-effort):"
spctl --assess --type open --verbose=4 "$DMG_PATH" || true

echo "[notarize] DONE"
