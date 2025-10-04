import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Pagination,
  Stack,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { fetchTables, fetchRecords } from './api.ts';

interface Column {
  column_name: string;
  ordinal_position: number;
  data_type?: string;
}

interface RecordsPageProps {
  churchId: number;
  initialTable?: string;
}

interface HeaderColumn {
  key: string;
  idx: number;
  label: string;
}

const RecordsPage: React.FC<RecordsPageProps> = ({ churchId, initialTable }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [tables, setTables] = useState<string[]>([]);
  const [currentTable, setCurrentTable] = useState<string>('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Array<Record<string, any>> | Array<any[]>>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredRows, setFilteredRows] = useState<Array<Record<string, any>> | Array<any[]>>([]);

  // Initialize from URL params
  useEffect(() => {
    const tableParam = searchParams.get('table') || initialTable;
    const pageParam = parseInt(searchParams.get('page') || '1');
    
    if (tableParam) setCurrentTable(tableParam);
    if (pageParam > 0) setPage(pageParam);
  }, [searchParams, initialTable]);

  // Load available tables
  const loadTables = useCallback(async () => {
    try {
      setError(null);
      const tableList = await fetchTables(churchId);
      setTables(tableList);
      
      // Set default table if none selected
      if (!currentTable && tableList.length > 0) {
        const defaultTable = initialTable || tableList[0];
        setCurrentTable(defaultTable);
      }
    } catch (err) {
      setError(`Failed to load tables: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [churchId, currentTable, initialTable]);

  // Load records data
  const loadRecords = useCallback(async () => {
    if (!currentTable) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchRecords(churchId, currentTable, {
        page,
        pageSize
      });
      
      setColumns(data.columns);
      setMapping(data.mapping);
      setRows(data.rows);
      setTotal(data.total);
    } catch (err) {
      setError(`Failed to load records: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [churchId, currentTable, page, pageSize]);

  // Apply client-side search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRows(rows);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = rows.filter((row) => {
      // Convert row to searchable string
      const searchableText = Array.isArray(row) 
        ? row.join(' ').toLowerCase()
        : Object.values(row).join(' ').toLowerCase();
      
      return searchableText.includes(query);
    });
    
    setFilteredRows(filtered);
  }, [rows, searchQuery]);

  // Build header columns with labels from mapping
  const headers: HeaderColumn[] = columns.map(col => ({
    key: col.column_name,
    idx: col.ordinal_position,
    label: mapping[col.column_name] || col.column_name
  }));

  // Update URL when table or page changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentTable) params.set('table', currentTable);
    if (page > 1) params.set('page', page.toString());
    
    setSearchParams(params, { replace: true });
  }, [currentTable, page, setSearchParams]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Handle field mapper integration
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'FIELD_MAPPING_SAVED' && e.data.table === currentTable) {
        console.log('🔄 Field mapping updated, reloading records...');
        loadRecords();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentTable, loadRecords]);

  // Handlers
  const handleTableChange = (newTable: string) => {
    setCurrentTable(newTable);
    setPage(1); // Reset to first page when changing tables
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const handleRefresh = () => {
    loadRecords();
  };

  const openFieldMapper = () => {
    const url = `/apps/church-management/${churchId}/field-mapper`;
    window.open(url, '_blank', 'noopener,noreferrer,width=1200,height=800');
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Calculate pagination
  const totalPages = Math.ceil(total / pageSize);
  const displayRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h4" gutterBottom>
            Church Records
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Church ID: {churchId} • {total} total records
          </Typography>
        </div>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={openFieldMapper}
            color="primary"
          >
            Open Field Mapper
          </Button>
        </Stack>
      </div>

      {/* Controls */}
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          {/* Table Selection */}
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Table</InputLabel>
            <Select
              value={currentTable}
              onChange={(e) => handleTableChange(e.target.value)}
              label="Table"
              disabled={loading}
            >
              {tables.map((table) => (
                <MenuItem key={table} value={table}>
                  {table}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Search */}
          <TextField
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: searchQuery && (
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon />
                </IconButton>
              )
            }}
            sx={{ flex: 1 }}
          />

          {/* Record Count */}
          <Chip 
            label={`${filteredRows.length} ${searchQuery ? 'filtered' : 'total'} records`}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading records...</Typography>
        </Box>
      )}

      {/* Records Table */}
      {!loading && headers.length > 0 && (
        <div className="overflow-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-white border-b">
              <tr>
                {headers.map((header) => (
                  <th
                    key={header.key}
                    className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50"
                  >
                    <Tooltip title={`Column: ${header.key}`} arrow>
                      <span>{header.label}</span>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-gray-50">
              {displayRows.map((row, index) => (
                <tr key={index} className="border-t hover:bg-gray-100 transition-colors">
                  {headers.map((header) => (
                    <td key={header.key} className="px-3 py-2">
                      <span className="text-gray-900">
                        {Array.isArray(row) ? (
                          row[header.idx - 1] ?? ''
                        ) : (
                          row[header.key] ?? ''
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && displayRows.length === 0 && !error && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No records found
          </Typography>
          <Typography color="text.secondary">
            {searchQuery 
              ? `No records match your search "${searchQuery}"`
              : `The table "${currentTable}" contains no records`
            }
          </Typography>
        </Paper>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </div>
  );
};

export default RecordsPage;
