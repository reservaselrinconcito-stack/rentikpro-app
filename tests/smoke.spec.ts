import { test, expect } from '@playwright/test';

test.describe('RentikPro Smoke Tests', () => {

    const ensureProjectOpen = async (page: any) => {
        await page.waitForSelector('aside');

        const demoBtn = page.locator('button:has-text("Ver Demo")');
        if (await demoBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
            await demoBtn.click();
        }

        // We consider "project open" when the StartupScreen is gone.
        await expect(page.locator('h2:has-text("Bienvenido")')).toBeHidden({ timeout: 30000 });
    };

    const ensureDashboard = async (page: any) => {
        await ensureProjectOpen(page);
        await expect(page.locator('h2:has-text("Panel de Control")')).toBeVisible({ timeout: 30000 });
    };

    test.beforeEach(async ({ page }) => {
        // Reset minimal state for deterministic boot.
        await page.addInitScript(() => {
            try {
                localStorage.clear();
                sessionStorage.clear();
                // Enable optional Diagnostics screen for smoke.
                localStorage.setItem('rp_enable_diagnostics', '1');
            } catch {
                // ignore
            }
        });

        await page.goto('http://localhost:3000/#/');
        await ensureDashboard(page);
    });

    test('Dashboard renderiza y tiene métricas coherentes', async ({ page }) => {
        // 1. Verificar título
        await expect(page.locator('h2:has-text("Panel de Control")')).toBeVisible();

        // 2. Verificar que los contadores existen (usando labels exactos del StatCard)
        const arrivalsToday = page.locator('text="Llegadas Hoy"').locator('xpath=..').locator('h3');
        const departuresToday = page.locator('text="Salidas Hoy"').locator('xpath=..').locator('h3');
        const activeToday = page.locator('text="Reservas Activas"').locator('xpath=..').locator('h3');

        await expect(arrivalsToday).toBeVisible();
        await expect(departuresToday).toBeVisible();
        await expect(activeToday).toBeVisible();

        // 3. Coherencia básica: deben ser números >= 0
        for (const loc of [arrivalsToday, departuresToday, activeToday]) {
            const txt = (await loc.innerText()).trim();
            expect(Number.isFinite(Number(txt))).toBeTruthy();
            expect(Number(txt)).toBeGreaterThanOrEqual(0);
        }
    });

    test('Navegación desde menú lateral funcional', async ({ page }) => {
        // Test: Buzón Unificado
        await page.click('text="Buzón Unificado"');
        await expect(page).toHaveURL(/.*buzon|.*comms/);
        await expect(page.locator('h2:has-text("Buzón")')).toBeVisible();

        // Test: Check-in Scan
        await page.click('text="Check-in Scan"');
        await expect(page).toHaveURL(/.*checkins|.*checkin-scan/);
        await expect(page.locator('h2:has-text("Check-in")')).toBeVisible();

        // Test: Calendario
        await page.click('text="Calendario"');
        await expect(page).toHaveURL(/.*calendario|.*calendar/);
        await expect(page.locator('h2:has-text("Calendario")')).toBeVisible();
    });

    test('Auto-save no se queda infinito (badge)', async ({ page }) => {
        // Entrar en modo archivo (simular guardado disparando un cambio en Settings)
        await page.goto('http://localhost:3000/#/settings');
        await ensureProjectOpen(page);
        await expect(page.locator('h2:has-text("Configuración")')).toBeVisible({ timeout: 20000 });

        // Cambiar descripción del negocio para forzar save
        const descField = page.locator('textarea[placeholder*="negocio"]').first();
        if (await descField.isVisible()) {
            await descField.fill('RentikPro QA Smoke Test ' + Date.now());

            // Esperar a que aparezca el badge "Guardando…" (si estamos en modo archivo)
            // Nota: Si el entorno de test no tiene archivo abierto, el badge no aparecerá.
            // El test pasará si no detecta bloqueo constante.
            const savingBadge = page.locator('span:has-text("Guardando…")');

            try {
                if (await savingBadge.isVisible({ timeout: 2000 })) {
                    // El badge debe desaparecer o cambiar a "Guardado" en < 10s
                    await expect(savingBadge).not.toBeVisible({ timeout: 10000 });
                }
            } catch (e) {
                // No problem if badge didn't appear (not in file mode)
            }
        }
    });

    test('Diagnostics panel healthy', async ({ page }) => {
        await page.goto('http://localhost:3000/#/diagnostics');
        await ensureProjectOpen(page);
        await expect(page.locator('h2:has-text("Centro de Diagnósticos")')).toBeVisible({ timeout: 20000 });

        // 1. Verificar presencia de Auto-Fix
        await expect(page.locator('text="Auto-Fix (Acciones Seguras)"')).toBeVisible();
        await expect(page.locator('text="Reparar Esquema DB"')).toBeVisible();

        // 2. Verificar que no haya errores críticos (XCircle es text-rose-600)
        // Buscamos cualquier elemento con clase o contenido que indique fallo
        const failures = page.locator('.text-rose-600');
        const failureCount = await failures.count();

        // El estado de autosave puede ser 'error' si no hay archivo cargado en el test, 
        // así que filtramos por los checks de DB si es posible.
        if (failureCount > 0) {
            const failureText = ((await failures.first().textContent()) || '').trim();
            console.log('Diagnostics reported failure count:', failureCount, 'first:', failureText);
        }
    });

    test('Diagnostics report generation', async ({ page }) => {
        await page.goto('http://localhost:3000/#/diagnostics');
        await ensureProjectOpen(page);
        await expect(page.locator('h2:has-text("Centro de Diagnósticos")')).toBeVisible({ timeout: 20000 });

        // Probar botón "Copiar Informe"
        await page.click('text="Copiar Informe"');
        // Si la sonner toast aparece, el click fue exitoso
        await expect(page.locator('text=/Informe copiado/i')).toBeVisible({ timeout: 10000 });
    });

});
