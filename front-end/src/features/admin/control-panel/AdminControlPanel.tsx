/**
 * AdminControlPanel.tsx
 * Windows Control Panel-style admin hub for super_admin users.
 * Located at /admin/control-panel
 *
 * 6 major categories:
 * 1. Church Management
 * 2. Records & OCR
 * 3. CRM & Outreach
 * 4. System & Server
 * 5. AI & Automation
 * 6. OM Daily
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    Psychology as AIIcon,
    Business as ChurchIcon,
    CalendarMonth as DailyIcon,
    Campaign as OutreachIcon,
    Description as RecordsIcon,
    Dns as ServerIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    Link as MuiLink,
    Paper,
    Typography,
    useTheme,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Category definitions ────────────────────────────────────────

interface QuickLink {
  label: string;
  href: string;
}

interface Category {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  quickLinks: QuickLink[];
}

const CATEGORIES: Category[] = [
  {
    key: 'church',
    title: 'Church Management',
    description: 'Manage churches, setup wizards, field mapping, and provisioning',
    icon: <ChurchIcon sx={{ fontSize: 48 }} />,
    color: '#1976d2',
    href: '/admin/control-panel/church-management',
    quickLinks: [
      { label: 'All Churches', href: '/apps/church-management' },
      { label: 'Church Setup Wizard', href: '/apps/church-management/wizard' },
    ],
  },
  {
    key: 'records',
    title: 'Records & OCR',
    description: 'Church metric records, OCR document processing, data tools, and reports',
    icon: <RecordsIcon sx={{ fontSize: 48 }} />,
    color: '#388e3c',
    href: '/admin/control-panel/records-ocr',
    quickLinks: [
      { label: 'Church Metric Records', href: '/apps/records/baptism' },
      { label: 'OCR Studio', href: '/devel/ocr-studio' },
      { label: 'Live Table Builder', href: '/devel-tools/live-table-builder' },
    ],
  },
  {
    key: 'crm',
    title: 'CRM & Outreach',
    description: 'Customer relationship management, US church map, and sales pipeline',
    icon: <OutreachIcon sx={{ fontSize: 48 }} />,
    color: '#7b1fa2',
    href: '/admin/control-panel/crm-outreach',
    quickLinks: [
      { label: 'CRM Dashboard', href: '/devel-tools/crm' },
      { label: 'US Church Map', href: '/devel-tools/us-church-map' },
    ],
  },
  {
    key: 'system',
    title: 'System & Server',
    description: 'Users, security, content, server diagnostics, monitoring, and social features',
    icon: <ServerIcon sx={{ fontSize: 48 }} />,
    color: '#d32f2f',
    href: '/admin/control-panel/system-server',
    quickLinks: [
      { label: 'User Management', href: '/admin/users' },
      { label: 'Session Management', href: '/admin/sessions' },
      { label: 'Activity Logs', href: '/admin/logs' },
      { label: 'API Explorer', href: '/devel-tools/api-explorer' },
    ],
  },
  {
    key: 'ai',
    title: 'AI & Automation',
    description: 'AI admin panel, OMAI logger, and automation settings',
    icon: <AIIcon sx={{ fontSize: 48 }} />,
    color: '#f57c00',
    href: '/admin/control-panel/ai-automation',
    quickLinks: [
      { label: 'AI Admin Panel', href: '/admin/ai' },
      { label: 'OMAI Logger', href: '/church/omai-logger' },
    ],
  },
  {
    key: 'daily',
    title: 'OM Daily',
    description: 'Work pipelines — 24hr, 48hr, 7/14/30/60/90 day horizons + conversation integration',
    icon: <DailyIcon sx={{ fontSize: 48 }} />,
    color: '#00897b',
    href: '/admin/control-panel/om-daily',
    quickLinks: [
      { label: '24-Hour Plan', href: '/admin/control-panel/om-daily?horizon=1' },
      { label: '48-Hour Plan', href: '/admin/control-panel/om-daily?horizon=2' },
      { label: '7-Day Plan', href: '/admin/control-panel/om-daily?horizon=7' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────

const AdminControlPanel: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Admin Control Panel' },
  ];

  return (
    <PageContainer title="Admin Control Panel" description="Orthodox Metrics Administration Hub">
      <Breadcrumb title="Admin Control Panel" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Orthodox Metrics Administration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your Orthodox community platform. Select a category to get started.
          </Typography>
        </Box>

        {/* Category tiles — 2-column grid like Windows Control Panel */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}>
          {CATEGORIES.map((cat) => (
            <Paper
              key={cat.key}
              elevation={0}
              sx={{
                p: 3,
                border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: cat.color,
                  bgcolor: alpha(cat.color, 0.03),
                  boxShadow: `0 4px 20px ${alpha(cat.color, 0.12)}`,
                  transform: 'translateY(-2px)',
                },
              }}
              onClick={() => navigate(cat.href)}
            >
              <Box sx={{ display: 'flex', gap: 2.5 }}>
                {/* Icon */}
                <Box sx={{
                  width: 72,
                  height: 72,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  bgcolor: alpha(cat.color, isDark ? 0.15 : 0.08),
                  color: cat.color,
                  flexShrink: 0,
                }}>
                  {cat.icon}
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: cat.color, mb: 0.5, fontSize: '1.05rem' }}>
                    {cat.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                    {cat.description}
                  </Typography>

                  {/* Quick links */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                    {cat.quickLinks.map((link) => (
                      <MuiLink
                        key={link.href}
                        component="span"
                        variant="body2"
                        sx={{
                          cursor: 'pointer',
                          textDecoration: 'none',
                          color: theme.palette.primary.main,
                          fontSize: '0.82rem',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          navigate(link.href, {
                            state: {
                              breadcrumbTrail: [
                                { to: '/', title: 'Home' },
                                { to: '/admin/control-panel', title: 'Control Panel' },
                                { to: cat.href, title: cat.title },
                              ],
                            },
                          });
                        }}
                      >
                        {link.label}
                      </MuiLink>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </PageContainer>
  );
};

export default AdminControlPanel;
