import React from 'react';
import {
  Box,
  Chip,
  LinearProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import type { RoadmapComponent, RoadmapPriority, RoadmapStatus } from './types';

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  green: 'success',
  done: 'success',
  yellow: 'warning',
  in_progress: 'info',
  planning: 'info',
  red: 'error',
  blocked: 'error',
};

const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
};

function statusChipColor(status?: RoadmapStatus) {
  if (!status) return 'default';
  return STATUS_COLOR[String(status).toLowerCase()] || 'default';
}

function priorityChipColor(priority?: RoadmapPriority) {
  if (!priority) return 'default';
  return PRIORITY_COLOR[String(priority).toLowerCase()] || 'default';
}

function progressValue(n?: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

interface Props {
  components: RoadmapComponent[];
}

const RoadmapTable: React.FC<Props> = ({ components }) => {
  const theme = useTheme();

  return (
    <TableContainer
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        overflowX: 'auto',
      }}
    >
      <Table size="small" stickyHeader aria-label="Component maturity roadmap">
        <TableHead>
          <TableRow>
            <TableCell sx={{ minWidth: 180 }}>Component</TableCell>
            <TableCell sx={{ minWidth: 110 }}>Status</TableCell>
            <TableCell sx={{ minWidth: 100 }}>Priority</TableCell>
            <TableCell sx={{ minWidth: 180 }}>Current milestone</TableCell>
            <TableCell sx={{ minWidth: 180 }}>Next milestone</TableCell>
            <TableCell sx={{ minWidth: 140 }}>Progress</TableCell>
            <TableCell sx={{ minWidth: 220 }}>Risks / blockers</TableCell>
            <TableCell sx={{ minWidth: 200 }}>Next action</TableCell>
            <TableCell sx={{ minWidth: 160 }}>Evidence</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {components.map((c) => {
            const risks = [...(c.risks || []), ...(c.blockers || [])];
            const pct = progressValue(c.progress_pct);
            return (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {c.name}
                  </Typography>
                  {c.category && (
                    <Typography variant="caption" color="text.secondary">
                      {c.category}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={c.status || '—'}
                    color={statusChipColor(c.status)}
                    variant={statusChipColor(c.status) === 'default' ? 'outlined' : 'filled'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={c.priority || '—'}
                    color={priorityChipColor(c.priority)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{c.current_milestone || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{c.next_milestone || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {pct}%
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  {risks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {risks.map((r, i) => (
                        <Typography key={i} variant="caption">
                          • {r}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{c.next_action || '—'}</Typography>
                </TableCell>
                <TableCell>
                  {!c.evidence || c.evidence.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {c.evidence.map((e, i) => (
                        <Link
                          key={i}
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          variant="caption"
                          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                        >
                          {e.label}
                          <LaunchIcon sx={{ fontSize: 12 }} />
                        </Link>
                      ))}
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {components.length === 0 && (
            <TableRow>
              <TableCell colSpan={9}>
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No components reported in the roadmap.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RoadmapTable;
