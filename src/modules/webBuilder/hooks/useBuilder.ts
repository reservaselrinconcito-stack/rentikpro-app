import { useReducer, useCallback, useEffect, useRef } from 'react';
import { BuilderState, BuilderAction, PageMeta } from '../builderTypes';
import { builderReducer } from '../store';
import { useHistory } from './useHistory';
import { hydrateConfig } from '../adapters';
import { SiteConfigV1, BlockInstance } from '../types';
import { DEFAULT_SITE_CONFIG_V1 } from '../defaults';
import { createDefaultBlock } from '../blocks/defaults';

export function useBuilder(initialConfig: SiteConfigV1 = DEFAULT_SITE_CONFIG_V1) {
    const history = useHistory<SiteConfigV1>(initialConfig);

    const [state, dispatch] = useReducer(builderReducer, {
        config: initialConfig,
        selectedBlockId: null,
        device: 'desktop',
        inspectorTab: 'content',
        isSaving: false,
        currentPage: '/',
        inlineEditBlockId: null,
    });

    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Sync history → reducer on undo/redo
    useEffect(() => {
        if (history.state !== state.config) {
            dispatch({ type: 'SET_CONFIG', payload: history.state });
        }
    }, [history.state]);

    const builderDispatch = useCallback((action: BuilderAction) => {
        const currentState = stateRef.current;
        dispatch(action);
        const nextState = builderReducer(currentState, action);
        if (nextState.config !== currentState.config) {
            history.set(nextState.config);
        }
    }, [history]);

    // ── Block helpers (page-aware) ──────────────────────────────────────────
    const addBlock = (type: string) => {
        const newBlock = createDefaultBlock(type);
        builderDispatch({ type: 'ADD_BLOCK', payload: { block: newBlock } });
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const toIndex = direction === 'up' ? index - 1 : index + 1;
        const blocks = state.config.pages[state.currentPage || '/']?.blocks ?? [];
        if (toIndex < 0 || toIndex >= blocks.length) return;
        builderDispatch({ type: 'REORDER_BLOCKS', payload: { fromIndex: index, toIndex } });
    };

    const removeBlock = (id: string) => builderDispatch({ type: 'REMOVE_BLOCK', payload: id });
    const updateBlock = (id: string, updates: Partial<BlockInstance>) =>
        builderDispatch({ type: 'UPDATE_BLOCK', payload: { id, updates } });

    // ── Page helpers ───────────────────────────────────────────────────────
    const addPage = (meta: PageMeta) => builderDispatch({ type: 'ADD_PAGE', payload: meta });
    const removePage = (slug: string) => builderDispatch({ type: 'REMOVE_PAGE', payload: slug });
    const renamePage = (slug: string, label: string) =>
        builderDispatch({ type: 'RENAME_PAGE', payload: { slug, label } });
    const setCurrentPage = (slug: string) =>
        builderDispatch({ type: 'SET_CURRENT_PAGE', payload: slug });

    // ── Inline edit helpers ────────────────────────────────────────────────
    const startInlineEdit = (blockId: string) =>
        builderDispatch({ type: 'SET_INLINE_EDIT', payload: blockId });
    const stopInlineEdit = () =>
        builderDispatch({ type: 'SET_INLINE_EDIT', payload: null });

    return {
        // State
        config: state.config,
        device: state.device,
        selectedBlockId: state.selectedBlockId,
        inspectorTab: state.inspectorTab,
        currentPage: state.currentPage || '/',
        inlineEditBlockId: state.inlineEditBlockId,

        // Actions
        dispatch: builderDispatch,
        undo: history.undo,
        redo: history.redo,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        reset: history.reset,

        // Block
        addBlock,
        moveBlock,
        removeBlock,
        updateBlock,

        // Pages
        addPage,
        removePage,
        renamePage,
        setCurrentPage,

        // Inline edit
        startInlineEdit,
        stopInlineEdit,
    };
}
