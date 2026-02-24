# RentikPro Nightly Hardening Report (2026-02-24)

Branch: `nightly/harden-20260224`

## Baseline
- `npm ci`: OK (npm audit reports 4 vulnerabilities; not auto-fixed tonight)
- `npx tsc -p tsconfig.typecheck.json --noEmit`: OK
- `npm test --silent`: OK (46 tests)
- `npm run build`: OK
- `npm run build:tauri`: OK
- Logs: `docs/nightly-logs/base-build.txt`
- DB inventory: `docs/nightly-logs/db-inventory.txt`

## Guard Rails Added (Small/Reversible)
- DB ready enforcement: global `getDbReady()` gate already in place; base helpers now await init if in-flight.
- DB write serialization: `SQLiteStore` write queue serializes `execute/executeWithParams` without deadlocks (re-entrant).
- Schema drift tolerance: `bookings.deleted_at` filter is applied only if column exists.
- Global async crash hooks: `src/main.tsx` + early import in `index.tsx` logs `unhandledrejection` and `window.error`.
- Calendar refresh plumbing (new feature layer): `reservations:changed` event + subscription hook.

## Fixes Included Tonight
- Communications runtime correctness: implement `SQLiteStore.getMessages(conversationId)` as alias to `getConversationMessages`.
- Cleaning templates: allow `getCleaningTemplates()` without a `propertyId` (returns all).
- UI type hardening: missing icon imports, boolean `disabled` prop fix.
- Web importer: ensure `WebSite` JSON fields are strings and required fields have safe defaults.
- Tauri build hardening: `src-tauri/icons/icon.png` normalized to RGBA (Tauri codegen requires alpha channel).

## Temp Workspace (Safety)
- Created for testing: `/tmp/rentikpro-workspaces-nightly-20260224`
- No user workspace paths were touched.

## Risks / Pending (Not Applied)
- Full-repo `tsc -p tsconfig.json` is not green (workers/scripts/legacy components).
  Nightly typecheck excludes those for now.
- Maintenance mode during restore (UI + store lock) is recommended but not applied tonight (risk of unintended UI behavior).

## Next Actions
1) Decide whether we want full-repo TypeScript strictness (would require cleaning up legacy/worker typings).
2) Add a small "maintenance lock" (restore/import) with UI spinner + blocked writes.
