import { useReducer, useCallback, useEffect, useRef } from 'react';
import { BuilderState, BuilderAction } from '../types';
import { builderReducer } from '../store';
import { useHistory } from '../../../modules/webBuilder/hooks/useHistory';
import { SiteConfigV1, BlockInstance } from '../../../modules/webBuilder/types';
import { DEFAULT_SITE_CONFIG_V1 } from '../../../modules/webBuilder/defaults';
import { createDefaultBlock } from '../blocks/defaults';

export function useBuilder(initialConfig: SiteConfigV1 = DEFAULT_SITE_CONFIG_V1) {
    const history = useHistory<SiteConfigV1>(initialConfig);

    const [state, dispatch] = useReducer(builderReducer, {
        config: initialConfig,
        selectedBlockId: null,
        device: 'desktop',
        inspectorTab: 'content',
        isSaving: false
    });

    // Use a ref to always have access to the latest state without stale closure
    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    // Sync history → reducer when undo/redo moves the history pointer
    const historyStateRef = useRef(history.state);
    useEffect(() => {
        if (history.state !== historyStateRef.current) {
            historyStateRef.current = history.state;
            dispatch({ type: 'SET_CONFIG', payload: history.state });
        }
    }, [history.state]);

    // Wrap dispatch: compute next config via reducer, push to history if changed
    const builderDispatch = useCallback((action: BuilderAction) => {
        dispatch(action);
        const current = stateRef.current;
        const nextState = builderReducer(current, action);
        if (nextState.config !== current.config) {
            history.set(nextState.config);
            historyStateRef.current = nextState.config;
        }
    }, [history]);

    const addBlock = useCallback((type: string) => {
        const newBlock = createDefaultBlock(type);
        builderDispatch({ type: 'ADD_BLOCK', payload: { block: newBlock } });
    }, [builderDispatch]);

    const moveBlock = useCallback((index: number, direction: 'up' | 'down') => {
        const blocks = stateRef.current.config.pages['/']?.blocks ?? [];
        const toIndex = direction === 'up' ? index - 1 : index + 1;
        if (toIndex < 0 || toIndex >= blocks.length) return;
        builderDispatch({ type: 'REORDER_BLOCKS', payload: { fromIndex: index, toIndex } });
    }, [builderDispatch]);

    const removeBlock = useCallback((id: string) => {
        builderDispatch({ type: 'REMOVE_BLOCK', payload: id });
    }, [builderDispatch]);

    const updateBlock = useCallback((id: string, updates: Partial<BlockInstance>) => {
        builderDispatch({ type: 'UPDATE_BLOCK', payload: { id, updates } });
    }, [builderDispatch]);

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
