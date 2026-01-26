import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Card,
  CardContent,
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
import { ColDef, GridReadyEvent, GridApi, ColumnApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useParams } from 'react-router-dom';
import { fetchRecords, fetchAvailableTables, getColumnDisplayName, type RecordsResponse, type Column } from './api/fetchRecords';

interface Church {
  id: number;
  church_id: number;
  name: string;
  database_name: string;
}

interface RecordsGridProps {
  churches?: Church[];
  defaultChurchId?: number;
  defaultTable?: string;
  onFieldMapperOpen?: (churchId: number, table: string) => void;
}

const RecordsGrid: React.FC<RecordsGridProps> = ({
  churches = [],
  defaultChurchId,
  defaultTable = 'baptism_records',
  onFieldMapperOpen,
}) => {
  const { churchId } = useParams<{ churchId: string }>();
  
  // State management
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(
    churchId ? parseInt(churchId) : defaultChurchId || null
  );
  const [availableChurches, setAvailableChurches] = useState<Church[]>(churches);
  const [selectedTable, setSelectedTable] = useState<string>(defaultTable);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [recordsData, setRecordsData] = useState<RecordsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AG Grid state
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [columnApi, setColumnApi] = useState<ColumnApi | null>(null);

  // Fetch churches if not provided
  useEffect(() => {
    if (churches.length === 0) {
      const fetchChurches = async () => {
        try {
          // Try admin endpoint first (for super admins)
          let response = await fetch('/api/admin/churches?is_active=1', {
            credentials: 'include'
          });

          // If admin endpoint fails, try regular churches endpoint
          if (!response.ok && response.status === 403) {
            response = await fetch('/api/churches', {
              credentials: 'include'
            });
          }

          if (!response.ok) {
            throw new Error(`Failed to fetch churches: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          const churchList = data.churches || data || [];
          setAvailableChurches(churchList);

          // Set default church if provided
          if (defaultChurchId && !selectedChurchId) {
            setSelectedChurchId(defaultChurchId);
          }

        } catch (err) {
          console.error('Error fetching churches:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch churches');
        }
      };

      fetchChurches();
    } else {
      setAvailableChurches(churches);
    }
  }, [churches, defaultChurchId, selectedChurchId]);

  // Fetch available tables when church changes
  useEffect(() => {
    if (selectedChurchId) {
      const loadTables = async () => {
        try {
          setTablesLoading(true);
          const tables = await fetchAvailableTables(selectedChurchId);
          setAvailableTables(tables);

          // Set default table if it exists in the list
          if (tables.includes(selectedTable)) {
            // Table already selected and available
          } else if (tables.length > 0) {
            setSelectedTable(tables[0]);
          }
        } catch (err) {
          console.error('Error fetching tables:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch tables');
        } finally {
          setTablesLoading(false);
        }
      };

      loadTables();
    }
  }, [selectedChurchId]);

  // Fetch records data when church or table changes
  const loadRecordsData = useCallback(async () => {
    if (!selectedChurchId || !selectedTable) {
      setRecordsData(null);
      return;
    }

    console.log('🔄 Loading records data for:', { selectedChurchId, selectedTable });

    try {
      setLoading(true);
      setError(null);

      const data = await fetchRecords(selectedChurchId, selectedTable);
      
      console.log('📊 Fetched records data:', {
        columnCount: data.columns?.length || 0,
        mappingCount: Object.keys(data.mapping || {}).length,
        rowCount: data.rows?.length || 0,
        mappings: data.mapping,
        columns: data.columns?.map(col => col.column_name)
      });
      
      setRecordsData(data);

    } catch (err) {
      console.error('Error fetching records data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch records data');
      setRecordsData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedChurchId, selectedTable]);

  useEffect(() => {
    loadRecordsData();
  }, [loadRecordsData]);

  // Create AG Grid column definitions with field mapping
  const columnDefs = useMemo<ColDef[]>(() => {
    console.log('🏗️ Building columnDefs with:', {
      hasColumns: !!recordsData?.columns,
      hasMapping: !!recordsData?.mapping,
      columnCount: recordsData?.columns?.length || 0,
      mappingKeys: Object.keys(recordsData?.mapping || {})
    });

    if (!recordsData?.columns) {
      console.log('❌ No columns data, returning empty columnDefs');
      return [];
    }

    const mapping = recordsData.mapping || {};
    
    const colDefs = recordsData.columns.map((column: Column) => {
      const displayName = getColumnDisplayName(column.column_name, mapping);
      
      console.log(`📋 Column ${column.column_name}: "${displayName}" (mapped: ${!!mapping[column.column_name]})`);
      
      return {
        field: column.column_name,
        headerName: displayName,
        colId: String(column.ordinal_position),
        headerTooltip: `${column.column_name} (${column.data_type})`,
        sortable: true,
        filter: true,
        resizable: true,
        // Add type-specific formatting
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) {
            return '';
          }
          if (column.data_type.includes('date')) {
            return new Date(params.value).toLocaleDateString();
          }
          return String(params.value);
        }
      };
    });

    console.log('✅ Generated columnDefs:', colDefs.map(col => ({ field: col.field, headerName: col.headerName })));
    return colDefs;
  }, [recordsData?.columns, recordsData?.mapping]);

  // AG Grid ready event
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    setColumnApi(params.columnApi);
    params.api.sizeColumnsToFit();
  }, []);

  // Handle church selection
  const handleChurchChange = (churchId: number) => {
    setSelectedChurchId(churchId);
    setSelectedTable('');
    setRecordsData(null);
  };

  // Handle table selection
  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
  };

  // Handle field mapper button click
  const handleOpenFieldMapper = () => {
    if (selectedChurchId && selectedTable && onFieldMapperOpen) {
      onFieldMapperOpen(selectedChurchId, selectedTable);
    } else {
      // Default implementation - open in new window
      window.open(
        `/apps/church-management/${selectedChurchId}/field-mapper`,
        "_blank",
        "noopener,noreferrer,width=1200,height=800"
      );
    }
  };

  // Listen for field mapping updates from child windows
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Received message:', event.data);
      
      if (event.data?.type === 'FIELD_MAPPING_SAVED') {
        const messageTable = event.data.table;
        const messageChurchId = parseInt(event.data.churchId);
        
        console.log('🔄 Field mapping saved:', {
          messageTable,
          messageChurchId,
          selectedTable,
          selectedChurchId,
          tableMatch: messageTable === selectedTable,
          churchMatch: messageChurchId === selectedChurchId
        });
        
        if (messageTable === selectedTable && messageChurchId === selectedChurchId) {
          console.log('✅ Conditions match, refreshing records...');
          // Force a re-fetch by calling loadRecordsData directly
          if (selectedChurchId && selectedTable) {
            console.log('🔄 Triggering manual refresh...');
            fetchRecords(selectedChurchId, selectedTable).then(data => {
              console.log('📊 Manual refresh data:', {
                columnCount: data.columns?.length || 0,
                mappingCount: Object.keys(data.mapping || {}).length,
                mappings: data.mapping
              });
              setRecordsData(data);
            }).catch(err => {
              console.error('❌ Manual refresh error:', err);
              setError(err instanceof Error ? err.message : 'Failed to refresh records data');
            });
          }
        } else {
          console.log('❌ Conditions do not match, skipping refresh');
        }
      }
    };

    console.log('📡 Setting up message listener for:', { selectedTable, selectedChurchId });
    window.addEventListener('message', handleMessage);
    return () => {
      console.log('🔕 Removing message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [selectedTable, selectedChurchId]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Enhanced Records Grid
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Records browser with field mapping support. Column headers reflect custom mappings.
      </Typography>

      {/* Church Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl fullWidth>
            <InputLabel>Select Church</InputLabel>
            <Select
              value={selectedChurchId || ''}
              onChange={(e) => handleChurchChange(e.target.value as number)}
              label="Select Church"
            >
              {availableChurches.map((church) => (
                <MenuItem key={church.id || church.church_id} value={church.id || church.church_id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <ChurchIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography sx={{ flexGrow: 1 }}>
                      {church.name}
                    </Typography>
                    <Chip
                      label={church.database_name}
                      size="small"
                      variant="outlined"
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Table Selector and Actions */}
      {selectedChurchId && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Table</InputLabel>
                <Select
                  value={selectedTable}
                  onChange={(e) => handleTableChange(e.target.value)}
                  label="Select Table"
                  disabled={tablesLoading}
                >
                  {availableTables.map((tableName) => (
                    <MenuItem key={tableName} value={tableName}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <RecordsIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography sx={{ flexGrow: 1 }}>
                          {tableName}
                        </Typography>
                        <Chip
                          label={`${recordsData?.meta.rowCount || 0} records`}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={loadRecordsData}
                disabled={loading || !selectedTable}
              >
                Refresh
              </Button>

              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={handleOpenFieldMapper}
                disabled={!selectedTable}
                sx={{ borderRadius: '16px' }}
              >
                DB → Table Mapping
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Records Grid */}
      {selectedChurchId && selectedTable && (
        <Paper sx={{ height: 600 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading records...</Typography>
            </Box>
          ) : recordsData?.rows ? (
            <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
              <AgGridReact
                columnDefs={columnDefs}
                rowData={recordsData.rows}
                onGridReady={onGridReady}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
                suppressRowClickSelection={true}
                animateRows={true}
                rowSelection="multiple"
                pagination={true}
                paginationPageSize={50}
                enableRangeSelection={true}
                maintainColumnOrder={true}
              />
            </div>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Alert severity="info">
                No records found for table {selectedTable}.
              </Alert>
            </Box>
          )}
        </Paper>
      )}

      {!selectedChurchId && (
        <Alert severity="info">
          Please select a church to view its records.
        </Alert>
      )}
    </Box>
  );
};

export default RecordsGrid;
