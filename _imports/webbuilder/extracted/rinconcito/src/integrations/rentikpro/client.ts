/**
 * Backward-compatibility shim.
 * All new code should import from '../../integrations/rentikpro/api'.
 * This file re-exports the new API functions under the old names.
 */
export {
    getAvailability as fetchAvailability,
    createLead as sendLead,
    createBookingRequest as sendBookingRequest,
    IS_DEMO,
} from './api';

// Re-export types
export type { RentikProLead, RentikProLeadResponse, ApiResult } from './types';
