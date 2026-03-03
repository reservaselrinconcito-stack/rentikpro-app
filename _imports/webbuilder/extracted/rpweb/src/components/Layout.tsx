import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Instagram, Facebook, Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// import { RentikBadge } from './RentikBadge'; // Not implementing badge for now, removing to fix build
import { LanguageSelector } from './LanguageSelector';
import { useSiteConfig } from '../context/SiteConfigContext';
import { ChatWidget } from './ChatWidget';

import { useThemeTokens } from '../themes/useThemeTokens';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const cfg = useSiteConfig();
  const tokens = useThemeTokens();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Guard: If config is not loaded (should be handled by App.tsx, but extra safety here)
  // or if vital brand info is missing
  if (!cfg || !cfg.brand) {
    return null;
  }

  const navLinks = [
    { name: t('nav.apartments'), path: '/apartamentos' },
    { name: t('nav.experiences'), path: '/experiencias' },
    { name: t('nav.blog'), path: '/guias' },
    { name: t('nav.comingSoon'), path: '/proximamente' },
    { name: t('nav.contact'), path: '/contacto' },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-stone-50">
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-50 w-full transition-all duration-300 bg-white/90 backdrop-blur-md border-b border-stone-100"
        style={{ boxShadow: tokens.shadow }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link to="/" className="flex flex-col z-50">
                <span className="font-serif text-2xl font-bold text-stone-900 tracking-tight">El Rinconcito</span>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: tokens.accentColor }}>Matarraña</span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-orange-700 ${location.pathname === link.path ? 'text-orange-700' : 'text-stone-600'}`}
                >
                  {link.name}
                </Link>
              ))}

              <div className="h-4 w-px bg-stone-300 mx-2"></div>

              <LanguageSelector />

              <Link
                to="/apartamentos"
                className="text-white px-5 py-2.5 text-sm font-medium transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: tokens.primaryColor,
                  borderRadius: tokens.radius
                }}
              >
                {t('nav.book')}
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-4">
              <LanguageSelector />
              <button onClick={toggleMenu} className="text-stone-800 p-2">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-stone-50 border-b border-stone-200 shadow-xl py-4 px-6 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-medium text-stone-700 py-2 border-b border-stone-100"
              >
                {link.name}
              </Link>
            ))}
            <Link
              to="/apartamentos"
              onClick={() => setIsMenuOpen(false)}
              className="text-white text-center py-3 mt-2 font-medium"
              style={{
                backgroundColor: tokens.primaryColor,
                borderRadius: tokens.radius
              }}
            >
              {t('nav.book')}
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      <ChatWidget />

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-1">
              <h4 className="font-serif text-xl text-white mb-4">{cfg.brand.name}</h4>
              <p className="text-sm text-stone-400 mb-2">
                {cfg.brand.slogan || 'Apartamentos rurales en el corazón del Matarraña'}
              </p>
              <p className="text-xs text-stone-500">{cfg.brand.owners} · Lic. {cfg.brand.license}</p>
            </div>

            <div>
              <h5 className="text-white font-medium mb-4">{t('footer.explore')}</h5>
              <ul className="space-y-2 text-sm">
                <li><Link to="/apartamentos" className="hover:text-orange-400">{t('nav.apartments')}</Link></li>
                <li><Link to="/experiencias" className="hover:text-orange-400">{t('nav.experiences')}</Link></li>
                <li><Link to="/guias" className="hover:text-orange-400">{t('nav.blog')}</Link></li>
                {cfg.integrations.bookingUrl && (
                  <li><a href={cfg.integrations.bookingUrl} target="_blank" rel="noopener noreferrer" className="hover:text-orange-400">Booking.com</a></li>
                )}
                {cfg.integrations.airbnbUrl && (
                  <li><a href={cfg.integrations.airbnbUrl} target="_blank" rel="noopener noreferrer" className="hover:text-orange-400">Airbnb</a></li>
                )}
              </ul>
            </div>

            <div>
              <h5 className="text-white font-medium mb-4">{t('footer.legal')}</h5>
              <ul className="space-y-2 text-sm">
                <li><Link to="/aviso-legal" className="hover:text-orange-400">Aviso Legal</Link></li>
                <li><Link to="/privacidad" className="hover:text-orange-400">Privacidad</Link></li>
                <li><Link to="/cookies" className="hover:text-orange-400">Cookies</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-medium mb-4">{t('footer.contact')}</h5>
              <ul className="space-y-2 text-sm">
                {cfg.locations && cfg.locations.length > 0 && (
                  <li className="flex items-center gap-2"><MapPin size={16} /> {cfg.locations[0].town}, {cfg.locations[0].province}</li>
                )}
                {cfg.brand.email && (
                  <li className="flex items-center gap-2"><Mail size={16} />
                    <a href={`mailto:${cfg.brand.email}`} className="hover:text-orange-400 transition-colors break-all">{cfg.brand.email}</a>
                  </li>
                )}
                {cfg.brand.phone && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    <a href={cfg.social.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">{cfg.brand.phone}</a>
                  </li>
                )}
                <li className="flex gap-4 mt-4">
                  {cfg.social.instagram && <a href={cfg.social.instagram} target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-500"><Instagram size={20} /></a>}
                  {cfg.social.facebook && <a href={cfg.social.facebook} target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-500"><Facebook size={20} /></a>}
                  {cfg.social.googleMaps && <a href={cfg.social.googleMaps} target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-500" title="Google Maps"><MapPin size={20} /></a>}
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 text-center text-xs text-stone-500 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} {cfg.brand.name}. {t('footer.rights')}</p>
            <p className="flex items-center gap-1">
              Powered by <a href="/#/rentikpro" className="text-stone-300 font-bold hover:text-white">RentikPro</a> Technology
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
