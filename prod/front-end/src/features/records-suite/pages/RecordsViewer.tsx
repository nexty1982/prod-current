import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  IconEye,
  IconDownload,
  IconSearch,
  IconRefresh,
  IconTable
} from '@tabler/icons-react';

interface RecordColumn {
  name: string;
  type: string;
  label: string;
  hidden: boolean;
}

interface RecordData {
  [key: string]: any;
}

const RecordsViewer: React.FC = () => {
  const [churchId, setChurchId] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<RecordColumn[]>([]);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);

  // Mock data for demonstration
  const mockTables = ['baptism_records', 'marriage_records', 'funeral_records', 'communion_records'];
  const mockColumns: RecordColumn[] = [
    { name: 'id', type: 'int', label: 'ID', hidden: true },
    { name: 'first_name', type: 'varchar', label: 'First Name', hidden: false },
    { name: 'last_name', type: 'varchar', label: 'Last Name', hidden: false },
    { name: 'date_performed', type: 'date', label: 'Date Performed', hidden: false },
    { name: 'clergy', type: 'varchar', label: 'Priest/Clergy', hidden: false },
    { name: 'notes', type: 'text', label: 'Notes', hidden: false },
    { name: 'created_at', type: 'timestamp', label: 'Created', hidden: false }
  ];

  const mockRecords: RecordData[] = [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      date_performed: '2024-01-15',
      clergy: 'Fr. Michael',
      notes: 'Regular baptism ceremony',
      created_at: '2024-01-16T10:00:00Z'
    },
    {
      id: 2,
      first_name: 'Mary',
      last_name: 'Smith',
      date_performed: '2024-01-20',
      clergy: 'Fr. Michael',
      notes: 'Adult baptism',
      created_at: '2024-01-21T14:30:00Z'
    }
  ];

  const loadTables = async () => {
    if (!churchId.match(/^[0-9]{1,6}$/)) {
      return;
    }

    setLoading(true);
    try {
      // In real implementation: await fetch(`/api/records-suite/${churchId}/tables`)
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      setAvailableTables(mockTables);
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadColumns = async () => {
    if (!selectedTable.match(/^[A-Za-z0-9_]+_records$/)) {
      return;
    }

    setLoading(true);
    try {
      // In real implementation: await fetch(`/api/records-suite/${churchId}/${selectedTable}/columns`)
      await new Promise(resolve => setTimeout(resolve, 300));
      setColumns(mockColumns);
    } catch (error) {
      console.error('Failed to load columns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    if (!churchId || !selectedTable) return;

    setLoading(true);
    try {
      // In real implementation: 
      // await fetch(`/api/records-suite/${churchId}/${selectedTable}?limit=${rowsPerPage}&offset=${page * rowsPerPage}&search=${searchTerm}`)
      await new Promise(resolve => setTimeout(resolve, 500));
      setRecords(mockRecords);
      setTotalRecords(mockRecords.length);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const visibleColumns = columns.filter(col => !col.hidden);
    const csvHeaders = visibleColumns.map(col => col.label).join(',');
    const csvRows = records.map(record => 
      visibleColumns.map(col => record[col.name] || '').join(',')
    ).join('\n');
    const csvContent = `${csvHeaders}\n${csvRows}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_${churchId}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCellValue = (value: any, column: RecordColumn) => {
    if (value === null || value === undefined) return '-';
    
    switch (column.type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'timestamp':
        return new Date(value).toLocaleString();
      case 'text':
        return value.length > 50 ? `${value.substring(0, 50)}...` : value;
      default:
        return value.toString();
    }
  };

  useEffect(() => {
    if (churchId && churchId.match(/^[0-9]{1,6}$/)) {
      loadTables();
    }
  }, [churchId]);

  useEffect(() => {
    if (selectedTable) {
      loadColumns();
    }
  }, [selectedTable]);

  useEffect(() => {
    if (churchId && selectedTable) {
      loadRecords();
    }
  }, [churchId, selectedTable, page, rowsPerPage, searchTerm]);

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconEye size={32} style={{ marginRight: 16 }} />
          <Typography variant="h4" component="h1">
            Records Viewer
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Schema-agnostic browser for all *_records tables. Explore parish data with dynamic column discovery and export capabilities.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          The ID field is automatically hidden but used internally for record identification. 
          Search functionality queries the first text-like columns.
        </Alert>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Church ID"
            value={churchId}
            onChange={(e) => setChurchId(e.target.value)}
            placeholder="e.g., 12345"
            helperText="6-digit max church ID"
            sx={{ minWidth: '150px' }}
          />
          
          <FormControl sx={{ minWidth: '200px' }}>
            <InputLabel>Records Table</InputLabel>
            <Select
              value={selectedTable}
              label="Records Table"
              onChange={(e) => setSelectedTable(e.target.value)}
              disabled={!availableTables.length}
            >
              {availableTables.map((table) => (
                <MenuItem key={table} value={table}>
                  {table}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Search Records"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in text fields..."
            InputProps={{
              startAdornment: <IconSearch size={20} style={{ marginRight: 8 }} />
            }}
            sx={{ minWidth: '200px' }}
          />

          <Button 
            variant="outlined" 
            startIcon={<IconRefresh />}
            onClick={loadRecords}
            disabled={!selectedTable}
          >
            Refresh
          </Button>

          <Button 
            variant="contained" 
            startIcon={<IconDownload />}
            onClick={handleExportCSV}
            disabled={!records.length}
          >
            Export CSV
          </Button>
        </Box>

        {/* Table Info */}
        {selectedTable && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
            <IconTable size={20} />
            <Typography variant="body2">
              Table: <strong>{selectedTable}</strong>
            </Typography>
            <Chip label={`${columns.length} columns`} size="small" />
            <Chip label={`${totalRecords} records`} size="small" color="primary" />
          </Box>
        )}

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        )}

        {/* Records Table */}
        {!loading && records.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  {columns.filter(col => !col.hidden).map((column) => (
                    <TableCell key={column.name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {column.label}
                        </Typography>
                        <Chip 
                          label={column.type} 
                          size="small" 
                          variant="outlined" 
                          sx={{ fontSize: '0.6rem', height: '18px' }}
                        />
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record, index) => (
                  <TableRow key={record.id || index}>
                    {columns.filter(col => !col.hidden).map((column) => (
                      <TableCell key={column.name}>
                        {formatCellValue(record[column.name], column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <TablePagination
              component="div"
              count={totalRecords}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </TableContainer>
        )}

        {/* No Data */}
        {!loading && records.length === 0 && selectedTable && (
          <Alert severity="warning">
            No records found in {selectedTable} for church {churchId}.
          </Alert>
        )}

        {/* No Table Selected */}
        {!selectedTable && (
          <Alert severity="info">
            Select a church ID and records table to begin browsing data.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default RecordsViewer;