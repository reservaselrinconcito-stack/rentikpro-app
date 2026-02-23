import { createRequire } from 'module';
import assert from 'node:assert/strict';

import { PricingStudioStore } from '../services/pricingStudioStore';

type PricingDefaultsRow = {
  apartment_id: string;
  currency: string | null;
  base_price: number | null;
  default_min_nights: number | null;
  short_stay_mode: string | null;
  surcharge_type: string | null;
  surcharge_value: number | null;
};

type NightlyRateRow = {
  apartment_id: string;
  date: string;
  price: number | null;
  min_nights: number | null;
  short_stay_mode: string | null;
  surcharge_type: string | null;
  surcharge_value: number | null;
};

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addDaysUTC(dateStr: string, n: number): string {
  const dt = new Date(`${dateStr}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function dayOfWeek1to7(dateStr: string): number {
  // JS: 0=Sun..6=Sat; Pricing Studio UI uses 1=Mon..7=Sun
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
}

function applyWeeklyPatternToRange(args: {
  start: string;
  endInclusive: string;
  weeklyPattern: Record<number, number | ''>;
}): Array<{ date: string; price: number | null }> {
  const { start, endInclusive, weeklyPattern } = args;
  const out: Array<{ date: string; price: number | null }> = [];

  let cursor = start;
  while (cursor <= endInclusive) {
    const dow = dayOfWeek1to7(cursor);
    const v = weeklyPattern[dow];
    const price = v === '' ? null : Number(v);
    out.push({ date: cursor, price: Number.isFinite(price) ? price : null });
    cursor = addDaysUTC(cursor, 1);
  }
  return out;
}

class SqlJsInMemoryStore {
  private SQL: any;
  private db: any;

  static async create(): Promise<SqlJsInMemoryStore> {
    const require = createRequire(import.meta.url);
    const wasmDir = require.resolve('sql.js/dist/sql-wasm.wasm');
    const initSqlJsMod: any = await import('sql.js');
    const initSqlJs: any = initSqlJsMod.default || initSqlJsMod;
    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        // file is typically "sql-wasm.wasm"
        return wasmDir.replace(/sql-wasm\.wasm$/, file);
      },
    });
    const db = new SQL.Database();

    const store = new SqlJsInMemoryStore(SQL, db);
    store.ensureSchema();
    return store;
  }

  private constructor(SQL: any, db: any) {
    this.SQL = SQL;
    this.db = db;
  }

  private ensureSchema() {
    this.db.run(`CREATE TABLE IF NOT EXISTS apartment_pricing_defaults (
      apartment_id TEXT PRIMARY KEY,
      currency TEXT DEFAULT 'EUR',
      base_price REAL,
      default_min_nights INTEGER DEFAULT 1,
      short_stay_mode TEXT DEFAULT 'ALLOWED',
      surcharge_type TEXT DEFAULT 'PERCENT',
      surcharge_value REAL DEFAULT 0
    );`);

    this.db.run(`CREATE TABLE IF NOT EXISTS apartment_nightly_rates (
      apartment_id TEXT,
      date TEXT,
      price REAL,
      min_nights INTEGER,
      short_stay_mode TEXT,
      surcharge_type TEXT,
      surcharge_value REAL,
      UNIQUE(apartment_id, date)
    );`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_nightly_rates_apt ON apartment_nightly_rates(apartment_id);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_nightly_rates_date ON apartment_nightly_rates(date);`);
  }

  private queryObjects<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      const rows: any[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows as T[];
    } finally {
      stmt.free();
    }
  }

  private run(sql: string, params: any[] = []): void {
    const stmt = this.db.prepare(sql);
    try {
      stmt.run(params);
    } finally {
      stmt.free();
    }
  }

  async savePricingDefaults(apartmentId: string, defaults: any): Promise<void> {
    this.run(
      `INSERT OR REPLACE INTO apartment_pricing_defaults (
        apartment_id, currency, base_price, default_min_nights,
        short_stay_mode, surcharge_type, surcharge_value
      ) VALUES (?,?,?,?,?,?,?)`,
      [
        apartmentId,
        defaults.currency ?? 'EUR',
        defaults.basePrice ?? null,
        defaults.defaultMinNights ?? 1,
        defaults.shortStayMode ?? 'ALLOWED',
        defaults.surchargeType ?? 'PERCENT',
        defaults.surchargeValue ?? 0,
      ]
    );
  }

  async getPricingDefaults(apartmentId: string): Promise<any | null> {
    const rows = this.queryObjects<PricingDefaultsRow>(
      `SELECT * FROM apartment_pricing_defaults WHERE apartment_id = ? LIMIT 1`,
      [apartmentId]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      apartmentId: r.apartment_id,
      currency: r.currency ?? 'EUR',
      basePrice: r.base_price,
      defaultMinNights: r.default_min_nights,
      shortStayMode: r.short_stay_mode,
      surchargeType: r.surcharge_type,
      surchargeValue: r.surcharge_value,
    };
  }

  async upsertNightlyRatesBulk(apartmentId: string, rates: Array<any>): Promise<void> {
    this.run('BEGIN TRANSACTION');
    try {
      for (const r of rates) {
        this.run(
          `INSERT OR REPLACE INTO apartment_nightly_rates (
            apartment_id, date, price, min_nights, short_stay_mode, surcharge_type, surcharge_value
          ) VALUES (?,?,?,?,?,?,?)`,
          [
            apartmentId,
            r.date,
            r.price ?? null,
            r.minNights ?? null,
            r.shortStayMode ?? null,
            r.surchargeType ?? null,
            r.surchargeValue ?? null,
          ]
        );
      }
      this.run('COMMIT');
    } catch (e) {
      this.run('ROLLBACK');
      throw e;
    }
  }

  async getNightlyRates(apartmentId: string, from: string, to: string): Promise<any[]> {
    const rows = this.queryObjects<NightlyRateRow>(
      `SELECT * FROM apartment_nightly_rates
       WHERE apartment_id = ? AND date >= ? AND date < ?
       ORDER BY date ASC`,
      [apartmentId, from, to]
    );
    return rows.map(r => ({
      apartmentId: r.apartment_id,
      date: r.date,
      price: r.price,
      minNights: r.min_nights,
      shortStayMode: r.short_stay_mode,
      surchargeType: r.surcharge_type,
      surchargeValue: r.surcharge_value,
    }));
  }
}

type TestResult = { name: string; ok: boolean; message?: string };

async function main() {
  const results: TestResult[] = [];
  const record = (name: string, fn: () => void | Promise<void>) => (async () => {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (e: any) {
      results.push({ name, ok: false, message: e?.message || String(e) });
    }
  })();

  const store = await SqlJsInMemoryStore.create();
  const ps = new PricingStudioStore(store as any);
  const apt = 'apt_smoke_1';

  await record('null never 0: base_price null -> defaults null + computeStayRules empty', async () => {
    await store.savePricingDefaults(apt, {
      currency: 'EUR',
      basePrice: null,
      defaultMinNights: 2,
      shortStayMode: 'ALLOWED',
      surchargeType: 'PERCENT',
      surchargeValue: 0,
    });

    const defaults = await ps.getPricingDefaults(apt);
    assert.equal(defaults, null);

    const from = isoDate(2026, 1, 1);
    const to = isoDate(2026, 1, 4);
    const rules = await ps.computeStayRules(apt, from, to);
    assert.equal(rules.length, 0);
  });

  await record('null never 0: base_price 0 -> defaults null', async () => {
    await store.savePricingDefaults(apt, {
      currency: 'EUR',
      basePrice: 0,
      defaultMinNights: 2,
      shortStayMode: 'ALLOWED',
      surchargeType: 'PERCENT',
      surchargeValue: 0,
    });
    const defaults = await ps.getPricingDefaults(apt);
    assert.equal(defaults, null);
  });

  await record('computeStayRules uses MAX(minNights) and DISALLOW dominates', async () => {
    await store.savePricingDefaults(apt, {
      currency: 'EUR',
      basePrice: 100,
      defaultMinNights: 3,
      shortStayMode: 'ALLOWED',
      surchargeType: 'PERCENT',
      surchargeValue: 0,
    });

    const d1 = isoDate(2026, 1, 2);
    const d2 = isoDate(2026, 1, 3);
    await store.upsertNightlyRatesBulk(apt, [
      { date: d1, minNights: 1, shortStayMode: 'NOT_ALLOWED' },
      { date: d2, minNights: 5, shortStayMode: 'ALLOWED' },
    ]);

    const from = isoDate(2026, 1, 1);
    const to = isoDate(2026, 1, 4);
    const rules = await ps.computeStayRules(apt, from, to);
    assert.equal(rules.length, 3);

    const byDate = new Map(rules.map(r => [r.date, r]));
    assert.equal(byDate.get(isoDate(2026, 1, 1))?.minNights, 3);
    assert.equal(byDate.get(d1)?.minNights, 3); // MAX(3,1)
    assert.equal(byDate.get(d2)?.minNights, 5); // MAX(3,5)

    assert.equal(byDate.get(d1)?.shortStayMode, 'NOT_ALLOWED'); // DISALLOW dominates

    // Invariant: resolved prices must not be 0
    for (const r of rules) {
      assert.notEqual(r.price, 0);
    }
  });

  await record('getNightlyRates resolves missing fields and treats price=0 as null', async () => {
    await store.savePricingDefaults(apt, {
      currency: 'EUR',
      basePrice: 120,
      defaultMinNights: 2,
      shortStayMode: 'WITH_SURCHARGE',
      surchargeType: 'PERCENT',
      surchargeValue: 10,
    });

    const from = isoDate(2026, 2, 1);
    const to = isoDate(2026, 2, 5);

    await store.upsertNightlyRatesBulk(apt, [
      { date: isoDate(2026, 2, 2), price: 0, minNights: 0 },
      { date: isoDate(2026, 2, 3), price: null, minNights: null, shortStayMode: null },
    ]);

    const resolved = await ps.getNightlyRates(apt, from, to);
    const m = new Map(resolved.map(r => [r.date, r]));

    // price=0 -> treated as null -> fallback to defaults.basePrice
    assert.equal(m.get(isoDate(2026, 2, 2))?.price, 120);
    // minNights=0 -> treated as null -> fallback to defaults.defaultMinNights
    assert.equal(m.get(isoDate(2026, 2, 2))?.minNights, 2);
    // missing shortStayMode -> fallback
    assert.equal(m.get(isoDate(2026, 2, 3))?.shortStayMode, 'WITH_SURCHARGE');
  });

  await record('weekly pattern applies to correct weekdays (local helper)', async () => {
    // Week starting 2026-02-23 is Monday
    const start = isoDate(2026, 2, 23);
    const end = isoDate(2026, 3, 1); // Sunday
    const weeklyPattern: Record<number, number | ''> = {
      1: 100, // Mon
      2: 110,
      3: '',
      4: 130,
      5: 140,
      6: 150,
      7: 200, // Sun
    };

    const applied = applyWeeklyPatternToRange({ start, endInclusive: end, weeklyPattern });
    assert.equal(applied.length, 7);
    assert.equal(applied[0].date, start);
    assert.equal(applied[0].price, 100);
    assert.equal(applied[2].price, null); // Wednesday
    assert.equal(applied[6].price, 200); // Sunday
  });

  const failed = results.filter(r => !r.ok);
  for (const r of results) {
    if (r.ok) {
      console.log(`PASS  ${r.name}`);
    } else {
      console.log(`FAIL  ${r.name}`);
      if (r.message) console.log(`      ${r.message}`);
    }
  }

  if (failed.length) {
    console.log(`\nSmoke pricing studio: ${failed.length} failed / ${results.length} total`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nSmoke pricing studio: OK (${results.length} checks)`);
}

main().catch((e) => {
  console.error('Smoke pricing studio: unexpected error');
  console.error(e);
  process.exit(1);
});
