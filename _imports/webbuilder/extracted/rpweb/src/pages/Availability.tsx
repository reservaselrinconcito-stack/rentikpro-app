import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle, Calendar, Info, MessageSquare } from 'lucide-react';
import { RentikProCalendarRow } from '../components/RentikProCalendarRow';
import { fetchAvailability } from '../integrations/rentikpro/client';
import { AvailabilityDay, AvailabilityResponse, RentikProError } from '../integrations/rentikpro/types';
import { useChat } from '../context/ChatContext';
import { useSEO } from '../hooks/useSEO';
import { useSiteConfig } from '../site-config/useSiteConfig';

// Helpers
const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
};
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const Availability: React.FC = () => {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const integrationConfig = siteConfig.integrations.rentikpro;
    const { openChat } = useChat();
    const [searchParams] = useSearchParams();

    useSEO({
        title: 'Disponibilidad — Fechas libres en tiempo real',
        description: 'Consulta la disponibilidad en tiempo real de los apartamentos rurales El Rinconcito Matarraña. Sincronizado con RentikPro.',
        noindex: false,
    });

    // Auto-scroll to apartment if param is present
    const initialSlug = searchParams.get('apartment');
    const refs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (initialSlug && refs.current[initialSlug]) {
            refs.current[initialSlug]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [initialSlug]);


    // ─── State ────────────────────────────────────────────────────────────────────

    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });

    // Cache: "YYYY-MM" -> { "slug": [days...] }
    const cache = useRef<Map<string, Record<string, AvailabilityDay[]>>>(new Map());
    const [monthData, setMonthData] = useState<Record<string, AvailabilityDay[]>>({});

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Single selection active at a time: { apartmentSlug, from, to, nights }
    const [selection, setSelection] = useState<{
        slug: string;
        from: Date;
        to: Date;
        nights: number;
    } | null>(null);

    // ─── Data Fetching ────────────────────────────────────────────────────────────

    const fetchMonthData = useCallback(async (date: Date) => {
        const mk = monthKey(date);

        // If cached, use it
        if (cache.current.has(mk)) {
            setMonthData(cache.current.get(mk)!);
            return;
        }

        setLoading(true);
        setError(null);

        // Fetch range: First day of month to Last day of month (plus buffer?)
        // To be safe and avoid edge cases with timezones, let's fetch -5 days to +40 days from 1st
        const from = new Date(date.getFullYear(), date.getMonth(), 1);
        const to = new Date(date.getFullYear(), date.getMonth() + 1, 0); // Last day

        // Actually, client expects string range.
        const fromStr = toDateStr(from);
        const toStr = toDateStr(to);

        try {
            const response = await fetchAvailability(fromStr, toStr, integrationConfig);

            // Transform response to map
            const newMap: Record<string, AvailabilityDay[]> = {};
            response.apartments.forEach(apt => {
                newMap[apt.apartmentSlug] = apt.days;
            });

            cache.current.set(mk, newMap);
            setMonthData(newMap);

        } catch (err) {
            console.error(err);
            if (err instanceof RentikProError) {
                switch (err.code) {
                    case 'CORS': setError('Tu dominio no está autorizado en RentikPro (allowedOrigins).'); break;
                    case 'UNAUTHORIZED': setError('Token inválido / origen no permitido.'); break;
                    case 'DATE_RANGE': setError('Rango de fechas demasiado grande.'); break;
                    default: setError('Error al cargar disponibilidad.');
                }
            } else {
                setError('Error de conexión.');
            }
        } finally {
            setLoading(false);
        }
    }, [integrationConfig]);

    useEffect(() => {
        fetchMonthData(currentMonth);
    }, [currentMonth, fetchMonthData]);

    // ─── Month Nav ────────────────────────────────────────────────────────────────

    const goToPrev = () => {
        setCurrentMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            const now = new Date();
            now.setDate(1);
            return d < now ? prev : d;
        });
    };

    const goToNext = () => {
        setCurrentMonth(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + 1);
            return next;
        });
    };

    const monthLabel = currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' });


    return (
        <div className="min-h-screen bg-stone-50 pt-24 pb-20">
            <div className="container mx-auto px-4 max-w-5xl">



                {/* Header */}
                <div className="text-center mb-10">
                    <span className="text-orange-600 text-[10px] font-black uppercase tracking-widest mb-4 block underline decoration-orange-200 underline-offset-8">
                        RentikPro System
                    </span>
                    <h1 className="text-3xl md:text-5xl font-serif text-stone-900 mb-4">Disponibilidad en tiempo real</h1>
                    <p className="text-stone-500 font-light max-w-2xl mx-auto text-sm md:text-base mb-6">
                        Consulta todos nuestros alojamientos de un vistazo. Selecciona tus fechas para reservar directamente.
                    </p>
                    <button
                        onClick={openChat}
                        className="inline-flex items-center gap-2 text-stone-400 hover:text-orange-600 transition-colors text-xs font-bold uppercase tracking-widest border border-stone-200 px-4 py-2 rounded-full hover:border-orange-200 hover:bg-orange-50"
                    >
                        <MessageSquare size={14} />
                        ¿Dudas con las fechas? Preguntar al asistente
                    </button>
                </div>

                {/* Main Control Bar */}
                <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 p-4 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={goToPrev} className="p-2 hover:bg-stone-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                        <h2 className="text-xl font-serif font-bold capitalize w-40 text-center">{monthLabel}</h2>
                        <button onClick={goToNext} className="p-2 hover:bg-stone-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
                    </div>

                    {loading && (
                        <div className="flex items-center gap-2 text-stone-400 text-xs uppercase tracking-widest">
                            <Loader2 size={14} className="animate-spin" /> Actualizando...
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-4 rounded-xl mb-8 border border-red-100">
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {/* List of Calendars */}
                <div className="space-y-6">
                    {siteConfig.apartments.map(apt => {
                        const isComingSoon = apt.status === 'coming_soon';
                        const days = monthData[apt.slug] || [];
                        const isSelected = selection?.slug === apt.slug;

                        return (
                            <div key={apt.slug} ref={el => refs.current[apt.slug] = el}>
                                <RentikProCalendarRow
                                    apartmentName={apt.name}
                                    apartmentSlug={apt.slug}
                                    currentMonth={currentMonth}
                                    days={days}
                                    isComingSoon={isComingSoon}
                                    selection={isSelected ? { from: selection.from, to: selection.to, nights: selection.nights } : null}
                                    onSelectRange={(from, to, nights) => setSelection({ slug: apt.slug, from, to, nights })}
                                    onClearSelection={() => setSelection(null)}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* ── Sticky selection CTA ── */}
                {selection && (
                    <div className="sticky bottom-6 z-20 mt-8">
                        <div className="bg-stone-900 text-white rounded-[2rem] shadow-2xl shadow-stone-900/40 p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">
                                    Selección activa — {siteConfig.apartments.find(a => a.slug === selection.slug)?.name}
                                </p>
                                <p className="text-white font-bold">
                                    {selection.from.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                                    {' → '}
                                    {selection.to.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                                    <span className="text-stone-400 ml-2 font-normal">({selection.nights} noches)</span>
                                </p>
                            </div>
                            <div className="flex gap-3 shrink-0">
                                <a
                                    href={`https://api.whatsapp.com/send?phone=34629837369&text=${encodeURIComponent(`Hola, quiero consultar disponibilidad del apartamento ${siteConfig.apartments.find(a => a.slug === selection.slug)?.name} del ${selection.from.toLocaleDateString('es-ES')} al ${selection.to.toLocaleDateString('es-ES')} (${selection.nights} noches).`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full font-bold hover:bg-green-400 transition-all text-sm"
                                >
                                    Consultar por WhatsApp
                                </a>
                                <a
                                    href="https://www.booking.com/hotel/es/el-rinconcito-fuentespalda12.es.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-500 transition-all text-sm"
                                >
                                    Booking.com
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Legend / Footer info */}
                <div className="mt-12 text-center">
                    <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm border border-stone-100 text-xs text-stone-500">
                        <Info size={14} className="text-stone-400" />
                        <span>Precios y condiciones finales al solicitar reserva. Calendario sincronizado por RentikPro.</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Availability;
