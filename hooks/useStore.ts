import { projectManager } from '../services/projectManager';
import { SQLiteStore } from '../services/sqliteStore';

export const useStore = (): SQLiteStore => {
    return projectManager.getStore();
};
