import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Instagram, Facebook, Mail, MapPin } from 'lucide-react';
import { RentikBadge } from './RentikBadge';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Apartamentos', path: '/apartamentos' },
    { name: 'Experiencias', path: '/blog' },
    { name: 'Próximamente', path: '/proximamente' },
    { name: 'Contacto', path: '/contacto' },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-stone-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full transition-all duration-300 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo */}
            <Link to="/" className="flex flex-col z-50">
              <span className="font-serif text-2xl font-bold text-stone-900 tracking-tight">El Rinconcito</span>
              <span className="text-[10px] uppercase tracking-widest text-orange-700">Matarraña</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.path}
                  to={link.path} 
                  className={`text-sm font-medium transition-colors hover:text-orange-700 ${location.pathname === link.path ? 'text-orange-700' : 'text-stone-600'}`}
                >
                  {link.name}
                </Link>
              ))}
              <Link 
                to="/apartamentos" 
                className="bg-stone-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Reservar
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
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
                className="bg-stone-900 text-white text-center py-3 rounded-xl mt-2 font-medium"
              >
                Reservar Ahora
              </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-1">
               <h4 className="font-serif text-xl text-white mb-4">El Rinconcito</h4>
               <p className="text-sm text-stone-400 mb-4">
                 Desconexión rural premium en el corazón de la Toscana Aragonesa.
               </p>
               <RentikBadge theme="dark" />
            </div>
            
            <div>
              <h5 className="text-white font-medium mb-4">Explorar</h5>
              <ul className="space-y-2 text-sm">
                <li><Link to="/apartamentos" className="hover:text-orange-400">Alojamientos</Link></li>
                <li><Link to="/guias/astroturismo" className="hover:text-orange-400">Astroturismo</Link></li>
                <li><Link to="/guias/gastronomia" className="hover:text-orange-400">Gastronomía</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-medium mb-4">Legal</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-orange-400">Aviso Legal</a></li>
                <li><a href="#" className="hover:text-orange-400">Privacidad</a></li>
                <li><a href="#" className="hover:text-orange-400">Cookies</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-medium mb-4">Contacto</h5>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><MapPin size={16}/> Fuentespalda, Teruel</li>
                <li className="flex items-center gap-2"><Mail size={16}/> hola@elrinconcito.es</li>
                <li className="flex gap-4 mt-4">
                  <a href="#" className="text-white hover:text-orange-500"><Instagram size={20} /></a>
                  <a href="#" className="text-white hover:text-orange-500"><Facebook size={20} /></a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 text-center text-xs text-stone-500 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} El Rinconcito Matarraña. Todos los derechos reservados.</p>
            <p className="flex items-center gap-1">
              Powered by <a href="/#/rentikpro" className="text-stone-300 font-bold hover:text-white">RentikPro</a> Technology
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};