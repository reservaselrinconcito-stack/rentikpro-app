
import { useEffect } from 'react';

export const DATA_CHANGED_EVENT = 'rentikpro:data-changed';

export type EntityType =
  | 'properties'
  | 'apartments'
  | 'travelers'
  | 'stays'
  | 'bookings'
  | 'accounting'
  | 'marketing'
  | 'all';

export interface DataChangedDetail {
  entity: EntityType;
  batchId?: string;
}

/**
 * Emite un evento global de cambio de datos.
 * Por defecto dispara 'all' para mantener compatibilidad hacia atrás.
 */
export const notifyDataChanged = (entity: EntityType = 'all', batchId?: string) => {
  const detail: DataChangedDetail = { entity, batchId };
  window.dispatchEvent(new CustomEvent<DataChangedDetail>(DATA_CHANGED_EVENT, { detail }));
};

/**
 * Hook de suscripción a cambios de datos.
 * Si no se pasan entidades, escucha todos los cambios.
 */
export const useDataRefresh = (callback: () => void, entities?: EntityType[]) => {
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<DataChangedDetail>;
      const target = custom.detail?.entity ?? 'all';
      
      if (!entities || entities.length === 0) {
        callback();
        return;
      }
      
      if (entities.includes('all') || target === 'all' || entities.includes(target)) {
        callback();
      }
    };
    
    window.addEventListener(DATA_CHANGED_EVENT, handler as EventListener);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler as EventListener);
  }, [callback, entities && entities.join(',')]);
};
