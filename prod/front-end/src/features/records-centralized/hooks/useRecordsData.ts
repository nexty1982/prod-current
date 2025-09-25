import { useState, useEffect, useCallback } from 'react';
import { useRecords } from '../context/RecordsProvider';

export function useRecordsData() {
  const { churchId, apiReady, api } = useRecords();
  
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and search state
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderBy, setOrderBy] = useState('id');
  const [orderDir, setOrderDir] = useState<'ASC' | 'DESC'>('DESC');

  // Load tables when API is ready
  useEffect(() => {
    if (!apiReady || !api) return;
    
    setLoading(true);
    setError(null);
    
    api.api.listTables(churchId)
      .then(result => {
        setTables(result);
        if (result.length > 0 && !selectedTable) {
          setSelectedTable(result[0]);
        }
      })
      .catch(err => {
        console.error('Failed to load tables:', err);
        setError('Failed to load tables: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [apiReady, api, churchId, selectedTable]);

  // Load columns when table changes
  useEffect(() => {
    if (!apiReady || !api || !selectedTable) return;
    
    setLoading(true);
    setError(null);
    
    api.api.listColumns(churchId, selectedTable)
      .then(result => {
        setColumns(result);
      })
      .catch(err => {
        console.error('Failed to load columns:', err);
        setError('Failed to load columns: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [apiReady, api, churchId, selectedTable]);

  // Load rows when table, pagination, or search changes
  useEffect(() => {
    if (!apiReady || !api || !selectedTable) return;
    
    setLoading(true);
    setError(null);
    
    api.api.listRows({
      churchId,
      table: selectedTable,
      limit,
      offset,
      q: searchQuery,
      orderBy,
      orderDir
    })
      .then(result => {
        setRows(result.rows);
        setTotal(result.total);
      })
      .catch(err => {
        console.error('Failed to load rows:', err);
        setError('Failed to load rows: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [apiReady, api, churchId, selectedTable, limit, offset, searchQuery, orderBy, orderDir]);

  // Actions for pagination and search
  const actions = {
    setSelectedTable: useCallback((table: string) => {
      setSelectedTable(table);
      setOffset(0); // Reset pagination when changing tables
    }, []),
    
    setOffset: useCallback((newOffset: number) => {
      setOffset(Math.max(0, newOffset));
    }, []),
    
    setLimit: useCallback((newLimit: number) => {
      setLimit(Math.max(1, newLimit));
      setOffset(0); // Reset to first page when changing limit
    }, []),
    
    setSearchQuery: useCallback((query: string) => {
      setSearchQuery(query);
      setOffset(0); // Reset to first page when searching
    }, []),
    
    setSorting: useCallback((column: string, direction: 'ASC' | 'DESC') => {
      setOrderBy(column);
      setOrderDir(direction);
      setOffset(0); // Reset to first page when sorting
    }, []),
    
    refresh: useCallback(() => {
      // Force refresh by clearing cache and re-fetching
      if (!apiReady || !api || !selectedTable) return;
      
      setLoading(true);
      setError(null);
      
      api.api.listRows({
        churchId,
        table: selectedTable,
        limit,
        offset,
        q: searchQuery,
        orderBy,
        orderDir
      })
        .then(result => {
          setRows(result.rows);
          setTotal(result.total);
        })
        .catch(err => {
          console.error('Failed to refresh rows:', err);
          setError('Failed to refresh rows: ' + err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }, [apiReady, api, churchId, selectedTable, limit, offset, searchQuery, orderBy, orderDir])
  };

  return {
    // Data
    tables,
    selectedTable,
    columns,
    rows,
    total,
    
    // State
    loading,
    error,
    
    // Pagination/Search params
    limit,
    offset,
    searchQuery,
    orderBy,
    orderDir,
    
    // Actions
    actions,
    
    // API info
    apiReady,
    apiName: api?.api.name || 'unknown'
  };
}