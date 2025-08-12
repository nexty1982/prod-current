import React, { useEffect, useState } from 'react';
import {
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Typography, 
  Divider, 
  Box, 
  CircularProgress, 
  Switch, 
  FormControlLabel, 
  Select, 
  MenuItem, 
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  Avatar,
  Tooltip,
  Paper
} from '@mui/material';
import { 
  IconEdit, 
  IconTrash, 
  IconUserPlus, 
  IconKey,
  IconUsers,
  IconSettings,
  IconDatabase
} from '@tabler/icons-react';

const SECTION_STYLE = { mb: 3, p: 2, borderRadius: 2, background: '#fafbfc', border: '1px solid #eee' };

// Language options for Orthodox churches
const CHURCH_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ro', name: 'Romanian (Română)' },
  { code: 'ka', name: 'Georgian (ქართული)' }
];

// Common Orthodox record types
const ORTHODOX_RECORD_TYPES = [
  'baptism',
  'chrismation', 
  'marriage',
  'funeral',
  'ordination',
  'blessing',
  'memorial_service'
];

interface ChurchFormData {
  id?: number;
  name?: string;
  slug?: string;
  records_database_name?: string;
  avatar_dir?: string;
  ocr_upload_dir?: string;
  calendar_type?: string;
  show_fast_days?: boolean;
  show_local_saints?: boolean;
  theme_color?: string;
  enable_ocr?: boolean;
  enable_certificates?: boolean;
  enable_liturgical_calendar?: boolean;
  enable_invoicing?: boolean;
  enable_audit_logs?: boolean;
  created_at?: string;
  updated_at?: string;
  language?: string;
  record_types?: string[];
  [key: string]: any;
}

interface ChurchUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login?: string;
}

interface EditChurchModalProps {
  open: boolean;
  onClose: () => void;
  churchId: number | null;
  onSave?: (data: ChurchFormData) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`church-tabpanel-${index}`}
      aria-labelledby={`church-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const EditChurchModal: React.FC<EditChurchModalProps> = ({ open, onClose, churchId, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ChurchFormData>({
    name: '',
    slug: '',
    records_database_name: '',
    avatar_dir: '',
    ocr_upload_dir: '',
    calendar_type: 'Revised Julian',
    show_fast_days: true,
    show_local_saints: true,
    theme_color: 'purple',
    enable_ocr: true,
    enable_certificates: true,
    enable_liturgical_calendar: true,
    enable_invoicing: false,
    enable_audit_logs: false,
    language: 'en',
    record_types: []
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [churchUsers, setChurchUsers] = useState<ChurchUser[]>([]);
  const [availableRecordTypes, setAvailableRecordTypes] = useState<string[]>(ORTHODOX_RECORD_TYPES);

  useEffect(() => {
    if (open && churchId) {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Load church data
      fetch(`/api/admin/churches/${churchId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          // If backend returns { success, church }, extract church
          const churchData = data.church || data;
          
          // Ensure churchData is a valid object
          if (!churchData || typeof churchData !== 'object') {
            throw new Error('Invalid church data received');
          }
          
          setForm(churchData);
          
          // Auto-populate database name if not set
          if (!churchData.records_database_name && (churchData.slug || churchData.name)) {
            const dbName = `orthodox_${(churchData.slug || churchData.name)?.toLowerCase().replace(/[^a-z0-9]/g, '_')}_records`;
            setForm(prev => ({ ...prev, records_database_name: dbName }));
          }
        })
        .catch(e => {
          console.error('Failed to load church config:', e);
          setError(`Failed to load church config: ${e.message}`);
        })
        .finally(() => setLoading(false));

      // Load church users (if admin endpoint exists)
      fetch(`/api/admin/churches/${churchId}/users`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch users');
          }
          return res.json();
        })
        .then(data => {
          // Ensure data is an array
          setChurchUsers(Array.isArray(data) ? data : []);
        })
        .catch(e => {
          console.error('Failed to load church users:', e);
          setChurchUsers([]);
        });

      // Load available record types from database (if admin endpoint exists)
      fetch(`/api/admin/churches/${churchId}/record-types`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch record types');
          }
          return res.json();
        })
        .then(data => {
          // Ensure data is an array
          setAvailableRecordTypes(Array.isArray(data) ? data : ORTHODOX_RECORD_TYPES);
        })
        .catch(e => {
          console.error('Failed to load record types:', e);
          setAvailableRecordTypes(ORTHODOX_RECORD_TYPES);
        });
    } else if (open && !churchId) {
      // Handle case when modal is opened without a valid churchId
      setError('No church ID provided');
      setLoading(false);
    }
  }, [open, churchId]);

  const handleChange = (field: keyof ChurchFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!churchId) {
      setError('No church ID provided');
      return;
    }

    console.log('Save button clicked - handleSave called');
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    // Debug: log outgoing payload
    console.log('Submitting church update:', form);
    
    fetch(`/api/admin/churches/${churchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) {
          // Debug: log error response
          console.error('Update failed:', data);
          setError(data.error || data.message || 'Failed to save church config');
          setSuccess(null);
          return;
        }
        // If backend returns { success, church }, extract church
        const updatedChurch = data.church || data;
        setSuccess('Church updated successfully!');
        setError(null);
        onSave && onSave(updatedChurch);
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 1200);
      })
      .catch(e => {
        console.error('Network or JS error:', e);
        setError(e.message || 'Failed to save church config');
        setSuccess(null);
      })
      .finally(() => setLoading(false));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Church Settings</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
              <Tab icon={<IconSettings />} label="Basic Settings" />
              <Tab icon={<IconUsers />} label="Advanced" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              {/* Basic Info */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">Basic Info</Typography>
                <Divider sx={{ mb: 2 }} />
                <TextField 
                  label="Church Name" 
                  value={form.name || ''} 
                  onChange={e => handleChange('name', e.target.value)} 
                  fullWidth 
                  sx={{ mb: 2 }} 
                />
                <TextField 
                  label="Slug" 
                  value={form.slug || ''} 
                  onChange={e => handleChange('slug', e.target.value)} 
                  fullWidth 
                  sx={{ mb: 2 }} 
                />
              </Box>

              {/* Records & Database */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">Records & Database</Typography>
                <Divider sx={{ mb: 2 }} />
                <TextField 
                  label="Records Database Name" 
                  value={form.records_database_name || ''} 
                  onChange={e => handleChange('records_database_name', e.target.value)} 
                  fullWidth 
                  sx={{ mb: 2 }} 
                />
              </Box>

              {/* Upload Directories */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">Upload Directories</Typography>
                <Divider sx={{ mb: 2 }} />
                <TextField 
                  label="Avatar Directory" 
                  value={form.avatar_dir || ''} 
                  onChange={e => handleChange('avatar_dir', e.target.value)} 
                  fullWidth 
                  sx={{ mb: 2 }} 
                />
                <TextField 
                  label="OCR Upload Directory" 
                  value={form.ocr_upload_dir || ''} 
                  onChange={e => handleChange('ocr_upload_dir', e.target.value)} 
                  fullWidth 
                  sx={{ mb: 2 }} 
                />
              </Box>

              {/* Calendar Settings */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">Calendar Settings</Typography>
                <Divider sx={{ mb: 2 }} />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Calendar Type</InputLabel>
                  <Select 
                    value={form.calendar_type || 'Revised Julian'} 
                    onChange={e => handleChange('calendar_type', e.target.value)} 
                    label="Calendar Type"
                  >
                    <MenuItem value="Julian">Julian</MenuItem>
                    <MenuItem value="Revised Julian">Revised Julian</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel 
                  control={<Switch 
                    checked={!!form.show_fast_days} 
                    onChange={e => handleChange('show_fast_days', e.target.checked)} 
                  />} 
                  label="Show Fast Days" 
                />
                <FormControlLabel 
                  control={<Switch 
                    checked={!!form.show_local_saints} 
                    onChange={e => handleChange('show_local_saints', e.target.checked)} 
                  />} 
                  label="Show Local Saints" 
                />
              </Box>

              {/* Appearance & Branding */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">Appearance & Branding</Typography>
                <Divider sx={{ mb: 2 }} />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Theme Color</InputLabel>
                  <Select 
                    value={form.theme_color || ''} 
                    onChange={e => handleChange('theme_color', e.target.value)}
                    label="Theme Color"
                  >
                    <MenuItem value="purple">Purple</MenuItem>
                    <MenuItem value="gold">Gold</MenuItem>
                    <MenuItem value="blue">Blue</MenuItem>
                    <MenuItem value="red">Red</MenuItem>
                    <MenuItem value="green">Green</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Feature Toggles */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">Feature Toggles</Typography>
                <Divider sx={{ mb: 2 }} />
                <FormControlLabel 
                  control={<Switch 
                    checked={!!form.enable_ocr} 
                    onChange={e => handleChange('enable_ocr', e.target.checked)} 
                  />} 
                  label="Enable OCR" 
                />
                <FormControlLabel 
                  control={<Switch 
                    checked={!!form.enable_certificates} 
                    onChange={e => handleChange('enable_certificates', e.target.checked)} 
                  />} 
                  label="Enable Certificates" 
                />
                <FormControlLabel 
                  control={<Switch 
                    checked={!!form.enable_liturgical_calendar} 
                    onChange={e => handleChange('enable_liturgical_calendar', e.target.checked)} 
                  />} 
                  label="Enable Liturgical Calendar" 
                />
                <FormControlLabel 
                  control={<Switch 
                    checked={!!form.enable_invoicing} 
                    onChange={e => handleChange('enable_invoicing', e.target.checked)} 
                  />} 
                  label="Enable Invoicing" 
                />
                <FormControlLabel 
                  control={<Switch 
                    checked={!!form.enable_audit_logs} 
                    onChange={e => handleChange('enable_audit_logs', e.target.checked)} 
                  />} 
                  label="Enable Audit Logs" 
                />
              </Box>

              {/* System Metadata */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">System Metadata</Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2">Created At: {form.created_at || ''}</Typography>
                <Typography variant="body2">Updated At: {form.updated_at || ''}</Typography>
                <Typography variant="body2">Church Slug: {form.slug || ''}</Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Church Language */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">Church Language</Typography>
                <Divider sx={{ mb: 2 }} />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Primary Language</InputLabel>
                  <Select 
                    value={form.language || 'en'} 
                    onChange={e => handleChange('language', e.target.value)}
                    label="Primary Language"
                  >
                    {CHURCH_LANGUAGES.map((lang) => (
                      <MenuItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Database Information */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">Database Information</Typography>
                <Divider sx={{ mb: 2 }} />
                <TextField 
                  label="Database Name" 
                  value={form.records_database_name || ''} 
                  InputProps={{ readOnly: true }}
                  fullWidth 
                  sx={{ mb: 2 }}
                  helperText="Auto-populated based on church name and slug"
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconDatabase size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Database automatically created when church is set up
                  </Typography>
                </Stack>
              </Box>

              {/* Record Types */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6">Church Record Types</Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Available record types in the church database:
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                  {availableRecordTypes.map((recordType) => (
                    <Chip 
                      key={recordType} 
                      label={recordType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      variant="outlined" 
                      color="primary"
                    />
                  ))}
                </Stack>
              </Box>

              {/* Church Users Management */}
              <Box sx={SECTION_STYLE}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Church Users
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<IconUserPlus />}
                    sx={{ ml: 2 }}
                  >
                    Add User
                  </Button>
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {churchUsers.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>User</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Last Login</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {churchUsers.map((user) => (
                          <TableRow key={user.id || `user-${Math.random()}`}>
                            <TableCell>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                  {(user.first_name || '').charAt(0)}{(user.last_name || '').charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2">
                                    {user.first_name || ''} {user.last_name || ''}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {user.email || 'No email'}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={user.role || 'user'} 
                                size="small" 
                                color={user.role === 'admin' ? 'error' : user.role === 'priest' ? 'warning' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={user.is_active ? 'Active' : 'Inactive'} 
                                size="small" 
                                color={user.is_active ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="Edit User">
                                  <IconButton size="small" color="primary">
                                    <IconEdit size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reset Password">
                                  <IconButton size="small" color="warning">
                                    <IconKey size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove from Church">
                                  <IconButton size="small" color="error">
                                    <IconTrash size={16} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    No users assigned to this church yet.
                  </Typography>
                )}
              </Box>
            </TabPanel>

            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
            {success && <Typography color="success.main" sx={{ mt: 2 }}>{success}</Typography>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={() => { console.log('Save button onClick fired'); handleSave(); }} color="primary" disabled={loading}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditChurchModal; 