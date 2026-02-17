import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const buildDate = new Date().toISOString().split('T')[0];

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // Usar convención de Vite con VITE_ prefix
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version || "dev"),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || "2.0.0"),
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString())
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Optimizaciones de bundle
      rollupOptions: {
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
