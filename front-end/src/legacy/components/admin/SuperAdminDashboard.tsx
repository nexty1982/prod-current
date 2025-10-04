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
  CardContent,
  useTheme,
  useMediaQuery
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

import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme as useOrthodoxTheme } from '../../context/ThemeContext.tsx';
import AdminTile from './AdminTile.tsx';

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
  const theme = useTheme();
  const { themeConfig } = useOrthodoxTheme();
  const { user, hasRole } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
          variant="h2" 
          component="h1" 
          gutterBottom
          sx={{
            fontWeight: 800,
            background: `linear-gradient(135deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            letterSpacing: '-0.02em'
          }}
        >
          Super Admin Control Panel
        </Typography>
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
            background: `linear-gradient(135deg, ${themeConfig.colors.primary}08, ${themeConfig.colors.accent}08)`,
            border: `1px solid ${themeConfig.colors.primary}20`,
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})`
            }
          }}
        >
          <CardContent sx={{ py: 6, px: 4 }}>
            <Typography variant="h6" textAlign="center" sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}>
              System Overview
            </Typography>
            <Stack 
              direction={isMobile ? 'column' : 'row'} 
              spacing={6} 
              alignItems="center" 
              divider={!isMobile && (
                <Box sx={{ 
                  width: 2, 
                  height: '60px', 
                  background: `linear-gradient(180deg, transparent, ${theme.palette.divider}, transparent)`,
                  borderRadius: 1
                }} />
              )}
            >
              <Box textAlign="center" sx={{ flex: 1 }}>
                <Box sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${themeConfig.colors.primary}20, ${themeConfig.colors.primary}10)`,
                  mb: 2,
                  border: `2px solid ${themeConfig.colors.primary}30`
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: themeConfig.colors.primary }}>
                    {categoryStats.all || 16}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
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
                  background: `linear-gradient(135deg, ${themeConfig.colors.secondary}20, ${themeConfig.colors.secondary}10)`,
                  mb: 2,
                  border: `2px solid ${themeConfig.colors.secondary}30`
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: themeConfig.colors.secondary }}>
                    {categoryStats.core || 3}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
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
                  background: `linear-gradient(135deg, ${themeConfig.colors.accent}20, ${themeConfig.colors.accent}10)`,
                  mb: 2,
                  border: `2px solid ${themeConfig.colors.accent}30`
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: themeConfig.colors.accent }}>
                    {categoryStats.management || 5}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
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
                  background: `linear-gradient(135deg, ${theme.palette.success.main}20, ${theme.palette.success.main}10)`,
                  mb: 2,
                  border: `2px solid ${theme.palette.success.main}30`,
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    right: -2,
                    bottom: -2,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                    zIndex: -1,
                    animation: 'pulse 2s infinite'
                  }
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.success.main }}>
                    ●
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: theme.palette.success.main }}>
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
          border: `1px solid ${theme.palette.divider}`,
          background: theme.palette.mode === 'dark' 
            ? 'rgba(255,255,255,0.02)' 
            : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={4} alignItems="center">
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
                minWidth: isMobile ? '100%' : 400,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,1)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,1)',
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
                justifyContent: isMobile ? 'center' : 'flex-end',
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
                      boxShadow: theme.shadows[4]
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(selectedCategory === category.key && {
                      background: `linear-gradient(135deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})`,
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
                    border: `3px dashed ${theme.palette.divider}`,
                    backgroundColor: 'transparent',
                    borderRadius: 4,
                    background: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.02)' 
                      : 'rgba(248,250,252,0.5)'
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
