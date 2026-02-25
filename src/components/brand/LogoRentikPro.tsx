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
    viewBox: '0 0 200 200',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  };

  if (variant === 'icon') {
    return (
      <svg width="200" height="200" {...commonProps}>
        <path
          d="M100 25L40 75V155H160V75L100 25Z"
          stroke="#1E3A8A"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M75 110L95 130L135 80"
          stroke="#2563EB"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="200" height="200" {...commonProps}>
      <path
        d="M100 25L40 75V155H160V75L100 25Z"
        stroke="#1E3A8A"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M75 110L95 130L135 80"
        stroke="#2563EB"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="100"
        y="185"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="26"
        fontWeight="800"
        fill="#1E3A8A"
        textAnchor="middle"
        letterSpacing="-0.5"
      >
        RentikPro
      </text>
    </svg>
  );
}
