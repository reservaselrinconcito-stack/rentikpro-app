import React from 'react';

type Props = {
  className?: string;
  variant?: 'full' | 'icon';
};

export default function LogoRentikPro({ className, variant = 'full' }: Props) {
  const commonProps = {
    role: 'img' as const,
    'aria-label': 'RentikPro',
    className,
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  };

  if (variant === 'icon') {
    return (
      <svg width="100%" height="100%" viewBox="0 0 512 512" {...commonProps}>
        <rect width="512" height="512" rx="120" ry="120" fill="#18508e" />
        <path d="M 256 110 L 80 270 H 130 V 420 H 382 V 270 H 432 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="15" strokeLinejoin="round" />
        <path d="M 200 350 L 250 390 L 330 260" fill="none" stroke="#18508e" strokeWidth="45" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 512 680" {...commonProps}>
      <rect width="512" height="512" rx="120" ry="120" fill="#18508e" />
      <path d="M 256 110 L 80 270 H 130 V 420 H 382 V 270 H 432 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="15" strokeLinejoin="round" />
      <path d="M 200 350 L 250 390 L 330 260" fill="none" stroke="#18508e" strokeWidth="45" strokeLinecap="round" strokeLinejoin="round" />
      <text x="256" y="618" textAnchor="middle" fontFamily="Inter, 'DM Sans', system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="90" letterSpacing="-2">
        <tspan fill="#0a1226">Rentik</tspan><tspan fill="#1e7bfa">Pro</tspan>
      </text>
    </svg>
  );
}
