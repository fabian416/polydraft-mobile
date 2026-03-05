import { useCallback, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  /** Async function to call on refresh */
  onRefresh: () => Promise<void>;
  /** Minimum refresh display time in ms (prevents flash) */
  minDuration?: number;
}

interface UsePullToRefreshReturn {
  /** Whether the refresh is currently in progress */
  refreshing: boolean;
  /** Handler to pass to FlatList/ScrollView onRefresh prop */
  onRefresh: () => void;
}

/**
 * Standardized pull-to-refresh logic for FlatList and ScrollView.
 * Ensures a minimum display time to prevent jarring flashes,
 * and prevents concurrent refresh calls.
 */
export function usePullToRefresh({
  onRefresh: onRefreshFn,
  minDuration = 500,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefreshFn);
  onRefreshRef.current = onRefreshFn;

  const onRefresh = useCallback(() => {
    // Prevent concurrent refresh calls
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setRefreshing(true);

    const startTime = Date.now();

    onRefreshRef.current()
      .catch(() => {
        // Swallow errors — caller should handle in their onRefresh
      })
      .finally(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);

        // Ensure minimum visible duration
        setTimeout(() => {
          setRefreshing(false);
          isRefreshingRef.current = false;
        }, remaining);
      });
  }, [minDuration]);

  return {
    refreshing,
    onRefresh,
  };
}
