import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Collapse,
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
  ViewColumn as ViewColumnIcon,
} from '@mui/icons-material';
import {
  IconBabyCarriage,
  IconHeart,
  IconCross,
  IconChevronUp,
  IconChevronDown,
} from '@tabler/icons-react';
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
  const navigate = useNavigate();
  
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
  const [isTopPanelCollapsed, setIsTopPanelCollapsed] = useState<boolean>(false);

  // Handler for record type clicks
  const handleRecordTypeClick = (recordType: string) => {
    if (recordType === 'funeral') {
      // Navigate to OCR Wizard for "Upload Additional Records"
      navigate('/ocr-wizard');
    } else {
      setSelectedRecordType(recordType);
    }
  };
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

  // View Record Modal State
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<BaptismRecord | null>(null);

  // Column visibility state with localStorage persistence
  const getStoredVisibleColumns = (recordType: string): string[] => {
    try {
      const stored = localStorage.getItem(`columnVisibility_${recordType}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored column visibility:', error);
    }
    // Return default columns based on record type
    const getDefaultColumns = (type: string) => {
      if (type === 'baptism') {
        return ['registryNumber']; // Only show registry number by default
      } else if (type === 'marriage') {
        return ['registryNumber']; // Only show registry number by default
      } else if (type === 'funeral') {
        return ['registryNumber'];
      }
      return ['registryNumber'];
    };
    
    return getDefaultColumns(recordType);
  };

  const setStoredVisibleColumns = (recordType: string, columns: string[]) => {
    try {
      localStorage.setItem(`columnVisibility_${recordType}`, JSON.stringify(columns));
    } catch (error) {
      console.warn('Failed to store column visibility:', error);
    }
  };

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    getStoredVisibleColumns('baptism')
  );

  // Available columns based on record type
  const getAvailableColumns = () => {
    if (selectedRecordType === 'baptism') {
      return [
        { key: 'registryNumber', label: 'Registry #' },
        { key: 'name', label: 'Name' },
        { key: 'dateOfBirth', label: 'Birth Date' },
        { key: 'dateOfBaptism', label: 'Baptism Date' },
        { key: 'placeOfBirth', label: 'Place of Birth' },
        { key: 'parents', label: 'Parents' },
        { key: 'sponsors', label: 'Sponsors' },
        { key: 'priest', label: 'Priest' }
      ];
    } else if (selectedRecordType === 'marriage') {
      return [
        { key: 'registryNumber', label: 'Registry #' },
        { key: 'groom', label: 'Groom' },
        { key: 'bride', label: 'Bride' },
        { key: 'dateOfMarriage', label: 'Marriage Date' },
        { key: 'groomParents', label: 'Groom Parents' },
        { key: 'brideParents', label: 'Bride Parents' },
        { key: 'witnesses', label: 'Witnesses' },
        { key: 'marriageLicense', label: 'Marriage License' },
        { key: 'priest', label: 'Priest' }
      ];
    } else if (selectedRecordType === 'funeral') {
      return [
        { key: 'registryNumber', label: 'Registry #' },
        { key: 'firstName', label: 'First Name' },
        { key: 'dateOfDeath', label: 'Death Date' },
        { key: 'dateOfFuneral', label: 'Funeral Date' },
        { key: 'burialLocation', label: 'Burial Location' },
        { key: 'priest', label: 'Priest' }
      ];
    }

    // Default fallback
    return [
      { key: 'registryNumber', label: 'Registry #' },
      { key: 'firstName', label: 'First Name' },
      { key: 'priest', label: 'Priest' }
    ];
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey];
      
      // Store in localStorage
      setStoredVisibleColumns(selectedRecordType, newColumns);
      
      return newColumns;
    });
  };

  // Get cell value based on column key
  const getCellValue = (record: any, columnKey: string) => {
    switch (columnKey) {
      case 'registryNumber':
        return (
          <Chip
            label={record.registryNumber || record.id || ''}
            size="small"
            variant="outlined"
            color="primary"
          />
        );
      case 'firstName':
      case 'name':
        return (
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {selectedRecordType === 'funeral' 
                ? record.firstName || ''
                : selectedRecordType === 'baptism' 
                  ? `${record.firstName || ''} ${record.lastName || ''}`.trim()
                  : `${record.firstName || ''} ${record.lastName || ''}`.trim()}
            </Typography>
          </Box>
        );
      case 'lastName':
        return record.lastName || '';
      case 'dateOfBirth':
        return formatDate(record.dateOfBirth);
      case 'dateOfBaptism':
        return formatDate(record.dateOfBaptism);
      case 'placeOfBirth':
        return record.placeOfBirth || '';
      case 'parents':
        return `${record.fatherName || ''} & ${record.motherName || ''}`.replace(/^& |& $/, '').trim();
      case 'sponsors':
        return record.godparentNames || record.sponsors || '';
      case 'groom':
        return `${record.fname_groom || ''} ${record.lname_groom || ''}`.trim();
      case 'bride':
      case 'spouse':
        return `${record.fname_bride || ''} ${record.lname_bride || ''}`.trim();
      case 'dateOfMarriage':
        return record.mdate ? formatDate(record.mdate) : '';
      case 'groomParents':
        return record.parentsg || '';
      case 'brideParents':
      case 'spouseParents':
        return record.parentsb || '';
      case 'witnesses':
      case 'witnessNames':
        return record.witness || '';
      case 'marriageLicense':
        return record.mlicense || '';
      case 'priest':
        return record.clergy || '';
      case 'dateOfDeath':
        return formatDate(record.dateOfDeath);
      case 'dateOfFuneral':
        return formatDate(record.dateOfFuneral);
      case 'burialLocation':
        return record.burialLocation || record.burialPlace || '';
      default:
        return record[columnKey] || '';
    }
  };

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

  // Update visible columns when record type changes
  useEffect(() => {
    const storedColumns = getStoredVisibleColumns(selectedRecordType);
    setVisibleColumns(storedColumns);
  }, [selectedRecordType]);

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
    setViewingRecord(record);
    setViewDialogOpen(true);
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
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString; // Return original if parsing fails
    }
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

  // Debug logging for visible columns
  useEffect(() => {
    console.log('🐛 DEBUG - Column visibility:', {
      selectedRecordType,
      visibleColumns,
      availableColumns: getAvailableColumns().map(col => col.key)
    });
    
    // Clear localStorage if there's a mismatch for debugging
    if (selectedRecordType === 'baptism' && visibleColumns.includes('name') && !visibleColumns.includes('registryNumber')) {
      console.log('🔄 Clearing localStorage due to mismatch');
      localStorage.removeItem(`columnVisibility_${selectedRecordType}`);
      setVisibleColumns(['registryNumber']);
    }
  }, [visibleColumns, selectedRecordType]);

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
      minHeight: '100vh',
      overflowX: 'auto',
      px: { xs: 1, sm: 2, md: 3 },
      '& .MuiContainer-root': {
        maxWidth: 'none !important',
        paddingLeft: 0,
        paddingRight: 0
      },
      // Mobile scroll support
      '@media (max-width: 600px)': {
        px: 1,
        '& .MuiCard-root': {
          mx: 0,
        },
        '& .MuiStack-root': {
          flexDirection: 'column',
          alignItems: 'stretch',
        },
      },
    }}>
      {/* Collapsible Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: 1 }}>
          {/* Collapse/Expand Button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h1">
              Records Management System
            </Typography>
            <IconButton
              onClick={() => setIsTopPanelCollapsed(!isTopPanelCollapsed)}
              sx={{ 
                transition: 'transform 0.2s ease-in-out',
                transform: isTopPanelCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <IconChevronUp />
            </IconButton>
          </Box>
          
          {/* Collapsible Content */}
          <Collapse in={!isTopPanelCollapsed}>
            <Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Manage church records with Orthodox Table Theme Editor integration
              </Typography>
              
              {/* Theme Status Indicator */}
              <Box sx={{ mb: 3 }}>
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
              
              {/* Column Visibility Controls */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
                  border: '1px solid #e0e0e0'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ViewColumnIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                    Column Visibility - {recordTypes.find(type => type.value === selectedRecordType)?.label || 'Records'}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Click columns to show/hide them in the table. Green = visible, Gray = hidden
                </Typography>
                <Stack 
                  direction="row" 
                  spacing={1} 
                  sx={{ 
                    overflowX: 'auto',
                    py: 1,
                    flexWrap: 'wrap',
                    gap: 1.5,
                    '&::-webkit-scrollbar': {
                      height: 6,
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: 3,
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderRadius: 3,
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.5)',
                      },
                    },
                  }}
                >
                  {getAvailableColumns().map((column) => (
                    <Chip
                      key={column.key}
                      label={column.label}
                      onClick={() => toggleColumnVisibility(column.key)}
                      variant={visibleColumns.includes(column.key) ? 'filled' : 'outlined'}
                      sx={{ 
                        minWidth: 'fit-content',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        backgroundColor: visibleColumns.includes(column.key) 
                          ? '#4CAF50' 
                          : '#9e9e9e',
                        color: 'white',
                        borderColor: visibleColumns.includes(column.key) 
                          ? '#4CAF50' 
                          : '#9e9e9e',
                        '&:hover': {
                          backgroundColor: visibleColumns.includes(column.key) 
                            ? '#45a049' 
                            : '#757575',
                          borderColor: visibleColumns.includes(column.key) 
                            ? '#45a049' 
                            : '#757575',
                          color: 'white !important',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        },
                        '&.MuiChip-outlined': {
                          backgroundColor: '#9e9e9e',
                          borderColor: '#9e9e9e',
                          color: 'white',
                        },
                        '&.MuiChip-filled': {
                          backgroundColor: '#4CAF50',
                          color: 'white',
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    />
                  ))}
                </Stack>
              </Paper>

              {/* Controls Section */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Controls
                </Typography>
                <Stack spacing={2}>
                  {/* First Row: Church and Record Type Selection */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
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
                    
                    <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
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
                  
                  {/* Second Row: Search and Action Buttons */}
                  {selectedRecordType && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <TextField
                        label="Search Records"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        sx={{ minWidth: { xs: '100%', sm: 200 } }}
                        disabled={loading}
                      />
                      
                      {/* Action Buttons */}
                      <Stack direction="row" spacing={1} sx={{ 
                        flexWrap: 'wrap',
                        '& .MuiButton-root': {
                          minWidth: { xs: '120px', sm: '140px' },
                          height: '32px',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap',
                        },
                      }}>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddRecord}
                          disabled={loading}
                          size="small"
                        >
                          Add Record
                        </Button>
                        
                        <Button
                          variant="contained"
                          startIcon={<SettingsIcon />}
                          onClick={() => setAdvancedGridOpen(true)}
                          disabled={loading}
                          size="small"
                          sx={{ 
                            background: 'linear-gradient(45deg, #9C27B0 30%, #BA68C8 90%)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #7B1FA2 30%, #AB47BC 90%)',
                            }
                          }}
                        >
                          Advanced Grid
                        </Button>
                        
                        <Button
                          variant="contained"
                          startIcon={<PaletteIcon />}
                          onClick={() => setThemeDrawerOpen(true)}
                          disabled={loading}
                          size="small"
                          sx={{ 
                            background: 'linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #F57C00 30%, #FFA726 90%)',
                            }
                          }}
                        >
                          Customize Table
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
            </Box>
          </Collapse>
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
              Interactive Record View
            </Typography>
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
            <TableContainer sx={{ 
              textAlign: 'left', 
              width: '100%',
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                height: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.5)',
                },
              },
            }}>
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
                  {visibleColumns.map((columnKey) => {
                    const column = getAvailableColumns().find(col => col.key === columnKey);
                    if (!column) return null;
                    
                    return (
                      <TableCell key={columnKey} sx={getTableCellStyle('header')}>
                        <TableSortLabel
                          active={sortConfig.key === columnKey}
                          direction={sortConfig.direction}
                          onClick={() => handleSort(columnKey as keyof BaptismRecord)}
                        >
                          {column.label}
                        </TableSortLabel>
                      </TableCell>
                    );
                  })}
                  <TableCell sx={getTableCellStyle('header')} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        Loading records...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} align="center" sx={{ py: 8 }}>
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
                      {visibleColumns.map((columnKey) => (
                        <TableCell 
                          key={columnKey}
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
                          {getCellValue(record, columnKey)}
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

      {/* View Record Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          View {selectedRecordType === 'baptism' ? 'Baptism' : selectedRecordType === 'marriage' ? 'Marriage' : 'Funeral'} Record
        </DialogTitle>
        <DialogContent>
          {viewingRecord && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={selectedRecordType === 'baptism' ? 'Name' : 'First Name'}
                  value={viewingRecord.firstName || ''}
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1 }}
                />
                {selectedRecordType !== 'baptism' && (
                  <TextField
                    label="Last Name"
                    value={viewingRecord.lastName || ''}
                    InputProps={{ readOnly: true }}
                    sx={{ flex: 1 }}
                  />
                )}
                {selectedRecordType === 'baptism' && (
                  <TextField
                    label="Middle Name"
                    value={viewingRecord.middleName || ''}
                    InputProps={{ readOnly: true }}
                    sx={{ flex: 1 }}
                  />
                )}
              </Stack>
              
              {selectedRecordType === 'baptism' && (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Date of Birth"
                      value={formatDate(viewingRecord.dateOfBirth) || ''}
                      InputProps={{ readOnly: true }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Date of Baptism"
                      value={formatDate(viewingRecord.dateOfBaptism) || ''}
                      InputProps={{ readOnly: true }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                  
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Place of Birth"
                      value={viewingRecord.placeOfBirth || ''}
                      InputProps={{ readOnly: true }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Place of Baptism"
                      value={viewingRecord.placeOfBaptism || ''}
                      InputProps={{ readOnly: true }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                  
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Father's Name"
                      value={viewingRecord.fatherName || ''}
                      InputProps={{ readOnly: true }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Mother's Name"
                      value={viewingRecord.motherName || ''}
                      InputProps={{ readOnly: true }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                  
                  <TextField
                    label="Sponsors/Godparents"
                    value={viewingRecord.godparentNames || ''}
                    InputProps={{ readOnly: true }}
                  />
                </>
              )}
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Registry Number"
                  value={viewingRecord.registryNumber || ''}
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Priest"
                  value={viewingRecord.priest || ''}
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1 }}
                />
              </Stack>
              
              {viewingRecord.notes && (
                <TextField
                  label="Notes"
                  multiline
                  rows={3}
                  value={viewingRecord.notes || ''}
                  InputProps={{ readOnly: true }}
                />
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button 
            onClick={() => {
              setViewDialogOpen(false);
              if (viewingRecord) {
                handleEditRecord(viewingRecord);
              }
            }}
            variant="contained"
          >
            Edit Record
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
