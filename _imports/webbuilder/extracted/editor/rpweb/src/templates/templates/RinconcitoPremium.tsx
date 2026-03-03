/**
 * RinconcitoPremium.tsx — Plantilla Premium del editor RentikPro.
 *
 * Identidad visual completa de El Rinconcito Matarraña adaptada al sistema
 * multi-tenant de RPWeb. Datos 100% desde useBootstrapState().
 *
 * Características:
 *  - Fondo stone-900, tipografía serif, acentos naranja/ámbar
 *  - Ticker marquee con atributos del destino
 *  - Hero cinematográfico con blur de entrada
 *  - Grid de apartamentos con precios reales
 *  - Calendario de disponibilidad multi-apartamento
 *  - Carrusel de reseñas (estáticas — reemplazar por API cuando esté disponible)
 *  - Sección RentikPro (social proof para el propietario)
 *  - Widget de clima via open-meteo (sin auth requerida)
 *  - Formulario de contacto con POST a /public/leads
 *  - Footer con redes sociales y badge
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useBootstrapState } from '../../app/BootstrapContext';
import {
    MapPin, Phone, Mail, Star, Calendar, MessageSquare,
    ChevronLeft, ChevronRight, Loader2, Users, Bed,
    ArrowRight, CheckCircle, Zap, Bot, ShieldCheck,
    Instagram, Facebook, Cloud, Sun, CloudRain, Wind,
    AlertCircle, Menu, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
    author: string;
    rating: number;
    text: string;
    platform: string;
    apartment?: string;
}

interface WeatherData {
    temp: number;
    apparent: number;
    windspeed: number;
    weathercode: number;
    humidity: number;
}

// ─── Static reviews (replace with API when available) ────────────────────────

const STATIC_REVIEWS: Review[] = [
    {
        author: 'M Carmen',
        rating: 10,
        text: 'Hemos estado 5 días todo un 10, limpieza, baño completo, cocina bien equipada y las zonas comunes excepcionales. Toni y Evelyn super atentos y encantadores. Lo recomendaría 100%.',
        platform: 'Booking.com'
    },
    {
        author: 'Virginia Martínez',
        rating: 10,
        apartment: 'La Tirolina',
        text: 'Todo un acierto, el apartamento precioso, limpio, una maravilla. Los anfitriones de 10, nos ayudaron en todo. Muchas gracias.',
        platform: 'Google'
    },
    {
        author: 'Ruth',
        rating: 10,
        text: 'Casa perfectamente equipada, muy limpia y acogedora, buena ubicación. El anfitrión muy atento y agradable. Sin duda un alojamiento para recomendar.',
        platform: 'Booking.com'
    },
    {
        author: 'Marta Surroca',
        rating: 10,
        text: 'El apartamento super limpio y decorado con muy buen gusto, no le falta detalle. Volveremos seguro.',
        platform: 'Google'
    },
    {
        author: 'Ángeles González',
        rating: 10,
        text: 'Estancia muy agradable como en casa. Apartamento muy amplio y muy limpio, no le falta detalle.',
        platform: 'Google'
    },
];

// ─── WeatherWidget ─────────────────────────────────────────────────────────────

function decodeWeatherCode(code: number): { label: string; emoji: string } {
    if (code === 0) return { label: 'Despejado', emoji: '☀️' };
    if (code <= 2) return { label: 'Parcialmente nublado', emoji: '⛅' };
    if (code <= 48) return { label: 'Nublado', emoji: '☁️' };
    if (code <= 67) return { label: 'Lluvia', emoji: '🌧️' };
    if (code <= 77) return { label: 'Nieve', emoji: '❄️' };
    return { label: 'Tormenta', emoji: '⛈️' };
}

const WeatherWidget: React.FC<{ lat?: number; lon?: number }> = ({
    lat = 40.8071,  // Fuentespalda default
    lon = 0.0642,
}) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        let alive = true;
        fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&current=relative_humidity_2m,apparent_temperature,wind_speed_10m&forecast_days=1`
        )
            .then(r => r.json())
            .then(data => {
                if (!alive) return;
                const cw = data.current_weather || {};
                const cur = data.current || {};
                setWeather({
                    temp: Math.round(cw.temperature ?? 0),
                    apparent: Math.round(cur.apparent_temperature ?? cw.temperature ?? 0),
                    windspeed: Math.round(cw.windspeed ?? 0),
                    weathercode: cw.weathercode ?? 0,
                    humidity: cur.relative_humidity_2m ?? 0,
                });
            })
            .catch(() => { /* silently fail */ });
        return () => { alive = false; };
    }, [lat, lon]);

    if (!weather) return null;
    const { label, emoji } = decodeWeatherCode(weather.weathercode);

    return (
        <div className="flex items-center gap-3 text-stone-300">
            <span className="text-xl">{emoji}</span>
            <span className="font-sans text-sm font-medium text-white">{weather.temp}°C</span>
            <span className="text-stone-500 text-xs">· {label}</span>
        </div>
    );
};

// ─── Ticker ────────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
    'Matarraña', 'Astroturismo Starlight', 'Parrizal de Beceite',
    'Bike Park', 'Tirolina Doble', 'La Toscana Española',
    'Apartamentos Rurales', 'Reserva de la Biosfera', 'Valderrobres',
    'Aceite D.O.', 'Eclipse 2026', 'Vía Verde Val de Zafán',
    'Cielos Nocturnos', 'Pozas Naturales', '★ Pueblos más Bonitos',
];

const Ticker: React.FC = () => {
    const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
    return (
        <div
            className="overflow-hidden py-4 border-y border-white/10"
            style={{ background: 'rgba(255,255,255,0.04)' }}
        >
            <div
                className="flex gap-12 whitespace-nowrap"
                style={{ animation: 'rp-ticker 30s linear infinite' }}
            >
                {items.map((item, i) => (
                    <span key={i} className="text-xs font-bold uppercase tracking-[0.25em] text-stone-400 flex-shrink-0">
                        {item}
                        <span className="ml-12 text-orange-700/50">◆</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

// ─── Header ────────────────────────────────────────────────────────────────────

const Header: React.FC = () => {
    const { property } = useBootstrapState();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);

    if (!property) return null;

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                    ? 'bg-stone-900/95 backdrop-blur-xl border-b border-white/10 shadow-xl shadow-black/40'
                    : 'bg-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    {property.logoUrl ? (
                        <img src={property.logoUrl} alt={property.name} className="h-10 w-auto object-contain" />
                    ) : (
                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                            style={{ background: 'linear-gradient(135deg, #c8a96e 0%, #a07840 100%)' }}>
                            {property.shortName?.charAt(0) || 'E'}
                        </div>
                    )}
                    <div>
                        <p className="font-serif text-white text-sm font-bold leading-tight">{property.name}</p>
                        {property.slogan && (
                            <p className="text-[10px] text-stone-400 tracking-widest uppercase">{property.slogan}</p>
                        )}
                    </div>
                </div>

                {/* Nav desktop */}
                <nav className="hidden md:flex items-center gap-8">
                    {['Apartamentos', 'Disponibilidad', 'Contacto'].map(item => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className="text-sm font-medium text-stone-300 hover:text-orange-400 transition-colors tracking-wide"
                        >
                            {item}
                        </a>
                    ))}
                </nav>

                {/* CTA */}
                <div className="flex items-center gap-4">
                    {property.phone && (
                        <a
                            href={`tel:${property.phoneRaw || property.phone}`}
                            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all"
                            style={{
                                background: 'linear-gradient(135deg, #c8a96e 0%, #a07840 100%)',
                                color: '#0f0f0f',
                            }}
                        >
                            <Phone size={14} />
                            {property.phone}
                        </a>
                    )}
                    <button
                        className="md:hidden p-2 text-stone-300 hover:text-white"
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="Menú"
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden bg-stone-900/98 border-t border-white/10 px-6 pb-6 pt-4 space-y-4">
                    {['Apartamentos', 'Disponibilidad', 'Contacto'].map(item => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className="block text-base text-stone-300 hover:text-orange-400 py-2"
                            onClick={() => setMenuOpen(false)}
                        >
                            {item}
                        </a>
                    ))}
                    {property.phone && (
                        <a href={`tel:${property.phoneRaw || property.phone}`}
                            className="block text-orange-400 font-bold pt-2 border-t border-white/10">
                            📞 {property.phone}
                        </a>
                    )}
                </div>
            )}
        </header>
    );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

const Hero: React.FC = () => {
    const { property, apartments } = useBootstrapState();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setLoaded(true), 80);
        return () => clearTimeout(t);
    }, []);

    if (!property) return null;

    const minPrice = apartments.length > 0
        ? Math.min(...apartments.map(a => a.publicBasePrice || Infinity).filter(p => p > 0))
        : Infinity;

    const heroPhoto = apartments[0]?.photos?.[0] || property.photoUrl;

    return (
        <section
            className="relative min-h-screen flex flex-col justify-end overflow-hidden"
            style={{ backgroundColor: '#0f0f0f' }}
        >
            {/* Background */}
            {heroPhoto && (
                <div className="absolute inset-0 z-0">
                    <img
                        src={heroPhoto}
                        alt={property.name}
                        className={`w-full h-full object-cover transition-all duration-1000 ${loaded ? 'opacity-40 scale-100' : 'opacity-0 scale-105'}`}
                    />
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(to top, #0f0f0f 30%, rgba(15,15,15,0.7) 60%, rgba(15,15,15,0.3) 100%)'
                    }} />
                </div>
            )}

            {/* Content */}
            <div className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-40 transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="max-w-4xl">
                    <div className="flex items-center gap-3 mb-8">
                        <span
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                            style={{ background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', color: '#c8a96e' }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#c8a96e' }} />
                            {property.location?.town}{property.location?.province ? ` · ${property.location.province}` : ''}
                        </span>
                        <WeatherWidget
                            lat={property.location?.lat}
                            lon={property.location?.lon}
                        />
                    </div>

                    <h1
                        className="font-serif font-bold leading-[1.05] mb-6"
                        style={{
                            fontSize: 'clamp(3rem, 7vw, 6rem)',
                            color: '#f5f0e8',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {property.name}
                    </h1>

                    {property.slogan && (
                        <p className="text-stone-400 font-light text-xl mb-10 max-w-xl leading-relaxed">
                            {property.slogan}
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        <a
                            href="#apartamentos"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base transition-all hover:scale-105 active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, #c8a96e 0%, #a07840 100%)',
                                color: '#0f0f0f',
                                boxShadow: '0 8px 32px rgba(200,169,110,0.3)',
                            }}
                        >
                            Ver alojamientos
                            <ArrowRight size={18} />
                        </a>

                        <a
                            href="#disponibilidad"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base transition-all border border-white/20 text-white hover:bg-white/10"
                        >
                            <Calendar size={18} />
                            Consultar fechas
                        </a>
                    </div>

                    {minPrice !== Infinity && (
                        <p className="mt-8 text-stone-500 text-sm">
                            Desde{' '}
                            <span className="font-bold font-serif text-lg" style={{ color: '#c8a96e' }}>
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(minPrice)}
                            </span>
                            {' '}/ noche
                        </p>
                    )}
                </div>
            </div>

            {/* Scroll hint */}
            <div className="relative z-10 pb-8 flex justify-center">
                <div className="flex flex-col items-center gap-2 text-stone-600 text-xs uppercase tracking-widest">
                    <div className="w-px h-12 bg-gradient-to-b from-transparent to-stone-600" />
                    <span>Scroll</span>
                </div>
            </div>
        </section>
    );
};

// ─── ApartmentsSection ─────────────────────────────────────────────────────────

const ApartmentsSection: React.FC = () => {
    const { apartments } = useBootstrapState();

    if (apartments.length === 0) return null;

    return (
        <section id="apartamentos" className="py-32 bg-stone-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mb-16">
                    <span className="text-orange-700 font-bold tracking-[0.2em] text-xs uppercase mb-4 block">
                        Alojamientos
                    </span>
                    <h2 className="font-serif text-4xl md:text-5xl text-stone-900 font-bold leading-tight mb-4">
                        Donde el descanso<br />
                        <em className="not-italic text-orange-700">se convierte en experiencia</em>
                    </h2>
                    <p className="text-stone-500 text-lg font-light leading-relaxed">
                        Cada rincón diseñado para que no quieras marcharte.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {apartments.map(apt => (
                        <ApartmentCard key={apt.slug} apt={apt} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const ApartmentCard: React.FC<{ apt: any }> = ({ apt }) => {
    const photo = apt.photos?.[0];
    const price = apt.publicBasePrice;

    const isComingSoon = apt.status === 'coming_soon';

    return (
        <div className="group relative bg-white rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-stone-900/10 border border-stone-100">
            {/* Photo */}
            <div className="aspect-[4/3] overflow-hidden relative">
                {photo ? (
                    <img
                        src={photo}
                        alt={apt.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-stone-100 flex items-center justify-center text-5xl">🏡</div>
                )}

                {isComingSoon && (
                    <div className="absolute top-4 right-4 bg-stone-900/85 backdrop-blur-md text-white text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full font-bold">
                        Próximamente
                    </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    {apt.description && (
                        <p className="text-white text-sm font-light leading-relaxed line-clamp-3">
                            {apt.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                    <h3 className="font-serif text-xl font-bold text-stone-900 group-hover:text-orange-700 transition-colors leading-tight">
                        {apt.name}
                    </h3>
                    <div className="text-right shrink-0">
                        {price ? (
                            <>
                                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Desde</p>
                                <p className="font-serif text-xl font-bold text-stone-900">
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: apt.currency || 'EUR', maximumFractionDigits: 0 }).format(price)}
                                </p>
                                <p className="text-[10px] text-stone-400 font-medium">/noche</p>
                            </>
                        ) : (
                            <p className="text-sm text-stone-400 font-bold italic">Consultar</p>
                        )}
                    </div>
                </div>

                {/* Specs */}
                <div className="flex items-center gap-4 text-stone-500 text-xs">
                    {apt.capacity && (
                        <span className="flex items-center gap-1.5">
                            <Users size={12} />
                            {apt.capacity} huéspedes
                        </span>
                    )}
                    {apt.bedrooms && (
                        <span className="flex items-center gap-1.5">
                            <Bed size={12} />
                            {apt.bedrooms} {apt.bedrooms === 1 ? 'habitación' : 'habitaciones'}
                        </span>
                    )}
                </div>

                {/* CTA */}
                <a
                    href="#disponibilidad"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold transition-all border-2 border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white"
                >
                    Ver disponibilidad
                    <ArrowRight size={14} />
                </a>
            </div>
        </div>
    );
};

// ─── AvailabilitySection ───────────────────────────────────────────────────────

const AvailabilitySection: React.FC = () => {
    const { availability, apartments } = useBootstrapState();
    const [selectedApt, setSelectedApt] = useState<string>(apartments[0]?.slug ?? '');
    const [viewMonth, setViewMonth] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });

    useEffect(() => {
        if (!selectedApt && apartments[0]) {
            setSelectedApt(apartments[0].slug);
        }
    }, [apartments, selectedApt]);

    const aptAvail = availability?.apartments.find(a => a.apartmentSlug === selectedApt);

    // Build calendar days for the current view month
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOffset = (firstDay + 6) % 7; // Mon-first

    const getDayData = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return aptAvail?.days.find(d => d.date === dateStr) ?? null;
    };

    const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(viewMonth);
    const prevMonth = () => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const nextMonth = () => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    return (
        <section id="disponibilidad" className="py-32" style={{ background: '#0f0f0f' }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <span
                        className="inline-flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full"
                        style={{ background: 'rgba(200,169,110,0.1)', color: '#c8a96e', border: '1px solid rgba(200,169,110,0.2)' }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#c8a96e' }} />
                        En tiempo real
                    </span>
                    <h2 className="font-serif text-4xl md:text-5xl font-bold leading-tight" style={{ color: '#f5f0e8' }}>
                        Disponibilidad
                    </h2>
                    <p className="text-stone-500 mt-4 text-lg font-light">
                        Sincronizado con todas las plataformas
                    </p>
                </div>

                {!availability || apartments.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-stone-500 text-lg mb-8">Consulta disponibilidad directamente</p>
                        <a href="#contacto"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold"
                            style={{ background: 'linear-gradient(135deg, #c8a96e 0%, #a07840 100%)', color: '#0f0f0f' }}>
                            Preguntar fechas
                        </a>
                    </div>
                ) : (
                    <div
                        className="rounded-[3rem] p-8 md:p-12"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        {/* Apartment selector */}
                        {apartments.length > 1 && (
                            <div className="flex flex-wrap gap-2 justify-center mb-10 pb-10 border-b border-white/10">
                                {apartments.map(apt => (
                                    <button
                                        key={apt.slug}
                                        onClick={() => setSelectedApt(apt.slug)}
                                        className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${selectedApt === apt.slug
                                                ? 'text-stone-900'
                                                : 'text-stone-400 hover:text-white border border-white/10 hover:border-white/20'
                                            }`}
                                        style={selectedApt === apt.slug ? {
                                            background: 'linear-gradient(135deg, #c8a96e 0%, #a07840 100%)',
                                        } : {}}
                                    >
                                        {apt.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-8">
                            <button
                                onClick={prevMonth}
                                className="p-3 rounded-full border border-white/10 text-stone-400 hover:text-white hover:border-white/30 transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <h3 className="font-serif text-xl font-bold capitalize" style={{ color: '#f5f0e8' }}>
                                {monthLabel}
                            </h3>
                            <button
                                onClick={nextMonth}
                                className="p-3 rounded-full border border-white/10 text-stone-400 hover:text-white hover:border-white/30 transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Weekdays header */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                <div key={d} className="text-center text-xs font-bold text-stone-600 py-2">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Days grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: dayOffset }).map((_, i) => (
                                <div key={`e-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dayData = getDayData(day);
                                const today = new Date();
                                const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                const isAvailable = dayData?.isAvailable ?? false;

                                return (
                                    <div
                                        key={day}
                                        className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all ${isPast
                                                ? 'opacity-30 cursor-not-allowed text-stone-600'
                                                : dayData
                                                    ? isAvailable
                                                        ? 'text-emerald-400 border border-emerald-900/40 cursor-pointer hover:bg-emerald-900/20'
                                                        : 'text-red-400/60 border border-red-900/20 cursor-not-allowed line-through'
                                                    : 'text-stone-500 cursor-pointer hover:bg-white/5'
                                            }`}
                                    >
                                        {day}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-6 mt-8 pt-6 border-t border-white/10 justify-center">
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                                <div className="w-3 h-3 rounded-sm border border-emerald-900/40 bg-emerald-900/10" />
                                Disponible
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                                <div className="w-3 h-3 rounded-sm border border-red-900/20 bg-red-900/5" />
                                Ocupado
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

// ─── Reviews Carousel ──────────────────────────────────────────────────────────

const ReviewsSection: React.FC = () => {
    const [active, setActive] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setActive(i => (i + 1) % STATIC_REVIEWS.length), 6000);
        return () => clearInterval(t);
    }, []);

    return (
        <section className="py-32 bg-stone-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <div className="flex items-center justify-center gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={18} className="fill-orange-400 text-orange-400" />
                        ))}
                    </div>
                    <h2 className="font-serif text-4xl md:text-5xl text-stone-900 font-bold">
                        Lo que dicen nuestros huéspedes
                    </h2>
                </div>

                <div className="relative max-w-3xl mx-auto">
                    <div
                        key={active}
                        className="bg-white rounded-[3rem] p-10 md:p-14 shadow-lg shadow-stone-100 border border-stone-100"
                        style={{ animation: 'rpFadeIn 0.5s ease' }}
                    >
                        <div className="flex items-center gap-1 mb-6">
                            {Array.from({ length: Math.floor(STATIC_REVIEWS[active].rating / 2) }).map((_, i) => (
                                <Star key={i} size={16} className="fill-orange-400 text-orange-400" />
                            ))}
                        </div>
                        <blockquote className="font-serif text-xl md:text-2xl text-stone-800 leading-relaxed italic mb-8 font-light">
                            "{STATIC_REVIEWS[active].text}"
                        </blockquote>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-stone-900">{STATIC_REVIEWS[active].author}</p>
                                {STATIC_REVIEWS[active].apartment && (
                                    <p className="text-sm text-stone-400">{STATIC_REVIEWS[active].apartment}</p>
                                )}
                            </div>
                            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest bg-stone-50 px-3 py-1.5 rounded-full border border-stone-100">
                                {STATIC_REVIEWS[active].platform}
                            </span>
                        </div>
                    </div>

                    {/* Dots */}
                    <div className="flex justify-center gap-2 mt-8">
                        {STATIC_REVIEWS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActive(i)}
                                className={`w-2.5 h-2.5 rounded-full transition-all ${i === active ? 'scale-125' : 'bg-stone-200'}`}
                                style={i === active ? { background: '#c8a96e' } : {}}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── RentikPro Section ─────────────────────────────────────────────────────────

const RentikProSection: React.FC = () => (
    <section className="py-32 bg-stone-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-700/15 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-900/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16 max-w-3xl mx-auto">
                <span className="inline-flex items-center gap-2 bg-orange-700/20 border border-orange-600/30 text-orange-300 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                    Gestionado con RentikPro
                </span>
                <h2 className="text-4xl md:text-5xl font-serif text-white mb-6 leading-tight">
                    La tecnología invisible<br />
                    <em className="text-orange-400 not-italic">de tu descanso</em>
                </h2>
                <p className="text-stone-400 text-lg font-light leading-relaxed">
                    Desde la primera consulta hasta el check-out, todo funciona sin fricción.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {[
                    { icon: Calendar, title: 'Disponibilidad real', desc: 'Sincronización instantánea con todas las plataformas. Sin overbookings.', badge: 'Live' },
                    { icon: MessageSquare, title: 'Buzón unificado', desc: 'WhatsApp + Email + plataformas en un solo hilo. Respondemos al instante.', badge: 'Unified' },
                    { icon: Bot, title: 'IA Asistente', desc: 'Respuestas automáticas 24/7. El huésped siempre se siente atendido.', badge: 'IA' },
                ].map(({ icon: Icon, title, desc, badge }) => (
                    <div key={title} className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-orange-600/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div className="bg-orange-700/20 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Icon className="text-orange-400" size={28} />
                            </div>
                            <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                {badge}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                        <p className="text-stone-400 text-sm leading-relaxed font-light">{desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// ─── Contact Section ───────────────────────────────────────────────────────────

const ContactSection: React.FC = () => {
    const { property } = useBootstrapState();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const handleSubmit = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!name || !email || !message) return;

        setStatus('sending');
        try {
            const workerUrl = import.meta.env.VITE_PUBLIC_WORKER_URL || '';
            const res = await fetch(`${workerUrl}/public/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: property?.id ?? 'unknown',
                    name,
                    email,
                    message,
                    source: 'website-premium',
                    timestamp: new Date().toISOString(),
                }),
            });
            if (!res.ok) throw new Error('Failed');
            setStatus('sent');
        } catch {
            setStatus('error');
        }
    };

    if (!property) return null;

    return (
        <section id="contacto" className="py-32 bg-stone-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mb-16">
                    <span className="text-orange-700 font-bold tracking-[0.2em] text-xs uppercase mb-4 block">
                        Contacto
                    </span>
                    <h2 className="font-serif text-5xl md:text-6xl text-stone-900 font-bold leading-[1.1] mb-6">
                        Empieza tu<br />
                        <em className="not-italic text-orange-700">escapada rural</em>
                    </h2>
                    <p className="text-stone-500 text-xl font-light leading-relaxed">
                        Cuéntanos qué necesitas y te respondemos en menos de 2 horas.
                    </p>
                </div>

                <div className="grid lg:grid-cols-12 gap-16 items-start">
                    {/* Contact info */}
                    <div className="lg:col-span-5">
                        <div className="bg-stone-900 text-white rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-700/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10 space-y-10">
                                <h3 className="font-serif text-3xl text-orange-200">{property.name}</h3>
                                <div className="space-y-8">
                                    {property.location && (
                                        <div className="flex items-start gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-orange-400 shrink-0">
                                                <MapPin size={22} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg mb-1">{property.location.town}</p>
                                                <p className="text-stone-400 font-light">
                                                    {[property.location.province, property.location.country].filter(Boolean).join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {property.phone && (
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-orange-400 shrink-0">
                                                <Phone size={22} />
                                            </div>
                                            <a href={`tel:${property.phoneRaw || property.phone}`} className="text-xl font-light hover:text-orange-400 transition-colors">
                                                {property.phone}
                                            </a>
                                        </div>
                                    )}
                                    {property.email && (
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-orange-400 shrink-0">
                                                <Mail size={22} />
                                            </div>
                                            <a href={`mailto:${property.email}`} className="text-base font-light hover:text-orange-400 transition-colors break-all">
                                                {property.email}
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-8 border-t border-white/10">
                                    <p className="text-xs text-stone-500 uppercase tracking-widest font-bold mb-2">Powered by</p>
                                    <span className="text-orange-400 font-serif text-lg">RentikPro ✦</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="lg:col-span-7">
                        {status === 'sent' ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#c8a96e' }}>
                                    <CheckCircle size={32} className="text-white" />
                                </div>
                                <h3 className="font-serif text-3xl text-stone-900 font-bold">¡Mensaje recibido!</h3>
                                <p className="text-stone-500 text-lg">Te respondemos en menos de 2 horas.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 block">Nombre</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full px-5 py-4 rounded-2xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-orange-400 transition-colors text-base"
                                            placeholder="Tu nombre"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 block">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full px-5 py-4 rounded-2xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-orange-400 transition-colors text-base"
                                            placeholder="tu@email.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 block">Mensaje</label>
                                    <textarea
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        rows={5}
                                        className="w-full px-5 py-4 rounded-2xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-orange-400 transition-colors text-base resize-none"
                                        placeholder="¿Cuándo quieres venir? ¿Para cuántas personas? ¿Tienes alguna pregunta?"
                                    />
                                </div>

                                {status === 'error' && (
                                    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100 text-red-600">
                                        <AlertCircle size={18} />
                                        <span className="text-sm">Error al enviar. Prueba por teléfono o email.</span>
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={status === 'sending' || !name || !email || !message}
                                    className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                    style={{
                                        background: 'linear-gradient(135deg, #c8a96e 0%, #a07840 100%)',
                                        color: '#0f0f0f',
                                        boxShadow: '0 4px 24px rgba(200,169,110,0.3)',
                                    }}
                                >
                                    {status === 'sending' ? (
                                        <><Loader2 size={18} className="animate-spin" /> Enviando...</>
                                    ) : (
                                        <><MessageSquare size={18} /> Enviar mensaje</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Footer ────────────────────────────────────────────────────────────────────

const Footer: React.FC = () => {
    const { property } = useBootstrapState();

    return (
        <footer className="py-16 border-t border-white/10" style={{ background: '#0a0a0a' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <p className="font-serif text-white text-xl font-bold mb-1">{property?.name}</p>
                        {property?.slogan && (
                            <p className="text-stone-500 text-sm">{property.slogan}</p>
                        )}
                    </div>
                    <div className="text-center">
                        <a
                            href="https://rentikpro.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600 hover:text-orange-400 transition-colors"
                        >
                            Powered by RentikPro ✦
                        </a>
                    </div>
                    <div className="text-stone-600 text-xs">
                        © {new Date().getFullYear()} {property?.name}. Todos los derechos reservados.
                    </div>
                </div>
            </div>
        </footer>
    );
};

// ─── Keyframes via style tag ───────────────────────────────────────────────────

const GlobalStyles: React.FC = () => (
    <style>{`
        @keyframes rp-ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        @keyframes rpFadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    `}</style>
);

// ─── Root Template ─────────────────────────────────────────────────────────────

export const RinconcitoPremium: React.FC = () => {
    return (
        <>
            <GlobalStyles />
            <div className="min-h-screen" style={{ background: '#0f0f0f', color: '#f5f0e8' }}>
                <Header />
                <main>
                    <Hero />
                    <Ticker />
                    <ApartmentsSection />
                    <ReviewsSection />
                    <AvailabilitySection />
                    <RentikProSection />
                    <ContactSection />
                </main>
                <Footer />
            </div>
        </>
    );
};

export default RinconcitoPremium;
