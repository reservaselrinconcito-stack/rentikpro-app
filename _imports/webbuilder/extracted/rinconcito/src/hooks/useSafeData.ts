/**
 * useSafeData — Safe async data fetching hook
 *
 * Flow per the spec:
 *   1. Try real API
 *   2. If fail → demo content
 *   3. While loading → isLoading = true (render skeletons)
 *   4. Always render UI — never blank screen
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiResult } from '../integrations/rentikpro/types';

export type SafeDataState<T> = {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    isDemo: boolean;
    refetch: () => void;
};

export function useSafeData<T>(
    fetcher: () => Promise<ApiResult<T>>,
    deps: unknown[] = [],
): SafeDataState<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDemo, setIsDemo] = useState(false);
    const mountedRef = useRef(true);
    const tickRef = useRef(0);

    const run = useCallback(async () => {
        const tick = ++tickRef.current;
        setIsLoading(true);
        setError(null);

        try {
            const result = await fetcher();
            if (!mountedRef.current || tick !== tickRef.current) return;
            setData(result.data);
            setError(result.error);
            setIsDemo(result.isDemo);
        } catch (err) {
            // fetcher should never throw — but just in case
            if (!mountedRef.current || tick !== tickRef.current) return;
            setError(err instanceof Error ? err.message : 'Error inesperado');
            setIsDemo(true);
        } finally {
            if (mountedRef.current && tick === tickRef.current) {
                setIsLoading(false);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        mountedRef.current = true;
        run();
        return () => { mountedRef.current = false; };
    }, [run]);

    return { data, isLoading, error, isDemo, refetch: run };
}
