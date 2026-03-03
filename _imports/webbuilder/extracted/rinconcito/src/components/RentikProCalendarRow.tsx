import React from 'react';
import { AvailabilityDay } from '../integrations/rentikpro/types';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RentikProCalendarRowProps {
    apartmentName: string;
    apartmentId: string;
    currentMonth: Date;
    days: AvailabilityDay[]; // Days for this specific month
    selection: { from: Date; to: Date; nights: number } | null;
    onSelectRange: (from: Date, to: Date, nights: number) => void;
    onClearSelection: () => void;
    isComingSoon?: boolean;
}

export const RentikProCalendarRow: React.FC<RentikProCalendarRowProps> = ({
    apartmentName,
    apartmentId,
    currentMonth,
    days,
    selection,
    onSelectRange,
    onClearSelection,
    isComingSoon = false,
}) => {
    const { t } = useTranslation();

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    const toDateStr = (d: Date) => d.toISOString().split('T')[0];
    const todayStr = toDateStr(new Date());

    const getDayData = (dateStr: string) => days.find((d) => d.date === dateStr);

    // Availability Logic (Same as Calendar)
    const isDayAvailableForCheckin = (dateStr: string): boolean => {
        const data = getDayData(dateStr);
        if (!data) return false;
        return data.isAvailable;
    };

    // ─── Internal Selection Logic ─────────────────────────────────────────────────
    // We need to track "potential selection" state locally if we want drag/click logic
    // But for simplicity/robustness, we can key off the parent's selection if it matches this apartment
    // effectively. However, the parent passes *the selection for this apartment* specifically (or null).

    // We need local state ONLY for the "in-progress" selection (clicked start, waiting for end)
    // But to keep it "dumb", let's assume the parent handles "start selected" too?
    // Actually, standard pattern: dumb component handles click -> calculates range -> calls onSelectRange.
    // But we need to know if we are in "start selected" mode.
    // Let's use a local state for "partial selection" just for UI feedback before committing?
    // OR simplify: Just use standard start/end clicks.

    const [localStart, setLocalStart] = React.useState<string | null>(null);

    // If parent clears selection, we should clear local start too
    React.useEffect(() => {
        if (!selection) setLocalStart(null);
    }, [selection]);


    const handleDateClick = (dateStr: string) => {
        if (isComingSoon) return;

        // Reset if we have a full selection already
        if (selection) {
            onClearSelection();
            // If clicking a valid start, start new
            if (isDayAvailableForCheckin(dateStr)) {
                setLocalStart(dateStr);
            } else {
                setLocalStart(null);
            }
            return;
        }

        if (!localStart) {
            if (!isDayAvailableForCheckin(dateStr)) return;
            setLocalStart(dateStr);
        } else {
            // Complete range
            if (dateStr <= localStart) {
                // Restart
                if (isDayAvailableForCheckin(dateStr)) setLocalStart(dateStr);
                else setLocalStart(null);
            } else {
                // Validate range
                let valid = true;
                let curr = new Date(localStart);
                const end = new Date(dateStr);
                // Exclude end date from check (checkout day can be unavailable)
                while (curr < end) {
                    const ds = toDateStr(curr);
                    const d = getDayData(ds);
                    if (!d || !d.isAvailable) { valid = false; break; }
                    curr.setDate(curr.getDate() + 1);
                }

                if (valid) {
                    const nights = Math.round((end.getTime() - new Date(localStart).getTime()) / 86400000);
                    onSelectRange(new Date(localStart), new Date(dateStr), Math.max(1, nights));
                    setLocalStart(null); // Clear local, now parent has it
                } else {
                    // Invalid, restart
                    if (isDayAvailableForCheckin(dateStr)) setLocalStart(dateStr);
                    else setLocalStart(null);
                }
            }
        }
    };

    // ─── Render Helpers ───────────────────────────────────────────────────────────

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const getSelectionState = (dateStr: string) => {
        if (selection) {
            const s = toDateStr(selection.from);
            const e = toDateStr(selection.to);
            if (dateStr === s) return 'start';
            if (dateStr === e) return 'end';
            if (dateStr > s && dateStr < e) return 'middle';
        }
        if (localStart === dateStr) return 'start';
        return null;
    };

    // Construct booking message
    const bookingMessage = selection
        ? `Hola, me gustaría reservar "${apartmentName}" del ${selection.from.toLocaleDateString()} al ${selection.to.toLocaleDateString()} (${selection.nights} noches).`
        : '';


    return (
        <div className={`bg-white rounded-2xl border ${selection ? 'border-stone-900 ring-1 ring-stone-900 shadow-lg' : 'border-stone-100'} p-4 md:p-6 transition-all`}>
            <div className="flex flex-col md:flex-row gap-6">

                {/* Info Column */}
                <div className="md:w-1/3 flex flex-col justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-serif text-xl text-stone-900 leading-none">{apartmentName}</h3>
                            {isComingSoon && <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">{t('common.coming_soon_short', 'Próximamente')}</span>}
                        </div>

                        {!isComingSoon ? (
                            <div className="text-xs text-stone-500 mb-4">
                                {selection ? (
                                    <div className="animate-fade-in text-stone-900">
                                        <span className="block font-bold text-lg">{selection.nights} noches</span>
                                        <span className="block opacity-60">{selection.from.toLocaleDateString()} - {selection.to.toLocaleDateString()}</span>
                                    </div>
                                ) : (
                                    localStart ? "Selecciona fecha de salida" : "Selecciona fecha de entrada"
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-stone-400 mb-4">{t('featured.coming_soon_desc', 'Próximamente disponible.')}</p>
                        )}
                    </div>

                    {/* Action Area */}
                    <div>
                        {selection ? (
                            <div className="space-y-2">
                                <Link
                                    to={`/contacto?msg=${encodeURIComponent(bookingMessage)}`}
                                    className="flex items-center justify-center gap-2 w-full bg-stone-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-orange-700 transition-all"
                                >
                                    Solicitar Reserva <ArrowRight size={14} />
                                </Link>
                                <button onClick={onClearSelection} className="text-[10px] uppercase font-bold text-stone-400 hover:text-stone-600 w-full text-center">
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            isComingSoon && (
                                <Link to="/proximamente" className="block text-center text-xs font-bold text-orange-600 hover:underline">
                                    Unirse a lista de espera
                                </Link>
                            )
                        )}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="md:w-2/3 grow">
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                            <div key={d} className="text-[10px] font-black text-stone-300">{d}</div>
                        ))}
                    </div>

                    <div className={`grid grid-cols-7 gap-y-1 gap-x-1 ${isComingSoon ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}

                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                            const sel = getSelectionState(dateStr);
                            // Availability check
                            const isToday = dateStr === todayStr;
                            const checkinOk = isDayAvailableForCheckin(dateStr);
                            const checkoutOk = localStart && !selection && dateStr > localStart; // Simple visual check, real validation in handler

                            // Allow checkout on unavailable days if they are valid checkout targets (checked in handler)
                            // But visually, if it's not available and not a checkout target, grey it out.

                            const isPast = dateStr < todayStr;
                            const clickable = !isPast && (checkinOk || (localStart && dateStr > localStart)); // Simplified clickable logic

                            const data = getDayData(dateStr);
                            const available = data?.isAvailable ?? false;

                            let cls = "flex items-center justify-center text-xs font-medium rounded-full w-full aspect-square transition-all relative";

                            if (isPast) {
                                cls += " text-stone-200 cursor-not-allowed";
                            } else if (sel === 'start' || sel === 'end') {
                                cls += " bg-stone-900 text-white z-10";
                                if (sel === 'start' && (selection || localStart)) cls += " rounded-r-none"; // Connect if range exists
                                if (sel === 'end') cls += " rounded-l-none";
                            } else if (sel === 'middle') {
                                cls += " bg-stone-100 text-stone-900 rounded-none";
                            } else if (!available) {
                                // Unavailable days
                                cls += " text-stone-300 cursor-not-allowed decoration-stone-300/50";
                            } else {
                                // Available
                                cls += " text-stone-700 cursor-pointer hover:bg-orange-100";
                            }

                            return (
                                <button
                                    key={dateStr}
                                    disabled={!clickable && !isComingSoon}
                                    onClick={() => handleDateClick(dateStr)}
                                    className={cls}
                                >
                                    <div className="flex flex-col items-center">
                                        <span>{dayNum}</span>
                                        {data?.price && !isPast && (
                                            <span className={`text-[7px] font-bold -mt-1 ${sel ? 'text-white/60' : 'text-stone-400'}`}>
                                                {data.price}€
                                            </span>
                                        )}
                                    </div>
                                    {isToday && !sel && <span className="absolute bottom-0.5 w-1 h-1 bg-orange-500 rounded-full"></span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};
