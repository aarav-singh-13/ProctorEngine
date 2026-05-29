import { useCallback, useEffect, useRef } from 'react';

/**
 * Detects tab/window switches via visibilitychange only.
 * Removed blur handler to prevent double-counting (both events fire on a single tab switch).
 * Includes 1-second debounce to prevent rapid-fire strikes.
 */
export function useTabVisibility(onTabSwitch) {
  const lastSwitchRef = useRef(0);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      // Debounce: ignore if fired within 1 second of last switch
      const now = Date.now();
      if (now - lastSwitchRef.current > 1000) {
        lastSwitchRef.current = now;
        onTabSwitch?.();
      }
    }
  }, [onTabSwitch]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);
}
