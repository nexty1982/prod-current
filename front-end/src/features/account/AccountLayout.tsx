/**
 * AccountLayout — Left nav sidebar + content area for /account/* pages.
 * Renders inside FullLayout (admin shell).
 *
 * Nav items are capability-filtered: self-service pages always show,
 * church-scoped pages only show when the user has a church context.
 */

import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import ChurchIcon from '@mui/icons-material/Church';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaletteIcon from '@mui/icons-material/Palette';
import DevicesIcon from '@mui/icons-material/Devices';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import { useAuth } from '@/context/AuthContext';
import { hasChurchContext, canManageOcrPreferences } from './accountPermissions';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  description: string;
  /** When set, item only shows if predicate returns true. */
  visible?: (user: any) => boolean;
}

const navItems: NavItem[] = [
  // ── Self-service (always visible) ──
  {
    label: 'Profile Overview',
    path: '/account/profile',
    icon: <PersonOutlineIcon />,
    description: 'Account summary',
  },
  {
    label: 'Personal Info',
    path: '/account/personal-info',
    icon: <EditIcon />,
    description: 'Edit your details',
  },
  {
    label: 'Password & Auth',
    path: '/account/password',
    icon: <LockIcon />,
    description: 'Security settings',
  },
  {
    label: 'Active Sessions',
    path: '/account/sessions',
    icon: <DevicesIcon />,
    description: 'Manage signed-in devices',
  },
  {
    label: 'Notifications',
    path: '/account/notifications',
    icon: <NotificationsActiveIcon />,
    description: 'Notification preferences',
  },
  // ── Church-context (visible when user has a church) ──
  {
    label: 'Parish Info',
    path: '/account/parish',
    icon: <ChurchIcon />,
    description: 'Your church & role',
    visible: (user) => hasChurchContext(user),
  },
  {
    label: 'Church Details',
    path: '/account/church-details',
    icon: <InfoOutlinedIcon />,
    description: 'Parish information',
    visible: (user) => hasChurchContext(user),
  },
  {
    label: 'Branding',
    path: '/account/branding',
    icon: <PaletteIcon />,
    description: 'Logo & brand identity',
    visible: (user) => hasChurchContext(user),
  },
  {
    label: 'OCR Preferences',
    path: '/account/ocr-preferences',
    icon: <DocumentScannerIcon />,
    description: 'Document scanning settings',
    visible: (user) => canManageOcrPreferences(user),
  },
  // ── Parish Management ──
  {
    label: 'Parish Management',
    path: '/account/parish-management',
    icon: <DashboardCustomizeOutlinedIcon />,
    description: 'Database mapping, themes, settings',
    visible: (user) => hasChurchContext(user),
  },
];

const AccountLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.visible || item.visible(user)),
    [user],
  );

  return (
    <PageContainer title="Account Hub" description="Manage your account and church settings">
      <Breadcrumb
        title="Account Hub"
        items={[
          { to: '/', title: 'Home' },
          { title: 'Account Hub' },
        ]}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
          gap: 3,
          mt: 1,
        }}
      >
        {/* Left Nav */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            alignSelf: 'start',
            position: 'sticky',
            top: 80,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(45, 27, 78, 0.06)',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#fff',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              px: 1.5,
              pb: 1,
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isDark ? '#6b7280' : '#9ca3af',
            }}
          >
            Account Settings
          </Typography>
          <List disablePadding>
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItemButton
                  key={item.path}
                  selected={isActive}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: '0 6px 6px 0',
                    mb: 0.5,
                    py: 0.75,
                    px: 1.5,
                    transition: 'color 0.15s ease, background-color 0.15s ease',
                    color: isDark ? '#9ca3af' : '#6b7280',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(45, 27, 78, 0.04)',
                      color: isDark ? '#f3f4f6' : '#2d1b4e',
                    },
                    '&.Mui-selected': {
                      bgcolor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(45, 27, 78, 0.05)',
                      color: isDark ? '#d4af37' : '#2d1b4e',
                      borderLeft: '2.5px solid',
                      borderLeftColor: isDark ? '#d4af37' : '#2d1b4e',
                      '& .MuiListItemIcon-root': {
                        color: isDark ? '#d4af37' : '#2d1b4e',
                        opacity: 1,
                      },
                      '&:hover': {
                        bgcolor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(45, 27, 78, 0.08)',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: 'inherit',
                      opacity: isActive ? 1 : 0.6,
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={item.description}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: isActive ? 500 : 400,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.875rem',
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      sx: { opacity: 0.7 },
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        {/* Content Area */}
        <Box>
          <Outlet />
        </Box>
      </Box>
    </PageContainer>
  );
};

export default AccountLayout;
