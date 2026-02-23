import { logger } from './logger';

export interface WebDavConfig {
    url: string;
    user: string;
    pass: string;
}

export class WebDavService {
    private config: WebDavConfig;

    constructor(config: WebDavConfig) {
        // Ensure URL doesn't end with slash for consistency
        this.config = {
            ...config,
            url: config.url.replace(/\/$/, '')
        };
    }

    private getHeaders(extra: Record<string, string> = {}): Headers {
        const headers = new Headers(extra);
        const auth = btoa(`${this.config.user}:${this.config.pass}`);
        headers.set('Authorization', `Basic ${auth}`);
        return headers;
    }

    async exists(path: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.url}${path}`, {
                method: 'PROPFIND',
                headers: this.getHeaders({ 'Depth': '0' })
            });
            return response.status === 207 || response.status === 200;
        } catch (e) {
            return false;
        }
    }

    async makeDir(path: string): Promise<void> {
        const response = await fetch(`${this.config.url}${path}`, {
            method: 'MKCOL',
            headers: this.getHeaders()
        });
        if (response.status !== 201 && response.status !== 405) { // 405 means already exists
            const text = await response.text();
            throw new Error(`Failed to create directory ${path}: ${response.status} ${text}`);
        }
    }

    async putFile(path: string, data: Uint8Array | string, contentType: string = 'application/octet-stream'): Promise<void> {
        const response = await fetch(`${this.config.url}${path}`, {
            method: 'PUT',
            headers: this.getHeaders({ 'Content-Type': contentType }),
            body: data as any
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to put file ${path}: ${response.status} ${text}`);
        }
    }

    async getFile(path: string): Promise<Uint8Array> {
        const response = await fetch(`${this.config.url}${path}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Failed to get file ${path}: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
    }

    async getFileAsText(path: string): Promise<string> {
        const response = await fetch(`${this.config.url}${path}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Failed to get file ${path}: ${response.status}`);
        }
        return await response.text();
    }

    async deleteFile(path: string): Promise<void> {
        const response = await fetch(`${this.config.url}${path}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok && response.status !== 404) {
            throw new Error(`Failed to delete file ${path}: ${response.status}`);
        }
    }

    async moveFile(from: string, to: string): Promise<void> {
        const response = await fetch(`${this.config.url}${from}`, {
            method: 'MOVE',
            headers: this.getHeaders({
                'Destination': `${this.config.url}${to}`,
                'Overwrite': 'T'
            })
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to move file from ${from} to ${to}: ${response.status} ${text}`);
        }
    }

    /**
     * Minimal locking using a JSON lock file.
     * WebDAV native LOCK is often complex or not supported in all BYOC providers.
     * We use a "lock.json" file with client info and timestamp.
     */
    async acquireLock(path: string, clientId: string, ttlMs: number = 60000): Promise<boolean> {
        const lockPath = `${path}/lock.json`;

        try {
            // 1. Try to read existing lock
            const lockData = await this.getFileAsText(lockPath).catch(() => null);
            if (lockData) {
                const lock = JSON.parse(lockData);
                const now = Date.now();
                // If lock is still valid and not ours, we fail
                if (lock.clientId !== clientId && now < (lock.timestamp + lock.ttl)) {
                    return false;
                }
            }

            // 2. Write our lock
            const newLock = {
                clientId,
                timestamp: Date.now(),
                ttl: ttlMs
            };
            await this.putFile(lockPath, JSON.stringify(newLock), 'application/json');
            return true;
        } catch (e) {
            logger.error(`Error acquiring lock at ${lockPath}:`, e);
            return false;
        }
    }

    async releaseLock(path: string): Promise<void> {
        await this.deleteFile(`${path}/lock.json`).catch(() => { });
    }
}
