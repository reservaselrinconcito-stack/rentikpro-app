import { SQLiteStore } from './sqliteStore';
import { logger } from './logger';
import {
    Property, Apartment, Traveler, Booking, AccountingMovement,
    MarketingCampaign, WebSite, MarketingEmailTemplate, CleaningTask
} from '../types';

export class DemoGenerator {

    async generateDemoData(store: SQLiteStore, onProgress?: (msg: string) => void): Promise<void> {
        logger.log("[DemoGenerator] Starting demo data generation...");

        const report = (msg: string) => {
            logger.log(`[DemoGen] ${msg}`);
            if (onProgress) onProgress(msg);
        };

        const now = Date.now();
        const dayMs = 86400000;
        const dateStr = (offsetDays: number) => {
            const d = new Date(now + offsetDays * dayMs);
            return d.toISOString().split('T')[0];
        };
        const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
        const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

        try {
            report("Iniciando transacción...");
            // Use internal DB access if possible for speed, or just standard store methods wrapped in transaction
            // Start transaction manually if execute is private but accessible via any
            await store.execute("BEGIN TRANSACTION;");

            // --- PROPERTIES ---
            report("Generando propiedades y apartamentos...");
            const prop1: Property = {
                id: 'prop_demo_1', name: 'El Rincón del Viajero', description: 'Apartamentos con encanto en el centro histórico.',
                timezone: 'Europe/Madrid', currency: 'EUR', is_active: true, created_at: now, updated_at: now
            };
            const prop2: Property = {
                id: 'prop_demo_2', name: 'Sea View Suites', description: 'Vistas al mar y tranquilidad garantizada.',
                timezone: 'Europe/Madrid', currency: 'EUR', is_active: true, created_at: now, updated_at: now
            };
            await store.saveProperty(prop1);
            await store.saveProperty(prop2);

            // --- APARTMENTS ---
            const apts: Apartment[] = [
                { id: 'apt_demo_1', property_id: prop1.id, name: 'Suite Azul', color: '#3b82f6', created_at: now, is_active: true },
                { id: 'apt_demo_2', property_id: prop1.id, name: 'Loft Industrial', color: '#64748b', created_at: now, is_active: true },
                { id: 'apt_demo_3', property_id: prop1.id, name: 'Ático Terraza', color: '#eab308', created_at: now, is_active: true },
                { id: 'apt_demo_4', property_id: prop2.id, name: 'Apartamento Playa', color: '#06b6d4', created_at: now, is_active: true },
                { id: 'apt_demo_5', property_id: prop2.id, name: 'Studio Garden', color: '#22c55e', created_at: now, is_active: true },
            ];
            for (const a of apts) await store.saveApartment(a);

            // --- TRAVELERS (80-200) ---
            report("Insertando viajeros...");
            const numTravelers = randomInt(80, 200);
            const travelerIds: string[] = [];
            const names = ['Juan', 'Ana', 'Carlos', 'Lucía', 'Pedro', 'María', 'Luis', 'Sofia', 'Miguel', 'Elena', 'David', 'Carmen'];
            const surnames = ['García', 'Pérez', 'López', 'Ruiz', 'Sánchez', 'Fernández', 'Gómez', 'Díaz', 'Moreno', 'Álvarez'];
            const countries = ['ES', 'ES', 'ES', 'ES', 'FR', 'DE', 'UK', 'US', 'IT'];
            const provinces = [
                { p: 'Madrid', l: 'Madrid', cp: '28001' },
                { p: 'Barcelona', l: 'Barcelona', cp: '08001' },
                { p: 'Valencia', l: 'Valencia', cp: '46001' },
                { p: 'Sevilla', l: 'Sevilla', cp: '41001' },
                { p: 'Málaga', l: 'Málaga', cp: '29001' },
                { p: 'Alicante', l: 'Alicante', cp: '03001' },
                { p: 'Granada', l: 'Granada', cp: '18001' },
                { p: 'Baleares', l: 'Palma', cp: '07001' },
                { p: 'Las Palmas', l: 'Las Palmas', cp: '35001' },
                { p: 'Vizcaya', l: 'Bilbao', cp: '48001' }
            ];

            for (let i = 0; i < numTravelers; i++) {
                const tId = `trav_${i}`;
                travelerIds.push(tId);
                const country = randomItem(countries);
                const isSpain = country === 'ES';
                const geo = isSpain ? randomItem(provinces) : { p: undefined, l: undefined, cp: undefined };

                await store.saveTraveler({
                    id: tId,
                    nombre: randomItem(names),
                    apellidos: `${randomItem(surnames)} ${randomItem(surnames)}`,
                    email: `traveler${i}@example.com`,
                    telefono: isSpain ? `+34600${randomInt(100000, 999999)}` : `+${randomInt(1, 99)} ${randomInt(1000000, 9999999)}`,
                    tipo_documento: isSpain ? 'DNI' : 'PASAPORTE',
                    documento: isSpain ? `${randomInt(10000000, 99999999)}X` : `PASS${randomInt(100000, 999999)}`,
                    nacionalidad: country,
                    provincia: geo.p,
                    localidad: geo.l,
                    cp: geo.cp,
                    direccion: geo.p ? `Calle Mayor, ${randomInt(1, 100)}` : undefined,
                    created_at: now - randomInt(0, 365) * dayMs,
                    total_stays: randomInt(0, 5),
                    needs_document: Math.random() < 0.2
                });
            }


            // --- BOOKINGS (30-80) ---
            report("Insertando reservas...");
            const numBookings = randomInt(40, 60);
            const bookings: Booking[] = [];
            const sources = ['Airbnb', 'Booking.com', 'Directo', 'Expedia'];

            for (let i = 0; i < numBookings; i++) {
                const bId = `bk_demo_${i}`;
                const apt = randomItem(apts);
                const travId = randomItem(travelerIds);

                // Ensure ~5 bookings are in the next 14 days (Upcoming Arrivals)
                let checkInOffset;
                if (i < 5) {
                    checkInOffset = randomInt(1, 14);
                } else {
                    checkInOffset = randomInt(-365, 90);
                }

                const nights = randomInt(2, 7);
                const guests = randomInt(1, 4);
                const price = nights * randomInt(80, 150);

                let status: any = 'confirmed';
                if (checkInOffset > 30 && Math.random() < 0.1) status = 'cancelled';
                if (checkInOffset < -1) status = 'confirmed';

                const b: Booking = {
                    id: bId,
                    property_id: apt.property_id,
                    apartment_id: apt.id,
                    traveler_id: travId,
                    check_in: dateStr(checkInOffset),
                    check_out: dateStr(checkInOffset + nights),
                    status: status,
                    total_price: price,
                    guests: guests,
                    source: randomItem(sources),
                    created_at: now - randomInt(1, 60) * dayMs,
                    payment_status: checkInOffset < 0 ? 'PAID' : (Math.random() > 0.5 ? 'PAID' : 'PENDING'),
                };
                bookings.push(b);
                await store.saveBooking(b);
            }

            // --- ACCOUNTING (100-200) ---
            report("Insertando contabilidad...");
            for (let i = 0; i < randomInt(100, 200); i++) {
                const isIncome = Math.random() > 0.3;
                const apt = randomItem(apts);
                const amount = randomInt(30, 400);
                const mDate = dateStr(randomInt(-180, 0));

                await store.saveMovement({
                    id: `mv_demo_${i}`,
                    date: mDate,
                    type: isIncome ? 'income' : 'expense',
                    category: isIncome ? 'Alojamiento' : randomItem(['Limpieza', 'Mantenimiento', 'Suministros', 'Impuestos']),
                    concept: isIncome ? 'Reserva Demo' : 'Gasto General',
                    apartment_id: apt.id,
                    amount_gross: amount,
                    amount_net: amount * (isIncome ? 0.85 : 1),
                    commission: isIncome ? amount * 0.15 : 0,
                    vat: 0,
                    payment_method: 'Transferencia',
                    accounting_bucket: isIncome ? 'A' : 'B',
                    created_at: now,
                    updated_at: now
                });
            }

            // --- COMMUNICATIONS (10-20 Threads) ---
            report("Generando conversaciones y mensajes...");
            const numConversations = randomInt(10, 15);
            const msgBodies = [
                "¡Hola! ¿A qué hora podemos entrar?",
                "¿Tenéis secador de pelo en el apartamento?",
                "Todo perfecto, muchas gracias por la atención.",
                "Hola, ¿cómo puedo llegar desde el aeropuerto?",
                "Me gustaría cancelar mi reserva si es posible.",
                "¿Hay parking gratuito cerca?",
                "Gracias por la recomendación del restaurante!",
            ];

            for (let i = 0; i < numConversations; i++) {
                const traveler = randomItem(travelerIds);
                const convId = `conv_demo_${i}`;
                const booking = bookings.find(b => b.traveler_id === traveler);

                await store.saveConversation({
                    id: convId,
                    traveler_id: traveler,
                    booking_id: booking?.id,
                    property_id: booking?.property_id,
                    subject: booking ? `Reserva ${booking.id}` : "Consulta general",
                    status: 'OPEN',
                    last_message_at: now - randomInt(0, 5) * (dayMs / 24),
                    last_message_preview: "Hola, tengo una pregunta...",
                    unread_count: Math.random() > 0.7 ? 1 : 0,
                    tags_json: '[]',
                    created_at: now - 5 * dayMs,
                    updated_at: now
                });

                for (let j = 0; j < randomInt(2, 5); j++) {
                    const direction = j % 2 === 0 ? 'INBOUND' : 'OUTBOUND';
                    await store.saveMessage({
                        id: `msg_demo_${i}_${j}`,
                        conversation_id: convId,
                        direction: direction,
                        channel: 'AIRBNB',
                        status: 'READ',
                        body: direction === 'INBOUND' ? randomItem(msgBodies) : "Hola, claro que sí. Te ayudamos en lo que necesites.",
                        content_type: 'text/plain',
                        created_at: now - (5 - j) * (dayMs / 4)
                    });
                }
            }

            // --- CLEANING TASKS ---
            report("Generando tareas de limpieza...");
            for (const b of bookings.filter(x => x.status === 'confirmed')) {
                const checkoutDate = b.check_out;
                const isPast = new Date(checkoutDate).getTime() < now;

                await store.saveCleaningTask({
                    id: `cl_demo_${b.id}`,
                    apartment_id: b.apartment_id,
                    booking_id: b.id,
                    due_date: checkoutDate,
                    status: isPast ? 'DONE' : 'PENDING',
                    assigned_to: randomItem(['María', 'Carlos', 'Lucía']),
                    notes: "Limpieza estándar tras salida.",
                    created_at: now,
                    updated_at: now
                });
            }

            // --- MAINTENANCE ISSUES ---
            report("Generando incidencias de mantenimiento...");
            const maintenanceTitles = ["Grifo gotea", "Bombilla fundida", "Mando TV no funciona", "Aire acondicionado ruidoso", "Puerta terraza encalla"];
            for (let i = 0; i < 10; i++) {
                const status: any = randomItem(['OPEN', 'IN_PROGRESS', 'RESOLVED']);
                await store.saveMaintenanceIssue({
                    id: `maint_demo_${i}`,
                    apartment_id: randomItem(apts).id,
                    title: randomItem(maintenanceTitles),
                    description: "Se necesita revisión técnica pronto.",
                    priority: randomItem(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
                    status: status,
                    created_at: now - randomInt(1, 30) * dayMs,
                    resolved_at: status === 'RESOLVED' ? now : undefined
                });
            }

            // Marketing
            const campaigns: MarketingCampaign[] = [
                { id: 'cmp_demo_1', type: 'seasonal', name: 'Oferta Verano', automation_level: 'manual', enabled: false, created_at: now },
                { id: 'cmp_demo_2', type: 'birthday', name: 'Felicitación Cumpleaños', automation_level: 'automatic', enabled: true, created_at: now }
            ];
            for (const c of campaigns) await (store as any).saveCampaign(c);

            // Website
            await store.saveWebsite({
                id: 'web_demo_1',
                property_id: prop1.id,
                name: 'Web Demo',
                subdomain: 'demo-rentikpro',
                template_slug: 'universal-v1',
                plan_type: 'pro',
                public_token: 'demo-token',
                is_published: true,
                theme_config: JSON.stringify({ color: 'blue' }),
                seo_title: 'Apartamentos Demo',
                seo_description: 'Best place in town',
                sections_json: '[]',
                booking_config: '{}',
                property_ids_json: JSON.stringify([prop1.id, prop2.id]),
                allowed_origins_json: '[]',
                features_json: JSON.stringify({ slugManuallyEdited: false }),
                created_at: now,
                updated_at: now
            });

            // Settings
            await store.saveSettings({
                id: 'default',
                business_name: 'RentikPro Demo',
                business_description: 'Modo Demostración - Datos generados automáticamente.',
                created_at: now, updated_at: now,
                default_currency: 'EUR', contact_email: 'demo@rentikpro.com'
            });

            report("Finalizando...");
            await store.execute("COMMIT;");
            logger.log("[DemoGenerator] Transaction committed.");

        } catch (e) {
            logger.error("[DemoGenerator] Error generating data:", e);
            try { await store.execute("ROLLBACK;"); } catch (err) { /* ignore */ }
            throw e;
        }
    }
}

export const demoGenerator = new DemoGenerator();
