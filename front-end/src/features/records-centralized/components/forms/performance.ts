/**
 * Orthodox Metrics - Performance Utilities
 * Performance optimization utilities for the records system
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(label: string): void {
    performance.mark(`${label}-start`);
  }

  endTiming(label: string): number {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const entries = performance.getEntriesByName(label, 'measure');
    const duration = entries[entries.length - 1]?.duration || 0;
    
    // Store metric
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    // Clean up marks
    performance.clearMarks(`${label}-start`);
    performance.clearMarks(`${label}-end`);
    performance.clearMeasures(label);
    
    return duration;
  }

  getMetrics(label?: string): Map<string, number[]> | number[] {
    if (label) {
      return this.metrics.get(label) || [];
    }
    return this.metrics;
  }

  getAverageTime(label: string): number {
    const times = this.metrics.get(label) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  clearMetrics(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }

  startObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.log(`${entry.name}: ${entry.duration}ms`);
        });
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      this.observers.push(observer);
    }
  }

  stopObserver(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Memoization utilities
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

// Debounced hooks
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [delay, ...deps]
  );

  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return debouncedCallback as T;
}

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const throttledCallback = useMemo(
    () => throttle(callback, delay),
    [delay, ...deps]
  );

  useEffect(() => {
    return () => {
      throttledCallback.cancel();
    };
  }, [throttledCallback]);

  return throttledCallback as T;
}

// Virtual scrolling utilities
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length - 1
    );

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      totalHeight: items.length * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    visibleRange,
    handleScroll,
    totalHeight: visibleRange.totalHeight,
    offsetY: visibleRange.startIndex * itemHeight,
  };
}

// Lazy loading utilities
export function useLazyLoad<T>(
  loadFn: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (loading || data) return;

    setLoading(true);
    setError(null);

    try {
      const result = await loadFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [loadFn, loading, data]);

  useEffect(() => {
    load();
  }, deps);

  return { data, loading, error, reload: load };
}

// Intersection observer for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
}

// Memory management utilities
export function useMemoryCleanup() {
  const cleanupFunctions = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, []);

  return addCleanup;
}

// Bundle size optimization
export function useCodeSplitting<T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
) {
  const [Component, setComponent] = useState<T | null>(fallback || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    importFn()
      .then((module) => {
        setComponent(() => module.default);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load component'));
        console.error('Code splitting error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [importFn]);

  return { Component, loading, error };
}

// Performance profiling
export function usePerformanceProfiler(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    lastRenderTime.current = performance.now();
  });

  const profile = useMemo(() => ({
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current,
    componentName,
  }), [componentName]);

  return profile;
}

// Data fetching optimization
export function useOptimizedDataFetch<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: {
    staleTime?: number;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchTime = useRef(0);
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const fetchData = useCallback(async () => {
    const now = Date.now();
    const cacheKey = JSON.stringify(deps);
    const cached = cache.current.get(cacheKey);

    // Check if data is still fresh
    if (cached && (now - cached.timestamp) < (options.staleTime || 5 * 60 * 1000)) {
      setData(cached.data);
      return;
    }

    // Check if we're already fetching
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      
      // Cache the result
      cache.current.set(cacheKey, { data: result, timestamp: now });
      lastFetchTime.current = now;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn, deps, loading, options.staleTime]);

  useEffect(() => {
    fetchData();
  }, deps);

  // Refetch on window focus if enabled
  useEffect(() => {
    if (!options.refetchOnWindowFocus) return;

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFetchTime.current > (options.staleTime || 5 * 60 * 1000)) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData, options.refetchOnWindowFocus, options.staleTime]);

  return { data, loading, error, refetch: fetchData };
}

// Export performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export default performance utilities
export default {
  PerformanceMonitor,
  useStableCallback,
  useStableMemo,
  useDebouncedCallback,
  useThrottledCallback,
  useVirtualScroll,
  useLazyLoad,
  useIntersectionObserver,
  useMemoryCleanup,
  useCodeSplitting,
  usePerformanceProfiler,
  useOptimizedDataFetch,
  performanceMonitor,
};