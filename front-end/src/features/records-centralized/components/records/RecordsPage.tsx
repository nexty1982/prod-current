import { registerAgGridModulesOnce } from '@/agGridModules';
import AGGridErrorBoundary from '@/shared/ui/AGGridErrorBoundary';
import AdvancedGridDialog from '@/components/AdvancedGridDialog';
import { recordsEvents, useRecordsEvents } from '@/events/recordsEvents';
import { useChurchRecordsLanding } from '@/hooks/useChurchRecordsLanding';
import ChurchRecordsHeader from './ChurchRecordsHeader';
import RecordsAnalyticsView from './RecordsAnalyticsView';
import RecordsCardView from './RecordsCardView';
import RecordsTimelineView from './RecordsTimelineView';
import ModernRecordViewerModal from '@/features/records-centralized/common/ModernRecordViewerModal';
import { getAgGridRowClassRules, isRecordNewWithin24Hours, isRecordUpdatedWithin24Hours, useNowReference } from '@/features/records-centralized/common/recordsHighlighting';
import '@/features/records-centralized/common/recordsHighlighting.css';
import { usePersistedRowSelection } from '@/features/records-centralized/common/usePersistedRowSelection';
import { createRecordsApiService } from '@/features/records-centralized/components/records/RecordsApiService';
import { getPersistedChurchId, getPersistedLastView, useRecordsPersistence } from '@/hooks/useRecordsPersistence';
import churchService, { Church } from '@/shared/lib/churchService';
import LookupService from '@/shared/lib/lookupService';
import { Eye, FileText, Pencil, Search, Trash2 } from '@/shared/ui/icons';
import { ChurchRecord } from '@/types/church-records-advanced.types';
import { agGridIconMap } from '@/ui/agGridIcons';
import { apiClient } from '@/api/utils/axiosInstance';
import { formatRecordDate } from '@/utils/formatDate';
import CollaborationWizardDialog from '@/features/records-centralized/components/collaborationLinks/CollaborationWizardDialog';
import EditRecordDialog from './RecordsPage/EditRecordDialog';
import DeleteConfirmDialog from './RecordsPage/DeleteConfirmDialog';
import RecordsControlsCard from './RecordsPage/RecordsControlsCard';
import StandardRecordsTable from './RecordsPage/StandardRecordsTable';
import { BaptismRecord, SortConfig, RecordsPageProps } from './RecordsPage/types';
import { useRecordsAutocomplete } from './RecordsPage/useRecordsAutocomplete';
import RecordEditForm from './RecordsPage/RecordEditForm';
import { parseJsonField, displayJsonField, highlightMatch, getCellValue, getColumnDefinitions, getSortFields, RECORD_TYPE_CONFIGS, DEFAULT_DATE_SORT_FIELD } from './RecordsPage/utils';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Snackbar,
    Stack,
    TablePagination,
    Tooltip,
    Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ColDef, ICellRendererParams, themeQuartz } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RecordSection from '../../common/RecordSection';
import { useLanguage } from '@/context/LanguageContext';

registerAgGridModulesOnce();

// Multi-token search highlight (splits on spaces for multi-word search)
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

const RecordsPage: React.FC<RecordsPageProps> = ({ defaultRecordType = 'baptism' }) => {
  const { t } = useLanguage();
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
    // Priority: URL param → prop default → localStorage last view
    const typeFromUrl = searchParams.get('type');
    if (typeFromUrl && validRecordTypes.includes(typeFromUrl)) return typeFromUrl;
    if (defaultRecordType && validRecordTypes.includes(defaultRecordType)) return defaultRecordType;
    const lastView = getPersistedLastView();
    if (lastView?.recordType && validRecordTypes.includes(lastView.recordType)) return lastView.recordType;
    return 'baptism';
  });
  
  // Enable persistence for church selection and last view
  useRecordsPersistence(
    selectedChurch,
    selectedRecordType,
    setSelectedChurch,
    setSelectedRecordType
  );
  
  // Church records landing branding
  const { branding: landingBranding, churchName: landingChurchName, isDefault: landingIsDefault, loading: landingLoading } =
    useChurchRecordsLanding(selectedChurch || null);

  // Sync activeView to the church's default_view when branding loads
  const brandingDefaultViewApplied = useRef<number | null>(null);
  useEffect(() => {
    if (landingBranding?.default_view && brandingDefaultViewApplied.current !== selectedChurch) {
      const dv = landingBranding.default_view;
      if (['table', 'card', 'timeline', 'analytics'].includes(dv)) {
        setActiveView(dv as ViewMode);
        brandingDefaultViewApplied.current = selectedChurch;
      }
    }
  }, [landingBranding?.default_view, selectedChurch]);

  // Analytics highlights for header (fetched only when branding says to show them)
  const [headerHighlights, setHeaderHighlights] = useState<{ baptisms: number; marriages: number; funerals: number; total: number; changePercent?: number } | null>(null);
  useEffect(() => {
    if (!landingBranding?.show_analytics_highlights || !selectedChurch) {
      setHeaderHighlights(null);
      return;
    }
    let cancelled = false;
    apiClient.get(`/churches/${selectedChurch}/dashboard`).then((res: any) => {
      if (cancelled) return;
      const d = res.data || res;
      if (d?.counts) {
        setHeaderHighlights({
          baptisms: d.counts.baptisms,
          marriages: d.counts.marriages,
          funerals: d.counts.funerals,
          total: d.counts.total,
          changePercent: d.yearOverYear?.changePercent,
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [landingBranding?.show_analytics_highlights, selectedChurch]);

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
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: DEFAULT_DATE_SORT_FIELD[defaultRecordType] || 'id', direction: 'desc' });
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BaptismRecord | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; churchId?: number; name: string } | null>(null);
  const [priestOptions, setPriestOptions] = useState<string[]>([]);

  // Autocomplete hook — frequency-based suggestions for text fields
  const {
    acLoading,
    fetchAutocompleteSuggestions,
    getAcOptions,
    getAcSuggestionsWithCount,
  } = useRecordsAutocomplete({ selectedRecordType, selectedChurch });

  // Theme Editor States
  
  // Table View Mode State
  const [useAgGrid, setUseAgGrid] = useState(true);
  const [agGridFailed, setAgGridFailed] = useState(false);

  // View mode: table | card | timeline | analytics
  // Values match DB enum in church_records_landing.default_view
  type ViewMode = 'table' | 'card' | 'timeline' | 'analytics';
  const [activeView, setActiveView] = useState<ViewMode>('table');
  // Backwards-compat alias
  const showAnalytics = activeView === 'analytics';
  
  // Advanced Grid Modal State
  const [advancedGridOpen, setAdvancedGridOpen] = useState(false);

  // View Details Dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [viewingRecord, setViewingRecord] = useState<BaptismRecord | null>(null);
  const [viewingRecordIndex, setViewingRecordIndex] = useState<number>(-1);
  const [viewEditMode, setViewEditMode] = useState<'view' | 'edit'>('view');

  // When modal switches to edit mode, populate form data from the viewing record
  const handleViewEditModeChange = useCallback((mode: 'view' | 'edit') => {
    setViewEditMode(mode);
    if (mode === 'edit' && viewingRecord) {
      setEditingRecord(viewingRecord);
      setFormData(viewingRecord);
    }
  }, [viewingRecord]);

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
      
      const churchData = await churchService.fetchChurches({ includeRecordCounts: true });
      
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
      
      const selectedType = RECORD_TYPE_CONFIGS.find(type => type.value === recordType);
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
        showToast(`Found ${total} match${total !== 1 ? 'es' : ''} for "${search}" in ${t(selectedType.labelKey)}`, 'success');
      } else {
        const displayCount = Math.min(requestLimit, total);
        showToast(`Displaying ${displayCount} of ${total} ${t(selectedType.labelKey).toLowerCase()}`, 'success');
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

  // Effective church ID — resolves 0 to the single real church when only 1 exists
  const effectiveChurchId = useMemo(() => {
    if (selectedChurch && selectedChurch !== 0) return selectedChurch;
    const realChurches = churches.filter(c => c.id !== 0);
    return realChurches.length === 1 ? realChurches[0].id : 0;
  }, [selectedChurch, churches]);

  // Effects
  useEffect(() => {
    fetchChurches();
    // Note: Removed auto-fetch of records to improve initial page load performance
    // Records will be fetched when user explicitly selects a record type
  }, []);

  useEffect(() => {
    if (selectedRecordType) {
      setPage(0); // Reset to first page on type/church change
      const dateSortKey = DEFAULT_DATE_SORT_FIELD[selectedRecordType] || 'id';
      setSortConfig({ key: dateSortKey, direction: 'desc' });
      fetchRecords(selectedRecordType, selectedChurch, undefined, 0, rowsPerPage, dateSortKey, 'desc');
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
            { key: 'registryNumber', label: t('records.label_registry_number'), value: originalRecord.registryNumber || '', type: 'text' as const, editable: false },
          ];

          if (selectedRecordType === 'marriage') {
            // For marriage records, combine groom and bride names
            const groomName = `${originalRecord.fname_groom || ''} ${originalRecord.lname_groom || ''}`.trim();
            const brideName = `${originalRecord.fname_bride || ''} ${originalRecord.lname_bride || ''}`.trim();

            fields.push(
              { key: 'groom', label: t('records.section_groom').replace(' Information', ''), value: groomName, type: 'text' as const, editable: false },
              { key: 'bride', label: t('records.section_bride').replace(' Information', ''), value: brideName, type: 'text' as const, editable: false },
              { key: 'mdate', label: t('common.date'), value: originalRecord.mdate || '', type: 'text' as const, editable: false },
              { key: 'churchName', label: t('records.label_church'), value: originalRecord.churchName || '', type: 'text' as const, editable: false },
              { key: 'clergy', label: t('records.label_priest_select'), value: originalRecord.clergy || '', type: 'text' as const, editable: false }
            );
          } else {
            // For baptism and funeral records
            fields.push(
              { key: 'firstName', label: t('common.first_name'), value: originalRecord.firstName || '', type: 'text' as const, editable: false },
              { key: 'lastName', label: t('common.last_name'), value: originalRecord.lastName || '', type: 'text' as const, editable: false },
              { key: 'dateOfBaptism', label: t('common.date'), value: originalRecord.dateOfBaptism || '', type: 'text' as const, editable: false },
              { key: 'churchName', label: t('records.label_church'), value: originalRecord.churchName || '', type: 'text' as const, editable: false },
              { key: 'priest', label: t('records.label_priest_select'), value: originalRecord.priest || '', type: 'text' as const, editable: false }
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
        <Chip label={t('records.chip_new')} size="small" color="success" variant="filled"
          sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }} />
      );
    }
    if (isUpdated) {
      return (
        <Chip label={t('records.chip_updated')} size="small" color="warning" variant="filled"
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
        <Tooltip title={t('records.tooltip_view')}>
          <IconButton size="small" onClick={() => handleViewRecord(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}>
            <Eye size={16} strokeWidth={1.5} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('records.tooltip_edit')}>
          <IconButton size="small" onClick={() => handleEditRecord(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'text.primary' } }}>
            <Pencil size={16} strokeWidth={1.5} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('records.tooltip_delete')}>
          <IconButton size="small" onClick={() => handleDeleteClick(record)} sx={{ opacity: 0.7, color: 'text.secondary', '&:hover': { opacity: 1, color: 'error.main' } }}>
            <Trash2 size={16} strokeWidth={1.5} />
          </IconButton>
        </Tooltip>
        {(selectedRecordType === 'baptism' || selectedRecordType === 'marriage') && (
          <Tooltip title={t('records.tooltip_certificate')}>
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
      <RecordEditForm
        selectedRecordType={selectedRecordType}
        formData={formData}
        setFormData={setFormData}
        priestOptions={priestOptions}
        churches={churches}
        selectedChurch={selectedChurch}
        acLoading={acLoading}
        fetchAutocompleteSuggestions={fetchAutocompleteSuggestions}
        getAcOptions={getAcOptions}
        getAcSuggestionsWithCount={getAcSuggestionsWithCount}
      />
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
          {/* Church-branded Header */}
          <ChurchRecordsHeader
            branding={landingBranding}
            churchName={landingChurchName}
            isDefault={landingIsDefault}
            loading={landingLoading}
            highlights={headerHighlights}
          />

          {/* Controls Section */}
          <RecordsControlsCard
            churches={churches}
            selectedChurch={selectedChurch}
            setSelectedChurch={setSelectedChurch}
            selectedRecordType={selectedRecordType}
            onRecordTypeChange={handleRecordTypeChange}
            activeView={activeView}
            setActiveView={setActiveView}
            loading={loading}
            searchLoading={searchLoading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchDebounceRef={searchDebounceRef}
            setDebouncedSearch={setDebouncedSearch}
            isFiltersCollapsed={isFiltersCollapsed}
            setIsFiltersCollapsed={setIsFiltersCollapsed}
            useAgGrid={useAgGrid}
            setUseAgGrid={setUseAgGrid}
            agGridFailed={agGridFailed}
            onAddRecord={handleAddRecord}
            onExport={handleExport}
            onGenerateReport={handleGenerateReport}
            onCollaborativeReport={handleCollaborativeReport}
            onAdvancedGrid={() => setAdvancedGridOpen(true)}
          />
                
          {/* Status Information */}
          {selectedRecordType && !loading && totalRecords > 0 && (
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {`${records.length} of ${totalRecords.toLocaleString()} records`}
                {debouncedSearch && ` matching "${debouncedSearch}"`}
              </Typography>
            </Box>
          )}
          
          {/* Instructions when no selection */}
          {!selectedRecordType && (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                {t('records.welcome_title')}
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 400, mx: 'auto', lineHeight: 1.6 }}>
                {t('records.welcome_desc')}
              </Typography>
            </Box>
          )}

          {/* Records Table - Only show when record type is selected */}
            {selectedRecordType && (
              <>
                <Box sx={{ mb: 1, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  {debouncedSearch && (
                    <Chip
                      size="small"
                      label={`${t('records.best_matches')}${showBestMatches ? ' ✓' : ''}`}
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
                      {t('records.clear_selection')}
                    </Button>
                  )}
                </Box>
                
                {/* Card View */}
                {activeView === 'card' && (
                  <Box sx={{ py: 1 }}>
                    <RecordsCardView
                      records={filteredAndSortedRecords}
                      recordType={selectedRecordType}
                      loading={loading}
                      onViewRecord={handleViewRecord}
                      searchTerm={debouncedSearch}
                    />
                  </Box>
                )}

                {/* Timeline View */}
                {activeView === 'timeline' && (
                  <Box sx={{ py: 1 }}>
                    <RecordsTimelineView
                      records={filteredAndSortedRecords}
                      recordType={selectedRecordType}
                      loading={loading}
                      onViewRecord={handleViewRecord}
                      searchTerm={debouncedSearch}
                    />
                  </Box>
                )}

                {/* Analytics View */}
                {activeView === 'analytics' && (
                  <RecordsAnalyticsView
                    churchId={effectiveChurchId}
                    churchName={landingChurchName}
                    recordType={selectedRecordType as 'baptism' | 'marriage' | 'funeral'}
                  />
                )}

                {/* Table/Grid View */}
                {activeView === 'table' && (
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

                  {/* Conditional Table Rendering — AG Grid primary with auto-fallback */}
                {useAgGrid && !agGridFailed ? (
                  <AGGridErrorBoundary
                    onFallbackActivated={(err) => { setAgGridFailed(true); console.error('[Records] AG Grid fallback activated:', err.message); }}
                    fallback={
                      <StandardRecordsTable
                        records={paginatedRecords}
                        selectedRecordType={selectedRecordType}
                        sortConfig={sortConfig}
                        loading={loading}
                        searchTerm={searchTerm}
                        debouncedSearch={debouncedSearch}
                        isDarkMode={isDarkMode}
                        nowReference={nowReference}
                        isRecordSelected={isRecordSelected}
                        onSort={handleSort}
                        onRowSelect={handleRowSelect}
                        onViewRecord={handleViewRecord}
                        onEditRecord={handleEditRecord}
                        onDeleteClick={handleDeleteClick}
                        highlightSearchMatch={highlightSearchMatch}
                      />
                    }
                  >
                    {/* AG Grid View — primary renderer */}
                    <Box sx={{ height: 600, width: '100%' }}>
                      <AgGridReact
                        theme={agGridTheme}
                        rowData={filteredAndSortedRecords}
                        columnDefs={agGridColumnDefs}
                        icons={agGridIconMap}
                        defaultColDef={{ resizable: true, sortable: true, filter: false }}
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
                  </AGGridErrorBoundary>
                ) : (
                  // Standard Material-UI Table View (manual toggle or auto-fallback)
                  <StandardRecordsTable
                    records={paginatedRecords}
                    selectedRecordType={selectedRecordType}
                    sortConfig={sortConfig}
                    loading={loading}
                    searchTerm={searchTerm}
                    debouncedSearch={debouncedSearch}
                    isDarkMode={isDarkMode}
                    nowReference={nowReference}
                    isRecordSelected={isRecordSelected}
                    onSort={handleSort}
                    onRowSelect={handleRowSelect}
                    onViewRecord={handleViewRecord}
                    onEditRecord={handleEditRecord}
                    onDeleteClick={handleDeleteClick}
                    onCertificateClick={(record) => {
                      setViewingRecord(record);
                      handleGenerateCertificate();
                    }}
                    highlightSearchMatch={highlightSearchMatch}
                  />
                )}

              </Paper>
              )}

              {/* Pagination — shared across all record views */}
              {activeView !== 'analytics' && (
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={totalRecords}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
              )}
              </>
            )}
            {/* Add/Edit Dialog */}
            <EditRecordDialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              editingRecord={editingRecord}
              selectedRecordType={selectedRecordType}
              formData={formData}
              setFormData={setFormData}
              priestOptions={priestOptions}
              churches={churches}
              selectedChurch={selectedChurch}
              loading={loading}
              onSave={handleSaveRecord}
              isDarkMode={isDarkMode}
            />
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
              onModeChange={handleViewEditModeChange}
              onSave={handleSaveRecord}
              saveLoading={loading}
              editFormComponent={editFormContent}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
              open={deleteDialogOpen}
              recordName={recordToDelete?.name || ''}
              onCancel={handleCancelDelete}
              onConfirm={handleConfirmDelete}
            />


            {/* Toast Snackbar — centered on screen */}
            <Snackbar
              open={toastOpen}
              autoHideDuration={3000}
              onClose={() => setToastOpen(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert
                onClose={() => setToastOpen(false)}
                severity={toastSeverity}
                variant="filled"
                sx={{
                  width: '100%',
                  minWidth: 280,
                  boxShadow: 4,
                  borderRadius: 2,
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
                showToast(t('records.records_refreshed'), 'success');
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
