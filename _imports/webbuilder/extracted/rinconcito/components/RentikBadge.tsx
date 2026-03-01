import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface RentikBadgeProps {
  className?: string;
  theme?: 'dark' | 'light';
}

export const RentikBadge: React.FC<RentikBadgeProps> = ({ className = '', theme = 'light' }) => {
  const isDark = theme === 'dark';
  
  return (
    <a 
      href="/#/rentikpro" 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        isDark 
          ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' 
          : 'bg-white/80 backdrop-blur-sm text-stone-700 border border-stone-200 hover:bg-white'
      } ${className}`}
    >
      <ShieldCheck size={14} className="text-emerald-600" />
      <span>Managed by <strong>RentikPro</strong></span>
    </a>
  );
};