/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RP_WORKER_URL?: string;
  readonly VITE_RP_PROPERTY_ID?: string;
  readonly VITE_RP_PUBLIC_TOKEN?: string;
  readonly VITE_ENABLE_DEBUG_ROUTE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
