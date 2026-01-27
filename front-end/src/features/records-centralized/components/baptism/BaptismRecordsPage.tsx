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
  Assessment as ReportIcon,
  Visibility as ViewIcon,
  Palette as PaletteIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  TableChart as TableChartIcon,
  ViewList as ViewListIcon,
  ExpandLess as IconChevronUp,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useTableStyleStore } from '@/store/useTableStyleStore';
import churchService, { Church } from '@/shared/lib/churchService';
import recordService from '@/shared/lib/recordService';
import TableControlPanel from '@/components/TableControlPanel';
import ColorPaletteSelector from '@/components/ColorPaletteSelector';
import { AGGridViewOnly } from '@/components/AGGridViewOnly/AGGridViewOnly';
import { ChurchRecord, RecordType as ChurchRecordType } from '@/types/church-records-advanced.types';
import ImportRecordsButton from '@/components/ImportRecordsButton';
import AdvancedGridDialog from '@/features/tables/AdvancedGridDialog';
import { FIELD_DEFINITIONS, RECORD_TYPES } from '@/features/records-centralized/constants';
import { formatRecordDate } from '@/utils/formatDate';
import { enhancedTableStore, THEME_MAP, LiturgicalThemeKey } from '@/store/enhancedTableStore';
import { AddRecordButton, AdvancedGridButton } from '@/components/records/BrandButtons';
import adminAPI from '@/api/admin.api';

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
      
      // Debug: Log the first record to see its structure
      if (recordData.records && recordData.records.length > 0) {
        console.log(`📄 Sample ${recordType} record structure:`, recordData.records[0]);
        console.log(`📄 Record fields:`, Object.keys(recordData.records[0]));
        
        // DEV-ONLY: Verify critical fields are present in API response
        if (process.env.NODE_ENV === 'development') {
          const sampleRecord = recordData.records[0];
          const criticalFields: Record<string, string[]> = {
            baptism: ['entry_type', 'first_name', 'last_name', 'birth_date', 'reception_date'],
            funeral: ['burial_date', 'deceased_date', 'name', 'lastname', 'age'],
            marriage: ['mdate', 'fname_groom', 'lname_groom', 'fname_bride', 'lname_bride'],
          };
          
          const expectedFields = criticalFields[recordType] || [];
          const missingFields = expectedFields.filter(field => 
            sampleRecord[field] === undefined && 
            sampleRecord.originalRecord?.[field] === undefined
          );
          
          if (missingFields.length > 0) {
            console.warn(`⚠️ [DEV] Missing expected fields in ${recordType} records:`, missingFields);
            console.warn(`⚠️ [DEV] If adding DB columns, update FIELD_DEFINITIONS in constants/index.ts`);
          }
        }
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
    // Find the index of the record in the filtered list for navigation
    const index = filteredAndSortedRecords.findIndex(r => r.id === record.id);
    setViewingRecord(record);
    setViewingRecordIndex(index);
    setViewDialogOpen(true);
  };

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
  const handleGenerateCertificate = () => {
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
  };

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
                      
                      <Button
                        variant="contained"
                        startIcon={<ReportIcon />}
                        onClick={handleGenerateReport}
                        disabled={loading || !selectedRecordType}
                        sx={{ 
                          background: 'linear-gradient(45deg, #1565C0 30%, #1976D2 90%)',
                          boxShadow: '0 3px 5px 2px rgba(21, 101, 192, .3)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #0D47A1 30%, #1565C0 90%)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px 2px rgba(21, 101, 192, .4)',
                          }
                        }}
                      >
                        Generate Report
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
                                  <IconButton size="small" onClick={() => handleViewRecord(record)} sx={{ color: '#1976d2' }}>
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Record">
                                  <IconButton size="small" onClick={() => handleEditRecord(record)} sx={{ color: '#ed6c02' }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Record">
                                  <IconButton size="small" onClick={() => handleDeleteRecord(record.id)} sx={{ color: '#d32f2f' }}>
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

            {/* View Details Dialog */}
            <Dialog
              open={viewDialogOpen}
              onClose={handleCloseViewDialog}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  minHeight: '60vh',
                  maxHeight: '90vh',
                }
              }}
            >
              <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 2
              }}>
                <Box>
                  <Typography variant="h6" component="span">
                    {selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {getRecordDisplayName(viewingRecord)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {viewingRecordIndex + 1} of {filteredAndSortedRecords.length}
                  </Typography>
                  <IconButton 
                    onClick={handlePreviousRecord} 
                    disabled={viewingRecordIndex <= 0}
                    size="small"
                    sx={{ border: '1px solid', borderColor: 'divider' }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton 
                    onClick={handleNextRecord} 
                    disabled={viewingRecordIndex >= filteredAndSortedRecords.length - 1}
                    size="small"
                    sx={{ border: '1px solid', borderColor: 'divider' }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ pt: 3 }}>
                {viewingRecord && (
                  <Grid container spacing={3}>
                    {/* Record ID and Registry Info */}
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Registry Information
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Record ID</Typography>
                            <Typography variant="body2" fontWeight="medium">{viewingRecord.id}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Book No.</Typography>
                            <Typography variant="body2">{viewingRecord.book_no || viewingRecord.bookNumber || '—'}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Page No.</Typography>
                            <Typography variant="body2">{viewingRecord.page_no || viewingRecord.pageNumber || '—'}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Entry No.</Typography>
                            <Typography variant="body2">{viewingRecord.entry_no || viewingRecord.entryNumber || '—'}</Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>

                    {/* Person/Couple Information */}
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          {selectedRecordType === 'marriage' ? 'Couple Information' : 'Person Information'}
                        </Typography>
                        {selectedRecordType === 'marriage' ? (
                          <>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary">Groom</Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {`${viewingRecord.fname_groom || viewingRecord.groom_first || ''} ${viewingRecord.lname_groom || viewingRecord.groom_last || ''}`.trim() || '—'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Bride</Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {`${viewingRecord.fname_bride || viewingRecord.bride_first || ''} ${viewingRecord.lname_bride || viewingRecord.bride_last || ''}`.trim() || '—'}
                              </Typography>
                            </Box>
                          </>
                        ) : selectedRecordType === 'funeral' ? (
                          <>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary">Deceased</Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {`${viewingRecord.deceased_first || viewingRecord.firstName || ''} ${viewingRecord.deceased_last || viewingRecord.lastName || ''}`.trim() || '—'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Date of Death</Typography>
                              <Typography variant="body1">{formatRecordDate(viewingRecord.death_date || viewingRecord.deathDate) || '—'}</Typography>
                            </Box>
                          </>
                        ) : (
                          <>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary">Name</Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {`${viewingRecord.person_first || viewingRecord.firstName || ''} ${viewingRecord.person_middle || viewingRecord.middleName || ''} ${viewingRecord.person_last || viewingRecord.lastName || ''}`.trim() || '—'}
                              </Typography>
                            </Box>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                              <Typography variant="body1">{formatRecordDate(viewingRecord.birth_date || viewingRecord.dateOfBirth) || '—'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Date of Baptism</Typography>
                              <Typography variant="body1">{formatRecordDate(viewingRecord.baptism_date || viewingRecord.dateOfBaptism) || '—'}</Typography>
                            </Box>
                          </>
                        )}
                      </Paper>
                    </Grid>

                    {/* Ceremony Details */}
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Ceremony Details
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            {selectedRecordType === 'marriage' ? 'Marriage Date' : selectedRecordType === 'funeral' ? 'Funeral Date' : 'Baptism Date'}
                          </Typography>
                          <Typography variant="body1">
                            {formatRecordDate(
                              selectedRecordType === 'marriage' ? (viewingRecord.marriage_date || viewingRecord.marriageDate) :
                              selectedRecordType === 'funeral' ? (viewingRecord.funeral_date || viewingRecord.funeralDate) :
                              (viewingRecord.baptism_date || viewingRecord.dateOfBaptism)
                            ) || '—'}
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">Officiant / Clergy</Typography>
                          <Typography variant="body1">{viewingRecord.officiant_name || viewingRecord.priest || viewingRecord.clergy || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Location</Typography>
                          <Typography variant="body1">{viewingRecord.place_name || viewingRecord.location || viewingRecord.churchName || '—'}</Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Sponsors/Witnesses/Godparents */}
                    {(selectedRecordType === 'baptism' || selectedRecordType === 'marriage') && (
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {selectedRecordType === 'marriage' ? 'Witnesses' : 'Godparents / Sponsors'}
                          </Typography>
                          <Typography variant="body1">
                            {selectedRecordType === 'marriage' 
                              ? (displayJsonField(viewingRecord.witnesses) || '—')
                              : (displayJsonField(viewingRecord.godparents) || viewingRecord.godfather || viewingRecord.godmother || '—')
                            }
                          </Typography>
                        </Paper>
                      </Grid>
                    )}

                    {/* Notes */}
                    {viewingRecord.notes && (
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Notes</Typography>
                          <Typography variant="body1">{viewingRecord.notes}</Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                )}
              </DialogContent>
              <DialogActions sx={{ 
                borderTop: '1px solid', 
                borderColor: 'divider', 
                px: 3, 
                py: 2,
                justifyContent: 'space-between'
              }}>
                <Box>
                  {(selectedRecordType === 'baptism' || selectedRecordType === 'marriage') && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleGenerateCertificate}
                      startIcon={<ExportIcon />}
                    >
                      Generate Certificate
                    </Button>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button onClick={handleCloseViewDialog}>
                    Close
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleEditFromView}
                    startIcon={<EditIcon />}
                  >
                    Edit Record
                  </Button>
                </Box>
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
