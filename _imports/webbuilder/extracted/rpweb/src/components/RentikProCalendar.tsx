import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchAvailability } from '../integrations/rentikpro/client';
import { AvailabilityDay, RentikProError } from '../integrations/rentikpro/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RentikProCalendarProps {
    apartmentSlug: string;
    onRangeSelect?: (from: Date, to: Date, nights: number) => void;
    className?: string;
    compact?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Human-readable error message per code */
function errorMessage(err: unknown): string {
    if (err instanceof RentikProError) {
        switch (err.code) {
            case 'CORS': return 'Tu dominio no está autorizado en RentikPro (allowedOrigins).';
            case 'UNAUTHORIZED': return 'Token inválido / origen no permitido.';
            case 'DATE_RANGE': return 'Rango de fechas demasiado grande.';
            default: return 'Error al cargar disponibilidad.';
        }
    }
    return 'Error al cargar disponibilidad.';
}

// ─── Component ────────────────────────────────────────────────────────────────

import { useSiteConfig } from '../site-config/useSiteConfig';

// ─── Component ────────────────────────────────────────────────────────────────

export const RentikProCalendar: React.FC<RentikProCalendarProps> = ({
    apartmentSlug,
    onRangeSelect,
    className = '',
    compact = false,
}) => {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const integrationConfig = siteConfig.integrations.rentikpro;

    // Availability cache: monthKey → AvailabilityDay[]
    const cache = useRef<Map<string, AvailabilityDay[]>>(new Map());

    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Selection
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);

    // ── Fetch a window and populate cache ──────────────────────────────────────

    const fetchWindow = useCallback(async (windowFrom: Date, windowTo: Date) => {
        const fromStr = toDateStr(windowFrom);
        const toStr = toDateStr(windowTo);

        setLoading(true);
        setError(null);
        try {
            const response = await fetchAvailability(fromStr, toStr, integrationConfig, apartmentSlug);
            const aptData = response.apartments.find(a => a.apartmentSlug === apartmentSlug);
            if (aptData) {
                // Distribute days into per-month cache buckets
                for (const day of aptData.days) {
                    const mk = day.date.slice(0, 7); // YYYY-MM
                    if (!cache.current.has(mk)) cache.current.set(mk, []);
                    cache.current.get(mk)!.push(day);
                }
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [apartmentSlug, integrationConfig]);

    // ── Initial load: today → today+120 days ──────────────────────────────────

    useEffect(() => {
        cache.current = new Map(); // reset cache on apartment change
        setStartDate(null);
        setEndDate(null);
        setError(null);

        const from = new Date();
        from.setDate(1);
        const to = addDays(new Date(), 120);
        fetchWindow(from, to);
    }, [apartmentSlug, fetchWindow]);

    // ── Month navigation: re-fetch if month not cached ────────────────────────

    const goToPrev = () => {
        setCurrentMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            // Don't go before current month
            const now = new Date();
            now.setDate(1);
            if (d < now) return prev;
            return d;
        });
    };

    const goToNext = () => {
        setCurrentMonth(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + 1);
            return next;
        });
    };

    // When currentMonth changes, ensure it's cached
    useEffect(() => {
        const mk = monthKey(currentMonth);
        if (!cache.current.has(mk) && !loading) {
            // Fetch a 60-day window starting from the first of this month
            const from = new Date(currentMonth);
            const to = addDays(from, 60);
            fetchWindow(from, to);
        }
    }, [currentMonth, loading, fetchWindow]);

    // ── Day status lookup ─────────────────────────────────────────────────────

    const getDayData = (dateStr: string): AvailabilityDay | undefined => {
        const mk = dateStr.slice(0, 7);
        return cache.current.get(mk)?.find(d => d.date === dateStr);
    };

    /**
     * Availability model: [check_in, check_out)
     * - A day is "available to stay" if isAvailable === true.
     * - The checkout day itself may be isAvailable=false (it's a departure day) — still selectable as checkout.
     * - Blocking: any day strictly between check_in (inclusive) and check_out (exclusive) that is unavailable
     *   invalidates the range.
     */
    const isDayAvailableForCheckin = (dateStr: string): boolean => {
        const data = getDayData(dateStr);
        if (!data) return false; // no data → blocked
        return data.isAvailable;
    };

    const isRangeValid = (from: string, to: string): boolean => {
        // Iterate from check-in (inclusive) to check-out (exclusive)
        let curr = new Date(from);
        const end = new Date(to);
        while (curr < end) {
            const ds = toDateStr(curr);
            const data = getDayData(ds);
            if (!data || !data.isAvailable) return false;
            curr = addDays(curr, 1);
        }
        return true;
    };

    // ── Date click handler ────────────────────────────────────────────────────

    const handleDateClick = (dateStr: string) => {
        const isCheckoutCandidate = startDate && !endDate && dateStr > startDate;

        if (!startDate || endDate) {
            // Start fresh selection — must be an available check-in day
            if (!isDayAvailableForCheckin(dateStr)) return;
            setStartDate(dateStr);
            setEndDate(null);
            onRangeSelect?.(new Date(dateStr), new Date(dateStr), 0);
            return;
        }

        if (dateStr <= startDate) {
            // Clicked before or on start — restart
            if (!isDayAvailableForCheckin(dateStr)) return;
            setStartDate(dateStr);
            setEndDate(null);
            onRangeSelect?.(new Date(dateStr), new Date(dateStr), 0);
            return;
        }

        // Completing the range — validate [startDate, dateStr)
        if (isCheckoutCandidate) {
            if (!isRangeValid(startDate, dateStr)) {
                // Range crosses a blocked day — restart from clicked date if available
                if (isDayAvailableForCheckin(dateStr)) {
                    setStartDate(dateStr);
                    setEndDate(null);
                    onRangeSelect?.(new Date(dateStr), new Date(dateStr), 0);
                }
                return;
            }
            setEndDate(dateStr);
            // Nights = calendar days between check-in and check-out
            const nights = Math.round(
                (new Date(dateStr).getTime() - new Date(startDate).getTime()) / 86_400_000
            );
            onRangeSelect?.(new Date(startDate), new Date(dateStr), Math.max(1, nights));
        }
    };

    // ── Selection state for a given date ─────────────────────────────────────

    const selectionState = (dateStr: string): 'start' | 'end' | 'middle' | null => {
        if (startDate === dateStr) return 'start';
        if (endDate === dateStr) return 'end';
        if (startDate && endDate && dateStr > startDate && dateStr < endDate) return 'middle';
        return null;
    };

    // ── Calendar grid data ────────────────────────────────────────────────────

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon-start

    const monthLabel = currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const todayStr = toDateStr(new Date());

    // ── Size classes ──────────────────────────────────────────────────────────

    const pad = compact ? 'p-3' : 'p-5 md:p-7';
    const headPad = compact ? 'px-3 py-2' : 'px-5 py-3';
    const daySize = compact ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
    const titleSz = compact ? 'text-sm' : 'text-lg';

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className={`bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-100 ${className}`}>

            {/* ── Branding header ── */}
            <div className={`bg-stone-900 ${headPad} flex justify-between items-center text-white`}>
                <span className="text-[10px] uppercase tracking-widest font-black opacity-80">
                    Disponibilidad en tiempo real — RentikPro
                </span>
                <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400 animate-pulse">
                    ● Live
                </span>
            </div>

            <div className={pad}>

                {/* ── Month nav ── */}
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={goToPrev}
                        className="p-1.5 hover:bg-stone-100 rounded-full transition-colors text-stone-500 hover:text-stone-900"
                        aria-label="Mes anterior"
                    >
                        <ChevronLeft size={compact ? 16 : 20} />
                    </button>
                    <h3 className={`${titleSz} font-serif font-bold text-stone-900 capitalize`}>{monthLabel}</h3>
                    <button
                        onClick={goToNext}
                        className="p-1.5 hover:bg-stone-100 rounded-full transition-colors text-stone-500 hover:text-stone-900"
                        aria-label="Mes siguiente"
                    >
                        <ChevronRight size={compact ? 16 : 20} />
                    </button>
                </div>

                {/* ── Error state ── */}
                {error && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 text-red-700">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <p className="text-xs font-medium leading-snug">{error}</p>
                    </div>
                )}

                {/* ── Loading overlay ── */}
                {loading && (
                    <div className="flex items-center justify-center gap-2 text-stone-400 py-2 mb-2">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs uppercase tracking-widest">Cargando...</span>
                    </div>
                )}

                {/* ── Weekday headers ── */}
                <div className="grid grid-cols-7 mb-1 text-center">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                        <div key={d} className="text-[10px] font-black text-stone-300">{d}</div>
                    ))}
                </div>

                {/* ── Days grid ── */}
                <div className="grid grid-cols-7 gap-y-0.5 gap-x-0.5">
                    {/* Empty offset slots */}
                    {Array.from({ length: startOffset }).map((_, i) => (
                        <div key={`e-${i}`} />
                    ))}

                    {/* Day buttons */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const data = getDayData(dateStr);
                        const sel = selectionState(dateStr);

                        // A day is "available for check-in" if data says so
                        // A day is "selectable as checkout" if it's the day after a started selection
                        const isAvailableCheckin = data?.isAvailable ?? false;
                        const isCheckoutTarget = startDate && !endDate && dateStr > startDate;
                        const isPast = dateStr < todayStr;
                        const isToday = dateStr === todayStr;

                        // Clickable: available check-in, or valid checkout target (even if unavailable)
                        const clickable = !isPast && (isAvailableCheckin || !!isCheckoutTarget);

                        // Visual state
                        let cls = `flex items-center justify-center font-medium rounded-full transition-all ${daySize} relative`;

                        if (isPast) {
                            cls += ' text-stone-200 cursor-not-allowed';
                        } else if (sel === 'start' || sel === 'end') {
                            cls += ' bg-stone-900 text-white cursor-pointer';
                            if (sel === 'start' && endDate) cls += ' rounded-r-none';
                            if (sel === 'end') cls += ' rounded-l-none';
                        } else if (sel === 'middle') {
                            cls += ' bg-stone-100 text-stone-900 rounded-none cursor-pointer';
                        } else if (!isAvailableCheckin && !isCheckoutTarget) {
                            cls += ' text-stone-300 cursor-not-allowed';
                        } else {
                            cls += ' text-stone-700 cursor-pointer hover:bg-orange-100';
                        }

                        return (
                            <button
                                key={dateStr}
                                disabled={!clickable}
                                onClick={() => handleDateClick(dateStr)}
                                className={cls}
                                aria-label={dateStr}
                            >
                                {dayNum}
                                {isToday && !sel && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Selection Summary + Book CTA ── */}
                {startDate && endDate && (
                    <div className="mt-4 pt-4 border-t border-stone-100">
                        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-orange-700 mb-1">Selección</p>
                                    <p className="text-sm font-bold text-stone-900">
                                        {new Date(startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                        {' → '}
                                        {new Date(endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-orange-700 uppercase tracking-widest">
                                        {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)} noches
                                    </p>
                                </div>
                            </div>
                            <a
                                href={`https://api.whatsapp.com/send?phone=34629837369&text=${encodeURIComponent(`Hola, me interesa reservar el apartamento para ${Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)} noches: del ${startDate} al ${endDate}. ¿Está disponible?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-500 transition-colors"
                            >
                                Consultar estas fechas →
                            </a>
                        </div>
                    </div>
                )}

                {/* ── Legend ── */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex justify-center gap-4 text-[10px] uppercase tracking-widest font-bold text-stone-400">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full ring-1 ring-stone-300" />
                        {compact ? 'Libre' : 'Disponible'}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-stone-900" />
                        {compact ? 'Selec.' : 'Seleccionado'}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-stone-200" />
                        Ocupado
                    </div>
                </div>

            </div>
        </div>
    );
};
