import { BuilderState, BuilderAction } from './types';
import { hydrateConfig } from '../../modules/webBuilder/adapters';

export const builderReducer = (state: BuilderState, action: BuilderAction): BuilderState => {
    switch (action.type) {
        case 'SET_CONFIG':
            return { ...state, config: hydrateConfig(action.payload) };

        case 'UPDATE_BLOCK': {
            const { id, updates } = action.payload;
            const currentPages = state.config.pages;
            const homePage = currentPages['/'];

            if (!homePage) return state;

            const updatedBlocks = homePage.blocks.map(block =>
                block.id === id ? {
                    ...block,
                    ...updates,
                    data: { ...block.data, ...(updates.data || {}) },
                    styles: { ...block.styles, ...(updates.styles || {}) }
                } : block
            );

            return {
                ...state,
                config: {
                    ...state.config,
                    pages: {
                        ...currentPages,
                        '/': { ...homePage, blocks: updatedBlocks }
                    }
                }
            };
        }

        case 'SELECT_BLOCK':
            return { ...state, selectedBlockId: action.payload };

        case 'SET_DEVICE':
            return { ...state, device: action.payload };

        case 'SET_INSPECTOR_TAB':
            return { ...state, inspectorTab: action.payload };

        case 'REORDER_BLOCKS': {
            const { fromIndex, toIndex } = action.payload;
            const homePage = state.config.pages['/'];

            if (!homePage) return state;

            const newBlocks = [...homePage.blocks];
            const [moved] = newBlocks.splice(fromIndex, 1);
            newBlocks.splice(toIndex, 0, moved);

            return {
                ...state,
                config: {
                    ...state.config,
                    pages: {
                        ...state.config.pages,
                        '/': { ...homePage, blocks: newBlocks }
                    }
                }
            };
        }

        case 'ADD_BLOCK': {
            const { block, atIndex } = action.payload;
            const homePage = state.config.pages['/'];

            if (!homePage) return state;

            const newBlocks = [...homePage.blocks];
            if (typeof atIndex === 'number') {
                newBlocks.splice(atIndex, 0, block);
            } else {
                newBlocks.push(block);
            }

            return {
                ...state,
                config: {
                    ...state.config,
                    pages: {
                        ...state.config.pages,
                        '/': { ...homePage, blocks: newBlocks }
                    }
                },
                selectedBlockId: block.id
            };
        }

        case 'REMOVE_BLOCK': {
            const homePage = state.config.pages['/'];

            if (!homePage) return state;

            const updatedBlocks = homePage.blocks.filter(b => b.id !== action.payload);

            return {
                ...state,
                config: {
                    ...state.config,
                    pages: {
                        ...state.config.pages,
                        '/': { ...homePage, blocks: updatedBlocks }
                    }
                },
                selectedBlockId: state.selectedBlockId === action.payload ? null : state.selectedBlockId
            };
        }

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
