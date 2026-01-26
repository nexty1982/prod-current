// React hook for managing log filters and building API queries
import { useState, useCallback, useMemo } from 'react';
import { LogFilters, UseLogFilterReturn } from '../types/logging';

interface UseLogFilterOptions {
  initialFilters?: Partial<LogFilters>;
  onFiltersChange?: (filters: LogFilters) => void;
}

export const useLogFilter = (options: UseLogFilterOptions = {}): UseLogFilterReturn => {
  const {
    initialFilters = {},
    onFiltersChange
  } = options;

  // Initialize filters with defaults
  const [filters, setFilters] = useState<LogFilters>({
    level: undefined,
    source: undefined,
    service: undefined,
    user_email: undefined,
    start_date: undefined,
    end_date: undefined,
    search: undefined,
    limit: 100,
    offset: 0,
    ...initialFilters
  });

  // Update a single filter
  const updateFilter = useCallback((key: keyof LogFilters, value: any) => {
    setFilters(prevFilters => {
      // Handle undefined/empty values
      const newValue = value === '' || value === null ? undefined : value;
      
      const newFilters = {
        ...prevFilters,
        [key]: newValue
      };

      // Reset offset when changing filters (except offset itself)
      if (key !== 'offset' && key !== 'limit') {
        newFilters.offset = 0;
      }

      // Call callback if provided
      onFiltersChange?.(newFilters);

      return newFilters;
    });
  }, [onFiltersChange]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters: LogFilters = {
      level: undefined,
      source: undefined,
      service: undefined,
      user_email: undefined,
      start_date: undefined,
      end_date: undefined,
      search: undefined,
      limit: 100,
      offset: 0
    };

    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  }, [onFiltersChange]);

  // Apply multiple filters at once
  const applyFilters = useCallback((newFilters: Partial<LogFilters>) => {
    setFilters(prevFilters => {
      const mergedFilters = {
        ...prevFilters,
        ...newFilters,
        // Reset offset when applying new filters
        offset: 0
      };

      // Clean up undefined values
      Object.keys(mergedFilters).forEach(key => {
        const filterKey = key as keyof LogFilters;
        if (mergedFilters[filterKey] === '' || mergedFilters[filterKey] === null) {
          mergedFilters[filterKey] = undefined;
        }
      });

      onFiltersChange?.(mergedFilters);
      return mergedFilters;
    });
  }, [onFiltersChange]);

  // Build URL search params for API queries
  const buildApiQuery = useCallback((): URLSearchParams => {
    const params = new URLSearchParams();

    // Add non-undefined filters to params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    return params;
  }, [filters]);

  // Get API URL with filters
  const getApiUrl = useCallback((baseUrl: string): string => {
    const params = buildApiQuery();
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [buildApiQuery]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      // Don't consider limit and offset as "active" filters
      if (key === 'limit' || key === 'offset') {
        return false;
      }
      return value !== undefined && value !== null && value !== '';
    });
  }, [filters]);

  // Get count of active filters
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      // Don't count limit and offset
      if (key === 'limit' || key === 'offset') {
        return false;
      }
      return value !== undefined && value !== null && value !== '';
    }).length;
  }, [filters]);

  // Validate date range
  const dateRangeValid = useMemo(() => {
    if (!filters.start_date || !filters.end_date) {
      return true; // No range to validate
    }

    const startDate = new Date(filters.start_date);
    const endDate = new Date(filters.end_date);

    return !isNaN(startDate.getTime()) && 
           !isNaN(endDate.getTime()) && 
           startDate <= endDate;
  }, [filters.start_date, filters.end_date]);

  // Quick filter presets
  const applyQuickFilter = useCallback((preset: string) => {
    const now = new Date();
    let newFilters: Partial<LogFilters> = {};

    switch (preset) {
      case 'errors_last_hour':
        newFilters = {
          level: 'ERROR',
          start_date: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
          end_date: now.toISOString()
        };
        break;

      case 'errors_today':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        newFilters = {
          level: 'ERROR',
          start_date: startOfDay.toISOString(),
          end_date: now.toISOString()
        };
        break;

      case 'warnings_today':
        const startOfDayWarn = new Date(now);
        startOfDayWarn.setHours(0, 0, 0, 0);
        newFilters = {
          level: 'WARN',
          start_date: startOfDayWarn.toISOString(),
          end_date: now.toISOString()
        };
        break;

      case 'auth_logs':
        newFilters = {
          source: 'Authentication'
        };
        break;

      case 'api_logs':
        newFilters = {
          source: 'API'
        };
        break;

      case 'last_24h':
        newFilters = {
          start_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          end_date: now.toISOString()
        };
        break;

      default:
        console.warn(`Unknown quick filter preset: ${preset}`);
        return;
    }

    applyFilters(newFilters);
  }, [applyFilters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    applyFilters,
    buildApiQuery,
    getApiUrl: getApiUrl,
    hasActiveFilters,
    activeFilterCount,
    dateRangeValid,
    applyQuickFilter
  };
};