/**
 * DeprecatedComponentsPage.tsx — Components progressing through deprecation
 *
 * Located at /admin/control-panel/deprecated-components
 * Shows all deprecated components grouped by stage, with tool integration links.
 * Sub-routes: ?stage=1|2|3|4|5 to filter to a specific stage.
 *
 * Integration:
 *   - OMTrace: "Verify Imports" button → navigates to OMTrace with component pre-loaded
 *   - Refactor Console: "Check in Refactor Console" link
 *   - Feature Registry: cross-references to ensure deprecated items aren't still registered
 */

import {
  DEPRECATION_REGISTRY,
  deprecatedCountByStage,
  type DeprecatedEntry,
} from '@/config/deprecationRegistry';
import { FEATURE_REGISTRY } from '@/config/featureRegistry';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  ArrowBack as BackIcon,
  Archive as ArchivedIcon,
  CheckCircle as VerifiedIcon,
  DeleteForever as RemovedIcon,
  FilterList as FilterIcon,
  FolderOff as QuarantineIcon,
  OpenInNew as OpenIcon,
  Search as SearchIcon,
  Warning as DeprecatedIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ─── Stage config ────────────────────────────────────────────

const STAGE_CONFIG: Record<number, {
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}> = {
  1: {
    label: 'Deprecated',
    color: '#e65100',
    icon: <DeprecatedIcon />,
    description: 'Marked for removal — still functional but routes redirect. No new development.',
  },
  2: {
    label: 'Quarantined',
    color: '#c62828',
    icon: <QuarantineIcon />,
    description: 'Routes removed from Router.tsx, lazy imports severed. Files still exist on disk.',
  },
  3: {
    label: 'Verified',
    color: '#1565c0',
    icon: <VerifiedIcon />,
    description: 'OMTrace confirms zero remaining imports. Safe to delete files.',
  },
  4: {
    label: 'Removed',
    color: '#2e7d32',
    icon: <RemovedIcon />,
    description: 'Files deleted from disk. Available in git history and Refactor Console backups.',
  },
  5: {
    label: 'Archived',
    color: '#616161',
    icon: <ArchivedIcon />,
    description: 'Fully archived — recorded in history for future reference.',
  },
};

// ─── Component ───────────────────────────────────────────────

const DeprecatedComponentsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const stageFilter = parseInt(searchParams.get('stage') || '0');
  const stageCounts = useMemo(() => deprecatedCountByStage(), []);

  // Check for cross-registry conflicts (deprecated items still in feature registry)
  const conflicts = useMemo(() => {
    const featureRoutes = new Set(FEATURE_REGISTRY.map(f => f.route).filter(Boolean));
    return DEPRECATION_REGISTRY.filter(d =>
      d.originalRoute && featureRoutes.has(d.originalRoute) && d.stage >= 2
    );
  }, []);

  const grouped = useMemo(() =>
    [1, 2, 3, 4, 5].map(stage => ({
      stage,
      ...STAGE_CONFIG[stage],
      entries: DEPRECATION_REGISTRY.filter(e => e.stage === stage),
    })).filter(g => g.entries.length > 0),
  []);

  const visibleGroups = stageFilter
    ? grouped.filter(g => g.stage === stageFilter)
    : grouped;

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'Deprecated Components' },
  ];

  const openOmtrace = (entry: DeprecatedEntry) => {
    // Navigate to OMTrace with the first file pre-loaded as target
    const target = entry.files[0]?.replace(/\/$/, '').split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || entry.id;
    navigate(`/devel-tools/omtrace?target=${encodeURIComponent(target)}`);
  };

  const openRefactorConsole = () => {
    navigate('/devel-tools/refactor-console');
  };

  return (
    <PageContainer title="Deprecated Components" description="Components progressing through deprecation toward removal">
      <Breadcrumb title="Deprecated Components" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ───────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate('/admin/control-panel')}
            sx={{ bgcolor: alpha('#c62828', 0.08), color: '#c62828' }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{
            width: 56, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2,
            bgcolor: alpha('#c62828', isDark ? 0.15 : 0.08),
            color: '#c62828',
            flexShrink: 0,
          }}>
            <QuarantineIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>Deprecated Components</Typography>
            <Typography variant="body2" color="text.secondary">
              {DEPRECATION_REGISTRY.length} component{DEPRECATION_REGISTRY.length !== 1 ? 's' : ''} tracked through the deprecation pipeline
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={openRefactorConsole}
            sx={{ textTransform: 'none', borderColor: '#757575', color: 'text.secondary' }}
          >
            Open Refactor Console
          </Button>
        </Box>

        {/* ── Conflicts warning ──────────────────────────── */}
        {conflicts.length > 0 && (
          <Paper sx={{
            p: 2, mb: 3,
            border: '1px solid',
            borderColor: '#e65100',
            bgcolor: alpha('#e65100', 0.05),
            borderRadius: 2,
          }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#e65100', mb: 0.5 }}>
              Cross-Registry Conflict
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {conflicts.length} deprecated component{conflicts.length !== 1 ? 's' : ''} still
              {' '}have routes registered in the Feature Registry:
              {' '}{conflicts.map(c => c.name).join(', ')}
            </Typography>
          </Paper>
        )}

        {/* ── Stage overview cards ─────────────────────────── */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
          gap: 2,
          mb: 3,
        }}>
          {[1, 2, 3, 4, 5].map(stage => {
            const cfg = STAGE_CONFIG[stage];
            const count = stageCounts[stage] || 0;
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
                <Typography variant="caption" fontWeight={700} sx={{ color: cfg.color }}>
                  {cfg.label}
                </Typography>
                <Chip
                  label={count}
                  size="small"
                  sx={{
                    mt: 0.5,
                    display: 'block',
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
              Showing {STAGE_CONFIG[stageFilter].label} only
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
                label={group.entries.length}
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

            {/* Entry cards */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 1.5,
              ml: { xs: 0, md: 2 },
            }}>
              {group.entries.map(entry => (
                <Paper
                  key={entry.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderLeft: `3px solid ${group.color}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Title row */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.88rem', lineHeight: 1.3 }}>
                      {entry.name}
                    </Typography>
                    {entry.category && (
                      <Chip
                        label={entry.category}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.65rem', ml: 1 }}
                      />
                    )}
                  </Box>

                  {/* Reason */}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}>
                    {entry.reason}
                  </Typography>

                  {/* Route info */}
                  {entry.originalRoute && (
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      <Box component="span" sx={{ color: 'text.disabled' }}>route: </Box>
                      <Box component="span" sx={{ textDecoration: 'line-through', color: 'error.main' }}>{entry.originalRoute}</Box>
                      {entry.redirectTo && (
                        <>
                          <Box component="span" sx={{ color: 'text.disabled' }}> → </Box>
                          <Box component="span" sx={{ color: 'success.main' }}>{entry.redirectTo}</Box>
                        </>
                      )}
                    </Typography>
                  )}

                  {/* Files */}
                  <Box sx={{ mb: 1 }}>
                    {entry.files.map((file, i) => (
                      <Typography key={i} variant="caption" sx={{
                        display: 'block',
                        fontFamily: 'monospace',
                        fontSize: '0.68rem',
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {file}
                      </Typography>
                    ))}
                  </Box>

                  {/* Metadata chips + actions */}
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                      label={`Deprecated ${entry.deprecatedDate}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.68rem', borderColor: isDark ? '#555' : '#ccc' }}
                    />
                    {entry.replacement && (
                      <Chip
                        label={`→ ${entry.replacement}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.68rem',
                          bgcolor: alpha('#2e7d32', 0.12),
                          color: '#2e7d32',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        onClick={() => entry.replacement && navigate(entry.replacement)}
                      />
                    )}
                    {entry.changeSetCode && (
                      <Chip
                        label={entry.changeSetCode}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          bgcolor: alpha('#1976d2', 0.12),
                          color: '#1976d2',
                        }}
                      />
                    )}
                    {typeof entry.remainingImports === 'number' && (
                      <Chip
                        label={`${entry.remainingImports} import${entry.remainingImports !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          bgcolor: alpha(entry.remainingImports === 0 ? '#2e7d32' : '#c62828', 0.12),
                          color: entry.remainingImports === 0 ? '#2e7d32' : '#c62828',
                        }}
                      />
                    )}
                  </Box>

                  {/* Tool integration buttons (only for stages 1-3 where files exist) */}
                  {entry.stage <= 3 && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                      <Tooltip title="Analyze imports in OMTrace">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SearchIcon sx={{ fontSize: '14px !important' }} />}
                          onClick={() => openOmtrace(entry)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.72rem',
                            py: 0.25,
                            borderColor: alpha('#1565c0', 0.4),
                            color: '#1565c0',
                          }}
                        >
                          Verify Imports
                        </Button>
                      </Tooltip>
                      {entry.redirectTo && (
                        <Tooltip title="Go to replacement">
                          <IconButton
                            size="small"
                            onClick={() => navigate(entry.redirectTo!)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <OpenIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          </Box>
        ))}

        {/* ── Empty state ─────────────────────────────────── */}
        {visibleGroups.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {stageFilter
                ? `No components at stage ${stageFilter} (${STAGE_CONFIG[stageFilter]?.label})`
                : 'No deprecated components tracked yet'}
            </Typography>
          </Paper>
        )}

        {/* ── Workflow reference ──────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Deprecation Workflow</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((stage, i) => (
              <React.Fragment key={stage}>
                {i > 0 && <Typography variant="caption" color="text.disabled">→</Typography>}
                <Chip
                  label={`${stage}. ${STAGE_CONFIG[stage].label}`}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    bgcolor: alpha(STAGE_CONFIG[stage].color, 0.12),
                    color: STAGE_CONFIG[stage].color,
                  }}
                />
              </React.Fragment>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Use OMTrace to verify zero imports before advancing from Quarantined → Verified.
            Use Refactor Console to restore from backup if a removal was premature.
          </Typography>
        </Paper>
      </Box>
    </PageContainer>
  );
};

export default DeprecatedComponentsPage;
