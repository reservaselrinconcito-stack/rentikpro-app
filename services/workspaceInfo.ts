// Compatibility re-export.
// The primary implementation for desktop workspace location helpers lives in `src/services/workspaceInfo.ts`.

export {
  getWorkspacePath,
  isICloudWorkspace,
  openWorkspaceFolder,
  chooseFolder,
  chooseNewWorkspace,
  switchWorkspace,
} from '../src/services/workspaceInfo';
