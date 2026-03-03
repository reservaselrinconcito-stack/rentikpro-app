import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './resources';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    supportedLngs: ['es', 'es-AN', 'en', 'fr', 'de', 'nl', 'ca', 'eu', 'gl', 'oc'],
    load: 'all', // Ensure we support 'es-AN' specifically
    interpolation: {
      escapeValue: false,
    },
    // ── Dev-only: log missing keys with context ─────────────────────────────
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV
      ? (lngs: readonly string[], ns: string, key: string, fallbackValue: string) => {
          const page = typeof window !== 'undefined'
            ? window.location.pathname
            : '(ssr)';
          console.warn(
            `[i18n] Missing key — lang: ${lngs[0]}, ns: ${ns}, key: "${key}", page: ${page}`,
            fallbackValue ? `(fallback: "${fallbackValue}")` : ''
          );
        }
      : undefined,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;