// Sample Baptism Records Component - Church Records Management System
import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Chip,
  Pagination,
  Stack,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  Upload as ImportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useBaptismRecords, useDropdownOptions, useCertificateGeneration } from '../api/church-records.hooks';
import { usePermissions } from '../context/ChurchRecordsProvider';
import type { BaptismRecord, SearchFilters } from '../types/church-records.types';

const BaptismRecordsComponent: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    page: 1,
    limit: 25,
  });
  const [selectedRecord, setSelectedRecord] = useState<BaptismRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Hooks
  const { records, pagination, loading, error, mutate, createRecord, updateRecord, deleteRecord } = useBaptismRecords(filters);
  const { options, loading: optionsLoading } = useDropdownOptions();
  const { generateBaptismCertificate, previewCertificate } = useCertificateGeneration();
  const { canManageRecords, canDeleteRecords, canGenerateCertificates, canExportData } = usePermissions();

  // Handlers
  const handleSearch = useCallback((searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm, page: 1 }));
  }, []);

  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handleAddRecord = useCallback(() => {
    setSelectedRecord(null);
    setIsEditMode(false);
    setIsDialogOpen(true);
  }, []);

  const handleEditRecord = useCallback((record: BaptismRecord) => {
    setSelectedRecord(record);
    setIsEditMode(true);
    setIsDialogOpen(true);
  }, []);

  const handleDeleteRecord = useCallback(async (id: number) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteRecord.trigger(id);
        mutate(); // Refresh data
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
  }, [deleteRecord, mutate]);

  const handleSaveRecord = useCallback(async (recordData: Partial<BaptismRecord>) => {
    try {
      if (isEditMode && selectedRecord) {
        await updateRecord.trigger({ id: selectedRecord.id, record: recordData });
      } else {
        await createRecord.trigger(recordData as Omit<BaptismRecord, 'id' | 'created_at' | 'updated_at'>);
      }
      setIsDialogOpen(false);
      mutate(); // Refresh data
    } catch (error) {
      console.error('Error saving record:', error);
    }
  }, [isEditMode, selectedRecord, createRecord, updateRecord, mutate]);

  const handleGenerateCertificate = useCallback(async (recordId: number) => {
    try {
      await generateBaptismCertificate.trigger({
        recordId,
        type: 'baptism',
        language: 'en',
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
    }
  }, [generateBaptismCertificate]);

  const handlePreviewCertificate = useCallback(async (recordId: number) => {
    try {
      await previewCertificate.trigger({ recordId, type: 'baptism' });
    } catch (error) {
      console.error('Error previewing certificate:', error);
    }
  }, [previewCertificate]);

  const handleRefresh = useCallback(() => {
    mutate();
  }, [mutate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading baptism records: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
            <Typography variant="h4" component="h1">
              Baptism Records
            </Typography>
            <Stack direction="row" spacing={2}>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {canExportData() && (
                <Tooltip title="Export Data">
                  <IconButton>
                    <ExportIcon />
                  </IconButton>
                </Tooltip>
              )}
              {canManageRecords() && (
                <Tooltip title="Import Records">
                  <IconButton>
                    <ImportIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Box>

          {/* Search Bar */}
          <Box mb={3}>
            <TextField
              fullWidth
              label="Search records..."
              variant="outlined"
              value={filters.searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />
          </Box>

          {/* Statistics */}
          <Box mb={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      {pagination?.total || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Records
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      {pagination?.totalPages || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Pages
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Records Table */}
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Child Name</TableCell>
                  <TableCell>Baptism Date</TableCell>
                  <TableCell>Parents</TableCell>
                  <TableCell>Godparents</TableCell>
                  <TableCell>Priest</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {record.child_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Born: {new Date(record.child_birth_date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={new Date(record.baptism_date).toLocaleDateString()}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {record.father_name}
                      </Typography>
                      <Typography variant="body2">
                        {record.mother_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {record.godfather_name}
                      </Typography>
                      <Typography variant="body2">
                        {record.godmother_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{record.priest_name}</TableCell>
                    <TableCell>{record.location}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {canManageRecords() && (
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEditRecord(record)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canGenerateCertificates() && (
                          <Tooltip title="Generate Certificate">
                            <Button
                              size="small"
                              onClick={() => handleGenerateCertificate(record.id)}
                            >
                              Certificate
                            </Button>
                          </Tooltip>
                        )}
                        {canDeleteRecords() && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center">
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add Record FAB */}
      {canManageRecords() && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={handleAddRecord}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Record Dialog */}
      <BaptismRecordDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        record={selectedRecord}
        isEdit={isEditMode}
        onSave={handleSaveRecord}
        options={options}
        loading={createRecord.isMutating || updateRecord.isMutating}
      />
    </Box>
  );
};

// Record Dialog Component
interface BaptismRecordDialogProps {
  open: boolean;
  onClose: () => void;
  record: BaptismRecord | null;
  isEdit: boolean;
  onSave: (record: Partial<BaptismRecord>) => void;
  options: any;
  loading: boolean;
}

const BaptismRecordDialog: React.FC<BaptismRecordDialogProps> = ({
  open,
  onClose,
  record,
  isEdit,
  onSave,
  options,
  loading,
}) => {
  const [formData, setFormData] = useState<Partial<BaptismRecord>>({
    child_name: '',
    child_birth_date: '',
    baptism_date: '',
    father_name: '',
    mother_name: '',
    godfather_name: '',
    godmother_name: '',
    priest_name: '',
    location: '',
    notes: '',
  });

  React.useEffect(() => {
    if (record && isEdit) {
      setFormData(record);
    } else {
      setFormData({
        child_name: '',
        child_birth_date: '',
        baptism_date: '',
        father_name: '',
        mother_name: '',
        godfather_name: '',
        godmother_name: '',
        priest_name: '',
        location: '',
        notes: '',
      });
    }
  }, [record, isEdit]);

  const handleInputChange = (field: keyof BaptismRecord) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEdit ? 'Edit Baptism Record' : 'Add New Baptism Record'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Child Name"
                value={formData.child_name}
                onChange={handleInputChange('child_name')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Child Birth Date"
                type="date"
                value={formData.child_birth_date}
                onChange={handleInputChange('child_birth_date')}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Baptism Date"
                type="date"
                value={formData.baptism_date}
                onChange={handleInputChange('baptism_date')}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={handleInputChange('location')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Father Name"
                value={formData.father_name}
                onChange={handleInputChange('father_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mother Name"
                value={formData.mother_name}
                onChange={handleInputChange('mother_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Godfather Name"
                value={formData.godfather_name}
                onChange={handleInputChange('godfather_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Godmother Name"
                value={formData.godmother_name}
                onChange={handleInputChange('godmother_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Priest Name"
                value={formData.priest_name}
                onChange={handleInputChange('priest_name')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={handleInputChange('notes')}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BaptismRecordsComponent;
