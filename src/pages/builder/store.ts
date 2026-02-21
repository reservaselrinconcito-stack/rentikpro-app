import { BuilderState, BuilderAction } from './types';
import { hydrateConfig } from '../../modules/webBuilder/adapters';

export const builderReducer = (state: BuilderState, action: BuilderAction): BuilderState => {
    switch (action.type) {
        case 'SET_CONFIG':
            return { ...state, config: hydrateConfig(action.payload) };

        case 'UPDATE_BLOCK':
            const { id, updates } = action.payload;
            const updatedPages = { ...state.config.pages };
            // For now, focusing on home page '/' as per current logic
            const homePage = updatedPages['/'];
            if (homePage) {
                homePage.blocks = homePage.blocks.map(block =>
                    block.id === id ? { ...block, ...updates, data: { ...block.data, ...(updates.data || {}) }, styles: { ...block.styles, ...(updates.styles || {}) } } : block
                );
            }
            return {
                ...state,
                config: { ...state.config, pages: updatedPages }
            };

        case 'SELECT_BLOCK':
            return { ...state, selectedBlockId: action.payload };

        case 'SET_DEVICE':
            return { ...state, device: action.payload };

        case 'SET_INSPECTOR_TAB':
            return { ...state, inspectorTab: action.payload };

        case 'REORDER_BLOCKS':
            const { fromIndex, toIndex } = action.payload;
            const reorderPages = { ...state.config.pages };
            const reorderHome = reorderPages['/'];
            if (reorderHome) {
                const newBlocks = [...reorderHome.blocks];
                const [moved] = newBlocks.splice(fromIndex, 1);
                newBlocks.splice(toIndex, 0, moved);
                reorderHome.blocks = newBlocks;
            }
            return { ...state, config: { ...state.config, pages: reorderPages } };

        case 'ADD_BLOCK':
            const { block, atIndex } = action.payload;
            const addPages = { ...state.config.pages };
            const addHome = addPages['/'];
            if (addHome) {
                const newBlocks = [...addHome.blocks];
                if (typeof atIndex === 'number') {
                    newBlocks.splice(atIndex, 0, block);
                } else {
                    newBlocks.push(block);
                }
                addHome.blocks = newBlocks;
            }
            return { ...state, config: { ...state.config, pages: addPages }, selectedBlockId: block.id };

        case 'REMOVE_BLOCK':
            const removePages = { ...state.config.pages };
            const removeHome = removePages['/'];
            if (removeHome) {
                removeHome.blocks = removeHome.blocks.filter(b => b.id !== action.payload);
            }
            return {
                ...state,
                config: { ...state.config, pages: removePages },
                selectedBlockId: state.selectedBlockId === action.payload ? null : state.selectedBlockId
            };

        case 'SET_THEME':
            return {
                ...state,
                config: {
                    ...state.config,
                    theme: { ...state.config.theme, ...action.payload }
                }
            };

        case 'SET_SAVING':
            return { ...state, isSaving: action.payload };

        default:
            return state;
    }
};
