import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import {
    IconLink,
    IconPlus,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

// Known pages/components for quick selection
const KNOWN_PAGES = [
  { key: 'component:Header', label: 'Header Component' },
  { key: 'component:Sidebar', label: 'Sidebar Component' },
  { key: 'component:Footer', label: 'Footer Component' },
  { key: 'component:Login', label: 'Login Page' },
  { key: 'route:/apps/gallery', label: 'Gallery Page' },
  { key: 'route:/apps/records/baptism', label: 'Baptism Records' },
  { key: 'route:/apps/records/marriage', label: 'Marriage Records' },
  { key: 'route:/apps/records/funeral', label: 'Funeral Records' },
  { key: 'route:/dashboards/user', label: 'User Dashboard' },
  { key: 'feature:record-header-banner', label: 'Record Header Banner' },
  { key: 'feature:certificates', label: 'Certificates' },
];

// Known image_keys for quick selection
const KNOWN_IMAGE_KEYS = [
  'nav.logo',
  'nav.logo.dark',
  'nav.logo.light',
  'header.main',
  'header.background',
  'hero.banner',
  'bg.pattern',
  'bg.tiled',
  'record.logo',
  'record.image',
  'record.background',
  'record.gradient',
  'record.border.horizontal',
  'record.border.vertical',
  'footer.logo',
  'favicon',
];

interface Binding {
  id: number;
  page_key: string;
  image_key: string;
  scope: 'global' | 'church';
  church_id: number | null;
  church_name?: string;
  image_path: string;
  priority: number;
  enabled: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PageSummary {
  page_key: string;
  binding_count: number;
  image_key_count: number;
  global_count: number;
  church_count: number;
}

interface ChurchOption {
  id: number;
  name: string;
}

interface RegistryImage {
  id: number;
  image_path: string;
  category: string | null;
  label: string | null;
}

const PageImageIndex: React.FC = () => {
  const theme = useTheme();

  // State
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [selectedPageKey, setSelectedPageKey] = useState<string>('');
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [bindingsByKey, setBindingsByKey] = useState<Record<string, { global: Binding | null; churches: Binding[] }>>({});
  const [loading, setLoading] = useState(false);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [registryImages, setRegistryImages] = useState<RegistryImage[]>([]);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Bind dialog state
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [bindPageKey, setBindPageKey] = useState('');
  const [bindImageKey, setBindImageKey] = useState('');
  const [bindScope, setBindScope] = useState<'global' | 'church'>('global');
  const [bindChurchId, setBindChurchId] = useState<number | null>(null);
  const [bindImagePath, setBindImagePath] = useState('');
  const [bindNotes, setBindNotes] = useState('');
  const [bindSaving, setBindSaving] = useState(false);

  // Load all pages on mount
  useEffect(() => {
    fetchPages();
    fetchChurches();
  }, []);

  // Load bindings when page selected
  useEffect(() => {
    if (selectedPageKey) {
      fetchPageIndex(selectedPageKey);
    } else {
      setBindings([]);
      setBindingsByKey({});
    }
  }, [selectedPageKey]);

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/gallery/admin/images/all-pages', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  };

  const fetchPageIndex = async (pageKey: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gallery/admin/images/page-index?page_key=${encodeURIComponent(pageKey)}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setBindings(data.all_bindings || []);
        setBindingsByKey(data.bindings_by_key || {});
      }
    } catch (error) {
      console.error('Error fetching page index:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChurches = async () => {
    try {
      const response = await fetch('/api/admin/churches', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const list = (data.data || data.churches || data || [])
          .filter((c: any) => c && c.id)
          .map((c: any) => ({ id: c.id, name: c.name || c.church_name || `Church ${c.id}` }));
        setChurches(list);
      }
    } catch (error) {
      console.error('Error fetching churches:', error);
    }
  };

  const fetchRegistry = async () => {
    try {
      const response = await fetch('/api/gallery/admin/images/registry', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setRegistryImages(data.images || []);
      }
    } catch (error) {
      console.error('Error fetching registry:', error);
    }
  };

  const handleSyncRegistry = async () => {
    setSyncStatus('Syncing...');
    try {
      const response = await fetch('/api/gallery/admin/images/registry/sync', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(`Synced: ${data.discovered} discovered, ${data.inserted} new, ${data.skipped} existing`);
        fetchRegistry();
      } else {
        setSyncStatus('Sync failed');
      }
    } catch (error) {
      setSyncStatus('Sync error');
      console.error('Error syncing registry:', error);
    }
  };

  const handleOpenBindDialog = (pageKey?: string) => {
    setBindPageKey(pageKey || selectedPageKey || '');
    setBindImageKey('');
    setBindScope('global');
    setBindChurchId(null);
    setBindImagePath('');
    setBindNotes('');
    setBindDialogOpen(true);
    if (registryImages.length === 0) {
      fetchRegistry();
    }
  };

  const handleSaveBinding = async () => {
    if (!bindPageKey || !bindImageKey || !bindImagePath) {
      alert('page_key, image_key, and image_path are all required');
      return;
    }
    setBindSaving(true);
    try {
      const response = await fetch('/api/gallery/admin/images/bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          page_key: bindPageKey,
          image_key: bindImageKey,
          scope: bindScope,
          church_id: bindScope === 'church' ? bindChurchId : null,
          image_path: bindImagePath,
          notes: bindNotes || null,
        }),
      });
      if (response.ok) {
        setBindDialogOpen(false);
        fetchPages();
        if (selectedPageKey) fetchPageIndex(selectedPageKey);
      } else {
        const err = await response.json();
        alert(`Error: ${err.error || 'Failed to save binding'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setBindSaving(false);
    }
  };

  const handleDeleteBinding = async (binding: Binding) => {
    if (!window.confirm(`Delete binding ${binding.page_key} → ${binding.image_key} (${binding.scope})?`)) return;
    try {
      const response = await fetch('/api/gallery/admin/images/bindings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: binding.id }),
      });
      if (response.ok) {
        fetchPages();
        if (selectedPageKey) fetchPageIndex(selectedPageKey);
      } else {
        const err = await response.json();
        alert(`Error: ${err.error || 'Failed to delete'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 700,
          mb: 1,
          fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
        }}
      >
        Page Image Index
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Map images to pages/components. Resolution: church override &gt; global &gt; default.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<IconPlus size={18} />}
          onClick={() => handleOpenBindDialog()}
          sx={{ backgroundColor: '#C8A24B', color: '#1a1a1a', '&:hover': { backgroundColor: '#B8923A' } }}
        >
          New Binding
        </Button>
        <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={handleSyncRegistry}>
          Sync Registry
        </Button>
        {syncStatus && (
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {syncStatus}
          </Typography>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Left: Page list */}
        <Paper sx={{ width: { xs: '100%', md: 320 }, minWidth: 280, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Pages with Bindings</Typography>
          {pages.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No bindings yet. Create one to get started.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {pages.map((page) => (
                <Button
                  key={page.page_key}
                  fullWidth
                  variant={selectedPageKey === page.page_key ? 'contained' : 'text'}
                  onClick={() => setSelectedPageKey(page.page_key)}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    textAlign: 'left',
                    ...(selectedPageKey === page.page_key
                      ? { backgroundColor: '#C8A24B', color: '#1a1a1a', '&:hover': { backgroundColor: '#B8923A' } }
                      : {}),
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                      {page.page_key}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {page.image_key_count} keys, {page.global_count}G / {page.church_count}C
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick Add Page</Typography>
          <Stack spacing={1}>
            {KNOWN_PAGES.filter(kp => !pages.some(p => p.page_key === kp.key)).slice(0, 5).map((kp) => (
              <Button
                key={kp.key}
                size="small"
                variant="outlined"
                onClick={() => {
                  setSelectedPageKey(kp.key);
                  handleOpenBindDialog(kp.key);
                }}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: '0.75rem' }}
              >
                {kp.label}
              </Button>
            ))}
          </Stack>
        </Paper>

        {/* Right: Bindings for selected page */}
        <Box sx={{ flex: 1 }}>
          {selectedPageKey ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {selectedPageKey}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<IconPlus size={16} />}
                  onClick={() => handleOpenBindDialog(selectedPageKey)}
                  size="small"
                >
                  Add Binding
                </Button>
              </Box>

              {loading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : Object.keys(bindingsByKey).length === 0 ? (
                <Alert severity="info">No bindings for this page. Click "Add Binding" to create one.</Alert>
              ) : (
                <Stack spacing={2}>
                  {Object.entries(bindingsByKey).map(([imageKey, group]) => (
                    <Paper key={imageKey} sx={{ p: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                        <IconLink size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {imageKey}
                      </Typography>

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Scope</TableCell>
                              <TableCell>Church</TableCell>
                              <TableCell>Image Path</TableCell>
                              <TableCell>Enabled</TableCell>
                              <TableCell>Notes</TableCell>
                              <TableCell width={60}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.global && (
                              <TableRow>
                                <TableCell>
                                  <Chip label="Global" size="small" sx={{ backgroundColor: 'rgba(33, 150, 243, 0.15)', color: 'info.main', fontWeight: 600 }} />
                                </TableCell>
                                <TableCell>—</TableCell>
                                <TableCell sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
                                  {group.global.image_path}
                                </TableCell>
                                <TableCell>{group.global.enabled ? 'Yes' : 'No'}</TableCell>
                                <TableCell sx={{ fontSize: '0.75rem' }}>{group.global.notes || ''}</TableCell>
                                <TableCell>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteBinding(group.global!)}>
                                    <IconTrash size={16} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            )}
                            {group.churches.map((b) => (
                              <TableRow key={b.id}>
                                <TableCell>
                                  <Chip label="Church" size="small" sx={{ backgroundColor: 'rgba(156, 39, 176, 0.15)', color: 'secondary.main', fontWeight: 600 }} />
                                </TableCell>
                                <TableCell>{b.church_name || `#${b.church_id}`}</TableCell>
                                <TableCell sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
                                  {b.image_path}
                                </TableCell>
                                <TableCell>{b.enabled ? 'Yes' : 'No'}</TableCell>
                                <TableCell sx={{ fontSize: '0.75rem' }}>{b.notes || ''}</TableCell>
                                <TableCell>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteBinding(b)}>
                                    <IconTrash size={16} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  ))}
                </Stack>
              )}
            </>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <IconSearch size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="h6" color="text.secondary">
                Select a page from the list or create a new binding
              </Typography>
            </Paper>
          )}
        </Box>
      </Stack>

      {/* Bind Image Dialog */}
      <Dialog open={bindDialogOpen} onClose={() => setBindDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create Image Binding
          <IconButton
            onClick={() => setBindDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Page Key */}
            <Autocomplete
              freeSolo
              options={KNOWN_PAGES.map(p => p.key)}
              value={bindPageKey}
              onInputChange={(_, value) => setBindPageKey(value)}
              renderInput={(params) => (
                <TextField {...params} label="Page Key" placeholder="e.g. component:Header or route:/apps/gallery" fullWidth />
              )}
              sx={{ mb: 2 }}
            />

            {/* Image Key */}
            <Autocomplete
              freeSolo
              options={KNOWN_IMAGE_KEYS}
              value={bindImageKey}
              onInputChange={(_, value) => setBindImageKey(value)}
              renderInput={(params) => (
                <TextField {...params} label="Image Key" placeholder="e.g. nav.logo, header.main" fullWidth />
              )}
              sx={{ mb: 2 }}
            />

            {/* Image Path */}
            <Autocomplete
              freeSolo
              options={registryImages.map(img => img.image_path)}
              value={bindImagePath}
              onInputChange={(_, value) => setBindImagePath(value)}
              renderInput={(params) => (
                <TextField {...params} label="Image Path" placeholder="/images/logos/om-logo.png" fullWidth />
              )}
              sx={{ mb: 2 }}
            />

            {/* Scope */}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Scope</FormLabel>
              <RadioGroup
                row
                value={bindScope}
                onChange={(e) => setBindScope(e.target.value as 'global' | 'church')}
              >
                <FormControlLabel value="global" control={<Radio />} label="Global (all churches)" />
                <FormControlLabel value="church" control={<Radio />} label="Specific church" />
              </RadioGroup>
            </FormControl>

            {/* Church selector */}
            {bindScope === 'church' && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Church</InputLabel>
                <Select
                  value={bindChurchId || ''}
                  label="Church"
                  onChange={(e) => setBindChurchId(e.target.value ? parseInt(String(e.target.value)) : null)}
                >
                  {churches.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name} (ID: {c.id})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Notes */}
            <TextField
              fullWidth
              label="Notes (optional)"
              value={bindNotes}
              onChange={(e) => setBindNotes(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBindDialogOpen(false)} disabled={bindSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveBinding}
            variant="contained"
            disabled={bindSaving || !bindPageKey || !bindImageKey || !bindImagePath || (bindScope === 'church' && !bindChurchId)}
            sx={{ backgroundColor: '#C8A24B', color: '#1a1a1a', '&:hover': { backgroundColor: '#B8923A' } }}
          >
            {bindSaving ? 'Saving...' : 'Save Binding'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PageImageIndex;
