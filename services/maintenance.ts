// Compatibility re-export for legacy code under /services.
export {
  isMaintenanceMode,
  getMaintenanceReason,
  beginMaintenance,
  endMaintenance,
  withMaintenance,
} from '../src/services/maintenance';
