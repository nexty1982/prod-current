// RecordsExplorer.tsx - Dynamic Records Explorer Component
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Toolbar,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Storage as DatabaseIcon // Changed from Database to Storage
} from '@mui/icons-material';

import { useRecordsApi } from './useRecordsApi';

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

const RecordsExplorer: React.FC = () => {
  // State
  const [churchId, setChurchId] = useState<string>('46'); // Default to om_church_46
  const [tables, setTables] = useState<RecordTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageModel, setPageModel] = useState<GridPaginationModel>({ page: 0, pageSize: 50 });
  const [totalRows, setTotalRows] = useState<number>(0);
  const [sortModel, setSortModel] = useState<any[]>([]);

  // API hooks
  const { loading, error, fetchTables, fetchColumns, fetchRecords, exportToCsv } = useRecordsApi();

  // Load tables on church change
  const loadTables = useCallback(async () => {
    if (!churchId) return;
    
    try {
      const tablesData = await fetchTables(churchId);
      setTables(tablesData);
      setSelectedTable(''); // Reset selected table
      setRecords([]);
      setColumns([]);
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  }, [churchId, fetchTables]);

  // Load columns when table is selected
  const loadColumns = useCallback(async () => {
    if (!churchId || !selectedTable) return;

    try {
      const columnsData = await fetchColumns(churchId, selectedTable);
      setColumns(columnsData.columns);
    } catch (err) {
      console.error('Failed to load columns:', err);
    }
  }, [churchId, selectedTable, fetchColumns]);

  // Load records
  const loadRecords = useCallback(async () => {
    if (!churchId || !selectedTable) return;

    try {
      const order = sortModel.length > 0 
        ? `${sortModel[0].field}:${sortModel[0].sort}` 
        : 'id:desc';

      const recordsData = await fetchRecords(churchId, selectedTable, {
        limit: pageModel.pageSize,
        offset: pageModel.page * pageModel.pageSize,
        order,
        search: searchTerm
      });

      setRecords(recordsData.data);
      setTotalRows(recordsData.meta.total);
    } catch (err) {
      console.error('Failed to load records:', err);
    }
  }, [churchId, selectedTable, pageModel, sortModel, searchTerm, fetchRecords]);

  // Effects
  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Memoized grid columns
  const gridColumns: GridColDef[] = useMemo(() => {
    return columns.map((col, index) => ({
      field: col.COLUMN_NAME,
      headerName: col.DISPLAY_HEADER || `Field ${col.ORDINAL_POSITION}`,
      width: 150,
      sortable: true,
      type: col.DATA_TYPE.includes('int') || col.DATA_TYPE.includes('decimal') || col.DATA_TYPE.includes('float')
        ? 'number'
        : col.DATA_TYPE.includes('date') || col.DATA_TYPE.includes('time')
        ? 'date'
        : 'string',
      valueFormatter: (params) => {
        if (!params.value) return '';
        if (col.DATA_TYPE.includes('date') || col.DATA_TYPE.includes('time')) {
          try {
            return new Date(params.value).toLocaleDateString();
          } catch {
            return params.value;
          }
        }
        return params.value;
      }
    }));
  }, [columns]);

  // Event handlers
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPageModel({ page: 0, pageSize: 50 }); // Reset pagination
    setSearchTerm(''); // Reset search
  };

  const handleSearch = () => {
    setPageModel({ page: 0, pageSize: pageModel.pageSize }); // Reset to first page
    loadRecords();
  };

  const handleExport = () => {
    if (records.length === 0 || columns.length === 0) return;
    exportToCsv(records, columns, selectedTable);
  };

  const handleRefresh = () => {
    loadRecords();
  };

  // Format table name for display
  const formatTableName = (tableName: string) => {
    return tableName
      .replace(/_records$/, '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Records';
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Orthodox church image placeholder */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <DatabaseIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              Dynamic Records Explorer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse church records dynamically without predefined schemas
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Church ID Selection */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              label="Church ID"
              value={churchId}
              onChange={(e) => setChurchId(e.target.value)}
              onBlur={loadTables}
              onKeyPress={(e) => e.key === 'Enter' && loadTables()}
              fullWidth
              size="small"
              helperText="Enter church ID (e.g., 46 for om_church_46)"
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <Chip 
              icon={<DatabaseIcon />}
              label={`Database: om_church_${churchId}`}
              color="primary"
              variant="outlined"
            />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Left Sidebar - Tables List */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">
                Record Tables ({tables.length})
              </Typography>
            </Box>
            
            {loading && tables.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                {tables.map((table) => (
                  <ListItem key={table.TABLE_NAME} disablePadding>
                    <ListItemButton
                      selected={selectedTable === table.TABLE_NAME}
                      onClick={() => handleTableSelect(table.TABLE_NAME)}
                    >
                      <ListItemText
                        primary={formatTableName(table.TABLE_NAME)}
                        secondary={table.TABLE_NAME}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
            
            {tables.length === 0 && !loading && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No record tables found
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Content - Data Grid */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            {selectedTable && (
              <Toolbar sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {formatTableName(selectedTable)}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{ width: 200 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    Search
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                    disabled={loading || records.length === 0}
                  >
                    Export CSV
                  </Button>
                </Box>
              </Toolbar>
            )}

            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ m: 2 }}>
                {error}
              </Alert>
            )}

            {/* Data Grid */}
            {selectedTable ? (
              <Box sx={{ flexGrow: 1 }}>
                <DataGrid
                  rows={records.map((row, index) => ({ id: index, ...row }))}
                  columns={gridColumns}
                  loading={loading}
                  pagination
                  paginationMode="server"
                  paginationModel={pageModel}
                  onPaginationModelChange={setPageModel}
                  rowCount={totalRows}
                  sortingMode="server"
                  sortModel={sortModel}
                  onSortModelChange={setSortModel}
                  pageSizeOptions={[25, 50, 100]}
                  disableRowSelectionOnClick
                  sx={{
                    '& .MuiDataGrid-cell': {
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2
              }}>
                <DatabaseIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary">
                  Select a table to explore records
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose from the tables list on the left to view their data
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RecordsExplorer;