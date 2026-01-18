import React, { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
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
  Menu,
  useTheme,
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
  ExpandMore as IconChevronDown,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useTableStyleStore } from '@/store/useTableStyleStore';
import { listRecords, type TableKey, type SortDir } from '@/shared/lib/recordsApi';
import TableControlPanel from '@/components/TableControlPanel';
import ColorPaletteSelector from '@/components/ColorPaletteSelector';
import { AGGridViewOnly } from '@/components/AGGridViewOnly/AGGridViewOnly';
import { ChurchRecord, RecordType as ChurchRecordType } from '@/types/church-records-advanced.types';
// import ImportRecordsButton from '@/components/ImportRecordsButton'; // Using BrandButtons instead
import AdvancedGridDialog from '@/features/tables/AdvancedGridDialog';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import '@/styles/advanced-grid-themes.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);
import { FIELD_DEFINITIONS, RECORD_TYPES } from '@/features/records-centralized/constants';
import { DynamicRecordsDisplay, mapFieldDefinitionsToDynamicColumns } from '../dynamic';
import { enhancedTableStore, THEME_MAP, LiturgicalThemeKey, getThemeTokens } from '../../../../store/enhancedTableStore';
import { AddRecordButton, AdvancedGridButton } from '@/features/records/BrandButtons';
import { useNavigate } from 'react-router-dom';
import adminAPI from '@/api/admin.api';
import LeftSideMenu from '@/features/pages/frontend-pages/LeftSideMenu';
import ImageBasedRecordForm from './ImageBasedRecordForm';

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
  logo_path?: string;
}
interface BaptismRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  dateOfBaptism: string;
  placeOfBirth: string;
  entry_type: string;
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
    { field: 'first_name', headerName: 'First Name' },
    { field: 'last_name', headerName: 'Last Name' },
    { field: 'reception_date', headerName: 'Baptism Date' },
    { field: 'birth_date', headerName: 'Birth Date' },
    { field: 'birthplace', headerName: 'Birthplace' },
    { field: 'sponsors', headerName: 'Sponsors' },
    { field: 'clergy', headerName: 'Priest' },
  ],
  marriage: [
    { field: 'fname_groom', headerName: 'Groom First' },
    { field: 'lname_groom', headerName: 'Groom Last' },
    { field: 'fname_bride', headerName: 'Bride First' },
    { field: 'lname_bride', headerName: 'Bride Last' },
    { field: 'mdate', headerName: 'Marriage Date' },
    { field: 'parentsg', headerName: 'Groom Parents' },
    { field: 'parentsb', headerName: 'Bride Parents' },
    { field: 'witness', headerName: 'Witnesses' },
    { field: 'mlicense', headerName: 'License' },
    { field: 'clergy', headerName: 'Priest' },
  ],
  funeral: [
    { field: 'name', headerName: 'First Name' },
    { field: 'lastname', headerName: 'Last Name' },
    { field: 'deceased_date', headerName: 'Date of Death' },
    { field: 'burial_date', headerName: 'Burial Date' },
    { field: 'age', headerName: 'Age' },
    { field: 'burial_location', headerName: 'Burial Location' },
    { field: 'clergy', headerName: 'Priest' },
  ],
};

const safeColumnsFor = (recordType: string) => {
  const fromDefs =
    recordType === 'marriage'
      ? (FIELD_DEFINITIONS?.[RECORD_TYPES?.MARRIAGE as keyof typeof FIELD_DEFINITIONS] as any)?.tableColumns
      : recordType === 'funeral'
        ? (FIELD_DEFINITIONS?.[RECORD_TYPES?.FUNERAL as keyof typeof FIELD_DEFINITIONS] as any)?.tableColumns
        : (FIELD_DEFINITIONS?.[RECORD_TYPES?.BAPTISM as keyof typeof FIELD_DEFINITIONS] as any)?.tableColumns;

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
      return ((FIELD_DEFINITIONS[RECORD_TYPES.MARRIAGE as keyof typeof FIELD_DEFINITIONS] as any)?.sortFields) || [];
    case 'funeral':
      return ((FIELD_DEFINITIONS[RECORD_TYPES.FUNERAL as keyof typeof FIELD_DEFINITIONS] as any)?.sortFields) || [];
    case 'baptism':
    default:
      return ((FIELD_DEFINITIONS[RECORD_TYPES.BAPTISM as keyof typeof FIELD_DEFINITIONS] as any)?.sortFields) || [];
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
  const navigate = useNavigate();
  const theme = useTheme();
  const searchParams = new URLSearchParams(location.search);

  // Get record type from URL params or route path, default to 'baptism'
  const getRecordTypeFromPath = () => {
    if (location.pathname.includes('/marriage')) return 'marriage';
    if (location.pathname.includes('/funeral')) return 'funeral';
    return 'baptism';
  };

  const urlRecordType = searchParams.get('type') || getRecordTypeFromPath();
  const urlChurchId = searchParams.get('church');

  // State management
  const [records, setRecords] = useState<BaptismRecord[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Helper to ensure church ID is valid
  const getValidChurchId = (churchId: any): number => {
    if (churchId === null || churchId === undefined || churchId === '') return 46;
    const num = typeof churchId === 'string' ? parseInt(churchId, 10) : Number(churchId);
    return !isNaN(num) && num > 0 ? num : 46;
  };
  const [selectedChurch, setSelectedChurch] = useState<number>(getValidChurchId(urlChurchId));
  const [selectedRecordType, setSelectedRecordType] = useState<string>(urlRecordType);
  // Get viewMode from URL or default to 'normal'
  const urlViewMode = searchParams.get('view') as 'normal' | 'advanced' | null;
  const [viewMode, setViewMode] = useState<'normal' | 'advanced'>(urlViewMode || 'normal');
  const [activeSection, setActiveSection] = useState<'gallery-of-images' | 'graphical-analysis' | 'om-magic-image' | 'records-systems'>('records-systems');
  const [calendarStartOffset, setCalendarStartOffset] = useState<number>(1); // Start from tomorrow (offset 1)
  const [displayedRecordIndex, setDisplayedRecordIndex] = useState<number>(0); // 0=baptism, 1=marriage, 2=funeral
  const [isRecordTypeHovered, setIsRecordTypeHovered] = useState<boolean>(false);

  // Update selectedRecordType and viewMode when URL param or path changes
  useEffect(() => {
    const getTypeFromPath = () => {
      if (location.pathname.includes('/marriage')) return 'marriage';
      if (location.pathname.includes('/funeral')) return 'funeral';
      return 'baptism';
    };

    const newType = searchParams.get('type') || getTypeFromPath();
    const newViewMode = (searchParams.get('view') as 'normal' | 'advanced') || 'normal';
    
    if (newType !== selectedRecordType) {
      setSelectedRecordType(newType);
    }
    
    if (newViewMode !== viewMode) {
      setViewMode(newViewMode);
    }
    
    // Also update the URL if type param is missing but we're on a specific route
    if (!searchParams.get('type') && newType !== 'baptism') {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('type', newType);
      if (viewMode === 'advanced' && !newParams.get('view')) {
        newParams.set('view', 'advanced');
      }
      navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]); // Only depend on location changes, not selectedRecordType to avoid loops
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dateOfBaptism', direction: 'desc' });
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BaptismRecord | null>(null);
  const [editingRecords, setEditingRecords] = useState<BaptismRecord[]>([]); // Multiple records being edited
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number>(0); // Current record index in editing array
  const [viewingRecord, setViewingRecord] = useState<BaptismRecord | null>(null);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [priestOptions, setPriestOptions] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [newlyAddedRecordIds, setNewlyAddedRecordIds] = useState<Set<string>>(new Set());
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});
  const [fieldSortable, setFieldSortable] = useState<Record<string, boolean>>({});
  const [tableColumns, setTableColumns] = useState<string[]>([]);


  // Advanced Grid Modal State
  const [advancedGridOpen, setAdvancedGridOpen] = useState(false);
  
  // Certificate Preview State
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [certificateRecord, setCertificateRecord] = useState<BaptismRecord | null>(null);
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState<string | null>(null);
  const [certificateLoading, setCertificateLoading] = useState(false);
  
  // Buttons section collapsed state
  const [buttonsExpanded, setButtonsExpanded] = useState(false);
  
  // AG Grid state for inline view
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  
  const [allRecordsDatasets, setAllRecordsDatasets] = useState<{
    baptism: any[];
    marriage: any[];
    funeral: any[];
  }>({
    baptism: [],
    marriage: [],
    funeral: []
  });
  const [allRecordsCounts, setAllRecordsCounts] = useState<{
    baptism: number;
    marriage: number;
    funeral: number;
  }>({
    baptism: 0,
    marriage: 0,
    funeral: 0
  });

  // Record Settings State
  const [recordSettings, setRecordSettings] = useState<{
    logo?: {
      enabled: boolean;
      column: number;
      width?: number;
      height?: string | number;
      objectFit?: string;
      opacity?: number;
      quadrant?: 'top' | 'middle' | 'bottom';
      horizontalPosition?: 'left' | 'center' | 'right';
    };
    calendar?: {
      enabled: boolean;
      column: number;
      quadrant?: 'top' | 'middle' | 'bottom';
      horizontalPosition?: 'left' | 'center' | 'right';
    };
    omLogo?: {
      enabled: boolean;
      column: number;
      width?: number;
      height?: number | 'auto';
      quadrant?: 'top' | 'middle' | 'bottom';
      horizontalPosition?: 'left' | 'center' | 'right';
    };
    headerText?: {
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: number;
      color?: string;
      column?: number;
      position?: 'above' | 'below';
      quadrant?: 'top' | 'middle' | 'bottom';
      horizontalPosition?: 'left' | 'center' | 'right';
      // Legacy format support (for backward compatibility)
      x?: number;
      y?: number;
    };
    recordImages?: {
      column?: number;
      quadrant?: 'top' | 'middle' | 'bottom';
      horizontalPosition?: 'left' | 'center' | 'right';
      // Legacy format support (for backward compatibility)
      x?: number;
      y?: number;
      baptism?: {
        x?: number;
        y?: number;
      };
      marriage?: {
        x?: number;
        y?: number;
      };
      funeral?: {
        x?: number;
        y?: number;
      };
    };
    backgroundImage?: {
      enabled?: boolean;
      column?: number;
      quadrant?: 'top' | 'middle' | 'bottom';
    };
    g1Image?: {
      enabled?: boolean;
      column?: number;
      quadrant?: 'top' | 'middle' | 'bottom';
    };
    imageLibrary?: Record<string, string[]>;
    currentImageIndex?: Record<string, number>;
  } | null>(null);

  // Collapsible Panel State
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState<boolean>(false); // Default to expanded so content is visible

  // Toast state
  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');
  // Enhanced table theming
  const [enhancedTableState, setEnhancedTableState] = useState(enhancedTableStore.getState());
  
  // Check if current theme is a pre-defined theme (should always use theme colors)
  const isPreDefinedTheme = ['orthodox_traditional', 'great_lent', 'pascha', 'nativity', 'palm_sunday', 'theotokos_feasts'].includes(enhancedTableState.liturgicalTheme);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    const unsubscribe = enhancedTableStore.subscribe(() => {
      // Debounce store updates to prevent message handler violations
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        startTransition(() => {
          setEnhancedTableState(enhancedTableStore.getState());
        });
      }, 0);
    });
    return () => {
      unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Toast helper functions
  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  // API functions


  // Load record settings
  const loadRecordSettings = async () => {
    if (!selectedChurch) return;
    
    try {
      const response = await fetch(`/api/admin/churches/${selectedChurch}/record-settings`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setRecordSettings(data.settings);
        } else {
          // Use default settings if none exist
          setRecordSettings({
            logo: { enabled: true, column: 3, width: 120, height: 'auto', objectFit: 'contain', opacity: 100 },
            calendar: { enabled: true, column: 2 },
            omLogo: { enabled: true, column: 4, width: 68, height: 68 },
            recordImages: { column: 1, width: 60, height: 60 },
            backgroundImage: { enabled: true },
            g1Image: { enabled: true },
          });
        }
      }
    } catch (err) {
      console.error('Error loading record settings:', err);
      // Use default settings on error
      setRecordSettings({
        logo: { enabled: true, column: 3, width: 120, height: 'auto', objectFit: 'contain', opacity: 100 },
        calendar: { enabled: true, column: 2 },
        omLogo: { enabled: true, column: 4, width: 68, height: 68 },
        recordImages: { column: 1, width: 60, height: 60 },
        backgroundImage: { enabled: true },
        g1Image: { enabled: true },
      });
    }
  };

  useEffect(() => {
    loadRecordSettings();
  }, [selectedChurch]);

  // Listen for record settings updates from other pages
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      if (event.detail?.churchId === selectedChurch) {
        loadRecordSettings();
      }
    };

    window.addEventListener('recordSettingsUpdated', handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener('recordSettingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, [selectedChurch]);

  // Load custom themes from backend when church changes
  useEffect(() => {
    const loadCustomThemes = async () => {
      if (!selectedChurch) return;
      
      try {
        const response = await fetch(`/api/admin/churches/${selectedChurch}/themes`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.themes && Object.keys(data.themes).length > 0) {
            // Sync custom themes to enhancedTableStore so they appear in dropdown
            enhancedTableStore.setCustomThemes(data.themes);
          }
        }
      } catch (err) {
        console.error('Error loading custom themes:', err);
      }
    };
    
    loadCustomThemes();
  }, [selectedChurch]);

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
        churchId: getValidChurchId(churchId),  // ← ensure numeric churchId
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
        const o = row.originalRecord ?? row;

        if (table === 'baptism') {
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

          // Extract entry_type from multiple possible sources
          const entryTypeValue = o.entry_type ?? o.entryType ?? row.entry_type ?? row.entryType ?? (row.originalRecord?.entry_type) ?? (row.originalRecord?.entryType) ?? '';
          // Extract birth_date from multiple possible sources  
          const birthDateValue = o.birth_date ?? o.birthDate ?? o.dateOfBirth ?? row.birth_date ?? row.birthDate ?? (row.originalRecord?.birth_date) ?? (row.originalRecord?.birthDate) ?? '';

          return {
            ...row,
            id: row.id || o.id || row.ID || o.ID,
            // Snake_case fields (database format) - preserve original database field names
            first_name: o.first_name ?? o.firstName ?? row.first_name ?? '',
            last_name: o.last_name ?? o.lastName ?? row.last_name ?? '',
            birth_date: birthDateValue,
            reception_date: o.reception_date ?? o.baptismDate ?? o.dateOfBaptism ?? row.reception_date ?? '',
            birthplace: o.birthplace ?? o.placeOfBirth ?? row.birthplace ?? '',
            entry_type: entryTypeValue,
            sponsors: normalizeList(sponsorsRaw),
            parents: normalizeList(parentsRaw),
            clergy: normalizeList(clergyRaw),
            // CamelCase fields (for AdvancedGridDialog and other components that expect camelCase)
            firstName: o.firstName ?? o.first_name ?? row.firstName ?? '',
            lastName: o.lastName ?? o.last_name ?? row.lastName ?? '',
            birthDate: birthDateValue, // camelCase alias for AdvancedGridDialog
            dateOfBirth: birthDateValue, // Alternative camelCase name
            dateOfBaptism: o.baptismDate ?? o.reception_date ?? o.dateOfBaptism ?? row.baptismDate ?? '',
            entryType: entryTypeValue, // camelCase alias for AdvancedGridDialog
            placeOfBirth: o.birthplace ?? o.placeOfBirth ?? row.birthplace ?? '',
            // Preserve originalRecord for reference
            originalRecord: row.originalRecord || o,
          };
        } else if (table === 'marriage') {
          const clergyRaw = firstNonEmpty(
            o.clergy, o.clergyName, o.officiant, o.priestName, o.priest, o.officiating_clergy, row.clergy
          );

          return {
            ...row,
            id: row.id || o.id || row.ID || o.ID,
            // Snake_case fields (database format)
            fname_groom: o.fname_groom ?? o.groomFirstName ?? row.fname_groom ?? '',
            lname_groom: o.lname_groom ?? o.groomLastName ?? row.lname_groom ?? '',
            fname_bride: o.fname_bride ?? o.brideFirstName ?? row.fname_bride ?? '',
            lname_bride: o.lname_bride ?? o.brideLastName ?? row.lname_bride ?? '',
            mdate: o.mdate ?? o.marriageDate ?? row.mdate ?? '',
            parentsg: o.parentsg ?? o.groomParents ?? row.parentsg ?? '',
            parentsb: o.parentsb ?? o.brideParents ?? row.parentsb ?? '',
            witness: o.witness ?? o.witnesses ?? row.witness ?? '',
            mlicense: o.mlicense ?? o.marriageLicense ?? row.mlicense ?? '',
            clergy: normalizeList(clergyRaw),
            // CamelCase fields (for AdvancedGridDialog)
            groomFirstName: o.groomFirstName ?? o.fname_groom ?? row.groomFirstName ?? '',
            groomLastName: o.groomLastName ?? o.lname_groom ?? row.groomLastName ?? '',
            brideFirstName: o.brideFirstName ?? o.fname_bride ?? row.brideFirstName ?? '',
            brideLastName: o.brideLastName ?? o.lname_bride ?? row.brideLastName ?? '',
            marriageDate: o.marriageDate ?? o.mdate ?? row.marriageDate ?? '',
            groomParents: o.groomParents ?? o.parentsg ?? row.groomParents ?? '',
            brideParents: o.brideParents ?? o.parentsb ?? row.brideParents ?? '',
            witnesses: o.witnesses ?? o.witness ?? row.witnesses ?? '',
            marriageLicense: o.marriageLicense ?? o.mlicense ?? row.marriageLicense ?? '',
            // Preserve originalRecord for reference
            originalRecord: row.originalRecord || o,
          };
        } else if (table === 'funeral') {
          const clergyRaw = firstNonEmpty(
            o.clergy, o.clergyName, o.officiant, o.priestName, o.priest, o.officiating_clergy, row.clergy
          );

          // Funeral records use 'name' and 'lastname' in the database, not 'first_name' and 'last_name'
          const nameValue = o.name ?? o.firstName ?? o.first_name ?? row.name ?? '';
          const lastnameValue = o.lastname ?? o.lastName ?? o.last_name ?? row.lastname ?? '';
          const burialDateValue = o.burial_date ?? o.burialDate ?? o.funeralDate ?? row.burial_date ?? '';

          return {
            ...row,
            id: row.id || o.id || row.ID || o.ID,
            // Snake_case fields (database format) - use actual DB column names
            name: nameValue,
            lastname: lastnameValue,
            first_name: nameValue, // Alias for compatibility
            last_name: lastnameValue, // Alias for compatibility
            deceased_date: o.deceased_date ?? o.deathDate ?? o.dateOfDeath ?? row.deceased_date ?? '',
            burial_date: burialDateValue,
            age: o.age ?? row.age ?? '',
            burial_location: o.burial_location ?? o.burialLocation ?? row.burial_location ?? '',
            clergy: normalizeList(clergyRaw),
            // CamelCase fields (for AdvancedGridDialog)
            firstName: nameValue,
            lastName: lastnameValue,
            deathDate: o.deathDate ?? o.deceased_date ?? o.dateOfDeath ?? row.deathDate ?? '',
            funeralDate: burialDateValue,
            burialDate: burialDateValue, // Alternative camelCase name
            burialLocation: o.burialLocation ?? o.burial_location ?? row.burialLocation ?? '',
            // Preserve originalRecord for reference
            originalRecord: row.originalRecord || o,
          };
        }
        return row;
      });

      if (!ctrl.signal.aborted) {
        // Use startTransition for large state updates to prevent message handler violations
        startTransition(() => {
          setRecords(processedRows);
          setPage(0); // Reset pagination when records change
        });
        // Update priest options from the loaded records (can be async)
        fetchPriestOptions(table, processedRows);
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

  // Fetch all record types for Advanced Grid Dialog
  const fetchAllRecordTypes = async (churchId?: number) => {
    if (!churchId) return;

    const ctrl = new AbortController();
    const datasets: { baptism: any[]; marriage: any[]; funeral: any[] } = {
      baptism: [],
      marriage: [],
      funeral: []
    };
    const counts: { baptism: number; marriage: number; funeral: number } = {
      baptism: 0,
      marriage: 0,
      funeral: 0
    };

    try {
      // Helper function to normalize records (same logic as fetchRecords)
      const firstNonEmpty = (...vals: any[]) =>
        vals.find(v => (Array.isArray(v) ? v.length : v !== null && v !== undefined && String(v).trim?.() !== ''));

      const normalizeList = (v: any): string => {
        if (v == null) return '';
        if (Array.isArray(v)) return v.filter(Boolean).join(', ');
        if (typeof v === 'object') return Object.values(v).filter(Boolean).join(', ');
        return String(v);
      };

      // Fetch baptism records
      try {
        const { rows: baptismRows, count: baptismCount } = await listRecords({
          table: 'baptism',
          churchId: getValidChurchId(churchId),
          page: 1,
          limit: 10000,
          sortField: 'baptismDate',
          sortDirection: 'desc',
          signal: ctrl.signal
        });

        const processedBaptism = baptismRows.map((row) => {
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
          const entryTypeValue = o.entry_type ?? o.entryType ?? row.entry_type ?? row.entryType ?? (row.originalRecord?.entry_type) ?? (row.originalRecord?.entryType) ?? '';
          const birthDateValue = o.birth_date ?? o.birthDate ?? o.dateOfBirth ?? row.birth_date ?? row.birthDate ?? (row.originalRecord?.birth_date) ?? (row.originalRecord?.birthDate) ?? '';

          return {
            ...row,
            id: row.id || o.id || row.ID || o.ID,
            first_name: o.first_name ?? o.firstName ?? row.first_name ?? '',
            last_name: o.last_name ?? o.lastName ?? row.last_name ?? '',
            birth_date: birthDateValue,
            reception_date: o.reception_date ?? o.baptismDate ?? o.dateOfBaptism ?? row.reception_date ?? '',
            birthplace: o.birthplace ?? o.placeOfBirth ?? row.birthplace ?? '',
            entry_type: entryTypeValue,
            sponsors: normalizeList(sponsorsRaw),
            parents: normalizeList(parentsRaw),
            clergy: normalizeList(clergyRaw),
            firstName: o.firstName ?? o.first_name ?? row.firstName ?? '',
            lastName: o.lastName ?? o.last_name ?? row.lastName ?? '',
            birthDate: birthDateValue,
            dateOfBirth: birthDateValue,
            dateOfBaptism: o.baptismDate ?? o.reception_date ?? o.dateOfBaptism ?? row.baptismDate ?? '',
            entryType: entryTypeValue,
            placeOfBirth: o.birthplace ?? o.placeOfBirth ?? row.birthplace ?? '',
            originalRecord: row.originalRecord || o,
          };
        });

        datasets.baptism = processedBaptism;
        counts.baptism = baptismCount || processedBaptism.length;
      } catch (err) {
        console.error('Error fetching baptism records:', err);
      }

      // Fetch marriage records
      try {
        const { rows: marriageRows, count: marriageCount } = await listRecords({
          table: 'marriage',
          churchId: getValidChurchId(churchId),
          page: 1,
          limit: 10000,
          sortField: 'marriageDate',
          sortDirection: 'desc',
          signal: ctrl.signal
        });

        const processedMarriage = marriageRows.map((row) => {
          const o = row.originalRecord ?? row;
          const clergyRaw = firstNonEmpty(
            o.clergy, o.clergyName, o.officiant, o.priestName, o.priest, o.officiating_clergy, row.clergy
          );

          return {
            ...row,
            id: row.id || o.id || row.ID || o.ID,
            fname_groom: o.fname_groom ?? o.groomFirstName ?? row.fname_groom ?? '',
            lname_groom: o.lname_groom ?? o.groomLastName ?? row.lname_groom ?? '',
            fname_bride: o.fname_bride ?? o.brideFirstName ?? row.fname_bride ?? '',
            lname_bride: o.lname_bride ?? o.brideLastName ?? row.lname_bride ?? '',
            mdate: o.mdate ?? o.marriageDate ?? row.mdate ?? '',
            parentsg: o.parentsg ?? o.groomParents ?? row.parentsg ?? '',
            parentsb: o.parentsb ?? o.brideParents ?? row.parentsb ?? '',
            witness: o.witness ?? o.witnesses ?? row.witness ?? '',
            mlicense: o.mlicense ?? o.marriageLicense ?? row.mlicense ?? '',
            clergy: normalizeList(clergyRaw),
            groomFirstName: o.groomFirstName ?? o.fname_groom ?? row.groomFirstName ?? '',
            groomLastName: o.groomLastName ?? o.lname_groom ?? row.groomLastName ?? '',
            brideFirstName: o.brideFirstName ?? o.fname_bride ?? row.brideFirstName ?? '',
            brideLastName: o.brideLastName ?? o.lname_bride ?? row.brideLastName ?? '',
            marriageDate: o.marriageDate ?? o.mdate ?? row.marriageDate ?? '',
            groomParents: o.groomParents ?? o.parentsg ?? row.groomParents ?? '',
            brideParents: o.brideParents ?? o.parentsb ?? row.brideParents ?? '',
            witnesses: o.witnesses ?? o.witness ?? row.witnesses ?? '',
            marriageLicense: o.marriageLicense ?? o.mlicense ?? row.marriageLicense ?? '',
            originalRecord: row.originalRecord || o,
          };
        });

        datasets.marriage = processedMarriage;
        counts.marriage = marriageCount || processedMarriage.length;
      } catch (err) {
        console.error('Error fetching marriage records:', err);
      }

      // Fetch funeral records
      try {
        const { rows: funeralRows, count: funeralCount } = await listRecords({
          table: 'funeral',
          churchId: getValidChurchId(churchId),
          page: 1,
          limit: 10000,
          sortField: 'funeralDate',
          sortDirection: 'desc',
          signal: ctrl.signal
        });

        const processedFuneral = funeralRows.map((row) => {
          const o = row.originalRecord ?? row;
          const clergyRaw = firstNonEmpty(
            o.clergy, o.clergyName, o.officiant, o.priestName, o.priest, o.officiating_clergy, row.clergy
          );
          const nameValue = o.name ?? o.firstName ?? o.first_name ?? row.name ?? '';
          const lastnameValue = o.lastname ?? o.lastName ?? o.last_name ?? row.lastname ?? '';
          const burialDateValue = o.burial_date ?? o.burialDate ?? o.funeralDate ?? row.burial_date ?? '';

          return {
            ...row,
            id: row.id || o.id || row.ID || o.ID,
            name: nameValue,
            lastname: lastnameValue,
            first_name: nameValue,
            last_name: lastnameValue,
            deceased_date: o.deceased_date ?? o.deathDate ?? o.dateOfDeath ?? row.deceased_date ?? '',
            burial_date: burialDateValue,
            age: o.age ?? row.age ?? '',
            burial_location: o.burial_location ?? o.burialLocation ?? row.burial_location ?? '',
            clergy: normalizeList(clergyRaw),
            firstName: nameValue,
            lastName: lastnameValue,
            deathDate: o.deathDate ?? o.deceased_date ?? o.dateOfDeath ?? row.deathDate ?? '',
            funeralDate: burialDateValue,
            burialDate: burialDateValue,
            burialLocation: o.burialLocation ?? o.burial_location ?? row.burialLocation ?? '',
            originalRecord: row.originalRecord || o,
          };
        });

        datasets.funeral = processedFuneral;
        counts.funeral = funeralCount || processedFuneral.length;
      } catch (err) {
        console.error('Error fetching funeral records:', err);
      }

      if (!ctrl.signal.aborted) {
        setAllRecordsDatasets(datasets);
        setAllRecordsCounts(counts);
      }
    } catch (err) {
      console.error('Error fetching all record types:', err);
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
        // Use /api/church-info endpoint which gets church from session
        // Add timeout to prevent long waits that cause message handler violations
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          const response = await fetch('/api/churches/church-info', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Failed to fetch church info: ${response.status}`);
          }

          const data = await response.json();

          // Handle both ApiResponse format and direct church object
          const churchData = data.church || data.data?.church || data;

          if (churchData && (churchData.id || churchData.church_id)) {
            const church: Church = {
              id: churchData.id || churchData.church_id,
              church_name: churchData.name || churchData.church_name,
              name: churchData.name || churchData.church_name,
              email: churchData.email,
              is_active: churchData.is_active !== undefined ? churchData.is_active : 1
            };

            // Batch state updates to prevent cascading re-renders
            startTransition(() => {
              setChurches([church]);
              console.log('🏛️ Church info loaded:', church.church_name);

              // Update selected church if needed
              if (selectedChurch === 0 || !selectedChurch) {
                setSelectedChurch(church.id);
              }
            });

            // Don't fetch records here - let the useEffect below handle it based on selectedRecordType
          } else {
            throw new Error('Invalid church data received');
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timeout: Church info fetch took too long');
          }
          throw fetchError;
        }
      } catch (error) {
        console.error('❌ Error fetching church info:', error);
        // Fallback to hardcoded church 46 if API fails
        // Batch state updates to prevent message handler violations
        startTransition(() => {
          const fallbackChurch: Church = {
            id: 46,
            church_name: 'Saints Peter & Paul',
            name: 'Saints Peter & Paul',
          };
          setChurches([fallbackChurch]);
          console.log('🏛️ Using fallback church setup');
          // Set selected church if not already set
          if (selectedChurch === 0 || !selectedChurch) {
            setSelectedChurch(46);
          }
        });
        // Don't fetch records here - let the useEffect below handle it
      }
    };

    fetchChurchInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - don't refetch when selectedRecordType changes

  // Fetch records when selectedRecordType or selectedChurch changes
  useEffect(() => {
    if (selectedChurch && selectedChurch !== 0 && selectedRecordType) {
      console.log(`🔄 Fetching ${selectedRecordType} records for church ${selectedChurch}`);
      fetchRecords(selectedRecordType, selectedChurch);
    }
  }, [selectedRecordType, selectedChurch]); // Fetch when record type or church changes

  // Fetch field mappings from field mapper
  const fetchFieldMappings = async (churchId: number, tableName: string) => {
    try {
      const tableMap: Record<string, string> = {
        'baptism': 'baptism_records',
        'marriage': 'marriage_records',
        'funeral': 'funeral_records',
      };
      const dbTableName = tableMap[tableName] || `${tableName}_records`;

      // Get table columns
      const { columns } = await adminAPI.churches.getTableColumns(churchId, dbTableName);
      setTableColumns(columns);

      // Try to fetch field mapper settings
      const mappingCandidates = [
        `/api/admin/churches/${churchId}/field-mapper?table=${encodeURIComponent(dbTableName)}`,
        `/admin/churches/${churchId}/field-mapper?table=${encodeURIComponent(dbTableName)}`,
      ];

      let mappingData: any = null;
      for (const url of mappingCandidates) {
        try {
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            mappingData = await res.json();
            break;
          }
        } catch {
          // Try next candidate
        }
      }

      if (mappingData) {
        setFieldMappings(mappingData.mappings || {});
        setFieldVisibility(mappingData.field_settings?.visibility || {});
        setFieldSortable(mappingData.field_settings?.sortable || {});
      } else {
        // Default: all columns visible and sortable
        const defaultVisibility: Record<string, boolean> = {};
        const defaultSortable: Record<string, boolean> = {};
        columns.forEach(col => {
          defaultVisibility[col] = true;
          defaultSortable[col] = true;
        });
        setFieldVisibility(defaultVisibility);
        setFieldSortable(defaultSortable);
        setFieldMappings({});
      }
    } catch (err) {
      console.error('Error fetching field mappings:', err);
      // Set defaults on error
      const defaultVisibility: Record<string, boolean> = {};
      const defaultSortable: Record<string, boolean> = {};
      tableColumns.forEach(col => {
        defaultVisibility[col] = true;
        defaultSortable[col] = true;
      });
      setFieldVisibility(defaultVisibility);
      setFieldSortable(defaultSortable);
    }
  };

  useEffect(() => {
    if (selectedRecordType && selectedChurch) {
      fetchFieldMappings(selectedChurch, selectedRecordType);
      fetchRecords(selectedRecordType, selectedChurch);
      // fetchPriestOptions will be called when records are loaded
    }
  }, [selectedRecordType, selectedChurch]);

  // Generate columns from field mapper settings
  const generateColumnsFromFieldMapper = useMemo(() => {
    if (tableColumns.length === 0) return [];

    // Map database column names to potential record field names
    const fieldNameMap: Record<string, string[]> = {
      'id': ['id', 'ID'],
      'first_name': ['first_name', 'firstName'],
      'last_name': ['last_name', 'lastName'],
      'birth_date': ['birth_date', 'dateOfBirth', 'birthDate'],
      'reception_date': ['reception_date', 'dateOfBaptism', 'baptismDate'],
      'birthplace': ['birthplace', 'placeOfBirth'],
      'entry_type': ['entry_type', 'entryType'],
      'sponsors': ['sponsors', 'godparentNames', 'godparents'],
      'parents': ['parents', 'parentsName'],
      'clergy': ['clergy', 'priest', 'clergyName'],
      'church_id': ['church_id', 'churchId'],
      // Marriage record mappings
      'fname_groom': ['fname_groom', 'groomFirstName'],
      'lname_groom': ['lname_groom', 'groomLastName'],
      'fname_bride': ['fname_bride', 'brideFirstName'],
      'lname_bride': ['lname_bride', 'brideLastName'],
      'mdate': ['mdate', 'marriageDate'],
      'parentsg': ['parentsg', 'groomParents'],
      'parentsb': ['parentsb', 'brideParents'],
      'witness': ['witness', 'witnesses'],
      'mlicense': ['mlicense', 'marriageLicense'],
      // Funeral record mappings
      'name': ['name', 'firstName', 'first_name'],
      'lastname': ['lastname', 'lastName', 'last_name'],
      'deceased_date': ['deceased_date', 'deathDate', 'dateOfDeath'],
      'burial_date': ['burial_date', 'burialDate', 'funeralDate'],
      'burial_location': ['burial_location', 'burialLocation'],
    };

    return tableColumns
      .filter(col => {
        // Only show columns that are marked as visible (default to true if not set)
        return fieldVisibility[col] !== false;
      })
      .map(col => {
        // Get display name from field mapper, or humanize the column name
        const displayName = fieldMappings[col] || col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Find the actual field name in records (could be snake_case or camelCase)
        const possibleFieldNames = fieldNameMap[col] || [col];
        const actualFieldName = possibleFieldNames[0]; // Use the database column name first

        // Helper function to format dates
        const formatDateValue = (dateValue: any): string => {
          if (!dateValue) return '';
          // If already formatted as YYYY-MM-DD, return as-is
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return new Date(dateValue).toLocaleDateString();
          }
          // Handle ISO datetime strings (e.g., "2025-08-01T04:00:00.000Z")
          if (typeof dateValue === 'string' && dateValue.includes('T')) {
            const datePart = dateValue.split('T')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
              return new Date(datePart).toLocaleDateString();
            }
          }
          // Try to parse as date
          try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString();
            }
          } catch (e) {
            // If parsing fails, return original value
          }
          return String(dateValue);
        };

        // Check if this is a date field
        const isDateField = ['deceased_date', 'burial_date', 'mdate', 'marriageDate', 'reception_date', 'birth_date', 'deathDate', 'funeralDate', 'dateOfDeath', 'dateOfFuneral', 'dateOfBaptism', 'dateOfBirth'].includes(col) ||
          possibleFieldNames.some(fn => ['deceased_date', 'burial_date', 'mdate', 'marriageDate', 'reception_date', 'birth_date', 'deathDate', 'funeralDate', 'dateOfDeath', 'dateOfFuneral', 'dateOfBaptism', 'dateOfBirth'].includes(fn));

        return {
          field: col, // Use the database column name as the field
          headerName: displayName,
          sortable: fieldSortable[col] !== false,
          hide: false,
          valueGetter: (row: any) => {
            let value: any = null;
            
            // Try multiple field name variations
            for (const fieldName of possibleFieldNames) {
              const val = row[fieldName];
              if (val !== undefined && val !== null) {
                value = val;
                break;
              }
            }
            
            // Also try the original column name
            if (value === null || value === undefined) {
              const colValue = row[col];
              if (colValue !== undefined && colValue !== null) {
                value = colValue;
              }
            }
            
            // Try originalRecord if it exists
            if ((value === null || value === undefined) && row.originalRecord) {
              for (const fieldName of possibleFieldNames) {
                const origValue = row.originalRecord[fieldName];
                if (origValue !== undefined && origValue !== null) {
                  value = origValue;
                  break;
                }
              }
              if (value === null || value === undefined) {
                const origColValue = row.originalRecord[col];
                if (origColValue !== undefined && origColValue !== null) {
                  value = origColValue;
                }
              }
            }
            
            // Format date if this is a date field
            if (isDateField && value) {
              return formatDateValue(value);
            }
            
            return value !== null && value !== undefined ? value : '';
          },
        };
      });
  }, [tableColumns, fieldMappings, fieldVisibility, fieldSortable]);

  // Form state
  const [formData, setFormData] = useState<Partial<BaptismRecord> & { customPriest?: boolean }>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    dateOfBaptism: '',
    placeOfBirth: '',
    entry_type: 'Baptism',
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

  // Bridge effect: Sync useTableStyleStore → enhancedTableStore.tokens
  // This ensures liturgical themes from the editor are applied to the actual table
  // IMPORTANT: Only update if the value from useTableStyleStore is explicitly set and different
  // This preserves localStorage values that were manually configured
  // SKIP this effect when theme is changed via dropdown to prevent reverting
  const [themeChangeTimestamp, setThemeChangeTimestamp] = useState<number>(0);
  
  useEffect(() => {
    // Debounce store updates to prevent message handler violations
    const timeoutId = setTimeout(() => {
      startTransition(() => {
        // Skip bridge effect if theme was just changed (within last 2 seconds)
        const now = Date.now();
        if (now - themeChangeTimestamp < 2000) {
          return;
        }

        const headerStyle = getTableHeaderStyle() as any;
        const rowStyleOdd = getTableRowStyle('odd') as any;
        const rowStyleEven = getTableRowStyle('even') as any;
        const cellStyle = getTableCellStyle('body') as any;

        enhancedTableStore.setState((state) => {
          // Only update tokens if useTableStyleStore has explicit values
          // This prevents overwriting localStorage values with defaults
          // IMPORTANT: For pre-defined themes, always use the current default from THEME_MAP
          const newTokens = { ...state.tokens };
          
          // Check if current theme is a pre-defined theme
          const isPreDefinedTheme = Object.keys(THEME_MAP).includes(state.liturgicalTheme);
          
          if (isPreDefinedTheme) {
            // For pre-defined themes, use dark or light mode tokens based on current theme mode
            const isDarkMode = theme.palette.mode === 'dark';
            const themeTokens = getThemeTokens(state.liturgicalTheme as LiturgicalThemeKey, isDarkMode);
            newTokens.headerBg = themeTokens.headerBg;
            newTokens.headerText = themeTokens.headerText;
            newTokens.rowOddBg = themeTokens.rowOddBg;
            newTokens.rowEvenBg = themeTokens.rowEvenBg;
            newTokens.border = themeTokens.border;
            newTokens.accent = themeTokens.accent;
            newTokens.cellText = themeTokens.cellText;
          } else {
            // For custom themes, only update if the value is explicitly set (not undefined/null) and different
            if (headerStyle?.backgroundColor && headerStyle.backgroundColor !== state.tokens.headerBg) {
              newTokens.headerBg = headerStyle.backgroundColor;
              newTokens.accent = headerStyle.backgroundColor; // accent matches header
            }
            if (headerStyle?.color && headerStyle.color !== state.tokens.headerText) {
              newTokens.headerText = headerStyle.color;
            }
            if (rowStyleOdd?.backgroundColor && rowStyleOdd.backgroundColor !== state.tokens.rowOddBg) {
              newTokens.rowOddBg = rowStyleOdd.backgroundColor;
            }
            if (rowStyleEven?.backgroundColor && rowStyleEven.backgroundColor !== state.tokens.rowEvenBg) {
              newTokens.rowEvenBg = rowStyleEven.backgroundColor;
            }
            if (headerStyle?.borderColor && headerStyle.borderColor !== state.tokens.border) {
              newTokens.border = headerStyle.borderColor;
            }
            if (cellStyle?.color && cellStyle.color !== state.tokens.cellText) {
              newTokens.cellText = cellStyle.color;
            }
          }

          return {
            ...state,
            tokens: newTokens,
          };
        });
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    currentTheme,
    isLiturgicalMode,
    tableTheme,
    getTableHeaderStyle,
    getTableRowStyle,
    getTableCellStyle,
    themeChangeTimestamp, // Include to reset when theme changes
    theme.palette.mode, // Re-run when dark/light mode changes
  ]);

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

  // Helper function to create human-readable labels for AG Grid
  const toLabel = (fieldName: string): string => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase())
      .replace(/\b(id|Id)\b/g, 'ID');
  };

  // Get records for current record type for AG Grid
  const getRecordsForType = useCallback((type: string): any[] => {
    if (allRecordsDatasets && allRecordsDatasets[type as keyof typeof allRecordsDatasets]) {
      return allRecordsDatasets[type as keyof typeof allRecordsDatasets] || [];
    }
    // Fallback to current records
    return filteredAndSortedRecords;
  }, [allRecordsDatasets, filteredAndSortedRecords]);

  // Generate column definitions dynamically from the actual data (same as AdvancedGridDialog)
  const getAGGridColumnDefinitions = useCallback((type: string): ColDef[] => {
    const typeRecords = getRecordsForType(type);
    if (!typeRecords || typeRecords.length === 0) {
      return [];
    }

    // Helper function to determine column type and formatter
    const getColumnConfig = (fieldName: string, value: any): Partial<ColDef> => {
      const config: Partial<ColDef> = {
        headerName: toLabel(fieldName),
        field: fieldName,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        flex: 1,
        minWidth: 120
      };

      // Special handling for specific fields
      if (fieldName === 'id') {
        config.pinned = 'left';
        config.width = 80;
        config.flex = undefined;
      }

      // Date fields
      if (fieldName.includes('date') || fieldName.includes('Date') ||
        fieldName === 'dateOfBaptism' || fieldName === 'marriageDate' ||
        fieldName === 'funeralDate' || fieldName === 'deathDate' ||
        fieldName === 'birthDate' || fieldName === 'reception_date' ||
        fieldName === 'birth_date') {
        config.filter = 'agDateColumnFilter';
        config.valueFormatter = (params) => {
          if (params.value) {
            return new Date(params.value).toLocaleDateString();
          }
          return '';
        };
      }

      // Number fields
      if (typeof value === 'number') {
        config.filter = 'agNumberColumnFilter';
      }

      // Name fields - make them bold
      if (fieldName.includes('name') || fieldName.includes('Name') ||
        fieldName === 'firstName' || fieldName === 'lastName' ||
        fieldName === 'groomFirstName' || fieldName === 'groomLastName' ||
        fieldName === 'brideFirstName' || fieldName === 'brideLastName' ||
        fieldName === 'first_name' || fieldName === 'last_name') {
        config.cellStyle = { fontWeight: 'bold' };
      }

      return config;
    };

    // Define specific field order for each record type
    let orderedFields: string[] = [];

    if (type === 'baptism') {
      // Check which field naming convention is used in the records
      const hasCamelCase = typeRecords.length > 0 && ('firstName' in typeRecords[0] || 'entryType' in typeRecords[0]);
      const hasSnakeCase = typeRecords.length > 0 && ('first_name' in typeRecords[0] || 'entry_type' in typeRecords[0]);
      
      if (hasCamelCase) {
        orderedFields = ['id', 'firstName', 'lastName', 'birthDate', 'dateOfBaptism', 'birthplace', 'entryType', 'sponsors', 'parents', 'clergy'];
      } else if (hasSnakeCase) {
        orderedFields = ['id', 'first_name', 'last_name', 'birth_date', 'reception_date', 'birthplace', 'entry_type', 'sponsors', 'parents', 'clergy'];
      } else {
        // Default to snake_case (database format)
        orderedFields = ['id', 'first_name', 'last_name', 'birth_date', 'reception_date', 'birthplace', 'entry_type', 'sponsors', 'parents', 'clergy'];
      }
    } else if (type === 'marriage') {
      orderedFields = ['id', 'marriageDate', 'groomFirstName', 'groomLastName', 'groomParents', 'brideFirstName', 'brideLastName', 'brideParents', 'witness', 'marriageLicense', 'clergy'];
    } else if (type === 'funeral') {
      orderedFields = ['id', 'deathDate', 'funeralDate', 'firstName', 'lastName', 'age', 'burialLocation', 'clergy'];
    }

    // Ensure clergy is always the last column
    if (orderedFields.includes('clergy')) {
      orderedFields = orderedFields.filter(field => field !== 'clergy');
      orderedFields.push('clergy');
    }

    // Build columns in the specified order, excluding system fields
    const systemFields = ['church_id', 'created_at', 'updated_at'];
    
    // Helper to check if field exists (check both camelCase and snake_case)
    const fieldExists = (field: string): boolean => {
      if (!typeRecords.length) return false;
      const record = typeRecords[0];
      // Check exact field name
      if (field in record && record[field] !== undefined && record[field] !== null) {
        return true;
      }
      // Check alternative naming (camelCase <-> snake_case)
      if (field.includes('_')) {
        const camelCase = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        if (camelCase in record && record[camelCase] !== undefined && record[camelCase] !== null) {
          return true;
        }
      } else {
        const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (snakeCase in record && record[snakeCase] !== undefined && record[snakeCase] !== null) {
          return true;
        }
      }
      return false;
    };
    
    const availableFields = orderedFields.filter(field => {
      return fieldExists(field) && !systemFields.includes(field);
    });

    // Create columns in the exact order specified
    const columns = availableFields.map(field => {
      const config = getColumnConfig(field, typeRecords[0]?.[field]);
      
      // For fields that might have naming variations (entryType/entry_type), use valueGetter instead of field
      // This ensures we check both camelCase and snake_case versions
      if (field === 'entryType' || field === 'entry_type') {
        // Remove field property and use only valueGetter to ensure it's always called
        delete config.field;
      }
      
      // Add valueGetter to handle both camelCase and snake_case field names
      // For entryType/entry_type, this is critical since the field name might not match
      const originalValueGetter = config.valueGetter;
      config.valueGetter = (params: any) => {
        if (!params || !params.data) {
          return null;
        }
        
        // Call original valueGetter if it exists (for date formatting, etc.)
        if (originalValueGetter) {
          const result = originalValueGetter(params);
          if (result !== undefined && result !== null) {
            return result;
          }
        }
        
        // For entryType/entry_type, check both field names explicitly
        if (field === 'entryType' || field === 'entry_type') {
          // Try entryType (camelCase) first
          if ('entryType' in params.data && params.data.entryType !== undefined && params.data.entryType !== null && params.data.entryType !== '') {
            return params.data.entryType;
          }
          // Try entry_type (snake_case)
          if ('entry_type' in params.data && params.data.entry_type !== undefined && params.data.entry_type !== null && params.data.entry_type !== '') {
            return params.data.entry_type;
          }
          // Try originalRecord
          if (params.data.originalRecord) {
            if ('entryType' in params.data.originalRecord && params.data.originalRecord.entryType !== undefined && params.data.originalRecord.entryType !== null && params.data.originalRecord.entryType !== '') {
              return params.data.originalRecord.entryType;
            }
            if ('entry_type' in params.data.originalRecord && params.data.originalRecord.entry_type !== undefined && params.data.originalRecord.entry_type !== null && params.data.originalRecord.entry_type !== '') {
              return params.data.originalRecord.entry_type;
            }
          }
          return null;
        }
        
        // For other fields, try exact field name first
        if (field in params.data) {
          const value = params.data[field];
          if (value !== undefined && value !== null && value !== '') {
            return value;
          }
        }
        
        // Try alternative naming (camelCase <-> snake_case)
        if (field.includes('_')) {
          const camelCase = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          if (camelCase in params.data) {
            const value = params.data[camelCase];
            if (value !== undefined && value !== null && value !== '') {
              return value;
            }
          }
        } else {
          const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          if (snakeCase in params.data) {
            const value = params.data[snakeCase];
            if (value !== undefined && value !== null && value !== '') {
              return value;
            }
          }
        }
        
        // Try originalRecord if it exists
        if (params.data.originalRecord) {
          if (field in params.data.originalRecord) {
            const value = params.data.originalRecord[field];
            if (value !== undefined && value !== null && value !== '') {
              return value;
            }
          }
          if (field.includes('_')) {
            const camelCase = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            if (camelCase in params.data.originalRecord) {
              const value = params.data.originalRecord[camelCase];
              if (value !== undefined && value !== null && value !== '') {
                return value;
              }
            }
          } else {
            const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (snakeCase in params.data.originalRecord) {
              const value = params.data.originalRecord[snakeCase];
              if (value !== undefined && value !== null && value !== '') {
                return value;
              }
            }
          }
        }
        
        return null;
      };

      // Ensure clergy column is always last
      if (field === 'clergy') {
        config.pinned = 'right';
        config.width = 150;
        config.flex = undefined;
      }

      return config;
    }).filter(Boolean) as ColDef[];

    return columns;
  }, [getRecordsForType]);

  // Default sort per record type
  const DEFAULT_SORT: Record<string, { field: string; dir: 'asc' | 'desc' }> = {
    baptism: { field: 'dateOfBaptism', dir: 'desc' },
    marriage: { field: 'marriageDate', dir: 'desc' },
    funeral: { field: 'funeralDate', dir: 'desc' },
  };

  // Get row data for current record type for AG Grid
  const agGridRowData = useMemo(() => {
    const typeRecords = getRecordsForType(selectedRecordType);
    if (!typeRecords || typeRecords.length === 0) {
      return [];
    }
    return typeRecords;
  }, [selectedRecordType, getRecordsForType]);

  // Column definitions for AG Grid
  const agGridColumnDefs: ColDef[] = useMemo(() => {
    const cols = getAGGridColumnDefinitions(selectedRecordType);
    if (cols.length > 0) {
      const defaultSort = DEFAULT_SORT[selectedRecordType] || DEFAULT_SORT.baptism;
      const sortCol = cols.find(col => col.field === defaultSort.field);
      if (sortCol) {
        sortCol.sort = defaultSort.dir;
        sortCol.sortIndex = 0;
      }
      
      // Apply theme colors to all column headers
      cols.forEach(col => {
        if (!col.headerStyle) {
          col.headerStyle = {
            backgroundColor: enhancedTableState.tokens.headerBg,
            background: enhancedTableState.tokens.headerBg,
            color: enhancedTableState.tokens.headerText,
            borderColor: enhancedTableState.tokens.border,
            borderBottomColor: enhancedTableState.tokens.border,
            fontWeight: 'bold',
          };
        } else {
          col.headerStyle = {
            ...col.headerStyle,
            backgroundColor: enhancedTableState.tokens.headerBg,
            background: enhancedTableState.tokens.headerBg,
            color: enhancedTableState.tokens.headerText,
            borderColor: enhancedTableState.tokens.border,
            borderBottomColor: enhancedTableState.tokens.border,
          };
        }
      });
    }
    return cols;
  }, [selectedRecordType, getAGGridColumnDefinitions, enhancedTableState.tokens]);

  // Default column properties for AG Grid
  const agGridDefaultColDef: ColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    suppressMovable: false,
    hide: false,
    headerStyle: {
      backgroundColor: enhancedTableState.tokens.headerBg,
      color: enhancedTableState.tokens.headerText,
      borderColor: enhancedTableState.tokens.border,
      fontWeight: 'bold',
    },
    cellStyle: (params: any) => {
      const rowIndex = params.node?.rowIndex ?? 0;
      return {
        backgroundColor: rowIndex % 2 === 0 
          ? enhancedTableState.tokens.rowEvenBg 
          : enhancedTableState.tokens.rowOddBg,
        color: enhancedTableState.tokens.cellText,
        borderColor: enhancedTableState.tokens.border,
      };
    },
  }), [enhancedTableState.tokens]);

  // Grid ready event for AG Grid
  const onAGGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    // Apply default sort
    const defaultSort = DEFAULT_SORT[selectedRecordType] || DEFAULT_SORT.baptism;
    if (typeof params.api.applyColumnState === 'function') {
      params.api.applyColumnState({
        state: [{ colId: defaultSort.field, sort: defaultSort.dir }],
        defaultState: { sort: null }
      });
    }
  }, [selectedRecordType]);

  // Ensure we have data - fetch if needed when switching to advanced view
  useEffect(() => {
    if (viewMode === 'advanced' && (!allRecordsDatasets.baptism.length || !allRecordsDatasets.marriage.length || !allRecordsDatasets.funeral.length)) {
      fetchAllRecordTypes(selectedChurch);
    }
  }, [viewMode, selectedChurch, allRecordsDatasets, fetchAllRecordTypes]);

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
    
    // Initialize form data based on record type
    if (selectedRecordType === 'baptism') {
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        dateOfBaptism: '',
        placeOfBirth: '',
        entry_type: 'Baptism',
        fatherName: '',
        motherName: '',
        godparentNames: '',
        priest: '',
        registryNumber: '',
        churchId: selectedChurch === 0 ? '46' : selectedChurch.toString(),
        notes: '',
        customPriest: false,
      });
    } else if (selectedRecordType === 'marriage') {
      setFormData({
        fname_groom: '',
        lname_groom: '',
        fname_bride: '',
        lname_bride: '',
        mdate: '',
        parentsg: '',
        parentsb: '',
        witness: '',
        mlicense: '',
        clergy: '',
        priest: '',
        churchId: selectedChurch === 0 ? '46' : selectedChurch.toString(),
        customPriest: false,
      });
      } else if (selectedRecordType === 'funeral') {
        setFormData({
          firstName: '',
          lastName: '',
          dateOfDeath: '',
          burialDate: '',
          age: '',
          burialLocation: '',
          priest: '',
          churchId: selectedChurch === 0 ? '46' : selectedChurch.toString(),
          customPriest: false,
        });
      }
    setDialogOpen(true);
  };

  const handleEditRecord = (record: BaptismRecord) => {
    setEditingRecord(record);
    setEditingRecords([]); // Clear multiple records array when editing single record
    setCurrentEditingIndex(0);
    // Map record fields to formData, ensuring entry_type is included
    setFormData({
      ...record,
      entry_type: record.entry_type || record.entryType || 'Baptism',
    });
    setDialogOpen(true);
  };

  const handleViewRecord = (record: BaptismRecord) => {
    console.log('Viewing record:', record);
    setViewingRecord(record);
    setEditingRecord(null); // Clear editing mode

    // Set form data for display - handle both field name formats
    const formDataToSet: any = {};
    if (selectedRecordType === 'baptism') {
      formDataToSet.firstName = record.firstName || record.first_name || '';
      formDataToSet.lastName = record.lastName || record.last_name || '';
      formDataToSet.dateOfBirth = record.dateOfBirth || record.birth_date || '';
      formDataToSet.dateOfBaptism = record.dateOfBaptism || record.reception_date || '';
      formDataToSet.placeOfBirth = record.placeOfBirth || record.birthplace || '';
      formDataToSet.entry_type = record.entry_type || record.entryType || '';
      formDataToSet.godparentNames = record.godparentNames || record.sponsors || '';
      formDataToSet.parents = record.parents || '';
      formDataToSet.priest = record.priest || record.clergy || '';
      formDataToSet.churchId = String(record.churchId || selectedChurch);
    } else if (selectedRecordType === 'marriage') {
      formDataToSet.fname_groom = record.fname_groom || '';
      formDataToSet.lname_groom = record.lname_groom || '';
      formDataToSet.fname_bride = record.fname_bride || '';
      formDataToSet.lname_bride = record.lname_bride || '';
      formDataToSet.mdate = record.mdate || record.marriageDate || '';
      formDataToSet.parentsg = record.parentsg || record.groomParents || '';
      formDataToSet.parentsb = record.parentsb || record.brideParents || '';
      formDataToSet.witness = record.witness || record.witnesses || '';
      formDataToSet.mlicense = record.mlicense || record.marriageLicense || '';
      formDataToSet.clergy = record.clergy || record.priest || '';
      formDataToSet.priest = record.clergy || record.priest || '';
      formDataToSet.churchId = String(record.churchId || selectedChurch);
    }
    setFormData(formDataToSet);
    setDialogOpen(true);

    let recordName = '';
    if (selectedRecordType === 'marriage') {
      const groomName = `${record.fname_groom || ''} ${record.lname_groom || ''}`.trim();
      const brideName = `${record.fname_bride || ''} ${record.lname_bride || ''}`.trim();
      recordName = `${groomName} & ${brideName}`;
    } else {
      const firstName = record.firstName || record.first_name || '';
      const lastName = record.lastName || record.last_name || '';
      recordName = `${firstName} ${lastName}`.trim();
    }
    showToast(`Viewing record: ${recordName}`, 'info');
  };

  const handleGenerateCertificate = async (record: BaptismRecord) => {
    console.log('Generating certificate for record:', record);
    setCertificateRecord(record);
    setCertificateDialogOpen(true);
    setCertificateLoading(true);
    setCertificatePreviewUrl(null);

    try {
      // Determine certificate type based on selected record type
      const certType = selectedRecordType === 'marriage' ? 'marriage' : 'baptism';
      const recordId = record.id || record.ID;
      const churchId = selectedChurch || 46;
      
      // Call the church-specific preview endpoint to get base64 image
      const response = await fetch(`/api/church/${churchId}/certificate/${certType}/${recordId}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldOffsets: {},
          hiddenFields: [],
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate certificate preview');
      }

      const data = await response.json();
      if (data.success && data.preview) {
        setCertificatePreviewUrl(data.preview);
      } else {
        throw new Error(data.error || 'Failed to generate certificate');
      }
    } catch (error: any) {
      console.error('Certificate generation error:', error);
      showToast(error.message || 'Failed to generate certificate preview', 'error');
    } finally {
      setCertificateLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!certificateRecord) return;
    
    try {
      const certType = selectedRecordType === 'marriage' ? 'marriage' : 'baptism';
      const recordId = certificateRecord.id || certificateRecord.ID;
      const churchId = selectedChurch || 46;
      
      // Open download URL in new tab
      window.open(`/api/church/${churchId}/certificate/${certType}/${recordId}/download`, '_blank');
      showToast('Certificate download started', 'success');
    } catch (error) {
      console.error('Certificate download error:', error);
      showToast('Failed to download certificate', 'error');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        setLoading(true);

        // Ensure recordId is properly formatted
        const id = String(recordId).trim();
        if (!id) {
          throw new Error('Invalid record ID');
        }

        // Try to get the numeric ID if available (some backends require numeric IDs)
        const numericId = Number(id);
        const idToUse = !isNaN(numericId) && numericId > 0 ? numericId.toString() : id;

        // Build endpoint with church_id query parameter
        const baseEndpoint = selectedRecordType === 'baptism'
          ? `/api/baptism-records/${idToUse}`
          : selectedRecordType === 'marriage'
            ? `/api/marriage-records/${idToUse}`
            : `/api/funeral-records/${idToUse}`;
        
        const endpoint = `${baseEndpoint}?church_id=${selectedChurch}`;

        console.log(`Attempting to delete ${selectedRecordType} record with ID: ${idToUse} (original: ${id}) from endpoint: ${endpoint}`);
        
        // Log the record being deleted for debugging
        const recordToDelete = records.find(r => String(r.id) === String(recordId));
        if (recordToDelete) {
          console.log(`Record details:`, {
            id: recordToDelete.id,
            type: selectedRecordType,
            church_id: selectedChurch,
            record: recordToDelete
          });
        } else {
          console.warn(`Record ${recordId} not found in local records array, but proceeding with delete request`);
        }

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        console.log(`Delete response status: ${response.status} for ${selectedRecordType} record ${id}`);

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            // If response is not JSON, try to get text
            const text = await response.text();
            errorData = { error: text || `Failed to delete record: ${response.status}` };
          }
          
          const errorMessage = errorData.error || errorData.message || `Failed to delete record: ${response.status}`;
          console.error(`Delete failed for ${selectedRecordType} record ${id}:`, errorMessage, errorData);
          throw new Error(errorMessage);
        }

        // Try to parse response if it's JSON
        try {
          const result = await response.json();
          console.log(`Successfully deleted ${selectedRecordType} record ${id}:`, result);
        } catch (e) {
          // Response might be empty, which is fine
          console.log(`Successfully deleted ${selectedRecordType} record ${id} (empty response)`);
        }

        setRecords(prev => prev.filter(r => String(r.id) !== String(recordId)));
        setSelectedRecords(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(recordId));
          return newSet;
        });
        setNewlyAddedRecordIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(recordId));
          return newSet;
        });
        showToast('Record deleted successfully', 'success');

        // Close dialog if it's open
        if (editingRecord && String(editingRecord.id) === String(recordId)) {
          setDialogOpen(false);
          setEditingRecord(null);
        }

        // Refresh records
        await fetchRecords(selectedRecordType, selectedChurch);
      } catch (err: any) {
        console.error('Delete error:', err);
        const errorMessage = err.message || 'Failed to delete record. Please try again.';
        showToast(errorMessage, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkEdit = () => {
    if (selectedRecords.size === 0) {
      showToast('No records selected', 'info');
      return;
    }

    // Get all selected records
    const selectedRecordIds = Array.from(selectedRecords);
    const selectedRecordsList = selectedRecordIds
      .map(id => records.find(r => String(r.id) === id))
      .filter((r): r is BaptismRecord => r !== undefined);
    
    if (selectedRecordsList.length === 0) {
      showToast('Selected records not found', 'error');
      return;
    }

    // Set up multiple record editing
    setEditingRecords(selectedRecordsList);
    setCurrentEditingIndex(0);
    setEditingRecord(selectedRecordsList[0]);
    setViewingRecord(null);
    
    // Populate form with first record
    if (selectedRecordType === 'baptism') {
      const firstRecord = selectedRecordsList[0];
      setFormData({
        firstName: (firstRecord as any).firstName || (firstRecord as any).first_name || '',
        lastName: (firstRecord as any).lastName || (firstRecord as any).last_name || '',
        dateOfBirth: (firstRecord as any).dateOfBirth || (firstRecord as any).birth_date || '',
        dateOfBaptism: (firstRecord as any).dateOfBaptism || (firstRecord as any).reception_date || '',
        placeOfBirth: (firstRecord as any).placeOfBirth || (firstRecord as any).birthplace || '',
        entry_type: (firstRecord as any).entry_type || (firstRecord as any).entryType || 'Baptism',
        godparentNames: (firstRecord as any).godparentNames || (firstRecord as any).sponsors || '',
        parents: (firstRecord as any).parents || '',
        priest: (firstRecord as any).priest || (firstRecord as any).clergy || '',
        churchId: String(selectedChurch),
      });
    } else if (selectedRecordType === 'marriage') {
      const firstRecord = selectedRecordsList[0];
      setFormData({
        fname_groom: (firstRecord as any).fname_groom || '',
        lname_groom: (firstRecord as any).lname_groom || '',
        fname_bride: (firstRecord as any).fname_bride || '',
        lname_bride: (firstRecord as any).lname_bride || '',
        mdate: (firstRecord as any).mdate || (firstRecord as any).marriageDate || '',
        parentsg: (firstRecord as any).parentsg || '',
        parentsb: (firstRecord as any).parentsb || '',
        witness: (firstRecord as any).witness || '',
        mlicense: (firstRecord as any).mlicense || (firstRecord as any).marriageLicense || '',
        priest: (firstRecord as any).priest || (firstRecord as any).clergy || '',
        churchId: String(selectedChurch),
      });
    } else if (selectedRecordType === 'funeral') {
      const firstRecord = selectedRecordsList[0];
      setFormData({
        firstName: (firstRecord as any).firstName || (firstRecord as any).name || '',
        lastName: (firstRecord as any).lastName || (firstRecord as any).lastname || '',
        dateOfDeath: (firstRecord as any).dateOfDeath || (firstRecord as any).deceased_date || '',
        burialDate: (firstRecord as any).burialDate || (firstRecord as any).burial_date || '',
        age: (firstRecord as any).age || '',
        burialLocation: (firstRecord as any).burialLocation || (firstRecord as any).burial_location || '',
        priest: (firstRecord as any).priest || (firstRecord as any).clergy || '',
        churchId: String(selectedChurch),
      });
    }
    
    setDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.size === 0) {
      showToast('No records selected', 'info');
      return;
    }

    // Prevent bulk delete - only allow deleting one record at a time
    if (selectedRecords.size > 1) {
      showToast('Cannot delete multiple records at once. Please delete records one by one.', 'error');
      return;
    }

    const recordCount = selectedRecords.size;
    if (!window.confirm(`Are you sure you want to delete ${recordCount} record(s)?`)) {
      return;
    }

    try {
      setLoading(true);

      const endpoint = selectedRecordType === 'baptism'
        ? '/api/baptism-records'
        : selectedRecordType === 'marriage'
          ? '/api/marriage-records'
          : '/api/funeral-records';

      // Delete records one by one (or implement bulk delete endpoint if available)
      const deletePromises = Array.from(selectedRecords).map(async (recordId) => {
        const id = String(recordId).trim();
        const numericId = Number(id);
        const idToUse = !isNaN(numericId) && numericId > 0 ? numericId.toString() : id;
        
        console.log(`Bulk delete: Attempting to delete ${selectedRecordType} record ${idToUse} (original: ${id})`);
        
        // Include church_id in the DELETE request
        const deleteEndpoint = `${endpoint}/${idToUse}?church_id=${selectedChurch}`;
        
        const response = await fetch(deleteEndpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            const text = await response.text();
            errorData = { error: text || `Failed to delete record: ${response.status}` };
          }
          const errorMessage = errorData.error || errorData.message || `Failed to delete record ${idToUse}: ${response.status}`;
          console.error(`Bulk delete failed for ${selectedRecordType} record ${idToUse}:`, errorMessage, errorData);
          throw new Error(errorMessage);
        }
      });

      await Promise.all(deletePromises);

      setRecords(prev => prev.filter(r => !selectedRecords.has(r.id)));
      setNewlyAddedRecordIds(prev => {
        const newSet = new Set(prev);
        selectedRecords.forEach(id => newSet.delete(id));
        return newSet;
      });
      setSelectedRecords(new Set());
      showToast(`Successfully deleted ${recordCount} record(s)`, 'success');

      // Refresh records
      fetchRecords(selectedRecordType, selectedChurch);
    } catch (err) {
      console.error('Bulk delete error:', err);
      showToast('Failed to delete some records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSelect = (recordId: string, selected: boolean) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(recordId);
      } else {
        newSet.delete(recordId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRecords(new Set(paginatedRecords.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleSaveRecord = async () => {
    try {
      setLoading(true);

      // Comprehensive validation for required fields with helpful error messages
      if (selectedRecordType === 'baptism') {
        if (!formData.firstName?.trim()) {
          showToast('First Name cannot be empty. Please enter the first name of the person being baptized.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.lastName?.trim()) {
          showToast('Last Name cannot be empty. Use the first initial of the last name if you don\'t know the full last name.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.dateOfBirth) {
          showToast('Date of Birth is required. Please enter the date the person was born.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.dateOfBaptism) {
          showToast('Date of Baptism is required. Please enter the date the baptism ceremony took place.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.entry_type) {
          showToast('Entry Type is required. Please select either "Baptism" or "Chrismation".', 'error');
          setLoading(false);
          return;
        }
        if (!formData.priest?.trim() && !formData.customPriest) {
          showToast('Priest is required. Please select a priest from the list or choose "Other" to enter manually.', 'error');
          setLoading(false);
          return;
        }
        if (formData.customPriest && !formData.priest?.trim()) {
          showToast('Priest Name cannot be empty. Please enter the name of the priest who performed the ceremony.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.churchId) {
          showToast('Church is required. Please select the church where the baptism took place.', 'error');
          setLoading(false);
          return;
        }
      } else if (selectedRecordType === 'marriage') {
        if (!formData.fname_groom?.trim()) {
          showToast('Groom First Name cannot be empty. Please enter the groom\'s first name.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.lname_groom?.trim()) {
          showToast('Groom Last Name cannot be empty. Use the first initial of the last name if you don\'t know the full last name.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.fname_bride?.trim()) {
          showToast('Bride First Name cannot be empty. Please enter the bride\'s first name.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.lname_bride?.trim()) {
          showToast('Bride Last Name cannot be empty. Use the first initial of the last name if you don\'t know the full last name.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.mdate) {
          showToast('Marriage Date is required. Please enter the date the marriage ceremony took place.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.witness?.trim()) {
          showToast('Witnesses are required. Please enter the names of at least one witness to the marriage.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.clergy?.trim() && !formData.priest?.trim() && !formData.customPriest) {
          showToast('Priest is required. Please select a priest from the list or choose "Other" to enter manually.', 'error');
          setLoading(false);
          return;
        }
        if (formData.customPriest && !formData.clergy?.trim() && !formData.priest?.trim()) {
          showToast('Priest Name cannot be empty. Please enter the name of the priest who performed the ceremony.', 'error');
          setLoading(false);
          return;
        }
      } else if (selectedRecordType === 'funeral') {
        if (!formData.firstName?.trim()) {
          showToast('First Name cannot be empty. Please enter the first name of the deceased.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.lastName?.trim()) {
          showToast('Last Name cannot be empty. Use the first initial of the last name if you don\'t know the full last name.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.burialDate) {
          showToast('Burial Date is required. Please enter the date the burial ceremony took place.', 'error');
          setLoading(false);
          return;
        }
        if (!formData.priest?.trim() && !formData.customPriest) {
          showToast('Priest is required. Please select a priest from the list or choose "Other" to enter manually.', 'error');
          setLoading(false);
          return;
        }
        if (formData.customPriest && !formData.priest?.trim()) {
          showToast('Priest Name cannot be empty. Please enter the name of the priest who performed the ceremony.', 'error');
          setLoading(false);
          return;
        }
        
        // Validate date logic: Date of Death should be before or equal to Burial Date
        if (formData.dateOfDeath && formData.burialDate) {
          const deathDate = new Date(formData.dateOfDeath);
          const burialDate = new Date(formData.burialDate);
          if (deathDate > burialDate) {
            showToast('Date of Death must be before or equal to Burial Date. Please check your dates and try again.', 'error');
            setLoading(false);
            return;
          }
        }
      }

      // Check for duplicate records before creating
      if (!editingRecord) {
        if (selectedRecordType === 'baptism') {
          const isDuplicate = records.some(record => {
            const recordFirstName = record.firstName || record.first_name || '';
            const recordLastName = record.lastName || record.last_name || '';
            const recordBaptismDate = record.dateOfBaptism || record.reception_date || '';

            return (
              recordFirstName.toLowerCase().trim() === (formData.firstName || '').toLowerCase().trim() &&
              recordLastName.toLowerCase().trim() === (formData.lastName || '').toLowerCase().trim() &&
              recordBaptismDate === formData.dateOfBaptism
            );
          });

          if (isDuplicate) {
            showToast('A record with the same name and baptism date already exists', 'error');
            setLoading(false);
            return;
          }
        } else if (selectedRecordType === 'marriage') {
          const isDuplicate = records.some(record => {
            const recordGroomFirst = record.fname_groom || '';
            const recordGroomLast = record.lname_groom || '';
            const recordBrideFirst = record.fname_bride || '';
            const recordBrideLast = record.lname_bride || '';
            const recordMarriageDate = record.mdate || record.marriageDate || '';

            return (
              recordGroomFirst.toLowerCase().trim() === (formData.fname_groom || '').toLowerCase().trim() &&
              recordGroomLast.toLowerCase().trim() === (formData.lname_groom || '').toLowerCase().trim() &&
              recordBrideFirst.toLowerCase().trim() === (formData.fname_bride || '').toLowerCase().trim() &&
              recordBrideLast.toLowerCase().trim() === (formData.lname_bride || '').toLowerCase().trim() &&
              recordMarriageDate === formData.mdate
            );
          });

          if (isDuplicate) {
            showToast('A record with the same couple and marriage date already exists', 'error');
            setLoading(false);
            return;
          }
        }
      }

      const endpoint = selectedRecordType === 'baptism'
        ? '/api/baptism-records'
        : selectedRecordType === 'marriage'
          ? '/api/marriage-records'
          : '/api/funeral-records';

      let requestBody: any;

      if (selectedRecordType === 'baptism') {
        requestBody = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          birth_date: formData.dateOfBirth || null,
          reception_date: formData.dateOfBaptism,
          birthplace: formData.placeOfBirth || null,
          entry_type: formData.entry_type || '',
          sponsors: formData.godparentNames || null,
          parents: formData.parents || null,
          clergy: formData.priest || null,
          church_id: selectedChurch,
        };
      } else if (selectedRecordType === 'marriage') {
        requestBody = {
          fname_groom: formData.fname_groom,
          lname_groom: formData.lname_groom,
          fname_bride: formData.fname_bride,
          lname_bride: formData.lname_bride,
          mdate: formData.mdate,
          parentsg: formData.parentsg || null,
          parentsb: formData.parentsb || null,
          witness: formData.witness || null,
          mlicense: formData.mlicense || null,
          clergy: formData.clergy || formData.priest || null,
          church_id: selectedChurch,
        };
      } else if (selectedRecordType === 'funeral') {
        requestBody = {
          name: formData.firstName, // Map firstName to name
          lastname: formData.lastName, // Map lastName to lastname
          deceased_date: formData.dateOfDeath || null, // Map dateOfDeath to deceased_date
          burial_date: formData.burialDate || null, // Map burialDate to burial_date
          age: formData.age || null,
          burial_location: formData.burialLocation || null, // Map burialLocation to burial_location
          clergy: formData.priest || null, // Map priest to clergy
          church_id: selectedChurch,
        };
      }

      if (editingRecord) {
        // Update existing record
        const response = await fetch(`${endpoint}/${editingRecord.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Failed to update record: ${response.status}`);
        }

        const updatedRecord = await response.json();
        console.log('✅ Record updated successfully:', updatedRecord);
        showToast('Record updated successfully!', 'success');

        // Refresh records
        await fetchRecords(selectedRecordType, selectedChurch);
      } else {
        // Create new record
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Failed to create record: ${response.status}`);
        }

        const result = await response.json();
        const newRecordId = result.record?.id || result.id;

        console.log('✅ Record created successfully:', result);
        showToast('Record created successfully!', 'success');

        // Mark as newly added for green highlighting
        if (newRecordId) {
          setNewlyAddedRecordIds(prev => new Set(prev).add(String(newRecordId)));
          // Remove green highlight after 5 seconds
          setTimeout(() => {
            setNewlyAddedRecordIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(String(newRecordId));
              return newSet;
            });
          }, 5000);
        }

        // Refresh records to show the new one
        await fetchRecords(selectedRecordType, selectedChurch);
      }

      // Handle "Save and Add Another" - keep dialog open and reset form
      if (saveAndAddAnother && !editingRecord) {
        if (selectedRecordType === 'baptism') {
          setFormData({
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            dateOfBaptism: '',
            placeOfBirth: '',
            entry_type: 'Baptism',
            fatherName: '',
            motherName: '',
            godparentNames: '',
            priest: '',
            registryNumber: '',
            churchId: String(selectedChurch),
            notes: '',
            customPriest: false,
          });
        } else if (selectedRecordType === 'marriage') {
          setFormData({
            fname_groom: '',
            lname_groom: '',
            fname_bride: '',
            lname_bride: '',
            mdate: '',
            parentsg: '',
            parentsb: '',
            witness: '',
            mlicense: '',
            clergy: '',
            priest: '',
            churchId: String(selectedChurch),
            customPriest: false,
          });
        } else if (selectedRecordType === 'funeral') {
          setFormData({
            firstName: '',
            lastName: '',
            dateOfDeath: '',
            burialDate: '',
            age: '',
            burialLocation: '',
            priest: '',
            churchId: String(selectedChurch),
            customPriest: false,
          });
        }
        setSaveAndAddAnother(false);
        // Dialog stays open
        return;
      }

      setDialogOpen(false);
      setEditingRecord(null);
      setEditingRecords([]);
      setCurrentEditingIndex(0);
      setSaveAndAddAnother(false);
      
      // Reset form data based on record type
      if (selectedRecordType === 'baptism') {
        setFormData({
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          dateOfBaptism: '',
          placeOfBirth: '',
          entry_type: 'Baptism',
          fatherName: '',
          motherName: '',
          godparentNames: '',
          priest: '',
          registryNumber: '',
          churchId: String(selectedChurch),
          notes: '',
          customPriest: false,
        });
      } else if (selectedRecordType === 'marriage') {
        setFormData({
          fname_groom: '',
          lname_groom: '',
          fname_bride: '',
          lname_bride: '',
          mdate: '',
          parentsg: '',
          parentsb: '',
          witness: '',
          mlicense: '',
          clergy: '',
          priest: '',
          churchId: String(selectedChurch),
          customPriest: false,
        });
      } else if (selectedRecordType === 'funeral') {
        setFormData({
          firstName: '',
          lastName: '',
          dateOfDeath: '',
          burialDate: '',
          age: '',
          burialLocation: '',
          priest: '',
          churchId: String(selectedChurch),
          customPriest: false,
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save record', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get unique burial locations from funeral records for autocomplete
  const burialLocationOptions = useMemo(() => {
    if (selectedRecordType !== 'funeral') return [];
    
    const locations = new Set<string>();
    records.forEach(record => {
      const location = (record as any).burial_location || (record as any).burialLocation;
      if (location && typeof location === 'string' && location.trim()) {
        locations.add(location.trim());
      }
    });
    
    return Array.from(locations).sort();
  }, [records, selectedRecordType]);

  // Navigation functions for editing records
  const handleNavigateRecord = (direction: 'prev' | 'next') => {
    // If editing multiple records, navigate within that array
    if (editingRecords.length > 0) {
      const newIndex = direction === 'prev' ? currentEditingIndex - 1 : currentEditingIndex + 1;
      
      if (newIndex >= 0 && newIndex < editingRecords.length) {
        setCurrentEditingIndex(newIndex);
        const newRecord = editingRecords[newIndex];
        setEditingRecord(newRecord);
        
        // Populate form with new record data
        if (selectedRecordType === 'baptism') {
          setFormData({
            firstName: (newRecord as any).firstName || (newRecord as any).first_name || '',
            lastName: (newRecord as any).lastName || (newRecord as any).last_name || '',
            dateOfBirth: (newRecord as any).dateOfBirth || (newRecord as any).birth_date || '',
            dateOfBaptism: (newRecord as any).dateOfBaptism || (newRecord as any).reception_date || '',
            placeOfBirth: (newRecord as any).placeOfBirth || (newRecord as any).birthplace || '',
            entry_type: (newRecord as any).entry_type || (newRecord as any).entryType || '',
            fatherName: (newRecord as any).fatherName || (newRecord as any).father_name || '',
            motherName: (newRecord as any).motherName || (newRecord as any).mother_name || '',
            godparentNames: (newRecord as any).godparentNames || (newRecord as any).sponsors || '',
            priest: (newRecord as any).priest || (newRecord as any).clergy || '',
            churchId: String(selectedChurch),
          });
        } else if (selectedRecordType === 'marriage') {
          setFormData({
            fname_groom: (newRecord as any).fname_groom || '',
            lname_groom: (newRecord as any).lname_groom || '',
            fname_bride: (newRecord as any).fname_bride || '',
            lname_bride: (newRecord as any).lname_bride || '',
            mdate: (newRecord as any).mdate || (newRecord as any).marriageDate || '',
            parentsg: (newRecord as any).parentsg || '',
            parentsb: (newRecord as any).parentsb || '',
            witness: (newRecord as any).witness || '',
            mlicense: (newRecord as any).mlicense || (newRecord as any).marriageLicense || '',
            priest: (newRecord as any).priest || (newRecord as any).clergy || '',
            churchId: String(selectedChurch),
          });
        } else if (selectedRecordType === 'funeral') {
          setFormData({
            firstName: (newRecord as any).firstName || (newRecord as any).name || '',
            lastName: (newRecord as any).lastName || (newRecord as any).lastname || '',
            dateOfDeath: (newRecord as any).dateOfDeath || (newRecord as any).deceased_date || '',
            burialDate: (newRecord as any).burialDate || (newRecord as any).burial_date || '',
            age: (newRecord as any).age || '',
            burialLocation: (newRecord as any).burialLocation || (newRecord as any).burial_location || '',
            priest: (newRecord as any).priest || (newRecord as any).clergy || '',
            churchId: String(selectedChurch),
          });
        }
      }
      return;
    }
    
    // Original single record navigation
    if (!editingRecord) return;
    
    const currentIndex = filteredAndSortedRecords.findIndex(
      record => String(record.id) === String(editingRecord.id)
    );
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < filteredAndSortedRecords.length) {
      const newRecord = filteredAndSortedRecords[newIndex];
      setEditingRecord(newRecord as BaptismRecord);
      
      // Populate form with new record data
      if (selectedRecordType === 'baptism') {
        setFormData({
          firstName: (newRecord as any).firstName || (newRecord as any).first_name || '',
          lastName: (newRecord as any).lastName || (newRecord as any).last_name || '',
          dateOfBirth: (newRecord as any).dateOfBirth || (newRecord as any).birth_date || '',
          dateOfBaptism: (newRecord as any).dateOfBaptism || (newRecord as any).reception_date || '',
          placeOfBirth: (newRecord as any).placeOfBirth || (newRecord as any).birthplace || '',
          entry_type: (newRecord as any).entry_type || (newRecord as any).entryType || '',
          fatherName: (newRecord as any).fatherName || (newRecord as any).father_name || '',
          motherName: (newRecord as any).motherName || (newRecord as any).mother_name || '',
          godparentNames: (newRecord as any).godparentNames || (newRecord as any).sponsors || '',
          priest: (newRecord as any).priest || (newRecord as any).clergy || '',
          churchId: String(selectedChurch),
        });
      } else if (selectedRecordType === 'marriage') {
        setFormData({
          fname_groom: (newRecord as any).fname_groom || '',
          lname_groom: (newRecord as any).lname_groom || '',
          fname_bride: (newRecord as any).fname_bride || '',
          lname_bride: (newRecord as any).lname_bride || '',
          mdate: (newRecord as any).mdate || (newRecord as any).marriageDate || '',
          parentsg: (newRecord as any).parentsg || '',
          parentsb: (newRecord as any).parentsb || '',
          witness: (newRecord as any).witness || '',
          mlicense: (newRecord as any).mlicense || (newRecord as any).marriageLicense || '',
          priest: (newRecord as any).priest || (newRecord as any).clergy || '',
          churchId: String(selectedChurch),
        });
      } else if (selectedRecordType === 'funeral') {
        setFormData({
          firstName: (newRecord as any).firstName || (newRecord as any).name || '',
          lastName: (newRecord as any).lastName || (newRecord as any).lastname || '',
          dateOfDeath: (newRecord as any).dateOfDeath || (newRecord as any).deceased_date || '',
          burialDate: (newRecord as any).burialDate || (newRecord as any).burial_date || '',
          age: (newRecord as any).age || '',
          burialLocation: (newRecord as any).burialLocation || (newRecord as any).burial_location || '',
          priest: (newRecord as any).priest || (newRecord as any).clergy || '',
          churchId: String(selectedChurch),
        });
      }
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
      <Box sx={{ 
        p: 3,
        minHeight: '100vh',
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.background.default 
          : theme.palette.background.paper,
      }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      maxWidth: 'none',
      minHeight: '100vh',
      flex: 1,
      pb: 4,
      backgroundColor: theme.palette.mode === 'dark' 
        ? theme.palette.background.default 
        : theme.palette.background.paper,
      '& .MuiContainer-root': {
        maxWidth: 'none !important',
        paddingLeft: 0,
        paddingRight: 0
      }
    }}>
      {/* Records Table - Only show when record type is selected */}
      <Card sx={{ 
        mb: 3,
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.background.paper 
          : theme.palette.background.paper,
      }}>
        <CardContent sx={{ pb: 1 }}>
          {/* Collapse/Expand Button */}
{/* Collapsible Content */}
          <Collapse in={!isFiltersCollapsed}>
            <Box>
              {/* Removed duplicate Records Management header (Editor integration) */}

          
              <Stack spacing={2}>
                {/* Removed duplicate selector and action rows (kept single header/banner section below) */}

                {/* Full Header Bar with Images - No Gold Borders */}
                <Box
                  sx={{
                    width: '100%',
                    mb: 3,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'stretch',
                    height: 200,
                    maxHeight: 200,
                    backgroundImage: recordSettings?.backgroundImage?.enabled !== false ? `url(/images/records/${selectedChurch}-bg.png)` : 'none',
                    backgroundRepeat: 'repeat',
                    backgroundSize: 'auto',
                    backgroundPosition: 'top left',
                    overflow: 'hidden',
                    borderRadius: 2,
                  }}
                >
                  {/* Gradient Overlay using g1.png */}
                  {recordSettings?.g1Image?.enabled !== false && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `url(/images/records/g1.png)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.85,
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Main Header Content Area - 4 Column Layout */}
                  <Box
                    sx={{
                      width: '100%',
                      p: 2,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      gap: 2,
                      alignItems: 'stretch',
                      position: 'relative',
                      zIndex: 1,
                      height: '100%',
                    }}
                  >
                    {/* Record Type Image Selector - Using recordSettings.recordImages.column */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gridColumn: recordSettings?.recordImages?.column || 1,
                        position: 'relative',
                        height: '100%',
                        zIndex: 2,
                      }}
                    >
                      {(() => {
                          // Determine next record type in cycle: baptism -> marriage -> funeral -> baptism
                          const getNextRecordType = (current: string) => {
                            if (current === 'baptism') return 'marriage';
                            if (current === 'marriage') return 'funeral';
                            return 'baptism';
                          };
                          
                          const getPathForType = (type: string) => {
                            if (type === 'baptism') return '/apps/records/baptism';
                            if (type === 'marriage') return '/apps/records/marriage';
                            return '/apps/records/funeral';
                          };
                          
                          const getNextPath = (current: string) => {
                            if (current === 'baptism') return '/apps/records/marriage';
                            if (current === 'marriage') return '/apps/records/funeral';
                            return '/apps/records/baptism';
                          };
                          
                          const getNextIndex = (current: string) => {
                            if (current === 'baptism') return 1;
                            if (current === 'marriage') return 2;
                            return 0;
                          };
                          
                          const getAllRecordTypes = () => {
                            const types = ['baptism', 'marriage', 'funeral'];
                            const currentIndex = types.indexOf(selectedRecordType);
                            return {
                              current: selectedRecordType,
                              next: types[(currentIndex + 1) % types.length],
                              prev: types[(currentIndex - 1 + types.length) % types.length],
                            };
                          };
                          
                          const nextType = getNextRecordType(selectedRecordType);
                          const nextPath = getNextPath(selectedRecordType);
                          const nextIndex = getNextIndex(selectedRecordType);
                          const recordTypes = getAllRecordTypes();
                          
                          const imageMap: Record<string, string> = {
                            baptism: '/images/records/baptism.png',
                            marriage: '/images/records/marriage.png',
                            funeral: '/images/records/funeral.png',
                          };
                          
                          const labelMap: Record<string, string> = {
                            baptism: 'Baptism',
                            marriage: 'Marriage',
                            funeral: 'Funeral',
                          };
                          
                          return (
                            <Box
                              sx={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1.5,
                                padding: 2,
                              }}
                              onMouseEnter={() => setIsRecordTypeHovered(true)}
                              onMouseLeave={() => setIsRecordTypeHovered(false)}
                            >
                              {/* Hover Preview - Show other record types on sides */}
                              {isRecordTypeHovered && (
                                <>
                                  <Box
                                    component="img"
                                    src={imageMap[recordTypes.next]}
                                    alt={labelMap[recordTypes.next]}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRecordType(recordTypes.next);
                                      setDisplayedRecordIndex((recordTypes.next === 'baptism' ? 0 : recordTypes.next === 'marriage' ? 1 : 2));
                                      const params = new URLSearchParams();
                                      params.set('church', String(selectedChurch));
                                      params.set('type', recordTypes.next);
                                      if (viewMode === 'advanced') {
                                        params.set('view', 'advanced');
                                      }
                                      const nextPath = getPathForType(recordTypes.next);
                                      navigate(`${nextPath}?${params.toString()}`);
                                    }}
                                    sx={{
                                      position: 'absolute',
                                      left: '-90px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      width: '70px',
                                      height: '70px',
                                      objectFit: 'contain',
                                      cursor: 'pointer',
                                      backgroundColor: '#ffffff',
                                      border: '3px solid #A78BFA',
                                      borderRadius: '12px',
                                      padding: '8px',
                                      boxShadow: '0 6px 20px rgba(167, 139, 250, 0.35)',
                                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                      opacity: 0,
                                      animation: 'slideInLeft 0.3s ease forwards',
                                      zIndex: 5,
                                      '&:hover': {
                                        transform: 'translateY(-50%) scale(1.1)',
                                        borderColor: '#8B5CF6',
                                        boxShadow: '0 8px 24px rgba(139, 92, 246, 0.5)',
                                      },
                                      '@keyframes slideInLeft': {
                                        from: {
                                          opacity: 0,
                                          transform: 'translateY(-50%) translateX(-20px)',
                                        },
                                        to: {
                                          opacity: 1,
                                          transform: 'translateY(-50%) translateX(0)',
                                        },
                                      },
                                    }}
                                  />
                                  <Box
                                    component="img"
                                    src={imageMap[recordTypes.prev]}
                                    alt={labelMap[recordTypes.prev]}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRecordType(recordTypes.prev);
                                      setDisplayedRecordIndex((recordTypes.prev === 'baptism' ? 0 : recordTypes.prev === 'marriage' ? 1 : 2));
                                      const params = new URLSearchParams();
                                      params.set('church', String(selectedChurch));
                                      params.set('type', recordTypes.prev);
                                      if (viewMode === 'advanced') {
                                        params.set('view', 'advanced');
                                      }
                                      const prevPath = getPathForType(recordTypes.prev);
                                      navigate(`${prevPath}?${params.toString()}`);
                                    }}
                                    sx={{
                                      position: 'absolute',
                                      right: '-90px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      width: '70px',
                                      height: '70px',
                                      objectFit: 'contain',
                                      cursor: 'pointer',
                                      backgroundColor: '#ffffff',
                                      border: '3px solid #A78BFA',
                                      borderRadius: '12px',
                                      padding: '8px',
                                      boxShadow: '0 6px 20px rgba(167, 139, 250, 0.35)',
                                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                      opacity: 0,
                                      animation: 'slideInRight 0.3s ease forwards',
                                      zIndex: 5,
                                      '&:hover': {
                                        transform: 'translateY(-50%) scale(1.1)',
                                        borderColor: '#8B5CF6',
                                        boxShadow: '0 8px 24px rgba(139, 92, 246, 0.5)',
                                      },
                                      '@keyframes slideInRight': {
                                        from: {
                                          opacity: 0,
                                          transform: 'translateY(-50%) translateX(20px)',
                                        },
                                        to: {
                                          opacity: 1,
                                          transform: 'translateY(-50%) translateX(0)',
                                        },
                                      },
                                    }}
                                  />
                                </>
                              )}
                              
                              {/* Main Record Type Image */}
                              <Box
                                component="img"
                                src={imageMap[selectedRecordType]}
                                alt={`${labelMap[selectedRecordType]} Records`}
                                onClick={() => {
                                  setSelectedRecordType(nextType);
                                  setDisplayedRecordIndex(nextIndex);
                                  const params = new URLSearchParams();
                                  params.set('church', String(selectedChurch));
                                  params.set('type', nextType);
                                  if (viewMode === 'advanced') {
                                    params.set('view', 'advanced');
                                  }
                                  navigate(`${nextPath}?${params.toString()}`);
                                }}
                                sx={{
                                  width: '100px',
                                  height: '100px',
                                  objectFit: 'contain',
                                  cursor: 'pointer',
                                  backgroundColor: '#ffffff',
                                  border: '4px solid #4C1D95',
                                  borderRadius: '16px',
                                  padding: '12px',
                                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                  boxShadow: '0 8px 24px rgba(76, 29, 149, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                                  zIndex: 3,
                                  position: 'relative',
                                  '&:hover': {
                                    transform: 'scale(1.15) rotate(5deg)',
                                    boxShadow: '0 12px 32px rgba(76, 29, 149, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                                    borderColor: '#6D28D9',
                                    zIndex: 10,
                                  },
                                  '&:active': {
                                    transform: 'scale(1.05) rotate(0deg)',
                                  },
                                }}
                              />
                              
                              {/* Label */}
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 600,
                                  color: '#4C1D95',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  fontSize: '0.75rem',
                                  transition: 'color 0.3s ease',
                                  position: 'relative',
                                  zIndex: 3,
                                }}
                              >
                                {labelMap[selectedRecordType]}
                              </Typography>
                            </Box>
                          );
                        })()}
                      </Box>

                    {/* Column 2: Calendar Cards - Horizontal Layout */}
                    {recordSettings?.calendar?.enabled !== false && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gridColumn: recordSettings?.calendar?.column || 2,
                          position: 'relative',
                          height: '100%',
                          zIndex: 2,
                          gap: 1,
                        }}
                      >
                      {(() => {
                        const today = new Date();
                        const nextDays: Date[] = [];
                        
                        // Find the next 3 days starting from calendarStartOffset that fall within December 2025
                        let dayOffset = calendarStartOffset;
                        while (nextDays.length < 3 && dayOffset < 365) {
                          const nextDate = new Date(today);
                          nextDate.setDate(today.getDate() + dayOffset);
                          
                          // Check if this date is in December 2025
                          if (nextDate.getMonth() === 11 && nextDate.getFullYear() === 2025) {
                            nextDays.push(nextDate);
                          }
                          dayOffset++;
                        }
                        
                        return nextDays.map((day, index) => (
                          <Box
                            key={index}
                            onClick={() => {
                              // Advance to show the next 3 days
                              setCalendarStartOffset(prev => {
                                const newOffset = prev + 3;
                                // Check if new offset would still have days in December 2025
                                const checkDate = new Date(today);
                                checkDate.setDate(today.getDate() + newOffset);
                                // If we've gone past December 2025, reset to start
                                if (checkDate.getMonth() !== 11 || checkDate.getFullYear() !== 2025 || checkDate.getDate() > 31) {
                                  return 1; // Reset to tomorrow
                                }
                                return newOffset;
                              });
                            }}
                            sx={{
                              width: '75px',
                              height: '90px',
                              background: 'linear-gradient(145deg, #ffffff 0%, #f5f0e6 50%, #e8dcc8 100%)',
                              borderRadius: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 4px 8px rgba(0,0,0,0.15)',
                              border: '3px solid #DAA520',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              transform: `rotate(${(index - 1) * 3}deg)`,
                              position: 'relative',
                              overflow: 'hidden',
                              '&:hover': {
                                transform: `rotate(${(index - 1) * 3}deg) scale(1.08) translateY(-5px)`,
                                boxShadow: '0 12px 32px rgba(0,0,0,0.35), 0 6px 12px rgba(0,0,0,0.2)',
                              },
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '22px',
                                background: 'linear-gradient(180deg, #8B0000 0%, #5c0000 100%)',
                                borderRadius: '9px 9px 0 0',
                              },
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '9px',
                                fontWeight: 800,
                                color: '#ffffff',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                position: 'relative',
                                zIndex: 1,
                                mt: '-2px',
                              }}
                            >
                              {day.toLocaleDateString('en-US', { month: 'short' })} {day.getFullYear()}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#4C1D95',
                                textTransform: 'uppercase',
                                mt: 0.5,
                              }}
                            >
                              {day.toLocaleDateString('en-US', { weekday: 'short' })}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '28px',
                                fontWeight: 900,
                                color: '#1a1a2e',
                                lineHeight: 1,
                              }}
                            >
                              {day.getDate()}
                            </Typography>
                          </Box>
                        ));
                      })()}
                      </Box>
                    )}

                    {/* Column 3: Church Logo */}
                    {recordSettings && recordSettings.logo && recordSettings.logo.enabled !== false && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gridColumn: recordSettings.logo?.column || 3,
                          position: 'relative',
                          height: '100%',
                          zIndex: 2,
                        }}
                      >
                        <Box
                          component="img"
                          src={`/images/records/${selectedChurch}-logo.png`}
                          alt="Church Logo"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/records/om-logo.png';
                          }}
                          sx={{
                            width: `${recordSettings.logo?.width || 200}px`,
                            height: recordSettings.logo?.height === 'auto' ? 'auto' : `${recordSettings.logo?.height || 200}px`,
                            objectFit: (recordSettings.logo?.objectFit || 'contain') as 'contain' | 'cover' | 'fill' | 'none' | 'scale-down',
                            opacity: ((recordSettings.logo?.opacity || 100) / 100),
                          }}
                        />
                      </Box>
                    )}

                    {/* Column 4: OM Logo */}
                    {recordSettings?.omLogo?.enabled !== false && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gridColumn: recordSettings?.omLogo?.column || 4,
                          position: 'relative',
                          height: '100%',
                          zIndex: 2,
                        }}
                      >
                        <Box
                          component="img"
                          src="/images/records/om-logo.png"
                          alt="OM Logo"
                          sx={{
                            width: `${recordSettings?.omLogo?.width || 68}px`,
                            height: recordSettings?.omLogo?.height === 'auto' ? 'auto' : `${recordSettings?.omLogo?.height || 68}px`,
                            objectFit: 'contain',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                  {/* Main Header Content Area - 4 Column Layout closes above */}
                </Box>
                {/* Header Bar closes above */}

                {/* Collapsible Actions Section */}
                {selectedRecordType && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      onClick={() => setButtonsExpanded(!buttonsExpanded)}
                      endIcon={buttonsExpanded ? <IconChevronUp /> : <IconChevronDown />}
                      sx={{
                        width: '100%',
                        justifyContent: 'space-between',
                        backgroundColor: 'rgba(76, 29, 149, 0.08)',
                        borderRadius: 2,
                        px: 2,
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        color: '#4C1D95',
                        '&:hover': {
                          backgroundColor: 'rgba(76, 29, 149, 0.12)',
                        },
                      }}
                    >
                      Actions
                    </Button>
                    <Collapse in={buttonsExpanded}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 2,
                          px: 2,
                          backgroundColor: theme.palette.mode === 'dark' 
                            ? 'rgba(30, 30, 30, 0.95)' 
                            : 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '0 0 8px 8px',
                          border: `1px solid ${theme.palette.divider}`,
                          borderTop: 'none',
                          gap: 2,
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Theme Selector Dropdown and Other Actions */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', flex: 1 }}>
                          {/* Theme Selector Dropdown */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 200 }}>
                            <Chip 
                              label="Theme" 
                              size="small" 
                              sx={{ 
                                width: 'fit-content',
                                backgroundColor: enhancedTableState.tokens?.accent || '#4C1D95',
                                color: enhancedTableState.tokens?.headerText || '#ffffff',
                                borderRadius: '20px',
                                fontWeight: 500,
                                '&:hover': {
                                  backgroundColor: enhancedTableState.tokens?.headerBg || '#5a2ba8',
                                },
                              }}
                            />
                            <FormControl size="small" fullWidth>
                              <Select
                                value={enhancedTableState.liturgicalTheme}
                                onChange={(e) => {
                                  const newTheme = e.target.value as LiturgicalThemeKey;
                                  setThemeChangeTimestamp(Date.now()); // Mark theme change to prevent bridge effect override
                                  enhancedTableStore.setLiturgicalTheme(newTheme);
                                }}
                                disabled={loading}
                                sx={{
                                  borderRadius: 2,
                                  backgroundColor: 'background.paper',
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(76, 29, 149, 0.3)',
                                  },
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(76, 29, 149, 0.5)',
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#4C1D95',
                                  },
                                }}
                              >
                                {/* Pre-defined Themes */}
                                <MenuItem value="orthodox_traditional">Orthodox Traditional</MenuItem>
                                <MenuItem value="great_lent">Great Lent</MenuItem>
                                <MenuItem value="pascha">Pascha</MenuItem>
                                <MenuItem value="nativity">Nativity</MenuItem>
                                <MenuItem value="palm_sunday">Palm Sunday</MenuItem>
                                <MenuItem value="theotokos_feasts">Theotokos Feasts</MenuItem>
                                
                                {/* Custom Themes */}
                                {enhancedTableState.customThemes && Object.keys(enhancedTableState.customThemes).length > 0 && (
                                  <>
                                    <Divider sx={{ my: 1 }} />
                                    {Object.entries(enhancedTableState.customThemes).map(([key, theme]) => (
                                      <MenuItem key={key} value={key}>
                                        {(theme as any).name || key}
                                      </MenuItem>
                                    ))}
                                  </>
                                )}
                              </Select>
                            </FormControl>
                          </Box>

                          {/* Action Buttons - Field Settings, Advanced Grid, etc. */}
                          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                          <Button
                            key={`field-settings-${enhancedTableState.liturgicalTheme}-${enhancedTableState.tokens?.accent}`}
                            variant="contained"
                            startIcon={<SettingsIcon />}
                            onClick={() => {
                              const tableMap: Record<string, string> = {
                                'baptism': 'baptism_records',
                                'marriage': 'marriage_records',
                                'funeral': 'funeral_records',
                              };
                              const tableName = tableMap[selectedRecordType] || 'baptism_records';
                              navigate(`/apps/church-management/${selectedChurch}/field-mapper?table=${encodeURIComponent(tableName)}`);
                            }}
                            disabled={loading}
                            size={enhancedTableState.actionButtonConfigs?.fieldSettings?.size || 'small'}
                            sx={{
                              borderRadius: 14,
                              padding: enhancedTableState.actionButtonConfigs?.fieldSettings?.padding || '5px 9px',
                              textTransform: 'none',
                              fontWeight: 600,
                              letterSpacing: 0.2,
                              fontSize: enhancedTableState.actionButtonConfigs?.fieldSettings?.fontSize || '0.75rem',
                              color: (isPreDefinedTheme
                                ? enhancedTableState.tokens?.headerText
                                : enhancedTableState.actionButtonConfigs?.fieldSettings?.textColor) || enhancedTableState.tokens?.headerText || '#fff',
                              background: (isPreDefinedTheme
                                ? `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%)`
                                : enhancedTableState.actionButtonConfigs?.fieldSettings?.backgroundColor) || `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%)`,
                              boxShadow: `0 6px 16px -6px ${enhancedTableState.tokens?.accent || '#4C1D95'}59`,
                              '&:hover': {
                                background: (isPreDefinedTheme
                                  ? `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%)`
                                  : enhancedTableState.actionButtonConfigs?.fieldSettings?.hoverColor) || `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%)`,
                              },
                              '& .MuiButton-startIcon': { marginRight: 1 },
                            }}
                          >
                            Field Settings
                          </Button>
                          <AdvancedGridButton 
                            key={`advanced-grid-${enhancedTableState.liturgicalTheme}-${enhancedTableState.tokens?.accent}`}
                            onClick={async () => {
                              await fetchAllRecordTypes(selectedChurch);
                              setAdvancedGridOpen(true);
                            }} 
                            disabled={loading}
                            size={enhancedTableState.actionButtonConfigs?.advancedGrid?.size || 'small'}
                            sx={{
                              ...(isPreDefinedTheme ? {
                                background: `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%) !important`,
                                color: `${enhancedTableState.tokens?.headerText || '#fff'} !important`,
                                '&:hover': {
                                  background: `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%) !important`,
                                },
                              } : enhancedTableState.actionButtonConfigs?.advancedGrid?.backgroundColor ? {
                                background: `${enhancedTableState.actionButtonConfigs.advancedGrid.backgroundColor} !important`,
                              } : {
                                background: `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%) !important`,
                              }),
                              ...(isPreDefinedTheme ? {} : enhancedTableState.actionButtonConfigs?.advancedGrid?.textColor ? {
                                color: `${enhancedTableState.actionButtonConfigs.advancedGrid.textColor} !important`,
                              } : {
                                color: `${enhancedTableState.tokens?.headerText || '#fff'} !important`,
                              }),
                              ...(isPreDefinedTheme ? {} : enhancedTableState.actionButtonConfigs?.advancedGrid?.hoverColor ? {
                                '&:hover': {
                                  background: `${enhancedTableState.actionButtonConfigs.advancedGrid.hoverColor} !important`,
                                },
                              } : {
                                '&:hover': {
                                  background: `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%) !important`,
                                },
                              }),
                              ...(enhancedTableState.actionButtonConfigs?.advancedGrid?.padding && {
                                padding: enhancedTableState.actionButtonConfigs.advancedGrid.padding,
                              }),
                              ...(enhancedTableState.actionButtonConfigs?.advancedGrid?.fontSize && {
                                fontSize: enhancedTableState.actionButtonConfigs.advancedGrid.fontSize,
                              }),
                              boxShadow: `0 6px 16px -6px ${enhancedTableState.tokens?.accent || '#4C1D95'}59 !important`,
                            }}
                          />
                        </Stack>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                )}

                {/* Search Records, Edit Selected, Delete Selected, Switch to AG, and Add Record - Above the table */}
                {selectedRecordType && (
                  <Box
                    sx={{
                      mb: 2,
                      mt: 2,
                      px: 2,
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Search Records */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip 
                        label="Search Records" 
                        size="small" 
                        sx={{ 
                          width: 'fit-content',
                          backgroundColor: enhancedTableState.tokens?.accent || '#4C1D95',
                          color: enhancedTableState.tokens?.headerText || '#ffffff',
                          borderRadius: '20px',
                          fontWeight: 500,
                          '&:hover': {
                            backgroundColor: enhancedTableState.tokens?.headerBg || '#5a2ba8',
                          },
                        }}
                      />
                      <TextField
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search records..."
                        InputProps={{
                          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        size="small"
                        sx={{ minWidth: 220 }}
                        disabled={loading}
                      />
                    </Box>

                    {/* Edit Selected and Delete Selected buttons */}
                    {selectedRecords.size > 0 && (
                      <>
                        <Button
                          variant="contained"
                          startIcon={<EditIcon />}
                          onClick={handleBulkEdit}
                          disabled={loading}
                          size={enhancedTableState.actionButtonConfigs?.addRecords?.size || 'small'}
                          sx={{
                            ...(isPreDefinedTheme ? {
                              background: `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%) !important`,
                              color: `${enhancedTableState.tokens?.headerText || '#fff'} !important`,
                              '&:hover': {
                                background: `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%) !important`,
                              },
                            } : enhancedTableState.actionButtonConfigs?.addRecords?.backgroundColor ? {
                              background: `${enhancedTableState.actionButtonConfigs.addRecords.backgroundColor} !important`,
                            } : {
                              background: `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%) !important`,
                            }),
                            ...(isPreDefinedTheme ? {} : enhancedTableState.actionButtonConfigs?.addRecords?.textColor ? {
                              color: `${enhancedTableState.actionButtonConfigs.addRecords.textColor} !important`,
                            } : {
                              color: `${enhancedTableState.tokens?.headerText || '#fff'} !important`,
                            }),
                            ...(isPreDefinedTheme ? {} : enhancedTableState.actionButtonConfigs?.addRecords?.hoverColor ? {
                              '&:hover': {
                                background: `${enhancedTableState.actionButtonConfigs.addRecords.hoverColor} !important`,
                              },
                            } : {
                              '&:hover': {
                                background: `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%) !important`,
                              },
                            }),
                            ...(enhancedTableState.actionButtonConfigs?.addRecords?.padding && {
                              padding: enhancedTableState.actionButtonConfigs.addRecords.padding,
                            }),
                            ...(enhancedTableState.actionButtonConfigs?.addRecords?.fontSize && {
                              fontSize: enhancedTableState.actionButtonConfigs.addRecords.fontSize,
                            }),
                            borderRadius: 14,
                            textTransform: 'none',
                            fontWeight: 600,
                            letterSpacing: 0.2,
                            fontSize: enhancedTableState.actionButtonConfigs?.addRecords?.fontSize || '0.75rem',
                            boxShadow: `0 6px 16px -6px ${enhancedTableState.tokens?.accent || '#4C1D95'}59 !important`,
                            '&:disabled': {
                              background: 'rgba(0, 0, 0, 0.12) !important',
                              color: 'rgba(0, 0, 0, 0.26) !important',
                            },
                            '& .MuiButton-startIcon': { marginRight: 1 },
                          }}
                        >
                          Edit Selected ({selectedRecords.size})
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<DeleteIcon />}
                          onClick={handleBulkDelete}
                          disabled={loading}
                          size={enhancedTableState.actionButtonConfigs?.addRecords?.size || 'small'}
                          sx={{
                            ...(isPreDefinedTheme ? {
                              background: `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%) !important`,
                              color: `${enhancedTableState.tokens?.headerText || '#fff'} !important`,
                              '&:hover': {
                                background: `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%) !important`,
                              },
                            } : enhancedTableState.actionButtonConfigs?.addRecords?.backgroundColor ? {
                              background: `${enhancedTableState.actionButtonConfigs.addRecords.backgroundColor} !important`,
                            } : {
                              background: `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%) !important`,
                            }),
                            ...(isPreDefinedTheme ? {} : enhancedTableState.actionButtonConfigs?.addRecords?.textColor ? {
                              color: `${enhancedTableState.actionButtonConfigs.addRecords.textColor} !important`,
                            } : {
                              color: `${enhancedTableState.tokens?.headerText || '#fff'} !important`,
                            }),
                            ...(isPreDefinedTheme ? {} : enhancedTableState.actionButtonConfigs?.addRecords?.hoverColor ? {
                              '&:hover': {
                                background: `${enhancedTableState.actionButtonConfigs.addRecords.hoverColor} !important`,
                              },
                            } : {
                              '&:hover': {
                                background: `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%) !important`,
                              },
                            }),
                            ...(enhancedTableState.actionButtonConfigs?.addRecords?.padding && {
                              padding: enhancedTableState.actionButtonConfigs.addRecords.padding,
                            }),
                            ...(enhancedTableState.actionButtonConfigs?.addRecords?.fontSize && {
                              fontSize: enhancedTableState.actionButtonConfigs.addRecords.fontSize,
                            }),
                            borderRadius: 14,
                            textTransform: 'none',
                            fontWeight: 600,
                            letterSpacing: 0.2,
                            fontSize: enhancedTableState.actionButtonConfigs?.addRecords?.fontSize || '0.75rem',
                            boxShadow: `0 6px 16px -6px ${enhancedTableState.tokens?.accent || '#4C1D95'}59 !important`,
                            '& .MuiButton-startIcon': { marginRight: 1 },
                          }}
                        >
                          Delete Selected ({selectedRecords.size})
                        </Button>
                      </>
                    )}

                    {/* Switch to AG Button */}
                    <Button
                      key={`switch-to-ag-${enhancedTableState.liturgicalTheme}-${enhancedTableState.tokens?.accent}`}
                      variant={viewMode === 'normal' ? 'contained' : 'outlined'}
                      startIcon={<ViewListIcon />}
                      onClick={() => {
                        const newViewMode = viewMode === 'normal' ? 'advanced' : 'normal';
                        setViewMode(newViewMode);
                        // Update URL to preserve viewMode
                        const params = new URLSearchParams(searchParams);
                        if (newViewMode === 'advanced') {
                          params.set('view', 'advanced');
                        } else {
                          params.delete('view');
                        }
                        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                      }}
                      disabled={loading}
                      size={enhancedTableState.actionButtonConfigs?.switchToAG?.size || 'small'}
                      sx={{
                        borderRadius: 14,
                        padding: enhancedTableState.actionButtonConfigs?.switchToAG?.padding || '5px 9px',
                        textTransform: 'none',
                        fontWeight: 600,
                        letterSpacing: 0.2,
                        fontSize: enhancedTableState.actionButtonConfigs?.switchToAG?.fontSize || '0.75rem',
                        ...(viewMode === 'normal' ? {
                          color: (isPreDefinedTheme 
                            ? enhancedTableState.tokens?.headerText 
                            : enhancedTableState.actionButtonConfigs?.switchToAG?.textColor) || enhancedTableState.tokens?.headerText || '#fff',
                          background: (isPreDefinedTheme
                            ? `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#1976D2'} 0%, ${enhancedTableState.tokens?.headerBg || '#1565C0'} 100%)`
                            : enhancedTableState.actionButtonConfigs?.switchToAG?.backgroundColor) || `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#1976D2'} 0%, ${enhancedTableState.tokens?.headerBg || '#1565C0'} 100%)`,
                          boxShadow: `0 6px 16px -6px ${enhancedTableState.tokens?.accent || '#1976D2'}59`,
                          '&:hover': {
                            background: (isPreDefinedTheme
                              ? `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#1565C0'} 0%, ${enhancedTableState.tokens?.accent || '#1976D2'} 100%)`
                              : enhancedTableState.actionButtonConfigs?.switchToAG?.hoverColor) || `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#1565C0'} 0%, ${enhancedTableState.tokens?.accent || '#1976D2'} 100%)`,
                          },
                        } : {
                          color: (isPreDefinedTheme
                            ? enhancedTableState.tokens?.accent
                            : enhancedTableState.actionButtonConfigs?.switchToAG?.textColor) || enhancedTableState.tokens?.accent || '#1976D2',
                          borderColor: (isPreDefinedTheme
                            ? enhancedTableState.tokens?.accent
                            : enhancedTableState.actionButtonConfigs?.switchToAG?.backgroundColor) || enhancedTableState.tokens?.accent || '#1976D2',
                          '&:hover': {
                            backgroundColor: (isPreDefinedTheme
                              ? `${enhancedTableState.tokens?.accent || '#1976D2'}0A`
                              : enhancedTableState.actionButtonConfigs?.switchToAG?.hoverColor) || `${enhancedTableState.tokens?.accent || '#1976D2'}0A`,
                          },
                        }),
                        '& .MuiButton-startIcon': { marginRight: 1 },
                      }}
                    >
                      {viewMode === 'normal' ? 'Switch to AG' : 'Switch to normal'}
                    </Button>

                    {/* Add Record Button */}
                    <AddRecordButton 
                      key={`add-records-${enhancedTableState.liturgicalTheme}-${enhancedTableState.tokens?.accent}`}
                      onClick={handleAddRecord} 
                      disabled={loading}
                      recordType={selectedRecordType as 'baptism' | 'marriage' | 'funeral'}
                      size={enhancedTableState.actionButtonConfigs?.addRecords?.size || 'small'}
                      sx={{
                        ...(isPreDefinedTheme ? {
                          background: `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%) !important`,
                          color: `${enhancedTableState.tokens?.headerText || '#fff'} !important`,
                          '&:hover': {
                            background: `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%) !important`,
                          },
                        } : enhancedTableState.actionButtonConfigs?.addRecords?.backgroundColor ? {
                          background: `${enhancedTableState.actionButtonConfigs.addRecords.backgroundColor} !important`,
                        } : {
                          background: `linear-gradient(135deg, ${enhancedTableState.tokens?.accent || '#4C1D95'} 0%, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 100%) !important`,
                        }),
                        ...(isPreDefinedTheme ? {} : enhancedTableState.actionButtonConfigs?.addRecords?.textColor ? {
                          color: `${enhancedTableState.actionButtonConfigs.addRecords.textColor} !important`,
                        } : {
                          color: `${enhancedTableState.tokens?.headerText || '#fff'} !important`,
                        }),
                        ...(isPreDefinedTheme ? {} : enhancedTableState.actionButtonConfigs?.addRecords?.hoverColor ? {
                          '&:hover': {
                            background: `${enhancedTableState.actionButtonConfigs.addRecords.hoverColor} !important`,
                          },
                        } : {
                          '&:hover': {
                            background: `linear-gradient(135deg, ${enhancedTableState.tokens?.headerBg || '#2E1065'} 0%, ${enhancedTableState.tokens?.accent || '#4C1D95'} 100%) !important`,
                          },
                        }),
                        ...(enhancedTableState.actionButtonConfigs?.addRecords?.padding && {
                          padding: enhancedTableState.actionButtonConfigs.addRecords.padding,
                        }),
                        ...(enhancedTableState.actionButtonConfigs?.addRecords?.fontSize && {
                          fontSize: enhancedTableState.actionButtonConfigs.addRecords.fontSize,
                        }),
                        boxShadow: `0 6px 16px -6px ${enhancedTableState.tokens?.accent || '#4C1D95'}59 !important`,
                      }}
                    />
                  </Box>
                )}

                {/* Header Text - Above the table */}
                {selectedRecordType && recordSettings?.headerText && (
                  <Box
                    sx={{
                      mb: 2,
                      mt: 2,
                      px: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: recordSettings?.headerText?.fontFamily || 'Arial, sans-serif',
                        fontSize: `${recordSettings?.headerText?.fontSize || 16}px`,
                        fontWeight: recordSettings?.headerText?.fontWeight || 700,
                        color: recordSettings?.headerText?.color || '#4C1D95',
                        textTransform: 'uppercase',
                      }}
                    >
                      {(() => {
                        const recordTypeLabel = recordTypes.find(type => type.value === selectedRecordType)?.label || 'Records';
                        const church = churches.find(church => church.id === selectedChurch) || churches[0];
                        const churchName = church?.church_name || church?.name || 'Saints Peter & Paul';
                        return `${recordTypeLabel} - ${churchName}`;
                      })()}
                    </Typography>
                  </Box>
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
                    {viewMode === 'advanced' ? (
                      // AG Grid View - Using same implementation as AdvancedGridDialog
                      <Box sx={{ width: '100%', height: '600px' }}>
                        {/* Dynamic style tag to apply theme colors to AG Grid - override CSS variables and direct styles */}
                        <style id={`ag-grid-theme-${selectedRecordType}-${selectedChurch}`}>
                          {`#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine{--ag-header-background-color:${enhancedTableState.tokens.headerBg}!important;--ag-header-foreground-color:${enhancedTableState.tokens.headerText}!important;--ag-border-color:${enhancedTableState.tokens.border}!important;--ag-odd-row-background-color:${enhancedTableState.tokens.rowOddBg}!important;--ag-background-color:${enhancedTableState.tokens.rowEvenBg}!important;--ag-data-color:${enhancedTableState.tokens.cellText}!important;--ag-row-hover-color:${enhancedTableState.tokens.accent}15!important;--ag-selected-row-background-color:${enhancedTableState.tokens.accent}20!important;--ag-alpine-active-color:${enhancedTableState.tokens.accent}!important}#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-row,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-row>div,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-row>div>div{background-color:${enhancedTableState.tokens.headerBg}!important;color:${enhancedTableState.tokens.headerText}!important;border-color:${enhancedTableState.tokens.border}!important}#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-cell,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-cell>div,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-cell>div>div{background-color:${enhancedTableState.tokens.headerBg}!important;color:${enhancedTableState.tokens.headerText}!important;border-color:${enhancedTableState.tokens.border}!important;border-bottom-color:${enhancedTableState.tokens.border}!important}#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-cell-text,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-cell-label,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-cell-label span,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-cell-label .ag-header-cell-text,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-cell-label>span{color:${enhancedTableState.tokens.headerText}!important}#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-row-odd,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-row-odd .ag-cell{background-color:${enhancedTableState.tokens.rowOddBg}!important}#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-row-even,#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-row-even .ag-cell{background-color:${enhancedTableState.tokens.rowEvenBg}!important}#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-cell{color:${enhancedTableState.tokens.cellText}!important;border-color:${enhancedTableState.tokens.border}!important}#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-row:hover{background-color:${enhancedTableState.tokens.accent}15!important}#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-row-selected{background-color:${enhancedTableState.tokens.accent}20!important}#ag-grid-container-${selectedRecordType}-${selectedChurch}.ag-theme-alpine .ag-header-cell-resize{background-color:${enhancedTableState.tokens.headerBg}!important}`}
                          console.log('Current headerBg:', enhancedTableState.tokens.headerBg);
                          console.log('Current theme:', enhancedTableState.liturgicalTheme);
                        </style>
                        <div 
                          id={`ag-grid-container-${selectedRecordType}-${selectedChurch}`}
                          className="ag-theme-alpine" 
                          style={{ 
                            height: '100%', 
                            width: '100%',
                          }}
                        >
                          <AgGridReact
                            key={`ag-grid-${selectedRecordType}-${viewMode}-${enhancedTableState.liturgicalTheme}-${enhancedTableState.tokens.headerBg}`}
                            theme="legacy"
                            rowData={agGridRowData}
                            columnDefs={agGridColumnDefs}
                            defaultColDef={agGridDefaultColDef}
                            onGridReady={onAGGridReady}
                            pagination={false}
                            animateRows={true}
                            enableCellTextSelection={true}
                            enableBrowserTooltips={true}
                            tooltipShowDelay={500}
                            rowHeight={40}
                            headerHeight={45}
                            maintainColumnOrder={true}
                            suppressColumnVirtualisation={false}
                            suppressRowVirtualisation={false}
                            getRowId={(params) => params.data.id?.toString() || String(params.data.ID || '')}
                            suppressMenuHide={false}
                            suppressMovableColumns={false}
                            rowSelection={{ mode: 'multiRow', enableClickSelection: false }}
                            getRowStyle={(params) => {
                              const rowIndex = params.node.rowIndex ?? 0;
                              return {
                                backgroundColor: rowIndex % 2 === 0 
                                  ? enhancedTableState.tokens.rowEvenBg 
                                  : enhancedTableState.tokens.rowOddBg,
                                color: enhancedTableState.tokens.cellText,
                              };
                            }}
                          />
                        </div>
                      </Box>
                    ) : (
                      <>
                        {/* Dynamic Records Display - Replaces legacy table implementation */}
                        <DynamicRecordsDisplay
                          records={filteredAndSortedRecords.map(record => {
                            // Ensure entry_type is available in the record
                            const mappedRecord = {
                              ...record,
                              entry_type: record.entry_type || record.entryType || record.originalRecord?.entry_type || record.originalRecord?.entryType || '',
                              _isNew: newlyAddedRecordIds.has(String(record.id)),
                              _isSelected: selectedRecords.has(String(record.id)),
                            };
                            return mappedRecord;
                          })}
                          columns={generateColumnsFromFieldMapper.length > 0 ? generateColumnsFromFieldMapper : mapFieldDefinitionsToDynamicColumns(selectedRecordType)}
                          inferColumns={generateColumnsFromFieldMapper.length === 0}
                          layout={(new URLSearchParams(location.search).get("layout") as any) || "table"}
                          initialSort={{ field: "reception_date", direction: "desc" }}
                          dateFields={["reception_date", "birth_date", "created_at", "updated_at", "deceased_date", "burial_date", "mdate", "marriageDate", "deathDate", "funeralDate"]}
                          hiddenFields={["church_id", "_isNew", "_isSelected"]}
                          onSortChange={(model) => console.log("sort", model)}
                          loading={loading}
                          onView={handleViewRecord}
                          onEdit={handleEditRecord}
                          onDelete={(id) => {
                            handleDeleteRecord(String(id)).catch(console.error);
                          }}
                          onGenerateCertificate={selectedRecordType !== 'funeral' ? handleGenerateCertificate : undefined}
                          selectedRecords={Array.from(selectedRecords)}
                          onRecordSelect={handleRecordSelect}
                          onSelectAll={handleSelectAll}
                          showActions={true}
                          maxHeight={600}
                          themeTokens={enhancedTableState.tokens}
                          fieldRules={enhancedTableState.fieldRules}
                          emptyMessage={searchTerm ? "No records match your search" : "No records found. Click \"Add Record\" to create the first record"}
                          rowStyle={(record: any) => {
                            if (record._isNew) {
                              return {
                                backgroundColor: '#e8f5e9',
                                borderLeft: '4px solid #4caf50',
                                animation: 'fadeIn 0.5s ease-in',
                              };
                            }
                            return {};
                          }}
                        />
                      </>
                    )}

                  </Paper>
                )}
                {/* Add/Edit Dialog */}
                <Dialog
                  open={dialogOpen}
                  onClose={(event, reason) => {
                    // Only allow closing via ESC key or Cancel button
                    // Prevent closing on backdrop click
                    if (reason === 'backdropClick') {
                      return;
                    }
                    if (reason === 'escapeKeyDown') {
                      setDialogOpen(false);
                      setViewingRecord(null);
                      setEditingRecord(null);
                      setEditingRecords([]);
                      setCurrentEditingIndex(0);
                    }
                  }}
                  maxWidth="lg"
                  fullWidth
                >
                  <DialogTitle>
                    {viewingRecord 
                      ? `View ${selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record` 
                      : editingRecord 
                        ? editingRecords.length > 1
                          ? `Editing record ${currentEditingIndex + 1} of ${editingRecords.length} (this is just an example)`
                          : `Edit ${selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record`
                        : `Add New ${selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record`}
                  </DialogTitle>
                  <DialogContent>
                    <Box sx={{ mt: 2, overflow: 'auto' }}>
                      <ImageBasedRecordForm
                        recordType={selectedRecordType as 'baptism' | 'marriage' | 'funeral'}
                        formData={formData}
                        setFormData={setFormData}
                        viewingRecord={viewingRecord}
                        priestOptions={priestOptions}
                        churches={churches}
                        burialLocationOptions={burialLocationOptions}
                      />
                    </Box>
                  </DialogContent>
                  <DialogActions>
                    {viewingRecord ? (
                      // View mode - only show Close button
                      <Button onClick={() => {
                        setDialogOpen(false);
                        setViewingRecord(null);
                      }}>Close</Button>
                    ) : editingRecord ? (
                      // Edit mode - show Previous/Next navigation, Delete, Save/Cancel buttons
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          {(() => {
                            // If editing multiple records, use that array
                            if (editingRecords.length > 1) {
                              const hasPrevious = currentEditingIndex > 0;
                              const hasNext = currentEditingIndex < editingRecords.length - 1;
                              
                              return (
                                <>
                                  <IconButton
                                    onClick={() => handleNavigateRecord('prev')}
                                    disabled={!hasPrevious || loading}
                                    size="small"
                                    sx={{
                                      border: '1px solid #4C1D95',
                                      color: '#4C1D95',
                                      '&:hover': {
                                        backgroundColor: 'rgba(76, 29, 149, 0.1)',
                                      },
                                      '&:disabled': {
                                        borderColor: 'rgba(0, 0, 0, 0.26)',
                                        color: 'rgba(0, 0, 0, 0.26)',
                                      },
                                    }}
                                  >
                                    <ChevronLeftIcon />
                                  </IconButton>
                                  <Typography variant="body2" sx={{ minWidth: '120px', textAlign: 'center' }}>
                                    {currentEditingIndex + 1} of {editingRecords.length}
                                  </Typography>
                                  <IconButton
                                    onClick={() => handleNavigateRecord('next')}
                                    disabled={!hasNext || loading}
                                    size="small"
                                    sx={{
                                      border: '1px solid #4C1D95',
                                      color: '#4C1D95',
                                      '&:hover': {
                                        backgroundColor: 'rgba(76, 29, 149, 0.1)',
                                      },
                                      '&:disabled': {
                                        borderColor: 'rgba(0, 0, 0, 0.26)',
                                        color: 'rgba(0, 0, 0, 0.26)',
                                      },
                                    }}
                                  >
                                    <ChevronRightIcon />
                                  </IconButton>
                                </>
                              );
                            }
                            
                            // Original single record navigation
                            const currentIndex = filteredAndSortedRecords.findIndex(
                              record => String(record.id) === String(editingRecord.id)
                            );
                            const hasPrevious = currentIndex > 0;
                            const hasNext = currentIndex < filteredAndSortedRecords.length - 1;
                            
                            return (
                              <>
                                <IconButton
                                  onClick={() => handleNavigateRecord('prev')}
                                  disabled={!hasPrevious || loading}
                                  size="small"
                                  sx={{
                                    border: '1px solid #4C1D95',
                                    color: '#4C1D95',
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 29, 149, 0.1)',
                                    },
                                    '&:disabled': {
                                      borderColor: 'rgba(0, 0, 0, 0.26)',
                                      color: 'rgba(0, 0, 0, 0.26)',
                                    },
                                  }}
                                >
                                  <ChevronLeftIcon />
                                </IconButton>
                                <Typography variant="body2" sx={{ minWidth: '80px', textAlign: 'center' }}>
                                  {currentIndex !== -1 ? `${currentIndex + 1} of ${filteredAndSortedRecords.length}` : ''}
                                </Typography>
                                <IconButton
                                  onClick={() => handleNavigateRecord('next')}
                                  disabled={!hasNext || loading}
                                  size="small"
                                  sx={{
                                    border: '1px solid #4C1D95',
                                    color: '#4C1D95',
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 29, 149, 0.1)',
                                    },
                                    '&:disabled': {
                                      borderColor: 'rgba(0, 0, 0, 0.26)',
                                      color: 'rgba(0, 0, 0, 0.26)',
                                    },
                                  }}
                                >
                                  <ChevronRightIcon />
                                </IconButton>
                              </>
                            );
                          })()}
                        </Box>
                        <Button 
                          onClick={() => {
                            setDialogOpen(false);
                            setEditingRecord(null);
                            setEditingRecords([]);
                            setCurrentEditingIndex(0);
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (editingRecord) {
                              handleDeleteRecord(String(editingRecord.id));
                            }
                          }}
                          variant="outlined"
                          color="error"
                          disabled={loading}
                          startIcon={<DeleteIcon />}
                        >
                          Delete
                        </Button>
                        <Button
                          onClick={handleSaveRecord}
                          variant="contained"
                          disabled={loading}
                        >
                          {loading ? <CircularProgress size={20} /> : "Save"}
                        </Button>
                      </>
                    ) : (
                      // Add mode - show Cancel, Save, and Save & Add Another buttons
                      <>
                        <Button 
                          onClick={() => {
                            setDialogOpen(false);
                            setSaveAndAddAnother(false);
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            setSaveAndAddAnother(false);
                            handleSaveRecord();
                          }}
                          variant="outlined"
                          disabled={loading}
                        >
                          {loading ? <CircularProgress size={20} /> : "Save"}
                        </Button>
                        <Button
                          onClick={() => {
                            setSaveAndAddAnother(true);
                            handleSaveRecord();
                          }}
                          variant="contained"
                          disabled={loading}
                        >
                          {loading ? <CircularProgress size={20} /> : "Save & Add Another"}
                        </Button>
                      </>
                    )}
                  </DialogActions>
                </Dialog>


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
                  datasets={allRecordsDatasets}
                  counts={allRecordsCounts}
                  records={filteredAndSortedRecords}
                  recordType={selectedRecordType as 'baptism' | 'marriage' | 'funeral'}
                  onRefresh={async () => {
                    await fetchAllRecordTypes(selectedChurch);
                    fetchRecords(selectedRecordType, selectedChurch);
                    showToast('Records refreshed successfully!', 'success');
                  }}
                />

                {/* Certificate Preview Dialog */}
                <Dialog
                  open={certificateDialogOpen}
                  onClose={() => {
                    setCertificateDialogOpen(false);
                    setCertificateRecord(null);
                    setCertificatePreviewUrl(null);
                  }}
                  maxWidth="md"
                  fullWidth
                >
                  <DialogTitle>
                    {selectedRecordType === 'marriage' ? 'Marriage' : 'Baptism'} Certificate Preview
                    {certificateRecord && (
                      <Typography variant="subtitle2" color="text.secondary">
                        {selectedRecordType === 'marriage' 
                          ? `${certificateRecord.fname_groom || ''} ${certificateRecord.lname_groom || ''} & ${certificateRecord.fname_bride || ''} ${certificateRecord.lname_bride || ''}`
                          : `${certificateRecord.first_name || certificateRecord.firstName || ''} ${certificateRecord.last_name || certificateRecord.lastName || ''}`
                        }
                      </Typography>
                    )}
                  </DialogTitle>
                  <DialogContent>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      minHeight: 400,
                      bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                      borderRadius: 1,
                      p: 2,
                    }}>
                      {certificateLoading ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <CircularProgress />
                          <Typography variant="body2" sx={{ mt: 2 }}>
                            Generating certificate preview...
                          </Typography>
                        </Box>
                      ) : certificatePreviewUrl ? (
                        <Box
                          component="img"
                          src={certificatePreviewUrl}
                          alt="Certificate Preview"
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 600,
                            objectFit: 'contain',
                            boxShadow: 3,
                            borderRadius: 1,
                          }}
                        />
                      ) : (
                        <Typography color="error">
                          Failed to load certificate preview
                        </Typography>
                      )}
                    </Box>
                  </DialogContent>
                  <DialogActions>
                    <Button 
                      onClick={() => {
                        setCertificateDialogOpen(false);
                        setCertificateRecord(null);
                        setCertificatePreviewUrl(null);
                      }}
                    >
                      Close
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleDownloadCertificate}
                      disabled={!certificatePreviewUrl || certificateLoading}
                      startIcon={<ExportIcon />}
                    >
                      Download Certificate
                    </Button>
                  </DialogActions>
                </Dialog>
              </Stack>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BaptismRecordsPage;
