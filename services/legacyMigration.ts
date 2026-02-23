import JSZip from 'jszip';

import { projectPersistence, ProjectMetadata } from './projectPersistence';
import { pickProjectFolder } from './projectFolderManager';
import { invoke } from '@tauri-apps/api/core';
import { SQLiteStore } from './sqliteStore';

type OpenProjectResult = {
  project_json: string;
  db_base64: string;
  project_json_path: string;
  db_path: string;
};

type ValidateProjectResult = {
  ok: boolean;
  error: string | null;
  project_json_path: string;
  db_path: string;
};

declare const initSqlJs: any;

const MIGRATION_PREF_KEY = 'rp_migration_v1_done';

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function sanitizeFilename(name: string): string {
  return (name || 'rentikpro')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+/, '')
    .slice(0, 60) || 'rentikpro';
}

export async function detectLegacyLocalData(): Promise<{ hasLegacy: boolean; projects: ProjectMetadata[] }> {
  const projects = await projectPersistence.listProjects();
  return { hasLegacy: projects.length > 0, projects };
}

export function isMigrationDone(): boolean {
  try {
    return localStorage.getItem(MIGRATION_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function markMigrationDone(): void {
  try {
    localStorage.setItem(MIGRATION_PREF_KEY, '1');
  } catch {
    // ignore
  }
}

export async function exportLegacyBackup(id: string): Promise<void> {
  const rec = await projectPersistence.loadProject(id);
  if (!rec) throw new Error('Proyecto no encontrado en IndexedDB');

  const metaList = await projectPersistence.listProjects().catch(() => []);
  const meta = metaList.find(p => p.id === id);
  const lastModified = meta?.lastModified || Date.now();

  const zip = new JSZip();
  const stamped = await stampMigrationOnDbBytes(rec.data, rec.id);
  zip.file('database.sqlite', stamped);
  zip.file('project.json', JSON.stringify({
    schema: 1,
    name: rec.name,
    mode: rec.mode,
    exportedAt: Date.now(),
    lastModified,
    migration: {
      v1Done: true,
      source: 'indexeddb',
      legacyProjectId: rec.id,
      exportedAt: Date.now(),
    },
  }, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${sanitizeFilename(rec.name)}.rentikpro`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function execObjects(db: any, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

async function openSqlJsDatabase(bytes: Uint8Array): Promise<any> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/vendor/sqljs/${file}`
  });
  return new SQL.Database(bytes);
}

async function mergeWithCollisionHandling(targetDbBytes: Uint8Array, legacyDbBytes: Uint8Array, legacyId: string): Promise<Uint8Array> {
  // Load target into store (so migrations/helpers exist)
  const store = new SQLiteStore();
  await store.load(targetDbBytes);

  // Ensure migration_events table exists
  await (store as any).execute?.(
    `CREATE TABLE IF NOT EXISTS migration_events (
      id TEXT PRIMARY KEY,
      kind TEXT,
      entity TEXT,
      payload_json TEXT,
      created_at INTEGER
    );`
  );

  const now = Date.now();

  const existingBookingIds = new Set<string>((await store.query('SELECT id FROM bookings')).map((r: any) => r.id));
  const existingBookingKeys = new Set<string>((await store.query("SELECT booking_key FROM bookings WHERE booking_key IS NOT NULL AND booking_key <> ''")).map((r: any) => r.booking_key));
  const existingMovementIds = new Set<string>((await store.query('SELECT id FROM accounting_movements')).map((r: any) => r.id));
  const existingMovementKeys = new Set<string>((await store.query("SELECT movement_key FROM accounting_movements WHERE movement_key IS NOT NULL AND movement_key <> ''")).map((r: any) => r.movement_key));

  const legacyDb = await openSqlJsDatabase(legacyDbBytes);
  try {
    const legacyBookings = execObjects(legacyDb, 'SELECT * FROM bookings');
    for (let i = 0; i < legacyBookings.length; i++) {
      const b = legacyBookings[i];
      if (!b?.id) continue;
      const idCollision = existingBookingIds.has(b.id);
      const keyCollision = b.booking_key && existingBookingKeys.has(b.booking_key);

      if (idCollision || keyCollision) {
        const newId = `mig_${b.id}_${now}_${i}`;
        const newKey = b.booking_key ? `${b.booking_key}_mig_${now}` : null;
        const status = 'needs_review';

        await store.executeWithParams(
          `INSERT INTO bookings (
            id, property_id, apartment_id, traveler_id, check_in, check_out, status, total_price, guests, source,
            external_ref, created_at, booking_key, project_id, field_sources, updated_at, deleted_at,
            event_kind, event_origin, event_state, connection_id, ical_uid, raw_summary, raw_description
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            newId,
            b.property_id || null,
            b.apartment_id || null,
            b.traveler_id || null,
            b.check_in,
            b.check_out,
            status,
            b.total_price ?? 0,
            b.guests ?? 1,
            b.source || null,
            b.external_ref || null,
            b.created_at || now,
            newKey,
            b.project_id || null,
            b.field_sources || null,
            now,
            null,
            b.event_kind || null,
            b.event_origin || null,
            b.event_state || null,
            b.connection_id || null,
            b.ical_uid || null,
            (b.raw_summary || '') + ' [MIGRATION COLLISION]',
            (b.raw_description || '') + `\n[MIGRATION] legacy=${legacyId} collision=${idCollision ? 'id' : 'booking_key'}`
          ]
        );

        existingBookingIds.add(newId);
        if (newKey) existingBookingKeys.add(newKey);

        await store.executeWithParams(
          'INSERT OR REPLACE INTO migration_events (id, kind, entity, payload_json, created_at) VALUES (?,?,?,?,?)',
          [
            `evt_booking_${newId}`,
            'collision',
            'booking',
            JSON.stringify({ legacyId, oldId: b.id, newId, reason: idCollision ? 'id' : 'booking_key' }),
            now
          ]
        );
      } else {
        // Insert as-is using SQLiteStore.saveBooking mapping (best effort)
        await store.saveBooking({
          ...b,
          updated_at: b.updated_at || now,
        } as any);
        existingBookingIds.add(b.id);
        if (b.booking_key) existingBookingKeys.add(b.booking_key);
      }
    }

    const legacyMovements = execObjects(legacyDb, 'SELECT * FROM accounting_movements');
    for (let i = 0; i < legacyMovements.length; i++) {
      const m = legacyMovements[i];
      if (!m?.id) continue;
      const idCollision = existingMovementIds.has(m.id);
      const keyCollision = m.movement_key && existingMovementKeys.has(m.movement_key);

      if (idCollision || keyCollision) {
        const newId = `mig_${m.id}_${now}_${i}`;
        const newKey = m.movement_key ? `${m.movement_key}_mig_${now}` : null;

        await store.saveMovement({
          ...m,
          id: newId,
          movement_key: newKey,
          concept: `${m.concept || 'Movimiento'} [MIGRATION COLLISION]`,
          updated_at: now,
        } as any);

        existingMovementIds.add(newId);
        if (newKey) existingMovementKeys.add(newKey);

        await store.executeWithParams(
          'INSERT OR REPLACE INTO migration_events (id, kind, entity, payload_json, created_at) VALUES (?,?,?,?,?)',
          [
            `evt_mov_${newId}`,
            'collision',
            'payment',
            JSON.stringify({ legacyId, oldId: m.id, newId, reason: idCollision ? 'id' : 'movement_key' }),
            now
          ]
        );
      } else {
        await store.saveMovement({
          ...m,
          updated_at: m.updated_at || now,
        } as any);
        existingMovementIds.add(m.id);
        if (m.movement_key) existingMovementKeys.add(m.movement_key);
      }
    }

    // Mark migrated flag in settings table (schema_version store)
    await store.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER);');
    await store.executeWithParams(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?,?,?)',
      ['migration_v1_done', '1', now]
    );
    await store.executeWithParams(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?,?,?)',
      ['migration_v1_source', JSON.stringify({ legacyId, at: now }), now]
    );
  } finally {
    legacyDb.close();
  }

  return store.export();
}

async function stampMigrationOnDbBytes(dbBytes: Uint8Array, legacyId: string): Promise<Uint8Array> {
  const store = new SQLiteStore();
  await store.load(dbBytes);
  const now = Date.now();

  await store.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER);');
  await store.executeWithParams(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?,?,?)',
    ['migration_v1_done', '1', now]
  );
  await store.executeWithParams(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?,?,?)',
    ['migration_v1_source', JSON.stringify({ legacyId, at: now }), now]
  );

  await store.execute(
    `CREATE TABLE IF NOT EXISTS migration_events (
      id TEXT PRIMARY KEY,
      kind TEXT,
      entity TEXT,
      payload_json TEXT,
      created_at INTEGER
    );`
  );
  await store.executeWithParams(
    'INSERT OR REPLACE INTO migration_events (id, kind, entity, payload_json, created_at) VALUES (?,?,?,?,?)',
    [
      `evt_migration_${legacyId}_${now}`,
      'migrated',
      'project',
      JSON.stringify({ legacyId, at: now }),
      now
    ]
  );

  return store.export();
}

export async function migrateLegacyProjectToFolder(args: {
  legacyProjectId: string;
  targetFolderPath?: string;
  mode?: 'copy' | 'merge';
}): Promise<{ folderPath: string }>{
  if (!isTauriRuntime()) {
    throw new Error('Migration requires Tauri runtime');
  }

  const rec = await projectPersistence.loadProject(args.legacyProjectId);
  if (!rec) throw new Error('Proyecto no encontrado en IndexedDB');

  const metaList = await projectPersistence.listProjects().catch(() => []);
  const meta = metaList.find(p => p.id === args.legacyProjectId);
  const lastModified = meta?.lastModified || Date.now();

  const folderPath = args.targetFolderPath || await pickProjectFolder();
  if (!folderPath) throw new Error('No se seleccionó carpeta');

  const validate = await invoke<ValidateProjectResult>('validate_project_folder', { path: folderPath });
  const projectJson = JSON.stringify({
    schema: 1,
    name: rec.name,
    createdAt: lastModified,
    updatedAt: Date.now(),
    migration: {
      v1Done: true,
      source: 'indexeddb',
      legacyProjectId: rec.id,
      migratedAt: Date.now(),
    },
    mode: rec.mode,
    dbFile: 'db.sqlite',
  }, null, 2);

  if (!validate.ok) {
    // Fresh folder: just write db.sqlite
    const stamped = await stampMigrationOnDbBytes(rec.data, rec.id);
    await invoke<ValidateProjectResult>('write_project_folder', {
      path: folderPath,
      project_json: projectJson,
      db_base64: bytesToBase64(stamped),
      overwrite: false,
    } as any);
    markMigrationDone();
    return { folderPath };
  }

  // Existing project folder: merge (collision-handled)
  if ((args.mode || 'merge') !== 'merge') {
    throw new Error('La carpeta ya tiene un proyecto. Elige una carpeta vacía o usa modo merge.');
  }

  const existing = await invoke<OpenProjectResult>('open_project_folder', { path: folderPath });
  const mergedBytes = await mergeWithCollisionHandling(
    base64ToBytes(existing.db_base64),
    rec.data,
    rec.id
  );

  await invoke<ValidateProjectResult>('write_project_folder', {
    path: folderPath,
    project_json: projectJson,
    db_base64: bytesToBase64(mergedBytes),
    overwrite: true,
  } as any);

  markMigrationDone();
  return { folderPath };
}
