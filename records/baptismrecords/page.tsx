import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Chip,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Fab,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon,
  TableChart as GridIcon
} from '@mui/icons-material';
import { BaptismRecord, ChurchRecord } from '../../types/church-records-advanced.types';
import { recordService } from '../../services/recordService';
import { useAuth } from '../../context/AuthContext';
import { BaptismAdvancedGrid } from './BaptismAdvancedGrid';

/**
 * Simplified BaptismRecord interface for the table
 */
interface BaptismTableRecord {
  id: number;
  first_name: string;
  last_name: string;
  date_of_baptism: string;
  place_of_baptism: string;
  priest_name: string;
  godparents: string;
  date_of_birth: string;
  place_of_birth: string;
  father_name: string;
  mother_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Table column configuration
 */
interface ColumnConfig {
  id: keyof BaptismTableRecord;
  label: string;
  minWidth?: number;
  sortable?: boolean;
  format?: (value: any) => string;
}

const columns: ColumnConfig[] = [
  { id: 'first_name', label: 'First Name', minWidth: 120, sortable: true },
  { id: 'last_name', label: 'Last Name', minWidth: 120, sortable: true },
  { id: 'date_of_baptism', label: 'Baptism Date', minWidth: 130, sortable: true, format: (value: string) => new Date(value).toLocaleDateString() },
  { id: 'place_of_baptism', label: 'Baptism Place', minWidth: 150, sortable: true },
  { id: 'priest_name', label: 'Priest', minWidth: 120, sortable: true },
  { id: 'godparents', label: 'Godparents', minWidth: 150, sortable: true },
  { id: 'date_of_birth', label: 'Birth Date', minWidth: 130, sortable: true, format: (value: string) => value ? new Date(value).toLocaleDateString() : 'N/A' },
  { id: 'father_name', label: 'Father', minWidth: 120, sortable: true },
  { id: 'mother_name', label: 'Mother', minWidth: 120, sortable: true },
];

/**
 * Form state interface for add/edit modal
 */
interface RecordFormState {
  first_name: string;
  last_name: string;
  date_of_baptism: string;
  place_of_baptism: string;
  priest_name: string;
  godparents: string;
  date_of_birth: string;
  place_of_birth: string;
  father_name: string;
  mother_name: string;
}

const initialFormState: RecordFormState = {
  first_name: '',
  last_name: '',
  date_of_baptism: '',
  place_of_baptism: '',
  priest_name: '',
  godparents: '',
  date_of_birth: '',
  place_of_birth: '',
  father_name: '',
  mother_name: ''
};

/**
 * Unified Baptism Records Page Component
 * Combines table, search, filters, and CRUD operations in a single TSX file
 */
const BaptismRecordsPage: React.FC = () => {
  // State management
  const [records, setRecords] = useState<BaptismTableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState<keyof BaptismTableRecord>('date_of_baptism');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRecord, setSelectedRecord] = useState<BaptismTableRecord | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BaptismTableRecord | null>(null);
  const [formState, setFormState] = useState<RecordFormState>(initialFormState);
  
  // Toast state
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Advanced Grid state
  const [advancedGridOpen, setAdvancedGridOpen] = useState(false);

  const { hasRole } = useAuth();
  const canEdit = hasRole(['admin', 'super_admin', 'priest', 'deacon']);

  // Data loading
  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call
      // const response = await recordService.baptism.getRecords();
      // setRecords(response.data);
      
      // Mock data for development
      const mockRecords: BaptismTableRecord[] = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Smith',
          date_of_baptism: '2024-01-15',
          place_of_baptism: 'Orthodox Cathedral',
          priest_name: 'Fr. Michael Johnson',
          godparents: 'Maria and Peter Alexandrov',
          date_of_birth: '2023-12-01',
          place_of_birth: 'Metropolitan Hospital',
          father_name: 'Robert Smith',
          mother_name: 'Elena Smith',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          first_name: 'Maria',
          last_name: 'Petrov',
          date_of_baptism: '2024-02-20',
          place_of_baptism: 'St. Nicholas Church',
          priest_name: 'Fr. Andrew Volkov',
          godparents: 'Sophia and Constantine Dimitrov',
          date_of_birth: '2024-01-10',
          place_of_birth: 'City Medical Center',
          father_name: 'Alexei Petrov',
          mother_name: 'Natasha Petrov',
          created_at: '2024-02-20T14:30:00Z',
          updated_at: '2024-02-20T14:30:00Z'
        }
      ];
      setRecords(mockRecords);
      
      showToast('Records loaded successfully', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load records';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Utility functions
  const showToast = (message: string, severity: 'success' | 'error' | 'info') => {
    setToast({ open: true, message, severity });
  };

  const handleSort = (property: keyof BaptismTableRecord) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Filtered and sorted data
  const filteredRecords = useMemo(() => {
    return records.filter(record =>
      Object.values(record).some(value =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [records, searchTerm]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, order, orderBy]);

  const paginatedRecords = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRecords, page, rowsPerPage]);

  // Event handlers
  const handleOpenModal = (record?: BaptismTableRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormState({
        first_name: record.first_name,
        last_name: record.last_name,
        date_of_baptism: record.date_of_baptism,
        place_of_baptism: record.place_of_baptism,
        priest_name: record.priest_name,
        godparents: record.godparents,
        date_of_birth: record.date_of_birth,
        place_of_birth: record.place_of_birth,
        father_name: record.father_name,
        mother_name: record.mother_name
      });
    } else {
      setEditingRecord(null);
      setFormState(initialFormState);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    setFormState(initialFormState);
  };

  const handleFormChange = (field: keyof RecordFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveRecord = async () => {
    try {
      if (editingRecord) {
        // TODO: Update record API call
        // await recordService.baptism.updateRecord(editingRecord.id, formState);
        setRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...formState } : r));
        showToast('Record updated successfully', 'success');
      } else {
        // TODO: Create record API call
        // const newRecord = await recordService.baptism.createRecord(formState);
        const newRecord: BaptismTableRecord = {
          id: Date.now(),
          ...formState,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setRecords(prev => [...prev, newRecord]);
        showToast('Record created successfully', 'success');
      }
      handleCloseModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save record';
      showToast(errorMessage, 'error');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    
    try {
      // TODO: Delete record API call
      // await recordService.baptism.deleteRecord(recordId);
      setRecords(prev => prev.filter(r => r.id !== recordId));
      showToast('Record deleted successfully', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete record';
      showToast(errorMessage, 'error');
    }
    setActionAnchorEl(null);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    showToast('Export functionality coming soon', 'info');
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Baptism Records
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage baptism records with comprehensive search and editing capabilities
        </Typography>
      </Box>

      {/* Search and Filter Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={8}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Tooltip title="Advanced Grid View">
                <Button
                  variant="outlined"
                  startIcon={<GridIcon />}
                  onClick={() => setAdvancedGridOpen(true)}
                  color="primary"
                >
                  Advanced Grid
                </Button>
              </Tooltip>
              <Tooltip title="Refresh Data">
                <IconButton onClick={loadRecords} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export Records">
                <IconButton onClick={handleExport}>
                  <ExportIcon />
                </IconButton>
              </Tooltip>
              {canEdit && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenModal()}
                >
                  Add Record
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Results Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {paginatedRecords.length} of {filteredRecords.length} records
          {searchTerm && ` (filtered from ${records.length} total)`}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table Section */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.sortable ? (
                      <TableSortLabel
                        active={orderBy === column.id}
                        direction={orderBy === column.id ? order : 'asc'}
                        onClick={() => handleSort(column.id)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
                {canEdit && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? 'No records match your search' : 'No records found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((record) => (
                  <TableRow hover key={record.id}>
                    {columns.map((column) => (
                      <TableCell key={column.id}>
                        {column.format ? column.format(record[column.id]) : record[column.id]}
                      </TableCell>
                    ))}
                    {canEdit && (
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setSelectedRecord(record);
                            setActionAnchorEl(e.currentTarget);
                          }}
                        >
                          <MoreIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredRecords.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={actionAnchorEl}
        open={Boolean(actionAnchorEl)}
        onClose={() => setActionAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          if (selectedRecord) handleOpenModal(selectedRecord);
          setActionAnchorEl(null);
        }}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedRecord) handleDeleteRecord(selectedRecord.id);
        }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRecord ? 'Edit Baptism Record' : 'Add New Baptism Record'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                fullWidth
                value={formState.first_name}
                onChange={(e) => handleFormChange('first_name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={formState.last_name}
                onChange={(e) => handleFormChange('last_name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date of Baptism"
                type="date"
                fullWidth
                value={formState.date_of_baptism}
                onChange={(e) => handleFormChange('date_of_baptism', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Place of Baptism"
                fullWidth
                value={formState.place_of_baptism}
                onChange={(e) => handleFormChange('place_of_baptism', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Priest Name"
                fullWidth
                value={formState.priest_name}
                onChange={(e) => handleFormChange('priest_name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Godparents"
                fullWidth
                value={formState.godparents}
                onChange={(e) => handleFormChange('godparents', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date of Birth"
                type="date"
                fullWidth
                value={formState.date_of_birth}
                onChange={(e) => handleFormChange('date_of_birth', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Place of Birth"
                fullWidth
                value={formState.place_of_birth}
                onChange={(e) => handleFormChange('place_of_birth', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Father's Name"
                fullWidth
                value={formState.father_name}
                onChange={(e) => handleFormChange('father_name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Mother's Name"
                fullWidth
                value={formState.mother_name}
                onChange={(e) => handleFormChange('mother_name', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSaveRecord} variant="contained">
            {editingRecord ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Advanced Grid Modal */}
      <BaptismAdvancedGrid
        records={records}
        open={advancedGridOpen}
        onClose={() => setAdvancedGridOpen(false)}
        onRefresh={loadRecords}
      />
    </Box>
  );
};

export default BaptismRecordsPage;
