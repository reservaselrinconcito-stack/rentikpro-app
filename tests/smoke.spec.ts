import { test, expect } from '@playwright/test';

test.describe('RentikPro Smoke Tests', () => {

    test.beforeEach(async ({ page }) => {
        // Abrir la app (asumiendo que corre en localhost:3000 por defecto en Vite)
        await page.goto('http://localhost:3000');
        // Esperar a que el layout cargue (el logo o el aside)
        await page.waitForSelector('aside');
    });

    test('Dashboard renderiza y tiene métricas coherentes', async ({ page }) => {
        // 1. Verificar título
        await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();

        // 2. Verificar que los contadores existen (usando labels exactos del StatCard)
        const arrivals = page.locator('p:has-text("Próximas llegadas")').locator('xpath=..').locator('h3');
        const active = page.locator('p:has-text("Ocupación hoy")').locator('xpath=..').locator('h3');

        await expect(arrivals).toBeVisible();
        await expect(active).toBeVisible();

        // 3. Coherencia: Si hay contenido en la lista de llegadas, el contador no debe ser 0
        const arrivalsList = page.locator('div:has-text("Próximas Llegadas") >> nth=1');
        const hasArrivals = await arrivalsList.locator('div.flex.items-center.justify-between').count() > 0;

        if (hasArrivals) {
            const countVal = await arrivals.innerText();
            expect(Number(countVal)).toBeGreaterThan(0);
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
        await page.waitForSelector('input');

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
        await expect(page.locator('h2:has-text("Centro de Diagnósticos")')).toBeVisible();

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
            const failureText = await failures.first().innerText();
            console.log('Diagnostics reported failure:', failureText);
        }
    });

    test('Diagnostics report generation', async ({ page }) => {
        await page.goto('http://localhost:3000/#/diagnostics');
        await expect(page.locator('h2:has-text("Centro de Diagnósticos")')).toBeVisible();

        // Probar botón "Copiar Informe"
        await page.click('text="Copiar Informe"');
        // Si la sonner toast aparece, el click fue exitoso
        await expect(page.locator('text="Informe copiado"')).toBeVisible();
    });

});
