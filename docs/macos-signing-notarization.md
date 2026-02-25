# macOS Signing + Notarization (Tauri v2)

Goal: ship a DMG that opens on a clean Mac without "damaged app" / Gatekeeper blocks.

## Requirements

- Apple Developer account
- Developer ID Application certificate (exported to .p12)
- App-specific password for notarization (or a notarytool keychain profile)
- Xcode Command Line Tools (`xcrun`, `codesign`, `notarytool`, `stapler`)

## Local (manual) flow

1) Install deps + build + bundle DMG:

```bash
npm ci
npm run build
npx tauri build
```

2) Verify the signed app (expects your signing identity installed in Keychain):

```bash
bash scripts/macos-verify.sh
```

3) Notarize + staple DMG:

Option A (recommended): use a keychain profile.

```bash
# one-time (stores creds in Keychain)
xcrun notarytool store-credentials "rentikpro" --apple-id "you@domain.com" --team-id "TEAMID" --password "APP_SPECIFIC_PASSWORD"

export NOTARYTOOL_KEYCHAIN_PROFILE=rentikpro
bash scripts/macos-notarize.sh
```

Option B: pass credentials every time.

```bash
export APPLE_ID="you@domain.com"
export APPLE_TEAM_ID="TEAMID"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
bash scripts/macos-notarize.sh
```

## CI (GitHub Actions)

Workflow file: `.github/workflows/release-macos-notarized.yml`

Secrets expected:

- `MACOS_CERT_P12_B64`: base64 of exported .p12
- `MACOS_CERT_PASSWORD`: password used when exporting .p12
- Notarization (choose one):
  - `NOTARYTOOL_KEYCHAIN_PROFILE` (if you pre-create it on runner), OR
  - `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_SPECIFIC_PASSWORD`

## Clean Mac validation checklist

On a different machine/user profile:

- Download the DMG
- Open DMG
- Drag app to /Applications
- First launch should not show "app is damaged".

Command line checks:

```bash
spctl --assess --type execute --verbose=4 /Applications/RentikPro.app
codesign --verify --deep --strict --verbose=2 /Applications/RentikPro.app
```
