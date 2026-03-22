/**
 * ComponentsInDevelopmentPage.tsx — Features progressing through the SDLC pipeline
 *
 * Located at /admin/control-panel/components-in-development
 * Shows all features in stages 1-4 grouped by stage, with change set linkage.
 * Sub-routes: ?stage=1|2|3|4 to filter to a specific stage.
 */

import { FEATURE_REGISTRY, type FeatureEntry } from '@/config/featureRegistry';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { apiClient } from '@/shared/lib/apiClient';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as BackIcon,
    Build as BuildIcon,
    Code as DevIcon,
    FilterList as FilterIcon,
    OpenInNew as OpenIcon,
    RocketLaunch as PrototypeIcon,
    Visibility as ReviewIcon,
    Tune as StabilizingIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    Chip,
    IconButton,
    Paper,
    Skeleton,
    Tab,
    Tabs,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ─── Stage config ────────────────────────────────────────────

const STAGE_CONFIG: Record<number, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  1: { label: 'Prototype', color: '#e53935', icon: <PrototypeIcon />, description: 'Feature concepts being explored — may have placeholder UI or incomplete backend' },
  2: { label: 'Development', color: '#c62828', icon: <BuildIcon />, description: 'Actively being built — functional UI with at least partial backend integration' },
  3: { label: 'Review', color: '#e65100', icon: <ReviewIcon />, description: 'Functionally complete and ready for stakeholder review' },
  4: { label: 'Stabilizing', color: '#f57c00', icon: <StabilizingIcon />, description: 'Approved and being hardened — focus on error handling, edge cases, performance' },
};

interface ChangeSetBrief {
  id: number;
  code: string;
  title: string;
  status: string;
  git_branch: string | null;
}

// ─── Component ───────────────────────────────────────────────

const ComponentsInDevelopmentPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [changeSets, setChangeSets] = useState<ChangeSetBrief[]>([]);
  const [csLoading, setCsLoading] = useState(true);

  const stageFilter = parseInt(searchParams.get('stage') || '0');

  useEffect(() => {
    apiClient.get('/admin/change-sets').then(res => {
      setChangeSets(res.data?.change_sets || []);
    }).catch(() => {}).finally(() => setCsLoading(false));
  }, []);

  const devFeatures = useMemo(() =>
    FEATURE_REGISTRY.filter(f => f.stage >= 1 && f.stage <= 4),
  []);

  const grouped = useMemo(() =>
    [4, 3, 2, 1].map(stage => ({
      stage,
      ...STAGE_CONFIG[stage],
      features: devFeatures.filter(f => f.stage === stage),
    })).filter(g => g.features.length > 0),
  [devFeatures]);

  const visibleGroups = stageFilter
    ? grouped.filter(g => g.stage === stageFilter)
    : grouped;

  const findLinkedCS = (feature: FeatureEntry): ChangeSetBrief | undefined => {
    if (!feature.changeSetCode) return undefined;
    return changeSets.find(cs => cs.code === feature.changeSetCode);
  };

  const csStatusColor = (status: string) => {
    if (status === 'promoted') return '#388e3c';
    if (status === 'active') return '#1976d2';
    if (status === 'in_review' || status === 'approved') return '#f57c00';
    return '#757575';
  };

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'Components In Development' },
  ];

  return (
    <PageContainer title="Components In Development" description="Features progressing through the SDLC pipeline">
      <Breadcrumb title="Components In Development" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ───────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate('/admin/control-panel')}
            sx={{ bgcolor: alpha('#7b1fa2', 0.08), color: '#7b1fa2' }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{
            width: 56, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2,
            bgcolor: alpha('#7b1fa2', isDark ? 0.15 : 0.08),
            color: '#7b1fa2',
            flexShrink: 0,
          }}>
            <DevIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>Components In Development</Typography>
            <Typography variant="body2" color="text.secondary">
              {devFeatures.length} features progressing through the SDLC pipeline (stages 1-4, super_admin only)
            </Typography>
          </Box>
        </Box>

        {/* ── Stage overview cards ─────────────────────────── */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2,
          mb: 3,
        }}>
          {[4, 3, 2, 1].map(stage => {
            const cfg = STAGE_CONFIG[stage];
            const count = devFeatures.filter(f => f.stage === stage).length;
            const isActive = stageFilter === stage;
            return (
              <Paper
                key={stage}
                elevation={0}
                sx={{
                  p: 2,
                  border: `2px solid ${isActive ? cfg.color : alpha(cfg.color, 0.25)}`,
                  borderRadius: 2,
                  bgcolor: isActive ? alpha(cfg.color, isDark ? 0.15 : 0.08) : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: cfg.color,
                    bgcolor: alpha(cfg.color, isDark ? 0.12 : 0.06),
                  },
                }}
                onClick={() => setSearchParams(isActive ? {} : { stage: String(stage) })}
              >
                <Box sx={{ color: cfg.color, mb: 0.5 }}>{cfg.icon}</Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: cfg.color }}>
                  Stage {stage}: {cfg.label}
                </Typography>
                <Chip
                  label={`${count} feature${count !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    mt: 1,
                    fontWeight: 600,
                    bgcolor: alpha(cfg.color, 0.12),
                    color: cfg.color,
                  }}
                />
              </Paper>
            );
          })}
        </Box>

        {/* ── Filter indicator ─────────────────────────────── */}
        {stageFilter > 0 && STAGE_CONFIG[stageFilter] && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Showing Stage {stageFilter}: {STAGE_CONFIG[stageFilter].label} only
            </Typography>
            <Chip
              label="Show all"
              size="small"
              variant="outlined"
              onClick={() => setSearchParams({})}
              sx={{ cursor: 'pointer', fontSize: '0.72rem' }}
            />
          </Box>
        )}

        {/* ── Stage groups ─────────────────────────────────── */}
        {visibleGroups.map(group => (
          <Box key={group.stage} sx={{ mb: 4 }}>
            {/* Stage header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ color: group.color, display: 'flex', alignItems: 'center' }}>{group.icon}</Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: group.color }}>
                Stage {group.stage}: {group.label}
              </Typography>
              <Chip
                label={group.features.length}
                size="small"
                sx={{
                  height: 22, minWidth: 22,
                  bgcolor: alpha(group.color, 0.12),
                  color: group.color,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ml: 5 }}>
              {group.description}
            </Typography>

            {/* Feature cards */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
              gap: 1.5,
              ml: { xs: 0, md: 2 },
            }}>
              {group.features.map(feature => {
                const linkedCS = csLoading ? undefined : findLinkedCS(feature);
                return (
                  <Paper
                    key={feature.id}
                    variant="outlined"
                    sx={{
                      p: 2,
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
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.88rem', lineHeight: 1.3 }}>
                        {feature.name}
                      </Typography>
                      {feature.route && (
                        <Tooltip title="Open feature">
                          <OpenIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 0.5, flexShrink: 0 }} />
                        </Tooltip>
                      )}
                    </Box>

                    {feature.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}>
                        {feature.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {feature.since && (
                        <Chip
                          label={`Since ${feature.since}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.68rem', borderColor: isDark ? '#555' : '#ccc' }}
                        />
                      )}
                      {feature.changeSetCode && (
                        csLoading ? (
                          <Skeleton width={80} height={20} />
                        ) : linkedCS ? (
                          <Chip
                            label={`${linkedCS.code} · ${linkedCS.status.replace(/_/g, ' ')}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              bgcolor: alpha(csStatusColor(linkedCS.status), 0.12),
                              color: csStatusColor(linkedCS.status),
                              cursor: 'pointer',
                            }}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              navigate(`/admin/control-panel/om-daily/change-sets/${linkedCS.id}`);
                            }}
                          />
                        ) : (
                          <Chip
                            label={feature.changeSetCode}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.68rem', borderColor: isDark ? '#555' : '#ddd', color: 'text.disabled' }}
                          />
                        )
                      )}
                      {!feature.changeSetCode && (
                        <Chip
                          label="No change set"
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.68rem', borderColor: isDark ? '#555' : '#ddd', color: 'text.disabled' }}
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
    </PageContainer>
  );
};

export default ComponentsInDevelopmentPage;
