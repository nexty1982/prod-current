/**
 * AdminControlPanel.tsx
 * Windows Control Panel-style admin hub for super_admin users.
 * Located at /admin/control-panel
 *
 * Includes CRM pipeline & follow-up widget + category tiles
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { DEPRECATION_REGISTRY } from '@/config/deprecationRegistry';
import { FEATURE_REGISTRY } from '@/config/featureRegistry';
import PageContainer from '@/shared/ui/PageContainer';
import {
    Psychology as AIIcon,
    Business as ChurchIcon,
    CalendarMonth as DailyIcon,
    Campaign as OutreachIcon,
    Description as RecordsIcon,
    Dns as ServerIcon,
    Widgets as SuiteIcon,
    Code as DevIcon,
    FolderOff as DeprecatedIcon,
    WarningAmber as OverdueIcon,
    Today as TodayIcon,
    TrendingUp as PipelineIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    Chip,
    CircularProgress,
    useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
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
  bgLight: string;
  bgDark: string;
  href: string;
  quickLinks: QuickLink[];
}

const CATEGORIES: Category[] = [
  {
    key: 'church',
    title: 'Church Management',
    description: 'Manage churches, setup wizards, field mapping, and provisioning',
    icon: <ChurchIcon sx={{ fontSize: 28 }} />,
    color: '#1976d2',
    bgLight: 'rgba(25, 118, 210, 0.08)',
    bgDark: 'rgba(25, 118, 210, 0.15)',
    href: '/admin/control-panel/church-management',
    quickLinks: [
      { label: 'All Churches', href: '/apps/church-management' },
      { label: 'Church Lifecycle', href: '/admin/control-panel/church-lifecycle' },
      { label: 'Jurisdictions', href: '/admin/control-panel/jurisdictions' },
      { label: 'Demo Churches', href: '/admin/control-panel/demo-churches' },
      { label: 'Sacramental Restrictions', href: '/admin/control-panel/church-management/sacramental-restrictions' },
    ],
  },
  {
    key: 'records',
    title: 'Records & OCR',
    description: 'Church metric records, OCR document processing, data tools, and reports',
    icon: <RecordsIcon sx={{ fontSize: 28 }} />,
    color: '#388e3c',
    bgLight: 'rgba(56, 142, 60, 0.08)',
    bgDark: 'rgba(56, 142, 60, 0.15)',
    href: '/admin/control-panel/records-ocr',
    quickLinks: [
      { label: 'Church Metric Records', href: '/apps/records/baptism' },
      { label: 'Certificate Templates', href: '/admin/control-panel/certificate-templates' },
      { label: 'OCR Studio', href: '/devel/ocr-studio' },
      { label: 'Live Table Builder', href: '/devel-tools/live-table-builder' },
    ],
  },
  {
    key: 'crm',
    title: 'CRM & Outreach',
    description: 'Church lifecycle pipeline, lead management, US church map, and sales',
    icon: <OutreachIcon sx={{ fontSize: 28 }} />,
    color: '#7b1fa2',
    bgLight: 'rgba(123, 31, 162, 0.08)',
    bgDark: 'rgba(123, 31, 162, 0.15)',
    href: '/admin/control-panel/crm-outreach',
    quickLinks: [
      { label: 'Church Lifecycle', href: '/admin/control-panel/church-lifecycle' },
      { label: 'US Church Map', href: '/devel-tools/us-church-map' },
    ],
  },
  {
    key: 'system',
    title: 'System & Server',
    description: 'Users, security, content, server diagnostics, monitoring, and social features',
    icon: <ServerIcon sx={{ fontSize: 28 }} />,
    color: '#d32f2f',
    bgLight: 'rgba(211, 47, 47, 0.08)',
    bgDark: 'rgba(211, 47, 47, 0.15)',
    href: '/admin/control-panel/system-server',
    quickLinks: [
      { label: 'User Management', href: '/admin/users' },
      { label: 'Code Safety System', href: '/admin/control-panel/system-server/code-safety' },
      { label: 'Site Map', href: '/site-map' },
      { label: 'API Explorer', href: '/devel-tools/api-explorer' },
    ],
  },
  {
    key: 'ai',
    title: 'AI & Automation',
    description: 'AI admin panel, OMAI logger, and automation settings',
    icon: <AIIcon sx={{ fontSize: 28 }} />,
    color: '#f57c00',
    bgLight: 'rgba(245, 124, 0, 0.08)',
    bgDark: 'rgba(245, 124, 0, 0.15)',
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
    icon: <DailyIcon sx={{ fontSize: 28 }} />,
    color: '#00897b',
    bgLight: 'rgba(0, 137, 123, 0.08)',
    bgDark: 'rgba(0, 137, 123, 0.15)',
    href: '/admin/control-panel/om-daily',
    quickLinks: [
      { label: '24-Hour Plan', href: '/admin/control-panel/om-daily?horizon=1' },
      { label: '48-Hour Plan', href: '/admin/control-panel/om-daily?horizon=2' },
      { label: '7-Day Plan', href: '/admin/control-panel/om-daily?horizon=7' },
    ],
  },
  {
    key: 'suite',
    title: 'OM App Suite',
    description: 'Internal productivity tools, analytics, documentation, and learning',
    icon: <SuiteIcon sx={{ fontSize: 28 }} />,
    color: '#0277bd',
    bgLight: 'rgba(2, 119, 189, 0.08)',
    bgDark: 'rgba(2, 119, 189, 0.15)',
    href: '/admin/control-panel/om-app-suite',
    quickLinks: [
      { label: 'OM Tasks', href: '/devel-tools/om-tasks' },
      { label: 'OM Charts', href: '/apps/om-charts' },
      { label: 'OM Library', href: '/church/om-spec' },
    ],
  },
  {
    key: 'dev-components',
    title: 'Components In Development',
    description: `${FEATURE_REGISTRY.filter(f => f.stage >= 1 && f.stage <= 4).length} features progressing through the SDLC pipeline (stages 1-4)`,
    icon: <DevIcon sx={{ fontSize: 28 }} />,
    color: '#7b1fa2',
    bgLight: 'rgba(123, 31, 162, 0.08)',
    bgDark: 'rgba(123, 31, 162, 0.15)',
    href: '/admin/control-panel/components-in-development',
    quickLinks: [
      { label: 'Overview (All Stages)', href: '/admin/control-panel/components-in-development' },
      { label: 'Stabilizing (Stage 4)', href: '/admin/control-panel/components-in-development?stage=4' },
      { label: 'Review (Stage 3)', href: '/admin/control-panel/components-in-development?stage=3' },
      { label: 'Development (Stage 2)', href: '/admin/control-panel/components-in-development?stage=2' },
      { label: 'Prototype (Stage 1)', href: '/admin/control-panel/components-in-development?stage=1' },
    ],
  },
  {
    key: 'deprecated-components',
    title: 'Deprecated Components',
    description: `${DEPRECATION_REGISTRY.length} components tracked through the deprecation pipeline`,
    icon: <DeprecatedIcon sx={{ fontSize: 28 }} />,
    color: '#c62828',
    bgLight: 'rgba(198, 40, 40, 0.08)',
    bgDark: 'rgba(198, 40, 40, 0.15)',
    href: '/admin/control-panel/deprecated-components',
    quickLinks: [
      { label: 'Overview (All Stages)', href: '/admin/control-panel/deprecated-components' },
      { label: 'Deprecated', href: '/admin/control-panel/deprecated-components?stage=1' },
      { label: 'Quarantined', href: '/admin/control-panel/deprecated-components?stage=2' },
      { label: 'Verified', href: '/admin/control-panel/deprecated-components?stage=3' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────

/* ─── Pipeline Widget ─────────────────────────────────────────── */

interface PipelineWidgetData {
  overdue: number;
  todayFollowups: number;
  totalCrmLeads: number;
  totalOnboarded: number;
  pipeline: { stage_key: string; label: string; color: string; count: number; is_terminal: number }[];
}

const PipelineWidget: React.FC<{ isDark: boolean; navigate: ReturnType<typeof useNavigate> }> = ({ isDark, navigate }) => {
  const [data, setData] = useState<PipelineWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/church-lifecycle/dashboard', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, mb: 2 }}>
      <CircularProgress size={20} />
    </Box>
  );
  if (!data) return null;

  const activeStages = data.pipeline.filter(s => !s.is_terminal && s.count > 0);

  return (
    <div
      className="om-admin-card"
      onClick={() => navigate('/admin/control-panel/church-lifecycle')}
      style={{ marginBottom: '1.5rem' }}
    >
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Follow-up alerts */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {data.overdue > 0 && (
            <Chip
              icon={<OverdueIcon sx={{ fontSize: 16 }} />}
              label={`${data.overdue} overdue`}
              size="small"
              sx={{
                fontWeight: 600,
                bgcolor: alpha('#f44336', isDark ? 0.2 : 0.1),
                color: '#f44336',
                border: `1px solid ${alpha('#f44336', 0.3)}`,
                cursor: 'pointer',
              }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                navigate('/admin/control-panel/church-lifecycle');
              }}
            />
          )}
          {data.todayFollowups > 0 && (
            <Chip
              icon={<TodayIcon sx={{ fontSize: 16 }} />}
              label={`${data.todayFollowups} today`}
              size="small"
              sx={{
                fontWeight: 600,
                bgcolor: alpha('#ff9800', isDark ? 0.2 : 0.1),
                color: '#ff9800',
                border: `1px solid ${alpha('#ff9800', 0.3)}`,
                cursor: 'pointer',
              }}
            />
          )}
          <Chip
            icon={<PipelineIcon sx={{ fontSize: 16 }} />}
            label={`${data.totalCrmLeads} leads · ${data.totalOnboarded} onboarded`}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 500, cursor: 'pointer' }}
          />
        </div>

        {/* Mini pipeline bar */}
        {activeStages.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
            {activeStages.slice(0, 6).map(s => (
              <Chip
                key={s.stage_key}
                label={`${s.label}: ${s.count}`}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  height: 24,
                  bgcolor: alpha(s.color, isDark ? 0.2 : 0.1),
                  color: s.color,
                  border: `1px solid ${alpha(s.color, 0.25)}`,
                  cursor: 'pointer',
                }}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  navigate(`/admin/control-panel/church-lifecycle?stage=${s.stage_key}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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
      <Box sx={{ px: { xs: 1, md: 2 } }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <h2 className="om-admin-heading" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
            Orthodox Metrics Administration
          </h2>
          <p className="om-admin-description" style={{ margin: 0 }}>
            Manage your Orthodox community platform. Select a category to get started.
          </p>
        </Box>

        {/* Pipeline & Follow-up Widget */}
        <PipelineWidget isDark={isDark} navigate={navigate} />

        {/* Category tiles — 2-column grid */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2.5,
        }}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="om-admin-card"
              onClick={() => navigate(cat.href)}
            >
              <div style={{ display: 'flex', gap: '1rem' }}>
                {/* Icon */}
                <div
                  className="om-admin-icon"
                  style={{
                    backgroundColor: isDark ? cat.bgDark : cat.bgLight,
                    color: cat.color,
                  }}
                >
                  {cat.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      color: cat.color,
                      marginBottom: '0.25rem',
                    }}
                  >
                    {cat.title}
                  </div>
                  <p className="om-text-tertiary" style={{
                    margin: '0 0 0.75rem',
                    fontSize: '0.8125rem',
                    lineHeight: 1.5,
                  }}>
                    {cat.description}
                  </p>

                  {/* Quick links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    {cat.quickLinks.map((link) => (
                      <span
                        key={link.href}
                        className="om-quick-link"
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
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Box>

      </Box>
    </PageContainer>
  );
};

export default AdminControlPanel;
