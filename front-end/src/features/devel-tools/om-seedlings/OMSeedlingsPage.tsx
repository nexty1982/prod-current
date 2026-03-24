/**
 * OMSeedlings — Mass-generate sacramental records for onboarded churches.
 * Uses POST /api/admin/seed-records (dry_run + insert + purge).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  alpha,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  Paper,
  Slider,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Storage as SeedIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Developer Tools' },
  { title: 'OM Seedlings' },
];

interface Church {
  id: number;
  name: string;
  database_name?: string;
}

const RECORD_TYPES = [
  { value: 'baptism', label: 'Baptism', color: '#1565c0' },
  { value: 'marriage', label: 'Marriage', color: '#7b1fa2' },
  { value: 'funeral', label: 'Funeral', color: '#455a64' },
] as const;

const PREVIEW_COLUMNS: Record<string, string[]> = {
  baptism: ['Name', 'Birth Date', 'Baptism Date', 'Birthplace', 'Parents', 'Sponsors', 'Clergy'],
  marriage: ['Groom', 'Bride', 'Date', 'Groom Parents', 'Bride Parents', 'Witnesses', 'Clergy'],
  funeral: ['Name', 'Age', 'Date of Death', 'Burial Date', 'Burial Location', 'Clergy'],
};

function getPreviewRow(record: any, type: string): string[] {
  if (type === 'baptism') {
    return [
      `${record.first_name} ${record.last_name}`, record.birth_date,
      record.reception_date, record.birthplace, record.parents, record.sponsors, record.clergy,
    ];
  }
  if (type === 'marriage') {
    return [
      `${record.fname_groom} ${record.lname_groom}`, `${record.fname_bride} ${record.lname_bride}`,
      record.mdate, record.parentsg, record.parentsb, record.witness, record.clergy,
    ];
  }
  return [
    `${record.name} ${record.lastname}`, String(record.age),
    record.deceased_date, record.burial_date, record.burial_location, record.clergy,
  ];
}

async function apiJson(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  return res.json();
}

export default function OMSeedlingsPage() {
  const theme = useTheme();

  // Church selection
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [loadingChurches, setLoadingChurches] = useState(true);

  // Seed config
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['baptism', 'marriage', 'funeral']);
  const [count, setCount] = useState(100);
  const [yearRange, setYearRange] = useState<[number, number]>([1960, 2025]);

  // Counts
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);

  // Preview
  const [preview, setPreview] = useState<{ type: string; records: any[]; total: number }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Seed
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{ type: string; done: boolean; inserted: number }[]>([]);

  // Purge
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Load onboarded churches
  useEffect(() => {
    (async () => {
      try {
        const res = await apiJson('/api/churches');
        const list = res?.data?.churches || res?.churches || res?.data || [];
        setChurches(Array.isArray(list) ? list : []);
      } catch { setChurches([]); }
      finally { setLoadingChurches(false); }
    })();
  }, []);

  // Load record counts when church changes
  const loadCounts = useCallback(async () => {
    if (!selectedChurch) return;
    setCountsLoading(true);
    try {
      const results: Record<string, number> = {};
      for (const t of ['baptism', 'marriage', 'funeral']) {
        try {
          const res = await apiJson(`/api/churches/${selectedChurch.id}/records?type=${t}&limit=0`);
          results[t] = res?.data?.total ?? res?.total ?? 0;
        } catch { results[t] = -1; }
      }
      setCounts(results);
    } catch { setCounts(null); }
    finally { setCountsLoading(false); }
  }, [selectedChurch]);

  useEffect(() => { if (selectedChurch) loadCounts(); }, [selectedChurch, loadCounts]);

  // Preview
  const handlePreview = async () => {
    if (!selectedChurch || selectedTypes.length === 0) return;
    setPreviewLoading(true);
    setPreview([]);
    try {
      const results = [];
      for (const type of selectedTypes) {
        const res = await apiJson('/api/admin/seed-records', {
          method: 'POST',
          body: JSON.stringify({
            church_id: selectedChurch.id, record_type: type,
            count, year_start: yearRange[0], year_end: yearRange[1], dry_run: true,
          }),
        });
        results.push({ type, records: res.preview || [], total: res.total || 0 });
      }
      setPreview(results);
    } catch (err: any) {
      setToast({ msg: 'Preview failed', severity: 'error' });
    }
    setPreviewLoading(false);
  };

  // Seed all selected types
  const handleSeed = async () => {
    if (!selectedChurch || selectedTypes.length === 0) return;
    setSeeding(true);
    setSeedProgress([]);
    const progress: typeof seedProgress = [];
    for (const type of selectedTypes) {
      progress.push({ type, done: false, inserted: 0 });
      setSeedProgress([...progress]);
      try {
        const res = await apiJson('/api/admin/seed-records', {
          method: 'POST',
          body: JSON.stringify({
            church_id: selectedChurch.id, record_type: type,
            count, year_start: yearRange[0], year_end: yearRange[1],
          }),
        });
        progress[progress.length - 1] = { type, done: true, inserted: res.inserted || 0 };
        setSeedProgress([...progress]);
      } catch {
        progress[progress.length - 1] = { type, done: true, inserted: -1 };
        setSeedProgress([...progress]);
      }
    }
    setSeeding(false);
    const total = progress.reduce((s, p) => s + Math.max(0, p.inserted), 0);
    setToast({ msg: `Seeded ${total.toLocaleString()} records into ${selectedChurch.name}`, severity: 'success' });
    loadCounts();
    setPreview([]);
  };

  // Purge all selected types
  const handlePurge = async () => {
    if (!selectedChurch) return;
    setPurging(true);
    for (const type of selectedTypes) {
      try {
        await apiJson('/api/admin/seed-records', {
          method: 'POST',
          body: JSON.stringify({ church_id: selectedChurch.id, record_type: type, count: 0, purge: true }),
        });
      } catch { /* ignore */ }
    }
    setPurging(false);
    setPurgeOpen(false);
    setToast({ msg: `Purged ${selectedTypes.join(', ')} records from ${selectedChurch.name}`, severity: 'warning' });
    loadCounts();
    setPreview([]);
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    setPreview([]);
  };

  return (
    <PageContainer title="OM Seedlings" description="Mass-generate sacramental records">
      <Breadcrumb title="OM Seedlings" items={BCrumb} />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            <SeedIcon sx={{ verticalAlign: 'text-bottom', mr: 1 }} />
            OM Seedlings — Record Generator
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Mass-populate church databases with realistic sacramental records for testing and demos.
          </Typography>

          {/* Church selector */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Church</Typography>
            <Autocomplete
              options={churches}
              loading={loadingChurches}
              getOptionLabel={(c) => `[${c.id}] ${c.name}${c.database_name ? ` — ${c.database_name}` : ''}`}
              value={selectedChurch}
              onChange={(_e, v) => { setSelectedChurch(v); setCounts(null); setPreview([]); setSeedProgress([]); }}
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder="Search churches..." variant="outlined" />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>{option.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {option.id} &bull; DB: {option.database_name || 'N/A'}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          </Box>

          {/* Current counts */}
          {selectedChurch && (
            <Box sx={{ mb: 3, p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderRadius: 2, border: `1px solid ${alpha(theme.palette.info.main, 0.12)}` }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="subtitle2" sx={{ mr: 1 }}>
                  Current Records in {selectedChurch.name}:
                </Typography>
                {countsLoading ? (
                  <CircularProgress size={16} />
                ) : counts ? (
                  <>
                    {RECORD_TYPES.map(rt => (
                      <Chip
                        key={rt.value}
                        size="small"
                        label={`${rt.label}: ${counts[rt.value] === -1 ? 'N/A' : counts[rt.value].toLocaleString()}`}
                        sx={{ bgcolor: alpha(rt.color, 0.1), color: rt.color, fontWeight: 600 }}
                      />
                    ))}
                    <Tooltip title="Refresh counts">
                      <Button size="small" onClick={loadCounts} startIcon={<RefreshIcon />}>Refresh</Button>
                    </Tooltip>
                  </>
                ) : null}
              </Stack>
            </Box>
          )}

          {/* Config */}
          {selectedChurch && (
            <>
              <Divider sx={{ mb: 3 }} />

              {/* Record types */}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Record Types to Generate</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                {RECORD_TYPES.map(rt => (
                  <FormControlLabel
                    key={rt.value}
                    control={
                      <Checkbox
                        checked={selectedTypes.includes(rt.value)}
                        onChange={() => toggleType(rt.value)}
                        size="small"
                        sx={{ color: rt.color, '&.Mui-checked': { color: rt.color } }}
                      />
                    }
                    label={rt.label}
                  />
                ))}
              </Stack>

              {/* Count + year range */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 3 }}>
                <Box sx={{ width: 160 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Records per Type</Typography>
                  <TextField
                    type="number"
                    size="small"
                    fullWidth
                    value={count}
                    onChange={(e) => setCount(Math.min(5000, Math.max(1, parseInt(e.target.value) || 1)))}
                    inputProps={{ min: 1, max: 5000 }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Year Range: {yearRange[0]} — {yearRange[1]}
                  </Typography>
                  <Slider
                    value={yearRange}
                    onChange={(_, v) => setYearRange(v as [number, number])}
                    min={1800}
                    max={2026}
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Stack>

              {/* Summary */}
              <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
                Will generate <strong>{(count * selectedTypes.length).toLocaleString()}</strong> total records
                ({selectedTypes.map(t => `${count.toLocaleString()} ${t}`).join(' + ')})
                spanning {yearRange[0]}–{yearRange[1]} into <strong>{selectedChurch.database_name || `church ${selectedChurch.id}`}</strong>.
              </Alert>

              {/* Actions */}
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={previewLoading ? <CircularProgress size={16} /> : <PreviewIcon />}
                  onClick={handlePreview}
                  disabled={previewLoading || selectedTypes.length === 0}
                >
                  Preview
                </Button>
                <Button
                  variant="contained"
                  startIcon={seeding ? <CircularProgress size={16} color="inherit" /> : <SeedIcon />}
                  onClick={handleSeed}
                  disabled={seeding || selectedTypes.length === 0}
                  color="primary"
                >
                  Seed {(count * selectedTypes.length).toLocaleString()} Records
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setPurgeOpen(true)}
                  disabled={selectedTypes.length === 0}
                >
                  Purge Selected Types
                </Button>
              </Stack>

              {/* Seed progress */}
              {seedProgress.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  {seedProgress.map((sp, i) => (
                    <Stack key={sp.type} direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" sx={{ width: 80, fontWeight: 600 }}>
                        {sp.type}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant={sp.done ? 'determinate' : 'indeterminate'}
                          value={sp.done ? 100 : undefined}
                          color={sp.inserted === -1 ? 'error' : 'primary'}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ width: 100 }}>
                        {sp.done ? (sp.inserted === -1 ? 'Failed' : `${sp.inserted.toLocaleString()} inserted`) : 'Seeding...'}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              )}
            </>
          )}

          {/* Preview tables */}
          {preview.map(p => (
            <Paper key={p.type} variant="outlined" sx={{ mb: 2, borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1, bgcolor: alpha(RECORD_TYPES.find(r => r.value === p.type)?.color || '#999', 0.08), borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {p.type.charAt(0).toUpperCase() + p.type.slice(1)} — {p.total.toLocaleString()} records (showing first {p.records.length})
                </Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 260 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {(PREVIEW_COLUMNS[p.type] || []).map((col, i) => (
                        <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {p.records.map((rec, ri) => (
                      <TableRow key={ri}>
                        {getPreviewRow(rec, p.type).map((val, ci) => (
                          <TableCell key={ci} sx={{ fontSize: '0.75rem', maxWidth: 180 }}>
                            <Tooltip title={val || ''}>
                              <Typography variant="body2" fontSize="0.75rem" noWrap>{val}</Typography>
                            </Tooltip>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}
        </CardContent>
      </Card>

      {/* Purge dialog */}
      <Dialog open={purgeOpen} onClose={() => setPurgeOpen(false)}>
        <DialogTitle>Purge Records?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This will permanently delete <strong>all {selectedTypes.join(', ')}</strong> records from{' '}
            <strong>{selectedChurch?.name}</strong> ({selectedChurch?.database_name}).
          </Alert>
          <Typography variant="body2" color="textSecondary">
            This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurgeOpen(false)}>Cancel</Button>
          <Button onClick={handlePurge} variant="contained" color="error" disabled={purging}>
            {purging ? 'Purging...' : 'Purge All Selected'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">{toast.msg}</Alert> : undefined}
      </Snackbar>
    </PageContainer>
  );
}
