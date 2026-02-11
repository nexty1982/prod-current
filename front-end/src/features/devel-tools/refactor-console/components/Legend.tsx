import { Classification, FilterState, RefactorScan } from '@/types/refactorConsole';
import { Box, Button, ButtonGroup, Chip, CircularProgress, Collapse, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    AlertTriangle,
    Archive,
    ArrowRight,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Clock,
    Eye,
    FolderOpen,
    GitBranch,
    RefreshCw,
    Shield,
    XCircle
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import refactorConsoleClient, { CanonicalLocation } from '../api/refactorConsoleClient';

interface LegendProps {
  scanData: RefactorScan | null;
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  className?: string;
  whitelistCount?: number;
}

const Legend: React.FC<LegendProps> = ({
  scanData,
  filterState,
  onFilterChange,
  className = '',
  whitelistCount = 0
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  if (!scanData) return null;

  const classificationConfigs = [
    {
      key: 'green' as Classification,
      label: 'Production Ready',
      icon: CheckCircle,
      description: 'Likely in production and actively used',
      color: 'green',
      count: scanData.summary.likelyInProd
    },
    {
      key: 'orange' as Classification,
      label: 'High Risk',
      icon: AlertTriangle,
      description: 'May be used by multiple feature areas',
      color: 'orange',
      count: scanData.summary.highRisk
    },
    {
      key: 'yellow' as Classification,
      label: 'In Development',
      icon: Clock,
      description: 'Development files or low usage, recent edits',
      color: 'yellow',
      count: scanData.summary.inDevelopment
    },
    {
      key: 'red' as Classification,
      label: 'Legacy/Duplicate',
      icon: XCircle,
      description: 'Duplicates, legacy patterns, or old files',
      color: 'red',
      count: scanData.summary.legacyOrDupes
    }
  ];

  const handleClassificationToggle = (classification: Classification) => {
    const newClassifications = filterState.classifications.includes(classification)
      ? filterState.classifications.filter(c => c !== classification)
      : [...filterState.classifications, classification];
    
    onFilterChange({ classifications: newClassifications });
  };

  const handleSelectAllClassifications = () => {
    onFilterChange({ classifications: ['green', 'orange', 'yellow', 'red'] });
  };

  const handleDeselectAllClassifications = () => {
    onFilterChange({ classifications: [] });
  };

  // Get theme-aware styles for each classification
  const getColorStyles = (color: string) => {
    const colorMap: Record<string, { main: string; light: string; dark: string }> = {
      green: { main: theme.palette.success.main, light: theme.palette.success.light, dark: theme.palette.success.dark },
      orange: { main: theme.palette.warning.main, light: theme.palette.warning.light, dark: theme.palette.warning.dark },
      yellow: { main: theme.palette.warning.main, light: theme.palette.warning.light, dark: theme.palette.warning.dark },
      red: { main: theme.palette.error.main, light: theme.palette.error.light, dark: theme.palette.error.dark },
    };
    const colors = colorMap[color] || { main: theme.palette.grey[500], light: theme.palette.grey[100], dark: theme.palette.grey[700] };
    return {
      bgcolor: alpha(colors.main, isDark ? 0.25 : 0.12),
      color: isDark ? '#fff' : colors.dark,
      borderColor: alpha(colors.main, isDark ? 0.6 : 0.4),
      iconColor: isDark ? '#fff' : colors.main,
    };
  };

  return (
    <Paper 
      elevation={0}
      sx={{ 
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1
      }}
      className={className}
    >
      {/* Header */}
      <Box 
        sx={{ 
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Classification Legend
          </Typography>
          <ButtonGroup size="small" variant="outlined">
            <Button onClick={handleSelectAllClassifications} color="info" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              All
            </Button>
            <Button onClick={handleDeselectAllClassifications} color="inherit" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              None
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      {/* Classification Items */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {classificationConfigs.map((config) => {
          const styles = getColorStyles(config.color);
          const Icon = config.icon;
          const isSelected = filterState.classifications.includes(config.key);

          return (
            <Box
              key={config.key}
              onClick={() => handleClassificationToggle(config.key)}
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                bgcolor: isSelected ? styles.bgcolor : 'action.hover',
                borderColor: isSelected ? styles.borderColor : 'divider',
                '&:hover': {
                  bgcolor: isSelected ? styles.bgcolor : 'action.selected',
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: 0.5,
                    bgcolor: isSelected ? styles.bgcolor : 'action.selected'
                  }}
                >
                  <Icon 
                    className="w-4 h-4" 
                    style={{ color: isSelected ? styles.iconColor : theme.palette.text.disabled }} 
                  />
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="body2" 
                    fontWeight={500}
                    sx={{ color: isSelected ? styles.color : 'text.primary' }}
                  >
                    {config.label}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ color: isSelected ? styles.color : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary') }}
                  >
                    {config.description}
                  </Typography>
                </Box>
                
                <Typography 
                  variant="body2" 
                  fontWeight={500}
                  color={isSelected ? styles.color : 'text.secondary'}
                >
                  {config.count}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Summary Statistics */}
      <Box 
        sx={{ 
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover'
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, textAlign: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {scanData.summary.totalFiles}
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>Total Files</Typography>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {scanData.summary.totalDirs}
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>Directories</Typography>
          </Box>
          <Box sx={{ gridColumn: 'span 2', mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GitBranch className="w-4 h-4" />
                <Typography variant="body2" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>
                  {scanData.summary.duplicates} duplicates
                </Typography>
              </Box>
              {whitelistCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Shield className="w-4 h-4" style={{ color: theme.palette.info.main }} />
                  <Typography variant="body2" sx={{ color: theme.palette.info.main, fontWeight: 500 }}>
                    {whitelistCount} protected
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Calendar className="w-4 h-4" />
                <Typography variant="body2" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>
                  Last scan: {new Date(scanData.generatedAt).toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      {/* Directory Legend (Canonical Locations) */}
      <CanonicalLocationsPanel />
    </Paper>
  );
};

// =============================================================================
// Canonical Locations Panel — directory legend sub-component
// =============================================================================
const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  keep: { label: 'Keep', color: '#22c55e', icon: CheckCircle },
  move: { label: 'Move', color: '#3b82f6', icon: ArrowRight },
  archive: { label: 'Archive', color: '#f59e0b', icon: Archive },
  delete: { label: 'Delete', color: '#ef4444', icon: XCircle },
};

const CATEGORY_LABELS: Record<string, string> = {
  runtime: 'Runtime',
  config: 'Config',
  ops: 'Ops/Scripts',
  data: 'Data',
  archive: 'Archive',
  dead: 'Dead Weight',
  tooling: 'Tooling',
};

const CanonicalLocationsPanel: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [locations, setLocations] = useState<CanonicalLocation[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['keep', 'move']));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await refactorConsoleClient.fetchCanonicalLocations();
      setLocations(data.locations);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleGroup = (action: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(action)) next.delete(action); else next.add(action);
      return next;
    });
  };

  const grouped = ['keep', 'move', 'archive', 'delete'].map(action => ({
    action,
    items: locations.filter(l => l.action === action),
    ...ACTION_CONFIG[action],
  }));

  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderOpen className="w-4 h-4" />
          <Typography variant="subtitle1" fontWeight={600}>
            Directory Legend
          </Typography>
          {summary && (
            <Chip label={`${summary.total} locations`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
          )}
        </Box>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={fetchData} disabled={loading}>
            {loading ? <CircularProgress size={16} /> : <RefreshCw className="w-4 h-4" />}
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="error">{error}</Typography>
        </Box>
      )}

      {/* Summary chips */}
      {summary && (
        <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
            <Chip
              key={key}
              label={`${cfg.label}: ${summary.byAction[key] || 0}`}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 600,
                bgcolor: alpha(cfg.color, isDark ? 0.25 : 0.1),
                color: isDark ? '#fff' : cfg.color,
                borderColor: alpha(cfg.color, 0.4),
                border: 1,
              }}
            />
          ))}
          <Chip
            label={`${summary.existsCount} exist`}
            size="small"
            color="success"
            variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
          {summary.missingCount > 0 && (
            <Chip
              label={`${summary.missingCount} missing`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}
        </Box>
      )}

      {/* Grouped location items */}
      {grouped.map(group => {
        if (group.items.length === 0) return null;
        const GroupIcon = group.icon;
        const isExpanded = expandedGroups.has(group.action);

        return (
          <Box key={group.action}>
            <Box
              onClick={() => toggleGroup(group.action)}
              sx={{
                px: 2, py: 1,
                display: 'flex', alignItems: 'center', gap: 1,
                cursor: 'pointer',
                bgcolor: alpha(group.color, isDark ? 0.12 : 0.05),
                borderTop: 1, borderColor: 'divider',
                '&:hover': { bgcolor: alpha(group.color, isDark ? 0.2 : 0.1) },
              }}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <GroupIcon className="w-4 h-4" style={{ color: group.color }} />
              <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                {group.label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {group.items.length}
              </Typography>
            </Box>
            <Collapse in={isExpanded}>
              <Box sx={{ px: 1, py: 0.5 }}>
                {group.items.map(loc => (
                  <Box
                    key={loc.id}
                    sx={{
                      px: 1.5, py: 0.75,
                      display: 'flex', alignItems: 'flex-start', gap: 1,
                      borderRadius: 0.5,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box
                      sx={{
                        mt: 0.25,
                        width: 8, height: 8, minWidth: 8,
                        borderRadius: '50%',
                        bgcolor: loc.exists ? '#22c55e' : '#ef4444',
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {loc.directory_path}
                        </Typography>
                        {loc.served_by && loc.served_by !== 'none' && (
                          <Tooltip title={`Served by ${loc.served_by}`}>
                            <Box sx={{ display: 'inline-flex' }}>
                              <Eye className="w-3 h-3" style={{ color: theme.palette.info.main, flexShrink: 0 }} />
                            </Box>
                          </Tooltip>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.3 }}>
                        {loc.label}
                        {loc.target_path && (
                          <span style={{ color: theme.palette.info.main }}> → {loc.target_path}</span>
                        )}
                      </Typography>
                      {loc.description && (
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'text.disabled', display: 'block', lineHeight: 1.3, fontSize: '0.65rem' }}>
                          {loc.description}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={CATEGORY_LABELS[loc.category] || loc.category}
                      size="small"
                      sx={{ height: 18, fontSize: '0.6rem', flexShrink: 0 }}
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
};

export default Legend;
