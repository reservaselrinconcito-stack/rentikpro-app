#!/usr/bin/env bash
set -euo pipefail

# Imports a base64-encoded .p12 Developer ID certificate into a temporary keychain.
# Intended for CI runners.

: "${MACOS_CERT_P12_B64:?Missing MACOS_CERT_P12_B64}"
: "${MACOS_CERT_PASSWORD:?Missing MACOS_CERT_PASSWORD}"

KEYCHAIN_NAME="${KEYCHAIN_NAME:-build.keychain}"
KEYCHAIN_PASSWORD="${KEYCHAIN_PASSWORD:-temp_password}"

P12_PATH="${P12_PATH:-/tmp/macos_cert.p12}"

echo "$MACOS_CERT_P12_B64" | base64 --decode > "$P12_PATH"

security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
security set-keychain-settings -lut 21600 "$KEYCHAIN_NAME"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"

# Make it the only keychain in the search list
security list-keychains -d user -s "$KEYCHAIN_NAME"

security import "$P12_PATH" -k "$KEYCHAIN_NAME" -P "$MACOS_CERT_PASSWORD" -T /usr/bin/codesign -T /usr/bin/productbuild -T /usr/bin/security

# Allow codesign to access the key without prompting
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"

echo "[import-cert] Imported certificate into keychain: $KEYCHAIN_NAME"
