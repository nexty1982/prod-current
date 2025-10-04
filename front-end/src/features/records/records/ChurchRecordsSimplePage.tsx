import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Divider
} from '@mui/material';
import {
  Home as HomeIcon,
  Business as ChurchIcon,
  TableChart as RecordsIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ViewColumn as ViewColumnIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  getRecordsTables,
  getTableData,
  discoverTables,
  formatCellValue,
  getColumnDisplayName,
  getTableIcon,
  type RecordTableData,
  type ColumnMetadata,
  type DiscoverResponse
} from '@/features/records-centralized/components/records/dynamicRecordsApi';

interface Church {
  id: number;
  church_id: number;
  name: string;
  database_name: string;
}

const ChurchRecordsSimplePage: React.FC = () => {
  const { churchId } = useParams<{ churchId: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  // State management
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [availableChurches, setAvailableChurches] = useState<Church[]>([]);
  const [recordsTables, setRecordsTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<RecordTableData | null>(null);
  const [discoverData, setDiscoverData] = useState<DiscoverResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'discover' | 'table'>('discover');

  // Table pagination and sorting
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [orderByPos, setOrderByPos] = useState<number>(1);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch available churches
  useEffect(() => {
    const fetchChurches = async () => {
      try {
        // Try admin endpoint first (for super admins)
        let response = await fetch('/api/admin/churches?is_active=1', {
          credentials: 'include'
        });

        // If admin endpoint fails, try regular churches endpoint
        if (!response.ok && response.status === 403) {
          console.log('Admin endpoint not accessible, trying regular churches endpoint');
          response = await fetch('/api/churches', {
            credentials: 'include'
          });
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch churches: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Churches API response:', data);

        // Extract churches from response - handle different formats
        let churches: Church[] = [];
        if (data.churches && Array.isArray(data.churches)) {
          churches = data.churches;
        } else if (Array.isArray(data)) {
          churches = data;
        } else {
          console.warn('Expected churches array, got:', typeof data, data);
          throw new Error('Invalid churches data format received');
        }

        setAvailableChurches(churches);

        // Auto-select church if churchId provided
        if (churchId && churches.length > 0) {
          const church = churches.find((c: Church) =>
            c.id === parseInt(churchId) || c.church_id === parseInt(churchId)
          );
          if (church) {
            setSelectedChurch(church);
          }
        }

      } catch (err) {
        console.error('Error fetching churches:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch churches');
        setAvailableChurches([]); // Ensure it's always an array
      }
    };

    fetchChurches();
  }, [churchId]);

  // Fetch records tables when church is selected
  useEffect(() => {
    if (!selectedChurch?.database_name) return;

    const fetchRecordsTables = async () => {
      setLoading(true);
      setError(null);

      try {
        const tables = await getRecordsTables(selectedChurch.database_name);
        setRecordsTables(tables);

        // Auto-select first table if available
        if (tables.length > 0 && !selectedTable) {
          setSelectedTable(tables[0]);
        }

        // Fetch discover data
        const discover = await discoverTables(selectedChurch.database_name, 10);
        setDiscoverData(discover);

      } catch (err) {
        console.error('Error fetching records tables:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch records tables');
      } finally {
        setLoading(false);
      }
    };

    fetchRecordsTables();
  }, [selectedChurch]);

  // Fetch table data when table is selected
  useEffect(() => {
    if (!selectedChurch?.database_name || !selectedTable || viewMode !== 'table') return;

    const fetchTableData = async () => {
      setTableLoading(true);
      setError(null);

      try {
        const data = await getTableData(selectedChurch.database_name, selectedTable, {
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          orderByPos,
          orderDir: orderDirection
        });
        setTableData(data);
      } catch (err) {
        console.error('Error fetching table data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch table data');
      } finally {
        setTableLoading(false);
      }
    };

    fetchTableData();
  }, [selectedChurch, selectedTable, viewMode, page, rowsPerPage, orderByPos, orderDirection]);

  // Handle church selection
  const handleChurchChange = (churchId: number) => {
    const church = availableChurches.find(c => c.id === churchId);
    if (church) {
      setSelectedChurch(church);
      setSelectedTable('');
      setTableData(null);
      setDiscoverData(null);
      setPage(0);
      navigate(`/apps/records-simple/${church.id}`);
    }
  };

  // Handle table selection
  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setViewMode('table');
    setPage(0);
  };

  // Handle sorting
  const handleSort = (columnPos: number) => {
    const isAsc = orderByPos === columnPos && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderByPos(columnPos);
    setPage(0);
  };

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Render breadcrumbs
  const renderBreadcrumbs = () => (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      <Link
        color="inherit"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
        sx={{ display: 'flex', alignItems: 'center' }}
      >
        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        Home
      </Link>
      <Link
        color="inherit"
        href="/apps/records-simple"
        onClick={(e) => {
          e.preventDefault();
          navigate('/apps/records-simple');
        }}
        sx={{ display: 'flex', alignItems: 'center' }}
      >
        <RecordsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        Records
      </Link>
      {selectedChurch && (
        <Typography
          color="text.primary"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <ChurchIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {selectedChurch.name}
        </Typography>
      )}
      {selectedTable && viewMode === 'table' && (
        <Typography color="text.primary">
          {getTableIcon(selectedTable)} {getColumnDisplayName(selectedTable)}
        </Typography>
      )}
    </Breadcrumbs>
  );

  // Render church selector
  const renderChurchSelector = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Select Church Database
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Church</InputLabel>
          <Select
            value={selectedChurch?.id || ''}
            label="Church"
            onChange={(e) => handleChurchChange(Number(e.target.value))}
          >
            {(availableChurches || []).map((church) => (
              <MenuItem key={church.id} value={church.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ChurchIcon fontSize="small" />
                  {church.name}
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
  );

  // Render discover view
  const renderDiscoverView = () => {
    if (!discoverData) return null;

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Records Overview - {discoverData.churchDb}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ViewColumnIcon />}
            onClick={() => setViewMode('table')}
            disabled={!selectedTable}
          >
            Detailed View
          </Button>
        </Box>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)'
          },
          gap: 3
        }}>
          {discoverData.tables.map((table) => (
            <Card
              key={table.table}
              sx={{
                height: '100%',
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 }
              }}
              onClick={() => handleTableChange(table.table)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ mr: 1 }}>
                    {getTableIcon(table.table)}
                  </Typography>
                  <Typography variant="h6">
                    {getColumnDisplayName(table.table)}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {table.columns.length} columns • {table.rows.length} recent records
                </Typography>

                {table.rows.length > 0 && (
                  <TableContainer sx={{ maxHeight: 200 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {table.columns.slice(0, 3).map((col) => (
                            <TableCell key={col.pos} sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                              {getColumnDisplayName(col.name)}
                            </TableCell>
                          ))}
                          {table.columns.length > 3 && (
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                              ...
                            </TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {table.rows.slice(0, 3).map((row, idx) => (
                          <TableRow key={idx}>
                            {row.slice(0, 3).map((cell, cellIdx) => (
                              <TableCell key={cellIdx} sx={{ fontSize: '0.75rem' }}>
                                {formatCellValue(cell, table.columns[cellIdx]?.type || 'text')}
                              </TableCell>
                            ))}
                            {row.length > 3 && (
                              <TableCell sx={{ fontSize: '0.75rem' }}>...</TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  };

  // Render table view
  const renderTableView = () => {
    if (!tableData) return null;

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {getTableIcon(selectedTable)} {getColumnDisplayName(selectedTable)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setViewMode('discover')}
            >
              Back to Overview
            </Button>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Table</InputLabel>
              <Select
                value={selectedTable}
                label="Table"
                onChange={(e) => handleTableChange(e.target.value)}
              >
                {recordsTables.map((table) => (
                  <MenuItem key={table} value={table}>
                    {getTableIcon(table)} {getColumnDisplayName(table)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {tableData.columns.map((column) => (
                    <TableCell key={column.pos}>
                      <TableSortLabel
                        active={orderByPos === column.pos}
                        direction={orderByPos === column.pos ? orderDirection : 'asc'}
                        onClick={() => handleSort(column.pos)}
                      >
                        {getColumnDisplayName(column.name)}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {column.type}
                        </Typography>
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableLoading ? (
                  <TableRow>
                    <TableCell colSpan={tableData.columns.length} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.rows.map((row, idx) => (
                    <TableRow key={idx} hover>
                      {row.map((cell, cellIdx) => (
                        <TableCell key={cellIdx}>
                          {formatCellValue(cell, tableData.columns[cellIdx]?.type || 'text')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 200]}
            component="div"
            count={tableData.totalRows}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Box>
    );
  };

  // Main render
  return (
    <Box sx={{ p: 3 }}>
      {renderBreadcrumbs()}

      <Typography variant="h4" gutterBottom>
        Church Records - Simple View
      </Typography>

      <Typography variant="body1" color="text.secondary" gutterBottom>
        Dynamic records browser for Orthodox church databases. View all record types in ordinal format.
      </Typography>

      {renderChurchSelector()}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : selectedChurch ? (
        viewMode === 'discover' ? renderDiscoverView() : renderTableView()
      ) : (
        <Alert severity="info">
          Please select a church to view its records.
        </Alert>
      )}
    </Box>
  );
};

export default ChurchRecordsSimplePage;