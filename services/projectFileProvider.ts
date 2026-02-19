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
    async openProjectFile(): Promise<Uint8Array> {
        if (!this.supportsFileSystemAccess()) {
            throw new Error('File System Access API no está disponible en este navegador.');
        }

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
        });

        this.fileHandle = handle;
        this.fileName = handle.name;

        const file = await handle.getFile();
        const buffer = await file.arrayBuffer();
        return new Uint8Array(buffer);
    }

    /**
     * Prompts the user to choose a location for a new project file.
     * Does NOT write any data yet — call saveProjectFile() after creating the DB.
     * @param defaultName suggested file name (e.g. 'mi-proyecto.rentikpro')
     */
    async createNewProjectFile(defaultName: string): Promise<void> {
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
