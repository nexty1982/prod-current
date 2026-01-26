/**
 * Custom hooks for Records management
 * Leverages existing patterns from the codebase (SWR, TanStack Query)
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecordsApiService, RecordFilters, RecordSort, PaginatedResponse } from '@/api/RecordsApiService';

// Query keys for consistent caching
const QUERY_KEYS = {
  records: (churchId: string, recordType: string, filters?: RecordFilters, sort?: RecordSort, pagination?: any) => 
    ['records', churchId, recordType, filters, sort, pagination],
  record: (churchId: string, recordType: string, id: string) => 
    ['record', churchId, recordType, id],
  knownFields: (recordType: string) => ['knownFields', recordType],
  columnSample: (churchId: string, recordType: string) => ['columnSample', churchId, recordType],
  fieldMapping: (churchId: string, recordType: string) => ['fieldMapping', churchId, recordType],
  dropdownOptions: (churchId: string) => ['dropdownOptions', churchId],
} as const;

/**
 * Hook for managing records with pagination, filtering, and sorting
 */
export function useRecords<T = any>(
  churchId: string,
  recordType: string,
  options: {
    filters?: RecordFilters;
    sort?: RecordSort;
    pagination?: { page: number; limit: number };
    enabled?: boolean;
  } = {}
) {
  const apiService = useMemo(() => createRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.records(churchId, recordType, options.filters, options.sort, options.pagination),
    queryFn: () => apiService.getRecords<T>(recordType, options.filters, options.sort, options.pagination),
    enabled: options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    records: data?.data?.data || [],
    total: data?.data?.total || 0,
    page: data?.data?.page || 1,
    totalPages: data?.data?.totalPages || 0,
    isLoading,
    isFetching,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for managing a single record
 */
export function useRecord<T = any>(
  churchId: string,
  recordType: string,
  recordId: string,
  options: { enabled?: boolean } = {}
) {
  const apiService = useMemo(() => createRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.record(churchId, recordType, recordId),
    queryFn: () => apiService.getRecord<T>(recordType, recordId),
    enabled: options.enabled !== false && !!recordId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    record: data?.data,
    isLoading,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for record mutations (create, update, delete)
 */
export function useRecordMutations<T = any>(
  churchId: string,
  recordType: string
) {
  const queryClient = useQueryClient();
  const apiService = useMemo(() => createRecordsApiService(churchId), [churchId]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (recordData: Partial<T>) => apiService.createRecord<T>(recordType, recordData),
    onSuccess: () => {
      // Invalidate and refetch records
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.records(churchId, recordType) 
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => 
      apiService.updateRecord<T>(recordType, id, data),
    onSuccess: (_, { id }) => {
      // Invalidate records and specific record
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.records(churchId, recordType) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.record(churchId, recordType, id) 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteRecord(recordType, id),
    onSuccess: () => {
      // Invalidate records
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.records(churchId, recordType) 
      });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}

/**
 * Hook for search functionality
 */
export function useRecordSearch<T = any>(
  churchId: string,
  recordType: string,
  searchTerm: string,
  options: {
    filters?: RecordFilters;
    sort?: RecordSort;
    pagination?: { page: number; limit: number };
    enabled?: boolean;
  } = {}
) {
  const apiService = useMemo(() => createRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['search', churchId, recordType, searchTerm, options.filters, options.sort, options.pagination],
    queryFn: () => apiService.searchRecords<T>(
      recordType, 
      searchTerm, 
      options.filters, 
      options.sort, 
      options.pagination
    ),
    enabled: (options.enabled !== false) && !!searchTerm.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });

  return {
    results: data?.data?.data || [],
    total: data?.data?.total || 0,
    page: data?.data?.page || 1,
    totalPages: data?.data?.totalPages || 0,
    isLoading,
    isFetching,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for field mapping operations
 */
export function useFieldMapping(churchId: string, recordType: string) {
  const apiService = useMemo(() => createRecordsApiService(churchId), [churchId]);
  const queryClient = useQueryClient();

  // Get known fields
  const knownFieldsQuery = useQuery({
    queryKey: QUERY_KEYS.knownFields(recordType),
    queryFn: () => apiService.getKnownFields(recordType),
    enabled: !!recordType,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get column sample
  const columnSampleQuery = useQuery({
    queryKey: QUERY_KEYS.columnSample(churchId, recordType),
    queryFn: () => apiService.getColumnSample(recordType),
    enabled: !!recordType,
    staleTime: 5 * 60 * 1000,
  });

  // Get field mapping
  const fieldMappingQuery = useQuery({
    queryKey: QUERY_KEYS.fieldMapping(churchId, recordType),
    queryFn: () => apiService.getFieldMapping(recordType),
    enabled: !!recordType,
    staleTime: 5 * 60 * 1000,
  });

  // Save field mapping mutation
  const saveMappingMutation = useMutation({
    mutationFn: (mapping: any) => apiService.saveFieldMapping(recordType, mapping),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.fieldMapping(churchId, recordType) 
      });
    },
  });

  return {
    knownFields: knownFieldsQuery.data?.data || [],
    columnSample: columnSampleQuery.data?.data || [],
    fieldMapping: fieldMappingQuery.data?.data,
    isLoading: knownFieldsQuery.isLoading || columnSampleQuery.isLoading || fieldMappingQuery.isLoading,
    error: knownFieldsQuery.error || columnSampleQuery.error || fieldMappingQuery.error,
    saveMapping: saveMappingMutation,
  };
}

/**
 * Hook for import/export operations
 */
export function useRecordImportExport(churchId: string, recordType: string) {
  const apiService = useMemo(() => createRecordsApiService(churchId), [churchId]);
  const queryClient = useQueryClient();

  // Import mutation
  const importMutation = useMutation({
    mutationFn: ({ file, options }: { file: File; options?: any }) => 
      apiService.importRecords(recordType, file, options),
    onSuccess: () => {
      // Invalidate records after import
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.records(churchId, recordType) 
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: ({ format, filters }: { format: 'csv' | 'pdf' | 'excel'; filters?: RecordFilters }) => 
      apiService.exportRecords(recordType, format, filters),
  });

  return {
    import: importMutation,
    export: exportMutation,
  };
}

/**
 * Hook for dropdown options
 */
export function useDropdownOptions(churchId: string) {
  const apiService = useMemo(() => createRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.dropdownOptions(churchId),
    queryFn: () => apiService.getDropdownOptions(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    options: data?.data || {},
    isLoading,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for loading states management
 */
export function useLoadingState(initialState: boolean = false) {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);

  const setLoadingState = useCallback((isLoading: boolean, errorMessage?: string) => {
    setLoading(isLoading);
    setError(errorMessage || null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    setLoadingState,
    clearError,
  };
}

/**
 * Hook for pagination state management
 */
export function usePagination(initialPage: number = 1, initialLimit: number = 10) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1));
  }, []);

  return {
    page,
    limit,
    goToPage,
    changeLimit,
    nextPage,
    prevPage,
  };
}

/**
 * Hook for search state management
 */
export function useSearchState() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<RecordFilters>({});
  const [sort, setSort] = useState<RecordSort | null>(null);

  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const updateFilters = useCallback((newFilters: RecordFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const updateSort = useCallback((newSort: RecordSort) => {
    setSort(newSort);
  }, []);

  const clearSort = useCallback(() => {
    setSort(null);
  }, []);

  const reset = useCallback(() => {
    setSearchTerm('');
    setFilters({});
    setSort(null);
  }, []);

  return {
    searchTerm,
    filters,
    sort,
    updateSearchTerm,
    updateFilters,
    clearFilters,
    updateSort,
    clearSort,
    reset,
  };
}
