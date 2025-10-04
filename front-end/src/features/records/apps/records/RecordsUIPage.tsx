import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Button
} from '@mui/material';
import { 
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { listRecords, type TableKey, type SortDir } from '@/shared/lib/recordsApi';
import { AddRecordModal, ImportRecordsModal } from './components';
import { useNavigate } from 'react-router-dom';
import { RecordsActionButtons } from '@/features/records/records/BrandButtons';

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
  const navigate = useNavigate();
  const [tab, setTab] = useState<TableKey>('baptism');
  const [churches, setChurches] = useState<Church[]>([]);
  const [churchId, setChurchId] = useState<number>(46);
  const [churchName, setChurchName] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortField, setSortField] = useState('dateOfBaptism'); // Default for baptism tab
  const [sortDirection, setSortDirection] = useState<SortDir>('desc');
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
        if (!items.find((c: any) => c.id === churchId) && items[0]) {
          setChurchId(items[0].id);
        }
      } catch (err) {
        console.error('Failed to load churches:', err);
      }
    })();
  }, [churchId]);

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

  // Sync church name when churches list loads
  useEffect(() => {
    const match = churches.find(c => c.id === churchId);
    if (match && !churchName) {
      setChurchName(match.name);
    }
  }, [churches, churchId, churchName]);

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
        if (church?.name) setChurchName(church.name);
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
  }, [tab, churchId, page, limit, debouncedSearch, sortField, sortDirection]);

  // Columns per tab - using aliased field names from backend
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

  // Handle limit change
  const handleLimitChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(1);
  }, []);

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

  // Format date for display
  const formatDate = (input: string | null) => {
    if (!input) return '';
    const s = String(input).trim();
    // Normalize compact YYYYMMDD → YYYY-MM-DD
    const normalized = /^\d{8}$/.test(s) ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}` : s;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
  };

  // Get current page display range
  const getPageRange = () => {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, count);
    return `${start}-${end} of ${count}`;
  };

  return (
    <Box className="p-4">
      {/* Filter Row */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 4, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search records by name…"
          value={search}
          onChange={handleSearchChange}
          sx={{ minWidth: 300 }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Church</InputLabel>
          <Select
            value={churchId}
            onChange={handleChurchChange}
            label="Church"
            renderValue={() => (churchName || `Church #${churchId}`)}
          >
            {churches.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton onClick={handleRefresh} title="Refresh">
          <RefreshIcon />
        </IconButton>

        {/* RIGHT side buttons */}
        <RecordsActionButtons
          onAdd={handleAddRecord}
          onImport={handleImportRecords}
          onAdvanced={handleAdvancedGrid}
          loading={loading}
        />
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

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.sortable ? (
                      <TableSortLabel
                        active={sortField === column.key}
                        direction={sortField === column.key ? sortDirection : 'asc'}
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <Alert severity="error">{error}</Alert>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={`${tab}-${row.id}`}>
                    {columns.map((column) => {
                      let cellValue: any = row[column.key] || '';

                      // Convert complex objects to strings for display
                      let displayValue: string = '';
                      if (cellValue === null || cellValue === undefined) {
                        displayValue = '';
                      } else if (typeof cellValue === 'object') {
                        // Handle objects/arrays by converting to readable string
                        if (Array.isArray(cellValue)) {
                          displayValue = cellValue.join(', ');
                        } else {
                          // For objects, try to extract meaningful values
                          try {
                            const values = Object.values(cellValue).filter(v => v !== null && v !== undefined);
                            displayValue = values.join(', ') || '[Object]';
                          } catch {
                            displayValue = '[Object]';
                          }
                        }
                      } else {
                        displayValue = String(cellValue);
                      }

                      return (
                        <TableCell key={column.key}>
                          {column.key.includes('Date') || column.key.includes('date')
                            ? formatDate(displayValue)
                            : displayValue}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={count}
          page={page - 1} // Convert from 1-based to 0-based
          rowsPerPage={limit}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleLimitChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

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
      
             {/* Advanced Grid Dialog */}
      
      
    </Box>
  );
}