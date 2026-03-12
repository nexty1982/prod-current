/**
 * RecordsAnalyticsView — Embedded analytics for the Records page
 *
 * Uses the dashboard API (/api/churches/:churchId/dashboard) which has no
 * feature-flag gate and returns counts, type distribution, monthly activity,
 * year-over-year, completeness, date range, and recent activity.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Alert, Skeleton, Stack, Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  CartesianGrid, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { apiClient } from '@/api/utils/axiosInstance';

import SacramentCountCards from '@/features/dashboard/widgets/SacramentCountCards';
import RecentActivityList from '@/features/dashboard/widgets/RecentActivityList';
import YearOverYearCard from '@/features/dashboard/widgets/YearOverYearCard';
import CompletenessGauge from '@/features/dashboard/widgets/CompletenessGauge';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardData {
  counts: { baptisms: number; marriages: number; funerals: number; total: number };
  recentActivity: { name: string; type: 'baptism' | 'marriage' | 'funeral'; date: string }[];
  typeDistribution: { name: string; value: number }[];
  monthlyActivity: { month: string; baptism: number; marriage: number; funeral: number }[];
  yearOverYear: { currentYear: number; previousYear: number; current: number; previous: number; changePercent: number };
  completeness: number;
  dateRange: { earliest: number | null; latest: number | null };
}

interface Props {
  churchId: number | string;
  churchName?: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_COLORS = ['#1e88e5', '#e91e63', '#7b1fa2'];
const SACRAMENT_COLORS = { baptism: '#1e88e5', marriage: '#e91e63', funeral: '#7b1fa2' };

// ── Component ──────────────────────────────────────────────────────────────────

const RecordsAnalyticsView: React.FC<Props> = ({ churchId, churchName }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Require a specific church — analytics for "All Churches" is not meaningful
  const isAllChurches = !churchId || Number(churchId) === 0;
  const effectiveChurchId = isAllChurches ? null : churchId;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!effectiveChurchId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get(`/churches/${effectiveChurchId}/dashboard`);
      if (res.success || res.data) {
        setData(res.data || res);
      } else {
        setError(res.error || 'Failed to load analytics data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [effectiveChurchId]);

  useEffect(() => {
    if (!isAllChurches) fetchData();
    else { setLoading(false); setData(null); }
  }, [fetchData, isAllChurches]);

  if (isAllChurches) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
        <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>
          Select a specific church
        </Typography>
        <Typography variant="body2">
          Analytics are available when viewing records for a single church.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
          <Grid item xs={12} md={8}><Skeleton variant="rounded" height={350} /></Grid>
          <Grid item xs={12} md={4}><Skeleton variant="rounded" height={350} /></Grid>
        </Grid>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  if (!data) {
    return <Alert severity="info" sx={{ mt: 2 }}>No analytics data available for this church.</Alert>;
  }

  // Derive some useful numbers
  const hasMonthly = data.monthlyActivity && data.monthlyActivity.length > 0;
  const hasDistribution = data.typeDistribution && data.typeDistribution.some(d => d.value > 0);
  const totalRecords = data.counts.total;

  // Format monthly data for display
  const formattedMonthly = (data.monthlyActivity || []).map(d => {
    const [y, m] = d.month.split('-');
    const date = new Date(Number(y), Number(m) - 1);
    return {
      ...d,
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      total: d.baptism + d.marriage + d.funeral,
    };
  });

  return (
    <Box sx={{ py: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3} flexWrap="wrap">
        <Typography variant="h5" fontWeight={600}>
          {churchName ? `${churchName} — Records Analytics` : 'Records Analytics'}
        </Typography>
        {totalRecords > 0 && (
          <Chip
            label={`${totalRecords.toLocaleString()} total records`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
        {data.dateRange.earliest && data.dateRange.latest && (
          <Chip
            label={`${data.dateRange.earliest} – ${data.dateRange.latest}`}
            size="small"
            variant="outlined"
          />
        )}
      </Stack>

      {/* Count Cards */}
      <Box sx={{ mb: 3 }}>
        <SacramentCountCards counts={data.counts} yearOverYear={data.yearOverYear} />
      </Box>

      {/* Main Charts Row */}
      <Grid container spacing={3}>
        {/* Monthly Activity — Area Chart */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>Monthly Activity (Last 12 Months)</Typography>
              {hasMonthly ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={formattedMonthly}>
                    <defs>
                      <linearGradient id="gradBaptism" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SACRAMENT_COLORS.baptism} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={SACRAMENT_COLORS.baptism} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradMarriage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SACRAMENT_COLORS.marriage} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={SACRAMENT_COLORS.marriage} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradFuneral" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SACRAMENT_COLORS.funeral} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={SACRAMENT_COLORS.funeral} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                    <YAxis tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="baptism" name="Baptisms" stroke={SACRAMENT_COLORS.baptism} fill="url(#gradBaptism)" />
                    <Area type="monotone" dataKey="marriage" name="Marriages" stroke={SACRAMENT_COLORS.marriage} fill="url(#gradMarriage)" />
                    <Area type="monotone" dataKey="funeral" name="Funerals" stroke={SACRAMENT_COLORS.funeral} fill="url(#gradFuneral)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'text.secondary' }}>
                  <Typography>No dated records in the last 12 months</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Type Distribution — Donut */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>Record Distribution</Typography>
              {hasDistribution ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={data.typeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.typeDistribution.map((_, index) => (
                        <Cell key={index} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'text.secondary' }}>
                  <Typography>No records yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Year over Year */}
        <Grid item xs={12} sm={6} md={4}>
          <YearOverYearCard data={data.yearOverYear} />
        </Grid>

        {/* Completeness Gauge */}
        <Grid item xs={12} sm={6} md={4}>
          <CompletenessGauge value={data.completeness} dateRange={data.dateRange} />
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <RecentActivityList data={data.recentActivity} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default RecordsAnalyticsView;
