import { BuilderState, BuilderAction } from './builderTypes';
import { hydrateConfig } from './adapters';

// Helper: get the active page slug, falling back to '/'
const activePage = (state: BuilderState) => state.currentPage || '/';

export const builderReducer = (state: BuilderState, action: BuilderAction): BuilderState => {
    switch (action.type) {
        case 'SET_CONFIG':
            return {
                ...state,
                config: hydrateConfig(action.payload),
                currentPage: state.currentPage && action.payload.pages[state.currentPage] ? state.currentPage : '/'
            };

        case 'UPDATE_BLOCK': {
            const { id, updates } = action.payload;
            const page = activePage(state);
            const updatedPages = { ...state.config.pages };
            const pg = updatedPages[page];
            if (pg) {
                pg.blocks = pg.blocks.map(block =>
                    block.id === id
                        ? { ...block, ...updates, data: { ...block.data, ...(updates.data || {}) }, styles: { ...block.styles, ...(updates.styles || {}) } }
                        : block
                );
            }
            return { ...state, config: { ...state.config, pages: updatedPages } };
        }

        case 'SELECT_BLOCK':
            return { ...state, selectedBlockId: action.payload, inlineEditBlockId: null };

        case 'SET_DEVICE':
            return { ...state, device: action.payload };

        case 'SET_INSPECTOR_TAB':
            return { ...state, inspectorTab: action.payload };

        case 'REORDER_BLOCKS': {
            const { fromIndex, toIndex } = action.payload;
            const page = activePage(state);
            const reorderPages = { ...state.config.pages };
            const pg = reorderPages[page];
            if (pg) {
                const newBlocks = [...pg.blocks];
                const [moved] = newBlocks.splice(fromIndex, 1);
                newBlocks.splice(toIndex, 0, moved);
                pg.blocks = newBlocks;
            }
            return { ...state, config: { ...state.config, pages: reorderPages } };
        }

        case 'ADD_BLOCK': {
            const { block, atIndex } = action.payload;
            const page = activePage(state);
            const addPages = { ...state.config.pages };
            const pg = addPages[page];
            if (pg) {
                const newBlocks = [...pg.blocks];
                if (typeof atIndex === 'number') newBlocks.splice(atIndex, 0, block);
                else newBlocks.push(block);
                pg.blocks = newBlocks;
            }
            return { ...state, config: { ...state.config, pages: addPages }, selectedBlockId: block.id };
        }

        case 'REMOVE_BLOCK': {
            const page = activePage(state);
            const removePages = { ...state.config.pages };
            const pg = removePages[page];
            if (pg) pg.blocks = pg.blocks.filter(b => b.id !== action.payload);
            return {
                ...state,
                config: { ...state.config, pages: removePages },
                selectedBlockId: state.selectedBlockId === action.payload ? null : state.selectedBlockId
            };
        }

        case 'SET_THEME':
            return { ...state, config: { ...state.config, theme: { ...state.config.theme, ...action.payload } } };

        case 'SET_SAVING':
            return { ...state, isSaving: action.payload };

        // ── Multi-page actions ───────────────────────────────────────────────

        case 'SET_CURRENT_PAGE':
            return { ...state, currentPage: action.payload, selectedBlockId: null, inlineEditBlockId: null };

        case 'ADD_PAGE': {
            const { slug, label } = action.payload;
            const newPages = {
                ...state.config.pages,
                [slug]: {
                    slug,
                    label,
                    title: label,
                    description: '',
                    blocks: [],
                    __label: label,
                },
            };
            return {
                ...state,
                config: { ...state.config, pages: newPages },
                currentPage: slug,
                selectedBlockId: null,
            };
        }

        case 'REMOVE_PAGE': {
            if (action.payload === '/') return state; // can't delete home
            const newPages = { ...state.config.pages };
            delete newPages[action.payload];
            return {
                ...state,
                config: { ...state.config, pages: newPages },
                currentPage: '/',
                selectedBlockId: null,
            };
        }

        case 'RENAME_PAGE': {
            const { slug, label } = action.payload;
            const newPages = { ...state.config.pages };
            if (newPages[slug]) {
                newPages[slug] = { ...newPages[slug], title: label, __label: label };
            }
            return { ...state, config: { ...state.config, pages: newPages } };
        }

            return { ...state, inlineEditBlockId: action.payload };

        default:
            return state;
    }
};
