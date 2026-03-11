import { SiteConfigV1, BlockInstance, PageMeta } from './types';

export type BuilderDevice = 'mobile' | 'tablet' | 'desktop';
export type InspectorTab = 'content' | 'style' | 'settings';

export interface BuilderState {
    config: SiteConfigV1;
    selectedBlockId: string | null;
    device: BuilderDevice;
    inspectorTab: InspectorTab;
    isSaving: boolean;
    currentPage: string;   // slug of the active page
    inlineEditBlockId: string | null; // block being inline-edited
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
    | { type: 'SET_SAVING'; payload: boolean }
    | { type: 'SET_CURRENT_PAGE'; payload: string }
    | { type: 'ADD_PAGE'; payload: PageMeta }
    | { type: 'REMOVE_PAGE'; payload: string }
    | { type: 'RENAME_PAGE'; payload: { slug: string; label: string } }
    | { type: 'SET_INLINE_EDIT'; payload: string | null };
