import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T, maxHistory = 30) {
    const [state, setState] = useState({
        history: [initialState],
        currentIndex: 0
    });

    const set = useCallback((newState: T | ((prev: T) => T)) => {
        setState(curr => {
            const prevState = curr.history[curr.currentIndex];
            const resolvedState = typeof newState === 'function' ? (newState as Function)(prevState) : newState;

            // Simple reference check
            if (prevState === resolvedState) return curr;

            // Remove all future states if we've undone and are now diverging
            const newHistory = curr.history.slice(0, curr.currentIndex + 1);
            newHistory.push(resolvedState);

            if (newHistory.length > maxHistory) {
                newHistory.shift(); // Remove oldest
                return { history: newHistory, currentIndex: newHistory.length - 1 };
            }
            return { history: newHistory, currentIndex: newHistory.length - 1 };
        });
    }, [maxHistory]);

    const undo = useCallback(() => {
        setState(curr => ({
            ...curr,
            currentIndex: Math.max(0, curr.currentIndex - 1)
        }));
    }, []);

    const redo = useCallback(() => {
        setState(curr => ({
            ...curr,
            currentIndex: Math.min(curr.history.length - 1, curr.currentIndex + 1)
        }));
    }, []);

    const reset = useCallback((newState: T) => {
        setState({
            history: [newState],
            currentIndex: 0
        });
    }, []);

    return {
        state: state.history[state.currentIndex] || initialState,
        set,
        undo,
        redo,
        reset,
        canUndo: state.currentIndex > 0,
        canRedo: state.currentIndex < state.history.length - 1,
    };
}
