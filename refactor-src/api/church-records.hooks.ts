/**
 * Church Records Hooks for OrthodMetrics
 * React hooks for managing church records data and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { churchRecordsAPI } from './church-records.api';

// Types
export interface ChurchRecord {
  id: number;
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral' | 'confirmation' | 'other';
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  dateOfEvent: string;
  placeOfEvent?: string;
  parents?: {
    father?: string;
    mother?: string;
  };
  spouse?: string;
  witnesses?: string[];
  priest?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChurchRecordFilters {
  churchId?: number;
  recordType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ChurchRecordResponse {
  records: ChurchRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UseChurchRecordsOptions {
  churchId?: number;
  autoFetch?: boolean;
  filters?: ChurchRecordFilters;
}

// Custom hooks
export function useChurchRecords(options: UseChurchRecordsOptions = {}) {
  const { churchId, autoFetch = true, filters = {} } = options;
  
  const [records, setRecords] = useState<ChurchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  const fetchRecords = useCallback(async (customFilters?: ChurchRecordFilters) => {
    if (!churchId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await churchRecordsAPI.getRecords({
        churchId,
        ...filters,
        ...customFilters
      });
      
      setRecords(response.records);
      setPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  }, [churchId, filters]);

  const createRecord = useCallback(async (record: Omit<ChurchRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newRecord = await churchRecordsAPI.createRecord(record);
      setRecords(prev => [newRecord, ...prev]);
      return newRecord;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
      throw err;
    }
  }, []);

  const updateRecord = useCallback(async (id: number, record: Partial<ChurchRecord>) => {
    try {
      const updatedRecord = await churchRecordsAPI.updateRecord(id, record);
      setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
      return updatedRecord;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
      throw err;
    }
  }, []);

  const deleteRecord = useCallback(async (id: number) => {
    try {
      await churchRecordsAPI.deleteRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
      throw err;
    }
  }, []);

  const refreshRecords = useCallback(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (autoFetch && churchId) {
      fetchRecords();
    }
  }, [autoFetch, churchId, fetchRecords]);

  return {
    records,
    loading,
    error,
    pagination,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    refreshRecords
  };
}

export function useChurchRecord(id: number) {
  const [record, setRecord] = useState<ChurchRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const recordData = await churchRecordsAPI.getRecord(id);
      setRecord(recordData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch record');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateRecord = useCallback(async (updates: Partial<ChurchRecord>) => {
    try {
      const updatedRecord = await churchRecordsAPI.updateRecord(id, updates);
      setRecord(updatedRecord);
      return updatedRecord;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
      throw err;
    }
  }, [id]);

  const deleteRecord = useCallback(async () => {
    try {
      await churchRecordsAPI.deleteRecord(id);
      setRecord(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
      throw err;
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchRecord();
    }
  }, [id, fetchRecord]);

  return {
    record,
    loading,
    error,
    fetchRecord,
    updateRecord,
    deleteRecord
  };
}

export function useChurchRecordStats(churchId: number) {
  const [stats, setStats] = useState<{
    totalRecords: number;
    recordsByType: Record<string, number>;
    recordsThisMonth: number;
    recordsThisYear: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const statsData = await churchRecordsAPI.getStats(churchId);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => {
    if (churchId) {
      fetchStats();
    }
  }, [churchId, fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats
  };
}

export function useChurchRecordSearch() {
  const [searchResults, setSearchResults] = useState<ChurchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRecords = useCallback(async (query: string, filters: ChurchRecordFilters = {}) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await churchRecordsAPI.searchRecords({
        ...filters,
        search: query
      });
      setSearchResults(response.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    searchResults,
    loading,
    error,
    searchRecords,
    clearSearch
  };
}

export function useChurchRecordExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportRecords = useCallback(async (
    churchId: number,
    format: 'csv' | 'excel' | 'pdf' = 'csv',
    filters: ChurchRecordFilters = {}
  ) => {
    setExporting(true);
    setError(null);
    
    try {
      const blob = await churchRecordsAPI.exportRecords(churchId, format, filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `church-records-${churchId}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    exporting,
    error,
    exportRecords
  };
}

export function useChurchRecordImport() {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const importRecords = useCallback(async (
    churchId: number,
    file: File,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
    } = {}
  ) => {
    setImporting(true);
    setError(null);
    setProgress(0);
    
    try {
      const result = await churchRecordsAPI.importRecords(churchId, file, {
        ...options,
        onProgress: setProgress
      });
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      throw err;
    } finally {
      setImporting(false);
      setProgress(0);
    }
  }, []);

  return {
    importing,
    error,
    progress,
    importRecords
  };
}
