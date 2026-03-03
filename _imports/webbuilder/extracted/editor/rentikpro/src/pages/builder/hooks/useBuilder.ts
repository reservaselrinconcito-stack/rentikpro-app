import { useReducer, useCallback, useEffect, useRef } from 'react';
import { BuilderState, BuilderAction } from '../types';
import { builderReducer } from '../store';
import { useHistory } from '../../../modules/webBuilder/hooks/useHistory';
import { SiteConfigV1, BlockInstance } from '../../../modules/webBuilder/types';
import { DEFAULT_SITE_CONFIG_V1 } from '../../../modules/webBuilder/defaults';
import { createDefaultBlock } from '../blocks/defaults';

export function useBuilder(initialConfig: SiteConfigV1 = DEFAULT_SITE_CONFIG_V1) {
    // 1. We use history for the config part
    const history = useHistory<SiteConfigV1>(initialConfig);

    // 2. We use reducer for UI state + config updates
    const [state, dispatch] = useReducer(builderReducer, {
        config: initialConfig,
        selectedBlockId: null,
        device: 'desktop',
        inspectorTab: 'content',
        isSaving: false
    });

    // 3. Sync history state to reducer config when undo/redo happens
    // Note: This is a bit tricky, we want history.state to be the source of truth for config
    useEffect(() => {
        if (history.state !== state.config) {
            dispatch({ type: 'SET_CONFIG', payload: history.state });
        }
    }, [history.state]);

    // 4. Wrap dispatch to update history when config changes
    const builderDispatch = useCallback((action: BuilderAction) => {
        // Dispatch to local reducer for immediate UI feedback
        dispatch(action);

        // If the action changes config, we should push to history
        // However, we wait for the reducer to "calculate" the next state or we calculate it here
        // For simplicity, we'll manually push to history for config-changing actions
        const nextState = builderReducer(state, action);
        if (nextState.config !== state.config) {
            history.set(nextState.config);
        }
    }, [state, history]);

    const addBlock = (type: string) => {
        const newBlock = createDefaultBlock(type);
        builderDispatch({ type: 'ADD_BLOCK', payload: { block: newBlock } });
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const toIndex = direction === 'up' ? index - 1 : index + 1;
        if (toIndex < 0 || toIndex >= (state.config.pages['/']?.blocks.length || 0)) return;
        builderDispatch({ type: 'REORDER_BLOCKS', payload: { fromIndex: index, toIndex } });
    };

    const removeBlock = (id: string) => {
        builderDispatch({ type: 'REMOVE_BLOCK', payload: id });
    };

    const updateBlock = (id: string, updates: Partial<BlockInstance>) => {
        builderDispatch({ type: 'UPDATE_BLOCK', payload: { id, updates } });
    };

    return {
        state,
        dispatch: builderDispatch,
        undo: history.undo,
        redo: history.redo,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        reset: history.reset,
        addBlock,
        moveBlock,
        removeBlock,
        updateBlock
    };
}
