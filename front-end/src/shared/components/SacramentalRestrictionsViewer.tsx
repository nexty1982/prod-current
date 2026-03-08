/**
 * SacramentalRestrictionsViewer.tsx
 *
 * Reusable viewer for Eastern Orthodox sacramental date restrictions.
 * Two sections:
 *   A. Reference table (accordions for Baptism / Marriage / Funeral)
 *   B. Year calendar with colour-coded restricted dates
 *
 * Used by: Admin page, Portal page, Public page.
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import {
  getRestrictionsForYear,
  calculatePascha,
  type RestrictionPeriod,
} from '../lib/sacramentalDateRestrictions';

// ─── Reference data ─────────────────────────────────────────

const baptismRestrictions = [
  { period: 'Christmas–Theophany', dates: 'Dec 25 – Jan 6', type: 'Fixed' },
  { period: 'Presentation of Christ', dates: 'Feb 2', type: 'Fixed' },
  { period: 'Annunciation', dates: 'Mar 25', type: 'Fixed' },
  { period: 'Dormition Fast', dates: 'Aug 1–14', type: 'Fixed' },
  { period: 'Transfiguration', dates: 'Aug 6', type: 'Fixed' },
  { period: 'Elevation of the Cross', dates: 'Sep 14', type: 'Fixed' },
  { period: 'Palm Sunday', dates: 'Pascha − 7', type: 'Moveable' },
  { period: 'Holy Week', dates: 'Pascha − 6 to Pascha − 1', type: 'Moveable' },
  { period: 'Pascha (Easter)', dates: 'Pascha', type: 'Moveable' },
  { period: 'Ascension', dates: 'Pascha + 39', type: 'Moveable' },
  { period: 'Pentecost', dates: 'Pascha + 49', type: 'Moveable' },
];

const marriageRestrictions = [
  { period: 'Great Lent', dates: 'Pascha − 48 to Pascha − 1', type: 'Moveable' },
  { period: 'Bright Week', dates: 'Pascha to Pascha + 6', type: 'Moveable' },
  { period: 'Pentecost', dates: 'Pascha + 49', type: 'Moveable' },
  { period: 'Apostles\' Fast', dates: 'Pascha + 57 to Jun 28', type: 'Moveable' },
  { period: 'Dormition Fast', dates: 'Aug 1–14', type: 'Fixed' },
  { period: 'Nativity Fast', dates: 'Nov 15 – Dec 24', type: 'Fixed' },
  { period: 'Christmas–Theophany', dates: 'Dec 25 – Jan 6', type: 'Fixed' },
  { period: 'Beheading of St. John', dates: 'Aug 29', type: 'Fixed' },
  { period: 'Elevation of the Cross', dates: 'Sep 14', type: 'Fixed' },
  { period: 'Presentation of Christ', dates: 'Feb 2', type: 'Fixed' },
  { period: 'Annunciation', dates: 'Mar 25', type: 'Fixed' },
  { period: 'Transfiguration', dates: 'Aug 6', type: 'Fixed' },
];

const funeralRestrictions = [
  { period: 'Burial before death date', dates: 'Always', type: 'Error', note: 'Hard block' },
  { period: 'Great and Holy Friday', dates: 'Pascha − 2', type: 'Error', note: 'No funeral services held' },
  { period: 'Great and Holy Saturday', dates: 'Pascha − 1', type: 'Error', note: 'No funeral services held' },
  { period: 'Burial on Pascha', dates: 'Pascha', type: 'Warning', note: 'Paschal funeral rite required' },
  { period: 'Bright Week', dates: 'Pascha + 1 to +6', type: 'Warning', note: 'Modified Paschal rite' },
  { period: 'Pentecost', dates: 'Pascha + 49', type: 'Warning', note: 'Generally avoided' },
  { period: 'Nativity of Christ', dates: 'Dec 25', type: 'Warning', note: 'Generally avoided' },
  { period: 'Theophany', dates: 'Jan 6', type: 'Warning', note: 'Generally avoided' },
  { period: 'Annunciation', dates: 'Mar 25', type: 'Warning', note: 'Generally avoided' },
  { period: 'Transfiguration', dates: 'Aug 6', type: 'Warning', note: 'Generally avoided' },
  { period: 'Dormition of the Theotokos', dates: 'Aug 15', type: 'Warning', note: 'Generally avoided' },
  { period: 'Nativity of the Theotokos', dates: 'Sep 8', type: 'Warning', note: 'Generally avoided' },
  { period: 'Elevation of the Cross', dates: 'Sep 14', type: 'Warning', note: 'Generally avoided' },
];

// ─── Helpers ────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────

const SacramentalRestrictionsViewer: React.FC = () => {
  const theme = useTheme();
  const [year, setYear] = useState(new Date().getFullYear());

  // Build restriction map for the selected year
  const restrictionMap = useMemo(() => {
    const periods = getRestrictionsForYear(year);
    const map = new Map<string, RestrictionPeriod[]>();
    for (const p of periods) {
      const existing = map.get(p.date);
      if (existing) {
        existing.push(p);
      } else {
        map.set(p.date, [p]);
      }
    }
    return map;
  }, [year]);

  const pascha = useMemo(() => calculatePascha(year), [year]);
  const paschaStr = `${MONTH_NAMES[pascha.getMonth()]} ${pascha.getDate()}`;

  // Colour helpers
  const getDateColor = (iso: string): string | undefined => {
    const periods = restrictionMap.get(iso);
    if (!periods) return undefined;
    const hasBaptism = periods.some((p) => p.sacrament === 'baptism');
    const hasMarriage = periods.some((p) => p.sacrament === 'marriage');
    const hasFuneral = periods.some((p) => p.sacrament === 'funeral');

    if (hasBaptism && hasMarriage) return theme.palette.error.main;
    if (hasBaptism) return theme.palette.error.light;
    if (hasMarriage) return theme.palette.warning.main;
    if (hasFuneral) return theme.palette.info.main;
    return undefined;
  };

  const getTooltip = (iso: string): string => {
    const periods = restrictionMap.get(iso);
    if (!periods) return '';
    const unique = [...new Set(periods.map((p) => `${p.sacrament}: ${p.label}`))];
    return unique.join('\n');
  };

  // Render a single mini-month
  const renderMonth = (month: number) => {
    const days = daysInMonth(year, month);
    const start = firstDayOfWeek(year, month);
    const cells: React.ReactNode[] = [];

    // Empty leading cells
    for (let i = 0; i < start; i++) {
      cells.push(<Box key={`empty-${i}`} sx={{ width: 28, height: 28 }} />);
    }

    for (let d = 1; d <= days; d++) {
      const iso = toISO(year, month, d);
      const color = getDateColor(iso);
      const tooltip = getTooltip(iso);
      const periods = restrictionMap.get(iso);
      const hasFuneralOnly = periods && periods.every((p) => p.sacrament === 'funeral');
      const hasFuneralError = periods && periods.some((p) => p.sacrament === 'funeral' && p.severity === 'error');
      const funeralOnlyWarning = hasFuneralOnly && !hasFuneralError;

      cells.push(
        <Tooltip key={d} title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} arrow disableHoverListener={!tooltip}>
          <Box
            sx={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              fontSize: '0.75rem',
              fontWeight: color ? 600 : 400,
              backgroundColor: color && !funeralOnlyWarning ? alpha(color, 0.2) : undefined,
              color: color || 'text.primary',
              border: funeralOnlyWarning ? `2px solid ${theme.palette.info.main}` : undefined,
              cursor: tooltip ? 'help' : undefined,
            }}
          >
            {d}
          </Box>
        </Tooltip>,
      );
    }

    return (
      <Paper
        key={month}
        variant="outlined"
        sx={{ p: 1.5, width: 240 }}
      >
        <Typography variant="subtitle2" align="center" sx={{ mb: 1 }}>
          {MONTH_NAMES[month]}
        </Typography>
        <Box sx={{ display: 'flex', gap: '2px', mb: 0.5 }}>
          {DOW_LABELS.map((l) => (
            <Box key={l} sx={{ width: 28, textAlign: 'center', fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600 }}>
              {l}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
          {cells}
        </Box>
      </Paper>
    );
  };

  return (
    <>
      {/* ── A. Reference Table ── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Restriction Reference
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Dates when specific sacraments are restricted per Eastern Orthodox canon.
        </Typography>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Baptism Restrictions</Typography>
            <Chip label="Error" color="error" size="small" sx={{ ml: 1 }} />
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Period / Feast</strong></TableCell>
                    <TableCell><strong>Dates</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {baptismRestrictions.map((r) => (
                    <TableRow key={r.period}>
                      <TableCell>{r.period}</TableCell>
                      <TableCell>{r.dates}</TableCell>
                      <TableCell><Chip label={r.type} size="small" variant="outlined" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Marriage Restrictions</Typography>
            <Chip label="Error" color="warning" size="small" sx={{ ml: 1 }} />
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Period / Feast</strong></TableCell>
                    <TableCell><strong>Dates</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {marriageRestrictions.map((r) => (
                    <TableRow key={r.period}>
                      <TableCell>{r.period}</TableCell>
                      <TableCell>{r.dates}</TableCell>
                      <TableCell><Chip label={r.type} size="small" variant="outlined" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Funeral Restrictions</Typography>
            <Chip label="Warning" color="info" size="small" sx={{ ml: 1 }} />
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Check</strong></TableCell>
                    <TableCell><strong>Dates</strong></TableCell>
                    <TableCell><strong>Severity</strong></TableCell>
                    <TableCell><strong>Note</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {funeralRestrictions.map((r) => (
                    <TableRow key={r.period}>
                      <TableCell>{r.period}</TableCell>
                      <TableCell>{r.dates}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.type}
                          size="small"
                          color={r.type === 'Error' ? 'error' : 'info'}
                        />
                      </TableCell>
                      <TableCell>{r.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* ── B. Year Calendar ── */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton onClick={() => setYear((y) => y - 1)} size="small">
            <ChevronLeft />
          </IconButton>
          <Typography variant="h5" sx={{ mx: 2 }}>
            {year}
          </Typography>
          <IconButton onClick={() => setYear((y) => y + 1)} size="small">
            <ChevronRight />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            Pascha: {paschaStr}
          </Typography>
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: alpha(theme.palette.error.main, 0.2) }} />
            <Typography variant="caption">Baptism + Marriage blocked</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: alpha(theme.palette.error.light, 0.2) }} />
            <Typography variant="caption">Baptism blocked</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: alpha(theme.palette.warning.main, 0.2) }} />
            <Typography variant="caption">Marriage blocked</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: alpha(theme.palette.info.main, 0.2) }} />
            <Typography variant="caption">Funeral blocked</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${theme.palette.info.main}` }} />
            <Typography variant="caption">Funeral warning</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
          {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
        </Box>
      </Paper>
    </>
  );
};

export default SacramentalRestrictionsViewer;
