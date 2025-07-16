import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  Snackbar,
  Stack,
  Divider,
  Drawer,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Visibility as ViewIcon,
  Palette as PaletteIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  TableChart as TableChartIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';
import { useTableStyleStore } from '../../store/useTableStyleStore';
import { churchService, Church } from '../../services/churchService';
import recordService from '../../services/recordService';
import { TableControlPanel } from '../../components/TableControlPanel';
import { ColorPaletteSelector } from '../../components/ColorPaletteSelector';
import { AGGridViewOnly } from '../../components/AGGridViewOnly/AGGridViewOnly';
import { ChurchRecord, RecordType as ChurchRecordType } from '../../types/church-records-advanced.types';
import ImportRecordsButton from '../../components/ImportRecordsButton';
import { AdvancedGridDialog } from '../../components/AdvancedGridDialog';

// Types
interface BaptismRecord {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  dateOfBaptism: string;
  placeOfBirth: string;
  placeOfBaptism: string;
  fatherName: string;
  motherName: string;
  godparentNames: string;
  priest: string;
  registryNumber: string;
  churchId: string;
  churchName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface RecordType {
  value: string;
  label: string;
  apiEndpoint: string;
}

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: keyof BaptismRecord;
  direction: SortDirection;
}

// Record types configuration
const recordTypes: RecordType[] = [
  { value: 'baptism', label: 'Baptism Records', apiEndpoint: 'baptism' },
  { value: 'marriage', label: 'Marriage Records', apiEndpoint: 'marriage' },
  { value: 'funeral', label: 'Funeral Records', apiEndpoint: 'funeral' },
];

const mockRecords: BaptismRecord[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Michael',
    dateOfBirth: '2020-01-15',
    dateOfBaptism: '2020-02-15',
    placeOfBirth: 'Buffalo, NY',
    placeOfBaptism: 'Saints Peter and Paul Orthodox Church',
    fatherName: 'Michael Doe',
    motherName: 'Mary Doe',
    godparentNames: 'Peter Smith, Anna Smith',
    priest: 'Fr. Nicholas',
    registryNumber: 'B-2020-001',
    churchId: '2',
    churchName: 'Saints Peter and Paul Orthodox Church',
    notes: 'Beautiful ceremony',
    createdAt: '2020-02-15T10:00:00Z',
    updatedAt: '2020-02-15T10:00:00Z',
    createdBy: 'admin@church.org',
  },
  {
    id: '2',
    firstName: 'Maria',
    lastName: 'Johnson',
    dateOfBirth: '2019-12-10',
    dateOfBaptism: '2020-01-10',
    placeOfBirth: 'Chicago, IL',
    placeOfBaptism: 'Holy Trinity Orthodox Cathedral',
    fatherName: 'David Johnson',
    motherName: 'Elena Johnson',
    godparentNames: 'Constantine Popov',
    priest: 'Fr. Andrew',
    registryNumber: 'B-2020-002',
    churchId: '3',
    churchName: 'Holy Trinity Orthodox Cathedral',
    createdAt: '2020-01-10T14:00:00Z',
    updatedAt: '2020-01-10T14:00:00Z',
    createdBy: 'priest@cathedral.org',
  },
];

const BaptismRecordsPage: React.FC = () => {
  // State management
  const [records, setRecords] = useState<BaptismRecord[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChurch, setSelectedChurch] = useState<number>(0);
  const [selectedRecordType, setSelectedRecordType] = useState<string>('baptism');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dateOfBaptism', direction: 'desc' });
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BaptismRecord | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [priestOptions, setPriestOptions] = useState<string[]>([]);
  
  // Theme Editor States
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<'header' | 'row' | 'cell' | null>(null);
  
  // Table View Mode State
  const [useAgGrid, setUseAgGrid] = useState(false);
  
  // Advanced Grid Modal State
  const [advancedGridOpen, setAdvancedGridOpen] = useState(false);

  // Toast state
  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');

  // Toast helper functions
  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  // API functions
  const fetchChurches = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching churches...');
      
      const churchData = await churchService.fetchChurches();
      
      // Add "All Churches" option at the beginning
      const allChurchesOption: Church = {
        id: 0, // Use 0 for "all" option
        church_name: 'All Churches',
        email: '',
        is_active: true,
        has_baptism_records: true,
        has_marriage_records: true,
        has_funeral_records: true,
        setup_complete: true,
        created_at: '',
        updated_at: ''
      };
      
      setChurches([allChurchesOption, ...churchData]);
      console.log(`✅ Successfully loaded ${churchData.length} churches`);
    } catch (err) {
      console.error('❌ Error fetching churches:', err);
      setError('Failed to fetch churches');
      showToast('Failed to load churches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (recordType: string, churchId?: number) => {
    if (!recordType) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 Fetching ${recordType} records for church ${churchId}...`);
      
      // Find the record type configuration
      const selectedType = recordTypes.find(type => type.value === recordType);
      if (!selectedType) {
        throw new Error('Invalid record type selected');
      }
      
      // Use the church service if a specific church is selected, otherwise get all records
      let recordData;
      if (churchId && churchId !== 0) {
        recordData = await churchService.fetchChurchRecords(churchId, selectedType.apiEndpoint, {
          page: 1,
          limit: 1000, // Get all records for now
          search: searchTerm
        });
      } else {
        // Fetch all records across all churches using the direct API
        const response = await fetch(`/api/${selectedType.apiEndpoint}-records?limit=1000&search=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        if (data && data.records) {
          recordData = {
            records: data.records,
            totalRecords: data.totalRecords || data.records.length,
            currentPage: data.currentPage || 1,
            totalPages: data.totalPages || 1
          };
        } else {
          throw new Error('Failed to fetch records from API');
        }
      }
      
      setRecords(recordData.records || []);
      setPage(0); // Reset pagination when records change
      
      const recordCount = recordData.records?.length || 0;
      console.log(`✅ Successfully loaded ${recordCount} ${selectedType.label.toLowerCase()}`);
      showToast(`Loaded ${recordCount} ${selectedType.label.toLowerCase()}`, 'success');
      
    } catch (err) {
      console.error(`❌ Error fetching ${recordType} records:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      
      // Use mock data for testing if API fails
      console.log('🔄 Using mock data for testing...');
      setRecords(mockRecords);
      showToast('Using mock data for testing', 'info');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriestOptions = async (recordType: string) => {
    try {
      const selectedType = recordTypes.find(type => type.value === recordType);
      if (!selectedType) return;

      // Determine the table name based on record type
      const tableName = `${selectedType.apiEndpoint}_records`;
      
      console.log(`🔍 Fetching priest options from ${tableName}...`);
      
      const response = await fetch(`/api/${selectedType.apiEndpoint}-records/dropdown-options/clergy?table=${tableName}`);
      const data = await response.json();
      
      if (data && data.values) {
        // Filter out null/empty values and sort alphabetically
        const validPriests = data.values
          .filter((priest: string) => priest && priest.trim() !== '')
          .sort((a: string, b: string) => a.localeCompare(b));
        
        setPriestOptions(validPriests);
        console.log(`✅ Loaded ${validPriests.length} priest options`);
      }
    } catch (err) {
      console.error('❌ Error fetching priest options:', err);
      setPriestOptions([]);
    }
  };

  // Effects
  useEffect(() => {
    fetchChurches();
    // Automatically fetch baptism records on page load
    fetchRecords('baptism', selectedChurch);
  }, []);

  useEffect(() => {
    if (selectedRecordType) {
      fetchRecords(selectedRecordType, selectedChurch);
      fetchPriestOptions(selectedRecordType); // Fetch priest options when record type changes
    }
  }, [selectedRecordType, selectedChurch]);

  // Form state
  const [formData, setFormData] = useState<Partial<BaptismRecord> & { customPriest?: boolean }>({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    dateOfBaptism: '',
    placeOfBirth: '',
    placeOfBaptism: '',
    fatherName: '',
    motherName: '',
    godparentNames: '',
    priest: '',
    registryNumber: '',
    churchId: selectedChurch === 0 ? '1' : selectedChurch.toString(),
    notes: '',
    customPriest: false,
  });

  // Theme store integration
  const { 
    currentTheme, 
    isLiturgicalMode,
    tableTheme,
    setHeaderColor,
    getTableHeaderStyle,
    getTableRowStyle,
    getTableCellStyle 
  } = useTableStyleStore();

  // Convert records to ChurchRecord format for AG Grid
  const convertToChurchRecords = useCallback((inputRecords: BaptismRecord[]): ChurchRecord[] => {
    if (!inputRecords || !Array.isArray(inputRecords)) {
      console.warn('convertToChurchRecords: Invalid records input', inputRecords);
      return [];
    }

    try {
      const convertedRecords = inputRecords.map((originalRecord, index) => {
        if (!originalRecord) {
          console.warn('convertToChurchRecords: Null record found at index', index);
          return null;
        }

        try {
          const churchRecord: ChurchRecord = {
            id: originalRecord.id || `record-${index}`,
            recordType: (selectedRecordType as 'baptism' | 'marriage' | 'funeral') || 'baptism',
            fields: [
              { key: 'registryNumber', label: 'Registry #', value: originalRecord.registryNumber || '', type: 'text' as const, editable: false },
              { key: 'firstName', label: 'First Name', value: originalRecord.firstName || '', type: 'text' as const, editable: false },
              { key: 'lastName', label: 'Last Name', value: originalRecord.lastName || '', type: 'text' as const, editable: false },
              { key: 'middleName', label: 'Middle Name', value: originalRecord.middleName || '', type: 'text' as const, editable: false },
              { key: 'dateOfBaptism', label: 'Date', value: originalRecord.dateOfBaptism || '', type: 'date' as const, editable: false },
              { key: 'churchName', label: 'Church', value: originalRecord.churchName || '', type: 'text' as const, editable: false },
              { key: 'priest', label: 'Priest', value: originalRecord.priest || '', type: 'text' as const, editable: false },
              { key: 'placeOfBirth', label: 'Place of Birth', value: originalRecord.placeOfBirth || '', type: 'text' as const, editable: false },
              { key: 'placeOfBaptism', label: 'Place of Baptism', value: originalRecord.placeOfBaptism || '', type: 'text' as const, editable: false },
              { key: 'fatherName', label: 'Father Name', value: originalRecord.fatherName || '', type: 'text' as const, editable: false },
              { key: 'motherName', label: 'Mother Name', value: originalRecord.motherName || '', type: 'text' as const, editable: false },
              { key: 'godparentNames', label: 'Godparents', value: originalRecord.godparentNames || '', type: 'text' as const, editable: false },
            ],
            metadata: {
              churchId: parseInt(originalRecord.churchId) || 1,
              createdBy: 1,
              createdAt: originalRecord.createdAt ? new Date(originalRecord.createdAt) : new Date(),
              updatedAt: originalRecord.updatedAt ? new Date(originalRecord.updatedAt) : undefined,
              status: 'active' as const,
              version: 1
            },
            colorOverrides: {},
            tags: []
          };
          return churchRecord;
        } catch (recordError) {
          console.error('Error converting individual record at index', index, recordError);
          return null;
        }
      });

      const validRecords = convertedRecords.filter(Boolean) as ChurchRecord[];
      console.log(`Converted ${validRecords.length} out of ${inputRecords.length} records for AG Grid`);
      return validRecords;
    } catch (conversionError) {
      console.error('Error in convertToChurchRecords:', conversionError);
      return [];
    }
  }, [selectedRecordType]);

  // Filtered and sorted records
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = records;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        Object.values(record).some(value =>
          value?.toString().toLowerCase().includes(searchLower)
        )
      );
    }

    // Note: Church filtering is now handled by API call in fetchRecords
    // No need to filter by church here since fetchRecords already handles it

    // Sort records
    filtered.sort((recordA, recordB) => {
      const aValue = (recordA[sortConfig.key] ?? '').toString();
      const bValue = (recordB[sortConfig.key] ?? '').toString();
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [records, searchTerm, sortConfig]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredAndSortedRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedRecords, page, rowsPerPage]);

  // Handlers
  const handleSort = (key: keyof BaptismRecord) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddRecord = () => {
    setEditingRecord(null);
    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      dateOfBirth: '',
      dateOfBaptism: '',
      placeOfBirth: '',
      placeOfBaptism: '',
      fatherName: '',
      motherName: '',
      godparentNames: '',
      priest: '',
      registryNumber: '',
      churchId: selectedChurch === 0 ? '1' : selectedChurch.toString(),
      notes: '',
      customPriest: false,
    });
    setDialogOpen(true);
  };

  const handleEditRecord = (record: BaptismRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setDialogOpen(true);
  };

  const handleViewRecord = (record: BaptismRecord) => {
    // TODO: Implement view modal or navigation to detailed view
    console.log('Viewing record:', record);
    showToast(`Viewing record for ${record.firstName} ${record.lastName}`, 'info');
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        setLoading(true);
        // TODO: Implement actual API call
        // await recordService.deleteRecord('baptism', recordId);
        
        setRecords(prev => prev.filter(r => r.id !== recordId));
        showToast('Record deleted successfully', 'success');
      } catch (err) {
        console.error('Delete error:', err);
        showToast('Failed to delete record', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveRecord = async () => {
    try {
      setLoading(true);
      
      // Basic validation
      if (!formData.firstName || !formData.lastName || !formData.dateOfBaptism) {
        showToast('Please fill in required fields', 'error');
        return;
      }

      const churchName = churches.find(c => c.id.toString() === formData.churchId)?.church_name || '';
      
      if (editingRecord) {
        // Update existing record
        const updatedRecord: BaptismRecord = {
          ...editingRecord,
          ...formData,
          churchName,
          updatedAt: new Date().toISOString(),
        } as BaptismRecord;
        
        // TODO: Implement actual API call
        // await recordService.updateRecord('baptism', editingRecord.id, updatedRecord);
        
        setRecords(prev => prev.map(r => r.id === editingRecord.id ? updatedRecord : r));
        showToast('Record updated successfully', 'success');
      } else {
        // Create new record
        const newRecord: BaptismRecord = {
          ...formData,
          id: Date.now().toString(),
          churchName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'current-user@church.org', // TODO: Get from auth context
        } as BaptismRecord;
        
        // TODO: Implement actual API call
        // await recordService.createRecord('baptism', newRecord);
        
        setRecords(prev => [...prev, newRecord]);
        showToast('Record created successfully', 'success');
      }
      
      setDialogOpen(false);
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    showToast('Export functionality coming soon', 'info');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Effect to update church selection when theme changes
  useEffect(() => {
    if (selectedChurch === 0 && formData.churchId === '0') {
      setFormData(prev => ({ ...prev, churchId: '1' }));
    }
  }, [selectedChurch, formData.churchId]);

  // Debug logging for record state
  useEffect(() => {
    console.log('🐛 DEBUG - Records state:', {
      recordsLength: records.length,
      records: records,
      selectedRecordType,
      selectedChurch,
      loading,
      error
    });
  }, [records, selectedRecordType, selectedChurch, loading, error]);

  // Debug logging for filtered records
  useEffect(() => {
    console.log('🐛 DEBUG - Filtered records:', {
      filteredLength: filteredAndSortedRecords.length,
      paginatedLength: paginatedRecords.length,
      searchTerm,
      page,
      rowsPerPage
    });
  }, [filteredAndSortedRecords, paginatedRecords, searchTerm, page, rowsPerPage]);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: 'none',
      '& .MuiContainer-root': {
        maxWidth: 'none !important',
        paddingLeft: 0,
        paddingRight: 0
      }
    }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Records Management System
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage church records with Orthodox Table Theme Editor integration
            </Typography>
          </Box>
          
          {/* Theme Status Indicator */}
          <Box sx={{ mt: { xs: 2, sm: 0 } }}>
            <Chip
              icon={<PaletteIcon />}
              label={`Theme: ${currentTheme}`}
              variant="outlined"
              size="small"
              sx={{ 
                borderColor: tableTheme.headerColor,
                color: tableTheme.headerColor,
                '& .MuiChip-icon': { color: tableTheme.headerColor }
              }}
            />
            {isLiturgicalMode && (
              <Chip
                label="Liturgical Mode"
                size="small"
                color="secondary"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        </Stack>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            {/* First Row: Church and Record Type Selection */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Church</InputLabel>
                <Select
                  value={selectedChurch}
                  label="Select Church"
                  onChange={(e) => setSelectedChurch(e.target.value)}
                  disabled={loading}
                >
                  {churches.map((church) => (
                    <MenuItem key={church.id} value={church.id}>
                      {church.church_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Record Table</InputLabel>
                <Select
                  value={selectedRecordType}
                  label="Select Record Table"
                  onChange={(e) => setSelectedRecordType(e.target.value)}
                  disabled={loading}
                >
                  {recordTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {selectedRecordType && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {recordTypes.find(type => type.value === selectedRecordType)?.label} - {churches.find(church => church.id === selectedChurch)?.church_name}
                </Typography>
              )}
            </Stack>
            
            {/* Second Row: Search and Action Buttons (only show when record type is selected) */}
            {selectedRecordType && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  label="Search Records"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  sx={{ minWidth: 200 }}
                  disabled={loading}
                />
                
                {/* Enhanced Stylish Button Group */}
                <Stack direction="row" spacing={1} sx={{ 
                  p: 1, 
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 1
                }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddRecord}
                    disabled={loading}
                    sx={{ 
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1976D2 30%, #1A9FCC 90%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 8px 2px rgba(33, 203, 243, .4)',
                      }
                    }}
                  >
                    Add Record
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {/* TODO: Import functionality */}}
                    disabled={loading}
                    sx={{ 
                      background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                      boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #388E3C 30%, #689F38 90%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 8px 2px rgba(76, 175, 80, .4)',
                      }
                    }}
                  >
                    Import Records
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={<PaletteIcon />}
                    onClick={() => setThemeDrawerOpen(true)}
                    disabled={loading}
                    sx={{ 
                      background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
                      boxShadow: '0 3px 5px 2px rgba(255, 152, 0, .3)',
                      bgcolor: themeDrawerOpen ? 'action.selected' : 'transparent',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #F57C00 30%, #FFA000 90%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 8px 2px rgba(255, 152, 0, .4)',
                      }
                    }}
                  >
                    Customize Table
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={<TableChartIcon />}
                    onClick={() => setAdvancedGridOpen(true)}
                    disabled={loading}
                    sx={{ 
                      background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)',
                      boxShadow: '0 3px 5px 2px rgba(156, 39, 176, .3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #7B1FA2 30%, #C2185B 90%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 8px 2px rgba(156, 39, 176, .4)',
                      }
                    }}
                  >
                    Advanced Grid
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={useAgGrid ? <LockIcon /> : <LockOpenIcon />}
                    onClick={() => setUseAgGrid(!useAgGrid)}
                    disabled={loading}
                    sx={{ 
                      borderColor: '#607D8B',
                      color: '#607D8B',
                      bgcolor: useAgGrid ? 'action.selected' : 'transparent',
                      '&:hover': { 
                        bgcolor: 'action.hover',
                        borderColor: '#455A64',
                        color: '#455A64',
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    {useAgGrid ? 'Standard View' : 'Standard View'}
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={<ExportIcon />}
                    onClick={handleExport}
                    disabled={loading}
                    sx={{ 
                      background: 'linear-gradient(45deg, #795548 30%, #8D6E63 90%)',
                      boxShadow: '0 3px 5px 2px rgba(121, 85, 72, .3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5D4037 30%, #6D4C41 90%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 8px 2px rgba(121, 85, 72, .4)',
                      }
                    }}
                  >
                    Export
                  </Button>
                </Stack>
              </Stack>
            )}
            
            {/* Status Information */}
            {selectedRecordType && (
              <Typography variant="body2" color="text.secondary">
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    Loading records...
                  </Box>
                ) : (
                  `${filteredAndSortedRecords.length} record(s) found`
                )}
              </Typography>
            )}
            
            {/* Instructions when no selection */}
            {!selectedRecordType && (
              <Alert severity="info">
                Please select a church and record type to view records.
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Records Table - Only show when record type is selected */}
      {selectedRecordType && (
        <Paper sx={{ 
          width: '100%', 
          maxWidth: '100%', 
          margin: 0,
          marginLeft: 0,
          marginRight: 0,
          textAlign: 'left'
        }}>
          {/* View Mode Toggle Info */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
            {useAgGrid ? <TableChartIcon /> : <ViewListIcon />}
            <Typography variant="body2" color="text.secondary">
              {useAgGrid ? 'Advanced Grid View' : 'Standard Table View'}
            </Typography>
            <Chip 
              label={useAgGrid ? 'AG Grid' : 'Material-UI'} 
              size="small" 
              variant="outlined"
              color={useAgGrid ? 'primary' : 'default'}
            />
          </Box>

          {/* Conditional Table Rendering */}
          {useAgGrid ? (
            // AG Grid View
            <Box sx={{ height: 600, width: '100%' }}>
              <Typography variant="h6" sx={{ p: 2 }}>
                AG Grid Temporarily Disabled
              </Typography>
              <Typography variant="body2" sx={{ px: 2, pb: 2 }}>
                AG Grid is experiencing lexical scoping conflicts. Please use the Standard View (unlock icon) for now.
                Click the unlock icon in the toolbar above to switch to the Material-UI table.
              </Typography>
              <Box sx={{ p: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={() => setUseAgGrid(false)}
                  startIcon={<LockOpenIcon />}
                >
                  Switch to Standard View
                </Button>
              </Box>
            </Box>
          ) : (
            // Standard Material-UI Table View
            <TableContainer sx={{ textAlign: 'left', width: '100%' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow 
                  sx={{
                    ...getTableHeaderStyle(),
                    border: selectedElement === 'header' ? '2px solid #2196f3' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedElement('header');
                    setThemeDrawerOpen(true);
                  }}
                  title="Click to customize header appearance"
                >
                  <TableCell sx={getTableCellStyle('header')}>
                    <TableSortLabel
                      active={sortConfig.key === 'registryNumber'}
                      direction={sortConfig.direction}
                      onClick={() => handleSort('registryNumber')}
                    >
                      Registry #
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={getTableCellStyle('header')}>
                    <TableSortLabel
                      active={sortConfig.key === 'firstName'}
                      direction={sortConfig.direction}
                      onClick={() => handleSort('firstName')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={getTableCellStyle('header')}>
                    <TableSortLabel
                      active={sortConfig.key === 'dateOfBaptism'}
                      direction={sortConfig.direction}
                      onClick={() => handleSort('dateOfBaptism')}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={getTableCellStyle('header')}>
                    <TableSortLabel
                      active={sortConfig.key === 'churchName'}
                      direction={sortConfig.direction}
                      onClick={() => handleSort('churchName')}
                    >
                      Church
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={getTableCellStyle('header')}>
                    <TableSortLabel
                      active={sortConfig.key === 'priest'}
                      direction={sortConfig.direction}
                      onClick={() => handleSort('priest')}
                    >
                      Priest
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={getTableCellStyle('header')} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        Loading records...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        No records found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {searchTerm ? 'Try adjusting your search terms' : 'Click "Add Record" to create the first record'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record, index) => (
                    <TableRow
                      key={record.id}
                      sx={{
                        ...getTableRowStyle(index % 2 === 0 ? 'even' : 'odd'),
                        border: selectedElement === 'row' ? '2px solid #2196f3' : 'none',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          border: '1px solid #2196f3',
                        }
                      }}
                      onClick={(e) => {
                        // Only trigger if not clicking on action buttons
                        if (!(e.target as HTMLElement).closest('.record-actions')) {
                          setSelectedElement('row');
                          setThemeDrawerOpen(true);
                        }
                      }}
                      title="Click to customize row appearance"
                    >
                      <TableCell 
                        sx={{
                          ...getTableCellStyle('body'),
                          border: selectedElement === 'cell' ? '2px solid #2196f3' : 'none',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement('cell');
                          setThemeDrawerOpen(true);
                        }}
                        title="Click to customize cell appearance"
                      >
                        <Chip
                          label={record.registryNumber}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell 
                        sx={{
                          ...getTableCellStyle('body'),
                          border: selectedElement === 'cell' ? '2px solid #2196f3' : 'none',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement('cell');
                          setThemeDrawerOpen(true);
                        }}
                        title="Click to customize cell appearance"
                      >
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {`${record.firstName} ${record.lastName}`}
                          </Typography>
                          {record.middleName && (
                            <Typography variant="caption" color="text.secondary">
                              {record.middleName}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{
                          ...getTableCellStyle('body'),
                          border: selectedElement === 'cell' ? '2px solid #2196f3' : 'none',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement('cell');
                          setThemeDrawerOpen(true);
                        }}
                        title="Click to customize cell appearance"
                      >
                        {formatDate(record.dateOfBaptism)}
                      </TableCell>
                      <TableCell 
                        sx={{
                          ...getTableCellStyle('body'),
                          border: selectedElement === 'cell' ? '2px solid #2196f3' : 'none',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement('cell');
                          setThemeDrawerOpen(true);
                        }}
                        title="Click to customize cell appearance"
                      >
                        {record.churchName}
                      </TableCell>
                      <TableCell 
                        sx={{
                          ...getTableCellStyle('body'),
                          border: selectedElement === 'cell' ? '2px solid #2196f3' : 'none',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement('cell');
                          setThemeDrawerOpen(true);
                        }}
                        title="Click to customize cell appearance"
                      >
                        {record.priest}
                      </TableCell>
                      <TableCell sx={getTableCellStyle('body')} align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} className="record-actions">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewRecord(record)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Record">
                            <IconButton size="small" onClick={() => handleEditRecord(record)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Record">
                            <IconButton size="small" onClick={() => handleDeleteRecord(record.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}              </TableBody>
            </Table>
            </TableContainer>
          )}

          {/* Pagination for Material-UI Table */}
          {!useAgGrid && (
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredAndSortedRecords.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </Paper>
      )}
      {/* Add/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRecord ? 'Edit Baptism Record' : 'Add New Baptism Record'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First Name *"
                value={formData.firstName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Middle Name"
                value={formData.middleName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Last Name *"
                value={formData.lastName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                sx={{ flex: 1 }}
              />
            </Stack>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Date of Baptism *"
                type="date"
                value={formData.dateOfBaptism || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBaptism: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Stack>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Place of Birth"
                value={formData.placeOfBirth || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, placeOfBirth: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Place of Baptism"
                value={formData.placeOfBaptism || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, placeOfBaptism: e.target.value }))}
                sx={{ flex: 1 }}
              />
            </Stack>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Father's Name"
                value={formData.fatherName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, fatherName: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Mother's Name"
                value={formData.motherName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, motherName: e.target.value }))}
                sx={{ flex: 1 }}
              />
            </Stack>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Godparent Names"
                value={formData.godparentNames || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, godparentNames: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Priest</InputLabel>
                <Select
                  label="Priest"
                  value={formData.priest || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'custom') {
                      setFormData(prev => ({ ...prev, priest: '', customPriest: true }));
                    } else {
                      setFormData(prev => ({ ...prev, priest: value, customPriest: false }));
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select a priest...</em>
                  </MenuItem>
                  {priestOptions.map((priest) => (
                    <MenuItem key={priest} value={priest}>
                      {priest}
                    </MenuItem>
                  ))}
                  <MenuItem value="custom">
                    <em>Other (enter manually)...</em>
                  </MenuItem>
                </Select>
              </FormControl>
            </Stack>
            {formData.customPriest && (
              <TextField
                label="Enter Priest Name"
                value={formData.priest || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, priest: e.target.value }))}
                fullWidth
                sx={{ mt: 2 }}
                placeholder="Enter the priest's name"
              />
            )}
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Registry Number"
                value={formData.registryNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, registryNumber: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Church</InputLabel>
                <Select
                  value={formData.churchId || ''}
                  label="Church"
                  onChange={(e) => setFormData(prev => ({ ...prev, churchId: e.target.value }))}
                >
                  {churches.filter(c => c.id !== 0).map((church) => (
                    <MenuItem key={church.id} value={church.id}>
                      {church.church_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveRecord} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Orthodox Table Theme Editor Drawer */}
      <Drawer
        anchor="right"
        open={themeDrawerOpen}
        onClose={() => setThemeDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 400, md: 450 },
            p: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaletteIcon />
            Orthodox Table Theme Editor
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Customize the appearance of your records table with Orthodox and liturgical themes.
          </Typography>

          {/* Quick Start Guide */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="caption" component="div">
              <strong>Quick Start:</strong> Choose a liturgical theme below, then click table elements to customize colors and styling.
            </Typography>
          </Alert>

          <Divider sx={{ mb: 2 }} />

          {/* Quick Theme Selector */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Themes
            </Typography>
            <ColorPaletteSelector 
              selectedColor={tableTheme.headerColor}
              onColorChange={(color) => setHeaderColor(color)}
              liturgicalMode={isLiturgicalMode}
            />
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Element Selection Instructions */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Customize Elements
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Click on table elements below to customize:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip 
                label="Header" 
                variant={selectedElement === 'header' ? 'filled' : 'outlined'}
                onClick={() => setSelectedElement('header')}
                size="small"
              />
              <Chip 
                label="Row" 
                variant={selectedElement === 'row' ? 'filled' : 'outlined'}
                onClick={() => setSelectedElement('row')}
                size="small"
              />
              <Chip 
                label="Cell" 
                variant={selectedElement === 'cell' ? 'filled' : 'outlined'}
                onClick={() => setSelectedElement('cell')}
                size="small"
              />
            </Stack>
          </Box>

          {/* Table Control Panel */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {selectedElement && (
              <TableControlPanel 
                selectedElement={selectedElement}
                onElementSelect={(element) => setSelectedElement(element as 'header' | 'row' | 'cell')}
                tableTheme={tableTheme}
                onBorderStyleChange={(color, width, radius) => {
                  // Handle border style changes
                  console.log('Border style changed:', color, width, radius);
                }}
              />
            )}
            {!selectedElement && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Click on a table element above to customize its appearance
              </Typography>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => setThemeDrawerOpen(false)}
              >
                Done
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  // Apply theme and close
                  setThemeDrawerOpen(false);
                  showToast('Table theme applied successfully!', 'success');
                }}
              >
                Apply Theme
              </Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      {/* Toast Snackbar */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setToastOpen(false)} 
          severity={toastSeverity}
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>

      {/* Advanced Grid Modal */}
      <AdvancedGridDialog
        open={advancedGridOpen}
        onClose={() => setAdvancedGridOpen(false)}
        records={filteredAndSortedRecords}
        onRefresh={() => {
          fetchRecords(selectedRecordType, selectedChurch);
          showToast('Records refreshed successfully!', 'success');
        }}
      />
    </Box>
  );
};

export default BaptismRecordsPage;
