// useRecordsApi.ts - API hooks for Dynamic Records Explorer
import { useState, useCallback } from 'react';

interface RecordTable {
  TABLE_NAME: string;
}

interface ColumnInfo {
  COLUMN_NAME: string;
  ORDINAL_POSITION: number;
  DATA_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_KEY: string;
  DISPLAY_HEADER: string;
}

interface ColumnsResponse {
  columns: ColumnInfo[];
  allColumns: ColumnInfo[];
}

interface RecordsResponse {
  data: any[];
  meta: {
    database: string;
    table: string;
    total: number;
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}

export const useRecordsApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async <T,>(url: string): Promise<T> => {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include', // Important for session cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'API call failed');
    }

    return result.data!;
  }, []);

  const fetchTables = useCallback(async (churchId: string): Promise<RecordTable[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<RecordTable[]>(`/api/records/${churchId}/tables`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tables';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const fetchColumns = useCallback(async (churchId: string, tableName: string): Promise<ColumnsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<ColumnsResponse>(`/api/records/${churchId}/${tableName}/columns`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch columns';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const fetchRecords = useCallback(async (
    churchId: string, 
    tableName: string, 
    options: {
      limit?: number;
      offset?: number;
      order?: string;
      search?: string;
    } = {}
  ): Promise<RecordsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.order) params.append('order', options.order);
      if (options.search) params.append('search', options.search);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const data = await apiCall<RecordsResponse>(`/api/records/${churchId}/${tableName}${queryString}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch records';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const exportToCsv = useCallback((data: any[], columns: ColumnInfo[], tableName: string) => {
    if (!data.length) return;

    // Create CSV header
    const headers = columns.map(col => col.DISPLAY_HEADER || col.COLUMN_NAME);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        columns.map(col => {
          const value = row[col.COLUMN_NAME] || '';
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value);
          return stringValue.includes(',') || stringValue.includes('"') 
            ? `"${stringValue.replace(/"/g, '""')}"` 
            : stringValue;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${tableName}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return {
    loading,
    error,
    fetchTables,
    fetchColumns,
    fetchRecords,
    exportToCsv
  };
};