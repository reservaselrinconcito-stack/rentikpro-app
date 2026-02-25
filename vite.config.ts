import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import packageJson from './package.json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const buildDate = new Date().toISOString().split('T')[0];
  const isTauri = process.env.VITE_TARGET === 'tauri';

  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      !isTauri && VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'RentikPro',
          short_name: 'RentikPro',
          description: 'Property Management & Rental Platform',
          theme_color: '#4f46e5',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,ico,png,svg,woff2,wasm}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: null, // Disable fallback to ensure index.html isn't served for API or other routes
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ].filter(Boolean) as any,
    define: {
      // Usar convención de Vite con VITE_ prefix
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version || "dev"),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || "2.0.0"),
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
      'import.meta.env.VITE_PUBLIC_SITE_BASE_URL': JSON.stringify(process.env.VITE_PUBLIC_SITE_BASE_URL || "https://rp-web-6h9.pages.dev"),
      'import.meta.env.VITE_PUBLIC_API_BASE': JSON.stringify(process.env.VITE_PUBLIC_API_BASE || "https://rentikpro-public-api.reservas-elrinconcito.workers.dev")
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        ...(isTauri ? { 'virtual:pwa-register': path.resolve(__dirname, 'src/pwa-register-stub.ts') } : {}),
      }
    },
    build: {
      // Optimizaciones de bundle
      rollupOptions: {
        // Tauri builds must not depend on vite-plugin-pwa virtual modules.
        // We alias `virtual:pwa-register` to a stub when isTauri.
        external: [],
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui': ['lucide-react'],
            'db': ['sql.js'],
          }
        }
      },
      chunkSizeWarningLimit: 600
    }
  };
});
