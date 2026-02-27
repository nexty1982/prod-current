import { registerAgGridModulesOnce } from '@/agGridModules';
import AdvancedGridDialog from '@/components/AdvancedGridDialog';
import { recordsEvents, useRecordsEvents } from '@/events/recordsEvents';
import ModernRecordViewerModal from '@/features/records-centralized/common/ModernRecordViewerModal';
import { getAgGridRowClassRules, getRecordRowStyle, isRecordNewWithin24Hours, isRecordUpdatedWithin24Hours, useNowReference } from '@/features/records-centralized/common/recordsHighlighting';
import '@/features/records-centralized/common/recordsHighlighting.css';
import { usePersistedRowSelection } from '@/features/records-centralized/common/usePersistedRowSelection';
import { createRecordsApiService } from '@/features/records-centralized/components/records/RecordsApiService';
import { FIELD_DEFINITIONS, RECORD_TYPES } from '@/features/records-centralized/constants';
import { getPersistedChurchId, getPersistedLastView, useRecordsPersistence } from '@/hooks/useRecordsPersistence';
import churchService, { Church } from '@/shared/lib/churchService';
import LookupService from '@/shared/lib/lookupService';
import { ChevronUp, Download, Eye, FileBarChart, FileText, LayoutGrid, Lock, Pencil, Plus, Search, Trash2, Unlock, Upload, Users, X } from '@/shared/ui/icons';
import { ChurchRecord } from '@/types/church-records-advanced.types';
import { agGridIconMap } from '@/ui/agGridIcons';
import { formatRecordDate } from '@/utils/formatDate';
import CollaborationWizardDialog from '@/features/records-centralized/components/collaborationLinks/CollaborationWizardDialog';
import {
    Alert,
    Autocomplete,
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
    InputAdornment,
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
import { ColDef, ICellRendererParams, themeQuartz } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RecordSection from '../../common/RecordSection';

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

// Helper to highlight search matches in cell text
const highlightSearchMatch = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm || !text) return text;
  const tokens = searchTerm.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return text;
  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    regex.test(part)
      ? React.createElement('mark', { key: i, style: { backgroundColor: 'rgba(0, 0, 0, 0.12)', color: 'inherit', borderRadius: 2, padding: '0 2px', fontWeight: 600 } }, part)
      : part
  );
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
  // Search ranking metadata (from server)
  _matchScore?: number;
  _matchedFields?: string[];
  _matchSummary?: string;
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

interface RecordsPageProps {
  defaultRecordType?: string;
}

const RecordsPage: React.FC<RecordsPageProps> = ({ defaultRecordType = 'baptism' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [records, setRecords] = useState<BaptismRecord[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [showBestMatches, setShowBestMatches] = useState<boolean>(false);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridApiRef = useRef<any>(null);
  const [selectedChurch, setSelectedChurch] = useState<number>(() => {
    // Initialize with persisted church ID
    return getPersistedChurchId() || 0;
  });
  const validRecordTypes = ['baptism', 'marriage', 'funeral'];
  const [selectedRecordType, setSelectedRecordType] = useState<string>(() => {
    // Priority: URL param → localStorage last view → prop default
    const typeFromUrl = searchParams.get('type');
    if (typeFromUrl && validRecordTypes.includes(typeFromUrl)) return typeFromUrl;
    const lastView = getPersistedLastView();
    if (lastView?.recordType && validRecordTypes.includes(lastView.recordType)) return lastView.recordType;
    return defaultRecordType;
  });
  
  // Enable persistence for church selection and last view
  useRecordsPersistence(
    selectedChurch,
    selectedRecordType,
    setSelectedChurch,
    setSelectedRecordType
  );
  
  // Collaboration wizard dialog
  const [collaborationWizardOpen, setCollaborationWizardOpen] = useState(false);

  // Auto-refresh when records change (create/update/delete)
  useRecordsEvents((event) => {
    if (event.churchId === selectedChurch && event.recordType === selectedRecordType) {
      console.log(`📡 Auto-refreshing ${selectedRecordType} records after ${event.mutationType}`);
      const refreshPage = event.mutationType === 'create' ? 0 : page;
      if (event.mutationType === 'create') setPage(0);
      fetchRecords(selectedRecordType, selectedChurch, debouncedSearch || undefined, refreshPage, rowsPerPage);
    }
  }, [selectedChurch, selectedRecordType, page, rowsPerPage, debouncedSearch]);
  
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
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'desc' });
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BaptismRecord | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; churchId?: number; name: string } | null>(null);
  const [priestOptions, setPriestOptions] = useState<string[]>([]);

  // ═══════════════════════════════════════════════════════════════
  // AUTOCOMPLETE — frequency-based suggestions for text fields
  // ═══════════════════════════════════════════════════════════════

  // Maps form field key → { apiEndpoint, dbColumn } for each record type
  const AUTOCOMPLETE_FIELD_MAP: Record<string, Record<string, { apiEndpoint: string; dbColumn: string }>> = useMemo(() => ({
    baptism: {
      firstName:      { apiEndpoint: 'baptism', dbColumn: 'first_name' },
      lastName:       { apiEndpoint: 'baptism', dbColumn: 'last_name' },
      placeOfBirth:   { apiEndpoint: 'baptism', dbColumn: 'birthplace' },
      fatherName:     { apiEndpoint: 'baptism', dbColumn: 'parents' },
      motherName:     { apiEndpoint: 'baptism', dbColumn: 'parents' },
      godparentNames: { apiEndpoint: 'baptism', dbColumn: 'sponsors' },
    },
    marriage: {
      groomFirstName: { apiEndpoint: 'marriage', dbColumn: 'fname_groom' },
      groomLastName:  { apiEndpoint: 'marriage', dbColumn: 'lname_groom' },
      brideFirstName: { apiEndpoint: 'marriage', dbColumn: 'fname_bride' },
      brideLastName:  { apiEndpoint: 'marriage', dbColumn: 'lname_bride' },
      witness1:       { apiEndpoint: 'marriage', dbColumn: 'witness' },
      witness2:       { apiEndpoint: 'marriage', dbColumn: 'witness' },
      marriageLocation: { apiEndpoint: 'marriage', dbColumn: 'mlicense' },
    },
    funeral: {
      deceasedFirstName: { apiEndpoint: 'funeral', dbColumn: 'name' },
      deceasedLastName:  { apiEndpoint: 'funeral', dbColumn: 'lastname' },
      burialLocation:    { apiEndpoint: 'funeral', dbColumn: 'burial_location' },
    },
  }), []);

  // Suggestion cache: key = "endpoint:column:prefix" → array of {value, count}
  const [acSuggestions, setAcSuggestions] = useState<Record<string, { value: string; count: number }[]>>({});
  const [acLoading, setAcLoading] = useState<Record<string, boolean>>({});
  const acTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchAutocompleteSuggestions = useCallback((formFieldKey: string, inputValue: string) => {
    const mapping = AUTOCOMPLETE_FIELD_MAP[selectedRecordType]?.[formFieldKey];
    if (!mapping) return;

    const cacheKey = `${mapping.apiEndpoint}:${mapping.dbColumn}:${inputValue}`;

    // Already cached
    if (acSuggestions[cacheKey]) return;

    // Debounce per field
    if (acTimerRef.current[formFieldKey]) clearTimeout(acTimerRef.current[formFieldKey]);

    acTimerRef.current[formFieldKey] = setTimeout(async () => {
      setAcLoading(prev => ({ ...prev, [formFieldKey]: true }));
      try {
        const params = new URLSearchParams({
          column: mapping.dbColumn,
          prefix: inputValue,
          ...(selectedChurch && selectedChurch !== 0 ? { church_id: selectedChurch.toString() } : {}),
        });
        const resp = await fetch(`/api/${mapping.apiEndpoint}-records/autocomplete?${params}`);
        if (resp.ok) {
          const data = await resp.json();
          setAcSuggestions(prev => ({ ...prev, [cacheKey]: data.suggestions || [] }));
        }
      } catch (err) {
        console.warn('Autocomplete fetch failed:', err);
      } finally {
        setAcLoading(prev => ({ ...prev, [formFieldKey]: false }));
      }
    }, 200);
  }, [selectedRecordType, selectedChurch, AUTOCOMPLETE_FIELD_MAP, acSuggestions]);

  // Helper: get current suggestions for a form field based on its current input value
  const getAcOptions = useCallback((formFieldKey: string, currentValue: string): string[] => {
    const mapping = AUTOCOMPLETE_FIELD_MAP[selectedRecordType]?.[formFieldKey];
    if (!mapping) return [];
    const cacheKey = `${mapping.apiEndpoint}:${mapping.dbColumn}:${currentValue}`;
    const suggestions = acSuggestions[cacheKey];
    if (!suggestions) return [];
    return suggestions.map(s => s.value);
  }, [selectedRecordType, AUTOCOMPLETE_FIELD_MAP, acSuggestions]);

  // Helper: get suggestion with count for rendering option label
  const getAcSuggestionsWithCount = useCallback((formFieldKey: string, currentValue: string): { value: string; count: number }[] => {
    const mapping = AUTOCOMPLETE_FIELD_MAP[selectedRecordType]?.[formFieldKey];
    if (!mapping) return [];
    const cacheKey = `${mapping.apiEndpoint}:${mapping.dbColumn}:${currentValue}`;
    return acSuggestions[cacheKey] || [];
  }, [selectedRecordType, AUTOCOMPLETE_FIELD_MAP, acSuggestions]);

  // Clear autocomplete cache when record type or church changes
  useEffect(() => {
    setAcSuggestions({});
  }, [selectedRecordType, selectedChurch]);

  // Theme Editor States
  
  // Table View Mode State
  const [useAgGrid, setUseAgGrid] = useState(false);
  
  // Advanced Grid Modal State
  const [advancedGridOpen, setAdvancedGridOpen] = useState(false);

  // View Details Dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [viewingRecord, setViewingRecord] = useState<BaptismRecord | null>(null);
  const [viewingRecordIndex, setViewingRecordIndex] = useState<number>(-1);
  const [viewEditMode, setViewEditMode] = useState<'view' | 'edit'>('view');

  // Collapsible Panel State
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState<boolean>(false);

  // Toast state
  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');

  // Theme hook for dark mode detection
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // AG Grid theme using Theming API (v34+) — matches MUI palette colors
  const agGridTheme = useMemo(() => {
    return themeQuartz.withParams(isDarkMode ? {
      backgroundColor: '#0a0a0a',
      headerBackgroundColor: theme.palette.primary.main,
      headerTextColor: theme.palette.primary.contrastText,
      foregroundColor: '#e0e0e0',
      oddRowBackgroundColor: '#111111',
      rowHoverColor: '#222222',
      selectedRowBackgroundColor: '#333333',
      borderColor: '#333333',
    } : {
      headerBackgroundColor: theme.palette.primary.main,
      headerTextColor: theme.palette.primary.contrastText,
      foregroundColor: '#1a1a1a',
      oddRowBackgroundColor: '#fafafa',
      rowHoverColor: '#eeeeee',
      selectedRowBackgroundColor: '#e0e0e0',
      borderColor: '#e0e0e0',
    });
  }, [isDarkMode, theme.palette.primary.main, theme.palette.primary.contrastText]);

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

  const fetchRecords = async (
    recordType: string,
    churchId?: number,
    search?: string,
    serverPage?: number,
    serverLimit?: number,
    sortField?: string,
    sortDir?: string
  ) => {
    if (!recordType) return;
    
    const isSearchFetch = search !== undefined && search !== '';
    
    try {
      if (isSearchFetch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const selectedType = recordTypes.find(type => type.value === recordType);
      if (!selectedType) {
        throw new Error('Invalid record type selected');
      }
      
      const querySearch = search !== undefined ? search : searchTerm;
      const requestPage = (serverPage ?? page) + 1; // Convert 0-indexed to 1-indexed
      const requestLimit = serverLimit ?? rowsPerPage;
      
      const activeSortField = sortField ?? sortConfig.key;
      const activeSortDir = sortDir ?? sortConfig.direction;

      let recordData;
      if (churchId && churchId !== 0) {
        recordData = await churchService.fetchChurchRecords(churchId, selectedType.apiEndpoint, {
          page: requestPage,
          limit: requestLimit,
          search: querySearch,
          sortField: activeSortField,
          sortDirection: activeSortDir
        });
      } else {
        const response = await fetch(`/api/${selectedType.apiEndpoint}-records?page=${requestPage}&limit=${requestLimit}&search=${encodeURIComponent(querySearch || '')}&sortField=${encodeURIComponent(activeSortField)}&sortDirection=${encodeURIComponent(activeSortDir)}`);
        const data = await response.json();
        
        if (data && data.records) {
          recordData = {
            records: data.records,
            totalRecords: data.totalRecords || data.pagination?.total || data.records.length,
            currentPage: data.currentPage || data.pagination?.page || requestPage,
            totalPages: data.totalPages || data.pagination?.pages || 1
          };
        } else {
          throw new Error('Failed to fetch records from API');
        }
      }
      
      setRecords(recordData.records || []);
      const total = recordData.totalRecords || recordData.records?.length || 0;
      setTotalRecords(total);
      
      if (isSearchFetch) {
        showToast(`Found ${total} match${total !== 1 ? 'es' : ''} for "${search}" in ${selectedType.label} records`, 'success');
      } else {
        const displayCount = Math.min(requestLimit, total);
        showToast(`Displaying ${displayCount} of ${total} ${selectedType.label.toLowerCase()} records`, 'success');
      }
      
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error fetching ${recordType} records:`, err);
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  const fetchPriestOptions = async (recordType: string) => {
    if (!selectedChurch) {
      setPriestOptions([]);
      return;
    }
    try {
      const response = await LookupService.getClergy({
        churchId: selectedChurch,
        recordType,
      });
      
      const validPriests = response.items
        .map(item => item.value)
        .filter((name: string) => name && name.trim() !== '');
      
      setPriestOptions(validPriests);
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
      setPage(0); // Reset to first page on type/church change
      fetchRecords(selectedRecordType, selectedChurch, undefined, 0, rowsPerPage);
      fetchPriestOptions(selectedRecordType);
    }
  }, [selectedRecordType, selectedChurch]);

  // Debounce search term: update debouncedSearch 300ms after typing stops
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  // Fetch when debounced search changes (or on Enter key)
  useEffect(() => {
    if (!selectedRecordType) return;
    setPage(0); // Reset to first page on search change
    if (!debouncedSearch) setShowBestMatches(false); // Reset Best Matches when search clears
    fetchRecords(selectedRecordType, selectedChurch, debouncedSearch, 0, rowsPerPage);
  }, [debouncedSearch]);

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

  // Server-sorted records — no client-side re-sorting (server handles ORDER BY)
  // Only apply Best Matches client-side filter when searching
  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    // Best Matches filter: show only multi-field matches
    if (showBestMatches && debouncedSearch) {
      result = result.filter(r => (r._matchedFields?.length || 0) >= 2);
    }

    return result;
  }, [records, debouncedSearch, showBestMatches]);

  // Paginated records — server returns the exact page, no client-side slicing needed
  const paginatedRecords = filteredAndSortedRecords;

  // Handlers
  const handleRecordTypeChange = useCallback((newType: string) => {
    setSelectedRecordType(newType);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('type', newType);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSort = (key: keyof BaptismRecord) => {
    const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction: newDirection });
    setPage(0);
    fetchRecords(selectedRecordType, selectedChurch, debouncedSearch || undefined, 0, rowsPerPage, key, newDirection);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
    fetchRecords(selectedRecordType, selectedChurch, debouncedSearch || undefined, newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    fetchRecords(selectedRecordType, selectedChurch, debouncedSearch || undefined, 0, newRowsPerPage);
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
      const prevRecord = filteredAndSortedRecords[prevIndex];
      setViewingRecord(prevRecord);
      setViewingRecordIndex(prevIndex);
      if (viewEditMode === 'edit') {
        setEditingRecord(prevRecord);
        setFormData(prevRecord);
      }
    }
  };

  // Navigate to next record in View Details dialog
  const handleNextRecord = () => {
    if (viewingRecordIndex < filteredAndSortedRecords.length - 1) {
      const nextIndex = viewingRecordIndex + 1;
      const nextRecord = filteredAndSortedRecords[nextIndex];
      setViewingRecord(nextRecord);
      setViewingRecordIndex(nextIndex);
      if (viewEditMode === 'edit') {
        setEditingRecord(nextRecord);
        setFormData(nextRecord);
      }
    }
  };

  // Close View Details dialog
  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setViewingRecord(null);
    setViewingRecordIndex(-1);
    setViewEditMode('view');
  };

  // Edit from View Details dialog — populates form data for in-modal editing
  const handleEditFromView = useCallback((record: BaptismRecord) => {
    setEditingRecord(record);
    setFormData(record);
  }, []);

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
    const certUrl = `/portal/certificates/generate?recordType=${selectedRecordType}&recordId=${viewingRecord.id}&churchId=${churchId}`;
    window.open(certUrl, '_blank');
  }, [viewingRecord, selectedChurch, selectedRecordType, churches]);

  // Collaboration Link wizard handler
  const handleCollaborativeReport = useCallback(() => {
    setCollaborationWizardOpen(true);
  }, []);

  // Build a display name from a record based on the current record type
  const getRecordDisplayName = useCallback((record: any): string => {
    if (!record) return '';
    if (selectedRecordType === 'marriage') {
      const groom = `${record.fname_groom || record.groomFirstName || ''} ${record.lname_groom || record.groomLastName || ''}`.trim();
      const bride = `${record.fname_bride || record.brideFirstName || ''} ${record.lname_bride || record.brideLastName || ''}`.trim();
      return [groom, bride].filter(Boolean).join(' & ') || 'this record';
    }
    if (selectedRecordType === 'funeral') {
      const first = record.name || record.deceasedFirstName || record.firstName || '';
      const last = record.lastname || record.deceasedLastName || record.lastName || '';
      return `${first} ${last}`.trim() || 'this record';
    }
    // baptism / default
    const first = record.first_name || record.firstName || '';
    const last = record.last_name || record.lastName || '';
    return `${first} ${last}`.trim() || 'this record';
  }, [selectedRecordType]);

  // Stage 1: open the delete confirmation dialog
  const handleDeleteClick = useCallback((record: any) => {
    setRecordToDelete({
      id: record.id,
      churchId: record.church_id,
      name: getRecordDisplayName(record),
    });
    setDeleteDialogOpen(true);
  }, [getRecordDisplayName]);

  // Stage 2: user confirmed — perform the delete
  const handleConfirmDelete = useCallback(async () => {
    if (!recordToDelete) return;
    setDeleteDialogOpen(false);
    try {
      setLoading(true);

      const churchId = recordToDelete.churchId || selectedChurch;

      if (!churchId || churchId === 0) {
        showToast('Please select a church before deleting records', 'error');
        setLoading(false);
        return;
      }

      const apiService = createRecordsApiService(churchId.toString());
      const response = await apiService.deleteRecord(selectedRecordType, recordToDelete.id);

      if (response.success) {
        showToast(`Record '${recordToDelete.name}' has been removed successfully.`, 'success');

        recordsEvents.emit({
          churchId: selectedChurch,
          recordType: selectedRecordType as any,
          mutationType: 'delete',
          recordId: recordToDelete.id
        });
      } else {
        showToast(response.error || 'Failed to delete record', 'error');
      }
    } catch (error: any) {
      console.error('Error deleting record:', error);
      showToast(error.message || 'Failed to delete record', 'error');
    } finally {
      setLoading(false);
      setRecordToDelete(null);
    }
  }, [recordToDelete, showToast, selectedChurch, selectedRecordType]);

  // Stage 3: user cancelled
  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  }, []);

  // AG Grid cell renderer: Status badge (New/Updated)
  const agGridStatusRenderer = useCallback((params: ICellRendererParams) => {
    const record = params.data;
    if (!record) return null;
    const isNew = isRecordNewWithin24Hours(record, nowReference);
    const isUpdated = isRecordUpdatedWithin24Hours(record, nowReference);
    if (isNew) {
      return (
        <Chip label="New" size="small" color="success" variant="filled"
          sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }} />
      );
    }
    if (isUpdated) {
      return (
        <Chip label="Upd" size="small" color="warning" variant="filled"
          sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }} />
      );
    }
    return null;
  }, [nowReference]);

  // AG Grid cell renderer: Row actions (View/Edit/Delete/Certificate)
  const agGridActionsRenderer = useCallback((params: ICellRendererParams) => {
    const record = params.data;
    if (!record) return null;
    return (
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
        <Tooltip title="View">
          <IconButton size="small" onClick={() => handleViewRecord(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}>
            <Eye size={16} strokeWidth={1.5} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => handleEditRecord(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}>
            <Pencil size={16} strokeWidth={1.5} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => handleDeleteClick(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'error.main' } }}>
            <Trash2 size={16} strokeWidth={1.5} />
          </IconButton>
        </Tooltip>
        {(selectedRecordType === 'baptism' || selectedRecordType === 'marriage') && (
          <Tooltip title="Certificate">
            <IconButton size="small" onClick={() => handleGenerateCertificate()} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}>
              <FileText size={16} strokeWidth={1.5} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }, [selectedRecordType, handleViewRecord, handleEditRecord, handleDeleteClick, handleGenerateCertificate]);

  // Memoized AG Grid column definitions to prevent infinite re-renders
  const agGridColumnDefs = useMemo(() => {
    const cols: ColDef[] = [];
    // Status column with New/Updated badge
    cols.push({
      headerName: '',
      field: 'created_at',
      minWidth: 70,
      maxWidth: 70,
      width: 70,
      sortable: false,
      filter: false,
      cellRenderer: agGridStatusRenderer,
      pinned: 'left',
    });
    // Data columns — inject cellRenderer for search-term highlighting
    getColumnDefinitions(selectedRecordType).forEach((col: any) => {
      cols.push({
        field: col.field,
        headerName: col.headerName,
        flex: 1,
        minWidth: 120,
        sortable: true,
        filter: false,
        valueGetter: (params: any) => getCellValue(params.data, col),
        cellRenderer: debouncedSearch
          ? (params: ICellRendererParams) => {
              const text = params.valueFormatted ?? params.value;
              const str = text == null ? '' : String(text);
              return highlightSearchMatch(str, debouncedSearch);
            }
          : undefined,
      });
    });
    cols.push({
      headerName: 'Actions',
      field: 'id',
      minWidth: 180,
      width: 180,
      maxWidth: 180,
      sortable: false,
      filter: false,
      pinned: 'right',
      cellRenderer: agGridActionsRenderer,
    });
    return cols;
  }, [selectedRecordType, debouncedSearch, agGridStatusRenderer, agGridActionsRenderer]);

  // Memoized AG Grid row class rules — stable reference
  const agGridRowClassRules = useMemo(
    () => getAgGridRowClassRules(isRecordSelected, nowReference),
    [isRecordSelected, nowReference]
  );

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
        // Check both form-specific keys (deceasedFirstName) and transform keys (firstName)
        if (!(formData.deceasedFirstName || formData.firstName) || 
            !(formData.deceasedLastName || formData.lastName) || 
            !(formData.deathDate || formData.dateOfDeath)) {
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

      // Always use selectedChurch as the source of truth — ignore any form-provided churchId
      const churchId = selectedChurch ? selectedChurch.toString() : '';
      const churchName = churches.find(c => c.id === selectedChurch)?.church_name || '';
      
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
          
          // If editing from the view modal, update viewing record and switch to view mode
          if (viewDialogOpen && viewEditMode === 'edit') {
            setViewingRecord(response.data as BaptismRecord);
            setViewEditMode('view');
          } else {
            setDialogOpen(false);
          }
          
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

    // Edit form content — shared between standalone edit dialog and view modal edit mode
    const editFormContent = (
      <Stack spacing={4}>
        {selectedRecordType === 'baptism' && (
          <>
            <RecordSection title="Personal Information">
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('firstName', formData.firstName || '')} loading={acLoading['firstName']} inputValue={formData.firstName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, firstName: val })); fetchAutocompleteSuggestions('firstName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, firstName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('firstName', formData.firstName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="First Name" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('lastName', formData.lastName || '')} loading={acLoading['lastName']} inputValue={formData.lastName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, lastName: val })); fetchAutocompleteSuggestions('lastName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, lastName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('lastName', formData.lastName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Last Name" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Date of Birth" type="date" value={formData.dateOfBirth || ''} onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))} InputLabelProps={{ shrink: true }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('placeOfBirth', formData.placeOfBirth || '')} loading={acLoading['placeOfBirth']} inputValue={formData.placeOfBirth || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, placeOfBirth: val })); fetchAutocompleteSuggestions('placeOfBirth', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, placeOfBirth: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('placeOfBirth', formData.placeOfBirth || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Place of Birth" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('fatherName', formData.fatherName || '')} loading={acLoading['fatherName']} inputValue={formData.fatherName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, fatherName: val })); fetchAutocompleteSuggestions('fatherName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, fatherName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('fatherName', formData.fatherName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Father's Name" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('motherName', formData.motherName || '')} loading={acLoading['motherName']} inputValue={formData.motherName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, motherName: val })); fetchAutocompleteSuggestions('motherName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, motherName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('motherName', formData.motherName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Mother's Name" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                </Stack>
              </Stack>
            </RecordSection>
            <RecordSection title="Baptism Details">
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <TextField label="Date of Baptism" type="date" value={formData.dateOfBaptism || ''} onChange={(e) => setFormData(prev => ({ ...prev, dateOfBaptism: e.target.value }))} InputLabelProps={{ shrink: true }} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <Autocomplete freeSolo disableClearable options={getAcOptions('godparentNames', formData.godparentNames || '')} loading={acLoading['godparentNames']} inputValue={formData.godparentNames || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, godparentNames: val })); fetchAutocompleteSuggestions('godparentNames', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, godparentNames: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('godparentNames', formData.godparentNames || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Godparent Names" placeholder="Enter godparent names separated by commas" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
            </RecordSection>
            <RecordSection title="Church & Registry Information">
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Priest</InputLabel>
                    <Select label="Priest" value={formData.priest || ''} onChange={(e) => { const value = e.target.value; if (value === 'custom') { setFormData(prev => ({ ...prev, priest: '', customPriest: true })); } else { setFormData(prev => ({ ...prev, priest: value, customPriest: false })); } }} sx={{ borderRadius: 2 }}>
                      <MenuItem value=""><em>Select a priest...</em></MenuItem>
                      {priestOptions.map((priest) => (<MenuItem key={priest} value={priest}>{priest}</MenuItem>))}
                      <MenuItem value="custom"><em>Other (enter manually)...</em></MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="Church" value={churches.find(c => c.id === selectedChurch)?.church_name || 'No church selected'} InputProps={{ readOnly: true }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: 'text.secondary' } }} />
                </Stack>
                {formData.customPriest && (
                  <TextField label="Enter Priest Name" value={formData.priest || ''} onChange={(e) => setFormData(prev => ({ ...prev, priest: e.target.value }))} fullWidth placeholder="Enter the priest's name" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                )}
                <TextField label="Registry Number" value={formData.registryNumber || ''} onChange={(e) => setFormData(prev => ({ ...prev, registryNumber: e.target.value }))} placeholder="Enter registry number" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Stack>
            </RecordSection>
            <RecordSection title="Additional Notes">
              <TextField label="Notes" multiline rows={4} value={formData.notes || ''} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Enter any additional notes or comments..." fullWidth sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </RecordSection>
          </>
        )}

        {selectedRecordType === 'marriage' && (
          <>
            <RecordSection title="Groom Information">
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('groomFirstName', formData.groomFirstName || '')} loading={acLoading['groomFirstName']} inputValue={formData.groomFirstName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, groomFirstName: val })); fetchAutocompleteSuggestions('groomFirstName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, groomFirstName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('groomFirstName', formData.groomFirstName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="First Name" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('groomLastName', formData.groomLastName || '')} loading={acLoading['groomLastName']} inputValue={formData.groomLastName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, groomLastName: val })); fetchAutocompleteSuggestions('groomLastName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, groomLastName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('groomLastName', formData.groomLastName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Last Name" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                </Stack>
              </Stack>
            </RecordSection>
            <RecordSection title="Bride Information">
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('brideFirstName', formData.brideFirstName || '')} loading={acLoading['brideFirstName']} inputValue={formData.brideFirstName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, brideFirstName: val })); fetchAutocompleteSuggestions('brideFirstName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, brideFirstName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('brideFirstName', formData.brideFirstName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="First Name" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('brideLastName', formData.brideLastName || '')} loading={acLoading['brideLastName']} inputValue={formData.brideLastName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, brideLastName: val })); fetchAutocompleteSuggestions('brideLastName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, brideLastName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('brideLastName', formData.brideLastName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Last Name" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                </Stack>
              </Stack>
            </RecordSection>
            <RecordSection title="Marriage Details">
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Marriage Date" type="date" value={formData.marriageDate || ''} onChange={(e) => setFormData(prev => ({ ...prev, marriageDate: e.target.value }))} InputLabelProps={{ shrink: true }} required sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('marriageLocation', formData.marriageLocation || '')} loading={acLoading['marriageLocation']} inputValue={formData.marriageLocation || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, marriageLocation: val })); fetchAutocompleteSuggestions('marriageLocation', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, marriageLocation: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('marriageLocation', formData.marriageLocation || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Marriage Location" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('witness1', formData.witness1 || '')} loading={acLoading['witness1']} inputValue={formData.witness1 || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, witness1: val })); fetchAutocompleteSuggestions('witness1', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, witness1: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('witness1', formData.witness1 || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Witness 1" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('witness2', formData.witness2 || '')} loading={acLoading['witness2']} inputValue={formData.witness2 || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, witness2: val })); fetchAutocompleteSuggestions('witness2', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, witness2: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('witness2', formData.witness2 || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Witness 2" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                </Stack>
              </Stack>
            </RecordSection>
            <FormControl fullWidth>
              <InputLabel>Priest</InputLabel>
              <Select label="Priest" value={formData.priest || ''} onChange={(e) => { const value = e.target.value; if (value === 'custom') { setFormData(prev => ({ ...prev, priest: '', customPriest: true })); } else { setFormData(prev => ({ ...prev, priest: value, customPriest: false })); } }}>
                <MenuItem value=""><em>Select a priest...</em></MenuItem>
                {priestOptions.map((priest) => (<MenuItem key={priest} value={priest}>{priest}</MenuItem>))}
                <MenuItem value="custom"><em>Other (enter manually)...</em></MenuItem>
              </Select>
            </FormControl>
            {formData.customPriest && (
              <TextField label="Enter Priest Name" value={formData.priest || ''} onChange={(e) => setFormData(prev => ({ ...prev, priest: e.target.value }))} fullWidth placeholder="Enter the priest's name" />
            )}
          </>
        )}

        {selectedRecordType === 'funeral' && (
          <>
            <RecordSection title="Deceased Information">
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('deceasedFirstName', formData.deceasedFirstName || formData.firstName || '')} loading={acLoading['deceasedFirstName']} inputValue={formData.deceasedFirstName || formData.firstName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, deceasedFirstName: val, firstName: val })); fetchAutocompleteSuggestions('deceasedFirstName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, deceasedFirstName: val, firstName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('deceasedFirstName', formData.deceasedFirstName || formData.firstName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="First Name" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                  <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('deceasedLastName', formData.deceasedLastName || formData.lastName || '')} loading={acLoading['deceasedLastName']} inputValue={formData.deceasedLastName || formData.lastName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, deceasedLastName: val, lastName: val })); fetchAutocompleteSuggestions('deceasedLastName', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, deceasedLastName: val, lastName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('deceasedLastName', formData.deceasedLastName || formData.lastName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Last Name" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                </Stack>
                <TextField label="Age at Death" type="number" value={formData.age || ''} onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Stack>
            </RecordSection>
            <RecordSection title="Funeral Details">
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Date of Death" type="date" value={formData.deathDate || formData.dateOfDeath || ''} onChange={(e) => setFormData(prev => ({ ...prev, deathDate: e.target.value, dateOfDeath: e.target.value }))} InputLabelProps={{ shrink: true }} required sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  <TextField label="Burial Date" type="date" value={formData.burialDate || ''} onChange={(e) => setFormData(prev => ({ ...prev, burialDate: e.target.value }))} InputLabelProps={{ shrink: true }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Stack>
                <Autocomplete freeSolo disableClearable fullWidth options={getAcOptions('burialLocation', formData.burialLocation || '')} loading={acLoading['burialLocation']} inputValue={formData.burialLocation || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData(prev => ({ ...prev, burialLocation: val })); fetchAutocompleteSuggestions('burialLocation', val); } }} onChange={(_e, val) => { if (val) setFormData(prev => ({ ...prev, burialLocation: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('burialLocation', formData.burialLocation || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label="Burial Location" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
            </RecordSection>
            <FormControl fullWidth>
              <InputLabel>Priest</InputLabel>
              <Select label="Priest" value={formData.priest || ''} onChange={(e) => { const value = e.target.value; if (value === 'custom') { setFormData(prev => ({ ...prev, priest: '', customPriest: true })); } else { setFormData(prev => ({ ...prev, priest: value, customPriest: false })); } }}>
                <MenuItem value=""><em>Select a priest...</em></MenuItem>
                {priestOptions.map((priest) => (<MenuItem key={priest} value={priest}>{priest}</MenuItem>))}
                <MenuItem value="custom"><em>Other (enter manually)...</em></MenuItem>
              </Select>
            </FormControl>
            {formData.customPriest && (
              <TextField label="Enter Priest Name" value={formData.priest || ''} onChange={(e) => setFormData(prev => ({ ...prev, priest: e.target.value }))} fullWidth placeholder="Enter the priest's name" />
            )}
          </>
        )}
      </Stack>
    );

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
                    <IconButton
                      onClick={() => setIsFiltersCollapsed(true)}
                      size="small"
                      sx={{ 
                        ml: 1,
                        transition: 'transform 0.2s ease-in-out',
                      }}
                    >
                      <ChevronUp size={20} />
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
                            onChange={(e) => handleRecordTypeChange(e.target.value)}
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                                setDebouncedSearch(searchTerm);
                              }
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Search size={20} style={{ color: 'inherit' }} />
                                </InputAdornment>
                              ),
                              endAdornment: searchTerm ? (
                                <InputAdornment position="end">
                                  <IconButton
                                    size="small"
                                    onClick={() => setSearchTerm('')}
                                    edge="end"
                                    aria-label="clear search"
                                  >
                                    <X size={16} />
                                  </IconButton>
                                </InputAdornment>
                              ) : searchLoading ? <CircularProgress size={16} /> : null,
                            }}
                            size="small"
                            fullWidth
                            sx={{ maxWidth: 500 }}
                          />
                          
                          {/* Action Buttons - Compact Icon Buttons */}
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                              Quick Actions
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                              <Tooltip title="Add New Record">
                                <IconButton
                                  onClick={handleAddRecord}
                                  disabled={loading}
                                  sx={{ 
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    bgcolor: 'transparent',
                                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' }
                                  }}
                                >
                                  <Plus size={18} strokeWidth={1.5} />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Import Records">
                                <IconButton
                                  onClick={() => {/* TODO: Import functionality */}}
                                  disabled={loading}
                                  sx={{ 
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    bgcolor: 'transparent',
                                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' }
                                  }}
                                >
                                  <Upload size={18} strokeWidth={1.5} />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Advanced Grid Options">
                                <IconButton
                                  onClick={() => setAdvancedGridOpen(true)}
                                  disabled={loading}
                                  sx={{ 
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    bgcolor: 'transparent',
                                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' }
                                  }}
                                >
                                  <LayoutGrid size={18} strokeWidth={1.5} />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title={useAgGrid ? 'Switch to Standard View' : 'Switch to AG Grid'}>
                                <IconButton
                                  onClick={() => setUseAgGrid(!useAgGrid)}
                                  disabled={loading}
                                  sx={{ 
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    bgcolor: useAgGrid ? 'action.selected' : 'transparent',
                                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                  }}
                                >
                                  {useAgGrid ? <Lock size={18} strokeWidth={1.5} /> : <Unlock size={18} strokeWidth={1.5} />}
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Export Records">
                                <IconButton
                                  onClick={handleExport}
                                  disabled={loading}
                                  sx={{ 
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    bgcolor: 'transparent',
                                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' }
                                  }}
                                >
                                  <Download size={18} strokeWidth={1.5} />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Generate Report">
                                <IconButton
                                  onClick={handleGenerateReport}
                                  disabled={loading || !selectedRecordType}
                                  sx={{ 
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    bgcolor: 'transparent',
                                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' }
                                  }}
                                >
                                  <FileBarChart size={18} strokeWidth={1.5} />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Collaboration Link">
                                <IconButton
                                  onClick={handleCollaborativeReport}
                                  disabled={loading}
                                  sx={{ 
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    bgcolor: 'transparent',
                                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' }
                                  }}
                                >
                                  <Users size={18} strokeWidth={1.5} />
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
                startIcon={<ChevronUp size={20} style={{ transform: 'rotate(180deg)' }} />}
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
                  <>
                    {`Showing ${records.length} of ${totalRecords} records`}
                    {debouncedSearch && ` matching "${debouncedSearch}"`}
                  </>
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
                <Box sx={{ mb: 1, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  {debouncedSearch && (
                    <Chip
                      size="small"
                      label={`Best Matches${showBestMatches ? ' ✓' : ''}`}
                      color={showBestMatches ? 'primary' : 'default'}
                      variant={showBestMatches ? 'filled' : 'outlined'}
                      onClick={() => setShowBestMatches(prev => !prev)}
                      sx={{ fontWeight: 500, cursor: 'pointer' }}
                    />
                  )}
                  {showBestMatches && debouncedSearch && records.length > 0 && records[0]._topMatchReason && (
                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                      Top match: {records[0].first_name || records[0].firstName || ''} {records[0].last_name || records[0].lastName || ''} ({records[0]._topMatchReason})
                    </Typography>
                  )}
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
                  // AG Grid View — uses Theming API (v34+) for consistent styling
                  <Box sx={{ height: 600, width: '100%' }}>
                    <AgGridReact
                      theme={agGridTheme}
                      rowData={filteredAndSortedRecords}
                      columnDefs={agGridColumnDefs}
                      icons={agGridIconMap}
                      defaultColDef={{
                        resizable: true,
                        sortable: true,
                        filter: false,
                      }}
                      getRowId={(params) => String(params.data.id)}
                      rowClassRules={agGridRowClassRules}
                      onRowClicked={(event) => handleRowSelect(event.data.id)}
                      onSortChanged={(event) => {
                        const sortModel = event.api.getColumnState().filter(c => c.sort);
                        if (sortModel.length > 0) {
                          const col = sortModel[0];
                          handleSort(col.colId as keyof BaptismRecord);
                        }
                      }}
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
                    bgcolor: isDarkMode ? 'background.paper' : undefined,
                    '&::-webkit-scrollbar': {
                      height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)',
                      borderRadius: '4px',
                    },
                  }}>
                  <Table stickyHeader sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        {getColumnDefinitions(selectedRecordType).map((column: any, index: number) => (
                          <TableCell key={index} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 'bold', '& .MuiTableSortLabel-root': { color: 'inherit' }, '& .MuiTableSortLabel-root.Mui-active': { color: 'inherit' }, '& .MuiTableSortLabel-icon': { color: 'inherit !important' } }}>
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
                          minWidth: '150px',
                          position: 'sticky',
                          right: 0,
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
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
                            onClick={() => handleRowSelect(record.id)}
                            sx={{
                              bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper',
                              ...getRecordRowStyle(record, isRecordSelected(record.id), nowReference, isDarkMode),
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                            title={record._matchSummary || 'Click to select row'}
                          >
                            {getColumnDefinitions(selectedRecordType).map((column: any, colIndex: number) => {
                              const cellVal = getCellValue(record, column);
                              const cellText = typeof cellVal === 'string' ? cellVal : String(cellVal ?? '');
                              return (
                                <TableCell key={colIndex}>
                                  {debouncedSearch ? highlightSearchMatch(cellText, debouncedSearch) : cellVal}
                                </TableCell>
                              );
                            })}
                            <TableCell sx={{
                              minWidth: '150px',
                              position: 'sticky',
                              right: 0,
                              bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper',
                              zIndex: 1,
                            }} align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} className="record-actions">
                                <Tooltip title="View Details">
                                  <IconButton size="small" onClick={() => handleViewRecord(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}>
                                    <Eye size={16} strokeWidth={1.5} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Record">
                                  <IconButton size="small" onClick={() => handleEditRecord(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}>
                                    <Pencil size={16} strokeWidth={1.5} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Record">
                                  <IconButton size="small" onClick={() => handleDeleteClick(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'error.main' } }}>
                                    <Trash2 size={16} strokeWidth={1.5} />
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
                                      sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}
                                    >
                                      <FileText size={16} strokeWidth={1.5} />
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

                {/* Pagination — shared by both AG Grid and Material-UI Table views */}
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={totalRecords}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
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
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, rgba(0,0,0,0.25) 100%), ${theme.palette.primary.main}`,
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
                  {editingRecord ? <Pencil size={28} /> : <Plus size={28} />}
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
                      <RecordSection title="Personal Information">
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
                      </RecordSection>
                      
                      {/* Baptism Details Section */}
                      <RecordSection title="Baptism Details">
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
                      </RecordSection>
                      
                      {/* Church & Registry Information Section */}
                      <RecordSection title="Church & Registry Information">
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
                            <TextField
                              label="Church"
                              value={churches.find(c => c.id === selectedChurch)?.church_name || 'No church selected'}
                              InputProps={{ readOnly: true }}
                              sx={{
                                flex: 1,
                                '& .MuiOutlinedInput-root': { borderRadius: 2 },
                                '& .MuiInputBase-input': { color: 'text.secondary' },
                              }}
                            />
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
                      </RecordSection>
                      
                      {/* Additional Notes Section */}
                      <RecordSection title="Additional Notes">
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
                      </RecordSection>
                    </>
                  )}

                  {selectedRecordType === 'marriage' && (
                    <>
                      {/* Groom Information Section */}
                      <RecordSection title="Groom Information">
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
                      </RecordSection>
                      
                      {/* Bride Information Section */}
                      <RecordSection title="Bride Information">
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
                      </RecordSection>
                      
                      {/* Marriage Details Section */}
                      <RecordSection title="Marriage Details">
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
                      </RecordSection>
                      
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
                      <RecordSection title="Deceased Information">
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
                          </Stack>
                        </Stack>
                      </RecordSection>
                      
                      {/* Funeral Details Section */}
                      <RecordSection title="Funeral Details">
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
                      </RecordSection>
                      
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
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, rgba(0,0,0,0.25) 100%), ${theme.palette.primary.main}`,
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
              accentColor={theme.palette.primary.main}
              mode={viewEditMode}
              onModeChange={setViewEditMode}
              onSave={handleSaveRecord}
              saveLoading={loading}
              editFormComponent={editFormContent}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog
              open={deleteDialogOpen}
              onClose={handleCancelDelete}
              maxWidth="xs"
              fullWidth
              PaperProps={{
                sx: { borderRadius: 3 }
              }}
            >
              <DialogTitle sx={{ fontWeight: 600 }}>
                Delete Record?
              </DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to delete '{recordToDelete?.name}'?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This action cannot be undone.
                </Typography>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={handleCancelDelete} variant="outlined">
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmDelete} 
                  variant="contained"
                  sx={{
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, #0a0a0a 0%, #2a2a2a 100%)'
                      : 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
                    '&:hover': {
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, #2a2a2a 0%, #0a0a0a 100%)'
                        : 'linear-gradient(135deg, #4a4a4a 0%, #1a1a1a 100%)',
                    }
                  }}
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>


            {/* Toast Snackbar — centered on screen */}
            <Snackbar
              open={toastOpen}
              autoHideDuration={4000}
              onClose={() => setToastOpen(false)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              sx={{
                top: '50% !important',
                transform: 'translateY(-50%)',
              }}
            >
              <Alert 
                onClose={() => setToastOpen(false)} 
                severity={toastSeverity}
                variant="filled"
                sx={{ 
                  width: '100%', 
                  minWidth: 300, 
                  boxShadow: 6,
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, #0a0a0a 0%, #2a2a2a 100%)'
                    : 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
                  color: '#fff',
                  '& .MuiAlert-icon': { color: '#fff' },
                }}
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

            {/* Collaboration Link Wizard */}
            <CollaborationWizardDialog
              open={collaborationWizardOpen}
              onClose={() => setCollaborationWizardOpen(false)}
              defaultRecordType={selectedRecordType}
              churchId={selectedChurch}
            />
          </Box>
    );
};

export default RecordsPage;
