import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Instagram, Facebook, ArrowUpRight, ChevronDown, Moon, Mountain, Bike, Utensils } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { BRAND } from '../content/brand';
import { ChatWidget } from './ChatWidget';
import { AmbientSound } from './AmbientSound';
import { useTranslation } from 'react-i18next';

interface LayoutProps { children: React.ReactNode; }

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const dropRef = useRef<HTMLDivElement>(null);
  const isHome = location.pathname === '/';
  const { t } = useTranslation();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => { setMenuOpen(false); setDropOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = (p: string) => location.pathname.startsWith(p);

  const mainNav = [
    { name: t('nav.apartments', 'Apartamentos'), path: '/apartamentos' },
    { name: t('nav.experiences', 'Experiencias'), path: '/experiencias' },
    { name: t('nav.guides', 'Guías'), path: '/guias' },
    { name: t('nav.availability', 'Disponibilidad'), path: '/disponibilidad' },
    { name: t('nav.contact', 'Contacto'), path: '/contacto' },
  ];

  const discoverNav = [
    { name: t('nav.eclipse', 'Eclipse 2026'), path: '/eclipse-2026', icon: Moon, badge: '12 Ago' },
    { name: t('nav.gastronomy', 'Gastronomía'), path: '/gastronomia', icon: Utensils, badge: '★ Michelin' },
    { name: t('nav.vias_verdes', 'Vía Verde'), path: '/vias-verdes', icon: Bike, badge: '137km' },
    { name: t('nav.astro', 'Astroturismo'), path: '/astroturismo', icon: Mountain, badge: 'Starlight' },
  ];

  const navTextColor = (p: string) => {
    if (isActive(p)) return 'var(--rust)';
    return scrolled || !isHome || menuOpen ? 'var(--ink)' : 'rgba(244,240,232,0.88)';
  };

  const headerBg = scrolled || !isHome
    ? 'rgba(244,240,232,0.96)'
    : 'transparent';

  return (
    <div style={{ background: 'var(--cream)', color: 'var(--ink)' }} className="flex flex-col min-h-screen font-sans">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: headerBg,
          backdropFilter: scrolled || !isHome ? 'blur(16px)' : 'none',
          boxShadow: scrolled || !isHome ? '0 1px 0 rgba(28,24,18,0.07)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-18 md:h-20" style={{ height: '72px' }}>

          {/* Logo */}
          <Link to="/" className="z-50 flex items-center gap-3 leading-none group shrink-0">
            <img
              src="/assets/logo.png"
              alt="El Rinconcito Matarraña"
              style={{
                height: 44,
                width: 'auto',
                filter: scrolled || !isHome || menuOpen ? 'none' : 'brightness(0) invert(1)',
                transition: 'filter 0.4s ease',
              }}
            />
            <span className="font-sans text-[8px] uppercase tracking-[0.25em] font-medium hidden lg:block" style={{ color: 'var(--rust)' }}>
              Matarraña · Fuentespalda
            </span>
          </Link>

          {/* ── DESKTOP + TABLET NAV (md+) ── */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {mainNav.map(l => (
              <Link
                key={l.path}
                to={l.path}
                className="font-sans text-sm font-medium px-2.5 py-2 rounded-lg transition-colors duration-300 hover:opacity-70"
                style={{ color: navTextColor(l.path) }}
              >
                {l.name}
              </Link>
            ))}

            {/* Descubre dropdown */}
            <div ref={dropRef} className="relative">
              <button
                onClick={() => setDropOpen(v => !v)}
                className="font-sans text-sm font-medium px-2.5 py-2 rounded-lg flex items-center gap-1 transition-colors duration-300 hover:opacity-70"
                style={{ color: navTextColor('/eclipse-2026') }}
              >
                {t('nav.discover', 'Descubre')}
                <ChevronDown
                  size={13}
                  style={{ transition: 'transform 0.25s', transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {/* Dropdown panel */}
              {dropOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden shadow-xl"
                  style={{ background: 'var(--cream)', border: '1px solid rgba(28,24,18,0.08)' }}
                >
                  {discoverNav.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--cream-dark)] transition-colors"
                        style={{ color: isActive(item.path) ? 'var(--rust)' : 'var(--ink)' }}
                        onClick={() => setDropOpen(false)}
                      >
                        <Icon size={15} style={{ color: 'var(--rust)', flexShrink: 0 }} />
                        <span className="font-sans text-sm font-medium flex-grow">{item.name}</span>
                        <span
                          className="font-sans text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'rgba(181,82,55,0.10)', color: 'var(--rust)' }}
                        >
                          {item.badge}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="ml-1 flex items-center gap-2 pl-2" style={{ borderLeft: `1px solid ${scrolled || !isHome ? 'rgba(28,24,18,0.1)' : 'rgba(244,240,232,0.2)'}` }}>
              <AmbientSound light={!scrolled && isHome} />
              <LanguageSelector />
              <Link to="/disponibilidad" className="btn-primary flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden lg:block" />
                {t('nav.book', 'Reservar')}
              </Link>
            </div>
          </nav>

          {/* ── MOBILE ONLY: lang + burger ── */}
          <div className="md:hidden flex items-center gap-3 z-50">
            <LanguageSelector />
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg"
              {...{'aria-label': t('layout.menu')}}
              style={{ color: scrolled || !isHome || menuOpen ? 'var(--ink)' : 'var(--cream)' }}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── MOBILE FULLSCREEN MENU ── */}
        <div
          className="md:hidden fixed inset-0 z-40 transition-all duration-500 flex flex-col"
          style={{ background: 'var(--cream)', opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? 'auto' : 'none' }}
        >
          <div className="flex flex-col justify-center items-start h-full px-8 pt-20 pb-12 gap-0.5 overflow-y-auto">
            {[...mainNav, ...discoverNav].map((l, i) => (
              <Link
                key={l.path}
                to={l.path}
                className="font-display italic font-light py-2.5 hover-line"
                style={{
                  fontSize: 'clamp(24px, 6vw, 38px)',
                  color: isActive(l.path) ? 'var(--rust)' : 'var(--ink)',
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.5s ease ${i * 0.045}s, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.045}s`,
                  letterSpacing: '-0.015em',
                }}
              >
                {l.name}
              </Link>
            ))}
            <div className="mt-8 pt-8 w-full" style={{ borderTop: '1px solid var(--cream-dark)' }}>
              <Link to="/disponibilidad" className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t('nav.check_availability', 'Consultar disponibilidad')}
              </Link>
            </div>
            <div className="flex gap-6 mt-5">
              <a href={BRAND.contact.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-light)' }}><Instagram size={18} /></a>
              <a href={BRAND.contact.facebook} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-light)' }}><Facebook size={18} /></a>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="flex-grow">{children}</main>
      <ChatWidget />

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="relative overflow-hidden" style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
        <div className="absolute inset-0 topo-bg opacity-10 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-12">
          <div className="py-20 border-b" style={{ borderColor: 'rgba(200,169,110,0.15)' }}>
            <div className="grid lg:grid-cols-2 gap-16 items-end">
              <div>
                <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--gold)' }}>
                  Apartamentos rurales · Fuentespalda, Teruel
                </p>
                <h2 className="font-display italic font-light leading-none mb-8" style={{ fontSize: 'clamp(44px,7vw,92px)', letterSpacing: '-0.025em' }}>
                  El Rinconcito<br /><span style={{ color: 'var(--gold)' }}>{t('layout.matarrana', 'Matarraña')}</span>
                </h2>
                <div className="flex flex-wrap gap-4">
                  <a href={BRAND.contact.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2 px-7 py-3.5 text-sm">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    WhatsApp · {BRAND.contact.phone}
                  </a>
                  <a href={BRAND.contact.booking} target="_blank" rel="noopener noreferrer" className="btn-ghost flex items-center gap-2 px-7 py-3.5 text-sm">
                    Booking.com <ArrowUpRight size={15} />
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-10">
                <div>
                  <p className="font-sans text-[9px] uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--gold)' }}>{t('layout.explore', 'Explora')}</p>
                  <ul className="space-y-3">
                    {[...mainNav, { name: 'Eclipse 2026', path: '/eclipse-2026' }, { name: 'Astroturismo', path: '/astroturismo' }].map(l => (
                      <li key={l.path}>
                        <Link to={l.path} className="hover-line font-sans text-sm" style={{ color: 'rgba(244,240,232,0.5)' }}>{l.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-sans text-[9px] uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--gold)' }}>{t('nav.contact')}</p>
                  <ul className="space-y-3">
                    <li className="font-sans text-sm" style={{ color: 'rgba(244,240,232,0.5)' }}>
                      {BRAND.contact.address},<br />{BRAND.contact.city}, Teruel
                    </li>
                    <li><a href={`mailto:${BRAND.contact.email}`} className="hover-line font-sans text-sm break-all" style={{ color: 'rgba(244,240,232,0.5)' }}>{BRAND.contact.email}</a></li>
                    <li><a href={BRAND.contact.airbnb} target="_blank" rel="noopener noreferrer" className="hover-line font-sans text-sm" style={{ color: 'rgba(244,240,232,0.5)' }}>Airbnb</a></li>
                  </ul>
                  <div className="flex gap-4 mt-6">
                    <a href={BRAND.contact.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(244,240,232,0.4)' }} className="transition-colors hover:opacity-80"><Instagram size={17} /></a>
                    <a href={BRAND.contact.facebook} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(244,240,232,0.4)' }} className="transition-colors hover:opacity-80"><Facebook size={17} /></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="py-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-sans text-xs" style={{ color: 'rgba(244,240,232,0.25)' }}>
              © {new Date().getFullYear()} El Rinconcito Matarraña · Toni y Evelyn · Lic. {BRAND.license}
            </p>
            <div className="flex items-center gap-6">
              {[['Aviso Legal', '/aviso-legal'], ['Privacidad', '/privacidad'], ['Cookies', '/cookies']].map(([n, p]) => (
                <Link key={p} to={p} className="font-sans text-xs" style={{ color: 'rgba(244,240,232,0.25)' }}>{n}</Link>
              ))}
              <span className="font-sans text-xs flex items-center gap-1.5" style={{ color: 'rgba(200,169,110,0.4)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />RentikPro
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
