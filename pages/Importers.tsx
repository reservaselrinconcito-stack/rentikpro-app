import React, { useState, useEffect, useCallback } from 'react';
import { ProjectManager, projectManager } from '../services/projectManager';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import { Booking, AccountingMovement } from '../types';
import {
  FileUp, Wallet, RefreshCw, Database,
  Download, FileJson, Upload, LayoutGrid, Package, ShieldCheck, AlertCircle,
  Calendar, Users, CheckCircle2, FileText, X, MapPin, ToggleLeft, ToggleRight
} from 'lucide-react';
import { APP_VERSION, SCHEMA_VERSION } from '../src/version';
import { addDays } from '../utils/dateLogic';

type Tab = 'ACCOUNTING' | 'TRAVELERS' | 'BACKUP' | 'HEALTH';

/**
 * DIAGNOSTIC HELPER (DEV ONLY)
 */
async function checkDataIntegrity(store: any) {
  console.debug("[DIAG] Starting Data Integrity Check...");
  try {
    // 1. Top 20 booking_keys with COUNT(*) > 1
    const dupKeys = await store.query(`
      SELECT booking_key, COUNT(*) as count 
      FROM bookings 
      WHERE booking_key IS NOT NULL AND booking_key <> ''
      GROUP BY booking_key 
      HAVING count > 1 
      ORDER BY count DESC 
      LIMIT 20
    `);
    console.debug("[DIAG] Duplicated Booking Keys:", dupKeys);

    // 2. Top 20 bookings with same (apartment_id, checkin, checkout)
    const physicalDups = await store.query(`
      SELECT apartment_id, check_in, check_out, COUNT(*) as count 
      FROM bookings 
      GROUP BY apartment_id, check_in, check_out 
      HAVING count > 1 
      ORDER BY count DESC 
      LIMIT 20
    `);
    console.debug("[DIAG] Physical Overlaps (Apt + Dates):", physicalDups);

    // 3. Anomaly detection for names
    const nameAnomalies = await store.query(`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE guest_name IS NULL 
         OR guest_name = '' 
         OR guest_name LIKE 'Huésped%'
    `);
    console.debug("[DIAG] Guest Name Anomaly Count:", nameAnomalies[0]?.count || 0);

  } catch (e) {
    console.error("[DIAG] Integrity check failed:", e);
  }
}

export const Importers = () => {
  const [activeTab, setActiveTab] = useState<Tab>('ACCOUNTING');
  const [isProcessing, setIsProcessing] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [projectStats, setProjectStats] = useState<any>(null);

  // Restore missing state for Traveler Import Mode usually used in lines 330+ and 620+
  const [importMode, setImportMode] = useState<'STRICT' | 'FLEXIBLE'>('FLEXIBLE');
  const [pendingTravelers, setPendingTravelers] = useState<any[]>([]);

  // Opciones de Importación
  const [autoMatchGuests, setAutoMatchGuests] = useState(true);

  const handleExportPending = () => {
    if (pendingTravelers.length === 0) return;

    // Create CSV content
    const headers = ['Nombre', 'Apellidos', 'Email', 'Telefono', 'Nacionalidad', 'F. Nacim', 'DNI/Pasaporte (FALTANTE)'];
    const rows = pendingTravelers.map(t => [
      t.nombre,
      t.apellidos,
      t.email,
      t.telefono,
      t.nacionalidad,
      t.fecha_nacimiento,
      '' // Empty column for user to fill
    ].map(v => `"${v || ''}"`).join(',')); // Quote values

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `viajeros_pendientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addLog = (msg: string) => setLog(prev => [new Date().toLocaleTimeString() + ": " + msg, ...prev].slice(0, 100));

  const loadProjectHealth = useCallback(async () => {
    try {
      const store = projectManager.getStore();
      const counts = await store.getCounts();
      setProjectStats({ counts });
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadProjectHealth(); }, [activeTab, loadProjectHealth]);
  useDataRefresh(loadProjectHealth, ['all']);

  // Normalización de textos y cabeceras
  const normalizeHeader = (header: string) => {
    return header
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');
  };

  const normalizeText = (text: string) => {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  const normalizeDateToISO = (dateStr: string) => {
    if (!dateStr) return "";
    const s = dateStr.trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
    const parts = s.split(/[\/\-\.]/).filter(p => p.length > 0);
    if (parts.length >= 3) {
      const p0 = parts[0]; const p1 = parts[1]; const p2 = parts[2];
      // DD/MM/YYYY Check
      if (p2.length === 4) return `${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
      if (p0.length === 4) return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
    }
    return "";
  };

  const addDaysToDate = (dateStr: string, days: number): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const isGenericName = (name: string): boolean => {
    if (!name) return true;
    const n = name.toLowerCase().trim();
    if (!n) return true;
    const genericPatterns = [/^(huesped|hu[eé]sped|guest|cliente|sin nombre)/i];
    return genericPatterns.some(p => p.test(n));
  };

  const calculateNights = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim().replace(/[€$£\s]/g, '');

    // Si tiene coma y punto, asumimos formato europeo 1.000,00 o americano 1,000.00
    // Heurística simple: si la coma aparece después del punto o es único separador decimal
    if (s.includes(',') && !s.includes('.')) {
      s = s.replace(',', '.');
    } else if (s.includes(',') && s.includes('.')) {
      // Asumimos formato europeo: 1.200,50 -> Quitar puntos, cambiar coma por punto
      if (s.indexOf(',') > s.indexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      }
    }

    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    // Auto-detect separator
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';

    const headers = headerLine.split(separator).map(h => normalizeHeader(h.replace(/^"|"$/g, '')));

    return lines.slice(1).map(line => {
      // Basic CSV parser accounting for quotes
      let values = [];
      if (separator === ';') {
        values = line.split(';');
      } else {
        // Comma split needs regex for quoted fields
        // Simple implementation for now
        values = line.split(',');
      }

      const obj: any = {};
      headers.forEach((h, i) => {
        let val = values[i];
        if (val) val = val.replace(/^"|"$/g, '');
        obj[h] = val || "";
      });
      return obj;
    });
  };

  // --- CSV MAPPING HELPERS ---

  type ColumnDefinition = {
    key: string;
    label: string;
    required: boolean;
    aliases: string[];
  };

  const MAPPING_ACCOUNTING: ColumnDefinition[] = [
    { key: 'date', label: 'Fecha', required: true, aliases: ['FECHA', 'DIA', 'DATE', 'CREATED_AT', 'FECHA_OPERACION'] },
    { key: 'type', label: 'Tipo', required: true, aliases: ['TIPO', 'TYPE', 'KIND', 'MOVIMIENTO', 'INGRESO_GASTO', 'NATURE', 'NATURALEZA'] },
    { key: 'gross', label: 'Importe Bruto', required: true, aliases: ['IMPORTE_BRUTO', 'IMPORTE', 'AMOUNT', 'GROSS', 'BRUTO', 'TOTAL', 'CANTIDAD', 'VALOR', 'PRECIO', 'SALDO'] },
    { key: 'net', label: 'Importe Neto', required: false, aliases: ['IMPORTE_NETO', 'AMOUNT_NET', 'NETO', 'BASE', 'BASE_IMPONIBLE', 'NET'] },
    { key: 'vat', label: 'IVA', required: false, aliases: ['IVA', 'VAT', 'IMPUESTOS', 'TAX', 'IMPUESTO'] },
    { key: 'commission', label: 'Comisión', required: false, aliases: ['COMISION', 'COMMISSION', 'FEE', 'TASAS'] },
    { key: 'concept', label: 'Concepto', required: false, aliases: ['CONCEPTO', 'DESCRIPCION', 'CONCEPT', 'NOTES', 'DETALLE', 'DESC', 'MEMO', 'ASUNTO', 'SUMMARY'] },
    { key: 'guest', label: 'Huésped', required: false, aliases: ['HUESPED', 'GUEST', 'CLIENTE', 'CUSTOMER', 'VIAJERO'] },
    { key: 'nights', label: 'Noches', required: false, aliases: ['NOCHES', 'NIGHTS', 'STAY_LENGTH'] },
    { key: 'category', label: 'Categoría', required: false, aliases: ['CATEGORIA', 'CATEGORY', 'PARTIDA', 'FAMILY', 'CLASIFICACION', 'RUBRO'] },
    { key: 'supplier', label: 'Proveedor', required: false, aliases: ['PROVEEDOR', 'SUPPLIER', 'EMITIDO_POR', 'BENEFICIARIO', 'PAGADOR'] },
    { key: 'apartment', label: 'Apartamento', required: false, aliases: ['APARTAMENTO', 'APTO', 'UNIDAD', 'PROPIEDAD', 'APARTMENT', 'UNIT', 'VIVIENDA', 'ALOJAMIENTO', 'CASA'] },
    { key: 'platform', label: 'Plataforma', required: false, aliases: ['PLATAFORMA', 'CHANNEL', 'ORIGEN', 'SOURCE', 'CANAL', 'VIA'] },
    { key: 'payment_method', label: 'Método Pago', required: false, aliases: ['METODO_PAGO', 'PAYMENT', 'FORMA_PAGO', 'METODO', 'FORMA_DE_PAGO', 'MEDIO', 'TIPO_DE_PAGO'] },
    { key: 'arrival', label: 'Llegada', required: false, aliases: ['LLEGADA', 'CHECK-IN', 'CHECKIN', 'ARRIVAL', 'ENTRADA', 'IN', 'FECHA_LLEGADA'] },
    { key: 'departure', label: 'Salida', required: false, aliases: ['SALIDA', 'CHECK-OUT', 'CHECKOUT', 'DEPARTURE', 'OUT', 'FECHA_SALIDA'] },
    { key: 'external_ref', label: 'Ref. Externa', required: false, aliases: ['REF', 'RESERVA_ID', 'BOOKING_ID', 'ID_RESERVA', 'CODIGO', 'EXTERNAL_ID', 'CONFIRMATION'] }
  ];

  const MAPPING_TRAVELERS: ColumnDefinition[] = [
    { key: 'name', label: 'Nombre', required: true, aliases: ['NOMBRE', 'NAME', 'FIRST_NAME', 'NOM'] },
    { key: 'surname', label: 'Apellidos', required: false, aliases: ['APELLIDOS', 'SURNAMES', 'LAST_NAME', 'PRIMER_APELLIDO', 'APELLIDO1', 'SURNAME'] },
    { key: 'surname2', label: '2º Apellido', required: false, aliases: ['SEGUNDO_APELLIDO', 'APELLIDO2', 'SECOND_SURNAME'] },
    { key: 'doc', label: 'Documento', required: false, aliases: ['DNI', 'DOCUMENTO', 'PASSPORT', 'PASAPORTE', 'DOC_ID', 'NIF'] }, // Required logic handled by STRICT mode manually
    { key: 'type_doc', label: 'Tipo Doc', required: false, aliases: ['TIPO_DOCUMENTO', 'DOC_TYPE', 'TIPO_ID'] },
    { key: 'email', label: 'Email', required: false, aliases: ['EMAIL', 'CORREO', 'E-MAIL', 'MAIL'] },
    { key: 'phone', label: 'Teléfono', required: false, aliases: ['TELEFONO', 'PHONE', 'MOVIL', 'MOBILE', 'CELULAR'] },
    { key: 'nationality', label: 'Nacionalidad', required: false, aliases: ['NACIONALIDAD', 'NATIONALITY', 'PAIS', 'COUNTRY'] },
    { key: 'birthdate', label: 'F. Nacim', required: false, aliases: ['FECHA_NACIMIENTO', 'BIRTH_DATE', 'NACIMIENTO', 'DOB'] }
  ];

  const mapColumns = (csvHeaders: string[], definitions: ColumnDefinition[]) => {
    const mapping: Record<string, string> = {};
    const missing: string[] = [];

    const normalizedCSVHeaders = csvHeaders.map(h => normalizeHeader(h));

    definitions.forEach(def => {
      const matchIndex = normalizedCSVHeaders.findIndex(h => def.aliases.includes(h));
      if (matchIndex >= 0) {
        mapping[def.key] = csvHeaders[matchIndex];
      } else if (def.required) {
        missing.push(def.label);
      }
    });

    return { mapping, missing };
  };

  const handleImportAccounting = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true); setLog([]); setSummary(null);
    addLog(`Analizando CSV Financiero: ${file.name}`);

    try {
      const rawText = await file.text();
      const allRows = parseCSV(rawText);
      const lines = rawText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error("Archivo vacío o sin cabeceras");
      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());

      const { mapping, missing } = mapColumns(headers, MAPPING_ACCOUNTING);

      if (missing.length > 0) {
        throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}. \nDetectadas: ${headers.join(', ')}`);
      }

      addLog(`✅ Columnas mapeadas: ${Object.keys(mapping).length}/${MAPPING_ACCOUNTING.length}`);

      const store = projectManager.getStore();

      // 1. Scan CSV for date range to optimize prefetch
      const rowDates: number[] = [];
      allRows.forEach(row => {
        const d = normalizeDateToISO(row[normalizeHeader(mapping['date'] || '')] || '');
        if (d) rowDates.push(new Date(d).getTime());
      });

      const minMovDate = rowDates.length > 0 ? Math.min(...rowDates) : Date.now();
      const maxMovDate = rowDates.length > 0 ? Math.max(...rowDates) : Date.now();

      // Safety window for prefetch: CSV Range +/- 45 days
      const prefetchStart = minMovDate - (45 * 24 * 60 * 60 * 1000);
      const prefetchEnd = maxMovDate + (45 * 24 * 60 * 60 * 1000);

      const [existingMovements, allStays, allTravelers, rawBookings] = await Promise.all([
        store.getMovements('ALL'),
        store.getStays(),
        store.getTravelers(),
        store.getBookings()
      ]);

      // 2. Filter and Index Bookings in Memory
      const preparedBookings = rawBookings
        .filter(b => {
          const bin = new Date(b.check_in).getTime();
          const bout = new Date(b.check_out).getTime();
          return bin <= prefetchEnd && bout >= prefetchStart;
        })
        .map(b => ({
          ...b,
          normName: normalizeText(b.guest_name || ''),
          tokens: (b.guest_name || '').toLowerCase().split(' ').filter(t => t.length > 2),
          inTime: new Date(b.check_in).getTime(),
          outTime: new Date(b.check_out).getTime()
        }));

      addLog(`🔍 Candidatas encontradas: ${preparedBookings.length} reservas en la ventana temporal.`);

      const existingMovementHashes = new Set(existingMovements.map(m => m.import_hash));
      const batchId = crypto.randomUUID();
      let stats = { imported: 0, duplicates: 0, skipped: 0, linked: 0, bookingsCreated: 0, bookingsUpdated: 0, emptyGuests: 0, groupsNoDates: 0 };

      // 3. GROUP ROWS BY BOOKING KEY (MINI-BLOQUE A4)
      const groups = new Map<string, any[]>();
      for (const row of allRows) {
        const getVal = (key: string) => row[normalizeHeader(mapping[key] || '')] || '';
        const guestName = getVal('guest');
        const platform = getVal('platform');
        const extRef = getVal('external_ref');
        const arrival = normalizeDateToISO(getVal('arrival'));

        let bKey = "";
        if (extRef) bKey = normalizeText(`${platform}_${extRef}`);
        else if (guestName && arrival) bKey = normalizeText(`${guestName}_${arrival}`);

        if (bKey) {
          if (!groups.has(bKey)) groups.set(bKey, []);
          groups.get(bKey)!.push(row);
        } else {
          // Fallback: Individual movement without a group context
          groups.set(`unlinked_${crypto.randomUUID()}`, [row]);
          stats.groupsNoDates++;
        }
        console.debug(`[DIAG] Row mapped: bKey="${bKey}", guest="${guestName}", arrival="${arrival}", platform="${platform}", extRef="${extRef}"`);
      }

      addLog(`📦 Agrupados en ${groups.size} posibles reservas/conceptos.`);

      for (const [bookingKey, rows] of groups.entries()) {
        let matchedReservationId: string | null = null;
        let bookingWasCreated = false;

        // Try to find if booking already exists by key
        if (!bookingKey.startsWith('unlinked_')) {
          const existing = (await store as any).getBookingByKey ? await (store as any).getBookingByKey(bookingKey) : null;
          if (existing) {
            matchedReservationId = existing.id;
            stats.bookingsUpdated++;

            // ENRICHMENT: If existing has generic name, try to improve it from first row with a name
            if (isGenericName(existing.guest_name)) {
              for (const row of rows) {
                const getVal = (key: string) => row[normalizeHeader(mapping[key] || '')] || '';
                const candidate = getVal('guest');
                if (candidate && !isGenericName(candidate)) {
                  existing.guest_name = candidate;
                  await store.saveBooking(existing);
                  console.debug(`[ENRICH] Improved guest name by key match: "${candidate}"`);
                  break;
                }
              }
            }
          }
        }

        // Process each row in the group
        for (const row of rows) {
          const getVal = (key: string) => row[normalizeHeader(mapping[key] || '')] || '';

          const rawDate = getVal('date');
          const dateISO = normalizeDateToISO(rawDate);
          console.debug(`[DIAG] Group: ${bookingKey} | Processing row: date="${rawDate}"->"${dateISO}"`);
          if (!dateISO) {
            stats.skipped++;
            continue;
          }

          const movDate = new Date(dateISO).getTime();

          // Importe logic
          const netVal = parseNumber(getVal('net'));
          const grossVal = parseNumber(getVal('gross'));
          const isNegative = getVal('gross').trim().startsWith('-') || grossVal < 0 || getVal('net').trim().startsWith('-') || netVal < 0;

          const finalAmount = netVal !== 0 ? Math.abs(netVal) : Math.abs(grossVal);
          if (finalAmount === 0) {
            stats.skipped++;
            continue;
          }

          const vat = Math.abs(parseNumber(getVal('vat')));
          const commission = Math.abs(parseNumber(getVal('commission')));

          // Concepto Auto-generation
          let concept = getVal('concept');
          if (!concept) {
            const guest = getVal('guest');
            const platform = getVal('platform');
            const nights = getVal('nights');
            if (guest) concept = `Reserva - ${guest}`;
            else concept = 'Movimiento Importado';
            if (platform) concept += ` (${platform})`;
            if (nights) concept += ` - ${nights} noches`;
          }

          const category = getVal('category') || 'General';
          const supplier = getVal('supplier');
          const platform = getVal('platform');
          const paymentMethod = getVal('payment_method') || 'Importado';

          // Detect Type
          const rawType = (getVal('type') || '').toUpperCase();
          let finalType: 'income' | 'expense' = 'income';
          if (rawType.includes('GASTO') || rawType.includes('EXPENSE') || rawType.includes('OUTCOME')) {
            finalType = 'expense';
          } else if (rawType.includes('INGRESO') || rawType.includes('INCOME')) {
            finalType = 'income';
          } else {
            if (isNegative) finalType = 'expense';
            else if (platform && (platform.toUpperCase().includes('PROVEEDOR') || platform.toUpperCase().includes('SUPPLIER'))) {
              finalType = 'expense';
            }
          }

          // Apartment resolution
          const apartmentName = getVal('apartment');
          let apartmentId: string | null = null;
          if (apartmentName) {
            const apt = await store.findApartmentByName(apartmentName);
            if (apt) apartmentId = apt.id;
          }

          // SMART LINKING (Only if not already matched by key)
          if (!matchedReservationId && finalType === 'income') {
            const guestName = getVal('guest');
            if (guestName) {
              const normGuestImport = normalizeText(guestName);
              const guestTokensImport = normGuestImport.split(' ').filter(t => t.length > 2);

              let bestMatch: { id: string, score: number } | null = null;

              for (const b of preparedBookings) {
                const windowStart = b.inTime - (30 * 24 * 60 * 60 * 1000);
                const windowEnd = b.outTime + (30 * 24 * 60 * 60 * 1000);
                if (movDate < windowStart || movDate > windowEnd) continue;

                let score = 0;
                if (apartmentId && b.apartment_id === apartmentId) score += 50;
                const matchingTokens = guestTokensImport.filter(t => b.tokens.includes(t)).length;
                if (matchingTokens >= 2 || (guestTokensImport.length === 1 && b.tokens.includes(guestTokensImport[0]) && guestTokensImport[0].length > 5)) {
                  score += 35;
                } else if (b.normName.includes(normGuestImport) || normGuestImport.includes(b.normName)) {
                  score += 15;
                }
                const oneWeek = 7 * 24 * 60 * 60 * 1000;
                if (Math.abs(movDate - b.inTime) <= oneWeek || Math.abs(movDate - b.outTime) <= oneWeek) {
                  score += 20;
                }

                if (score >= 50 && (!bestMatch || score > bestMatch.score)) {
                  bestMatch = { id: b.id, score };
                }
              }

              if (bestMatch) {
                matchedReservationId = bestMatch.id;
                stats.linked++;
              }
            }
          }

          // IF STILL NO BOOKING AND IT'S A GROUPED INCOME -> CREATE/UPDATE (STAY-BASED CONSOLIDATION)
          if (!matchedReservationId && finalType === 'income' && !bookingKey.startsWith('unlinked_') && !bookingWasCreated) {
            const guestName = getVal('guest');
            const arrival = normalizeDateToISO(getVal('arrival') || getVal('date'));
            const nights = Math.max(1, parseInt(getVal('nights')) || 1);
            const departure = normalizeDateToISO(getVal('departure')) || (arrival ? addDays(arrival, nights) : null);

            if (arrival && departure && apartmentId) {
              const pId = projectManager.getCurrentProjectId() || 'default';
              const existingStay = await store.findBookingByStay(pId, apartmentId, arrival, departure);

              if (existingStay) {
                // UPSERT: Reuse existing ID and enrich if needed
                matchedReservationId = existingStay.id;
                bookingWasCreated = true;
                stats.bookingsUpdated++;
                console.debug(`[UPSERT] Found existing stay by dates: ${arrival} to ${departure}. ID: ${existingStay.id}`);

                if (isGenericName(existingStay.guest_name) && guestName && !isGenericName(guestName)) {
                  existingStay.guest_name = guestName;
                  if (!existingStay.booking_key) existingStay.booking_key = bookingKey;
                  await store.saveBooking(existingStay);
                  console.debug(`[UPSERT] Enriched existing booking with guest name: ${guestName}`);
                }
              } else if (guestName && arrival && departure) {
                // Really new stay
                if (normalizeText(guestName || '') === '') stats.emptyGuests++;
                const newBookingId = crypto.randomUUID();
                const newBooking: Booking = {
                  id: newBookingId,
                  property_id: 'unknown',
                  apartment_id: apartmentId || 'unknown',
                  traveler_id: '',
                  check_in: arrival,
                  check_out: departure,
                  status: 'confirmed',
                  total_price: 0,
                  guests: 1,
                  source: platform || 'IMPORT_FINANCIAL',
                  external_ref: getVal('external_ref') || null,
                  created_at: Date.now(),
                  guest_name: guestName,
                  booking_key: bookingKey,
                  project_id: projectManager.getCurrentProjectId() || undefined
                };
                await store.saveBooking(newBooking);
                matchedReservationId = newBookingId;
                bookingWasCreated = true;
                stats.bookingsCreated++;
                console.debug(`[UPSERT] Created new booking for stay: ${guestName} (${arrival} to ${departure})`);
              }
            }
          }

          const hash = `${dateISO}_${finalType}_${finalAmount}_${concept.substring(0, 20)}_${apartmentId || 'NA'}`;
          if (existingMovementHashes.has(hash)) {
            stats.duplicates++;
            continue;
          }

          await store.saveMovement({
            id: crypto.randomUUID(),
            date: dateISO,
            type: finalType,
            category,
            concept,
            apartment_id: apartmentId,
            reservation_id: matchedReservationId,
            amount_gross: grossVal !== 0 ? Math.abs(grossVal) : finalAmount,
            amount_net: finalAmount,
            vat: vat,
            commission: commission,
            supplier: supplier || (finalType === 'expense' ? platform : null),
            platform,
            payment_method: paymentMethod,
            accounting_bucket: 'A',
            import_hash: hash,
            import_batch_id: batchId,
            created_at: Date.now(),
            updated_at: Date.now(),
            movement_key: hash, // Using hash as movement_key for idempotency
            project_id: projectManager.getCurrentProjectId() || undefined
          });

          console.debug(`[DIAG] Movement saved: hash="${hash}", reservation_id="${matchedReservationId}", type="${finalType}", guest="${getVal('guest')}"`);

          existingMovementHashes.add(hash);
          stats.imported++;
        }
      }

      addLog(`Proceso finalizado.`);
      addLog(`> Resumen: OK: ${stats.imported} | Duplicados: ${stats.duplicates} | Omitidos: ${stats.skipped}`);
      if (stats.bookingsCreated > 0) addLog(`> Consolidación: ${stats.bookingsCreated} reservas creadas automáticamente.`);
      addLog(`> Inteligencia: ${stats.linked + stats.bookingsCreated}/${stats.imported} movimientos vinculados con reservas.`);

      console.debug(`[DIAG] FINAL STATS:`, {
        totalMovements: allRows.length,
        uniqueGroups: groups.size,
        groupsNoDates: stats.groupsNoDates,
        bookingsCreated: stats.bookingsCreated,
        bookingsLinkedToExisting: stats.bookingsUpdated,
        emptyGuestNamesDetected: stats.emptyGuests
      });

      // RUN INTEGRITY CHECK (DEV ONLY)
      await checkDataIntegrity(store);

      if (stats.imported > 0) {
        await projectManager.saveProject();
        notifyDataChanged('all', batchId);
      }
    } catch (err: any) {
      addLog(`❌ Error: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleImportTravelers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true); setLog([]); setSummary(null);
    addLog(`Analizando CSV Viajeros: ${file.name}`);
    addLog(`Modo: ${importMode === 'STRICT' ? 'Estricto' : 'Flexible'}`);

    try {
      const rawText = await file.text();
      const lines = rawText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error("Archivo vacío");
      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());
      const normalizedHeaders = headers.map(h => normalizeHeader(h));

      const mapResults = (() => {
        const m: Record<string, string> = {};
        const miss: string[] = [];
        MAPPING_TRAVELERS.forEach(def => {
          const found = normalizedHeaders.find(h => def.aliases.includes(h));
          if (found) m[def.key] = found;
          else if (def.required) miss.push(def.label);
        });
        return { m, miss };
      })();

      if (mapResults.miss.length > 0) {
        throw new Error(`Faltan columnas: ${mapResults.miss.join(', ')}.\n(Detectado: ${normalizedHeaders.join(', ')})`);
      }
      addLog(`✅ Columnas mapeadas OK`);

      const rows = parseCSV(rawText);
      const store = projectManager.getStore();
      const existingTravelers = await store.getTravelers();

      // Cache for fast lookup
      const travelerMaps = {
        doc: new Map<string, any>(),
        fingerprint: new Map<string, any>()
      };

      existingTravelers.forEach(t => {
        if (t.documento) travelerMaps.doc.set(normalizeText(t.documento), t);
        const fp = `${normalizeText(t.nombre)}|${normalizeText(t.apellidos)}|${t.fecha_nacimiento || ''}|${normalizeText(t.telefono || t.email || '')}`;
        travelerMaps.fingerprint.set(fp, t);
      });

      let imported = 0;
      let skipped = 0;
      let updated = 0;
      let pendingDoc = 0;
      let pendingList: any[] = [];

      for (const row of rows) {
        const getVal = (key: string) => row[mapResults.m[key]] || '';

        const nombre = getVal('name');
        const apellido1 = getVal('surname');
        const apellido2 = getVal('surname2');
        const apellidos = (apellido2 ? `${apellido1} ${apellido2}`.trim() : apellido1).trim();

        const documento = getVal('doc').trim();
        const tipoDoc = getVal('type_doc') || 'DNI';
        const email = getVal('email').toLowerCase().trim();
        const telefono = getVal('phone').trim();
        const nacionalidad = getVal('nationality') || 'España';
        const fechaNac = normalizeDateToISO(getVal('birthdate'));

        if (!nombre) {
          skipped++; continue;
        }

        // Deduplication Match
        let existing = null;
        const nDoc = documento ? normalizeText(documento) : '';
        const rowFp = `${normalizeText(nombre)}|${normalizeText(apellidos)}|${fechaNac || ''}|${normalizeText(telefono || email || '')}`;

        if (nDoc) existing = travelerMaps.doc.get(nDoc);
        if (!existing) existing = travelerMaps.fingerprint.get(rowFp);

        if (existing) {
          // If we find an existing traveler, we decide if we update it or skip
          // For now, let's treat it as "already exists" but update their traveler_key if missing?
          // Or just skip to avoid overwrite.
          if (!existing.traveler_key) {
            existing.traveler_key = crypto.randomUUID();
            await store.saveTraveler(existing);
            updated++;
          }
          skipped++;
          continue;
        }

        let needsDocument = false;
        if (!documento) {
          if (importMode === 'STRICT') {
            skipped++; continue;
          } else {
            needsDocument = true;
          }
        }

        const newTravelerId = crypto.randomUUID();
        const newTravelerKey = crypto.randomUUID();

        await store.saveTraveler({
          id: newTravelerId,
          nombre,
          apellidos,
          tipo_documento: tipoDoc,
          documento: documento || undefined,
          fecha_nacimiento: fechaNac,
          telefono,
          email,
          nacionalidad,
          created_at: Date.now(),
          needs_document: needsDocument,
          traveler_key: newTravelerKey
        });

        // Add to our cache for next rows in same file
        if (documento) travelerMaps.doc.set(nDoc, { id: newTravelerId, traveler_key: newTravelerKey });
        travelerMaps.fingerprint.set(rowFp, { id: newTravelerId, traveler_key: newTravelerKey });

        if (needsDocument) {
          pendingDoc++;
          pendingList.push({ nombre, apellidos, email, telefono, nacionalidad, fecha_nacimiento: fechaNac });
        } else {
          imported++;
        }
      }

      setPendingTravelers(pendingList);

      await projectManager.saveProject();
      notifyDataChanged('travelers');
      addLog(`Resumen Final:`);
      addLog(`✅ OK (Completos): ${imported}`);
      addLog(`⚠️ Pendientes (Sin Doc): ${pendingDoc}`);
      addLog(`⏭️ Omitidos/Duplicados: ${skipped}`);

      if (pendingList.length > 0) {
        addLog(`--- Ejemplos de Pendientes (Top 20) ---`);
        pendingList.slice(0, 20).forEach(p => {
          addLog(`• ${p.nombre} ${p.apellidos || ''}`);
        });
        if (pendingList.length > 20) addLog(`... y ${pendingList.length - 20} más.`);
      }

      notifyDataChanged('travelers');

    } catch (err: any) {
      addLog(`❌ Error: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };


  const handleFullExport = async () => {
    if (!window.confirm(`Se va a generar una copia completa (BD + Config + Channel Manager).\n\n¿Desea continuar?`)) {
      return;
    }

    setIsProcessing(true);
    addLog(`📦 Generando Backup Completo...`);

    // SAFARI FIX: Open popup synchronously before async work
    const popup = window.open('', '_blank');
    if (popup) {
      popup.document.write('Generando backup... Espere por favor.');
    } else {
      addLog("⚠️ Popup bloqueado. Se intentará descarga directa (puede fallar en iOS).");
    }

    try {
      // Force UI update
      await new Promise(r => setTimeout(r, 100));

      const { blob, filename } = await projectManager.exportFullBackupZip();
      const url = URL.createObjectURL(blob);

      if (popup && !popup.closed) {
        popup.document.body.innerHTML = `<a id="dl" href="${url}" download="${filename}">Descargando...</a>`;
        const a = popup.document.getElementById('dl');
        if (a) a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          popup.close();
        }, 2000);
      } else {
        // Fallback
        ProjectManager.triggerDownload(blob, filename);
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }

      addLog(`✅ Export generado: ${filename} (${(blob.size / 1024).toFixed(0)} KB)`);
    } catch (e: any) {
      if (popup && !popup.closed) popup.close();
      addLog(`❌ Error exportando: ${e.message}`);
      console.error(e);
      alert("Error al crear el backup: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleRestore = async (type: 'DATA' | 'STRUCTURE', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      addLog("❌ Error: Solo se aceptan archivos .json");
      alert("Error: El archivo debe ser un JSON válido (.json)");
      e.target.value = '';
      return;
    }

    setIsProcessing(true);
    addLog(`Validando archivo: ${file.name}`);

    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error("El archivo no contiene JSON válido");
      }

      // Version Info Display
      const backupAppVer = data.app_version || "Unknown";
      const backupSchemaVer = data.schema_version || 0;
      addLog(`ℹ️ Backup Info: App v${backupAppVer} (Schema ${backupSchemaVer})`);
      addLog(`ℹ️ Current System: App v${APP_VERSION} (Schema ${SCHEMA_VERSION})`);

      if (backupSchemaVer > SCHEMA_VERSION) {
        addLog(`⚠️ ADVERTENCIA: El backup es de una versión de esquema superior (${backupSchemaVer} > ${SCHEMA_VERSION}). Podría haber incompatibilidades.`);
      }

      // Validate structure
      if (type === 'DATA') {
        if (!data.travelers && !data.bookings && !data.movements) {
          throw new Error("El JSON no contiene datos válidos (falta travelers, bookings, movements)");
        }
        addLog(`✅ Validación OK: ${Object.keys(data).length} tablas encontradas`);
        const result = await projectManager.importProjectDataOnly(text);

        // New robust result handling
        if (result.success) {
          if (result.wasLegacy) {
            addLog("⚠️ Backup antiguo detectado (Schema 0). Se ha adaptado automáticamente.");
          }
          addLog("✅ Datos restaurados correctamente.");
        } else {
          addLog("⚠️ Restauración parcial con errores.");
        }

        // Log details
        if (result.counts) {
          Object.entries(result.counts).forEach(([table, count]) => {
            const c = count as number;
            if (c && c > 0) addLog(`   > ${table}: ${c} registros`);
          });
        }
        if (result.errors && Object.keys(result.errors).length > 0) {
          Object.entries(result.errors).forEach(([table, err]) => {
            addLog(`   ❌ Error en ${table}: ${err}`);
          });
          alert("Hubo errores en algunas tablas. Revisa el log.");
        }

        // Show real counts verification
        if (result.realCounts) {
          addLog(`> viajeros: ${result.realCounts.travelers}`);
          addLog(`> reservas: ${result.realCounts.bookings}`);
          addLog(`> movimientos: ${result.realCounts.movements}`);
          if (result.counts.settings) addLog(`> configuración: asegurada 👌`);
        }
        alert("Datos restaurados correctamente.");

      } else {
        if (!data.properties && !data.apartments) {
          throw new Error("El JSON no contiene estructura válida (falta properties, apartments)");
        }
        addLog(`✅ Validación OK: Estructura de proyecto válida`);

        const res: any = await projectManager.importProjectStructureOnly(text);
        if (res.wasLegacy) {
          addLog("⚠️ Backup antiguo detectado (Schema 0). Se ha adaptado la estructura.");
        }
        addLog("✅ Estructura restaurada correctamente");
        if (res.properties === 0) {
          addLog("⚠️ No se insertaron properties: revisar mapping del backup");
        } else {
          addLog(`> propiedades: ${res.properties}`);
          addLog(`> apartamentos: ${res.apartments}`);
          if (res.settings) addLog(`> configuración: ${res.settings} registro asegurado 👌`);
        }
      }

      notifyDataChanged('all');
      alert(`✅ Restauración completada: ${type === 'DATA' ? 'Datos' : 'Estructura'} `);

    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      addLog(`❌ Error en restauración: ${errorMsg} `);
      alert(`❌ Error al restaurar: ${errorMsg} `);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Herramientas</h2>
          <p className="text-slate-500 font-medium">Importación inteligente y copias de seguridad.</p>
        </div>
        <div className="bg-slate-100/50 p-1.5 rounded-2xl flex flex-wrap gap-1 shadow-inner backdrop-blur-sm">
          {(['ACCOUNTING', 'TRAVELERS', 'BACKUP', 'HEALTH'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === t
                ? 'bg-white shadow-sm text-indigo-600 scale-100 ring-1 ring-black/5'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                }`}
            >
              {t === 'ACCOUNTING' ? 'Contabilidad' : t === 'TRAVELERS' ? 'Viajeros' : t === 'BACKUP' ? 'Backup' : 'Estado'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'ACCOUNTING' && (
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl"><Wallet size={32} /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Contabilidad & Gastos</h3>
                  <p className="text-slate-400 text-xs mt-1 font-medium">Importa CSV de Ingresos/Gastos (Formato con punto y coma).</p>
                </div>
              </div>

              <div className="relative group border-2 border-dashed border-slate-200 bg-slate-50/30 rounded-[2.5rem] p-16 text-center hover:border-emerald-400 hover:bg-emerald-50/50 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-emerald-100/20 hover:scale-[1.01]">
                <input type="file" accept=".csv" disabled={isProcessing} onChange={handleImportAccounting} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="group-hover:-translate-y-2 transition-transform duration-300">
                  <FileUp className="mx-auto text-slate-200 mb-4 group-hover:text-emerald-500" size={48} />
                  <span className="font-black text-slate-600 text-lg group-hover:text-emerald-700 transition-colors">Subir CSV de Movimientos</span>
                  <p className="text-[10px] text-slate-400 mt-2 mx-auto max-w-[200px] font-bold">Autodetecta: Fecha, Tipo, Importe (Bruto/Neto), IVA.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TRAVELERS' && (
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl"><Users size={32} /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Importador CRM Viajeros</h3>
                  <p className="text-slate-400 text-xs mt-1 font-medium">Enriquece tu base de datos con datos personales para Marketing.</p>
                </div>
              </div>

              <div className="relative group border-2 border-dashed border-slate-200 bg-slate-50/30 rounded-[2.5rem] p-16 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-indigo-100/20 hover:scale-[1.01]">
                <input type="file" accept=".csv" disabled={isProcessing} onChange={handleImportTravelers} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="group-hover:-translate-y-2 transition-transform duration-300">
                  <FileText className="mx-auto text-slate-200 mb-4 group-hover:text-indigo-500" size={48} />
                  <span className="font-black text-slate-600 text-lg group-hover:text-indigo-700 transition-colors">Subir CSV de Clientes</span>
                  <p className="text-[10px] text-slate-400 mt-2 mx-auto max-w-[250px] font-bold">Columnas: NOMBRE, APELLIDOS, DNI, EMAIL, CHECK IN...</p>
                </div>
              </div>

              {pendingTravelers.length > 0 && (
                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex items-center justify-between animate-in slide-in-from-bottom-4 shadow-sm">
                  <div>
                    <h4 className="font-black text-orange-800 flex items-center gap-2"><AlertCircle size={18} /> {pendingTravelers.length} Viajeros Pendientes</h4>
                    <p className="text-xs text-orange-600 mt-1 font-bold">Se han importado pero les falta el Documento ID.</p>
                  </div>
                  <button onClick={handleExportPending} className="px-5 py-3 bg-white text-orange-600 font-black rounded-xl shadow-sm hover:shadow-md transition-all text-xs flex items-center gap-2 hover:-translate-y-0.5">
                    <Download size={14} /> Exportar CSV para completar
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'BACKUP' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <h4 className="text-lg font-black text-slate-800 flex items-center gap-2"><Download size={20} /> Exportar</h4>

                <button onClick={handleFullExport} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all font-black text-sm flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]">
                  <Package size={18} /> Exportar TODO ahora
                </button>
                <div className="text-[10px] text-center text-slate-400 -mt-2 mb-4 font-bold">Estructura + Datos + Configuración (.zip)</div>

                <div className="border-t border-slate-100 my-4"></div>

                <div className="space-y-3">
                  <button onClick={() => projectManager.exportProjectDataOnly()} className="group w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 hover:shadow-md transition-all font-bold text-xs text-slate-600 hover:text-indigo-600 hover:-translate-y-0.5">
                    Datos Operacionales <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors"><FileJson size={16} className="text-indigo-600" /></div>
                  </button>
                  <button onClick={() => projectManager.exportProjectStructureOnly()} className="group w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 hover:shadow-md transition-all font-bold text-xs text-slate-600 hover:text-indigo-600 hover:-translate-y-0.5">
                    Solo Estructura (Propiedades) <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors"><LayoutGrid size={16} className="text-indigo-600" /></div>
                  </button>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <h4 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users size={20} /> Importar Viajeros</h4>

                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Modo Flexible</span>
                  <button
                    onClick={() => setImportMode(m => m === 'STRICT' ? 'FLEXIBLE' : 'STRICT')}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${importMode === 'FLEXIBLE' ? 'bg-indigo-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ${importMode === 'FLEXIBLE' ? 'translate-x-6' : ''}`}></div>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-bold -mt-2 px-1">
                  {importMode === 'FLEXIBLE' ? 'Permite importar viajeros sin documento (pendientes).' : 'Solo importa viajeros con DNI/Pasaporte válido.'}
                </p>

                <div className="relative group mt-4">
                  <button className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all font-black text-sm flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]">
                    <Upload size={18} /> Seleccionar CSV
                  </button>
                  <input type="file" accept=".csv" onChange={handleImportTravelers} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              <div className="md:col-span-2 bg-indigo-50/50 p-10 rounded-[2.5rem] border border-indigo-100 shadow-sm space-y-6">
                <h4 className="text-lg font-black text-indigo-900 flex items-center gap-2"><Upload size={20} /> Restaurar Copia</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative group p-6 bg-white rounded-2xl flex items-center justify-between font-bold text-sm cursor-pointer border border-slate-100 shadow-sm hover:border-rose-200 hover:shadow-rose-100/50 hover:shadow-md transition-all hover:-translate-y-1">
                    <input type="file" accept=".json" onChange={e => handleRestore('DATA', e)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <span className="text-slate-600 group-hover:text-rose-600 transition-colors">Cargar JSON de Datos</span>
                    <div className="bg-rose-50 p-2 rounded-xl group-hover:bg-rose-100 transition-colors"><Database size={20} className="text-rose-500" /></div>
                  </div>
                  <div className="relative group p-6 bg-white rounded-2xl flex items-center justify-between font-bold text-sm cursor-pointer border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-indigo-100/50 hover:shadow-md transition-all hover:-translate-y-1">
                    <input type="file" accept=".json" onChange={e => handleRestore('STRUCTURE', e)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <span className="text-slate-600 group-hover:text-indigo-600 transition-colors">Cargar JSON de Estructura</span>
                    <div className="bg-indigo-50 p-2 rounded-xl group-hover:bg-indigo-100 transition-colors"><Package size={20} className="text-indigo-500" /></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'HEALTH' && (
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8 text-center">
              <ShieldCheck size={64} className="mx-auto text-emerald-500" />
              <h3 className="text-3xl font-black text-slate-800">Salud del Proyecto</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(projectStats?.counts || {}).map(([k, v]: any) => (
                  <div key={k} className="p-6 bg-slate-50 rounded-[2rem]"><p className="text-2xl font-black text-slate-900">{v}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k}</p></div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-slate-900 rounded-[3.5rem] p-10 flex flex-col min-h-[600px] shadow-2xl">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><RefreshCw size={12} className={isProcessing ? 'animate-spin' : ''} /> Terminal</h4>
          <div className="flex-1 overflow-y-auto font-mono text-[10px] text-indigo-100/40 custom-scrollbar pr-2">
            {log.map((l, i) => <div key={i} className="mb-2 border-l border-indigo-500/20 pl-4 py-1 hover:text-white transition-colors">{l}</div>)}
            {log.length === 0 && <p className="opacity-20 italic">Esperando acción...</p>}
          </div>
        </div>
      </div>
    </div>
  );
};