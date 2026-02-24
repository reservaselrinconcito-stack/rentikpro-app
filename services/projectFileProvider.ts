/**
 * ProjectFileProvider
 *
 * Handles file-based project persistence using the File System Access API.
 * This is a "desktop mode" alternative to IndexedDB persistence.
 *
 * IMPORTANT: Safari does NOT support this API. Always check supportsFileSystemAccess()
 * before calling any methods, and fall back to IndexedDB mode gracefully.
 */
export class ProjectFileProvider {
    private fileHandle: FileSystemFileHandle | null = null;
    private fileName: string | null = null;

    // Persist the last chosen file handle in IndexedDB so we can restore on next launch.
    // Note: FileSystemFileHandle is structured-cloneable in Chromium.
    private static readonly HANDLE_DB = 'RentikProFileHandles';
    private static readonly HANDLE_DB_VERSION = 1;
    private static readonly HANDLE_STORE = 'handles';
    private static readonly LAST_HANDLE_KEY = 'last';

    private handleDbPromise: Promise<IDBDatabase> | null = null;

    private async getHandleDb(): Promise<IDBDatabase> {
        if (this.handleDbPromise) return this.handleDbPromise;
        this.handleDbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(ProjectFileProvider.HANDLE_DB, ProjectFileProvider.HANDLE_DB_VERSION);
            req.onerror = () => reject(req.error);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(ProjectFileProvider.HANDLE_STORE)) {
                    db.createObjectStore(ProjectFileProvider.HANDLE_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = () => resolve(req.result);
        });
        return this.handleDbPromise;
    }

    private async persistLastHandle(): Promise<void> {
        if (!this.supportsFileSystemAccess()) return;
        if (!this.fileHandle) return;
        try {
            const db = await this.getHandleDb();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction([ProjectFileProvider.HANDLE_STORE], 'readwrite');
                const store = tx.objectStore(ProjectFileProvider.HANDLE_STORE);
                const req = store.put({
                    id: ProjectFileProvider.LAST_HANDLE_KEY,
                    handle: this.fileHandle,
                    name: this.fileName,
                    updatedAt: Date.now(),
                });
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            // Non-fatal: we can still operate with in-memory handle.
            console.warn('[ProjectFileProvider] Failed to persist last file handle', e);
        }
    }

    async clearPersistedHandle(): Promise<void> {
        try {
            const db = await this.getHandleDb();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction([ProjectFileProvider.HANDLE_STORE], 'readwrite');
                const store = tx.objectStore(ProjectFileProvider.HANDLE_STORE);
                const req = store.delete(ProjectFileProvider.LAST_HANDLE_KEY);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.warn('[ProjectFileProvider] Failed to clear persisted handle', e);
        }
    }

    async restoreLastHandle(): Promise<boolean> {
        if (!this.supportsFileSystemAccess()) return false;
        try {
            const db = await this.getHandleDb();
            const rec = await new Promise<any>((resolve, reject) => {
                const tx = db.transaction([ProjectFileProvider.HANDLE_STORE], 'readonly');
                const store = tx.objectStore(ProjectFileProvider.HANDLE_STORE);
                const req = store.get(ProjectFileProvider.LAST_HANDLE_KEY);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            });
            if (!rec?.handle) return false;
            this.fileHandle = rec.handle as FileSystemFileHandle;
            this.fileName = rec.name || (this.fileHandle as any).name || null;
            return true;
        } catch (e) {
            console.warn('[ProjectFileProvider] Failed to restore last handle', e);
            return false;
        }
    }

    async queryPermission(mode: 'read' | 'readwrite' = 'read'): Promise<PermissionState> {
        const h: any = this.fileHandle as any;
        if (!h || typeof h.queryPermission !== 'function') return 'prompt';
        try {
            const m = mode === 'readwrite' ? 'readwrite' : 'read';
            return await h.queryPermission({ mode: m });
        } catch {
            return 'prompt';
        }
    }

    async requestPermission(mode: 'read' | 'readwrite' = 'read'): Promise<PermissionState> {
        const h: any = this.fileHandle as any;
        if (!h || typeof h.requestPermission !== 'function') return 'prompt';
        try {
            const m = mode === 'readwrite' ? 'readwrite' : 'read';
            return await h.requestPermission({ mode: m });
        } catch {
            return 'prompt';
        }
    }

    async readOpenProjectFileBytes(): Promise<Uint8Array> {
        if (!this.fileHandle) {
            throw new Error('No hay ningún archivo de proyecto abierto.');
        }
        const file = await this.fileHandle.getFile();
        const buffer = await file.arrayBuffer();
        return new Uint8Array(buffer);
    }

    /**
     * Returns true if the browser supports File System Access API.
     * Chrome/Edge >= 86 do. Safari and Firefox do not (as of 2025).
     */
    supportsFileSystemAccess(): boolean {
        return (
            typeof window !== 'undefined' &&
            typeof (window as any).showOpenFilePicker === 'function' &&
            typeof (window as any).showSaveFilePicker === 'function'
        );
    }

    /**
     * Prompts the user to open a project file (.rentikpro, .sqlite, or .zip).
     * Stores the file handle and name for future saves.
     * @returns the raw file bytes as Uint8Array
     */
    async openProjectFile(): Promise<Uint8Array | null> {
        if (!this.supportsFileSystemAccess()) {
            throw new Error('File System Access API no está disponible en este navegador.');
        }

        try {
            const [handle] = await window.showOpenFilePicker({
                multiple: false,
                types: [
                    {
                        description: 'RentikPro Project',
                        accept: {
                            'application/octet-stream': ['.rentikpro', '.sqlite', '.zip'],
                        },
                    },
                ],
                excludeAcceptAllOption: false
            });

            this.fileHandle = handle;
            this.fileName = handle.name;

            await this.persistLastHandle();

            const file = await handle.getFile();
            const buffer = await file.arrayBuffer();
            return new Uint8Array(buffer);
        } catch (err: any) {
            // User cancelled picker
            if (err.name === 'AbortError') {
                return null;
            }
            throw err;
        }
    }

    /**
     * Prompts the user to choose a location for a new project file.
     * Does NOT write any data yet — call saveProjectFile() after creating the DB.
     * @param defaultName suggested file name (e.g. 'mi-proyecto.rentikpro')
     */
    async createNewProjectFile(defaultName: string): Promise<boolean> {
        if (!this.supportsFileSystemAccess()) {
            throw new Error('File System Access API no está disponible en este navegador.');
        }

        try {
            // Ensure extension
            const suggestedName = defaultName.endsWith('.rentikpro') ? defaultName : `${defaultName}.rentikpro`;

            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: 'RentikPro Project',
                        accept: {
                            'application/octet-stream': ['.rentikpro'],
                        },
                    },
                ],
            });

            this.fileHandle = handle;
            this.fileName = handle.name;
            await this.persistLastHandle();
            return true;
        } catch (err: any) {
            if (err.name === 'AbortError') {
                return false;
            }
            throw err;
        }
    }

    /**
     * Writes data to the currently open project file.
     * Throws if no file handle is set — call openProjectFile() or createNewProjectFile() first.
     * @param data the SQLite database bytes to persist
     */
    async saveProjectFile(data: Uint8Array): Promise<void> {
        if (!this.fileHandle) {
            throw new Error('No hay ningún archivo de proyecto abierto. Usa "Guardar como" primero.');
        }

        const writable = await this.fileHandle.createWritable();
        await writable.write(data.buffer as ArrayBuffer);
        await writable.close();

        // Keep persisted handle fresh (some browsers may rotate internal tokens).
        await this.persistLastHandle();
    }

    /**
     * Prompts the user to choose a new save location, then writes data.
     * Updates the internal handle so future saves go to this new file.
     * @param data the SQLite database bytes to persist
     * @param defaultName suggested file name
     */
    async saveAsProjectFile(data: Uint8Array, defaultName: string): Promise<void> {
        if (!this.supportsFileSystemAccess()) {
            throw new Error('File System Access API no está disponible en este navegador.');
        }

        const handle = await window.showSaveFilePicker({
            suggestedName: defaultName,
            types: [
                {
                    description: 'RentikPro Project',
                    accept: {
                        'application/octet-stream': ['.rentikpro'],
                    },
                },
            ],
        });

        this.fileHandle = handle;
        this.fileName = handle.name;

        await this.persistLastHandle();

        const writable = await handle.createWritable();
        await writable.write(data.buffer as ArrayBuffer);
        await writable.close();
    }

    /**
     * Returns the display name of the currently open file, or 'Sin archivo'.
     */
    getProjectDisplayName(): string {
        return this.fileName ?? 'Sin archivo';
    }

    /**
     * Returns true if there is an active file handle (a file is open/linked).
     */
    hasOpenFile(): boolean {
        return this.fileHandle !== null;
    }

    /**
     * Clears the internal handle and file name.
     * Call this when closing a project or switching to IDB mode.
     */
    clearHandle(): void {
        this.fileHandle = null;
        this.fileName = null;
    }
}

// Singleton — same pattern as projectManager
export const projectFileProvider = new ProjectFileProvider();
