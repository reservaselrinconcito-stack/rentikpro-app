import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  images: { src: string; caption?: string; location?: string }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const PhotoLightbox: React.FC<LightboxProps> = ({ images, index, onClose, onPrev, onNext }) => {
  const current = images[index];

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'ArrowRight') onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{ background: 'rgba(15,12,8,0.97)', animation: 'fadeIn 0.25s ease' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-6 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
        style={{ background: 'rgba(244,240,232,0.08)', color: 'rgba(244,240,232,0.7)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,240,232,0.16)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,240,232,0.08)'; }}
      >
        <X size={18} />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-6 font-sans text-xs" style={{ color: 'rgba(244,240,232,0.35)', letterSpacing: '0.1em' }}>
        {index + 1} / {images.length}
      </div>

      {/* Prev */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 md:left-8 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 group"
        style={{ background: 'rgba(244,240,232,0.07)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,240,232,0.14)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,240,232,0.07)'; }}
      >
        <ChevronLeft size={22} style={{ color: 'rgba(244,240,232,0.7)' }} />
      </button>

      {/* Image */}
      <div
        className="relative max-w-5xl max-h-[85vh] mx-16 md:mx-24"
        onClick={e => e.stopPropagation()}
        key={index}
        style={{ animation: 'fadeIn 0.3s ease' }}
      >
        <img
          src={current.src}
          alt={current.caption || ''}
          className="max-w-full max-h-[80vh] object-contain rounded-2xl"
          style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}
        />

        {(current.caption || current.location) && (
          <div className="absolute bottom-0 left-0 right-0 p-6 rounded-b-2xl" style={{ background: 'linear-gradient(to top, rgba(15,12,8,0.85), transparent)' }}>
            {current.location && (
              <p className="font-sans text-[9px] uppercase tracking-[0.28em] mb-1" style={{ color: 'var(--gold)' }}>{current.location}</p>
            )}
            {current.caption && (
              <p className="font-display italic font-light text-lg" style={{ color: 'var(--cream)' }}>{current.caption}</p>
            )}
          </div>
        )}
      </div>

      {/* Next */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 md:right-8 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
        style={{ background: 'rgba(244,240,232,0.07)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,240,232,0.14)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,240,232,0.07)'; }}
      >
        <ChevronRight size={22} style={{ color: 'rgba(244,240,232,0.7)' }} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); /* would need onGoTo */ }}
            className="rounded-full transition-all duration-300"
            style={{ width: i === index ? 20 : 6, height: 6, background: i === index ? 'var(--gold)' : 'rgba(244,240,232,0.2)' }}
          />
        ))}
      </div>
    </div>
  );
};
