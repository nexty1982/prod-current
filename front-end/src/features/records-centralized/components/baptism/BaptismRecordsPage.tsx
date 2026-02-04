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
  Collapse,
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
  ExpandLess as IconChevronUp,
} from '@mui/icons-material';
import { useTableStyleStore } from '@/store/useTableStyleStore';
import churchService, { Church } from '@/shared/lib/churchService';
import recordService from '@/shared/lib/recordService';
import TableControlPanel from '@/components/TableControlPanel';
import ColorPaletteSelector from '@/components/ColorPaletteSelector';
import { ChurchRecord, RecordType as ChurchRecordType } from '@/types/church-records-advanced.types';
import ImportRecordsButton from '@/components/ImportRecordsButton';
import { AdvancedGridDialog } from '@/features/tables/AdvancedGridDialog';
import { FIELD_DEFINITIONS, RECORD_TYPES } from '@/features/records-centralized/components/constants';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { registerAgGridModulesOnce } from '@/agGridModules';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

registerAgGridModulesOnce();


// Types
interface BaptismRecord {
  id: string;
  firstName: string;
  lastName: string;
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
  // Marriage record fields
  fname_groom?: string;
  lname_groom?: string;
  fname_bride?: string;
  lname_bride?: string;
  mdate?: string;
  parentsg?: string;
  parentsb?: string;
  witness?: string;
  mlicense?: string;
  clergy?: string;
  // Additional marriage fields for form
  groomFirstName?: string;
  groomLastName?: string;
  brideFirstName?: string;
  brideLastName?: string;
  marriageDate?: string;
  marriageLocation?: string;
  witness1?: string;
  witness2?: string;
  // Funeral record fields
  dateOfDeath?: string;
  burialDate?: string;
  age?: string;
  burialLocation?: string;
  // Optional legacy fields for compatibility
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

// Function to get column definitions based on record type
const getColumnDefinitions = (recordType: string) => {
  switch (recordType) {
    case 'marriage':
      return FIELD_DEFINITIONS[RECORD_TYPES.MARRIAGE]?.tableColumns || [];
    case 'funeral':
      return FIELD_DEFINITIONS[RECORD_TYPES.FUNERAL]?.tableColumns || [];
    case 'baptism':
    default:
      return FIELD_DEFINITIONS[RECORD_TYPES.BAPTISM]?.tableColumns || [];
  }
};

// Function to get sort fields based on record type
const getSortFields = (recordType: string) => {
  switch (recordType) {
    case 'marriage':
      return FIELD_DEFINITIONS[RECORD_TYPES.MARRIAGE]?.sortFields || [];
    case 'funeral':
      return FIELD_DEFINITIONS[RECORD_TYPES.FUNERAL]?.sortFields || [];
    case 'baptism':
    default:
      return FIELD_DEFINITIONS[RECORD_TYPES.BAPTISM]?.sortFields || [];
  }
};

// Function to get cell value based on column field and record type
const getCellValue = (record: any, column: any) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  if (column.valueGetter) {
    try {
      return column.valueGetter({ data: record });
    } catch (error) {
      // If valueGetter fails, fall through to switch statement
      console.warn('valueGetter failed:', error);
    }
  }
  
  // Handle all field mappings with fallbacks - don't check original field first
  switch (column.field) {
    // Baptism record mappings
    case 'first_name':
      return record.first_name || record.firstName || 'N/A';
    case 'last_name':
      return record.last_name || record.lastName || 'N/A';
    case 'clergy':
      return record.clergy || record.priest || 'N/A';
    case 'reception_date':
      return formatDate(record.reception_date || record.dateOfBaptism);
    case 'birth_date':
      return formatDate(record.birth_date || record.dateOfBirth);
    case 'birthplace':
      return record.birthplace || record.placeOfBirth || 'N/A';
    case 'sponsors':
      return record.sponsors || record.godparentNames || 'N/A';
    
    // Marriage record mappings
    case 'fname_groom':
      return record.fname_groom || record.groomFirstName || 'N/A';
    case 'lname_groom':
      return record.lname_groom || record.groomLastName || 'N/A';
    case 'fname_bride':
      return record.fname_bride || record.brideFirstName || 'N/A';
    case 'lname_bride':
      return record.lname_bride || record.brideLastName || 'N/A';
    case 'mdate':
      return formatDate(record.mdate || record.marriageDate || record.marriage_date);
    case 'parentsg':
      return record.parentsg || record.groomParents || 'N/A';
    case 'parentsb':
      return record.parentsb || record.brideParents || 'N/A';
    case 'witness':
      return record.witness || record.witnesses || 'N/A';
    case 'mlicense':
      return record.mlicense || record.marriageLicense || 'N/A';
    
    // Funeral record mappings
    case 'name':
      return record.name || record.firstName || record.first_name || 'N/A';
    case 'lastname':
      return record.lastname || record.lastName || record.last_name || 'N/A';
    case 'deceased_date':
      return formatDate(record.deceased_date || record.deathDate || record.dateOfDeath || record.death_date);
    case 'burial_date':
      return formatDate(record.burial_date || record.burialDate || record.date_of_burial || record.burial_date_raw);
    case 'age':
      return record.age || 'N/A';
    case 'burial_location':
      return record.burial_location || record.burialLocation || 'N/A';
    
    default:
      // For any other fields not explicitly mapped, try original field first
      if (column.cellRenderer === 'dateRenderer') {
        return formatDate(record[column.field]);
      }
      const value = record[column.field];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
      return 'N/A';
  }
};

// Mock data removed - now using live API calls

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

  // Collapsible Panel State
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState<boolean>(false);

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
        const response = await fetch(`/api/${selectedType.apiEndpoint}-records?limit=1000&search=${encodeURIComponent(searchTerm)}`, {
          credentials: 'include',
        });
        if (response.status === 401) {
          localStorage.removeItem('auth_user');
          window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
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
      
      // Debug: Log the first record to see its structure
      if (recordData.records && recordData.records.length > 0) {
        console.log(`📄 Sample ${recordType} record structure:`, recordData.records[0]);
        console.log(`📄 Record fields:`, Object.keys(recordData.records[0]));
      }
      
      const recordCount = recordData.records?.length || 0;
      console.log(`✅ Successfully loaded ${recordCount} ${selectedType.label.toLowerCase()}`);
      showToast(`Loaded ${recordCount} ${selectedType.label.toLowerCase()}`, 'success');
      
    } catch (err) {
      console.error(`❌ Error fetching ${recordType} records:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      
      // No more mock data fallback - show error to user
      console.error('❌ API failed, no records loaded');
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
      
      const response = await fetch(`/api/${selectedType.apiEndpoint}-records/dropdown-options/clergy?table=${tableName}`, {
        credentials: 'include',
      });
      if (response.status === 401) {
        localStorage.removeItem('auth_user');
        window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
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
    // Note: Removed auto-fetch of records to improve initial page load performance
    // Records will be fetched when user explicitly selects a record type
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
          // Build fields array based on record type
          let fields = [
            { key: 'registryNumber', label: 'Registry #', value: originalRecord.registryNumber || '', type: 'text' as const, editable: false },
          ];

          if (selectedRecordType === 'marriage') {
            // For marriage records, combine groom and bride names
            const groomName = `${originalRecord.fname_groom || ''} ${originalRecord.lname_groom || ''}`.trim();
            const brideName = `${originalRecord.fname_bride || ''} ${originalRecord.lname_bride || ''}`.trim();
            
            fields.push(
              { key: 'groom', label: 'Groom', value: groomName, type: 'text' as const, editable: false },
              { key: 'bride', label: 'Bride', value: brideName, type: 'text' as const, editable: false },
              { key: 'mdate', label: 'Date', value: originalRecord.mdate || '', type: 'text' as const, editable: false },
              { key: 'churchName', label: 'Church', value: originalRecord.churchName || '', type: 'text' as const, editable: false },
              { key: 'clergy', label: 'Priest', value: originalRecord.clergy || '', type: 'text' as const, editable: false }
            );
          } else {
            // For baptism and funeral records
            fields.push(
              { key: 'firstName', label: 'First Name', value: originalRecord.firstName || '', type: 'text' as const, editable: false },
              { key: 'lastName', label: 'Last Name', value: originalRecord.lastName || '', type: 'text' as const, editable: false },
              { key: 'dateOfBaptism', label: 'Date', value: originalRecord.dateOfBaptism || '', type: 'text' as const, editable: false },
              { key: 'churchName', label: 'Church', value: originalRecord.churchName || '', type: 'text' as const, editable: false },
              { key: 'priest', label: 'Priest', value: originalRecord.priest || '', type: 'text' as const, editable: false }
            );
          }

          const churchRecord: ChurchRecord = {
            id: originalRecord.id || `record-${index}`,
            recordType: (selectedRecordType as 'baptism' | 'marriage' | 'funeral') || 'baptism',
            fields: fields,
            metadata: {
              churchId: parseInt(originalRecord.churchId) || 1,
              createdBy: 1,
              createdAt: new Date(),
              updatedAt: undefined,
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
    let sorted = [...records];
    // Sort records
    sorted.sort((recordA, recordB) => {
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
    // Filter by search term
    let filtered = sorted;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        Object.values(record).some(value =>
          value?.toString().toLowerCase().includes(searchLower)
        )
      );
    }
    const startIndex = page * rowsPerPage;
    return filtered.slice(startIndex, startIndex + rowsPerPage);
  }, [records, searchTerm, sortConfig, page, rowsPerPage]);

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
    
    let recordName = '';
    if (selectedRecordType === 'marriage') {
      const groomName = `${record.fname_groom || ''} ${record.lname_groom || ''}`.trim();
      const brideName = `${record.fname_bride || ''} ${record.lname_bride || ''}`.trim();
      recordName = `${groomName} & ${brideName}`;
    } else {
      recordName = `${record.firstName} ${record.lastName}`;
    }
    
    showToast(`Viewing record for ${recordName}`, 'info');
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
          {/* Collapsible Header & Controls */}
          {!isFiltersCollapsed && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ pb: 1 }}>
                {/* Collapse/Expand Button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h4" component="h1">
                    Records Management System
                  </Typography>
                  <IconButton
                    onClick={() => setIsFiltersCollapsed(true)}
                    sx={{ 
                      transition: 'transform 0.2s ease-in-out',
                      transform: isFiltersCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    <IconChevronUp />
                  </IconButton>
                </Box>
                {/* Collapsible Content */}
                <Collapse in={!isFiltersCollapsed}>
                  <Box>
                    {/* Description and Theme Status */}
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 3 }}>
                      <Typography variant="body1" color="text.secondary">
                        Manage church records with Orthodox Table Theme Editor integration
                      </Typography>
                      
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
                        {useAgGrid ? 'Standard View' : 'AG Grid View'}
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
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
            )}

            {/* Floating Expand Button when collapsed */}
            {isFiltersCollapsed && (
              <IconButton
                onClick={() => setIsFiltersCollapsed(false)}
                sx={{
                  position: 'fixed',
                  top: { xs: 70, sm: 90 },
                  right: { xs: 16, sm: 32 },
                  zIndex: 1201,
                  backgroundColor: 'background.paper',
                  boxShadow: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'grey.100',
                  },
                }}
                size="large"
                aria-label="Expand controls"
              >
                <IconChevronUp style={{ transform: 'rotate(180deg)' }} />
              </IconButton>
            )}

            {/* Records Table - Only show when record type is selected */}
            {selectedRecordType && (
              <Paper className="theme-orthodox-traditional" sx={{ 
                width: '100%', 
                maxWidth: '100%', 
                margin: 0,
                marginLeft: 0,
                marginRight: 0,
                textAlign: 'left'
              }}>

                {/* Conditional Table Rendering */}
                {useAgGrid ? (
                  // AG Grid View
                  <Box sx={{ height: 600, width: '100%' }} className="ag-theme-alpine">
                    <AgGridReact
                      rowData={filteredAndSortedRecords}
                      columnDefs={(() => {
                        const cols: ColDef[] = getColumnDefinitions(selectedRecordType).map((col: any) => ({
                          field: col.field,
                          headerName: col.headerName,
                          flex: 1,
                          minWidth: 120,
                          sortable: true,
                          filter: true,
                          floatingFilter: true,
                          valueGetter: (params: any) => getCellValue(params.data, col),
                        }));
                        cols.push({
                          headerName: 'Actions',
                          field: 'id',
                          minWidth: 150,
                          maxWidth: 160,
                          sortable: false,
                          filter: false,
                          cellRenderer: (params: ICellRendererParams) => {
                            const record = params.data;
                            if (!record) return null;
                            return (
                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
                                <Tooltip title="View">
                                  <IconButton size="small" onClick={() => handleViewRecord(record)}>
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleEditRecord(record)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => handleDeleteRecord(record.id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            );
                          },
                        });
                        return cols;
                      })()}
                      defaultColDef={{
                        resizable: true,
                        sortable: true,
                        filter: true,
                      }}
                      pagination={true}
                      paginationPageSize={25}
                      paginationPageSizeSelector={[10, 25, 50, 100]}
                      animateRows={true}
                      domLayout="normal"
                      suppressMovableColumns={false}
                      rowSelection="multiple"
                      getRowId={(params) => String(params.data.id)}
                    />
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
                        title="Click to customize header appearance"
                      >
                        {getColumnDefinitions(selectedRecordType).map((column: any, index: number) => (
                          <TableCell key={index} sx={{ ...getTableCellStyle('header'), color: '#fff !important', fontWeight: 'bold' }}>
                            <TableSortLabel
                              active={sortConfig.key === column.field}
                              direction={sortConfig.direction}
                              onClick={() => handleSort(column.field)}
                            >
                              {column.headerName}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                        <TableCell sx={getTableCellStyle('header')} align="center">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={getColumnDefinitions(selectedRecordType).length + 1} align="center" sx={{ py: 8 }}>
                            <CircularProgress />
                            <Typography variant="body2" sx={{ mt: 2 }}>
                              Loading records...
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : paginatedRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={getColumnDefinitions(selectedRecordType).length + 1} align="center" sx={{ py: 8 }}>
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
                            {getColumnDefinitions(selectedRecordType).map((column: any, colIndex: number) => (
                              <TableCell key={colIndex} sx={getTableCellStyle('body')}>
                                {getCellValue(record, column)}
                              </TableCell>
                            ))}
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
                {editingRecord ? `Edit ${selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record` : `Add New ${selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record`}
              </DialogTitle>
              <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                  {selectedRecordType === 'baptism' && (
                    <>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="First Name *"
                          value={formData.firstName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
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
                    </>
                  )}

                  {selectedRecordType === 'marriage' && (
                    <>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Groom First Name *"
                          value={formData.groomFirstName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, groomFirstName: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Groom Last Name *"
                          value={formData.groomLastName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, groomLastName: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                      </Stack>
                      
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Bride First Name *"
                          value={formData.brideFirstName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, brideFirstName: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Bride Last Name *"
                          value={formData.brideLastName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, brideLastName: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                      </Stack>
                      
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Marriage Date *"
                          type="date"
                          value={formData.marriageDate || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, marriageDate: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Marriage Location"
                          value={formData.marriageLocation || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, marriageLocation: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                      </Stack>
                      
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Witness 1"
                          value={formData.witness1 || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, witness1: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Witness 2"
                          value={formData.witness2 || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, witness2: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                      </Stack>
                      
                      <FormControl fullWidth>
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
                      {formData.customPriest && (
                        <TextField
                          label="Enter Priest Name"
                          value={formData.priest || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, priest: e.target.value }))}
                          fullWidth
                          placeholder="Enter the priest's name"
                        />
                      )}
                    </>
                  )}

                  {selectedRecordType === 'funeral' && (
                    <>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="First Name *"
                          value={formData.firstName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
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
                          label="Date of Death *"
                          type="date"
                          value={formData.dateOfDeath || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, dateOfDeath: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Burial Date"
                          type="date"
                          value={formData.burialDate || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, burialDate: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={{ flex: 1 }}
                        />
                      </Stack>
                      
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Age"
                          type="number"
                          value={formData.age || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Burial Location"
                          value={formData.burialLocation || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, burialLocation: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                      </Stack>
                      
                      <FormControl fullWidth>
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
                      {formData.customPriest && (
                        <TextField
                          label="Enter Priest Name"
                          value={formData.priest || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, priest: e.target.value }))}
                          fullWidth
                          placeholder="Enter the priest's name"
                        />
                      )}
                    </>
                  )}
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
              recordType="baptism"
              onRefresh={() => {
                fetchRecords(selectedRecordType, selectedChurch);
                showToast('Records refreshed successfully!', 'success');
              }}
            />
          </Box>
    );
};

export default BaptismRecordsPage;
