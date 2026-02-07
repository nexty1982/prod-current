import { registerAgGridModulesOnce } from '@/agGridModules';
import ColorPaletteSelector from '@/components/ColorPaletteSelector';
import TableControlPanel from '@/components/TableControlPanel';
import { recordsEvents, useRecordsEvents } from '@/events/recordsEvents';
import ModernRecordViewerModal from '@/features/records-centralized/common/ModernRecordViewerModal';
import { getAgGridRowClassRules, getRecordRowStyle, useNowReference } from '@/features/records-centralized/common/recordsHighlighting';
import '@/features/records-centralized/common/recordsHighlighting.css';
import { usePersistedRowSelection } from '@/features/records-centralized/common/usePersistedRowSelection';
import { createRecordsApiService } from '@/features/records-centralized/components/records/RecordsApiService';
import { FIELD_DEFINITIONS, RECORD_TYPES } from '@/features/records-centralized/constants';
import AdvancedGridDialog from '@/features/tables/AdvancedGridDialog';
import { getPersistedChurchId, useRecordsPersistence } from '@/hooks/useRecordsPersistence';
import churchService, { Church } from '@/shared/lib/churchService';
import { useTableStyleStore } from '@/store/useTableStyleStore';
import { ChurchRecord } from '@/types/church-records-advanced.types';
import { formatRecordDate } from '@/utils/formatDate';
import {
  Add as AddIcon,
  Description as CertificateIcon,
  PeopleAlt as CollaborativeIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  GetApp as ExportIcon,
  ExpandLess as IconChevronUp,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Palette as PaletteIcon,
  Assessment as ReportIcon,
  Search as SearchIcon,
  TableChart as TableChartIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AgGridReact } from 'ag-grid-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

registerAgGridModulesOnce();

// Helper to safely parse JSON fields (godparents, witnesses)
const parseJsonField = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      // If not valid JSON, return as single item array
      return value.trim() ? [value] : [];
    }
  }
  return [];
};

// Helper to display JSON array fields as comma-separated string
const displayJsonField = (value: any): string => {
  const arr = parseJsonField(value);
  return arr.length > 0 ? arr.join(', ') : '';
};

// Types - Updated to match production schema (05_sacrament_tables.sql)
interface BaptismRecord {
  id: string;
  // Production schema fields (person_*)
  person_first?: string;
  person_middle?: string;
  person_last?: string;
  person_full?: string;
  // Legacy field names for backwards compatibility
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  // Date fields
  birth_date?: string;
  baptism_date?: string;
  dateOfBirth?: string;
  dateOfBaptism?: string;
  reception_date?: string;
  // Location fields
  place_name?: string;
  placeOfBirth?: string;
  placeOfBaptism?: string;
  birthplace?: string;
  // Parent fields
  father_name?: string;
  mother_name?: string;
  fatherName?: string;
  motherName?: string;
  // Godparents - JSON in production, string in legacy
  godparents?: string | string[];
  godparentNames?: string;
  sponsors?: string;
  // Officiant field
  officiant_name?: string;
  priest?: string;
  clergy?: string;
  // Registry fields
  certificate_no?: string;
  book_no?: string;
  page_no?: string;
  entry_no?: string;
  registryNumber?: string;
  // Metadata fields (production schema)
  source_system?: string;
  source_row_id?: string;
  source_hash?: string;
  // Church fields
  churchId?: string;
  church_id?: number;
  churchName?: string;
  notes?: string;
  // Marriage record fields
  groom_first?: string;
  groom_middle?: string;
  groom_last?: string;
  groom_full?: string;
  fname_groom?: string;
  lname_groom?: string;
  bride_first?: string;
  bride_middle?: string;
  bride_last?: string;
  bride_full?: string;
  fname_bride?: string;
  lname_bride?: string;
  marriage_date?: string;
  mdate?: string;
  parentsg?: string;
  parentsb?: string;
  witness?: string;
  witnesses?: string | string[];
  mlicense?: string;
  // Additional marriage fields for form
  groomFirstName?: string;
  groomLastName?: string;
  brideFirstName?: string;
  brideLastName?: string;
  marriageDate?: string;
  marriageLocation?: string;
  witness1?: string;
  witness2?: string;
  // Funeral record fields (production: deceased_*)
  deceased_first?: string;
  deceased_middle?: string;
  deceased_last?: string;
  deceased_full?: string;
  death_date?: string;
  funeral_date?: string;
  burial_place?: string;
  cause_of_death?: string;
  dateOfDeath?: string;
  burialDate?: string;
  burial_date?: string;
  age?: string;
  burialLocation?: string;
  burial_location?: string;
  name?: string;
  lastname?: string;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
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
// Updated to support production schema (05_sacrament_tables.sql) with formatRecordDate
const getCellValue = (record: any, column: any) => {
  if (column.valueGetter) {
    try {
      return column.valueGetter({ data: record });
    } catch (error) {
      // If valueGetter fails, fall through to switch statement
      console.warn('valueGetter failed:', error);
    }
  }
  
  // Handle all field mappings with fallbacks - support both production and legacy schemas
  switch (column.field) {
    // ═══════════════════════════════════════════════════════════════
    // BAPTISM RECORD MAPPINGS (Saints Peter & Paul schema)
    // first_name, last_name, birth_date, reception_date, birthplace,
    // entry_type, sponsors, parents, clergy
    // ═══════════════════════════════════════════════════════════════
    case 'first_name':
    case 'person_first':
      return record.person_first || record.first_name || record.firstName || '';
    case 'middle_name':
    case 'person_middle':
      return record.person_middle || record.middle_name || '';
    case 'last_name':
    case 'person_last':
      return record.person_last || record.last_name || record.lastName || '';
    case 'person_full':
      // Generated column in production, compute if not present
      if (record.person_full) return record.person_full;
      const bapFirst = record.person_first || record.first_name || record.firstName || '';
      const bapMiddle = record.person_middle || '';
      const bapLast = record.person_last || record.last_name || record.lastName || '';
      return [bapFirst, bapMiddle, bapLast].filter(Boolean).join(' ').trim() || '';
    case 'clergy':
    case 'officiant_name':
      return record.officiant_name || record.clergy || record.priest || '';
    case 'reception_date':
    case 'baptism_date':
      return formatRecordDate(record.baptism_date || record.reception_date || record.dateOfBaptism) || '';
    case 'birth_date':
      return formatRecordDate(record.birth_date || record.dateOfBirth) || '';
    case 'birthplace':
    case 'place_name':
      return record.place_name || record.birthplace || record.placeOfBirth || record.placeOfBaptism || '';
    case 'sponsors':
    case 'godparents':
      // Handle JSON godparents array from production or string from legacy
      return displayJsonField(record.godparents) || record.sponsors || record.godparentNames || '';
    case 'entry_type':
      // Check all possible field names: snake_case, camelCase, and _originalRecord
      return record.entry_type || record.entryType || record._originalRecord?.entry_type || record.originalRecord?.entry_type || '';
    case 'parents':
      // Combined parents field - may be stored as single field or computed from father/mother
      if (record.parents) return record.parents;
      const father = record.father_name || record.fatherName || '';
      const mother = record.mother_name || record.motherName || '';
      if (father && mother) return `${father} & ${mother}`;
      return father || mother || '';
    case 'father_name':
      return record.father_name || record.fatherName || '';
    case 'mother_name':
      return record.mother_name || record.motherName || '';
    
    // ═══════════════════════════════════════════════════════════════
    // MARRIAGE RECORD MAPPINGS (Saints Peter & Paul schema)
    // fname_groom, lname_groom, fname_bride, lname_bride, mdate,
    // parentsg, parentsb, witness, mlicense, clergy
    // ═══════════════════════════════════════════════════════════════
    case 'fname_groom':
    case 'groom_first':
      return record.fname_groom || record.groom_first || record.groomFirstName || '';
    case 'groom_middle':
      return record.groom_middle || '';
    case 'lname_groom':
    case 'groom_last':
      return record.lname_groom || record.groom_last || record.groomLastName || '';
    case 'groom_full':
      if (record.groom_full) return record.groom_full;
      const gFirst = record.fname_groom || record.groom_first || record.groomFirstName || '';
      const gMiddle = record.groom_middle || '';
      const gLast = record.lname_groom || record.groom_last || record.groomLastName || '';
      return [gFirst, gMiddle, gLast].filter(Boolean).join(' ').trim() || '';
    case 'fname_bride':
    case 'bride_first':
      return record.fname_bride || record.bride_first || record.brideFirstName || '';
    case 'bride_middle':
      return record.bride_middle || '';
    case 'lname_bride':
    case 'bride_last':
      return record.lname_bride || record.bride_last || record.brideLastName || '';
    case 'bride_full':
      if (record.bride_full) return record.bride_full;
      const bFirst = record.fname_bride || record.bride_first || record.brideFirstName || '';
      const bMiddle = record.bride_middle || '';
      const bLast = record.lname_bride || record.bride_last || record.brideLastName || '';
      return [bFirst, bMiddle, bLast].filter(Boolean).join(' ').trim() || '';
    case 'mdate':
    case 'marriage_date':
      return formatRecordDate(record.mdate || record.marriage_date || record.marriageDate) || '';
    case 'marriage_place':
      return record.place_name || record.marriage_place || record.marriageLocation || '';
    case 'parentsg':
      return record.parentsg || record.groomParents || '';
    case 'parentsb':
      return record.parentsb || record.brideParents || '';
    case 'witness':
    case 'witnesses':
      // Handle JSON witnesses array from production or string from legacy
      return displayJsonField(record.witnesses) || record.witness || '';
    case 'mlicense':
      return record.mlicense || record.marriageLicense || '';
    
    // ═══════════════════════════════════════════════════════════════
    // FUNERAL RECORD MAPPINGS (Saints Peter & Paul - actual MySQL columns)
    // Table columns: name, lastname, deceased_date, burial_date, 
    //                age, clergy, burial_location
    // ═══════════════════════════════════════════════════════════════
    case 'name':
      // For funeral records, 'name' is the deceased's first name
      return record.name || record.firstName || record.first_name || '';
    case 'lastname':
      return record.lastname || record.lastName || record.last_name || '';
    case 'deceased_date':
      return formatRecordDate(record.deceased_date || record.date_of_death || record.dateOfDeath) || '';
    case 'burial_date':
      // Check all possible field names: snake_case, camelCase, and _originalRecord
      return formatRecordDate(
        record.burial_date || 
        record.burialDate || 
        record.dateOfFuneral ||  // Backend transformer uses this name
        record._originalRecord?.burial_date ||
        record.originalRecord?.burial_date
      ) || '';
    case 'age':
      return record.age || '';
    case 'burial_location':
      return record.burial_location || record.burialLocation || record.cemetery || '';
    // Legacy field support
    case 'deceased_full':
      if (record.deceased_full) return record.deceased_full;
      const dFirst = record.name || record.firstName || record.first_name || '';
      const dLast = record.lastname || record.lastName || record.last_name || '';
      return [dFirst, dLast].filter(Boolean).join(' ').trim() || '';
    case 'notes':
      return record.notes || record.note || '';
    
    // ═══════════════════════════════════════════════════════════════
    // METADATA FIELDS (production schema)
    // ═══════════════════════════════════════════════════════════════
    case 'source_system':
      return record.source_system || '';
    case 'source_hash':
      return record.source_hash || '';
    case 'source_row_id':
      return record.source_row_id || '';
    case 'certificate_no':
      return record.certificate_no || record.registryNumber || '';
    case 'book_no':
      return record.book_no || '';
    case 'page_no':
      return record.page_no || '';
    case 'entry_no':
      return record.entry_no || '';
    
    default:
      // For any other fields not explicitly mapped
      // Check if it's a date field by name pattern
      const isDateField = column.field && (
        column.field.includes('date') || 
        column.field.includes('Date') ||
        column.field.includes('_date')
      );
      if (isDateField || column.cellRenderer === 'dateRenderer') {
        return formatRecordDate(record[column.field]) || '';
      }
      const value = record[column.field];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
      return '';
  }
};

// Mock data removed - now using live API calls

const BaptismRecordsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // State management
  const [records, setRecords] = useState<BaptismRecord[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChurch, setSelectedChurch] = useState<number>(() => {
    // Initialize with persisted church ID
    return getPersistedChurchId() || 0;
  });
  const [selectedRecordType, setSelectedRecordType] = useState<string>(() => {
    // Initialize from URL parameter first, then fall back to 'baptism'
    const typeFromUrl = searchParams.get('type');
    return typeFromUrl || 'baptism';
  });
  
  // Enable persistence for church selection and last view
  useRecordsPersistence(
    selectedChurch,
    selectedRecordType,
    setSelectedChurch,
    setSelectedRecordType
  );
  
  // Auto-refresh when records change (create/update/delete)
  useRecordsEvents((event) => {
    if (event.churchId === selectedChurch && event.recordType === selectedRecordType) {
      console.log(`📡 Auto-refreshing ${selectedRecordType} records after ${event.mutationType}`);
      fetchRecords(selectedRecordType, selectedChurch);
    }
  }, [selectedChurch, selectedRecordType]);
  
  // Row selection persistence
  const {
    handleRowSelect,
    clearSelection,
    isRecordSelected,
    scrollToSelectedRecord,
  } = usePersistedRowSelection({
    churchId: selectedChurch,
    recordType: selectedRecordType as any,
    records,
    onRecordNotFound: () => {
      showToast('Last selected record is not on this page', 'info');
    },
  });
  
  // Stable "now" reference for 24h highlighting (updates every 60s)
  const nowReference = useNowReference();
  
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

  // View Details Dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [viewingRecord, setViewingRecord] = useState<BaptismRecord | null>(null);
  const [viewingRecordIndex, setViewingRecordIndex] = useState<number>(-1);

  // Collapsible Panel State
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState<boolean>(false);

  // Toast state
  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');

  // Theme hook for dark mode detection
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Toast helper functions
  const showToast = useCallback((message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  }, []);

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
          limit: 100, // Reduced from 1000 for better performance
          search: searchTerm
        });
      } else {
        // Fetch all records across all churches using the direct API
        const response = await fetch(`/api/${selectedType.apiEndpoint}-records?limit=100&search=${encodeURIComponent(searchTerm)}`);
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
      showToast(`Loaded ${recordCount} ${selectedType.label.toLowerCase()}`, 'success');
      
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error fetching ${recordType} records:`, err);
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
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
      
      const response = await fetch(`/api/${selectedType.apiEndpoint}-records/dropdown-options/clergy?table=${tableName}`);
      const data = await response.json();
      
      if (data && data.values) {
        // Filter out null/empty values and sort alphabetically
        const validPriests = data.values
          .filter((priest: string) => priest && priest.trim() !== '')
          .sort((a: string, b: string) => a.localeCompare(b));
        
        setPriestOptions(validPriests);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching priest options:', err);
      }
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
    churchId: selectedChurch ? selectedChurch.toString() : '',
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
      churchId: selectedChurch ? selectedChurch.toString() : '',
      notes: '',
      customPriest: false,
    });
    setDialogOpen(true);
  };

  const handleEditRecord = useCallback((record: BaptismRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setDialogOpen(true);
  }, []);

  const handleViewRecord = useCallback((record: BaptismRecord) => {
    // Find the index of the record in the filtered list for navigation
    const index = filteredAndSortedRecords.findIndex(r => r.id === record.id);
    setViewingRecord(record);
    setViewingRecordIndex(index);
    setViewDialogOpen(true);
  }, [filteredAndSortedRecords]);

  // Navigate to previous record in View Details dialog
  const handlePreviousRecord = () => {
    if (viewingRecordIndex > 0) {
      const prevIndex = viewingRecordIndex - 1;
      setViewingRecord(filteredAndSortedRecords[prevIndex]);
      setViewingRecordIndex(prevIndex);
    }
  };

  // Navigate to next record in View Details dialog
  const handleNextRecord = () => {
    if (viewingRecordIndex < filteredAndSortedRecords.length - 1) {
      const nextIndex = viewingRecordIndex + 1;
      setViewingRecord(filteredAndSortedRecords[nextIndex]);
      setViewingRecordIndex(nextIndex);
    }
  };

  // Close View Details dialog
  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setViewingRecord(null);
    setViewingRecordIndex(-1);
  };

  // Edit from View Details dialog
  const handleEditFromView = () => {
    if (viewingRecord) {
      handleCloseViewDialog();
      handleEditRecord(viewingRecord);
    }
  };

  // Generate Certificate (for baptism and marriage records)
  const handleGenerateCertificate = useCallback(() => {
    if (!viewingRecord) return;
    
    // Navigate to certificate generation page with record data
    // Use churchId from record, selectedChurch, or first available church
    let churchId = viewingRecord.church_id || selectedChurch;
    if (!churchId || churchId === 0) {
      // Fallback to first available church from the churches list
      churchId = churches.length > 0 ? churches[0].id : 46;
    }
    const certUrl = `/apps/certificates/generate?recordType=${selectedRecordType}&recordId=${viewingRecord.id}&churchId=${churchId}`;
    window.open(certUrl, '_blank');
  }, [viewingRecord, selectedChurch, selectedRecordType, churches]);

  // Collaborative Report handler
  const handleCollaborativeReport = useCallback(() => {
    // Navigate to interactive report page with selected records context
    window.open(`/apps/interactive-reports?type=${selectedRecordType}&churchId=${selectedChurch}`, '_blank');
    showToast('Opening Collaborative Report tool', 'info');
  }, [selectedRecordType, selectedChurch, showToast]);

  // Get record display name for View Details title
  const getRecordDisplayName = (record: BaptismRecord | null): string => {
    if (!record) return '';
    
    if (selectedRecordType === 'marriage') {
      const groomName = `${record.fname_groom || record.groom_first || ''} ${record.lname_groom || record.groom_last || ''}`.trim();
      const brideName = `${record.fname_bride || record.bride_first || ''} ${record.lname_bride || record.bride_last || ''}`.trim();
      return `${groomName} & ${brideName}`;
    } else if (selectedRecordType === 'funeral') {
      return `${record.deceased_first || record.firstName || ''} ${record.deceased_last || record.lastName || ''}`.trim();
    } else {
      return `${record.person_first || record.firstName || ''} ${record.person_last || record.lastName || ''}`.trim();
    }
  };

  const handleDeleteRecord = useCallback(async (recordId: string, recordChurchId?: number) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        setLoading(true);

        // Use the record's own church_id, fall back to selected church
        const churchId = recordChurchId || selectedChurch;
        
        // Validate church ID
        if (!churchId || churchId === 0) {
          showToast('Please select a church before deleting records', 'error');
          setLoading(false);
          return;
        }
        
        const apiService = createRecordsApiService(churchId.toString());
        
        // Call the backend API
        const response = await apiService.deleteRecord(selectedRecordType, recordId);
        
        if (response.success) {
          showToast('Record deleted successfully!', 'success');
          
          // Emit event for auto-refresh (no need to manually call fetchRecords)
          recordsEvents.emit({
            churchId: selectedChurch,
            recordType: selectedRecordType as any,
            mutationType: 'delete',
            recordId: recordId
          });
        } else {
          showToast(response.error || 'Failed to delete record', 'error');
        }
      } catch (error: any) {
        console.error('Error deleting record:', error);
        showToast(error.message || 'Failed to delete record', 'error');
      } finally {
        setLoading(false);
      }
    }
  }, [showToast, selectedChurch, selectedRecordType]);

  // Memoized AG Grid column definitions to prevent infinite re-renders
  const agGridColumnDefs = useMemo(() => {
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
      minWidth: 180,
      width: 180,
      maxWidth: 180,
      sortable: false,
      filter: false,
      pinned: 'right',
      cellRenderer: 'agGridActionsRenderer',
    });
    return cols;
  }, [selectedRecordType]);

  // Memoized AG Grid components - defined after handlers to avoid "used before declaration" error
  const agGridComponents = useMemo(() => ({
    agGridActionsRenderer: (params: ICellRendererParams) => {
      const record = params.data;
      if (!record) return null;
      return (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>          <Tooltip title="View">
            <IconButton size="small" onClick={() => handleViewRecord(record)} sx={{ color: isDarkMode ? 'primary.light' : 'primary.main' }}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleEditRecord(record)} sx={{ color: isDarkMode ? 'warning.light' : 'warning.main' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => handleDeleteRecord(record.id, record.church_id)} sx={{ color: isDarkMode ? 'error.light' : 'error.main' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {(selectedRecordType === 'baptism' || selectedRecordType === 'marriage') && (
            <Tooltip title="Certificate">
              <IconButton size="small" onClick={() => handleGenerateCertificate()} sx={{ color: isDarkMode ? 'success.light' : 'success.main' }}>
                <CertificateIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      );
    },
  }), [selectedRecordType, isDarkMode]);

  const handleSaveRecord = async () => {
    try {
      setLoading(true);
      
      // Record-type specific validation
      let validationError = '';
      
      if (selectedRecordType === 'marriage') {
        // Marriage records require: groom/bride names, marriage date
        if (!formData.groomFirstName || !formData.groomLastName || 
            !formData.brideFirstName || !formData.brideLastName || 
            !formData.marriageDate) {
          validationError = 'Please fill in groom names, bride names, and marriage date';
        }
      } else if (selectedRecordType === 'funeral') {
        // Funeral records require: deceased name, death date
        if (!formData.deceasedFirstName || !formData.deceasedLastName || 
            !formData.deathDate) {
          validationError = 'Please fill in deceased name and death date';
        }
      } else {
        // Baptism records require: first name, last name, baptism date
        if (!formData.firstName || !formData.lastName || !formData.dateOfBaptism) {
          validationError = 'Please fill in first name, last name, and baptism date';
        }
      }
      
      if (validationError) {
        showToast(validationError, 'error');
        return;
      }

      const churchName = churches.find(c => c.id.toString() === formData.churchId)?.church_name || '';
      const churchId = formData.churchId || (formData as any).church_id?.toString() || (selectedChurch ? selectedChurch.toString() : '');
      
      // Validate church ID
      if (!churchId || churchId === '0' || churchId === '') {
        showToast('Please select a church before saving records', 'error');
        setLoading(false);
        return;
      }
      
      const apiService = createRecordsApiService(churchId);
      
      if (editingRecord) {
        // Update existing record
        const updatedRecord: BaptismRecord = {
          ...editingRecord,
          ...formData,
          churchName,
          updatedAt: new Date().toISOString(),
        } as BaptismRecord;
        
        // Call the backend API
        const response = await apiService.updateRecord(selectedRecordType, editingRecord.id, updatedRecord);
        
        if (response.success && response.data) {
          setRecords(prev => prev.map(r => r.id === editingRecord.id ? response.data as BaptismRecord : r));
          showToast('Record updated successfully', 'success');
          setDialogOpen(false);
          
          // Emit event for auto-refresh
          recordsEvents.emit({
            churchId: selectedChurch,
            recordType: selectedRecordType as any,
            mutationType: 'update',
            recordId: editingRecord.id
          });
        } else {
          showToast(response.error || 'Failed to update record', 'error');
        }
      } else {
        // Create new record - map fields based on record type
        let newRecord: any = {
          ...formData,
          churchName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Map funeral record fields to backend schema
        if (selectedRecordType === 'funeral') {
          newRecord = {
            firstName: formData.deceasedFirstName || formData.firstName,
            lastName: formData.deceasedLastName || formData.lastName,
            dateOfDeath: formData.deathDate || formData.dateOfDeath,
            burialDate: formData.burialDate,
            age: formData.age,
            priest: formData.priest,
            burialLocation: formData.burialLocation,
            church_id: churchId,
          };
        }
        
        // Call the backend API
        const response = await apiService.createRecord(selectedRecordType, newRecord);
        
        if (response.success && response.data) {
          setRecords(prev => [...prev, response.data as BaptismRecord]);
          showToast('Record created successfully', 'success');
          setDialogOpen(false);
          
          // Set the newly created record as selected
          handleRowSelect(response.data.id);
          
          // Emit event for auto-refresh
          recordsEvents.emit({
            churchId: selectedChurch,
            recordType: selectedRecordType as any,
            mutationType: 'create',
            recordId: response.data.id
          });
        } else {
          showToast(response.error || 'Failed to create record', 'error');
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save record', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to Interactive Reports with pre-selected record type
  const handleGenerateReport = () => {
    const reportUrl = `/apps/interactive-reports/create?recordType=${selectedRecordType}&churchId=${selectedChurch?.id || ""}`;
    window.location.href = reportUrl;
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
          {/* Professional Header Section */}
          {!isFiltersCollapsed && (
            <Card 
              elevation={2}
              sx={{ 
                mb: 3,
                background: (theme) => theme.palette.mode === 'dark' 
                  ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: 2,
                overflow: 'visible'
              }}
            >
              <CardContent sx={{ pb: 2 }}>
                {/* Header with Collapse Button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography 
                      variant="h4" 
                      component="h1"
                      sx={{ 
                        fontWeight: 700,
                        background: (theme) => theme.palette.mode === 'dark'
                          ? 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)'
                          : 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 0.5
                      }}
                    >
                      Records Management System
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manage church records with advanced filtering and reporting
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Theme Status Chips */}
                    <Chip
                      icon={<PaletteIcon />}
                      label={currentTheme}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        borderColor: tableTheme.headerColor,
                        color: tableTheme.headerColor,
                        '& .MuiChip-icon': { color: tableTheme.headerColor },
                        fontWeight: 600
                      }}
                    />
                    {isLiturgicalMode && (
                      <Chip
                        label="Liturgical"
                        size="small"
                        color="secondary"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                    <IconButton
                      onClick={() => setIsFiltersCollapsed(true)}
                      size="small"
                      sx={{ 
                        ml: 1,
                        transition: 'transform 0.2s ease-in-out',
                      }}
                    >
                      <IconChevronUp />
                    </IconButton>
                  </Box>
                </Box>
                
                {/* Collapsible Content */}
                <Collapse in={!isFiltersCollapsed}>
                  <Box>
                    <Stack spacing={3}>
                      {/* Church and Record Type Selection */}
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                        {/* Show static church name if user has only one church, otherwise show dropdown */}
                        {churches.filter(c => c.id !== 0).length === 1 ? (
                          <Box sx={{ 
                            minWidth: 250, 
                            display: 'flex', 
                            alignItems: 'center',
                            p: 2,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            borderRadius: 1,
                            boxShadow: 1
                          }}>
                            <Typography variant="body1" fontWeight={700}>
                              {churches.find(c => c.id !== 0)?.church_name || 'Church'}
                            </Typography>
                          </Box>
                        ) : (
                          <FormControl sx={{ minWidth: 250 }} size="small">
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
                        )}
                        
                        <FormControl sx={{ minWidth: 250 }} size="small">
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
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            px: 2,
                            py: 1,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              {recordTypes.find(type => type.value === selectedRecordType)?.label}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                      
                      {/* Search and Action Buttons (only show when record type is selected) */}
                      {selectedRecordType && (
                        <>
                          {/* Search Bar */}
                          <TextField
                            label="Search Records"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                            size="small"
                            fullWidth
                            disabled={loading}
                            sx={{ maxWidth: 500 }}
                          />
                          
                          {/* Action Buttons - Compact Icon Buttons */}
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                              Quick Actions
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                              <Tooltip title="Add New Record">
                                <IconButton
                                  onClick={handleAddRecord}
                                  disabled={loading}
                                  sx={{ 
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground' }
                                  }}
                                >
                                  <AddIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Import Records">
                                <IconButton
                                  onClick={() => {/* TODO: Import functionality */}}
                                  disabled={loading}
                                  sx={{ 
                                    bgcolor: 'success.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'success.dark' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground' }
                                  }}
                                >
                                  <AddIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Customize Table Theme">
                                <IconButton
                                  onClick={() => setThemeDrawerOpen(true)}
                                  disabled={loading}
                                  sx={{ 
                                    bgcolor: 'warning.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'warning.dark' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground' }
                                  }}
                                >
                                  <PaletteIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Advanced Grid Options">
                                <IconButton
                                  onClick={() => setAdvancedGridOpen(true)}
                                  disabled={loading}
                                  sx={{ 
                                    bgcolor: 'secondary.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'secondary.dark' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground' }
                                  }}
                                >
                                  <TableChartIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title={useAgGrid ? 'Switch to Standard View' : 'Switch to AG Grid'}>
                                <IconButton
                                  onClick={() => setUseAgGrid(!useAgGrid)}
                                  disabled={loading}
                                  sx={{ 
                                    bgcolor: useAgGrid ? 'action.selected' : 'action.hover',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: 'action.selected' }
                                  }}
                                >
                                  {useAgGrid ? <LockIcon /> : <LockOpenIcon />}
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Export Records">
                                <IconButton
                                  onClick={handleExport}
                                  disabled={loading}
                                  sx={{ 
                                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.700' : 'grey.600',
                                    color: 'white',
                                    '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.700' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground' }
                                  }}
                                >
                                  <ExportIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Generate Report">
                                <IconButton
                                  onClick={handleGenerateReport}
                                  disabled={loading || !selectedRecordType}
                                  sx={{ 
                                    bgcolor: 'info.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'info.dark' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground' }
                                  }}
                                >
                                  <ReportIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Collaborative Report">
                                <IconButton
                                  onClick={handleCollaborativeReport}
                                  disabled={loading}
                                  sx={{ 
                                    bgcolor: (theme) => theme.palette.mode === 'dark' ? '#00ACC1' : '#00BCD4',
                                    color: 'white',
                                    '&:hover': { bgcolor: '#0097A7' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground' }
                                  }}
                                >
                                  <CollaborativeIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Box>
                        </>
                      )}
                    </Stack>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )}
          
          {/* Collapsed Header Button */}
          {isFiltersCollapsed && (
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => setIsFiltersCollapsed(false)}
                startIcon={<IconChevronUp sx={{ transform: 'rotate(180deg)' }} />}
                sx={{ 
                  borderRadius: 2,
                  px: 3,
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)'
                    : 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
                }}
              >
                Show Filters & Actions
              </Button>
            </Box>
          )}
                
          {/* Status Information */}
          {selectedRecordType && (
            <Box sx={{ mb: 2 }}>
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
            </Box>
          )}
          
          {/* Instructions when no selection */}
          {!selectedRecordType && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Please select a church and record type to view records.
            </Alert>
          )}

          {/* Records Table - Only show when record type is selected */}
            {selectedRecordType && (
              <>
                {/* Row Highlighting Legend */}
                <Box sx={{ mb: 1, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label="New (24h)"
                    sx={{
                      backgroundColor: 'rgba(76, 175, 80, 0.15)',
                      borderLeft: '3px solid #4caf50',
                      fontWeight: 500,
                    }}
                  />
                  <Chip
                    size="small"
                    label="Updated (24h)"
                    sx={{
                      backgroundColor: 'rgba(255, 193, 7, 0.15)',
                      borderLeft: '3px solid #ffc107',
                      fontWeight: 500,
                    }}
                  />
                  <Chip
                    size="small"
                    label="Selected"
                    sx={{
                      backgroundColor: 'rgba(33, 150, 243, 0.15)',
                      borderLeft: '3px solid #2196f3',
                      fontWeight: 500,
                    }}
                  />
                  {clearSelection && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={clearSelection}
                      sx={{ ml: 'auto', fontSize: '0.75rem' }}
                    >
                      Clear Selection
                    </Button>
                  )}
                </Box>
                
                <Paper className="theme-orthodox-traditional" sx={{ 
                  width: '100%', 
                  maxWidth: '100%', 
                  margin: 0,
                  marginLeft: 0,
                  marginRight: 0,
                  textAlign: 'left',
                  overflow: 'hidden',
                  // Responsive padding
                  p: { xs: 0, sm: 1, md: 2 },
                }}>

                  {/* Conditional Table Rendering */}
                {useAgGrid ? (
                  // AG Grid View
                  <Box sx={{ height: 600, width: '100%' }} className={isDarkMode ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'}>
                    <AgGridReact
                      rowData={filteredAndSortedRecords}
                      columnDefs={agGridColumnDefs}
                      components={agGridComponents}
                      defaultColDef={{
                        resizable: true,
                        sortable: true,
                        filter: true,
                      }}
                      getRowId={(params) => String(params.data.id)}
                      rowClassRules={getAgGridRowClassRules(isRecordSelected, nowReference)}
                      onRowClicked={(event) => handleRowSelect(event.data.id)}
                      pagination={true}
                      paginationPageSize={25}
                      paginationPageSizeSelector={[10, 25, 50, 100]}
                      animateRows={true}
                      domLayout="normal"
                    />
                  </Box>
                ) : (
                  // Standard Material-UI Table View
                  <TableContainer sx={{ 
                    textAlign: 'left', 
                    width: '100%',
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': {
                      height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: 'rgba(0,0,0,0.1)',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderRadius: '4px',
                    },
                  }}>
                  <Table stickyHeader sx={{ minWidth: 650 }}>
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
                        <TableCell sx={{ 
                          ...getTableCellStyle('header'), 
                          minWidth: '150px',
                          position: 'sticky',
                          right: 0,
                          backgroundColor: getTableHeaderStyle().backgroundColor || '#1976d2',
                          zIndex: 2,
                        }} align="center">
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
                            onClick={(e) => {
                              // Handle row selection
                              handleRowSelect(record.id);
                              
                              // Only trigger theme customization if not clicking on action buttons
                              if (!(e.target as HTMLElement).closest('.record-actions')) {
                                setSelectedElement('row');
                                setThemeDrawerOpen(true);
                              }
                            }}
                            sx={{
                              ...getTableRowStyle(index % 2 === 0 ? 'even' : 'odd'),
                              ...getRecordRowStyle(record, isRecordSelected(record.id), nowReference),
                              border: selectedElement === 'row' ? '2px solid #2196f3' : 'none',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                                border: '1px solid #2196f3',
                              }
                            }}
                            title="Click to select row"
                          >
                            {getColumnDefinitions(selectedRecordType).map((column: any, colIndex: number) => (
                              <TableCell key={colIndex} sx={getTableCellStyle('body')}>
                                {getCellValue(record, column)}
                              </TableCell>
                            ))}
                            <TableCell sx={{ 
                              ...getTableCellStyle('body'), 
                              minWidth: '150px',
                              position: 'sticky',
                              right: 0,
                              backgroundColor: getTableRowStyle(index % 2 === 0 ? 'even' : 'odd').backgroundColor || (index % 2 === 0 ? '#f5f5f5' : '#fff'),
                              zIndex: 1,
                            }} align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} className="record-actions">
                                <Tooltip title="View Details">
                                  <IconButton size="small" onClick={() => handleViewRecord(record)} sx={{ color: isDarkMode ? 'primary.light' : 'primary.main' }}>
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Record">
                                  <IconButton size="small" onClick={() => handleEditRecord(record)} sx={{ color: isDarkMode ? 'warning.light' : 'warning.main' }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Record">
                                  <IconButton size="small" onClick={() => handleDeleteRecord(record.id, record.church_id)} sx={{ color: isDarkMode ? 'error.light' : 'error.main' }}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {(selectedRecordType === 'baptism' || selectedRecordType === 'marriage') && (
                                  <Tooltip title="Generate Certificate">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => {
                                        setViewingRecord(record);
                                        handleGenerateCertificate();
                                      }} 
                                      sx={{ color: isDarkMode ? 'success.light' : 'success.main' }}
                                    >
                                      <CertificateIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
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
              </>
            )}
            {/* Add/Edit Dialog */}
            <Dialog 
              open={dialogOpen} 
              onClose={() => setDialogOpen(false)}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 3,
                  boxShadow: theme.shadows[10],
                }
              }}
            >
              <DialogTitle
                sx={{
                  background: editingRecord 
                    ? `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: 'white',
                  py: 3,
                  px: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {editingRecord ? <EditIcon sx={{ fontSize: 28 }} /> : <AddIcon sx={{ fontSize: 28 }} />}
                </Box>
                <Box>
                  <Typography variant="h5" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {editingRecord ? 'Edit Record' : 'Add New Record'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record
                  </Typography>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ px: 3, py: 4 }}>
                <Stack spacing={4}>
                  {selectedRecordType === 'baptism' && (
                    <>
                      {/* Personal Information Section */}
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2.5,
                            pb: 1,
                            borderBottom: `3px solid ${theme.palette.primary.main}`,
                            display: 'inline-block',
                            color: theme.palette.primary.main,
                          }}
                        >
                          Personal Information
                        </Typography>
                        <Stack spacing={2.5} sx={{ mt: 2 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="First Name"
                              value={formData.firstName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Last Name"
                              value={formData.lastName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                          
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Date of Birth"
                              type="date"
                              value={formData.dateOfBirth || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Place of Birth"
                              value={formData.placeOfBirth || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, placeOfBirth: e.target.value }))}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                          
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Father's Name"
                              value={formData.fatherName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, fatherName: e.target.value }))}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Mother's Name"
                              value={formData.motherName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, motherName: e.target.value }))}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                        </Stack>
                      </Box>
                      
                      {/* Baptism Details Section */}
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2.5,
                            pb: 1,
                            borderBottom: `3px solid ${theme.palette.success.main}`,
                            display: 'inline-block',
                            color: theme.palette.success.main,
                          }}
                        >
                          Baptism Details
                        </Typography>
                        <Stack spacing={2.5} sx={{ mt: 2 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Date of Baptism"
                              type="date"
                              value={formData.dateOfBaptism || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBaptism: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Place of Baptism"
                              value={formData.placeOfBaptism || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, placeOfBaptism: e.target.value }))}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                          
                          <TextField
                            label="Godparent Names"
                            value={formData.godparentNames || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, godparentNames: e.target.value }))}
                            placeholder="Enter godparent names separated by commas"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              }
                            }}
                          />
                        </Stack>
                      </Box>
                      
                      {/* Church & Registry Information Section */}
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2.5,
                            pb: 1,
                            borderBottom: `3px solid ${theme.palette.info.main}`,
                            display: 'inline-block',
                            color: theme.palette.info.main,
                          }}
                        >
                          Church & Registry Information
                        </Typography>
                        <Stack spacing={2.5} sx={{ mt: 2 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                                sx={{
                                  borderRadius: 2,
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
                            <FormControl sx={{ flex: 1 }}>
                              <InputLabel>Church</InputLabel>
                              <Select
                                value={formData.churchId || ''}
                                label="Church"
                                onChange={(e) => setFormData(prev => ({ ...prev, churchId: e.target.value }))}
                                sx={{
                                  borderRadius: 2,
                                }}
                              >
                                {churches.filter(c => c.id !== 0).map((church) => (
                                  <MenuItem key={church.id} value={church.id}>
                                    {church.church_name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Stack>
                          {formData.customPriest && (
                            <TextField
                              label="Enter Priest Name"
                              value={formData.priest || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, priest: e.target.value }))}
                              fullWidth
                              placeholder="Enter the priest's name"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          )}
                          <TextField
                            label="Registry Number"
                            value={formData.registryNumber || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, registryNumber: e.target.value }))}
                            placeholder="Enter registry number"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              }
                            }}
                          />
                        </Stack>
                      </Box>
                      
                      {/* Additional Notes Section */}
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2.5,
                            pb: 1,
                            borderBottom: `3px solid ${theme.palette.secondary.main}`,
                            display: 'inline-block',
                            color: theme.palette.secondary.main,
                          }}
                        >
                          Additional Notes
                        </Typography>
                        <TextField
                          label="Notes"
                          multiline
                          rows={4}
                          value={formData.notes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Enter any additional notes or comments..."
                          fullWidth
                          sx={{ 
                            mt: 2,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            }
                          }}
                        />
                      </Box>
                    </>
                  )}

                  {selectedRecordType === 'marriage' && (
                    <>
                      {/* Groom Information Section */}
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2.5,
                            pb: 1,
                            borderBottom: `3px solid ${theme.palette.primary.main}`,
                            display: 'inline-block',
                            color: theme.palette.primary.main,
                          }}
                        >
                          Groom Information
                        </Typography>
                        <Stack spacing={2.5} sx={{ mt: 2 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="First Name"
                              value={formData.groomFirstName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, groomFirstName: e.target.value }))}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Last Name"
                              value={formData.groomLastName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, groomLastName: e.target.value }))}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                        </Stack>
                      </Box>
                      
                      {/* Bride Information Section */}
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2.5,
                            pb: 1,
                            borderBottom: `3px solid ${theme.palette.secondary.main}`,
                            display: 'inline-block',
                            color: theme.palette.secondary.main,
                          }}
                        >
                          Bride Information
                        </Typography>
                        <Stack spacing={2.5} sx={{ mt: 2 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="First Name"
                              value={formData.brideFirstName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, brideFirstName: e.target.value }))}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Last Name"
                              value={formData.brideLastName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, brideLastName: e.target.value }))}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                        </Stack>
                      </Box>
                      
                      {/* Marriage Details Section */}
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2.5,
                            pb: 1,
                            borderBottom: `3px solid ${theme.palette.success.main}`,
                            display: 'inline-block',
                            color: theme.palette.success.main,
                          }}
                        >
                          Marriage Details
                        </Typography>
                        <Stack spacing={2.5} sx={{ mt: 2 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Marriage Date"
                              type="date"
                              value={formData.marriageDate || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, marriageDate: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Marriage Location"
                              value={formData.marriageLocation || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, marriageLocation: e.target.value }))}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                          
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Witness 1"
                              value={formData.witness1 || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, witness1: e.target.value }))}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Witness 2"
                              value={formData.witness2 || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, witness2: e.target.value }))}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                        </Stack>
                      </Box>
                      
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
                      {/* Deceased Information Section */}
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2.5,
                            pb: 1,
                            borderBottom: `3px solid ${theme.palette.primary.main}`,
                            display: 'inline-block',
                            color: theme.palette.primary.main,
                          }}
                        >
                          Deceased Information
                        </Typography>
                        <Stack spacing={2.5} sx={{ mt: 2 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="First Name"
                              value={formData.deceasedFirstName || formData.firstName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, deceasedFirstName: e.target.value, firstName: e.target.value }))}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Last Name"
                              value={formData.deceasedLastName || formData.lastName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, deceasedLastName: e.target.value, lastName: e.target.value }))}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                          
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Age at Death"
                              type="number"
                              value={formData.age || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Date of Birth"
                              type="date"
                              value={formData.dateOfBirth || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                        </Stack>
                      </Box>
                      
                      {/* Funeral Details Section */}
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            mb: 2.5,
                            pb: 1,
                            borderBottom: `3px solid ${theme.palette.error.main}`,
                            display: 'inline-block',
                            color: theme.palette.error.main,
                          }}
                        >
                          Funeral Details
                        </Typography>
                        <Stack spacing={2.5} sx={{ mt: 2 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Date of Death"
                              type="date"
                              value={formData.deathDate || formData.dateOfDeath || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, deathDate: e.target.value, dateOfDeath: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                              required
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                            <TextField
                              label="Burial Date"
                              type="date"
                              value={formData.burialDate || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, burialDate: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                              sx={{ 
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            />
                          </Stack>
                          
                          <TextField
                            label="Burial Location"
                            value={formData.burialLocation || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, burialLocation: e.target.value }))}
                            fullWidth
                            sx={{ 
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              }
                            }}
                          />
                        </Stack>
                      </Box>
                      
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
              <DialogActions 
                sx={{ 
                  px: 3, 
                  py: 2.5, 
                  bgcolor: isDarkMode ? 'grey.900' : 'grey.50',
                  borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  gap: 1.5,
                }}
              >
                <Button 
                  onClick={() => setDialogOpen(false)}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveRecord} 
                  variant="contained"
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    py: 1,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: editingRecord
                      ? `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`
                      : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: theme.shadows[4],
                    '&:hover': {
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} color="inherit" />
                      <span>Saving...</span>
                    </Box>
                  ) : (
                    editingRecord ? 'Update Record' : 'Save Record'
                  )}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Modern Record Viewer Modal */}
            <ModernRecordViewerModal
              open={viewDialogOpen}
              onClose={handleCloseViewDialog}
              recordType={selectedRecordType as 'baptism' | 'marriage' | 'funeral'}
              record={viewingRecord}
              recordIndex={viewingRecordIndex}
              recordTotal={filteredAndSortedRecords.length}
              onPrev={handlePreviousRecord}
              onNext={handleNextRecord}
              onEdit={handleEditFromView}
              onGenerateCertificate={handleGenerateCertificate}
              isDarkMode={isDarkMode}
              formatDate={formatRecordDate}
              displayJsonField={displayJsonField}
            />

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
