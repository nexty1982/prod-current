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
import { metricsAPI } from '@/api/metrics.api';
import TableControlPanel from '@/components/TableControlPanel';
import ColorPaletteSelector from '@/components/ColorPaletteSelector';
import ImportRecordsButtonSimple from '@/components/ImportRecordsButtonSimple';
import { AdvancedGridDialog } from '@/features/tables/AdvancedGridDialog';
import { TableThemeSelector } from '@/components/TableThemeSelector';
import '../../styles/table-themes.css';
import { useAuth } from '@/context/AuthContext';

// Types

interface RecordType {
  value: string;
  label: string;
  apiEndpoint: string;
}

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface ColumnDefinition {
  field: string;
  headerName: string;
  isDate: boolean;
  isExcluded: boolean;
}

// Record types configuration
const recordTypes: RecordType[] = [
  { value: 'baptism', label: 'Baptism Records', apiEndpoint: 'baptism' },
  { value: 'marriage', label: 'Marriage Records', apiEndpoint: 'marriage' },
  { value: 'funeral', label: 'Funeral Records', apiEndpoint: 'funeral' },
];

// System/audit fields to exclude by default
const EXCLUDED_FIELDS = [
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'deleted_at',
  'deleted_by',
  'version',
  'tenant_id',
  'church_db_id',
  'import_batch_id',
  'audit_log',
  'sync_status',
  'sync_timestamp',
  'data_source',
  'validation_status',
  'validation_errors'
];

// Header name overrides for common fields
const HEADER_MAP: Record<string, string> = {
  id: 'ID',
  fname: 'First Name',
  lname: 'Last Name',
  fname_groom: 'Groom First Name',
  lname_groom: 'Groom Last Name',
  fname_bride: 'Bride First Name',
  lname_bride: 'Bride Last Name',
  mdate: 'Marriage Date',
  parentsg: 'Groom Parents',
  parentsb: 'Bride Parents',
  mlicense: 'Marriage License',
  dob: 'Date of Birth',
  dod: 'Date of Death',
  age: 'Age',
  clergy: 'Clergy/Priest',
  priest: 'Priest',
  church_id: 'Church',
  church_name: 'Church Name',
  notes: 'Notes',
  registry_number: 'Registry Number',
  burial_location: 'Burial Location',
  burial_date: 'Burial Date',
  reception_date: 'Reception Date',
  birth_date: 'Birth Date',
  death_date: 'Death Date',
  deceased_date: 'Deceased Date'
};

// Function to convert snake_case to Title Case
const snakeCaseToTitleCase = (str: string): string => {
  // Check if we have a custom header mapping first
  if (HEADER_MAP[str.toLowerCase()]) {
    return HEADER_MAP[str.toLowerCase()];
  }
  
  // Otherwise convert snake_case to Title Case
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Function to check if a field name indicates it's a date
const isDateField = (fieldName: string): boolean => {
  const lowerField = fieldName.toLowerCase();
  return (
    lowerField.includes('date') ||
    lowerField.includes('_at') ||
    lowerField.includes('dob') ||
    lowerField.includes('dod') ||
    lowerField.includes('mdate') ||
    (lowerField.includes('burial') && lowerField.includes('date')) ||
    (lowerField.includes('death') && lowerField.includes('date')) ||
    (lowerField.includes('birth') && lowerField.includes('date')) ||
    (lowerField.includes('marriage') && lowerField.includes('date')) ||
    (lowerField.includes('reception') && lowerField.includes('date')) ||
    (lowerField.includes('baptism') && lowerField.includes('date')) ||
    (lowerField.includes('funeral') && lowerField.includes('date'))
  );
};

// Function to format a cell value
const formatCellValue = (value: any, fieldName: string): string => {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  
  // Format dates
  if (isDateField(fieldName) && value) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (e) {
      // If date parsing fails, return as is
    }
  }
  
  // Convert booleans to Yes/No
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Return everything else as string
  return String(value);
};

// Function to generate a stable row ID
const getRowId = (row: any): string => {
  // Try common ID fields
  if (row.id) return String(row.id);
  if (row._id) return String(row._id);
  if (row.record_id) return String(row.record_id);
  
  // Generate hash from row values as fallback
  const values = Object.values(row).filter(v => v !== null && v !== undefined);
  const hash = values.join('|').split('').reduce((acc, char) => {
    const charCode = char.charCodeAt(0);
    return ((acc << 5) - acc) + charCode;
  }, 0);
  
  return `row_${Math.abs(hash)}`;
};

// Function to build column definitions from data
const buildColumnsFromData = (data: any[]): ColumnDefinition[] => {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Get keys from the first row
  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  
  // Build column definitions
  const columns = keys.map(key => ({
    field: key,
    headerName: snakeCaseToTitleCase(key),
    isDate: isDateField(key),
    isExcluded: EXCLUDED_FIELDS.includes(key.toLowerCase())
  }));
  
  // Filter out excluded columns but keep 'id' for row identification
  return columns.filter(col => col.field === 'id' || !col.isExcluded);
};



// Function to convert table column definitions to AG Grid column definitions
const convertToAgGridColumns = (columns: ColumnDefinition[]) => {
  return columns.map((col) => ({
    field: col.field,
    headerName: col.headerName,
    width: 150,
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
    ...(col.isDate && {
      valueFormatter: (params: any) => {
        if (params.value) {
          return formatCellValue(params.value, col.field);
        }
        return '';
      }
    })
  }));
};







interface SSPPOCRecordsPageProps {
  churchId?: number;
  churchDbId?: number; 
  recordType?: string;
  sortConfig?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

const SSPPOCRecordsPage: React.FC<SSPPOCRecordsPageProps> = ({ 
  churchId,
  churchDbId,
  recordType: propRecordType,
  sortConfig: propSortConfig 
}) => {
  // State management
  const [records, setRecords] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [selectedRecordType, setSelectedRecordType] = useState<'baptism' | 'marriage' | 'funeral' | undefined>(
    propRecordType === 'baptism_records' ? 'baptism' :
    propRecordType === 'marriage_records' ? 'marriage' :
    propRecordType === 'funeral_records' ? 'funeral' :
    undefined
  );
  const [selectedChurch, setSelectedChurch] = useState<number>(churchDbId || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [priestOptions, setPriestOptions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    propSortConfig ? {
      key: propSortConfig.field as string,
      direction: propSortConfig.direction
    } : {
      key: 'id',
      direction: 'asc'
    }
  );
  const [useAgGrid, setUseAgGrid] = useState(false);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [isAdvancedGridOpen, setIsAdvancedGridOpen] = useState(false);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState(false);
  

  
  // Additional state declarations
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<'header' | 'row' | 'cell' | null>(null);
  const [advancedGridOpen, setAdvancedGridOpen] = useState(false);
  const [tableThemeClass, setTableThemeClass] = useState<string>('table-theme-ocean-serenity');
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
      console.log('🔍 SSPPOCRecordsPage: Fetching churches...');
      
      const churchData = await churchService.fetchChurches();
      
      // Add "All Churches" option at the beginning
      const allChurchesOption: Church = {
        id: 0, // Use 0 for "all" option
        name: 'All Churches',
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
      console.log(`✅ SSPPOCRecordsPage: Successfully loaded ${churchData.length} churches`);
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('❌ SSPPOCRecordsPage: Error fetching churches:', err);
      
      // The church service already handles 401 errors and redirects to login
      // If we get here, it's likely a network or other error, so show fallback
      const fallbackMessage = err.message?.includes('Authentication required') 
        ? 'Session expired - redirecting to login...' 
        : 'Using mock churches - API unavailable';
      
      // Only set fallback churches if it's not an auth error
      if (!err.message?.includes('Authentication required')) {
        const mockChurches: Church[] = [
          {
            id: 0,
            name: 'All Churches',
            email: '',
            is_active: true,
            has_baptism_records: true,
            has_marriage_records: true,
            has_funeral_records: true,
            setup_complete: true,
            created_at: '',
            updated_at: ''
          },
          {
            id: 1,
            name: 'Saints Peter and Paul Orthodox Church',
            email: 'info@sppoc.org',
            is_active: true,
            has_baptism_records: true,
            has_marriage_records: true,
            has_funeral_records: true,
            setup_complete: true,
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          }
        ];
        
        setChurches(mockChurches);
        setError(fallbackMessage);
        showToast('Using mock churches for testing', 'info');
      }
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
        // Fetch all records across all churches using the metricsAPI
        const endpoint = selectedType.apiEndpoint as 'baptism' | 'marriage' | 'funeral';
        const filters = { limit: '1000', search: searchTerm };
        
        let data;
        if (endpoint === 'baptism') {
          data = await metricsAPI.records.getBaptismRecords(filters);
        } else if (endpoint === 'marriage') {
          data = await metricsAPI.records.getMarriageRecords(filters);
        } else if (endpoint === 'funeral') {
          data = await metricsAPI.records.getFuneralRecords(filters);
        }
        
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
      
      const fetchedRecords = recordData.records || [];
      setRecords(fetchedRecords);
      
      // Build columns dynamically from the first record
      if (fetchedRecords.length > 0) {
        const dynamicColumns = buildColumnsFromData(fetchedRecords);
        setColumns(dynamicColumns);
        console.log(`📊 Built ${dynamicColumns.length} columns from data`);
        console.log(`📄 Sample ${recordType} record structure:`, fetchedRecords[0]);
        console.log('📄 Column definitions:', dynamicColumns);
      } else {
        setColumns([]);
      }
      
      setPage(0); // Reset pagination when records change
      
      const recordCount = fetchedRecords.length;
      console.log(`✅ Successfully loaded ${recordCount} ${selectedType.label.toLowerCase()}`);
      showToast(`Loaded ${recordCount} ${selectedType.label.toLowerCase()}`, 'success');
      
    } catch (err) {
      console.error(`❌ Error fetching ${recordType} records:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      setRecords([]);
      setColumns([]);
      showToast('Failed to fetch records', 'error');
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
      
      const data = await metricsAPI.records.getDropdownOptions(selectedType.apiEndpoint, 'clergy', tableName);
      
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
  const { user } = useAuth();
  
  // Fetch churches on component mount only (prevent infinite loop)
  useEffect(() => {
    console.log('🔄 SSPPOCRecordsPage: Initial church fetch');
    fetchChurches();
  }, []); // No dependencies to prevent infinite loop

  // Set default church and record type after churches are loaded
  useEffect(() => {
    if (churches.length === 0) {
      console.log('⏳ Churches not loaded yet, waiting...');
      return; // Wait for churches to be loaded
    }

    console.log('🏛️ Setting default church and record type based on user and available churches');
    
    if (user && user.church_id && !selectedChurch) {
      console.log(`🏛️ Setting user's church: ${user.church_id}`);
      setSelectedChurch(Number(user.church_id));
    } else if (!selectedChurch) {
      // For users without assigned church, try to find SSPPOC or use first available church
      const defaultChurch = churches.find(church => 
        church.name?.toLowerCase().includes('ssppoc') || 
        church.name?.toLowerCase().includes('saints peter and paul')
      ) || churches.find(church => church.id !== 0); // Skip "All Churches" option
      
      if (defaultChurch) {
        console.log(`🏛️ Setting default church: ${defaultChurch.name} (ID: ${defaultChurch.id})`);
        setSelectedChurch(defaultChurch.id);
      } else if (churches.length > 1) {
        // Use the first real church (not "All Churches")
        setSelectedChurch(churches[1].id);
      }
    }
    
    if (!selectedRecordType) {
      setSelectedRecordType('baptism');
      console.log('📋 Setting default record type to baptism');
    }
  }, [churches, user, selectedChurch, selectedRecordType]); // Add selectedChurch and selectedRecordType to prevent unnecessary updates

  useEffect(() => {
    if (selectedRecordType && selectedChurch) {
      console.log(`🔄 Fetching ${selectedRecordType} records for church ${selectedChurch}`);
      fetchRecords(selectedRecordType || 'baptism', selectedChurch);
      fetchPriestOptions(selectedRecordType || 'baptism'); // Fetch priest options when record type changes
    }
  }, [selectedRecordType, selectedChurch, searchTerm]);

  // Set default sort field to 'id' descending
  useEffect(() => {
    setSortConfig({ key: 'id', direction: 'desc' });
  }, [selectedRecordType]);

  // Form state
  const [formData, setFormData] = useState<any>({
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
    churchName: selectedChurch === 0 ? 'All Churches' : churches.find(c => c.id === selectedChurch)?.name || '',
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

  // Convert records to format for AG Grid
  const convertToChurchRecords = useCallback((inputRecords: any[]): any[] => {
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
    let filtered = [...records];

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        Object.values(record).some(value =>
          value?.toString().toLowerCase().includes(searchLower)
        )
      );
    }

    // Sort records
    filtered.sort((recordA, recordB) => {
      const aValue = (recordA[sortConfig.key] ?? '').toString().toLowerCase();
      const bValue = (recordB[sortConfig.key] ?? '').toString().toLowerCase();
      
      // Special handling for dates
      if (isDateField(sortConfig.key)) {
        const aDate = new Date(aValue).getTime() || 0;
        const bDate = new Date(bValue).getTime() || 0;
        if (aDate < bDate) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aDate > bDate) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
      
      // Regular string comparison
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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
  const handleSort = (key: string) => {
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

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setFormData(record);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleViewRecord = (record: any) => {
    setEditingRecord(record);
    setFormData(record);
    setViewMode(true);
    setDialogOpen(true);
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

      const churchName = churches.find(c => c.id.toString() === formData.churchId)?.name || '';
      
      if (editingRecord) {
        // Update existing record
        const updatedRecord: SSPPOCRecord = {
          ...editingRecord,
          ...formData,
          churchName,
          updatedAt: new Date().toISOString(),
        } as SSPPOCRecord;
        
        // TODO: Implement actual API call
        // await recordService.updateRecord('baptism', editingRecord.id, updatedRecord);
        
        setRecords(prev => prev.map(r => r.id === editingRecord.id ? updatedRecord : r));
        showToast('Record updated successfully', 'success');
      } else {
        // Create new record
        const newRecord: SSPPOCRecord = {
          ...formData,
          id: Date.now().toString(),
          churchName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'current-user@church.org', // TODO: Get from auth context
        } as SSPPOCRecord;
        
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
                SSPPOC Records Management
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
                  
                  {/* Theme Status Indicator removed */}
                </Stack>
                <Stack spacing={2}>
            {/* First Row: Church and Record Type Selection */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Church</InputLabel>
                <Select
                  value={churches.find(church => church.id === selectedChurch) ? selectedChurch : ''}
                  label="Select Church"
                  onChange={(e) => setSelectedChurch(e.target.value)}
                  disabled={loading}
                >
                  {churches.map((church) => (
                    <MenuItem key={church.id} value={church.id}>
                      {church.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Record Table</InputLabel>
                <Select
                  value={selectedRecordType}
                  label="Select Record Table"
                  onChange={(e) => setSelectedRecordType(e.target.value as 'baptism' | 'marriage' | 'funeral')}
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
                  {recordTypes.find(type => type.value === selectedRecordType)?.label} - {churches.find(church => church.id === selectedChurch)?.name}
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
                  
                  <ImportRecordsButtonSimple
                    churchId={selectedChurch?.id}
                    recordType={selectedRecordType === 'baptism' ? 'baptisms' : 
                               selectedRecordType === 'marriage' ? 'marriages' : 
                               'funerals'}
                    onImportComplete={() => fetchRecords(selectedRecordType || 'baptism', selectedChurch)}
                  />
                  
                  {/* Table Theme Selector */}
                  {useAgGrid && (
                    <TableThemeSelector
                      selectedTheme={tableThemeClass}
                      onThemeChange={setTableThemeClass}
                      variant="popover"
                      size="small"
                      showLabel={false}
                    />
                  )}
                  
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
                  
                </Stack>
              </Stack>
            )}
            
            {/* Status Information */}
            {selectedRecordType && (
              loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                  <CircularProgress size={16} />
                  Loading records...
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {`${filteredAndSortedRecords.length} record(s) found`}
                </Typography>
              )
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
        <Paper sx={{ 
          width: '100%', 
          maxWidth: '100%', 
          margin: 0,
          marginLeft: 0,
          marginRight: 0,
          textAlign: 'left'
        }}>

                    {/* Conditional Table Rendering */}
          {(() => {
            console.log('🔍 Table rendering - selectedRecordType:', selectedRecordType, 'useAgGrid:', useAgGrid);
            return null;
          })()}
          {false ? ( // Temporarily force Material-UI table for debugging
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
            {(() => {
              console.log('🔍 About to render Material-UI table');
              return null;
            })()}
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {(() => {
                    console.log('🔍 Rendering table headers for:', selectedRecordType);
                    const columns = getColumnDefinitions(selectedRecordType || 'baptism');
                    console.log('🔍 Columns returned:', columns);
                    console.log('🔍 Columns length:', columns?.length);
                    console.log('🔍 Columns type:', typeof columns);
                    
                    if (!columns || columns.length === 0) {
                      console.log('⚠️ No columns returned, using hardcoded headers');
                      const hardcodedHeaders = selectedRecordType === 'marriage' 
                        ? ['Groom First Name', 'Groom Last Name', 'Bride First Name', 'Bride Last Name', 'Marriage Date', 'Clergy']
                        : selectedRecordType === 'funeral'
                        ? ['First Name', 'Last Name', 'Date of Death', 'Funeral Date', 'Age', 'Burial Location', 'Clergy']
                        : ['First Name', 'Last Name', 'Birth Date', 'Baptism Date', 'Birthplace', 'Clergy'];
                      
                      return hardcodedHeaders.map((header: string, index: number) => (
                        <TableCell key={index}>
                          <TableSortLabel>
                            {header}
                          </TableSortLabel>
                        </TableCell>
                      ));
                    }
                    
                    console.log('✅ Rendering', columns.length, 'column headers');
                    return columns.map((column: any, index: number) => {
                      console.log('🔍 Rendering column:', column, 'headerName:', column.headerName, 'field:', column.field);
                      return (
                        <TableCell key={index}>
                          <TableSortLabel
                            active={sortConfig.key === column.field}
                            direction={sortConfig.direction}
                            onClick={() => handleSort(column.field)}
                          >
                            {column.headerName || column.field || 'Unknown'}
                          </TableSortLabel>
                        </TableCell>
                      );
                    });
                  })()}
                  <TableCell align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={getColumnDefinitions(selectedRecordType || 'baptism').length + 1} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                      <Box component="span" sx={{ mt: 2, display: 'block' }}>
                        Loading records...
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={getColumnDefinitions(selectedRecordType || 'baptism').length + 1} align="center" sx={{ py: 8 }}>
                      <Box component="span" sx={{ color: 'text.secondary', display: 'block' }}>
                        No records found
                      </Box>
                      <Box component="span" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                        {searchTerm ? 'Try adjusting your search terms' : 'Click "Add Record" to create the first record'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record, index) => (
                    <TableRow key={record.id} hover>
                      {getColumnDefinitions(selectedRecordType || 'baptism').map((column: any, colIndex: number) => (
                        <TableCell key={colIndex}>
                          {getCellValue(record, column)}
                        </TableCell>
                      ))}
                      <TableCell align="center">
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
                )}
              </TableBody>
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
          {editingRecord ? `Edit ${(selectedRecordType || 'baptism').charAt(0).toUpperCase() + (selectedRecordType || 'baptism').slice(1)} Record` : `Add New ${(selectedRecordType || 'baptism').charAt(0).toUpperCase() + (selectedRecordType || 'baptism').slice(1)} Record`}
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
                    disabled={viewMode}
                  />
                  <TextField
                    label="Last Name *"
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
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
                    disabled={viewMode}
                  />
                  <TextField
                    label="Date of Baptism *"
                    type="date"
                    value={formData.dateOfBaptism || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBaptism: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Place of Birth"
                    value={formData.placeOfBirth || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, placeOfBirth: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Place of Baptism"
                    value={formData.placeOfBaptism || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, placeOfBaptism: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Father's Name"
                    value={formData.fatherName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fatherName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Mother's Name"
                    value={formData.motherName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, motherName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Godparent Names"
                    value={formData.godparentNames || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, godparentNames: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Registry Number"
                    value={formData.registryNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, registryNumber: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Priest</InputLabel>
                    <Select
                      label="Priest"
                      value={formData.priest || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, priest: e.target.value }))}
                      disabled={viewMode}
                    >
                      <MenuItem value="">
                        <em>Select a priest...</em>
                      </MenuItem>
                      {priestOptions.map((priest) => (
                        <MenuItem key={priest} value={priest}>
                          {priest}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Church</InputLabel>
                    <Select
                      value={formData.churchId || ''}
                      label="Church"
                      onChange={(e) => setFormData(prev => ({ ...prev, churchId: e.target.value }))}
                      disabled={viewMode}
                    >
                      {churches.filter(c => c.id !== 0).map((church) => (
                        <MenuItem key={church.id} value={church.id}>
                          {church.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Church Name"
                    value={formData.churchName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, churchName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
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
                    disabled={viewMode}
                  />
                  <TextField
                    label="Groom Last Name *"
                    value={formData.groomLastName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, groomLastName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Bride First Name *"
                    value={formData.brideFirstName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, brideFirstName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Bride Last Name *"
                    value={formData.brideLastName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, brideLastName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
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
                    disabled={viewMode}
                  />
                  <TextField
                    label="Marriage Location"
                    value={formData.marriageLocation || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, marriageLocation: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Witness 1"
                    value={formData.witness1 || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, witness1: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Witness 2"
                    value={formData.witness2 || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, witness2: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                {/* Additional/legacy marriage fields */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Groom First Name (Legacy)"
                    value={formData.fname_groom || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fname_groom: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Groom Last Name (Legacy)"
                    value={formData.lname_groom || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lname_groom: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Bride First Name (Legacy)"
                    value={formData.fname_bride || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fname_bride: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Bride Last Name (Legacy)"
                    value={formData.lname_bride || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lname_bride: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Groom Parents"
                    value={formData.parentsg || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentsg: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Bride Parents"
                    value={formData.parentsb || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentsb: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Marriage License"
                    value={formData.mlicense || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, mlicense: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Registry Number"
                    value={formData.registryNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, registryNumber: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Church Name"
                    value={formData.churchName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, churchName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Priest</InputLabel>
                    <Select
                      label="Priest"
                      value={formData.clergy || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, clergy: e.target.value }))}
                      disabled={viewMode}
                    >
                      <MenuItem value="">
                        <em>Select a priest...</em>
                      </MenuItem>
                      {priestOptions.map((priest) => (
                        <MenuItem key={priest} value={priest}>
                          {priest}
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
                  disabled={viewMode}
                />
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
                    disabled={viewMode}
                  />
                  <TextField
                    label="Last Name *"
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
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
                    disabled={viewMode}
                  />
                  <TextField
                    label="Burial Date"
                    type="date"
                    value={formData.burialDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, burialDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Age"
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Burial Location"
                    value={formData.burialLocation || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, burialLocation: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Priest</InputLabel>
                    <Select
                      label="Priest"
                      value={formData.priest || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, priest: e.target.value }))}
                      disabled={viewMode}
                    >
                      <MenuItem value="">
                        <em>Select a priest...</em>
                      </MenuItem>
                      {priestOptions.map((priest) => (
                        <MenuItem key={priest} value={priest}>
                          {priest}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Church</InputLabel>
                    <Select
                      value={formData.churchId || ''}
                      label="Church"
                      onChange={(e) => setFormData(prev => ({ ...prev, churchId: e.target.value }))}
                      disabled={viewMode}
                    >
                      {churches.filter(c => c.id !== 0).map((church) => (
                        <MenuItem key={church.id} value={church.id}>
                          {church.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Church Name"
                    value={formData.churchName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, churchName: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                  <TextField
                    label="Registry Number"
                    value={formData.registryNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, registryNumber: e.target.value }))}
                    sx={{ flex: 1 }}
                    disabled={viewMode}
                  />
                </Stack>
                <TextField
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  disabled={viewMode}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveRecord} 
            variant="contained"
            disabled={loading || viewMode}
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
        recordType={selectedRecordType}
        columnDefs={convertToAgGridColumns(getColumnDefinitions(selectedRecordType || 'baptism'))}
        onRefresh={() => {
          fetchRecords(selectedRecordType || 'baptism', selectedChurch);
          showToast('Records refreshed successfully!', 'success');
        }}
      />
    </Box>
  );
};

export default SSPPOCRecordsPage;
