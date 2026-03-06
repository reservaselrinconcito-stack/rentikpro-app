/**
 * republish_ical_feeds.mjs
 *
 * Reads local SQLite DB, regenerates iCal ICS (with correct unique UIDs),
 * and publishes each apartment feed to the worker-ical KV.
 *
 * Usage:
 *   node _ops/republish_ical_feeds.mjs
 *   node _ops/republish_ical_feeds.mjs --dry-run
 *
 * Env (in .env.local):
 *   DB_PATH   – path to database.sqlite (default: ~/Documents/rentikRinconcito__LOCAL_BACKUP/database.sqlite)
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const DRY_RUN = process.argv.includes("--dry-run");
const WORKER_URL = "https://rentikpro-ical.reservas-elrinconcito.workers.dev";
const ADMIN_KEY  = "rentikpro_ical_2024";

// ─── Load .env.local ────────────────────────────────────────────────────────
const envPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const DB_PATH = process.env.DB_PATH ||
  path.join(os.homedir(), "Documents", "rentikRinconcito__LOCAL_BACKUP", "database.sqlite");

if (!existsSync(DB_PATH)) {
  console.error(`[republish-ical] DB not found: ${DB_PATH}`);
  process.exit(1);
}

// ─── sqlite3 helper ─────────────────────────────────────────────────────────
function sqlQuery(sql) {
  const tmp = path.join(os.tmpdir(), `_rp_ical_${Date.now()}.sql`);
  writeFileSync(tmp, sql);
  try {
    const out = execSync(`sqlite3 -json "${DB_PATH}" < "${tmp}"`, { encoding: "utf8", stdio: ["pipe","pipe","pipe"] });
    return JSON.parse(out || "[]");
  } catch (e) {
    return [];
  } finally {
    unlinkSync(tmp);
  }
}

// ─── UID generation (mirrors iCalGenerator.ts fix) ──────────────────────────
function buildUid(booking) {
  const isDirect = booking.source === "DIRECT_WEB" || booking.source === "WEB_CHECKOUT";
  if (isDirect) return `rp-web-${booking.id}`;

  const icalUid = booking.ical_uid;
  const isRealOtaUid = icalUid && !icalUid.startsWith("IMP-") && !icalUid.startsWith("rp-");
  return isRealOtaUid ? icalUid : `rp-${booking.id}`;
}

// ─── ICS builder ────────────────────────────────────────────────────────────
function buildIcs(calName, bookings) {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RentikPro//iCal Export 2.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    "X-WR-TIMEZONE:Europe/Madrid",
  ];

  for (const b of bookings) {
    const isDirect = b.source === "DIRECT_WEB" || b.source === "WEB_CHECKOUT";
    const summary = isDirect ? "Blocked" : `Reserva: ${b.guest_name || "Guest"}`;
    const description = isDirect ? "Booked via Direct" : `Reserva via ${b.source || "Manual"}`;
    const uid = buildUid(b);
    const start = (b.check_in || "").replace(/-/g, "");
    const end   = (b.check_out || "").replace(/-/g, "");

    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTAMP:${now}`);
    lines.push(`UID:${uid}@rentikpro.app`);
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${end}`);
    lines.push(`SUMMARY:${summary}`);
    if (description) lines.push(`DESCRIPTION:${description}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ─── generate stable token (mirrors iCalExportService.ts) ───────────────────
function generateToken(apartmentId) {
  let hash = 0;
  const seed = apartmentId + "_rentikpro_v2";
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return `rp_${Math.abs(hash).toString(36)}_${apartmentId.replace(/[^a-z0-9]/gi, "").substring(0, 8)}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const apartments = sqlQuery("SELECT id, name, ical_export_token FROM apartments;");
  if (!apartments.length) {
    console.log("[republish-ical] No apartments found in DB.");
    return;
  }

  console.log(`[republish-ical] Found ${apartments.length} apartment(s). DRY_RUN=${DRY_RUN}`);

  for (const apt of apartments) {
    const token = apt.ical_export_token || generateToken(apt.id);
    const bookings = sqlQuery(`
      SELECT id, check_in, check_out, guest_name, source, ical_uid, status
      FROM bookings
      WHERE apartment_id = '${apt.id}' AND status = 'confirmed';
    `);

    const icsText = buildIcs(`Unit Feed ${apt.id}`, bookings);
    const eventCount = (icsText.match(/BEGIN:VEVENT/g) || []).length;

    // Validate UID uniqueness
    const uids = (icsText.match(/^UID:(.+)$/gm) || []).map(l => l.replace("UID:", ""));
    const uniqueUids = new Set(uids);
    const hasDupes = uniqueUids.size < uids.length;

    console.log(`\n  Apt: ${apt.name || apt.id}`);
    console.log(`  Token: ${token}`);
    console.log(`  Events: ${eventCount} | Unique UIDs: ${uniqueUids.size}${hasDupes ? " ⚠️  DUPLICATES DETECTED" : " ✅"}`);
    if (eventCount > 0) console.log(`  Sample UIDs:`, uids.slice(0, 3));

    if (DRY_RUN) {
      console.log("  [dry-run] Skipping publish.");
      continue;
    }

    const resp = await fetch(`${WORKER_URL}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
      body: JSON.stringify({ token, icsText, unitName: apt.name || apt.id }),
    });

    if (!resp.ok) {
      console.error(`  ❌ Publish failed ${resp.status}: ${await resp.text()}`);
    } else {
      const { feedUrl } = await resp.json();
      console.log(`  ✅ Published → ${feedUrl}`);
    }
  }

  console.log("\n[republish-ical] Done.");
}

main().catch(e => { console.error(e); process.exit(1); });
