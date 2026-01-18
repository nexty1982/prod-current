/**
 * Orthodox Metrics - Super Dashboard
 * Modern grid-based control panel for super admin users
 * Exact copy of SuperAdminDashboard
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Fade,
  Card,
  Button,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
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
  Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AdminTile from '../../admin/admin/AdminTile';
import type { CustomizableModule } from './SuperDashboardCustomizer';

interface AdminModule {
  icon: React.ReactNode;
  label: string;
  description: string;
  to: string;
  roleRestriction?: string[];
  badge?: string;
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  category: 'core' | 'management' | 'tools' | 'content' | 'system';
  comingSoon?: boolean;
  disabled?: boolean;
}

const STORAGE_KEY_PREFIX = 'om_super_dashboard_customization';

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

/**
 * Super Dashboard Component
 * Provides a modern, grid-based control panel for system administration
 */
export const SuperDashboard: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [customModules, setCustomModules] = useState<CustomizableModule[] | null>(null);
  const [configSource, setConfigSource] = useState<'user' | 'church' | 'global' | null>(null);

  // Load customizations on mount - check user-specific, then church-specific, then global
  useEffect(() => {
    let saved: string | null = null;
    let storageKey = '';
    let source: 'user' | 'church' | 'global' | null = null;

    // Priority: User-specific > Church-specific > Global
    if (user?.id) {
      storageKey = getStorageKey('user', user.id);
      saved = localStorage.getItem(storageKey);
      if (saved) {
        source = 'user';
      }
    }

    if (!saved && user?.church_id) {
      storageKey = getStorageKey('church', user.church_id);
      saved = localStorage.getItem(storageKey);
      if (saved) {
        source = 'church';
      }
    }

    if (!saved) {
      storageKey = getStorageKey('global');
      saved = localStorage.getItem(storageKey);
      if (saved) {
        source = 'global';
      }
    }

    setConfigSource(source);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomModules(parsed);
      } catch (e) {
        console.error('Failed to load customization:', e);
      }
    }
  }, [user]);

  // Convert customizable modules to admin modules
  const convertToAdminModules = (customModules: CustomizableModule[]): AdminModule[] => {
    return customModules.map((module) => ({
      icon: iconMap[module.iconName] || <SettingsIcon />,
      label: module.label,
      description: module.description,
      to: module.to,
      roleRestriction: module.roleRestriction,
      badge: module.badge,
      badgeColor: module.badgeColor,
      category: module.category,
      comingSoon: module.comingSoon,
      disabled: module.disabled,
    }));
  };

  // Default Admin modules configuration
  const defaultAdminModules: AdminModule[] = [
    // Core System
    {
      icon: <SettingsIcon />,
      label: 'Orthodox Metrics',
      description: 'SaaS platform control & analytics',
      to: '/admin/orthodox-metrics',
      roleRestriction: ['super_admin'],
      badge: 'Super',
      badgeColor: 'error',
      category: 'core'
    },
    {
      icon: <AnalyticsIcon />,
      label: 'System Analytics',
      description: 'Performance & usage metrics',
      to: '/admin/analytics',
      roleRestriction: ['super_admin', 'admin'],
      badge: 'Pro',
      badgeColor: 'info',
      category: 'core'
    },
    {
      icon: <DashboardIcon />,
      label: 'Admin Dashboard',
      description: 'Central administration hub',
      to: '/admin/dashboard',
      roleRestriction: ['super_admin', 'admin'],
      category: 'core'
    },

    // User & Access Management
    {
      icon: <UserCogIcon />,
      label: 'User Management',
      description: 'Manage users, roles & permissions',
      to: '/admin/users',
      roleRestriction: ['super_admin', 'admin'],
      badge: 'Active',
      badgeColor: 'success',
      category: 'management'
    },
    {
      icon: <SecurityIcon />,
      label: 'Security Center',
      description: 'Authentication & access control',
      to: '/admin/security',
      roleRestriction: ['super_admin'],
      badge: 'Critical',
      badgeColor: 'error',
      category: 'management'
    },
    {
      icon: <MenuIcon />,
      label: 'Menu Permissions',
      description: 'Configure navigation access',
      to: '/admin/menu-permissions',
      roleRestriction: ['super_admin'],
      category: 'management'
    },

    // AI & Content Tools
    {
      icon: <BrainIcon />,
      label: 'AI Administration',
      description: 'OCR, NLP & automation tools',
      to: '/admin/ai',
      roleRestriction: ['super_admin', 'admin'],
      badge: 'AI',
      badgeColor: 'secondary',
      category: 'tools'
    },
    {
      icon: <UploadIcon />,
      label: 'OCR Management',
      description: 'Document processing & uploads',
      to: '/apps/ocr',
      roleRestriction: ['super_admin', 'admin', 'manager'],
      category: 'tools'
    },
    {
      icon: <PaletteIcon />,
      label: 'Theme Studio',
      description: 'Liturgical styling & customization',
      to: '/admin/themes',
      roleRestriction: ['super_admin', 'admin'],
      badge: 'New',
      badgeColor: 'primary',
      category: 'tools'
    },

    // Records & Content
    {
      icon: <RecordsIcon />,
      label: 'Record Management',
      description: 'Baptism, marriage & funeral records',
      to: '/demos/editable-record/baptism/new',
      roleRestriction: ['super_admin', 'admin', 'manager'],
      badge: 'Latest',
      badgeColor: 'success',
      category: 'content'
    },
    {
      icon: <ChurchIcon />,
      label: 'Church Management',
      description: 'Parish administration & settings',
      to: '/apps/churches',
      roleRestriction: ['super_admin', 'admin', 'manager'],
      category: 'content'
    },
    {
      icon: <BookIcon />,
      label: 'CMS Content',
      description: 'Website content management',
      to: '/apps/cms',
      roleRestriction: ['super_admin', 'admin', 'manager'],
      category: 'content'
    },

    // System & Logs
    {
      icon: <ClipboardListIcon />,
      label: 'Audit Logs',
      description: 'System-wide activity history',
      to: '/admin/logs',
      roleRestriction: ['super_admin', 'admin'],
      badge: 'Monitor',
      badgeColor: 'warning',
      category: 'system'
    },
    {
      icon: <BackupIcon />,
      label: 'Backup Center',
      description: 'Data backup & recovery',
      to: '/admin/backup',
      roleRestriction: ['super_admin'],
      badge: 'Critical',
      badgeColor: 'error',
      category: 'system'
    },
    {
      icon: <TerminalIcon />,
      label: 'Script Runner',
      description: 'Execute server maintenance scripts',
      to: '/admin/script-runner',
      roleRestriction: ['super_admin', 'admin'],
      badge: 'Pro',
      badgeColor: 'info',
      category: 'system'
    },
    {
      icon: <AdminIcon />,
      label: 'System Settings',
      description: 'Global configuration & preferences',
      to: '/admin/settings',
      roleRestriction: ['super_admin'],
      category: 'system'
    }
  ];

  // Use custom modules if available, otherwise use defaults
  const adminModules = useMemo(() => {
    if (customModules && customModules.length > 0) {
      return convertToAdminModules(customModules);
    }
    return defaultAdminModules;
  }, [customModules]);

  // Filter modules based on role
  const filteredModules = useMemo(() => {
    return adminModules.filter(module => {
      // Role-based filtering
      if (module.roleRestriction && module.roleRestriction.length > 0) {
        if (!module.roleRestriction.some(role => hasRole(role as any))) {
          return false;
        }
      }
      return true;
    });
  }, [adminModules, hasRole]);

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      {/* Header */}
      <Box mb={8} textAlign="center" position="relative">
        <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
          <Tooltip title="Customize Dashboard Modules">
            <IconButton
              onClick={() => navigate('/dashboards/super/customize')}
              color="primary"
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                },
              }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography 
          variant="h5" 
          color="text.secondary" 
          sx={{ 
            mb: 6,
            fontWeight: 400,
            maxWidth: '600px',
            mx: 'auto',
            lineHeight: 1.6
          }}
        >
          Welcome back, {user?.email || 'Administrator'}! Manage your Orthodox Metrics platform.
        </Typography>
        {customModules && configSource && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={`Using ${configSource === 'user' ? 'user-specific' : configSource === 'church' ? 'church-specific' : 'global'} layout`}
              color={configSource === 'user' ? 'primary' : configSource === 'church' ? 'secondary' : 'default'}
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              ({customModules.length} modules)
            </Typography>
          </Box>
        )}
      </Box>

      {/* Modules Grid */}
      <Fade in={true} timeout={800}>
        <Box>
          <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}>
            All Modules ({filteredModules.length})
          </Typography>
          
          <Box 
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
                xl: 'repeat(5, 1fr)'
              },
              gap: 4
            }}
          >
            {filteredModules.map((module, index) => (
              <Fade in={true} timeout={400 + index * 150} key={`${module.label}-${index}`}>
                <Box 
                  sx={{ 
                    height: '100%',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-8px) scale(1.02)',
                      '& > *': {
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)'
                      }
                    }
                  }}
                >
                  <AdminTile
                    icon={module.icon}
                    label={module.label}
                    description={module.description}
                    to={module.to}
                    roleRestriction={module.roleRestriction}
                    badge={module.badge}
                    badgeColor={module.badgeColor}
                    comingSoon={module.comingSoon}
                    disabled={module.disabled}
                  />
                </Box>
              </Fade>
            ))}

            {/* No Results */}
            {filteredModules.length === 0 && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Card 
                  sx={{ 
                    textAlign: 'center', 
                    py: 12,
                    px: 6,
                    border: (theme) => `3px dashed ${theme.palette.divider}`,
                    bgcolor: 'background.default',
                    borderRadius: 4
                  }}
                >
                  <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 3 }} />
                  <Typography variant="h5" gutterBottom color="text.secondary" sx={{ fontWeight: 600 }}>
                    No modules found
                  </Typography>
                  <Typography variant="body1" color="text.disabled" sx={{ mb: 3 }}>
                    No modules are available for your role
                  </Typography>
                </Card>
              </Box>
            )}
          </Box>
        </Box>
      </Fade>
    </Container>
  );
};

export default SuperDashboard;

