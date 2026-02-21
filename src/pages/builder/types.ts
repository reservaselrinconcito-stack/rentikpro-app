import { SiteConfigV1, BlockInstance } from '../../modules/webBuilder/types';

export type BuilderDevice = 'mobile' | 'tablet' | 'desktop';
export type InspectorTab = 'content' | 'style' | 'settings';

export interface BuilderState {
    config: SiteConfigV1;
    selectedBlockId: string | null;
    device: BuilderDevice;
    inspectorTab: InspectorTab;
    isSaving: boolean;
}

export type BuilderAction =
    | { type: 'SET_CONFIG'; payload: SiteConfigV1 }
    | { type: 'UPDATE_BLOCK'; payload: { id: string; updates: Partial<BlockInstance> } }
    | { type: 'SELECT_BLOCK'; payload: string | null }
    | { type: 'SET_DEVICE'; payload: BuilderDevice }
    | { type: 'SET_INSPECTOR_TAB'; payload: InspectorTab }
    | { type: 'REORDER_BLOCKS'; payload: { fromIndex: number; toIndex: number } }
    | { type: 'ADD_BLOCK'; payload: { block: BlockInstance; atIndex?: number } }
    | { type: 'REMOVE_BLOCK'; payload: string }
    | { type: 'SET_THEME'; payload: any }
    | { type: 'SET_SAVING'; payload: boolean };
