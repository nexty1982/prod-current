import React, { useEffect, useMemo, useState, useCallback, useRef, useContext } from 'react';
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  InputAdornment,
  useTheme,
} from '@mui/material';
import {
  IconSearch,
  IconDownload,
  IconEye,
  IconRefresh,
} from '@tabler/icons-react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi, ColumnApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
// Note: AG Grid CSS is imported globally in main.tsx to avoid duplicates
import { listRecords, type TableKey, type SortDir } from '@/shared/lib/recordsApi';
import { AddRecordModal, ImportRecordsModal } from './components';
import { useNavigate } from 'react-router-dom';
import { AddRecordButton, AdvancedGridButton, ImportRecordsButton } from '@/features/records/BrandButtons';
import { CustomizerContext } from '@/context/CustomizerContext';
import { useAuth } from '@/context/AuthContext';
import RecordHeaderBanner from '@/features/church/RecordHeaderBanner';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface Church {
  id: number;
  name: string;
}

interface Column {
  key: string;
  label: string;
  sortable: boolean;
}

export default function RecordsUIPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isLayout, setIsLayout } = useContext(CustomizerContext);
  const { user } = useAuth();
  const [tab, setTab] = useState<TableKey>('baptism');
  const [churches, setChurches] = useState<Church[]>([]);
  // Set default churchId from user's church_id if available, otherwise default to 46
  // Ensure church_id is a valid number
  const getValidChurchId = (churchId: any): number => {
    if (churchId === null || churchId === undefined || churchId === '') return 46;
    const num = Number(churchId);
    return !isNaN(num) && num > 0 ? num : 46;
  };
  const [churchId, setChurchId] = useState<number>(getValidChurchId(user?.church_id));
  const [churchName, setChurchName] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10000); // Fetch all records from database (no limit)
  const [sortField, setSortField] = useState('dateOfBaptism'); // Default for baptism tab
  const [sortDirection, setSortDirection] = useState<SortDir>('desc');
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const previousLayoutRef = useRef<string | null>(null);
  
  // AG Grid state
  const [isGridReady, setIsGridReady] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const gridApiRef = useRef<GridApi | null>(null);
  const gridColumnApiRef = useRef<ColumnApi | null>(null);
  
  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [headerKey, setHeaderKey] = useState(0); // Key to force header remount on settings update

  // Listen for record settings updates to refresh header
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      if (event.detail?.churchId === churchId) {
        console.log('[RecordsUIPage] Settings updated, refreshing header');
        // Force header remount by changing key
        setHeaderKey(prev => prev + 1);
      }
    };

    window.addEventListener('recordSettingsUpdated', handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener('recordSettingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, [churchId]);

  // Automatically set container to "full" when viewing records page
  useEffect(() => {
    // Save the current layout value before changing it
    previousLayoutRef.current = isLayout;
    // Set to "full" for records page (only if not already "full")
    if (isLayout !== 'full') {
      setIsLayout('full');
    }
    
    // Restore previous layout when component unmounts (only if we changed it)
    return () => {
      if (previousLayoutRef.current && previousLayoutRef.current !== 'full') {
        setIsLayout(previousLayoutRef.current);
      }
    };
  }, []); // Only run on mount/unmount - eslint-disable-line react-hooks/exhaustive-deps

  // Load churches on mount
  useEffect(() => {
    (async () => {
      try {
        const u = new URL('/api/admin/churches', window.location.origin);
        u.searchParams.set('is_active', '1');
        const res = await fetch(u.toString(), { credentials: 'include' });
        const data = await res.json();
        
        // normalize whatever the backend sent into a plain array
        const churchesArr =
          Array.isArray(data?.rows)      ? data.rows      :
          Array.isArray(data?.churches)  ? data.churches  :
          Array.isArray(data?.data)      ? data.data      :
          Array.isArray(data?.items)     ? data.items     :
          Array.isArray(data)            ? data           : [];

        const items = churchesArr.map((c: any) => ({
          id: c.id ?? c.church_id ?? c.value ?? c.key,
          name: c.name ?? c.church_name ?? c.label,
        })).filter((c: any) => c.id);

        // optional: log unexpected shapes to help you catch backend regressions
        if (!churchesArr.length && data) {
          // eslint-disable-next-line no-console
          console.warn('Unexpected churches payload:', data);
        }
        setChurches(items);
        // For priests, ensure their church is selected (backend should filter to only their church)
        // For other roles, use user's church_id if available, otherwise use first available church
        const userChurchId = getValidChurchId(user?.church_id);
        const validUserChurchId = userChurchId !== 46 && items.find((c: any) => c.id === userChurchId) 
          ? userChurchId 
          : null;
        const targetChurchId = validUserChurchId 
          ? validUserChurchId
          : (items.find((c: any) => c.id === churchId) ? churchId : (items[0]?.id || getValidChurchId(churchId)));
        
        // Only update if we have a valid, different church ID
        if (targetChurchId && targetChurchId !== churchId && targetChurchId > 0) {
          setChurchId(targetChurchId);
        }
      } catch (err) {
        console.error('Failed to load churches:', err);
        // If fetch fails and we don't have a valid churchId, set a default
        if (!churchId || churchId <= 0) {
          setChurchId(46);
        }
      }
    })();
  }, [user?.church_id]); // Only depend on user.church_id, not churchId to avoid loops

  // Set tab-specific default sorting when tab changes
  useEffect(() => {
    if (tab === 'baptism') {
      setSortField('baptismDate');
      setSortDirection('desc');
    } else if (tab === 'marriage') {
      setSortField('marriageDate');
      setSortDirection('desc');
    } else if (tab === 'funeral') {
      setSortField('funeralDate');
      setSortDirection('desc');
    }
    setPage(1);
  }, [tab]);

  // Sync church name when churches list loads - always prioritize churches list over API response
  useEffect(() => {
    const match = churches.find(c => c.id === churchId);
    if (match) {
      // Always update from churches list if available, even if churchName is already set
      // This ensures we use the correct name from the churches list, not "Unknown Church" from API fallback
      setChurchName(match.name);
    }
  }, [churches, churchId]);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  // Load records when parameters change
  useEffect(() => {
    const ctrl = new AbortController();
    
    // Clear old data immediately when tab changes to prevent stale data in Advanced Grid
    if (ctrl.signal.aborted) return;
    
    (async () => {
      setLoading(true);
      setError(null);
      // Clear rows immediately to prevent Advanced Grid from showing wrong data
      setRows([]);
      setCount(0);
      
      try {
        const { rows, count, church } = await listRecords({
          table: tab,
          churchId,
          page,
          limit,
          search: debouncedSearch,
          sortField,
          sortDirection,
          signal: ctrl.signal
        });
        console.log(`[RecordsUIPage] Loaded ${rows.length} ${tab} records:`, { rows, count, tab, churchId, church });
        
        // helpers
        const firstNonEmpty = (...vals: any[]) =>
          vals.find(v => (Array.isArray(v) ? v.length : v !== null && v !== undefined && String(v).trim?.() !== ''));

        const normalizeList = (v: any): string => {
          if (v == null) return '';
          if (Array.isArray(v)) return v.filter(Boolean).join(', ');
          if (typeof v === 'object') return Object.values(v).filter(Boolean).join(', ');
          return String(v);
        };

        const joinName = (first?: string, last?: string) =>
          [first ?? '', last ?? ''].map(s => String(s).trim()).filter(Boolean).join(' ');

        const processedRows = rows.map((row) => {
          if (tab === 'baptism') {
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
              firstName:   o.firstName   ?? o.first_name   ?? row.firstName   ?? '',
              lastName:    o.lastName    ?? o.last_name    ?? row.lastName    ?? '',
              birthDate:   o.birthDate   ?? o.birth_date   ?? o.dateOfBirth   ?? row.birthDate   ?? '',
              baptismDate: o.baptismDate ?? o.reception_date ?? o.dateOfBaptism ?? row.baptismDate ?? '',
              birthplace:  o.birthplace  ?? o.placeOfBirth ?? row.birthplace  ?? '',
              sponsors:    normalizeList(sponsorsRaw),
              parents:     normalizeList(parentsRaw),
              clergy:      normalizeList(clergyRaw),
            };
          }

          if (tab === 'marriage') {
            const o = row.originalRecord ?? row;

            // names (support common variants)
            const gFirst = firstNonEmpty(o.groomFirstName, o.groom_first_name, o.groomFirst, row.groomFirstName);
            const gLast  = firstNonEmpty(o.groomLastName,  o.groom_last_name,  o.groomLast,  row.groomLastName);
            const bFirst = firstNonEmpty(o.brideFirstName, o.bride_first_name, o.brideFirst, row.brideFirstName);
            const bLast  = firstNonEmpty(o.brideLastName,  o.bride_last_name,  o.brideLast,  row.brideLastName);

            // parents
            const groomParentsRaw = firstNonEmpty(
              o.groomParents, o.parentsOfGroom,
              [o.groomFatherName, o.groomMotherName].filter(Boolean),
              o.parents_groom, row.groomParents
            );
            const brideParentsRaw = firstNonEmpty(
              o.brideParents, o.parentsOfBride,
              [o.brideFatherName, o.brideMotherName].filter(Boolean),
              o.parents_bride, row.brideParents
            );

            // witnesses / license
            const witnessesRaw = firstNonEmpty(
              o.witnesses, o.witness, o.witnessNames,
              [o.bestMan, o.maidOfHonor].filter(Boolean),
              row.witnesses
            );
            const licenseRaw = firstNonEmpty(
              o.marriageLicense, o.licenseNumber, o.license_no, o.licenseNo,
              row.marriageLicense
            );

            return {
              ...row,
              marriageDate:  o.marriageDate ?? o.mdate ?? o.dateOfMarriage ?? o.marriage_date ?? row.marriageDate ?? '',
              groomName:     joinName(gFirst, gLast),
              brideName:     joinName(bFirst, bLast),
              groomParents:  normalizeList(groomParentsRaw),
              brideParents:  normalizeList(brideParentsRaw),
              witnesses:     normalizeList(witnessesRaw),
              marriageLicense: String(licenseRaw ?? ''),
              clergy:        o.clergy ?? o.clergyName ?? o.officiant ?? o.priestName ?? row.clergy ?? '',
            };
          }

          if (tab === 'funeral') {
            const o = row.originalRecord ?? row;

            return {
              ...row,
              // use DB names first
              deathDate:    o.deceased_date ?? o.dateOfDeath   ?? o.death_date    ?? row.deathDate    ?? '',
              funeralDate:  o.burial_date   ?? o.dateOfFuneral ?? o.funeral_date  ?? o.burialDate ?? row.burialDate ?? row.funeralDate ?? '',
              age:          o.age           ?? o.ageYears      ?? o.age_at_death  ?? row.age ?? '',
              burialLocation:
                            o.burial_location ?? o.burialLocation ?? o.burial_place ?? o.cemetery ?? o.cemeteryName ?? o.placeOfBurial ?? row.burialLocation ?? '',
              firstName:    o.first_name    ?? o.firstName ?? row.firstName ?? '',
              lastName:     o.last_name     ?? o.lastName  ?? row.lastName  ?? '',
              clergy:       o.clergy        ?? o.clergyName ?? o.officiant ?? o.priestName ?? row.clergy ?? '',
            };
          }

          return row;
        });
        
        if (tab === 'baptism') console.log('BAPTISM SAMPLE', processedRows[0]);
        if (tab === 'funeral') {
          console.log('FUNERAL sample:', processedRows[0]);
          const sample = processedRows.find(r => !r.funeralDate);
          if (sample) console.log('FUNERAL missing funeralDate sample:', sample);
        }
        
        setRows(processedRows);
        setCount(count);
        if (church?.id) setChurchId(church.id);
        // Only set churchName from API if we don't have it in churches list
        // This prevents "Unknown Church" from overwriting the correct name
        if (church?.name) {
          const match = churches.find(c => c.id === church.id);
          if (!match) {
            // Only use API name if church not found in our list
            setChurchName(church.name);
          }
          // Otherwise, the useEffect above will sync the correct name from churches list
        }
      } catch (e: any) {
        if (!ctrl.signal.aborted) {
          setRows([]);
          setCount(0);
          setError(e.message || 'Failed to load records');
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }
    })();
    return () => ctrl.abort();
  }, [tab, churchId, page, debouncedSearch, sortField, sortDirection]);

  // AG Grid column definitions matching Samples.tsx English layout
  const columnDefs: ColDef[] = useMemo(() => {
    if (tab === 'baptism') {
      return [
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
          field: 'birthDate',
          headerName: 'Date of Birth',
          sortable: true,
          filter: true,
          width: 150,
          valueFormatter: (params) => {
            if (!params.value) return '';
            const s = String(params.value).trim();
            const normalized = /^\d{8}$/.test(s) ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}` : s;
            const d = new Date(normalized);
            return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
          },
        },
        {
          field: 'baptismDate',
          headerName: 'Date of Bapt...',
          sortable: true,
          filter: true,
          width: 150,
          valueFormatter: (params) => {
            if (!params.value) return '';
            const s = String(params.value).trim();
            const normalized = /^\d{8}$/.test(s) ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}` : s;
            const d = new Date(normalized);
            return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
          },
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
          field: 'parents',
          headerName: 'Parents Names',
          sortable: true,
          filter: true,
          width: 200,
        },
        {
          field: 'clergy',
          headerName: 'Clergy Name',
          sortable: true,
          filter: true,
          width: 180,
        },
      ];
    }

    if (tab === 'marriage') {
      return [
        {
          headerCheckboxSelection: true,
          checkboxSelection: true,
          width: 50,
          suppressMenu: true,
          lockPosition: 'left',
        },
        {
          field: 'marriageDate',
          headerName: 'Date Marri...',
          sortable: true,
          filter: true,
          width: 150,
          valueFormatter: (params) => {
            if (!params.value) return '';
            const s = String(params.value).trim();
            const normalized = /^\d{8}$/.test(s) ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}` : s;
            const d = new Date(normalized);
            return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
          },
        },
        {
          field: 'groomName',
          headerName: 'Groom',
          sortable: true,
          filter: true,
          width: 150,
        },
        {
          field: 'brideName',
          headerName: 'Bride',
          sortable: true,
          filter: true,
          width: 150,
        },
        {
          field: 'groomParents',
          headerName: "Groom's Parents",
          sortable: true,
          filter: true,
          width: 200,
        },
        {
          field: 'brideParents',
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
      ];
    }

    // Funeral
    return [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        suppressMenu: true,
        lockPosition: 'left',
      },
      {
        field: 'deathDate',
        headerName: 'Date of Death',
        sortable: true,
        filter: true,
        width: 150,
        valueFormatter: (params) => {
          if (!params.value) return '';
          const s = String(params.value).trim();
          const normalized = /^\d{8}$/.test(s) ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}` : s;
          const d = new Date(normalized);
          return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
        },
      },
      {
        field: 'funeralDate',
        headerName: 'Burial Date',
        sortable: true,
        filter: true,
        width: 150,
        valueFormatter: (params) => {
          if (!params.value) return '';
          const s = String(params.value).trim();
          const normalized = /^\d{8}$/.test(s) ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}` : s;
          const d = new Date(normalized);
          return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
        },
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
    ];
  }, [tab]);

  // Legacy columns for reference (keeping for now but not used)
  const columns = useMemo((): Column[] => {
    if (tab === 'baptism') {
      return [
        { key: 'firstName',   label: 'First Name',      sortable: true },
        { key: 'lastName',    label: 'Last Name',       sortable: true },
        { key: 'birthDate',   label: 'Date of Birth',   sortable: true },
        { key: 'baptismDate', label: 'Date of Baptism', sortable: true },
        { key: 'birthplace',  label: 'Birthplace',      sortable: true },
        { key: 'sponsors',    label: 'Sponsors',        sortable: true },
        { key: 'parents',     label: 'Parents Name',    sortable: true },
        { key: 'clergy',      label: 'Clergy Name',     sortable: true },
      ];
    }
    if (tab === 'marriage') {
      return [
        { key: 'marriageDate',   label: 'Date Married',      sortable: true },
        { key: 'groomName',      label: 'Groom',             sortable: true },
        { key: 'brideName',      label: 'Bride',             sortable: true },
        { key: 'groomParents',   label: "Groom's Parents",   sortable: true },
        { key: 'brideParents',   label: "Bride's Parents",   sortable: true },
        { key: 'witnesses',      label: 'Witnesses',         sortable: true },
        { key: 'marriageLicense',label: 'Marriage License',  sortable: true },
        { key: 'clergy',         label: 'Clergy',            sortable: true },
      ];
    }
    if (tab === 'funeral') {
      return [
        { key: 'deathDate',      label: 'Date of Death',   sortable: true },
        { key: 'funeralDate',    label: 'Burial Date',     sortable: true },
        { key: 'age',            label: 'Age',             sortable: true },
        { key: 'burialLocation', label: 'Burial Location', sortable: true },
        { key: 'firstName',      label: 'First Name',      sortable: true },
        { key: 'lastName',       label: 'Last Name',       sortable: true },
        { key: 'clergy',         label: 'Clergy',          sortable: true },
      ];
    }

    // For other record types, fall back to dynamic column generation only if no rows loaded yet
    if (rows.length === 0) {
      return [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'date', label: 'Date', sortable: true },
      ];
    }

    // Generate columns from actual data, but exclude unwanted fields
    const allKeys = new Set<string>();
    const excludedKeys = new Set(['originalRecord', 'id', 'church_id', 'churchId', 'created_at', 'updated_at', 'createdAt', 'updatedAt']);
    
    rows.forEach(row => {
      // Add direct properties (exclude originalRecord and other internal fields)
      Object.keys(row).forEach(key => {
        if (!excludedKeys.has(key)) {
          allKeys.add(key);
        }
      });
    });

    // Convert to columns with nice labels
    const dynamicColumns = Array.from(allKeys).map(key => {
      let label = '';
      
      if (key.includes('originalRecord.')) {
        const nestedKey = key.replace('originalRecord.', '');
        label = `Original ${getLabelForKey(nestedKey)}`;
      } else {
        label = getLabelForKey(key);
      }
      
      return {
        key,
        label,
        sortable: true,
      };
    });

    // Helper function to get proper labels for field keys
    function getLabelForKey(key: string): string {
      const labelMap: Record<string, string> = {
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'birth_date': 'Date of Birth',
        'reception_date': 'Date of Baptism',
        'birthplace': 'Birthplace',
        'sponsors': 'Sponsors',
        'parents': 'Parents Name',
        'clergy': 'Clergy Name',
        'marriageDate': 'Marriage Date',
        'groomFirstName': 'Groom First Name',
        'groomLastName': 'Groom Last Name',
        'brideFirstName': 'Bride First Name',
        'brideLastName': 'Bride Last Name',
        'deathDate': 'Date of Death',
        'funeralDate': 'Burial Date',
        'entry_type': 'Entry Type',
        'church_id': 'Church ID',
      };
      
      return labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ');
    }

    // Sort columns to put important ones first based on record type
    let priorityOrder: string[] = [];
    if (tab === 'baptism') {
      priorityOrder = ['firstName','lastName','birthDate','baptismDate','birthplace','sponsors','parents','clergy'];
    } else if (tab === 'marriage') {
      priorityOrder = [
        'marriageDate',
        'groomName','brideName',
        'groomParents','brideParents',
        'witnesses','marriageLicense',
        'clergy'
      ];
    } else {
      priorityOrder = ['deathDate', 'funeralDate', 'firstName', 'lastName', 'clergy'];
    }
    
    return dynamicColumns.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.key);
      const bIndex = priorityOrder.indexOf(b.key);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [tab, rows]);

  // Handle sort
  const handleSort = useCallback((columnKey: string) => {
    if (sortField === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(columnKey);
      setSortDirection('asc');
    }
    setPage(1);
  }, [sortField, sortDirection]);

  // Handle page change
  const handlePageChange = useCallback((event: unknown, newPage: number) => {
    setPage(newPage + 1); // Convert from 0-based to 1-based
  }, []);

  // Limit change handler removed - now fetching all records (limit: 10000)

  // Handle search change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(1);
  }, []);

  // Handle church change
  const handleChurchChange = useCallback((event: SelectChangeEvent<number>) => {
    setChurchId(Number(event.target.value));
    setPage(1);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: TableKey) => {
    setTab(newValue);
    setPage(1);
    // Sorting will be handled by the useEffect that watches tab changes
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setPage(1);
  }, []);

  // Handle add record
  const handleAddRecord = useCallback(() => {
    setAddOpen(true);
  }, []);

  // Handle import records
  const handleImportRecords = useCallback(() => {
    setImportOpen(true);
  }, []);

  // Handle advanced grid
  const handleAdvancedGrid = useCallback(() => {
    navigate('/apps/records-grid?table=' + tab + '&churchId=' + churchId, {
      state: {
        table: tab,
        churchId,
        search: debouncedSearch || '',
        sortField,
        sortDirection
        // optional prefill if you want instant rows:
        // prefetch: { rows, count }
      }
    });
  }, [navigate, tab, churchId, debouncedSearch, sortField, sortDirection]);

  // Handle record created
  const handleRecordCreated = useCallback(() => {
    setAddOpen(false);
    setPage(1);
  }, []);

  // Handle records imported
  const handleRecordsImported = useCallback((count: number) => {
    setImportOpen(false);
    setPage(1);
  }, []);

  // AG Grid handlers
  const handleGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api;
    gridColumnApiRef.current = params.columnApi;
    setIsGridReady(true);
    // Apply initial search term if it exists
    requestAnimationFrame(() => {
      if (search && typeof params.api.setQuickFilter === 'function') {
        params.api.setQuickFilter(search);
        params.api.onFilterChanged();
      }
    });
  }, [search]);

  // Update quick filter when search term changes
  useEffect(() => {
    if (isGridReady && gridApiRef.current && search !== undefined) {
      if (typeof gridApiRef.current.setQuickFilter === 'function') {
        gridApiRef.current.setQuickFilter(search);
        gridApiRef.current.onFilterChanged();
      }
    }
  }, [search, isGridReady]);

  const handleExport = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.exportDataAsCsv();
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    if (isGridReady && gridApiRef.current) {
      // Clear column filters
      gridApiRef.current.setFilterModel(null);
      // Force grid refresh
      gridApiRef.current.onFilterChanged();
      // Clear search term
      setSearch('');
    }
  }, [isGridReady]);

  const handleColumnsClick = useCallback(() => {
    if (!isGridReady || !gridApiRef.current) return;
    
    // Get all columns (including hidden ones)
    const allColumns = gridApiRef.current.getAllGridColumns() || [];
    const visibility: Record<string, boolean> = {};
    
    allColumns.forEach((column) => {
      const colId = column.getColId();
      const colDef = column.getColDef();
      // Skip the checkbox selection column
      if (!colDef.checkboxSelection && colId) {
        visibility[colId] = column.isVisible();
      }
    });
    
    setColumnVisibility(visibility);
    setColumnsDialogOpen(true);
  }, [isGridReady]);

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

  const handleCloseColumnsDialog = useCallback(() => {
    setColumnsDialogOpen(false);
  }, []);

  // Format date for display
  const formatDate = (input: string | null) => {
    if (!input) return '';
    const s = String(input).trim();
    // Normalize compact YYYYMMDD → YYYY-MM-DD
    const normalized = /^\d{8}$/.test(s) ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}` : s;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
  };

  // Get total records count display
  const getPageRange = () => {
    return `Total: ${count} records`;
  };

  return (
    <Box className="p-4">
      {/* Record Header Banner - Loads settings dynamically */}
      <Box sx={{ mb: 4 }}>
        <RecordHeaderBanner
          key={headerKey} // Force remount when settings are updated
          churchId={churchId}
          recordType={tab}
          churchName={churchName || churches.find(c => c.id === churchId)?.name}
        />
      </Box>

      {/* Filter Row */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 4, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Church</InputLabel>
          <Select
            value={churchId}
            onChange={handleChurchChange}
            label="Church"
            renderValue={() => churchName || churches.find(c => c.id === churchId)?.name || `Church #${churchId}`}
          >
            {churches.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Church Settings Button */}
        <Button
          variant="outlined"
          onClick={() => navigate(`/apps/church-management/edit/${churchId}`)}
          sx={{
            borderColor: theme.palette.mode === 'dark' 
              ? theme.palette.text.primary 
              : '#1976d2',
            color: theme.palette.mode === 'dark' 
              ? theme.palette.text.primary 
              : '#1976d2',
            textTransform: 'none',
            '&:hover': {
              borderColor: theme.palette.mode === 'dark' 
                ? theme.palette.text.secondary 
                : '#1565c0',
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(25, 118, 210, 0.04)',
            },
          }}
        >
          Church Settings
        </Button>

        {/* Import Records Button - keep in filter row */}
        <Box sx={{ ml: 'auto' }}>
          <ImportRecordsButton onClick={handleImportRecords} disabled={loading} />
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab value="baptism" label="Baptism Records" />
          <Tab value="marriage" label="Marriage Records" />
          <Tab value="funeral" label="Funeral Records" />
        </Tabs>
      </Box>

      {/* Records Count */}
      <Box className="mb-3">
        <Typography variant="body2" color="text.secondary">
          {getPageRange()}
        </Typography>
      </Box>

      {/* Search, Add Record, and Switch to AG - Above Grid */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', mb: 2 }}>
        {/* Search Bar */}
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-start', minWidth: '200px' }}>
          <TextField
            placeholder="Search records..."
            variant="outlined"
            size="small"
            value={search}
            onChange={handleSearchChange}
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

        {/* Add Record and Switch to AG Buttons */}
        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <AddRecordButton onClick={handleAddRecord} disabled={loading} recordType={tab} />
          <AdvancedGridButton onClick={handleAdvancedGrid} disabled={loading} />
        </Box>

        {/* Action Buttons on Right */}
        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', ml: 'auto' }}>
          <Button
            variant="outlined"
            startIcon={<IconDownload size={18} />}
            onClick={handleExport}
            sx={{
              borderColor: theme.palette.mode === 'dark' 
                ? theme.palette.text.primary 
                : '#1976d2',
              color: theme.palette.mode === 'dark' 
                ? theme.palette.text.primary 
                : '#1976d2',
              textTransform: 'none',
              '&:hover': {
                borderColor: theme.palette.mode === 'dark' 
                  ? theme.palette.text.secondary 
                  : '#1565c0',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? theme.palette.action.hover 
                  : 'rgba(25, 118, 210, 0.04)',
              },
            }}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconEye size={18} />}
            onClick={handleColumnsClick}
            sx={{
              borderColor: theme.palette.mode === 'dark' 
                ? theme.palette.text.primary 
                : '#1976d2',
              color: theme.palette.mode === 'dark' 
                ? theme.palette.text.primary 
                : '#1976d2',
              textTransform: 'none',
              '&:hover': {
                borderColor: theme.palette.mode === 'dark' 
                  ? theme.palette.text.secondary 
                  : '#1565c0',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? theme.palette.action.hover 
                  : 'rgba(25, 118, 210, 0.04)',
              },
            }}
          >
            Columns
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconRefresh size={18} />}
            onClick={handleResetFilters}
            sx={{
              borderColor: theme.palette.mode === 'dark' 
                ? theme.palette.text.primary 
                : '#1976d2',
              color: theme.palette.mode === 'dark' 
                ? theme.palette.text.primary 
                : '#1976d2',
              textTransform: 'none',
              '&:hover': {
                borderColor: theme.palette.mode === 'dark' 
                  ? theme.palette.text.secondary 
                  : '#1565c0',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? theme.palette.action.hover 
                  : 'rgba(25, 118, 210, 0.04)',
              },
            }}
          >
            Reset Filters
          </Button>
        </Box>
      </Box>

      {/* AG Grid Table with Side Images - Matching Samples.tsx styling */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            width: '100%',
          }}
        >
          {/* AG Grid - Center */}
          <Paper
            sx={{
              flex: 1,
              height: 600,
              width: '100%',
              overflow: 'hidden',
              backgroundColor: theme.palette.background.paper,
              position: 'relative',
              '& .ag-theme-alpine': {
                '& .ag-header': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#f5f5f5',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                },
                '& .ag-header-cell': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#f5f5f5',
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                },
                '& .ag-row': {
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                },
                '& .ag-row:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
                '& .ag-paging-panel': {
                  backgroundColor: theme.palette.background.paper,
                  borderTop: `1px solid ${theme.palette.divider}`,
                  padding: '8px',
                },
              },
            }}
          >
            <div
              className="ag-theme-quartz"
              style={{
                height: '100%',
                width: '100%',
              }}
            >
              <AgGridReact
                key={tab}
                theme="legacy"
                rowData={rows}
                columnDefs={columnDefs}
                onGridReady={handleGridReady}
                pagination={true}
                paginationPageSize={100}
                paginationPageSizeSelector={[50, 100, 200, 500, 1000]}
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
        </Box>
      )}

      {/* Column Visibility Dialog */}
      <Dialog
        open={columnsDialogOpen}
        onClose={handleCloseColumnsDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Columns</DialogTitle>
        <DialogContent>
          <List>
            {isGridReady && gridApiRef.current && (() => {
              const allColumns = gridApiRef.current?.getAllGridColumns() || [];
              return allColumns
                .filter((column) => {
                  const colDef = column.getColDef();
                  // Skip the checkbox selection column
                  return !colDef.checkboxSelection;
                })
                .map((column) => {
                  const colId = column.getColId();
                  const colDef = column.getColDef();
                  const headerName = colDef.headerName || colId;
                  const isVisible = columnVisibility[colId] ?? column.isVisible();
                  
                  return (
                    <ListItem key={colId} disablePadding>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isVisible}
                            onChange={() => handleToggleColumn(colId)}
                          />
                        }
                        label={headerName}
                        sx={{ width: '100%' }}
                      />
                    </ListItem>
                  );
                });
            })()}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseColumnsDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modals */}
      <AddRecordModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        table={tab}
        churchId={churchId}
        onCreated={handleRecordCreated}
      />
      <ImportRecordsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        table={tab}
        churchId={churchId}
        onImported={handleRecordsImported}
      />
    </Box>
  );
}
