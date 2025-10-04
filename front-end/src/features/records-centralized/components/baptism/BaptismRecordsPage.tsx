import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
import { listRecords, type TableKey, type SortDir } from '@/shared/lib/recordsApi';
import TableControlPanel from '@/components/TableControlPanel';
import ColorPaletteSelector from '@/components/ColorPaletteSelector';
import { AGGridViewOnly } from '@/components/AGGridViewOnly/AGGridViewOnly';
import { ChurchRecord, RecordType as ChurchRecordType } from '@/types/church-records-advanced.types';
import ImportRecordsButton from '@/components/ImportRecordsButton';
import AdvancedGridDialog from '@/features/tables/AdvancedGridDialog';
import { FIELD_DEFINITIONS, RECORD_TYPES } from '@/features/records-centralized/constants';
import { DynamicRecordsDisplay, mapFieldDefinitionsToDynamicColumns } from '../dynamic';
import { enhancedTableStore } from '../../../../store/enhancedTableStore';

// Types
interface Church {
  id: number;
  church_name: string;
  name?: string;
  email?: string;
  is_active?: boolean;
  has_baptism_records?: boolean;
  has_marriage_records?: boolean;
  has_funeral_records?: boolean;
  setup_complete?: boolean;
  created_at?: string;
  updated_at?: string;
}
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

// Default column definitions fallback
const DEFAULT_COLS: Record<string, { field: string; headerName: string }[]> = {
  baptism: [
    { field: 'first_name',   headerName: 'First Name' },
    { field: 'last_name',    headerName: 'Last Name' },
    { field: 'reception_date', headerName: 'Baptism Date' },
    { field: 'birth_date',   headerName: 'Birth Date' },
    { field: 'birthplace',   headerName: 'Birthplace' },
    { field: 'sponsors',     headerName: 'Sponsors' },
    { field: 'clergy',       headerName: 'Priest' },
  ],
  marriage: [
    { field: 'fname_groom',  headerName: 'Groom First' },
    { field: 'lname_groom',  headerName: 'Groom Last' },
    { field: 'fname_bride',  headerName: 'Bride First' },
    { field: 'lname_bride',  headerName: 'Bride Last' },
    { field: 'mdate',        headerName: 'Marriage Date' },
    { field: 'parentsg',     headerName: 'Groom Parents' },
    { field: 'parentsb',     headerName: 'Bride Parents' },
    { field: 'witness',      headerName: 'Witnesses' },
    { field: 'mlicense',     headerName: 'License' },
    { field: 'clergy',       headerName: 'Priest' },
  ],
  funeral: [
    { field: 'name',           headerName: 'First Name' },
    { field: 'lastname',       headerName: 'Last Name' },
    { field: 'deceased_date',  headerName: 'Date of Death' },
    { field: 'burial_date',    headerName: 'Burial Date' },
    { field: 'age',            headerName: 'Age' },
    { field: 'burial_location',headerName: 'Burial Location' },
    { field: 'clergy',         headerName: 'Priest' },
  ],
};

const safeColumnsFor = (recordType: string) => {
  const fromDefs =
    recordType === 'marriage'
      ? FIELD_DEFINITIONS?.[RECORD_TYPES?.MARRIAGE]?.tableColumns
      : recordType === 'funeral'
      ? FIELD_DEFINITIONS?.[RECORD_TYPES?.FUNERAL]?.tableColumns
      : FIELD_DEFINITIONS?.[RECORD_TYPES?.BAPTISM]?.tableColumns;

  if (Array.isArray(fromDefs) && fromDefs.length) return fromDefs;
  console.warn('[Records] FIELD_DEFINITIONS missing; using defaults for', recordType);
  return DEFAULT_COLS[recordType] ?? DEFAULT_COLS.baptism;
};


// Function to get column definitions based on record type
const getColumnDefinitions = (recordType: string) => {
  return safeColumnsFor(recordType);
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
  const location = useLocation();
  // State management
  const [records, setRecords] = useState<BaptismRecord[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChurch, setSelectedChurch] = useState<number>(46);
  const [selectedRecordType, setSelectedRecordType] = useState<string>('baptism');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dateOfBaptism', direction: 'desc' });
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BaptismRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<BaptismRecord | null>(null);
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
  // Enhanced table theming
  const [enhancedTableState, setEnhancedTableState] = useState(enhancedTableStore.getState());

  useEffect(() => {
    const unsubscribe = enhancedTableStore.subscribe(() => {
      setEnhancedTableState(enhancedTableStore.getState());
    });
    return unsubscribe;
  }, []);

  // Toast helper functions
  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  // API functions


  // Load records when parameters change - using RecordsUIPage pattern
  const fetchRecords = async (recordType: string, churchId?: number) => {
    if (!recordType) return;

    const ctrl = new AbortController();
    
    try {
      setLoading(true);
      setError(null);
      setRecords([]); // Clear immediately to prevent stale data

      // Map record types to table names for the API
      const tableMap: Record<string, TableKey> = {
        'baptism': 'baptism',
        'marriage': 'marriage', 
        'funeral': 'funeral'
      };

      const table = tableMap[recordType];
      if (!table) {
        throw new Error('Invalid record type selected');
      }

      const { rows, count } = await listRecords({
        table,
        churchId: Number(churchId ?? 46),  // ← ensure numeric churchId
        page: 1,
        limit: 1000,
        search: searchTerm,
        sortField: table === 'baptism' ? 'baptismDate'  // UI field names - recordsApi will map them
                 : table === 'marriage' ? 'marriageDate'
                 : 'funeralDate',
        sortDirection: 'desc',
        signal: ctrl.signal
      });

      console.log(`[BaptismRecordsPage] Loaded ${rows.length} ${table} records for church ${churchId}`);

      // Apply the same data normalization as RecordsUIPage
      const firstNonEmpty = (...vals: any[]) =>
        vals.find(v => (Array.isArray(v) ? v.length : v !== null && v !== undefined && String(v).trim?.() !== ''));

      const normalizeList = (v: any): string => {
        if (v == null) return '';
        if (Array.isArray(v)) return v.filter(Boolean).join(', ');
        if (typeof v === 'object') return Object.values(v).filter(Boolean).join(', ');
        return String(v);
      };

      const processedRows = rows.map((row) => {
        if (table === 'baptism') {
          const o = row.originalRecord ?? row;

          const sponsorsRaw = firstNonEmpty(
            o.sponsors, o.sponsor, o.godparents, o.godparentNames,
            [o.godfather, o.godmother].filter(Boolean), row.godparents, row.sponsors
          );
          const parentsRaw = firstNonEmpty(
            o.parents, o.parentsName, [o.fatherName, o.motherName].filter(Boolean),
            o.parents_names, row.parents
          );
          const clergyRaw = firstNonEmpty(
            o.clergy, o.clergyName, o.officiant, o.priestName, o.priest, o.officiating_clergy, row.clergy
          );

          return {
            ...row,
            firstName: o.firstName ?? o.first_name ?? row.firstName ?? '',
            lastName: o.lastName ?? o.last_name ?? row.lastName ?? '',
            dateOfBirth: o.birthDate ?? o.birth_date ?? o.dateOfBirth ?? row.birthDate ?? '',
            dateOfBaptism: o.baptismDate ?? o.reception_date ?? o.dateOfBaptism ?? row.baptismDate ?? '',
            birthplace: o.birthplace ?? o.placeOfBirth ?? row.birthplace ?? '',
            sponsors: normalizeList(sponsorsRaw),
            parents: normalizeList(parentsRaw),
            clergy: normalizeList(clergyRaw),
          };
        }
        return row;
      });

      if (!ctrl.signal.aborted) {
        setRecords(processedRows);
        // Update priest options from the loaded records
        fetchPriestOptions(table, processedRows);
        setPage(0); // Reset pagination when records change
        showToast(`Loaded ${processedRows.length} ${recordType} records`, 'success');
      }

    } catch (err) {
      if (!ctrl.signal.aborted) {
        console.error(`❌ Error fetching ${recordType} records:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch records');
        setRecords([]);
      }
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
      }
    }

    return () => ctrl.abort();
  };

const fetchPriestOptions = (recordType: string, recordsData: any[]) => {
  try {
    console.log(`🔍 Extracting clergy options from ${recordsData.length} ${recordType} records...`);
    
    // Extract unique clergy names from the records
    const clergyNames = new Set<string>();
    
    recordsData.forEach(record => {
      const clergyValue = record.clergy || record.priest;
      if (clergyValue && typeof clergyValue === 'string' && clergyValue.trim() && clergyValue !== 'N/A') {
        clergyNames.add(clergyValue.trim());
      }
    });
    
    // Convert to sorted array
    const sortedClergy = Array.from(clergyNames).sort();
    setPriestOptions(sortedClergy);
    console.log(`✅ Loaded ${sortedClergy.length} unique clergy options:`, sortedClergy);
  } catch (err) {
    console.error('❌ Error extracting priest options:', err);
    setPriestOptions([]);
  }
};

  // Load churches on mount - fetch from API
  useEffect(() => {
    const fetchChurchInfo = async () => {
      try {
        console.log('🏛️ Fetching church information from API...');
        const response = await fetch('/api/church-info', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch church info: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.church) {
          const church: Church = {
            id: data.church.id,
            church_name: data.church.name || data.church.church_name,
            name: data.church.name || data.church.church_name,
            email: data.church.email,
            is_active: data.church.is_active
          };
          
          setChurches([church]);
          console.log('🏛️ Church info loaded:', church.church_name);
          
          // Automatically fetch records for this church
          console.log('🔄 Auto-fetching records...');
          fetchRecords('baptism', church.id);
        } else {
          throw new Error('Invalid church data received');
        }
      } catch (error) {
        console.error('❌ Error fetching church info:', error);
        // Fallback to hardcoded church 46 if API fails
        const fallbackChurch: Church = {
          id: 46,
          church_name: 'Saints Peter & Paul',
          name: 'Saints Peter & Paul',
        };
        setChurches([fallbackChurch]);
        console.log('🏛️ Using fallback church setup');
        fetchRecords('baptism', 46);
      }
    };

    fetchChurchInfo();
  }, []);

  useEffect(() => {
    if (selectedRecordType) {
      fetchRecords(selectedRecordType, selectedChurch);
      // fetchPriestOptions will be called when records are loaded
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
    churchId: selectedChurch === 0 ? '46' : selectedChurch.toString(),
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
      churchId: selectedChurch === 0 ? '46' : selectedChurch.toString(),
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
  console.log('Viewing record:', record);
  setViewingRecord(record);
  setEditingRecord(null); // Clear editing mode
  setFormData(record); // Set form data for display
  setDialogOpen(true);

  let recordName = '';
  if (selectedRecordType === 'marriage') {
    const groomName = `${record.fname_groom || ''} ${record.lname_groom || ''}`.trim();
    const brideName = `${record.fname_bride || ''} ${record.lname_bride || ''}`.trim();
    recordName = `${groomName} & ${brideName}`;
  } else {
    recordName = `${record.firstName} ${record.lastName}`;
  }
  showToast(`Viewing record: ${recordName}`, 'info');
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
      setFormData(prev => ({ ...prev, churchId: '46' }));
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
                      onChange={(e) => setSelectedChurch(Number(e.target.value))}  // ← force number
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
                ): (
                  <>
                    {/* Dynamic Records Display - Replaces legacy table implementation */}
                    <DynamicRecordsDisplay
                      records={filteredAndSortedRecords}
                      columns={mapFieldDefinitionsToDynamicColumns(selectedRecordType)}
                      inferColumns={true}
                      layout={(new URLSearchParams(location.search).get("layout") as any) || "table"}
                      initialSort={{ field: "reception_date", direction: "desc" }}
                      dateFields={["reception_date", "birth_date", "created_at", "updated_at"]}
                      hiddenFields={["id", "church_id"]}
                      onSortChange={(model) => console.log("sort", model)}
                      loading={loading}
                      onView={handleViewRecord}
                      onEdit={handleEditRecord}
                      onDelete={(id) => {
                        console.log("Delete record:", id);
                        // TODO: Implement delete functionality
                      }}
                      maxHeight={600}
                      themeTokens={enhancedTableState.tokens}
                      fieldRules={enhancedTableState.fieldRules}
                      emptyMessage={searchTerm ? "No records match your search" : "No records found. Click \"Add Record\" to create the first record"}
                    />
                  </>
                )}

              </Paper>
            )}
            {/* Add/Edit Dialog */}
            <Dialog 
              open={dialogOpen} 
              onClose={() => {
                setDialogOpen(false);
                setViewingRecord(null);
                setEditingRecord(null);
              }}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>
                {viewingRecord ? `View ${selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record` : editingRecord ? `Edit ${selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record` : `Add New ${selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record`}
              </DialogTitle>
              <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                  {selectedRecordType === 'baptism' && (
                    <>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          disabled={!!viewingRecord}
                          label="First Name *"
                          value={formData.firstName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          disabled={!!viewingRecord}
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
                          disabled={!!viewingRecord}
                          label="First Name *"
                          value={formData.firstName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          disabled={!!viewingRecord}
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
                {viewingRecord ? (
                  // View mode - only show Close button
                  <Button onClick={() => {
                    setDialogOpen(false);
                    setViewingRecord(null);
                  }}>Close</Button>
                ) : (
                  // Edit/Add mode - show Cancel and Save buttons
                  <>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleSaveRecord}
                      variant="contained"
                      disabled={loading}
                    >
                      {loading ? <CircularProgress size={20} /> : "Save"}
                    </Button>
                  </>
                )}
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
