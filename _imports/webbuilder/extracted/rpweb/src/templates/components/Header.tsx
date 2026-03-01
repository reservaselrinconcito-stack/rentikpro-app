import React from 'react';
import { useBootstrapState } from '../../app/BootstrapContext';

interface HeaderProps {
  variant?: 'default' | 'modern' | 'minimal' | 'luxe';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'default' }) => {
  const { property } = useBootstrapState();
  if (!property) return null;

  const isLuxe = variant === 'luxe';
  const isMinimal = variant === 'minimal';

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isMinimal ? 'bg-white/80 backdrop-blur-md border-b border-gray-100' : 
        isLuxe ? 'bg-brand-dark/95 text-white' : 
        'bg-white border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {property.logoUrl ? (
            <img src={property.logoUrl} alt={property.name} className="h-10 w-auto object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-brand-accent flex items-center justify-center text-white font-bold text-lg">
              {property.shortName?.charAt(0) || 'E'}
            </div>
          )}
          <div className="hidden sm:block">
            <h1 className={`text-lg font-bold leading-tight ${isLuxe ? 'text-white' : 'text-brand-dark'} font-serif`}>
              {property.name}
            </h1>
            {property.slogan && (
              <p className={`text-xs ${isLuxe ? 'text-gray-400' : 'text-gray-500'}`}>{property.slogan}</p>
            )}
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {['Inicio', 'Alojamientos', 'Disponibilidad', 'Contacto'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase().replace('ñ', 'n')}`}
              className={`text-sm font-medium transition-colors hover:text-brand-accent ${
                isLuxe ? 'text-gray-300' : 'text-brand-dark/70'
              }`}
            >
              {item}
            </a>
          ))}
        </nav>

        {property.phone && (
          <a
            href={`tel:${property.phoneRaw || property.phone}`}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              isLuxe 
                ? 'bg-white text-brand-dark hover:bg-gray-100' 
                : 'bg-brand-accent text-white hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20'
            }`}
          >
            {property.phone}
          </a>
        )}
      </div>
    </header>
  );
};
