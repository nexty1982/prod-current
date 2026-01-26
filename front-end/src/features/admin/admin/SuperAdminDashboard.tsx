/**
 * Orthodox Metrics - Super Admin Dashboard
 * Modern grid-based control panel for super admin users
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Fade,
  Chip,
  Stack,
  Card,
  CardContent
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
} from '@mui/icons-material';

import { useAuth } from '@/context/AuthContext';
import AdminTile from './AdminTile';

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

/**
 * Super Admin Dashboard Component
 * Provides a modern, grid-based control panel for system administration
 */
export const SuperAdminDashboard: React.FC = () => {
  const { user, hasRole } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Admin modules configuration
  const adminModules: AdminModule[] = [
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

  // Filter modules based on search and category
  const filteredModules = useMemo(() => {
    return adminModules.filter(module => {
      // Role-based filtering
      if (module.roleRestriction && module.roleRestriction.length > 0) {
        if (!module.roleRestriction.some(role => hasRole(role as any))) {
          return false;
        }
      }

      // Search filtering
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          module.label.toLowerCase().includes(query) ||
          module.description.toLowerCase().includes(query)
        );
      }

      // Category filtering
      if (selectedCategory !== 'all') {
        return module.category === selectedCategory;
      }

      return true;
    });
  }, [adminModules, searchQuery, selectedCategory, hasRole]);

  // Category counts
  const categoryStats = useMemo(() => {
    const stats = adminModules.reduce((acc, module) => {
      if (module.roleRestriction && module.roleRestriction.length > 0) {
        if (!module.roleRestriction.some(role => hasRole(role as any))) {
          return acc;
        }
      }
      acc[module.category] = (acc[module.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    stats.all = Object.values(stats).reduce((sum, count) => sum + count, 0);
    return stats;
  }, [adminModules, hasRole]);

  const categories = [
    { key: 'all', label: 'All Modules', icon: '🏠' },
    { key: 'core', label: 'Core System', icon: '⚙️' },
    { key: 'management', label: 'User & Access', icon: '👥' },
    { key: 'tools', label: 'AI & Tools', icon: '🛠️' },
    { key: 'content', label: 'Records & Content', icon: '📚' },
    { key: 'system', label: 'System & Logs', icon: '🔧' }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      {/* Header */}
      <Box mb={8} textAlign="center">
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

        {/* Enhanced Statistics Dashboard */}
        <Card 
          sx={{ 
            background: (theme) => theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.15), rgba(103, 58, 183, 0.15))'
              : 'linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(103, 58, 183, 0.08))',
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.3)' : 'rgba(25, 118, 210, 0.2)'}`,
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            boxShadow: (theme) => theme.palette.mode === 'dark' 
              ? '0 8px 32px rgba(0,0,0,0.3)'
              : '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            position: 'relative',
            bgcolor: 'background.paper',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #1976d2, #673ab7)'
            }
          }}
        >
          <CardContent sx={{ py: 6, px: 4 }}>
            <Typography variant="h6" textAlign="center" sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}>
              System Overview
            </Typography>
            <Stack 
              direction={{ xs: 'column', md: 'row' }}
              spacing={6} 
              alignItems="center" 
              divider={
                <Box sx={{ 
                  width: 2, 
                  height: '60px', 
                  background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.12), transparent)',
                  borderRadius: 1,
                  display: { xs: 'none', md: 'block' }
                }} />
              }
            >
              <Box textAlign="center" sx={{ flex: 1 }}>
                <Box sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.2), rgba(25, 118, 210, 0.1))',
                  mb: 2,
                  border: '2px solid rgba(25, 118, 210, 0.3)'
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#1976d2' }}>
                    {categoryStats.all || 16}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                  Available Modules
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Total system modules
                </Typography>
              </Box>
              
              <Box textAlign="center" sx={{ flex: 1 }}>
                <Box sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(156, 39, 176, 0.1))',
                  mb: 2,
                  border: '2px solid rgba(156, 39, 176, 0.3)'
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#9c27b0' }}>
                    {categoryStats.core || 3}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                  Core Systems
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Essential platform components
                </Typography>
              </Box>
              
              <Box textAlign="center" sx={{ flex: 1 }}>
                <Box sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.2), rgba(103, 58, 183, 0.1))',
                  mb: 2,
                  border: '2px solid rgba(103, 58, 183, 0.3)'
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#673ab7' }}>
                    {categoryStats.management || 5}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                  Management Tools
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Administrative interfaces
                </Typography>
              </Box>
              
              <Box textAlign="center" sx={{ flex: 1 }}>
                <Box sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.2), rgba(46, 125, 50, 0.1))',
                  mb: 2,
                  border: '2px solid rgba(46, 125, 50, 0.3)',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    right: -2,
                    bottom: -2,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2e7d32, #66bb6a)',
                    zIndex: -1,
                    animation: 'pulse 2s infinite'
                  }
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#2e7d32' }}>
                    ●
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#2e7d32' }}>
                  Online
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  System operational
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Filters */}
      <Box mb={6}>
        <Card sx={{ 
          p: 4, 
          borderRadius: 3, 
          border: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          backdropFilter: 'blur(10px)',
          boxShadow: (theme) => theme.palette.mode === 'dark' 
            ? '0 4px 20px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <Stack direction="row" spacing={4} alignItems="center">
            <TextField
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                minWidth: { xs: '100%', md: 400 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: 'background.default',
                  '&:hover': {
                    backgroundColor: 'background.default',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'background.default',
                  }
                }
              }}
              size="medium"
            />
            
            <Box flexGrow={1} />
            
            <Box 
              sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 2.5,
                justifyContent: { xs: 'center', md: 'flex-end' },
                alignItems: 'center'
              }}
            >
              {categories.map(category => (
                <Chip
                  key={category.key}
                  icon={<span style={{ fontSize: '16px' }}>{category.icon}</span>}
                  label={`${category.label} (${categoryStats[category.key] || 0})`}
                  onClick={() => setSelectedCategory(category.key)}
                  color={selectedCategory === category.key ? 'primary' : 'default'}
                  variant={selectedCategory === category.key ? 'filled' : 'outlined'}
                  sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: selectedCategory === category.key ? 600 : 500,
                    height: 40,
                    borderRadius: 3,
                    px: 2.5,
                    minWidth: 'fit-content',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(selectedCategory === category.key && {
                      background: 'linear-gradient(135deg, #1976d2, #673ab7)',
                      color: 'white',
                      borderColor: 'transparent'
                    })
                  }}
                />
              ))}
            </Box>
          </Stack>
        </Card>
      </Box>

      {/* Modules Grid */}
      <Fade in={true} timeout={800}>
        <Box>
          <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}>
            {searchQuery ? `Search Results (${filteredModules.length})` : 
             selectedCategory !== 'all' ? 
               `${categories.find(c => c.key === selectedCategory)?.label} (${filteredModules.length})` : 
               `All Modules (${filteredModules.length})`}
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
                    Try adjusting your search query or category filter
                  </Typography>
                  <Chip 
                    label="Clear Filters" 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    color="primary"
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  />
                </Card>
              </Box>
            )}
          </Box>
        </Box>
      </Fade>

      {/* Add CSS keyframes for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.7;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </Container>
  );
};

export default SuperAdminDashboard;
