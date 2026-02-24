// Compatibility re-export for code that expects src/services.
// The real implementation lives in /services.

export {
  isDbReady,
  getDbReady,
  __markDbReady,
  __markDbFailed,
} from '../../services/sqliteStore';
