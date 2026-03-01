import React from 'react';
import { useSiteConfig } from '../site-config/useSiteConfig';
import { useThemeTokens } from '../themes/useThemeTokens';
import { SEO } from '../components/SEO';
import { BlockRenderer } from '../components/BlockRenderer';

export default function Home() {
  const cfg = useSiteConfig();
  const tokens = useThemeTokens();

  if (!cfg?.brand) return null;

  return (
    <div
      className="min-h-screen bg-stone-50 font-sans selection:bg-orange-200 selection:text-orange-900"
      style={{ fontSize: `${tokens.fontScale || 1}rem` }}
    >
      <SEO
        title={cfg.seo.defaultTitle}
        description={cfg.seo.defaultDescription}
      />

      <BlockRenderer
        blocks={cfg.blocks}
        config={cfg}
      />
    </div>
  );
}