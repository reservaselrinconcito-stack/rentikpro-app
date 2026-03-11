import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const dbPath = process.argv[2];
if (!dbPath) {
  throw new Error('Usage: node scripts/ui-real-workspace-check.mjs <db-path>');
}
const projectId = process.argv[3] || 'workspace';

const base64 = fs.readFileSync(dbPath).toString('base64');
const outDir = path.resolve('tmp-ui-check');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.addInitScript(() => {
  try {
    localStorage.setItem('rentikpro_sync_interval', 'MANUAL');
    localStorage.removeItem('active_project_id');
    localStorage.removeItem('active_project_mode');
  } catch {}
});

const waitForApp = async () => {
  await page.goto('http://127.0.0.1:3001/#/', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.projectManager, null, { timeout: 30000 });
  await page.evaluate(async ({ base64, projectId }) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    await window.projectManager.loadProjectFromSqliteBytes(bytes, {
      projectId,
      name: 'UI Real Workspace Check',
      mode: 'real',
      setAsActive: false,
      startAutoSave: false,
      persistToIdb: false,
    });
    window.location.hash = '#/dashboard';
  }, { base64, projectId });
  await page.waitForTimeout(3000);
  await page.waitForSelector('aside', { timeout: 30000 });
};

const getDbSnapshot = async () => page.evaluate(async () => {
  const store = window.projectManager.getStore();
  const bookings = await store.query(`
    SELECT id, apartment_id, check_in, check_out, status, total_price, guest_name, summary,
           external_ref, ical_uid, linked_event_id, provisional_id, source, event_kind, event_state,
           event_origin, conflict_detected, is_duplicate, property_id
    FROM bookings
    ORDER BY apartment_id, check_in, created_at
  `);
  const events = await store.query(`
    SELECT id, connection_id, external_uid, ical_uid, apartment_id, start_date, end_date,
           status, summary, event_kind, event_state, is_duplicate, property_id
    FROM calendar_events
    ORDER BY apartment_id, start_date, created_at
  `);
  const movements = await store.query(`
    SELECT id, reservation_id, apartment_id, property_id, date, type, category, concept,
           amount_gross, amount_net, source_event_type, event_state, check_in, check_out,
           accounting_bucket, payment_method
    FROM accounting_movements
    ORDER BY apartment_id, date, created_at
  `);
  return { bookings, events, movements };
});

const collectUi = async () => {
  await page.evaluate(() => { location.hash = '#/calendar'; });
  await page.waitForSelector('h2:has-text("Calendario")', { timeout: 30000 });
  const calendarText = await page.locator('body').innerText();
  await page.screenshot({ path: path.join(outDir, 'calendar.png'), fullPage: true });

  await page.evaluate(() => { location.hash = '#/bookings'; });
  await page.waitForSelector('h2:has-text("Reservas")', { timeout: 30000 });
  const bookingsText = await page.locator('body').innerText();
  await page.screenshot({ path: path.join(outDir, 'bookings.png'), fullPage: true });

  await page.evaluate(() => { location.hash = '#/accounting'; });
  await page.waitForSelector('h2:has-text("Contabilidad")', { timeout: 30000 });
  const accountingText = await page.locator('body').innerText();
  await page.screenshot({ path: path.join(outDir, 'accounting.png'), fullPage: true });

  await page.evaluate(() => { location.hash = '#/channels'; });
  await page.waitForSelector('h2:has-text("Channel Manager")', { timeout: 30000 });
  const channelsText = await page.locator('body').innerText();
  await page.screenshot({ path: path.join(outDir, 'channels.png'), fullPage: true });

  return { calendarText, bookingsText, accountingText, channelsText };
};

await waitForApp();
const before = await collectUi();
const snapshot = await getDbSnapshot();

fs.writeFileSync(path.join(outDir, 'ui-before.json'), JSON.stringify(before, null, 2));
fs.writeFileSync(path.join(outDir, 'db-snapshot.json'), JSON.stringify(snapshot, null, 2));

await browser.close();
console.log(JSON.stringify({ outDir, beforeSummary: {
  bloqueoOtaCount: (before.calendarText.match(/Bloqueo OTA/g) || []).length,
  conflictCountBookings: (before.bookingsText.match(/conflicto|conflict/gi) || []).length,
  accountingHasZero: before.accountingText.includes('0,00') || before.accountingText.includes('0.00'),
} }, null, 2));
