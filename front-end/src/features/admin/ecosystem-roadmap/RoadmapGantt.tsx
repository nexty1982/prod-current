import React, { useMemo } from 'react';
import {
  Box,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { RoadmapComponent, RoadmapPhase } from './types';

interface Props {
  components: RoadmapComponent[];
}

interface Span {
  componentId: string;
  componentName: string;
  phase: RoadmapPhase;
  startMs: number;
  endMs: number;
}

const STATUS_HUE: Record<string, string> = {
  green: '#2e7d32',
  done: '#2e7d32',
  in_progress: '#1976d2',
  planning: '#0288d1',
  yellow: '#ed6c02',
  red: '#d32f2f',
  blocked: '#d32f2f',
};

function parseDate(s: string): number | null {
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

function formatTickLabel(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function buildTicks(minMs: number, maxMs: number, count = 5): number[] {
  if (count <= 1 || maxMs <= minMs) return [minMs];
  const step = (maxMs - minMs) / (count - 1);
  return Array.from({ length: count }, (_, i) => minMs + i * step);
}

const RoadmapGantt: React.FC<Props> = ({ components }) => {
  const theme = useTheme();

  const { rows, minMs, maxMs } = useMemo(() => {
    const spans: Span[] = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of components) {
      for (const p of c.phases || []) {
        const startMs = parseDate(p.start_date);
        const endMs = parseDate(p.end_date);
        if (startMs === null || endMs === null || endMs < startMs) continue;
        if (startMs < lo) lo = startMs;
        if (endMs > hi) hi = endMs;
        spans.push({
          componentId: c.id,
          componentName: c.name,
          phase: p,
          startMs,
          endMs,
        });
      }
    }
    const byComponent = new Map<string, Span[]>();
    for (const s of spans) {
      const arr = byComponent.get(s.componentId) || [];
      arr.push(s);
      byComponent.set(s.componentId, arr);
    }
    return {
      rows: Array.from(byComponent.entries()).map(([id, list]) => ({
        id,
        name: list[0].componentName,
        spans: list.sort((a, b) => a.startMs - b.startMs),
      })),
      minMs: Number.isFinite(lo) ? lo : 0,
      maxMs: Number.isFinite(hi) ? hi : 0,
    };
  }, [components]);

  if (rows.length === 0) {
    return (
      <Box
        sx={{
          py: 4,
          textAlign: 'center',
          border: `1px dashed ${theme.palette.divider}`,
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No phase or milestone dates reported. The Gantt visual will populate
          once OMStudio publishes phase data with start/end dates.
        </Typography>
      </Box>
    );
  }

  const ticks = buildTicks(minMs, maxMs, 5);
  const spanRange = Math.max(1, maxMs - minMs);
  const leftLabelCol = 200;

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        overflowX: 'auto',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ minWidth: 700 }}>
        {/* Header / time axis */}
        <Box
          sx={{
            display: 'flex',
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.action.hover,
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Box sx={{ width: leftLabelCol, p: 1 }}>
            <Typography variant="caption" fontWeight={600}>
              Component
            </Typography>
          </Box>
          <Box sx={{ flex: 1, position: 'relative', height: 32 }}>
            {ticks.map((t, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${((t - minMs) / spanRange) * 100}%`,
                  borderLeft: `1px dashed ${theme.palette.divider}`,
                  pl: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {formatTickLabel(t)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Rows */}
        {rows.map((row) => (
          <Box
            key={row.id}
            sx={{
              display: 'flex',
              borderBottom: `1px solid ${theme.palette.divider}`,
              minHeight: 40,
            }}
          >
            <Box
              sx={{
                width: leftLabelCol,
                p: 1,
                borderRight: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="body2" fontWeight={500} noWrap>
                {row.name}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, position: 'relative' }}>
              {/* Background grid lines */}
              {ticks.map((t, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${((t - minMs) / spanRange) * 100}%`,
                    borderLeft: `1px dashed ${theme.palette.divider}`,
                  }}
                />
              ))}
              {/* Spans */}
              {row.spans.map((s, i) => {
                const left = ((s.startMs - minMs) / spanRange) * 100;
                const width = Math.max(
                  0.8,
                  ((s.endMs - s.startMs) / spanRange) * 100,
                );
                const hue =
                  STATUS_HUE[String(s.phase.status || '').toLowerCase()] ||
                  theme.palette.primary.main;
                return (
                  <Tooltip
                    key={i}
                    arrow
                    title={
                      <Stack spacing={0.5}>
                        <Typography variant="caption" fontWeight={600}>
                          {s.phase.name}
                        </Typography>
                        <Typography variant="caption">
                          {new Date(s.startMs).toLocaleDateString()} —{' '}
                          {new Date(s.endMs).toLocaleDateString()}
                        </Typography>
                        {s.phase.status && (
                          <Typography variant="caption">
                            status: {s.phase.status}
                          </Typography>
                        )}
                        {typeof s.phase.progress_pct === 'number' && (
                          <Typography variant="caption">
                            progress: {s.phase.progress_pct}%
                          </Typography>
                        )}
                      </Stack>
                    }
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        height: 22,
                        left: `${left}%`,
                        width: `${width}%`,
                        backgroundColor: hue,
                        borderRadius: 1,
                        opacity: theme.palette.mode === 'dark' ? 0.85 : 0.9,
                        display: 'flex',
                        alignItems: 'center',
                        px: 0.5,
                        overflow: 'hidden',
                        cursor: 'default',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme.palette.getContrastText(hue),
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {s.phase.name}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default RoadmapGantt;
