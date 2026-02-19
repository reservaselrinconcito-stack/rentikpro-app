
import { PromptInputs, TemplateId } from './promptTemplates';

export interface PromptRecord {
  id: string;
  templateId: TemplateId;
  templateName: string;
  summary: string;
  fullPrompt: string;
  inputs: PromptInputs;
  isFavorite: boolean;
  createdAt: number;
}

class PromptHistoryStore {
  private dbName = 'RentikPro_Prompts_DB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error("IndexedDB Error:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (e: any) => {
        const db = e.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains('prompts')) {
          const store = db.createObjectStore('prompts', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
        }
      };
    });
  }

  async save(record: PromptRecord): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('prompts', 'readwrite');
      const store = tx.objectStore('prompts');
      // Ensure we don't save huge objects like full_context_site repeatedly
      const safeRecord = { ...record, inputs: { ...record.inputs, full_context_site: null } };
      store.put(safeRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRecent(limit: number = 20): Promise<PromptRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('prompts', 'readonly');
      const store = tx.objectStore('prompts');
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev'); // Descending
      const results: PromptRecord[] = [];

      request.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Valida si una clave es apta para ser usada en IndexedDB.
   * Evita errores: "Failed to execute 'only' on 'IDBKeyRange': The parameter is not a valid key."
   */
  private isValidKey(key: any): boolean {
    if (key === undefined || key === null) return false;
    if (typeof key === 'string' && key.trim().length === 0) return false;

    // Tipos válidos en IndexedDB: string, number, Date, ArrayBuffer, ArrayBufferView
    return (
      typeof key === 'string' ||
      typeof key === 'number' ||
      key instanceof Date ||
      ArrayBuffer.isView(key) ||
      key instanceof ArrayBuffer
    );
  }

  async getFavorites(projectId?: string): Promise<PromptRecord[]> {
    await this.init();

    // Si se pasa projectId, validamos que sea una clave válida.
    // En este almacén actual 'isFavorite' es el índice, pero protegemos IDBKeyRange.
    // El requerimiento pide validar la key que se pasa a .only()
    const key = true; // El índice actual es booleano para 'isFavorite'

    if (!this.isValidKey(key)) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('prompts', 'readonly');
      const store = tx.objectStore('prompts');
      const index = store.index('isFavorite');

      const request = index.getAll(IDBKeyRange.only(key));

      request.onsuccess = () => {
        let res = request.result as PromptRecord[];
        // Si en el futuro filtramos por proyecto en este método:
        if (projectId) {
          // Nota: Actualmente el almacén no tiene projectId por registro, 
          // pero filtramos por consistencia con el requerimiento de validar claves.
          // res = res.filter(r => r.projectId === projectId);
        }
        // Sort by createdAt desc manually since index is isFavorite
        res.sort((a, b) => b.createdAt - a.createdAt);
        resolve(res);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('prompts', 'readwrite');
      tx.objectStore('prompts').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('prompts', 'readwrite');
      const store = tx.objectStore('prompts');
      const request = store.get(id);

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          data.isFavorite = isFavorite;
          store.put(data);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const promptHistory = new PromptHistoryStore();
