import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Send } from 'lucide-react';

/**
 * AvailabilityCalendar — bloque del editor (preview only).
 *
 * En RPWeb: el componente <Availability /> de templates/components/
 * consume useBootstrapState() con datos reales del Worker KV.
 *
 * En editor: muestra un calendario de demostración interactivo.
 */
export const AvailabilityCalendar: React.FC<{
    data: any;
    styles?: any;
    variant?: string;
    theme?: any;
}> = ({ data, theme }) => {
    const { title = 'Disponibilidad', subtitle = 'Consulta fechas disponibles en tiempo real.', ctaLabel = 'Consultar Precio' } = data ?? {};
    const primary = theme?.colors?.primary ?? '#4f46e5';

    const [offset, setOffset] = useState(0);
    const base = new Date();
    const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const emptySlots = firstDay === 0 ? 6 : firstDay - 1;

    // Demo: block days 5-12 and 20-25
    const blocked = new Set<number>([...Array.from({ length: 8 }, (_, i) => i + 5), ...Array.from({ length: 6 }, (_, i) => i + 20)]);
    const today = offset === 0 ? new Date().getDate() : -1;

    return (
        <section className="w-full py-20 px-6" id="disponibilidad">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 opacity-60">
                        <CalendarDays size={14} /> Disponibilidad
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
                    <p className="opacity-70 max-w-md mx-auto">{subtitle}</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 md:p-10">
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={() => setOffset(o => o - 1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-black uppercase tracking-widest capitalize">{monthName}</span>
                        <button onClick={() => setOffset(o => o + 1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                            <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 py-1">{day}</div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: emptySlots }).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const isBlocked = blocked.has(day);
                            const isToday = day === today;
                            return (
                                <div
                                    key={day}
                                    className={[
                                        'aspect-square flex items-center justify-center rounded-xl text-sm font-bold select-none transition-all',
                                        isBlocked ? 'bg-red-50 text-red-300 line-through cursor-not-allowed' : 'cursor-pointer hover:opacity-90',
                                        isToday ? 'ring-2 ring-offset-1' : '',
                                    ].join(' ')}
                                    style={!isBlocked ? { backgroundColor: isToday ? primary + '22' : undefined, color: isToday ? primary : undefined, '--tw-ring-color': isToday ? primary : undefined } as any : undefined}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 flex items-center gap-6 text-xs font-bold text-gray-400 justify-center">
                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-green-100 block" /> Disponible</span>
                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-50 block" /> Reservado</span>
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            className="px-8 py-4 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-lg"
                            style={{ backgroundColor: primary }}
                        >
                            <Send size={14} className="inline mr-2" />
                            {ctaLabel}
                        </button>
                        <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            Preview — datos reales en publicación vía RPWeb
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};
