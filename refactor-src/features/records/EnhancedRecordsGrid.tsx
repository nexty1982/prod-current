import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import {
  Business as ChurchIcon,
  TableChart as RecordsIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { fetchTables, fetchRecords } from './api.ts';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface Church {
  id: number;
  name: string;
  is_active: number;
}

interface EnhancedRecordsGridProps {
  defaultChurchId?: number;
}

const EnhancedRecordsGrid: React.FC<EnhancedRecordsGridProps> = ({ defaultChurchId }) => {
  const { churchId: routeChurchId } = useParams<{ churchId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number>(0);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tables, setTables] = useState<string[]>([]);
  const [recordsData, setRecordsData] = useState<any[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<any>(null);

  // Initialize church ID from route or default
  useEffect(() => {
    const churchId = routeChurchId ? parseInt(routeChurchId) : defaultChurchId;
    if (churchId) {
      setSelectedChurchId(churchId);
    }
  }, [routeChurchId, defaultChurchId]);

  // Initialize table from search params
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      setSelectedTable(tableParam);
    }
  }, [searchParams]);

  // Load churches
  useEffect(() => {
    const loadChurches = async () => {
      try {
        const response = await fetch('/api/admin/churches', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to load churches');
        }
        
        const data = await response.json();
        const churchList = data.success ? data.churches : [];
        setChurches(churchList.filter((church: Church) => church.is_active === 1));
      } catch (err) {
        console.error('Error loading churches:', err);
        setError('Failed to load churches');
      }
    };

    loadChurches();
  }, []);

  // Load tables when church changes
  useEffect(() => {
    if (!selectedChurchId) return;

    const loadTables = async () => {
      try {
        const tableList = await fetchTables(selectedChurchId);
        setTables(tableList);
        
        // Set default table if none selected
        if (!selectedTable && tableList.length > 0) {
          setSelectedTable(tableList[0]);
        }
      } catch (err) {
        console.error('Error loading tables:', err);
        setError('Failed to load tables');
      }
    };

    loadTables();
  }, [selectedChurchId, selectedTable]);

  // Load records when church or table changes
  useEffect(() => {
    if (!selectedChurchId || !selectedTable) return;

    const loadRecords = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchRecords(selectedChurchId, selectedTable, {
          page: 1,
          pageSize: 1000 // Load more records for AG Grid
        });

        console.log('AG Grid - Fetched data:', data);
        console.log('AG Grid - Columns:', data.columns);
        console.log('AG Grid - Rows:', data.rows);
        console.log('AG Grid - Mapping:', data.mapping);

        // Build AG Grid column definitions with field mappings
        const colDefs: ColDef[] = data.columns.map(col => ({
          field: col.column_name,
          headerName: data.mapping[col.column_name] || col.column_name,
          sortable: true,
          filter: true,
          resizable: true,
          width: 150,
          minWidth: 100,
        }));

        console.log('AG Grid - Column Definitions:', colDefs);
        
        setColumnDefs(colDefs);
        setRecordsData(data.rows);
      } catch (err) {
        console.error('Error loading records:', err);
        setError(`Failed to load records: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [selectedChurchId, selectedTable]);

  // Refresh grid when data changes
  useEffect(() => {
    if (gridApi && recordsData.length > 0) {
      gridApi.refreshCells();
      gridApi.sizeColumnsToFit();
    }
  }, [gridApi, recordsData]);

  // Update URL when parameters change
  useEffect(() => {
    if (selectedTable) {
      const params = new URLSearchParams();
      params.set('table', selectedTable);
      setSearchParams(params, { replace: true });
    }
  }, [selectedTable, setSearchParams]);

  // Handle field mapper integration
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'FIELD_MAPPING_SAVED' && e.data.table === selectedTable) {
        // Reload records when field mapping is updated
        window.location.reload();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedTable]);

  // Handlers
  const handleChurchChange = (churchId: number) => {
    setSelectedChurchId(churchId);
    setSelectedTable(''); // Reset table selection
  };

  const handleTableChange = (table: string) => {
    setSelectedTable(table);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleOpenFieldMapper = () => {
    if (selectedChurchId && selectedTable) {
      const url = `/apps/church-management/${selectedChurchId}/field-mapper`;
      window.open(url, '_blank', 'noopener,noreferrer,width=1200,height=800');
    }
  };

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
    
    // Force grid to refresh after data loads
    setTimeout(() => {
      params.api.refreshCells();
      params.api.sizeColumnsToFit();
    }, 100);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <RecordsIcon color="primary" />
        Enhanced Records Grid
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        AG Grid view with dynamic field mappings
      </Typography>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          {/* Church Selection */}
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel>Church</InputLabel>
            <Select
              value={selectedChurchId}
              onChange={(e) => handleChurchChange(Number(e.target.value))}
              label="Church"
              disabled={loading}
            >
              {churches.map((church) => (
                <MenuItem key={church.id} value={church.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ChurchIcon fontSize="small" />
                    {church.name} (ID: {church.id})
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Table Selection */}
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Table</InputLabel>
            <Select
              value={selectedTable}
              onChange={(e) => handleTableChange(e.target.value)}
              label="Table"
              disabled={loading || !selectedChurchId}
            >
              {tables.map((table) => (
                <MenuItem key={table} value={table}>
                  {table}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Actions */}
          <Stack direction="row" spacing={1}>
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
              startIcon={<SettingsIcon />}
              onClick={handleOpenFieldMapper}
              disabled={!selectedChurchId || !selectedTable}
            >
              Field Mapper
            </Button>
          </Stack>

          {/* Record Count */}
          <Chip 
            label={`${recordsData.length} records`}
            variant="outlined"
          />
          
          {/* Debug Info */}
          <Chip 
            label={`Church: ${selectedChurchId}, Table: ${selectedTable}`}
            variant="outlined"
            size="small"
            color="info"
          />
        </Stack>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
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

      {/* AG Grid */}
      {!loading && columnDefs.length > 0 && recordsData.length > 0 && (
        <Paper sx={{ height: 600, width: '100%', overflow: 'hidden' }}>
          <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
            <AgGridReact
              rowData={recordsData}
              columnDefs={columnDefs}
              onGridReady={onGridReady}
              pagination={true}
              paginationPageSize={50}
              domLayout="normal"
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                minWidth: 100,
                flex: 1
              }}
              animateRows={true}
              enableCellTextSelection={true}
              suppressMenuHide={true}
              suppressNoRowsOverlay={false}
              rowSelection="multiple"
              enableRangeSelection={true}
            />
          </div>
        </Paper>
      )}

      {/* Debug Info */}
      {!loading && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.100' }}>
          <Typography variant="caption" component="div">
            Debug Info: 
            Church ID: {selectedChurchId}, 
            Table: {selectedTable}, 
            Columns: {columnDefs.length}, 
            Records: {recordsData.length}
          </Typography>
          {recordsData.length > 0 && (
            <Typography variant="caption" component="div">
              Sample Record: {JSON.stringify(recordsData[0])}
            </Typography>
          )}
        </Paper>
      )}

      {/* Empty State */}
      {!loading && (!selectedChurchId || !selectedTable || recordsData.length === 0) && !error && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No records found
          </Typography>
          <Typography color="text.secondary">
            {!selectedChurchId 
              ? 'Please select a church to view records'
              : !selectedTable 
              ? 'Please select a table to view records'
              : 'The selected table contains no records'
            }
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default EnhancedRecordsGrid;
