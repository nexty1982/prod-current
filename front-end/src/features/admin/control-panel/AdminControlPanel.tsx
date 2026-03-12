/**
 * AdminControlPanel.tsx
 * Windows Control Panel-style admin hub for super_admin users.
 * Located at /admin/control-panel
 *
 * 7 major categories + Components In Development section
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { FEATURE_REGISTRY, type FeatureEntry } from '@/config/featureRegistry';
import { apiClient } from '@/shared/lib/apiClient';
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
    OpenInNew as OpenIcon,
    RocketLaunch as PrototypeIcon,
    Build as BuildIcon,
    Visibility as ReviewIcon,
    Tune as StabilizingIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    Chip,
    Link as MuiLink,
    Paper,
    Skeleton,
    Tooltip,
    Typography,
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
      { label: 'Church Onboarding Pipeline', href: '/admin/control-panel/church-onboarding' },
      { label: 'Sacramental Restrictions', href: '/admin/control-panel/church-management/sacramental-restrictions' },
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
      { label: 'Code Safety System', href: '/admin/control-panel/system-server/code-safety' },
      { label: 'Site Map', href: '/site-map' },
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
  {
    key: 'suite',
    title: 'OM App Suite',
    description: 'Internal productivity tools, analytics, documentation, and learning',
    icon: <SuiteIcon sx={{ fontSize: 48 }} />,
    color: '#0277bd',
    href: '/admin/control-panel/om-app-suite',
    quickLinks: [
      { label: 'OM Tasks', href: '/devel-tools/om-tasks' },
      { label: 'OM Charts', href: '/apps/om-charts' },
      { label: 'OM Library', href: '/church/om-spec' },
    ],
  },
];

// ─── Stage display config ───────────────────────────────────────

const STAGE_CONFIG: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  1: { label: 'Prototype', color: '#e53935', icon: <PrototypeIcon sx={{ fontSize: 16 }} /> },
  2: { label: 'Development', color: '#e53935', icon: <BuildIcon sx={{ fontSize: 16 }} /> },
  3: { label: 'Review', color: '#f57c00', icon: <ReviewIcon sx={{ fontSize: 16 }} /> },
  4: { label: 'Stabilizing', color: '#f57c00', icon: <StabilizingIcon sx={{ fontSize: 16 }} /> },
};

interface ChangeSetBrief {
  id: number;
  code: string;
  title: string;
  status: string;
  git_branch: string | null;
}

/** Match a feature to a change set by its explicit changeSetCode */
function findLinkedChangeSet(feature: FeatureEntry, changeSets: ChangeSetBrief[]): ChangeSetBrief | undefined {
  if (!feature.changeSetCode) return undefined;
  return changeSets.find(cs => cs.code === feature.changeSetCode);
}

// ─── Component ──────────────────────────────────────────────────

const AdminControlPanel: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [changeSets, setChangeSets] = useState<ChangeSetBrief[]>([]);
  const [csLoading, setCsLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/change-sets').then(res => {
      setChangeSets(res.data?.change_sets || []);
    }).catch(() => {}).finally(() => setCsLoading(false));
  }, []);

  const devFeatures = FEATURE_REGISTRY.filter(f => f.stage >= 1 && f.stage <= 4);
  const grouped = [4, 3, 2, 1].map(stage => ({
    stage,
    ...STAGE_CONFIG[stage],
    features: devFeatures.filter(f => f.stage === stage),
  })).filter(g => g.features.length > 0);

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

        {/* ── Components In Development ─────────────────────────── */}
        <Box sx={{ mt: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <DevIcon sx={{ color: '#7b1fa2', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={700}>
              Components In Development
            </Typography>
            <Chip
              label={`${devFeatures.length} features`}
              size="small"
              sx={{ bgcolor: alpha('#7b1fa2', 0.1), color: '#7b1fa2', fontWeight: 600, fontSize: '0.75rem' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, ml: 5.5 }}>
            Features progressing through the SDLC pipeline. Stages 1-4 are visible to super_admin only.
          </Typography>

          {grouped.map(group => (
            <Box key={group.stage} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ color: group.color, display: 'flex', alignItems: 'center' }}>{group.icon}</Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: group.color }}>
                  Stage {group.stage}: {group.label}
                </Typography>
                <Chip
                  label={group.features.length}
                  size="small"
                  sx={{
                    height: 20, minWidth: 20,
                    bgcolor: alpha(group.color, 0.12),
                    color: group.color,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>

              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
                gap: 1.5,
                ml: 3.5,
              }}>
                {group.features.map(feature => {
                  const linkedCS = csLoading ? undefined : findLinkedChangeSet(feature, changeSets);
                  return (
                    <Paper
                      key={feature.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderLeft: `3px solid ${group.color}`,
                        cursor: feature.route ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                        '&:hover': feature.route ? {
                          bgcolor: alpha(group.color, 0.03),
                          borderColor: group.color,
                        } : {},
                      }}
                      onClick={() => feature.route && navigate(feature.route)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem', lineHeight: 1.3 }}>
                          {feature.name}
                        </Typography>
                        {feature.route && (
                          <Tooltip title="Open feature">
                            <OpenIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 0.5, flexShrink: 0 }} />
                          </Tooltip>
                        )}
                      </Box>

                      {feature.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, lineHeight: 1.3 }}>
                          {feature.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {feature.since && (
                          <Chip
                            label={`Since ${feature.since}`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem', borderColor: isDark ? '#555' : '#ccc' }}
                          />
                        )}
                        {csLoading ? (
                          <Skeleton width={80} height={18} />
                        ) : linkedCS ? (
                          <Chip
                            label={`${linkedCS.code} · ${linkedCS.status.replace(/_/g, ' ')}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              bgcolor: linkedCS.status === 'promoted'
                                ? alpha('#388e3c', 0.12)
                                : linkedCS.status === 'active'
                                ? alpha('#1976d2', 0.12)
                                : alpha('#757575', 0.1),
                              color: linkedCS.status === 'promoted'
                                ? '#388e3c'
                                : linkedCS.status === 'active'
                                ? '#1976d2'
                                : '#757575',
                              cursor: 'pointer',
                            }}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              navigate(`/admin/control-panel/om-daily/change-sets/${linkedCS.id}`);
                            }}
                          />
                        ) : (
                          <Chip
                            label="No change set"
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem', borderColor: isDark ? '#555' : '#ddd', color: 'text.disabled' }}
                          />
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </PageContainer>
  );
};

export default AdminControlPanel;
