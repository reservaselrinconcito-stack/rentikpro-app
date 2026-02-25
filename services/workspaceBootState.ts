// Compatibility re-export.
// The primary implementation lives in `src/services/workspaceBootState.ts`.

export {
    getWorkspaceBootState,
    setWorkspaceBootState,
    onBootStateChange,
} from '../src/services/workspaceBootState';

export type {
    WorkspaceBootState,
    BootPhase,
} from '../src/services/workspaceBootState';
