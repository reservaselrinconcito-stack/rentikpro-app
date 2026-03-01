import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Calendar } from 'lucide-react';

interface AvailabilityDay {
    date: string;
    isAvailable: boolean;
}

interface Props {
    data: any;
    styles?: any;
    theme?: any;
}

// Fetches public availability from the Worker KV
async function fetchPublicAvailability(
    workerUrl: string,
    propertyId: string,
    from: string,
    to: string
): Promise<Record<string, 'blocked' | 'available'>> {
    try {
        const token = import.meta.env.VITE_PUBLIC_TOKEN ?? '';
        const res = await fetch(
            `${workerUrl}/public/availability?propertyId=${encodeURIComponent(propertyId)}&from=${from}&to=${to}`,
            { headers: token ? { 'X-PUBLIC-TOKEN': token } : {} }
        );
        if (!res.ok) return {};
        return await res.json();
    } catch {
        return {};
    }
}

export const AvailabilityCalendar: React.FC<Props> = ({ data }) => {
    const {
        title = 'Disponibilidad',
        propertyId = '',
        apartmentLabel = 'Ver disponibilidad',
    } = data;

    const [viewMonth, setViewMonth] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });
    const [availability, setAvailability] = useState<Record<string, 'blocked' | 'available'>>({});
    const [loading, setLoading] = useState(false);

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Mon-first

    const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(viewMonth);

    const fetchMonth = useCallback(async () => {
        const workerUrl = (import.meta.env.VITE_PUBLIC_WORKER_URL ?? '').replace(/\/$/, '');
        if (!workerUrl || !propertyId) {
            // Editor preview — generate demo data
            const demo: Record<string, 'blocked'> = {};
            const today = new Date(year, month, 1);
            for (let d = 5; d <= 12; d++) {
                demo[`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`] = 'blocked';
            }
            for (let d = 20; d <= 24; d++) {
                demo[`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`] = 'blocked';
            }
            setAvailability(demo);
            return;
        }

        setLoading(true);
        try {
            const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const toDate = new Date(year, month + 1, 0);
            const to = toDate.toISOString().split('T')[0];
            const result = await fetchPublicAvailability(workerUrl, propertyId, from, to);
            setAvailability(prev => ({ ...prev, ...result }));
        } finally {
            setLoading(false);
        }
    }, [year, month, propertyId]);

    useEffect(() => { fetchMonth(); }, [fetchMonth]);

    const prevMonth = () => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const nextMonth = () => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    const getDayStatus = (day: number): 'past' | 'blocked' | 'available' | 'unknown' => {
        const today = new Date();
        const thisDay = new Date(year, month, day);
        if (thisDay < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return 'past';
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (availability[key] === 'blocked') return 'blocked';
        return 'available';
    };

    const dayClasses: Record<string, string> = {
        past: 'text-slate-200 cursor-default',
        blocked: 'text-red-300 line-through bg-red-50 cursor-not-allowed rounded-xl',
        available: 'text-emerald-700 font-bold hover:bg-emerald-50 rounded-xl cursor-pointer',
        unknown: 'text-slate-400',
    };

    return (
        <section className="py-20 px-6 bg-white" id="disponibilidad">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">{title}</h2>
                    <p className="text-slate-500 font-medium">Estado en tiempo real sincronizado con todas las plataformas.</p>
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={prevMonth}
                            className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
                            <h3 className="text-lg font-black text-slate-800 capitalize">{monthLabel}</h3>
                        </div>
                        <button
                            onClick={nextMonth}
                            className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                            <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider py-2">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const st = getDayStatus(day);
                            return (
                                <div
                                    key={day}
                                    className={`aspect-square flex items-center justify-center text-sm transition-all ${dayClasses[st]}`}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-8 mt-8 pt-6 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                            Disponible
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
                            Ocupado
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center mt-10">
                    <a
                        href="#contacto"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-black text-sm tracking-widest uppercase hover:bg-indigo-600 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                    >
                        <Calendar size={16} />
                        Consultar Fechas
                    </a>
                </div>
            </div>
        </section>
    );
};
