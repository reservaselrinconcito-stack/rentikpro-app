import { isTauri } from "./isTauri";

export function isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;

    const params = new URLSearchParams(window.location.search);
    const isDemoParam = params.get('demo') === '1';

    // Force demo if NOT in Tauri AND NO FSA (File System Access) supported/granted
    // or if explicitly requested via URL.
    return isDemoParam || (!isTauri() && !window.location.hostname.includes('localhost'));
}

export function getDemoSeed(): string {
    if (typeof window === 'undefined') return 'rentikpro';
    const params = new URLSearchParams(window.location.search);
    return params.get('seed') || 'rentikpro';
}
