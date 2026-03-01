import { isTauri } from "../utils/isTauri";

export interface IStorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}

export class TauriStorageAdapter implements IStorageAdapter {
    async getItem(key: string): Promise<string | null> {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }
    async setItem(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value);
    }
    async removeItem(key: string): Promise<void> {
        localStorage.removeItem(key);
    }
    async clear(): Promise<void> {
        localStorage.clear();
    }
}

export class WebDemoStorageAdapter implements IStorageAdapter {
    private prefix: string;

    constructor(seed: string = 'rentikpro') {
        this.prefix = `rp_demo_${seed}_`;
    }

    async getItem(key: string): Promise<string | null> {
        try {
            return localStorage.getItem(this.prefix + key);
        } catch {
            return null;
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        localStorage.setItem(this.prefix + key, value);
    }

    async removeItem(key: string): Promise<void> {
        localStorage.removeItem(this.prefix + key);
    }

    async clear(): Promise<void> {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        }
    }
}

let currentAdapter: IStorageAdapter | null = null;

export function getStorageAdapter(): IStorageAdapter {
    if (currentAdapter) return currentAdapter;

    const params = new URLSearchParams(window.location.search);
    const isViteDemo = import.meta.env.VITE_DEMO === '1';
    const isDemo = params.get('demo') === '1' || isViteDemo || !isTauri();
    const seed = params.get('seed') || 'rentikpro';

    if (isDemo) {
        currentAdapter = new WebDemoStorageAdapter(seed);
    } else {
        currentAdapter = new TauriStorageAdapter();
    }

    return currentAdapter;
}
