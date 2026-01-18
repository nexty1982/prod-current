import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import enSamplesData from '@/assets/en_samples.json';
import grSamplesData from '@/assets/gr_samples.json';
import ruSamplesData from '@/assets/ru_samples.json';
import roSamplesData from '@/assets/ro_samples.json';
import geSamplesDataRaw from '@/assets/ge_samples.json';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  Stack,
  useTheme,
  Link,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  Chip,
  Tooltip,
  Divider,
  Slider,
  Switch,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  IconMenu2,
  IconSearch,
  IconDownload,
  IconEye,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconArrowLeft,
  IconSettings,
  IconPlus,
} from '@tabler/icons-react';
import {
  Storage as StorageIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Sort as SortIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  CloudUpload as CloudUploadIcon,
  ExpandMore as ExpandMoreIcon,
  GridView as GridViewIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi, ColumnApi } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import Header from './Header';
import LeftSideMenu from './LeftSideMenu';
import Footer from './Footer';
import { enhancedTableStore, THEME_MAP, LiturgicalThemeKey, ThemeTokens } from '@/store/enhancedTableStore';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Styled Components
const HeaderAppBar = styled(AppBar)({
  backgroundColor: '#1a237e', // Dark blue
  color: '#ffffff',
  boxShadow: 'none',
});

const TopBar = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  flexWrap: 'wrap',
}));

const SearchFilterSection = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : '#e3f2fd',
  padding: '16px',
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  flexWrap: 'wrap',
}));

const LanguageTabsContainer = styled(Box)(({ theme }) => ({
  padding: '16px',
  backgroundColor: theme.palette.background.default,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTabs-indicator': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? theme.palette.text.primary 
      : '#1565c0',
    height: 3,
  },
  '& .MuiTab-root': {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    minHeight: 48,
    color: theme.palette.mode === 'dark' 
      ? theme.palette.text.secondary 
      : '#1565c0',
    '&.Mui-selected': {
      color: theme.palette.mode === 'dark' 
        ? theme.palette.text.primary 
        : '#1565c0',
    },
  },
}));

const RecordTypeCard = styled(Card)({
  position: 'relative',
  height: '300px',
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: 8,
  },
});

const SingleImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  backgroundSize: 'contain',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : '#f5f5f5',
}));

const CardTitle = styled(Typography)({
  position: 'absolute',
  bottom: '16px',
  left: '16px',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '1.25rem',
  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
  zIndex: 2,
});

// Light travel animation for section header
const lightTravel = keyframes`
  0% {
    transform: translateX(-100%) skewX(-20deg);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(200%) skewX(-20deg);
    opacity: 0;
  }
`;

const SectionHeaderBox = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 90,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 32px',
  borderRadius: '12px',
  position: 'relative',
  overflow: 'hidden',
  // Solid background color - gradient removed
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : '#faf8f4',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04)',
  border: '2px solid rgba(212, 175, 55, 0.4)',
  borderBottom: '3px solid rgba(212, 175, 55, 0.5)',
  gap: theme.spacing(2),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect x='21' y='6' width='6' height='36' fill='%23C8A24B' fill-opacity='0.06'/%3E%3Crect x='10' y='14' width='28' height='5' fill='%23C8A24B' fill-opacity='0.06'/%3E%3C/svg%3E")`,
    backgroundSize: '48px 48px',
    backgroundRepeat: 'repeat',
    zIndex: 0,
  },
  // Light traveling effect overlay
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '30%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
    animation: `${lightTravel} 3s ease-in-out infinite`,
    zIndex: 1,
    pointerEvents: 'none',
  },
  '& > *': {
    position: 'relative',
    zIndex: 2,
  },
  [theme.breakpoints.down('md')]: {
    height: 80,
    padding: '0 24px',
  },
  [theme.breakpoints.down('sm')]: {
    height: 70,
    padding: '0 20px',
  },
}));

const SectionHeaderTitle = styled(Typography)(({ theme }) => ({
  fontSize: '26px',
  fontWeight: 700,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a2e',
  fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
  letterSpacing: '0.5px',
  lineHeight: 1.3,
  textTransform: 'none',
  fontStyle: 'normal',
  textShadow: theme.palette.mode === 'dark' 
    ? '0 1px 2px rgba(0, 0, 0, 0.5), 0 1px 1px rgba(0, 0, 0, 0.3)' 
    : '0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 1px rgba(255, 255, 255, 0.9)',
  '@media (max-width: 900px)': {
    fontSize: '22px',
    letterSpacing: '0.3px',
  },
  '@media (max-width: 600px)': {
    fontSize: '18px',
    letterSpacing: '0.2px',
  },
}));

interface BaptismRecord {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  dateOfBaptism: string;
  birthplace: string;
  sponsors: string;
  parentsNames: string;
  clergyName: string;
}

interface MarriageRecord {
  id: number;
  dateMarried: string;
  groom: string;
  bride: string;
  groomsParents: string;
  bridesParents: string;
  witnesses: string;
  marriageLicense: string;
  clergy: string;
}

interface FuneralRecord {
  id: number;
  dateOfDeath: string;
  burialDate: string;
  age: number;
  burialLocation: string;
  firstName: string;
  lastName: string;
  clergy: string;
}

const Samples: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeLanguageTab, setActiveLanguageTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [recordType, setRecordType] = useState('all');
  const [selectedRecordType, setSelectedRecordType] = useState<string | null>(null);
  const [isGridReady, setIsGridReady] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'about-orthodox-christianity' | 'custom-records' | 'sample-data' | 'powerful-features' | 'graphical-analysis'>('sample-data');
  const gridApiRef = useRef<GridApi | null>(null);
  const gridColumnApiRef = useRef<ColumnApi | null>(null);

  // Configuration features state
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [configTab, setConfigTab] = useState(0);
  // Theme state from enhancedTableStore
  const [tableStoreState, setTableStoreState] = useState(enhancedTableStore.getState());
  const selectedTheme = tableStoreState.liturgicalTheme;
  const themeTokens = tableStoreState.tokens;
  
  // Subscribe to enhancedTableStore changes
  useEffect(() => {
    const unsubscribe = enhancedTableStore.subscribe(() => {
      setTableStoreState(enhancedTableStore.getState());
    });
    return unsubscribe;
  }, []);
  
  // Handle theme change through the store
  const handleThemeChange = (theme: string) => {
    enhancedTableStore.setLiturgicalTheme(theme as LiturgicalThemeKey);
  };
  
  // Field Mapper state (demo)
  const [fieldMapperColumns, setFieldMapperColumns] = useState<Array<{
    column_name: string;
    ordinal_position: number;
    new_name: string;
    is_visible: boolean;
    is_sortable: boolean;
  }>>([]);
  const [defaultSortField, setDefaultSortField] = useState<string>('');
  const [defaultSortDirection, setDefaultSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Record Settings state (demo)
  const [recordSettings, setRecordSettings] = useState({
    recordImage: { enabled: true },
    calendar: { enabled: true },
    churchLogo: { enabled: true },
    omLogo: { enabled: true },
    background: { enabled: true },
    g1Overlay: { enabled: false },
  });
  
  // Theme Studio state (demo)
  const [themeStudio, setThemeStudio] = useState({
    isGlobal: false,
    selectedTheme: 'orthodox_traditional',
  });
  
  // UI Theme state (demo)
  const [uiTheme, setUiTheme] = useState({
    buttonSize: 'small',
    padding: '5px 9px',
    fontSize: '0.75rem',
  });

  const handleLanguageTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveLanguageTab(newValue);
  };

  const handleRecordTypeClick = (type: string) => {
    setSelectedRecordType(type);
    setIsGridReady(false);
  };

  const handleBackToHome = () => {
    setSelectedRecordType(null);
    setIsGridReady(false);
  };

  const handleGridReady = (params: GridReadyEvent) => {
    gridApiRef.current = params.api;
    gridColumnApiRef.current = params.columnApi;
    setIsGridReady(true);
    // Apply initial search term if it exists
    // Use requestAnimationFrame to ensure grid is fully rendered
    requestAnimationFrame(() => {
      if (searchTerm && typeof params.api.setQuickFilter === 'function') {
        params.api.setQuickFilter(searchTerm);
        params.api.onFilterChanged();
      }
    });
  };

  const handleExport = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.exportDataAsCsv();
    }
  }, []);

  // Helper function to filter records based on search term
  const filterRecords = <T extends Record<string, any>>(records: T[], searchTerm: string): T[] => {
    if (!searchTerm || searchTerm.trim() === '') {
      return records;
    }
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    return records.filter((record) => {
      // Search across all string/number values in the record
      return Object.values(record).some((value) => {
        if (value === null || value === undefined) {
          return false;
        }
        // Convert to string and check if it contains the search term
        const stringValue = String(value).toLowerCase();
        return stringValue.includes(lowerSearchTerm);
      });
    });
  };

  const handleResetFilters = useCallback(() => {
    if (isGridReady && gridApiRef.current) {
      // Clear column filters
      gridApiRef.current.setFilterModel(null);
      // Force grid refresh
      gridApiRef.current.onFilterChanged();
      // Clear search term (this will automatically update the filtered rowData)
      setSearchTerm('');
    }
  }, [isGridReady]);

  // Handle opening columns dialog
  const handleColumnsClick = useCallback(() => {
    if (!isGridReady || !gridApiRef.current) return;
    
    // Get all columns (including hidden ones)
    const allColumns = gridApiRef.current.getAllGridColumns() || [];
    const visibility: Record<string, boolean> = {};
    
    allColumns.forEach((column) => {
      const colId = column.getColId();
      const colDef = column.getColDef();
      // Skip the checkbox selection column (it has checkboxSelection property)
      if (!colDef.checkboxSelection && colId) {
        visibility[colId] = column.isVisible();
      }
    });
    
    setColumnVisibility(visibility);
    setColumnsDialogOpen(true);
  }, [isGridReady]);

  // Handle toggling column visibility
  const handleToggleColumn = useCallback((colId: string) => {
    if (!isGridReady || !gridApiRef.current) return;
    
    const column = gridApiRef.current.getColumn(colId);
    if (column) {
      const newVisibility = !column.isVisible();
      gridApiRef.current.setColumnVisible(colId, newVisibility);
      setColumnVisibility((prev) => ({
        ...prev,
        [colId]: newVisibility,
      }));
    }
  }, [isGridReady]);

  // Handle closing columns dialog
  const handleCloseColumnsDialog = useCallback(() => {
    setColumnsDialogOpen(false);
  }, []);

  // Handle section change from LeftSideMenu
  const handleSectionChange = useCallback((section: typeof activeSection) => {
    setActiveSection(section);
    // Navigate to home if not already on sample-data section
    if (section !== 'sample-data') {
      navigate('/');
    }
  }, [navigate]);

  // Handle submenu item click from LeftSideMenu
  const handleSubmenuItemClick = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Record type order for navigation
  const recordTypeOrder = ['baptism', 'marriage', 'funeral'];

  // Initialize field mapper columns based on selected record type
  useEffect(() => {
    if (!selectedRecordType) {
      setFieldMapperColumns([]);
      return;
    }

    let columns: Array<{
      column_name: string;
      ordinal_position: number;
      new_name: string;
      is_visible: boolean;
      is_sortable: boolean;
    }> = [];

    if (selectedRecordType === 'baptism') {
      columns = [
        { column_name: 'id', ordinal_position: 1, new_name: 'id', is_visible: false, is_sortable: false },
        { column_name: 'first_name', ordinal_position: 2, new_name: 'Display name for first_name', is_visible: true, is_sortable: true },
        { column_name: 'last_name', ordinal_position: 3, new_name: 'Display name for last_name', is_visible: true, is_sortable: true },
        { column_name: 'birth_date', ordinal_position: 4, new_name: 'Display name for birth_date', is_visible: true, is_sortable: true },
        { column_name: 'reception_date', ordinal_position: 5, new_name: 'Display name for reception_date', is_visible: true, is_sortable: true },
        { column_name: 'birthplace', ordinal_position: 6, new_name: 'Display name for birthplace', is_visible: true, is_sortable: true },
        { column_name: 'entry_type', ordinal_position: 7, new_name: 'Display name for entry_type', is_visible: true, is_sortable: true },
        { column_name: 'sponsors', ordinal_position: 8, new_name: 'Display name for sponsors', is_visible: true, is_sortable: true },
        { column_name: 'parents', ordinal_position: 9, new_name: 'Display name for parents', is_visible: true, is_sortable: true },
        { column_name: 'clergy', ordinal_position: 10, new_name: 'Display name for clergy', is_visible: true, is_sortable: true },
      ];
      setDefaultSortField('reception_date');
    } else if (selectedRecordType === 'marriage') {
      columns = [
        { column_name: 'id', ordinal_position: 1, new_name: 'id', is_visible: false, is_sortable: false },
        { column_name: 'married_date_name', ordinal_position: 2, new_name: 'Display name for married_date_name', is_visible: true, is_sortable: true },
        { column_name: 'last_name', ordinal_position: 3, new_name: 'Display name for last_name', is_visible: true, is_sortable: true },
        { column_name: 'parents_groom', ordinal_position: 4, new_name: 'Display name for parents_groom', is_visible: true, is_sortable: true },
        { column_name: 'parents', ordinal_position: 5, new_name: 'Display name for parents', is_visible: true, is_sortable: true },
        { column_name: 'witnesses', ordinal_position: 6, new_name: 'Display name for witnesses', is_visible: true, is_sortable: true },
        { column_name: 'marriage_license', ordinal_position: 7, new_name: 'Display name for marriage_license', is_visible: true, is_sortable: true },
        { column_name: 'clergy', ordinal_position: 8, new_name: 'Display name for clergy', is_visible: true, is_sortable: true },
      ];
      setDefaultSortField('married_date_name');
    } else if (selectedRecordType === 'funeral') {
      columns = [
        { column_name: 'id', ordinal_position: 1, new_name: 'id', is_visible: false, is_sortable: false },
        { column_name: 'date_of_deceased', ordinal_position: 2, new_name: 'Display name for date_of_deceased', is_visible: true, is_sortable: true },
        { column_name: 'date_of_burial', ordinal_position: 3, new_name: 'Display name for date_of_burial', is_visible: true, is_sortable: true },
        { column_name: 'first_name', ordinal_position: 4, new_name: 'Display name for first_name', is_visible: true, is_sortable: true },
        { column_name: 'last_name', ordinal_position: 5, new_name: 'Display name for last_name', is_visible: true, is_sortable: true },
        { column_name: 'age', ordinal_position: 6, new_name: 'Display name for age', is_visible: true, is_sortable: true },
        { column_name: 'clergy', ordinal_position: 7, new_name: 'Display name for clergy', is_visible: true, is_sortable: true },
        { column_name: 'burial_location', ordinal_position: 8, new_name: 'Display name for burial_location', is_visible: true, is_sortable: true },
      ];
      setDefaultSortField('date_of_deceased');
    }

    setFieldMapperColumns(columns);
  }, [selectedRecordType]);

  // Handle navigating to previous record type
  const handlePreviousRecordType = useCallback(() => {
    if (!selectedRecordType) return;
    const currentIndex = recordTypeOrder.indexOf(selectedRecordType);
    if (currentIndex > 0) {
      setSelectedRecordType(recordTypeOrder[currentIndex - 1]);
      setIsGridReady(false);
      setSearchTerm(''); // Clear search when switching record types
    }
  }, [selectedRecordType]);

  // Handle navigating to next record type
  const handleNextRecordType = useCallback(() => {
    if (!selectedRecordType) return;
    const currentIndex = recordTypeOrder.indexOf(selectedRecordType);
    if (currentIndex < recordTypeOrder.length - 1) {
      setSelectedRecordType(recordTypeOrder[currentIndex + 1]);
      setIsGridReady(false);
      setSearchTerm(''); // Clear search when switching record types
    }
  }, [selectedRecordType]);

  // Baptism records from JSON file (English)
  const baptismRecords: BaptismRecord[] = useMemo(() => {
    return enSamplesData.baptism_records.map((record, index) => ({
      id: index + 1,
      firstName: record.first_name,
      lastName: record.last_name,
      dateOfBirth: record.date_of_birth,
      dateOfBaptism: record.date_of_baptism,
      birthplace: record.birthplace,
      sponsors: record.sponsors,
      parentsNames: record.parents_names,
      clergyName: record.clergy_name,
    }));
  }, []);

  // AG Grid column definitions for Greek Baptism Records
  const greekBaptismColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'firstName',
      headerName: 'Όνομα',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'Επώνυμο',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBirth',
      headerName: 'Ημερομηνία...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBaptism',
      headerName: 'Ημερομηνία...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'birthplace',
      headerName: 'Τόπος Γέννη...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'sponsors',
      headerName: 'Ανάδοχοι',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'parentsNames',
      headerName: 'Ονόματα Γονέων',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'clergyName',
      headerName: 'Όνομα Κληρικού',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // Greek Baptism records from JSON file
  const greekBaptismRecords: BaptismRecord[] = useMemo(() => {
    return grSamplesData.baptism_records.map((record, index) => ({
      id: index + 1,
      firstName: record.first_name,
      lastName: record.last_name,
      dateOfBirth: record.date_of_birth,
      dateOfBaptism: record.date_of_baptism,
      birthplace: record.birthplace,
      sponsors: record.sponsors,
      parentsNames: record.parents_names,
      clergyName: record.clergy_name,
    }));
  }, []);

  // AG Grid column definitions for Russian Baptism Records
  const russianBaptismColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'firstName',
      headerName: 'Имя',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'Фамилия',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBirth',
      headerName: 'Дата Рожде...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBaptism',
      headerName: 'Дата Креще...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'birthplace',
      headerName: 'Место Рожд...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'sponsors',
      headerName: 'Крёстные',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'parentsNames',
      headerName: 'Имена Родителей',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'clergyName',
      headerName: 'Имя Священн...',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // Russian Baptism records from JSON file
  const russianBaptismRecords: BaptismRecord[] = useMemo(() => {
    return ruSamplesData.baptism_records.map((record, index) => ({
      id: index + 1,
      firstName: record.first_name,
      lastName: record.last_name,
      dateOfBirth: record.date_of_birth,
      dateOfBaptism: record.date_of_baptism,
      birthplace: record.birthplace,
      sponsors: record.sponsors,
      parentsNames: record.parents_names,
      clergyName: record.clergy_name,
    }));
  }, []);


  // AG Grid column definitions for Baptism Records
  const baptismColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'firstName',
      headerName: 'First Name',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'Last Name',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBirth',
      headerName: 'Date of Birth',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBaptism',
      headerName: 'Date of Bapt...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'birthplace',
      headerName: 'Birthplace',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'sponsors',
      headerName: 'Sponsors',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'parentsNames',
      headerName: 'Parents Names',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'clergyName',
      headerName: 'Clergy Name',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // AG Grid column definitions for Marriage Records
  const marriageColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateMarried',
      headerName: 'Date Marri...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groom',
      headerName: 'Groom',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'bride',
      headerName: 'Bride',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groomsParents',
      headerName: "Groom's Parents",
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'bridesParents',
      headerName: "Bride's Parents",
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'witnesses',
      headerName: 'Witnesses',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'marriageLicense',
      headerName: 'Marriage Lice...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'Clergy',
      sortable: true,
      filter: true,
      width: 150,
    },
  ], []);

  // Marriage records from JSON file (English)
  const marriageRecords: MarriageRecord[] = useMemo(() => {
    return enSamplesData.marriage_records.map((record, index) => ({
      id: index + 1,
      dateMarried: record.date_married,
      groom: record.groom,
      bride: record.bride,
      groomsParents: record.grooms_parents,
      bridesParents: record.brides_parents,
      witnesses: record.witnesses,
      marriageLicense: record.marriage_license,
      clergy: record.clergy,
    }));
  }, []);

  // AG Grid column definitions for Greek Marriage Records
  const greekMarriageColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateMarried',
      headerName: 'Ημερομηνί...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groom',
      headerName: 'Γαμπρός',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'bride',
      headerName: 'Νύφη',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groomsParents',
      headerName: 'Γονείς Γαμπρού',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'bridesParents',
      headerName: 'Γονείς Νύφης',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'witnesses',
      headerName: 'Μάρτυρες',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'marriageLicense',
      headerName: 'Άδεια Γάμου',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'Κληρικός',
      sortable: true,
      filter: true,
      width: 150,
    },
  ], []);

  // Greek Marriage records from JSON file
  const greekMarriageRecords: MarriageRecord[] = useMemo(() => {
    return grSamplesData.marriage_records.map((record, index) => ({
      id: index + 1,
      dateMarried: record.date_married,
      groom: record.groom,
      bride: record.bride,
      groomsParents: record.grooms_parents,
      bridesParents: record.brides_parents,
      witnesses: record.witnesses,
      marriageLicense: record.marriage_license,
      clergy: record.clergy,
    }));
  }, []);

  // AG Grid column definitions for Russian Marriage Records
  const russianMarriageColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateMarried',
      headerName: 'Дата Брака',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groom',
      headerName: 'Жених',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'bride',
      headerName: 'Невеста',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groomsParents',
      headerName: 'Родители Жениха',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'bridesParents',
      headerName: 'Родители Невесты',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'witnesses',
      headerName: 'Свидетели',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'marriageLicense',
      headerName: 'Свидетельств...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'Священник',
      sortable: true,
      filter: true,
      width: 150,
    },
  ], []);

  // Russian Marriage records from JSON file
  const russianMarriageRecords: MarriageRecord[] = useMemo(() => {
    return ruSamplesData.marriage_records.map((record, index) => ({
      id: index + 1,
      dateMarried: record.date_married,
      groom: record.groom,
      bride: record.bride,
      groomsParents: record.grooms_parents,
      bridesParents: record.brides_parents,
      witnesses: record.witnesses,
      marriageLicense: record.marriage_license,
      clergy: record.clergy,
    }));
  }, []);

  // AG Grid column definitions for Funeral Records (English)
  const funeralColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateOfDeath',
      headerName: 'Date of Death',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'burialDate',
      headerName: 'Burial Date',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'age',
      headerName: 'Age',
      sortable: true,
      filter: true,
      width: 100,
    },
    {
      field: 'burialLocation',
      headerName: 'Burial Location',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'firstName',
      headerName: 'First Name',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'Last Name',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'Clergy',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // AG Grid column definitions for Greek Funeral Records
  const greekFuneralColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateOfDeath',
      headerName: 'Ημερομηνία Θαν...',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'burialDate',
      headerName: 'Ημερομηνία Ταφής',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'age',
      headerName: 'Ηλικία',
      sortable: true,
      filter: true,
      width: 100,
    },
    {
      field: 'burialLocation',
      headerName: 'Τόπος Ταφής',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'firstName',
      headerName: 'Όνομα',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'Επώνυμο',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'Κληρικός',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // Funeral records from JSON file (English)
  const funeralRecords: FuneralRecord[] = useMemo(() => {
    return enSamplesData.funeral_records.map((record, index) => ({
      id: index + 1,
      dateOfDeath: record.date_deceased,
      burialDate: record.burial_date,
      age: record.age,
      burialLocation: record.burial_location,
      firstName: record.first_name,
      lastName: record.last_name,
      clergy: record.clergy,
    }));
  }, []);

  // Greek Funeral records from JSON file
  const greekFuneralRecords: FuneralRecord[] = useMemo(() => {
    return grSamplesData.funeral_records.map((record, index) => ({
      id: index + 1,
      dateOfDeath: record.date_deceased,
      burialDate: record.burial_date,
      age: record.age,
      burialLocation: record.burial_location,
      firstName: record.first_name,
      lastName: record.last_name,
      clergy: record.clergy,
    }));
  }, []);

  // AG Grid column definitions for Russian Funeral Records
  const russianFuneralColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateOfDeath',
      headerName: 'Дата Смерти',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'burialDate',
      headerName: 'Дата Погребения',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'age',
      headerName: 'Возраст',
      sortable: true,
      filter: true,
      width: 100,
    },
    {
      field: 'burialLocation',
      headerName: 'Место Погребения',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'firstName',
      headerName: 'Имя',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'Фамилия',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'Священник',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // Russian Funeral records from JSON file
  const russianFuneralRecords: FuneralRecord[] = useMemo(() => {
    return ruSamplesData.funeral_records.map((record, index) => ({
      id: index + 1,
      dateOfDeath: record.date_deceased,
      burialDate: record.burial_date,
      age: record.age,
      burialLocation: record.burial_location,
      firstName: record.first_name,
      lastName: record.last_name,
      clergy: record.clergy,
    }));
  }, []);

  // AG Grid column definitions for Romanian Baptism Records
  const romanianBaptismColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'firstName',
      headerName: 'Prenume',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'Nume',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBirth',
      headerName: 'Data Nașterii',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBaptism',
      headerName: 'Data Botezului',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'birthplace',
      headerName: 'Locul Nașterii',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'sponsors',
      headerName: 'Nași',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'parentsNames',
      headerName: 'Numele Părinților',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'clergyName',
      headerName: 'Numele Preotului',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // AG Grid column definitions for Romanian Marriage Records
  const romanianMarriageColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateMarried',
      headerName: 'Data Căsătoriei',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groom',
      headerName: 'Mire',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'bride',
      headerName: 'Mireasă',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groomsParents',
      headerName: 'Părinții Mirelui',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'bridesParents',
      headerName: 'Părinții Miresei',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'witnesses',
      headerName: 'Martori',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'marriageLicense',
      headerName: 'Licență Căsătorie',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'Preot',
      sortable: true,
      filter: true,
      width: 150,
    },
  ], []);

  // AG Grid column definitions for Romanian Funeral Records
  const romanianFuneralColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateOfDeath',
      headerName: 'Data Decesului',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'burialDate',
      headerName: 'Data Înmormântării',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'age',
      headerName: 'Vârsta',
      sortable: true,
      filter: true,
      width: 100,
    },
    {
      field: 'burialLocation',
      headerName: 'Locul Înmormântării',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'firstName',
      headerName: 'Prenume',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'Nume',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'Preot',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // Romanian Baptism records from JSON file
  const romanianBaptismRecords: BaptismRecord[] = useMemo(() => {
    return roSamplesData.baptism_records.map((record, index) => ({
      id: index + 1,
      firstName: record.first_name,
      lastName: record.last_name,
      dateOfBirth: record.date_of_birth,
      dateOfBaptism: record.date_of_baptism,
      birthplace: record.birthplace,
      sponsors: record.sponsors,
      parentsNames: record.parents_names,
      clergyName: record.clergy_name,
    }));
  }, []);

  // Romanian Marriage records from JSON file
  const romanianMarriageRecords: MarriageRecord[] = useMemo(() => {
    return roSamplesData.marriage_records.map((record, index) => ({
      id: index + 1,
      dateMarried: record.date_married,
      groom: record.groom,
      bride: record.bride,
      groomsParents: record.grooms_parents,
      bridesParents: record.brides_parents,
      witnesses: record.witnesses,
      marriageLicense: record.marriage_license,
      clergy: record.clergy,
    }));
  }, []);

  // Romanian Funeral records from JSON file
  const romanianFuneralRecords: FuneralRecord[] = useMemo(() => {
    return roSamplesData.funeral_records.map((record, index) => ({
      id: index + 1,
      dateOfDeath: record.date_deceased,
      burialDate: record.burial_date,
      age: record.age,
      burialLocation: record.burial_location,
      firstName: record.first_name,
      lastName: record.last_name,
      clergy: record.clergy,
    }));
  }, []);

  // Transform Georgian samples data to expected format
  const geSamplesData = useMemo(() => {
    return {
      baptism_records: geSamplesDataRaw.baptism_records.map((record: any) => ({
        first_name: record['სახელი'] || '',
        last_name: record['გვარი'] || '',
        date_of_birth: record['დაბადების თარიღი'] || '',
        date_of_baptism: record['ნათლობის თარიღი'] || '',
        birthplace: record['დაბადების ადგილი'] || '',
        sponsors: record['ნათლები'] || '',
        parents_names: record['მშობლები'] || '',
        clergy_name: record['მღვდელი'] || '',
      })),
      marriage_records: geSamplesDataRaw.marriage_records.map((record: any) => ({
        date_married: record['ქორწინების თარიღი'] || '',
        groom: `${record['სიძე — სახელი'] || ''} ${record['სიძე — გვარი'] || ''}`.trim(),
        bride: `${record['ნეფე — სახელი'] || ''} ${record['ნეფე — გვარი'] || ''}`.trim(),
        grooms_parents: record['სიძის მშობლები'] || '',
        brides_parents: record['ნეფის მშობლები'] || '',
        witnesses: record['მოწმე'] || '',
        marriage_license: record['ქორწინების მოწმობა'] || '',
        clergy: record['მღვდელი'] || '',
      })),
      funeral_records: geSamplesDataRaw.funeral_records.map((record: any) => ({
        date_deceased: record['გარდაცვალების თარიღი'] || '',
        burial_date: record['დასაფლავების თარიღი'] || '',
        age: record['ასაკი'] || 0,
        burial_location: record['დასაფლავების ადგილი'] || '',
        first_name: record['სახელი'] || '',
        last_name: record['გვარი'] || '',
        clergy: record['მღვდელი'] || '',
      })),
    };
  }, []);

  // AG Grid column definitions for Georgian Baptism Records
  const georgianBaptismColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'firstName',
      headerName: 'სახელი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'გვარი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBirth',
      headerName: 'დაბადების თარიღი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'dateOfBaptism',
      headerName: 'ნათლობის თარიღი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'birthplace',
      headerName: 'დაბადების ადგილი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'sponsors',
      headerName: 'ნათლები',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'parentsNames',
      headerName: 'მშობლები',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'clergyName',
      headerName: 'მღვდელი',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // Georgian Baptism records from JSON file
  const georgianBaptismRecords: BaptismRecord[] = useMemo(() => {
    return geSamplesData.baptism_records.map((record, index) => ({
      id: index + 1,
      firstName: record.first_name,
      lastName: record.last_name,
      dateOfBirth: record.date_of_birth,
      dateOfBaptism: record.date_of_baptism,
      birthplace: record.birthplace,
      sponsors: record.sponsors,
      parentsNames: record.parents_names,
      clergyName: record.clergy_name,
    }));
  }, [geSamplesData]);

  // AG Grid column definitions for Georgian Marriage Records
  const georgianMarriageColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateMarried',
      headerName: 'ქორწინების თარიღი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groom',
      headerName: 'სიძე',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'bride',
      headerName: 'ნეფე',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'groomsParents',
      headerName: 'სიძის მშობლები',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'bridesParents',
      headerName: 'ნეფის მშობლები',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'witnesses',
      headerName: 'მოწმე',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'marriageLicense',
      headerName: 'ქორწინების მოწმობა',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'მღვდელი',
      sortable: true,
      filter: true,
      width: 150,
    },
  ], []);

  // Georgian Marriage records from JSON file
  const georgianMarriageRecords: MarriageRecord[] = useMemo(() => {
    return geSamplesData.marriage_records.map((record, index) => ({
      id: index + 1,
      dateMarried: record.date_married,
      groom: record.groom,
      bride: record.bride,
      groomsParents: record.grooms_parents,
      bridesParents: record.brides_parents,
      witnesses: record.witnesses,
      marriageLicense: record.marriage_license,
      clergy: record.clergy,
    }));
  }, [geSamplesData]);

  // AG Grid column definitions for Georgian Funeral Records
  const georgianFuneralColumnDefs: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMenu: true,
      lockPosition: 'left',
    },
    {
      field: 'dateOfDeath',
      headerName: 'გარდაცვალების თარიღი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'burialDate',
      headerName: 'დასაფლავების თარიღი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'age',
      headerName: 'ასაკი',
      sortable: true,
      filter: true,
      width: 100,
    },
    {
      field: 'burialLocation',
      headerName: 'დასაფლავების ადგილი',
      sortable: true,
      filter: true,
      width: 200,
    },
    {
      field: 'firstName',
      headerName: 'სახელი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'lastName',
      headerName: 'გვარი',
      sortable: true,
      filter: true,
      width: 150,
    },
    {
      field: 'clergy',
      headerName: 'მღვდელი',
      sortable: true,
      filter: true,
      width: 180,
    },
  ], []);

  // Georgian Funeral records from JSON file
  const georgianFuneralRecords: FuneralRecord[] = useMemo(() => {
    return geSamplesData.funeral_records.map((record, index) => ({
      id: index + 1,
      dateOfDeath: record.date_deceased,
      burialDate: record.burial_date,
      age: record.age,
      burialLocation: record.burial_location,
      firstName: record.first_name,
      lastName: record.last_name,
      clergy: record.clergy,
    }));
  }, [geSamplesData]);

  const languageTabs = [
    { label: 'English', value: 'en' },
    { label: 'Ελληνικά (Greek)', value: 'gr' },
    { label: 'Русский (Russian)', value: 'ru' },
    { label: 'Română (Romanian)', value: 'ro' },
    { label: 'ქართული (Georgian)', value: 'ge' },
  ];

  const recordTypes = [
    {
      id: 'baptism',
      title: 'Baptism Records',
      leftImage: 'url(/images/main/baptism.png)',
      rightImage: 'url(/images/main/baptism.png)',
    },
    {
      id: 'marriage',
      title: 'Marriage Records',
      leftImage: 'url(/images/main/marriage.png)',
      rightImage: 'url(/images/main/marriage.png)',
    },
    {
      id: 'funeral',
      title: 'Funeral Records',
      leftImage: 'url(/images/main/funeral.png)',
      rightImage: 'url(/images/main/funeral.png)',
    },
  ];

  // Get card title based on language and record type
  const getCardTitle = (recordId: string) => {
    if (activeLanguageTab === 1) {
      // Greek translations
      const greekCardTitles = {
        baptism: 'Μητρώα Βαπτίσεων',
        marriage: 'Μητρώα Γάμων',
        funeral: 'Μητρώα Κηδειών',
      };
      return greekCardTitles[recordId as keyof typeof greekCardTitles] || recordTypes.find(r => r.id === recordId)?.title || '';
    } else if (activeLanguageTab === 2) {
      // Russian translations
      const russianCardTitles = {
        baptism: 'Крещальные записи',
        marriage: 'Брачные записи',
        funeral: 'Поминальные записи',
      };
      return russianCardTitles[recordId as keyof typeof russianCardTitles] || recordTypes.find(r => r.id === recordId)?.title || '';
    } else if (activeLanguageTab === 3) {
      // Romanian translations
      const romanianCardTitles = {
        baptism: 'Înregistrări de Botez',
        marriage: 'Înregistrări de Căsătorie',
        funeral: 'Înregistrări Funerare',
      };
      return romanianCardTitles[recordId as keyof typeof romanianCardTitles] || recordTypes.find(r => r.id === recordId)?.title || '';
    } else if (activeLanguageTab === 4) {
      // Georgian translations
      const georgianCardTitles = {
        baptism: 'ნათლობის ჩანაწერები',
        marriage: 'ქორწინების ჩანაწერები',
        funeral: 'გარდაცვალების ჩანაწერები',
      };
      return georgianCardTitles[recordId as keyof typeof georgianCardTitles] || recordTypes.find(r => r.id === recordId)?.title || '';
    } else {
      // English (default)
      return recordTypes.find(r => r.id === recordId)?.title || '';
    }
  };

  // Get "Select Record Type" text based on language
  const getSelectRecordTypeText = () => {
    if (activeLanguageTab === 1) {
      // Greek
      return 'Επιλέξτε Τύπο Εγγραφής';
    } else if (activeLanguageTab === 2) {
      // Russian
      return 'Выберите тип записи';
    } else if (activeLanguageTab === 3) {
      // Romanian
      return 'Selectați tipul înregistrării';
    } else if (activeLanguageTab === 4) {
      // Georgian
      return 'აირჩიეთ ჩანაწერის ტიპი';
    } else {
      // English (default)
      return 'Select Record Type';
    }
  };

  // Get section header text based on language and record type
  const getSectionHeaderText = () => {
    const languageNames = ['English', 'Greek', 'Russian', 'Romanian', 'Georgian'];
    const languageCodes = ['EN', 'GR', 'RU', 'RO', 'GE'];
    const currentLanguage = languageNames[activeLanguageTab];
    const currentLanguageCode = languageCodes[activeLanguageTab];

    if (selectedRecordType) {
      if (activeLanguageTab === 1) {
        // Greek translations
        const greekRecordTypeNames = {
          baptism: 'Εκκλησιαστικά Μητρώα – Μητρώα Βαπτίσεων',
          marriage: 'Εκκλησιαστικά Μητρώα – Μητρώα Γάμων',
          funeral: 'Εκκλησιαστικά Μητρώα – Μητρώα Κηδειών',
        };
        return greekRecordTypeNames[selectedRecordType as keyof typeof greekRecordTypeNames];
      } else if (activeLanguageTab === 2) {
        // Russian translations
        const russianRecordTypeNames = {
          baptism: 'Церковные записи – Крещальные записи',
          marriage: 'Церковные записи – Брачные записи',
          funeral: 'Церковные записи – Поминальные записи',
        };
        return russianRecordTypeNames[selectedRecordType as keyof typeof russianRecordTypeNames];
      } else if (activeLanguageTab === 3) {
        // Romanian translations
        const romanianRecordTypeNames = {
          baptism: 'Înregistrări Bisericești – Înregistrări de Botez',
          marriage: 'Înregistrări Bisericești – Înregistrări de Căsătorie',
          funeral: 'Înregistrări Bisericești – Înregistrări Funerare',
        };
        return romanianRecordTypeNames[selectedRecordType as keyof typeof romanianRecordTypeNames];
      } else if (activeLanguageTab === 4) {
        // Georgian translations
        const georgianRecordTypeNames = {
          baptism: 'საეკლესიო ჩანაწერები – ნათლობის ჩანაწერები',
          marriage: 'საეკლესიო ჩანაწერები – ქორწინების ჩანაწერები',
          funeral: 'საეკლესიო ჩანაწერები – გარდაცვალების ჩანაწერები',
        };
        return georgianRecordTypeNames[selectedRecordType as keyof typeof georgianRecordTypeNames];
      } else {
        // English
        const recordTypeNames = {
          baptism: 'Baptism Records',
          marriage: 'Marriage Records',
          funeral: 'Funeral Records',
        };
        return `Church Records - ${currentLanguageCode} - ${recordTypeNames[selectedRecordType as keyof typeof recordTypeNames]}`;
      }
    }
    // No record type selected
    if (activeLanguageTab === 1) {
      // Greek
      return 'Εκκλησιαστικά Μητρώα – Ελληνικά';
    } else if (activeLanguageTab === 2) {
      // Russian
      return 'Церковные записи – Русский';
    } else if (activeLanguageTab === 3) {
      // Romanian
      return 'Înregistrări Bisericești – Română';
    } else if (activeLanguageTab === 4) {
      // Georgian
      return 'საეკლესიო ჩანაწერები – ქართული';
    }
    return `Church Records - ${currentLanguage}`;
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      {/* Header Section */}
      <Header />

      {/* Left Side Popout Menu */}
      <LeftSideMenu
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onSubmenuItemClick={handleSubmenuItemClick}
      />

      {/* Spacing between Header and next section */}
      <Box sx={{ height: '60px' }} />

      {/* Section Header */}
      <Container maxWidth="lg" sx={{ pt: 0.5, pb: 2 }}>
        <SectionHeaderBox sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
            <SectionHeaderTitle component="h2">
              {getSectionHeaderText()}
            </SectionHeaderTitle>
            <IconButton
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              sx={{
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(255, 255, 255, 0.9)',
                },
                transition: 'transform 0.3s ease',
                transform: descriptionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                position: 'relative',
                zIndex: 3,
              }}
              aria-label={descriptionExpanded ? 'Collapse description' : 'Expand description'}
            >
              <IconChevronDown size={24} />
            </IconButton>
          </Box>
        </SectionHeaderBox>
        {descriptionExpanded && (
          <Box
            sx={{
              mt: -2,
              mb: 2,
              pt: 2,
              pb: 2,
              px: 3,
              backgroundColor: theme.palette.mode === 'dark' 
                ? theme.palette.background.paper 
                : '#faf8f4',
              borderRadius: '8px',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              animation: 'fadeIn 0.3s ease-in',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(-10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
                fontSize: { xs: '0.95rem', sm: '1rem', md: '1.05rem' },
                lineHeight: 1.6,
                opacity: 0.9,
              }}
            >
              See how parish records appear in English, Greek, Russian, Romanian, and Georgian. Each record type is carefully translated to preserve clarity and tradition.
            </Typography>
          </Box>
        )}
      </Container>


      {/* Language Selection Tabs */}
      <LanguageTabsContainer>
        <Container maxWidth="lg">
          <StyledTabs
            value={activeLanguageTab}
            onChange={handleLanguageTabChange}
            aria-label="language selection tabs"
          >
            {languageTabs.map((tab, index) => (
              <Tab key={tab.value} label={tab.label} />
            ))}
          </StyledTabs>
        </Container>
      </LanguageTabsContainer>

      {/* Show Record Type Selection or Table */}
      {!selectedRecordType ? (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography
            variant="h5"
                    sx={{
              mb: 4,
              fontWeight: 600,
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a237e',
            }}
          >
            {getSelectRecordTypeText()}
          </Typography>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            sx={{ justifyContent: 'center' }}
          >
            {recordTypes.map((record) => {
              // Use language-specific images based on active language tab
              const getImage = () => {
                if (activeLanguageTab === 0) {
                  // English
                  if (record.id === 'baptism') return 'url(/images/main/baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/funeral.png)';
                } else if (activeLanguageTab === 1) {
                  // Greek
                  if (record.id === 'baptism') return 'url(/images/main/gr_baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/gr_marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/gr_funeral.png)';
                } else if (activeLanguageTab === 2) {
                  // Russian
                  if (record.id === 'baptism') return 'url(/images/main/ru_baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/ru_marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/ru_funeral.png)';
                } else if (activeLanguageTab === 3) {
                  // Romanian
                  if (record.id === 'baptism') return 'url(/images/main/RO-baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/RO-marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/RO-funeral.png)';
                } else if (activeLanguageTab === 4) {
                  // Georgian
                  if (record.id === 'baptism') return 'url(/images/main/GE-baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/GE-marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/GE-funeral.png)';
                }
                return record.leftImage;
              };

              return (
                <RecordTypeCard
                  key={record.id}
                  sx={{ flex: 1, maxWidth: { md: '400px' } }}
                  onClick={() => handleRecordTypeClick(record.id)}
                >
                  <SingleImageContainer
                    sx={{
                      backgroundImage: getImage(),
                    }}
                  />
                  <CardTitle>{getCardTitle(record.id)}</CardTitle>
                </RecordTypeCard>
              );
            })}
          </Stack>
        </Container>
      ) : (selectedRecordType === 'baptism' || selectedRecordType === 'marriage' || selectedRecordType === 'funeral') && (activeLanguageTab === 0 || activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? (
        <Container maxWidth="lg" sx={{ py: 2 }}>
          {/* Back to Home Link */}
          <Link
            component="button"
            variant="body2"
            onClick={handleBackToHome}
                    sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              color: theme.palette.mode === 'dark' 
                ? theme.palette.text.primary 
                : '#1976d2',
              textDecoration: 'none',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            <IconArrowLeft size={18} />
            {activeLanguageTab === 1 
              ? 'Επιστροφή' 
              : activeLanguageTab === 2 
              ? 'Назад' 
              : activeLanguageTab === 3
              ? 'Înapoi'
              : activeLanguageTab === 4
              ? 'უკან'
              : 'Back to Home'}
          </Link>

          {/* Page Title with Navigation Arrows */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a237e',
                flexGrow: 1,
              }}
            >
              {activeLanguageTab === 1 
                ? (selectedRecordType === 'baptism' 
                    ? 'Αρχεία Βάπτισης - Ελληνικά' 
                    : selectedRecordType === 'marriage' 
                    ? 'Αρχεία Γάμου - Ελληνικά' 
                    : 'Αρχεία Κηδείας - Ελληνικά')
                : activeLanguageTab === 2
                ? (selectedRecordType === 'baptism' 
                    ? 'Записи о Крещении - Русский' 
                    : selectedRecordType === 'marriage' 
                    ? 'Записи о Браке - Русский' 
                    : 'Записи о Похоронах - Русский')
                : activeLanguageTab === 3
                ? (selectedRecordType === 'baptism' 
                    ? 'Înregistrări Botez - Română' 
                    : selectedRecordType === 'marriage' 
                    ? 'Înregistrări Căsătorie - Română' 
                    : 'Înregistrări Înmormântare - Română')
                : activeLanguageTab === 4
                ? (selectedRecordType === 'baptism' 
                    ? 'ნათლობის ჩანაწერები - ქართული' 
                    : selectedRecordType === 'marriage' 
                    ? 'ქორწინების ჩანაწერები - ქართული' 
                    : 'გარდაცვალების ჩანაწერები - ქართული')
                : (selectedRecordType === 'baptism' 
                    ? 'Baptism Records - English' 
                    : selectedRecordType === 'marriage' 
                    ? 'Marriage Records - English' 
                    : 'Funeral Records - English')}
            </Typography>
            
            {/* Navigation Arrows */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <IconButton
                onClick={handlePreviousRecordType}
                disabled={selectedRecordType === 'baptism'}
                sx={{
                  padding: '4px',
                  color: selectedRecordType === 'baptism' 
                    ? theme.palette.text.disabled 
                    : (theme.palette.mode === 'dark' 
                      ? theme.palette.text.primary 
                      : '#1976d2'),
                  '&:hover': {
                    backgroundColor: selectedRecordType === 'baptism' 
                      ? 'transparent' 
                      : theme.palette.action.hover,
                  },
                  '&:disabled': {
                    color: theme.palette.text.disabled,
                  },
                }}
                aria-label="Previous record type"
              >
                <IconChevronUp size={24} />
              </IconButton>
              <IconButton
                onClick={handleNextRecordType}
                disabled={selectedRecordType === 'funeral'}
                sx={{
                  padding: '4px',
                  color: selectedRecordType === 'funeral' 
                    ? theme.palette.text.disabled 
                    : (theme.palette.mode === 'dark' 
                      ? theme.palette.text.primary 
                      : '#1976d2'),
                  '&:hover': {
                    backgroundColor: selectedRecordType === 'funeral' 
                      ? 'transparent' 
                      : theme.palette.action.hover,
                  },
                  '&:disabled': {
                    color: theme.palette.text.disabled,
                  },
                }}
                aria-label="Next record type"
              >
                <IconChevronDown size={24} />
              </IconButton>
            </Box>
          </Box>

          {/* Action Buttons - Switch to AG, Field Settings, Add Record(s) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<GridViewIcon />}
                  sx={{
                    bgcolor: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'transparent' : '#4C1D95',
                    color: 'white',
                    textTransform: 'none',
                    backgroundImage: activeLanguageTab === 1 
                      ? 'url(/images/buttons/GR-light-blue.png)' 
                      : activeLanguageTab === 2 
                      ? 'url(/images/buttons/RU-buttons-1.png)' 
                      : activeLanguageTab === 3
                      ? 'url(/images/buttons/RO-button-1.png)'
                      : activeLanguageTab === 4
                      ? 'url(/images/buttons/GE-buttons-1.png)'
                      : 'none',
                    backgroundSize: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'cover' : 'auto',
                    backgroundPosition: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'center' : 'auto',
                    backgroundRepeat: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'no-repeat' : 'repeat',
                    '&:hover': { 
                      bgcolor: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'transparent' : '#5B2A9E',
                      opacity: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 0.9 : 1
                    }
                  }}
                >
                  {activeLanguageTab === 1 
                    ? 'Μετάβαση στο AG' 
                    : activeLanguageTab === 2 
                    ? 'Переключиться на AG' 
                    : activeLanguageTab === 3
                    ? 'Comutare la AG'
                    : activeLanguageTab === 4
                    ? 'AG-ზე გადართვა'
                    : 'Switch to AG'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<IconSettings size={18} />}
                  sx={{
                    bgcolor: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'transparent' : '#4C1D95',
                    color: 'white',
                    textTransform: 'none',
                    backgroundImage: activeLanguageTab === 1 
                      ? 'url(/images/buttons/GR-light-blue.png)' 
                      : activeLanguageTab === 2 
                      ? 'url(/images/buttons/RU-buttons-1.png)' 
                      : activeLanguageTab === 3
                      ? 'url(/images/buttons/RO-button-1.png)'
                      : activeLanguageTab === 4
                      ? 'url(/images/buttons/GE-buttons-1.png)'
                      : 'none',
                    backgroundSize: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'cover' : 'auto',
                    backgroundPosition: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'center' : 'auto',
                    backgroundRepeat: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'no-repeat' : 'repeat',
                    '&:hover': { 
                      bgcolor: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'transparent' : '#5B2A9E',
                      opacity: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 0.9 : 1
                    }
                  }}
                >
                  {activeLanguageTab === 1 
                    ? 'Ρυθμίσεις Πεδίων' 
                    : activeLanguageTab === 2 
                    ? 'Настройки полей' 
                    : activeLanguageTab === 3
                    ? 'Setări câmpuri'
                    : activeLanguageTab === 4
                    ? 'ველების პარამეტრები'
                    : 'Field Settings'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<IconPlus size={18} />}
                  sx={{
                    bgcolor: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'transparent' : '#4C1D95',
                    color: 'white',
                    textTransform: 'none',
                    backgroundImage: activeLanguageTab === 1 
                      ? 'url(/images/buttons/GR-light-blue.png)' 
                      : activeLanguageTab === 2 
                      ? 'url(/images/buttons/RU-buttons-1.png)' 
                      : activeLanguageTab === 3
                      ? 'url(/images/buttons/RO-button-1.png)'
                      : activeLanguageTab === 4
                      ? 'url(/images/buttons/GE-buttons-1.png)'
                      : 'none',
                    backgroundSize: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'cover' : 'auto',
                    backgroundPosition: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'center' : 'auto',
                    backgroundRepeat: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'no-repeat' : 'repeat',
                    '&:hover': { 
                      bgcolor: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 'transparent' : '#5B2A9E',
                      opacity: (activeLanguageTab === 1 || activeLanguageTab === 2 || activeLanguageTab === 3 || activeLanguageTab === 4) ? 0.9 : 1
                    }
                  }}
                >
                  {activeLanguageTab === 1 
                    ? (selectedRecordType === 'baptism' 
                        ? 'Προσθήκη Πράξης Βαπτίσεως'
                        : selectedRecordType === 'marriage'
                        ? 'Προσθήκη Πράξης Γάμου'
                        : selectedRecordType === 'funeral'
                        ? 'Προσθήκη Πράξης Κηδείας'
                        : 'Add Record(s)')
                    : activeLanguageTab === 2
                    ? 'Add Record(s)'
                    : activeLanguageTab === 3
                    ? 'Salvare și adăugare altă înregistrare'
                    : activeLanguageTab === 4
                    ? 'შენახვა და კიდევ ერთის დამატება'
                    : 'Add Record(s)'}
                </Button>
              </Box>

          {/* Search Bar and Action Buttons - Right Above Table */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', mb: 2 }}>
            {/* Search Bar */}
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-start', minWidth: '200px' }}>
              <TextField
                placeholder={
                  activeLanguageTab === 1 
                    ? "Αναζήτηση αρχείων..." 
                    : activeLanguageTab === 2 
                    ? "Поиск записей..." 
                    : activeLanguageTab === 3
                    ? "Căutare înregistrări..."
                    : activeLanguageTab === 4
                    ? "ჩანაწერების ძიება..."
                    : "Search records..."
                }
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                  flexGrow: 1,
                  maxWidth: '400px',
                  backgroundColor: theme.palette.background.paper,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: theme.palette.mode === 'dark' 
                        ? theme.palette.divider 
                        : '#90caf9',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch 
                        size={20} 
                        color={theme.palette.mode === 'dark' 
                          ? theme.palette.text.primary 
                          : '#1976d2'} 
                      />
                    </InputAdornment>
                  ),
                }}
              />
              </Box>

            {/* Action Buttons on Right */}
            <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150, backgroundColor: theme.palette.background.paper }}>
                      <Select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  displayEmpty
                  renderValue={(value) => {
                    if (value === 'all') {
                      return activeLanguageTab === 1 
                        ? "Όλα τα Αρχεία" 
                        : activeLanguageTab === 2 
                        ? "Все Записи" 
                        : activeLanguageTab === 3
                        ? "Toate Înregistrările"
                        : activeLanguageTab === 4
                        ? "ყველა ჩანაწერი"
                        : "All Records";
                    }
                    return value === 'baptism' 
                      ? (activeLanguageTab === 1 
                          ? "Βάπτιση" 
                          : activeLanguageTab === 2 
                          ? "Крещение" 
                          : activeLanguageTab === 3
                          ? "Botez"
                          : activeLanguageTab === 4
                          ? "ნათლობა"
                          : "Baptism")
                      : value === 'marriage'
                      ? (activeLanguageTab === 1 
                          ? "Γάμος" 
                          : activeLanguageTab === 2 
                          ? "Брак" 
                          : activeLanguageTab === 3
                          ? "Căsătorie"
                          : activeLanguageTab === 4
                          ? "ქორწინება"
                          : "Marriage")
                      : (activeLanguageTab === 1 
                          ? "Κηδεία" 
                          : activeLanguageTab === 2 
                          ? "Похороны" 
                          : activeLanguageTab === 3
                          ? "Înmormântare"
                          : activeLanguageTab === 4
                          ? "გარდაცვალება"
                          : "Funeral");
                  }}
                >
                  <MenuItem value="all">
                    {activeLanguageTab === 1 
                      ? "Όλα τα Αρχεία" 
                      : activeLanguageTab === 2 
                      ? "Все Записи" 
                      : activeLanguageTab === 3
                      ? "Toate Înregistrările"
                      : activeLanguageTab === 4
                      ? "ყველა ჩანაწერი"
                      : "All Records"}
                  </MenuItem>
                  <MenuItem value="baptism">
                    {activeLanguageTab === 1 
                      ? "Βάπτιση" 
                      : activeLanguageTab === 2 
                      ? "Крещение" 
                      : activeLanguageTab === 3
                      ? "Botez"
                      : activeLanguageTab === 4
                      ? "ნათლობა"
                      : "Baptism"}
                  </MenuItem>
                  <MenuItem value="marriage">
                    {activeLanguageTab === 1 
                      ? "Γάμος" 
                      : activeLanguageTab === 2 
                      ? "Брак" 
                      : activeLanguageTab === 3
                      ? "Căsătorie"
                      : activeLanguageTab === 4
                      ? "ქორწინება"
                      : "Marriage"}
                  </MenuItem>
                  <MenuItem value="funeral">
                    {activeLanguageTab === 1 
                      ? "Κηδεία" 
                      : activeLanguageTab === 2 
                      ? "Похороны" 
                      : activeLanguageTab === 3
                      ? "Înmormântare"
                      : activeLanguageTab === 4
                      ? "გარდაცვალება"
                      : "Funeral"}
                  </MenuItem>
                      </Select>
                    </FormControl>
              <Button
                variant="outlined"
                startIcon={<IconDownload size={18} />}
                sx={{
                  borderColor: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#1976d2',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#1976d2',
                  textTransform: 'none',
                }}
              >
                {activeLanguageTab === 1 
                  ? "Εξαγωγή" 
                  : activeLanguageTab === 2 
                  ? "Экспорт" 
                  : activeLanguageTab === 3
                  ? "Export"
                  : activeLanguageTab === 4
                  ? "ექსპორტი"
                  : "Export"}
                    </Button>
              <Button
                variant="outlined"
                startIcon={<IconEye size={18} />}
                onClick={() => setColumnsDialogOpen(true)}
                sx={{
                  borderColor: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#1976d2',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#1976d2',
                  textTransform: 'none',
                }}
              >
                {activeLanguageTab === 1 
                  ? "Στήλες" 
                  : activeLanguageTab === 2 
                  ? "Столбцы" 
                  : activeLanguageTab === 3
                  ? "Coloane"
                  : activeLanguageTab === 4
                  ? "სვეტები"
                  : "Columns"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconRefresh size={18} />}
                onClick={() => {
                  setSearchTerm('');
                  setRecordType('all');
                }}
                sx={{
                  borderColor: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#1976d2',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#1976d2',
                  textTransform: 'none',
                }}
              >
                {activeLanguageTab === 1 
                  ? "Επαναφορά Φίλτρων" 
                  : activeLanguageTab === 2 
                  ? "Сбросить Фильтры" 
                  : activeLanguageTab === 3
                  ? "Resetează Filtrele"
                  : activeLanguageTab === 4
                  ? "ფილტრების გადატვირთვა"
                  : "Reset Filters"}
              </Button>
            </Box>
          </Box>

          {/* Data Table */}
          {/* AG Grid Table */}
          <Paper
            sx={{
              height: 600,
              width: '100%',
              overflow: 'hidden',
              backgroundColor: themeTokens.rowEvenBg,
              '& .ag-theme-alpine': {
                '& .ag-header': {
                  backgroundColor: themeTokens.headerBg,
                  borderBottom: `1px solid ${themeTokens.border}`,
                },
                '& .ag-header-cell': {
                  backgroundColor: themeTokens.headerBg,
                  color: themeTokens.headerText,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                },
                '& .ag-header-cell-text': {
                  color: themeTokens.headerText,
                },
                '& .ag-icon': {
                  color: themeTokens.headerText,
                },
                '& .ag-row': {
                  borderBottom: `1px solid ${themeTokens.border}`,
                  color: themeTokens.cellText,
                },
                '& .ag-row-odd': {
                  backgroundColor: themeTokens.rowOddBg,
                },
                '& .ag-row-even': {
                  backgroundColor: themeTokens.rowEvenBg,
                },
                '& .ag-row:hover': {
                  backgroundColor: `${themeTokens.accent}22`,
                },
                '& .ag-cell': {
                  color: themeTokens.cellText,
                },
                '& .ag-paging-panel': {
                  backgroundColor: themeTokens.rowEvenBg,
                  borderTop: `1px solid ${themeTokens.border}`,
                  padding: '8px',
                  color: themeTokens.cellText,
                },
                '& .ag-paging-button': {
                  color: themeTokens.accent,
                },
                '& .ag-root-wrapper': {
                  border: `1px solid ${themeTokens.border}`,
                },
              },
            }}
          >
            <div
              className="ag-theme-alpine"
              style={{
                height: '100%',
                width: '100%',
              }}
            >
              <AgGridReact
                key={`${selectedRecordType}-${activeLanguageTab}`}
                rowData={filterRecords(
                  selectedRecordType === 'baptism' 
                    ? (activeLanguageTab === 1 
                        ? greekBaptismRecords 
                        : activeLanguageTab === 2 
                        ? russianBaptismRecords 
                        : activeLanguageTab === 3
                        ? romanianBaptismRecords
                        : activeLanguageTab === 4
                        ? georgianBaptismRecords
                        : baptismRecords)
                    : selectedRecordType === 'marriage' 
                    ? (activeLanguageTab === 1 
                        ? greekMarriageRecords 
                        : activeLanguageTab === 2 
                        ? russianMarriageRecords 
                        : activeLanguageTab === 3
                        ? romanianMarriageRecords
                        : activeLanguageTab === 4
                        ? georgianMarriageRecords
                        : marriageRecords)
                    : (activeLanguageTab === 1 
                        ? greekFuneralRecords 
                        : activeLanguageTab === 2 
                        ? russianFuneralRecords 
                        : activeLanguageTab === 3
                        ? romanianFuneralRecords
                        : activeLanguageTab === 4
                        ? georgianFuneralRecords
                        : funeralRecords),
                  searchTerm
                )}
                columnDefs={
                  selectedRecordType === 'baptism' 
                    ? (activeLanguageTab === 1 
                        ? greekBaptismColumnDefs 
                        : activeLanguageTab === 2 
                        ? russianBaptismColumnDefs 
                        : activeLanguageTab === 3
                        ? romanianBaptismColumnDefs
                        : activeLanguageTab === 4
                        ? georgianBaptismColumnDefs
                        : baptismColumnDefs)
                    : selectedRecordType === 'marriage' 
                    ? (activeLanguageTab === 1 
                        ? greekMarriageColumnDefs 
                        : activeLanguageTab === 2 
                        ? russianMarriageColumnDefs 
                        : activeLanguageTab === 3
                        ? romanianMarriageColumnDefs
                        : activeLanguageTab === 4
                        ? georgianMarriageColumnDefs
                        : marriageColumnDefs)
                    : (activeLanguageTab === 1 
                        ? greekFuneralColumnDefs 
                        : activeLanguageTab === 2 
                        ? russianFuneralColumnDefs 
                        : activeLanguageTab === 3
                        ? romanianFuneralColumnDefs
                        : activeLanguageTab === 4
                        ? georgianFuneralColumnDefs
                        : funeralColumnDefs)
                }
                onGridReady={handleGridReady}
                pagination={true}
                paginationPageSize={selectedRecordType === 'marriage' ? 50 : 20}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                rowSelection="multiple"
                suppressRowClickSelection={true}
                animateRows={true}
                enableCellTextSelection={true}
                defaultColDef={{
                  resizable: true,
                  sortable: true,
                  filter: true,
                  menuTabs: ['filterMenuTab', 'generalMenuTab'],
                }}
                domLayout="normal"
                suppressMenuHide={true}
              />
            </div>
          </Paper>
        </Container>
      ) : (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography
            variant="h5"
            sx={{
              mb: 4,
              fontWeight: 600,
              color: '#1a237e',
            }}>
            {getSelectRecordTypeText()}
                    </Typography>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            sx={{ justifyContent: 'center' }}
          >
            {recordTypes.map((record) => {
              // Use language-specific images based on active language tab
              const getImage = () => {
                if (activeLanguageTab === 0) {
                  // English
                  if (record.id === 'baptism') return 'url(/images/main/baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/funeral.png)';
                } else if (activeLanguageTab === 1) {
                  // Greek
                  if (record.id === 'baptism') return 'url(/images/main/gr_baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/gr_marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/gr_funeral.png)';
                } else if (activeLanguageTab === 2) {
                  // Russian
                  if (record.id === 'baptism') return 'url(/images/main/ru_baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/ru_marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/ru_funeral.png)';
                } else if (activeLanguageTab === 3) {
                  // Romanian
                  if (record.id === 'baptism') return 'url(/images/main/RO-baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/RO-marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/RO-funeral.png)';
                } else if (activeLanguageTab === 4) {
                  // Georgian
                  if (record.id === 'baptism') return 'url(/images/main/GE-baptism.png)';
                  if (record.id === 'marriage') return 'url(/images/main/GE-marriage.png)';
                  if (record.id === 'funeral') return 'url(/images/main/GE-funeral.png)';
                }
                return record.leftImage;
              };

              const getCardTitle = (recordId: string) => {
                if (activeLanguageTab === 1) {
                  // Greek
                  if (recordId === 'baptism') return 'Αρχεία Βάπτισης';
                  if (recordId === 'marriage') return 'Αρχεία Γάμου';
                  if (recordId === 'funeral') return 'Αρχεία Κηδείας';
                } else if (activeLanguageTab === 2) {
                  // Russian
                  if (recordId === 'baptism') return 'Записи о Крещении';
                  if (recordId === 'marriage') return 'Записи о Браке';
                  if (recordId === 'funeral') return 'Записи о Похоронах';
                } else if (activeLanguageTab === 3) {
                  // Romanian
                  if (recordId === 'baptism') return 'Înregistrări Botez';
                  if (recordId === 'marriage') return 'Înregistrări Căsătorie';
                  if (recordId === 'funeral') return 'Înregistrări Înmormântare';
                } else if (activeLanguageTab === 4) {
                  // Georgian
                  if (recordId === 'baptism') return 'ნათლობის ჩანაწერები';
                  if (recordId === 'marriage') return 'ქორწინების ჩანაწერები';
                  if (recordId === 'funeral') return 'გარდაცვალების ჩანაწერები';
                }
                // English (default)
                if (recordId === 'baptism') return 'Baptism Records';
                if (recordId === 'marriage') return 'Marriage Records';
                if (recordId === 'funeral') return 'Funeral Records';
                return record.title;
              };

              return (
                <RecordTypeCard
                  key={record.id}
                  sx={{ flex: 1, maxWidth: { md: '400px' } }}
                  onClick={() => handleRecordTypeClick(record.id)}
                >
                  <SingleImageContainer
                    sx={{
                      backgroundImage: getImage(),
                    }}
                  />
                  <CardTitle>{getCardTitle(record.id)}</CardTitle>
                </RecordTypeCard>
              );
            })}
          </Stack>
        </Container>
      )}

      {/* Footer Section */}
      <Footer />
    </Box>
  );
};

export default Samples;
