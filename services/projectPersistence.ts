import { logger } from './logger';

export interface ProjectMetadata {
    id: string;
    name: string;
    lastModified: number;
    mode: 'real' | 'demo';
    sizeBytes: number;
    bookingsCount?: number;
    accountingCount?: number;
}

const DB_NAME = 'RentikProPersistence';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

export class ProjectPersistence {
    private dbPromise: Promise<IDBDatabase> | null = null;
    private isBusy = false;

    constructor() {
        this.initDB();
    }

    private async getDB(): Promise<IDBDatabase> {
        if (this.dbPromise) {
            const db = await this.dbPromise;
            // Check if connection is actually open
            try {
                db.transaction([STORE_NAME], 'readonly');
                return db;
            } catch (e) {
                logger.warn("[ProjectPersistence] IDB connection closed or invalid. Reopening...");
                this.dbPromise = null;
            }
        }
        return this.initDB();
    }

    private initDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                logger.error("IndexedDB error:", (event.target as any).error);
                this.dbPromise = null;
                reject((event.target as any).error);
            };

            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                // Handle unexpected closure
                db.onclose = () => {
                    logger.warn("[ProjectPersistence] IDB connection closed unexpectedly.");
                    this.dbPromise = null;
                };
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });

        return this.dbPromise;
    }

    async saveProject(id: string, name: string, data: Uint8Array, mode: 'real' | 'demo', bookingsCount?: number, accountingCount?: number): Promise<void> {
        if (this.isBusy) {
            await new Promise(r => setTimeout(r, 100));
            return this.saveProject(id, name, data, mode, bookingsCount, accountingCount);
        }

        const db = await this.getDB();
        this.isBusy = true;

        try {
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);

                const record = {
                    id,
                    name,
                    data,
                    mode,
                    lastModified: Date.now(),
                    sizeBytes: data.byteLength,
                    bookingsCount,
                    accountingCount
                };

                const request = store.put(record);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject((e.target as any).error);
            });
        } finally {
            this.isBusy = false;
        }
    }

    async loadProject(id: string): Promise<{ id: string, name: string, data: Uint8Array, mode: 'real' | 'demo' } | null> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result || null);
            };
            request.onerror = (e) => reject((e.target as any).error);
        });
    }

    async listProjects(): Promise<ProjectMetadata[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            // We only want metadata, but IDB loads full objects. 
            // Optimization: In a real app we might have a separate store for metadata.
            // For now, loading them is fine since we likely only have 1-2 projects.
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result || [];
                const metadata = results.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    mode: r.mode,
                    lastModified: r.lastModified,
                    sizeBytes: r.sizeBytes,
                    bookingsCount: r.bookingsCount,
                    accountingCount: r.accountingCount
                }));
                // Sort by last modified desc
                metadata.sort((a: any, b: any) => b.lastModified - a.lastModified);
                resolve(metadata);
            };
            request.onerror = (e) => reject((e.target as any).error);
        });
    }

    async deleteProject(id: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject((e.target as any).error);
        });
    }
}

export const projectPersistence = new ProjectPersistence();
