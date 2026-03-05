/**
 * publish_one_property.mjs
 *
 * Reads the local SQLite DB, builds a PII-free availability payload,
 * and publishes it to the Cloudflare Worker's KV store.
 *
 * Env vars (set in rentikpro-app/.env.local, prefixed VITE_ so Vite loads them,
 * but here we load manually via dotenv-style reading):
 *
 *   VITE_PUBLIC_WORKER_URL   – e.g. https://rentikpro-public-api.reservas-elrinconcito.workers.dev
 *   VITE_ADMIN_TOKEN         – Bearer token  (Authorization: Bearer <token>)
 *   VITE_ADMIN_KEY           – Alt key        (Authorization: Bearer <key>)
 *   PROP_UUID                – Property UUID to publish
 *   DB_PATH                  – Path to local database.sqlite
 *                              default: ~/Documents/rentikRinconcito__LOCAL_BACKUP/database.sqlite
 *   DRY_RUN=1                – Print counts/payload size only; do NOT call the worker
 *
 * Worker API used (all existing endpoints):
 *   PUT  /admin/site-config?slug=pub:availability:UUID:staging  – writes availability JSON to staging KV key
 *   PUT  /admin/site-config?slug=pub:snapshot:UUID:staging      – writes snapshot JSON to staging KV key
 *   POST /admin/site-config/commit?propertyId=UUID              – promotes staging → final KV keys
 *   GET  /public/availability?propertyId=UUID                   – verify
 *
 * NOTE: The worker has no dedicated /admin/site-config/availability sub-path handler.
 * We use the generic /admin/site-config?slug=<key> endpoint which writes to arbitrary KV keys.
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { execSync }                 from "node:child_process";
import path                         from "node:path";
import os                           from "node:os";

// ─── Load .env.local ────────────────────────────────────────────────────────
const envPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.env.local");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
    if (m) {
      const k = m[1].trim();
      const v = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

// ─── Config ─────────────────────────────────────────────────────────────────
const WORKER   = (process.env.VITE_PUBLIC_WORKER_URL || "").replace(/\/$/, "");
const TOKEN    = process.env.VITE_ADMIN_TOKEN || process.env.VITE_ADMIN_KEY;
const PROP_ID  = process.env.PROP_UUID;
const DRY_RUN  = process.env.DRY_RUN === "1";
const DB_PATH  = process.env.DB_PATH ||
  path.join(os.homedir(), "Documents", "rentikRinconcito__LOCAL_BACKUP", "database.sqlite");

// ─── Validate ───────────────────────────────────────────────────────────────
const missing = [];
if (!WORKER)  missing.push("VITE_PUBLIC_WORKER_URL");
if (!TOKEN)   missing.push("VITE_ADMIN_TOKEN (or VITE_ADMIN_KEY)");
if (!PROP_ID) missing.push("PROP_UUID");

if (missing.length && !DRY_RUN) {
  console.error("❌  Missing required env vars:", missing.join(", "));
  console.error("    Create rentikpro-app/.env.local with:");
  missing.forEach(k => console.error(`    ${k}=...`));
  process.exit(1);
}
if (!existsSync(DB_PATH)) {
  console.error("❌  SQLite DB not found at:", DB_PATH);
  console.error("    Override with: DB_PATH=/path/to/database.sqlite node _ops/publish_one_property.mjs");
  process.exit(1);
}

// ─── Read SQLite ─────────────────────────────────────────────────────────────
// Write query to a temp file to avoid all shell quoting issues.
function sqliteQuery(sql) {
  const tmpSql = path.join(os.tmpdir(), `rp_pub_${process.pid}.sql`);
  writeFileSync(tmpSql, sql, "utf8");
  try {
    const out = execSync(
      `sqlite3 -json '${DB_PATH}' < '${tmpSql}'`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    return out ? JSON.parse(out) : [];
  } catch (e) {
    throw new Error(`sqlite3 error: ${e.stderr?.trim() || e.message}`);
  } finally {
    try { unlinkSync(tmpSql); } catch {}
  }
}

console.log("📂  DB:", DB_PATH);

// Get property details
const propRows = sqliteQuery(
  `SELECT id, name FROM properties WHERE id = '${PROP_ID}' LIMIT 1`
);
if (!propRows.length) {
  // Try without quotes
  const propRows2 = sqliteQuery(
    `SELECT id, name FROM properties WHERE id LIKE '%${PROP_ID.slice(0,8)}%' LIMIT 3`
  );
  if (!propRows2.length) {
    console.error("❌  No property found for UUID:", PROP_ID);
    console.error("    Available properties:");
    const all = sqliteQuery("SELECT id, name FROM properties LIMIT 20");
    all.forEach(p => console.error("   ", p.id, "-", p.name));
    process.exit(1);
  }
  console.error("❌  Property UUID mismatch. Did you mean:");
  propRows2.forEach(p => console.error("   ", p.id, "-", p.name));
  process.exit(1);
}
const propName = propRows[0].name;
console.log("🏠  Property:", propName, `(${PROP_ID})`);

// Get apartments for this property
const apartments = sqliteQuery(
  `SELECT id, name FROM apartments WHERE property_id = '${PROP_ID}'`
);
console.log(`🛋️   Apartments: ${apartments.length}`, apartments.map(a => a.name).join(", ") || "(none — using property as single unit)");

// Get calendar events (last 30 days → next 365 days)
const today = new Date();
const fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 30);
const toDate   = new Date(today); toDate.setFullYear(toDate.getFullYear() + 1);
const fromStr  = fromDate.toISOString().slice(0, 10);
const toStr    = toDate.toISOString().slice(0, 10);

const events = sqliteQuery(`
  SELECT id, apartment_id, property_id, start_date, end_date, status, event_state, event_kind, summary
  FROM calendar_events
  WHERE property_id = '${PROP_ID}'
    AND COALESCE(status, event_state) != 'cancelled'
    AND end_date >= '${fromStr}'
    AND start_date <= '${toStr}'
  ORDER BY start_date
`);

console.log(`📅  Calendar events in range [${fromStr} → ${toStr}]: ${events.length}`);
if (events.length) {
  const earliest = events[0].start_date;
  const latest   = events[events.length - 1].end_date;
  console.log(`    Range: ${earliest} → ${latest}`);
}

// ─── Build PII-free availability ────────────────────────────────────────────
// Format: { apartmentId: { "YYYY-MM-DD": "blocked" } }
// If no apartments defined, use propertyId as unit key.

function dateRange(startStr, endStr) {
  const dates = [];
  const start = new Date(startStr + "T00:00:00Z");
  const end   = new Date(endStr   + "T00:00:00Z");
  const cur   = new Date(start);
  while (cur < end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

const unitIds = apartments.length
  ? apartments.map(a => a.id)
  : [PROP_ID];

// Initialise the map
const availability = {};
unitIds.forEach(uid => { availability[uid] = {}; });

let totalBlockedNights = 0;
for (const ev of events) {
  const uid = ev.apartment_id || PROP_ID;
  if (!availability[uid]) availability[uid] = {};
  const nights = dateRange(ev.start_date, ev.end_date);
  for (const d of nights) {
    availability[uid][d] = "blocked";
  }
  totalBlockedNights += nights.length;
}

// ─── Build payloads ─────────────────────────────────────────────────────────
const generatedAt   = new Date().toISOString();
const availPayload  = { propertyId: PROP_ID, availability, generatedAt };
const snapshotPayload = {
  propertyId: PROP_ID,
  propertyName: propName,
  generatedAt,
  eventCount: events.length,
};

const availKB    = (JSON.stringify(availPayload).length / 1024).toFixed(1);
const snapKB     = (JSON.stringify(snapshotPayload).length / 1024).toFixed(1);

// ─── Dry-run output ──────────────────────────────────────────────────────────
console.log("\n📊  Payload summary:");
console.log(`    Events read    : ${events.length}`);
console.log(`    Blocked nights : ${totalBlockedNights}`);
console.log(`    Avail payload  : ${availKB} KB`);
console.log(`    Snapshot payload: ${snapKB} KB`);
console.log(`    Units covered  : ${unitIds.length}`);

if (DRY_RUN) {
  console.log("\n✅  DRY_RUN=1 — nothing was sent to the worker.");
  console.log("    Remove DRY_RUN=1 and add auth vars to publish for real.");
  process.exit(0);
}

// ─── Worker calls ────────────────────────────────────────────────────────────
const AUTH_HDR = `Bearer ${TOKEN}`;

async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": AUTH_HDR,
      "Content-Type":  "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json };
}

// We use the existing generic /admin/site-config?slug=<kv-key> endpoint
// because the worker doesn't have dedicated sub-path handlers for /snapshot and /availability.
const BASE    = WORKER;
const ENC_AV  = encodeURIComponent(`pub:availability:${PROP_ID}:staging`);
const ENC_SN  = encodeURIComponent(`pub:snapshot:${PROP_ID}:staging`);
const URL_AV  = `${BASE}/admin/site-config?slug=${ENC_AV}`;
const URL_SN  = `${BASE}/admin/site-config?slug=${ENC_SN}`;
const URL_CMT = `${BASE}/admin/site-config/commit?propertyId=${encodeURIComponent(PROP_ID)}`;
const URL_VER = `${BASE}/public/availability?propertyId=${encodeURIComponent(PROP_ID)}`;

console.log("\n🔁  Step 1/3 — PUT availability to staging KV…");
const r1 = await req("PUT", URL_AV, availPayload);
console.log("    Status:", r1.status);
if (r1.status >= 400) {
  console.error("    ❌  Error:", r1.text.slice(0, 600));
  process.exit(2);
}

console.log("🔁  Step 2/3 — PUT snapshot to staging KV…");
const r2 = await req("PUT", URL_SN, snapshotPayload);
console.log("    Status:", r2.status);
if (r2.status >= 400) {
  console.error("    ❌  Error:", r2.text.slice(0, 600));
  process.exit(3);
}

console.log("🔁  Step 3/3 — POST commit (staging → production)…");
const r3 = await req("POST", URL_CMT, {});
console.log("    Status:", r3.status);
if (r3.status >= 400) {
  console.error("    ❌  Error:", r3.text.slice(0, 600));
  process.exit(4);
}
console.log("    Commit result:", JSON.stringify(r3.json));

// ─── Verify ─────────────────────────────────────────────────────────────────
console.log("\n🔍  Verifying /public/availability…");
const rv = await req("GET", URL_VER);
console.log("    Status:", rv.status);
const avail = rv.json?.availability;
if (!avail || (typeof avail === "object" && Object.keys(avail).length === 0) ||
    (Array.isArray(avail) && avail.length === 0)) {
  console.error("    ❌  availability is still empty after publish!");
  console.error("       Possible cause: worker commit endpoint failed silently.");
  console.error("       Try manually: curl -s", JSON.stringify(URL_VER));
  process.exit(5);
}
const unitCount  = Object.keys(avail).length;
const nightCount = Object.values(avail).reduce((s, v) =>
  s + (typeof v === "object" ? Object.keys(v).length : 0), 0);
console.log(`    ✅  availability OK — ${unitCount} unit(s), ${nightCount} blocked nights`);
console.log("\n✅  Published successfully for propertyId:", PROP_ID);
