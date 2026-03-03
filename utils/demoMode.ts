import { isTauri } from "./isTauri";

export function isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;

    const params = new URLSearchParams(window.location.search);
    const isDemoParam = params.get('demo') === '1';
    const isViteDemo = import.meta.env.VITE_DEMO === '1';

    // 1. Explicitly requested or forced via build env
    if (isDemoParam || isViteDemo) return true;

    // 2. Strict Tauri check: if in Tauri, NEVER demo by default.
    if (isTauri()) return false;

    // 3. Fallback: Force demo on public web deployments (non-localhost)
    // This allows the standard web build to act as a demo on preview URLs.
    return !window.location.hostname.includes('localhost');
}

export function getDemoSeed(): string {
    if (typeof window === 'undefined') return 'rentikpro';
    const params = new URLSearchParams(window.location.search);
    return params.get('seed') || 'rentikpro';
}
