/**
 * Orthodox Metrics - Super Dashboard Customizer
 * Fully customizable interface for modifying the Super Dashboard modules
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Autocomplete,
  Tabs,
  Tab,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  Public as GlobalIcon,
  Church as ChurchIcon,
  Person as UserIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import userService from '@/shared/lib/userService';
import * as adminApiModule from '@/api/admin.api';
const adminAPI: any = (adminApiModule as any).default ?? (adminApiModule as any).adminAPI ?? (adminApiModule as any);
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Settings as SettingsIcon,
  Psychology as BrainIcon,
  People as UserCogIcon,
  Assignment as ClipboardListIcon,
  Palette as PaletteIcon,
  Church as ChurchIcon,
  BarChart as AnalyticsIcon,
  Security as SecurityIcon,
  CloudUpload as UploadIcon,
  MenuBook as BookIcon,
  Backup as BackupIcon,
  AdminPanelSettings as AdminIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  LocalLibrary as RecordsIcon,
  Terminal as TerminalIcon,
} from '@mui/icons-material';

const STORAGE_KEY_PREFIX = 'om_super_dashboard_customization';
const DEFAULT_MODULES_KEY = 'om_super_dashboard_default';

// Storage key helpers
const getStorageKey = (type: 'global' | 'church' | 'user', id?: number | string) => {
  if (type === 'global') {
    return `${STORAGE_KEY_PREFIX}_global`;
  } else if (type === 'church' && id) {
    return `${STORAGE_KEY_PREFIX}_church_${id}`;
  } else if (type === 'user' && id) {
    return `${STORAGE_KEY_PREFIX}_user_${id}`;
  }
  return `${STORAGE_KEY_PREFIX}_global`;
};

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  Settings: <SettingsIcon />,
  Brain: <BrainIcon />,
  UserCog: <UserCogIcon />,
  ClipboardList: <ClipboardListIcon />,
  Palette: <PaletteIcon />,
  Church: <ChurchIcon />,
  Analytics: <AnalyticsIcon />,
  Security: <SecurityIcon />,
  Upload: <UploadIcon />,
  Book: <BookIcon />,
  Backup: <BackupIcon />,
  Admin: <AdminIcon />,
  Menu: <MenuIcon />,
  Dashboard: <DashboardIcon />,
  Records: <RecordsIcon />,
  Terminal: <TerminalIcon />,
};

const iconOptions = Object.keys(iconMap);

export interface CustomizableModule {
  id: string;
  iconName: string;
  label: string;
  description: string;
  to: string;
  roleRestriction: string[];
  badge?: string;
  badgeColor: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  category: 'core' | 'management' | 'tools' | 'content' | 'system';
  comingSoon?: boolean;
  disabled?: boolean;
}

// Default modules configuration
const defaultModules: CustomizableModule[] = [
  {
    id: '1',
    iconName: 'Settings',
    label: 'Orthodox Metrics',
    description: 'SaaS platform control & analytics',
    to: '/admin/orthodox-metrics',
    roleRestriction: ['super_admin'],
    badge: 'Super',
    badgeColor: 'error',
    category: 'core',
  },
  {
    id: '2',
    iconName: 'Analytics',
    label: 'System Analytics',
    description: 'Performance & usage metrics',
    to: '/admin/analytics',
    roleRestriction: ['super_admin', 'admin'],
    badge: 'Pro',
    badgeColor: 'info',
    category: 'core',
  },
  {
    id: '3',
    iconName: 'Dashboard',
    label: 'Admin Dashboard',
    description: 'Central administration hub',
    to: '/admin/dashboard',
    roleRestriction: ['super_admin', 'admin'],
    category: 'core',
  },
  {
    id: '4',
    iconName: 'UserCog',
    label: 'User Management',
    description: 'Manage users, roles & permissions',
    to: '/admin/users',
    roleRestriction: ['super_admin', 'admin'],
    badge: 'Active',
    badgeColor: 'success',
    category: 'management',
  },
  {
    id: '5',
    iconName: 'Security',
    label: 'Security Center',
    description: 'Authentication & access control',
    to: '/admin/security',
    roleRestriction: ['super_admin'],
    badge: 'Critical',
    badgeColor: 'error',
    category: 'management',
  },
  {
    id: '6',
    iconName: 'Menu',
    label: 'Menu Permissions',
    description: 'Configure navigation access',
    to: '/admin/menu-permissions',
    roleRestriction: ['super_admin'],
    category: 'management',
  },
  {
    id: '7',
    iconName: 'Brain',
    label: 'AI Administration',
    description: 'OCR, NLP & automation tools',
    to: '/admin/ai',
    roleRestriction: ['super_admin', 'admin'],
    badge: 'AI',
    badgeColor: 'secondary',
    category: 'tools',
  },
  {
    id: '8',
    iconName: 'Upload',
    label: 'OCR Management',
    description: 'Document processing & uploads',
    to: '/apps/ocr',
    roleRestriction: ['super_admin', 'admin', 'manager'],
    category: 'tools',
  },
  {
    id: '9',
    iconName: 'Palette',
    label: 'Theme Studio',
    description: 'Liturgical styling & customization',
    to: '/admin/themes',
    roleRestriction: ['super_admin', 'admin'],
    badge: 'New',
    badgeColor: 'primary',
    category: 'tools',
  },
  {
    id: '10',
    iconName: 'Records',
    label: 'Record Management',
    description: 'Baptism, marriage & funeral records',
    to: '/demos/editable-record/baptism/new',
    roleRestriction: ['super_admin', 'admin', 'manager'],
    badge: 'Latest',
    badgeColor: 'success',
    category: 'content',
  },
  {
    id: '11',
    iconName: 'Church',
    label: 'Church Management',
    description: 'Parish administration & settings',
    to: '/apps/churches',
    roleRestriction: ['super_admin', 'admin', 'manager'],
    category: 'content',
  },
  {
    id: '12',
    iconName: 'Book',
    label: 'CMS Content',
    description: 'Website content management',
    to: '/apps/cms',
    roleRestriction: ['super_admin', 'admin', 'manager'],
    category: 'content',
  },
  {
    id: '13',
    iconName: 'ClipboardList',
    label: 'Audit Logs',
    description: 'System-wide activity history',
    to: '/admin/logs',
    roleRestriction: ['super_admin', 'admin'],
    badge: 'Monitor',
    badgeColor: 'warning',
    category: 'system',
  },
  {
    id: '14',
    iconName: 'Backup',
    label: 'Backup Center',
    description: 'Data backup & recovery',
    to: '/admin/backup',
    roleRestriction: ['super_admin'],
    badge: 'Critical',
    badgeColor: 'error',
    category: 'system',
  },
  {
    id: '15',
    iconName: 'Terminal',
    label: 'Script Runner',
    description: 'Execute server maintenance scripts',
    to: '/admin/script-runner',
    roleRestriction: ['super_admin', 'admin'],
    badge: 'Pro',
    badgeColor: 'info',
    category: 'system',
  },
  {
    id: '16',
    iconName: 'Admin',
    label: 'System Settings',
    description: 'Global configuration & preferences',
    to: '/admin/settings',
    roleRestriction: ['super_admin'],
    category: 'system',
  },
];

// Sortable item component
interface SortableItemProps {
  module: CustomizableModule;
  onEdit: (module: CustomizableModule) => void;
  onDelete: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ module, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            {...attributes}
            {...listeners}
            sx={{
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <DragIcon />
          </Box>

          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ fontSize: '2rem', color: 'primary.main' }}>
              {iconMap[module.iconName] || <SettingsIcon />}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">{module.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {module.description}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={module.category} size="small" variant="outlined" />
                <Chip label={module.to} size="small" variant="outlined" />
                {module.badge && (
                  <Chip label={module.badge} size="small" color={module.badgeColor} />
                )}
                {module.roleRestriction.length > 0 && (
                  <Chip
                    label={`Roles: ${module.roleRestriction.join(', ')}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Box>

          <Box>
            <IconButton onClick={() => onEdit(module)} color="primary">
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => onDelete(module.id)} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Main Customizer Component
export const SuperDashboardCustomizer: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [configType, setConfigType] = useState<'global' | 'church' | 'user'>('global');
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [churches, setChurches] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: number; email: string; name?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<CustomizableModule[]>(defaultModules);
  const [editingModule, setEditingModule] = useState<CustomizableModule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load churches and users for selectors
  useEffect(() => {
    if (isSuperAdmin()) {
      const loadData = async () => {
        try {
          // Load churches
          if (adminAPI?.churches?.getAll) {
            const churchResponse = await adminAPI.churches.getAll();
            const normalized = churchResponse?.churches ?? churchResponse?.data ?? churchResponse ?? [];
            setChurches(
              normalized.map((c: any) => ({
                id: c.id ?? c.church_id ?? c._id,
                name: c.name ?? c.church_name ?? 'Unnamed Church',
              }))
            );
          }

          // Load users
          const userResponse = await userService.getUsers();
          if (Array.isArray(userResponse)) {
            setUsers(
              userResponse.map((u: any) => ({
                id: u.id,
                email: u.email,
                name: u.name || u.full_name || u.username || u.email,
              }))
            );
          }
        } catch (err) {
          console.error('Failed to load churches/users:', err);
        }
      };

      loadData();
    }
  }, [isSuperAdmin]);

  // Load saved customization when config type or ID changes
  useEffect(() => {
    let storageKey: string;
    if (configType === 'church' && selectedChurchId) {
      storageKey = getStorageKey('church', selectedChurchId);
    } else if (configType === 'user' && selectedUserId) {
      storageKey = getStorageKey('user', selectedUserId);
    } else {
      storageKey = getStorageKey('global');
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setModules(parsed);
      } catch (e) {
        console.error('Failed to load customization:', e);
        setModules(defaultModules);
      }
    } else {
      // If no saved config, try to load from defaults
      setModules(defaultModules);
    }
  }, [configType, selectedChurchId, selectedUserId]);

  // Store defaults if not already stored
  useEffect(() => {
    if (!localStorage.getItem(DEFAULT_MODULES_KEY)) {
      localStorage.setItem(DEFAULT_MODULES_KEY, JSON.stringify(defaultModules));
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setModules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAdd = () => {
    const newModule: CustomizableModule = {
      id: Date.now().toString(),
      iconName: 'Settings',
      label: 'New Module',
      description: 'Module description',
      to: '/',
      roleRestriction: [],
      badgeColor: 'primary',
      category: 'core',
    };
    setEditingModule(newModule);
    setIsDialogOpen(true);
  };

  const handleEdit = (module: CustomizableModule) => {
    setEditingModule({ ...module });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this module?')) {
      setModules((items) => items.filter((item) => item.id !== id));
    }
  };

  const handleSave = () => {
    let storageKey: string;
    if (configType === 'church' && selectedChurchId) {
      storageKey = getStorageKey('church', selectedChurchId);
    } else if (configType === 'user' && selectedUserId) {
      storageKey = getStorageKey('user', selectedUserId);
    } else {
      storageKey = getStorageKey('global');
    }

    localStorage.setItem(storageKey, JSON.stringify(modules));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    const targetName =
      configType === 'church'
        ? churches.find((c) => c.id === selectedChurchId)?.name || 'this church'
        : configType === 'user'
          ? users.find((u) => u.id === selectedUserId)?.email || 'this user'
          : 'global';
    if (window.confirm(`Reset ${targetName} to default modules? This will lose all customizations.`)) {
      setModules(defaultModules);
      let storageKey: string;
      if (configType === 'church' && selectedChurchId) {
        storageKey = getStorageKey('church', selectedChurchId);
      } else if (configType === 'user' && selectedUserId) {
        storageKey = getStorageKey('user', selectedUserId);
      } else {
        storageKey = getStorageKey('global');
      }
      localStorage.removeItem(storageKey);
    }
  };

  const handleConfigTypeChange = (newType: 'global' | 'church' | 'user') => {
    setConfigType(newType);
    if (newType === 'church') {
      setSelectedUserId(null);
    } else if (newType === 'user') {
      setSelectedChurchId(null);
    } else {
      setSelectedChurchId(null);
      setSelectedUserId(null);
    }
  };

  const handleDialogSave = () => {
    if (editingModule) {
      if (modules.find((m) => m.id === editingModule.id)) {
        // Update existing
        setModules((items) =>
          items.map((item) => (item.id === editingModule.id ? editingModule : item))
        );
      } else {
        // Add new
        setModules((items) => [...items, editingModule]);
      }
      setIsDialogOpen(false);
      setEditingModule(null);
    }
  };

  const availableRoles = ['super_admin', 'admin', 'manager', 'editor', 'viewer'];
  const categories = ['core', 'management', 'tools', 'content', 'system'];
  const badgeColors: Array<'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = [
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'info',
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboards/super')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Super Dashboard Customizer
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Customize the modules displayed on the Super Dashboard. Drag to reorder, edit to modify,
              or add new modules.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              color="warning"
              disabled={configType === 'church' && !selectedChurchId || configType === 'user' && !selectedUserId}
            >
              Reset to Defaults
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={configType === 'church' && !selectedChurchId || configType === 'user' && !selectedUserId}
            >
              Save Changes
            </Button>
          </Box>
        </Box>

        {/* Configuration Type Selector */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configuration Target
          </Typography>
          <Tabs
            value={configType}
            onChange={(_, newValue) => handleConfigTypeChange(newValue)}
            sx={{ mb: 2 }}
          >
            <Tab
              icon={<GlobalIcon />}
              iconPosition="start"
              label="Global (All Users)"
              value="global"
            />
            {isSuperAdmin() && (
              <>
                <Tab
                  icon={<ChurchIcon />}
                  iconPosition="start"
                  label="Church Specific"
                  value="church"
                />
                <Tab
                  icon={<UserIcon />}
                  iconPosition="start"
                  label="User Specific"
                  value="user"
                />
              </>
            )}
          </Tabs>

          {configType === 'church' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select Church</InputLabel>
              <Select
                value={selectedChurchId || ''}
                label="Select Church"
                onChange={(e) => setSelectedChurchId(Number(e.target.value))}
              >
                {churches.map((church) => (
                  <MenuItem key={church.id} value={church.id}>
                    {church.name} (ID: {church.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {configType === 'user' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select User</InputLabel>
              <Select
                value={selectedUserId || ''}
                label="Select User"
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name || u.email} ({u.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {configType === 'church' && selectedChurchId && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Configuring dashboard for: <strong>{churches.find((c) => c.id === selectedChurchId)?.name}</strong>
            </Alert>
          )}

          {configType === 'user' && selectedUserId && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Configuring dashboard for: <strong>{users.find((u) => u.id === selectedUserId)?.email}</strong>
            </Alert>
          )}
        </Paper>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaveSuccess(false)}>
          Customization saved successfully! Changes will appear on the Super Dashboard.
        </Alert>
      )}

      {/* Add Button */}
      <Box sx={{ mb: 3 }}>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAdd}>
          Add New Module
        </Button>
      </Box>

      {/* Modules List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Modules ({modules.length})
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            {modules.map((module) => (
              <SortableItem
                key={module.id}
                module={module}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
        </DndContext>

        {modules.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No modules. Click "Add New Module" to get started.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingModule?.id ? 'Edit Module' : 'Add New Module'}</DialogTitle>
        <DialogContent>
          {editingModule && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Icon</InputLabel>
                  <Select
                    value={editingModule.iconName}
                    label="Icon"
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, iconName: e.target.value })
                    }
                  >
                    {iconOptions.map((icon) => (
                      <MenuItem key={icon} value={icon}>
                        {icon}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Category"
                  select
                  value={editingModule.category}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, category: e.target.value as any })
                  }
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Label"
                  value={editingModule.label}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, label: e.target.value })
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={editingModule.description}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, description: e.target.value })
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Route (to)"
                  value={editingModule.to}
                  onChange={(e) => setEditingModule({ ...editingModule, to: e.target.value })}
                  placeholder="/admin/example"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Badge (optional)"
                  value={editingModule.badge || ''}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, badge: e.target.value || undefined })
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Badge Color</InputLabel>
                  <Select
                    value={editingModule.badgeColor}
                    label="Badge Color"
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, badgeColor: e.target.value as any })
                    }
                  >
                    {badgeColors.map((color) => (
                      <MenuItem key={color} value={color}>
                        {color}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={availableRoles}
                  value={editingModule.roleRestriction}
                  onChange={(_, newValue) =>
                    setEditingModule({ ...editingModule, roleRestriction: newValue })
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Role Restrictions" placeholder="Select roles" />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingModule.comingSoon || false}
                      onChange={(e) =>
                        setEditingModule({ ...editingModule, comingSoon: e.target.checked })
                      }
                    />
                  }
                  label="Coming Soon"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingModule.disabled || false}
                      onChange={(e) =>
                        setEditingModule({ ...editingModule, disabled: e.target.checked })
                      }
                    />
                  }
                  label="Disabled"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDialogSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SuperDashboardCustomizer;

