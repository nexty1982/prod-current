import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Alert, Chip, Stack,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Skeleton
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/utils/axiosInstance';

import SacramentCountCards from '@/features/dashboard/widgets/SacramentCountCards';
import SacramentsByYearChart from '@/features/dashboard/widgets/SacramentsByYearChart';
import TypeDistributionChart from '@/features/dashboard/widgets/TypeDistributionChart';
import RecentActivityList from '@/features/dashboard/widgets/RecentActivityList';
import YearOverYearCard from '@/features/dashboard/widgets/YearOverYearCard';
import CompletenessGauge from '@/features/dashboard/widgets/CompletenessGauge';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c'];
const TYPE_COLORS = { baptism: '#8884d8', marriage: '#82ca9d', funeral: '#ffc658' };

interface ChartData {
  sacramentsByYear: Array<{ year: number; baptism: number; marriage: number; funeral: number }>;
  monthlyTrends: Array<{ month: string; baptism: number; marriage: number; funeral: number }>;
  byPriest: Array<{ name: string; count: number }>;
  baptismAge: Array<{ range: string; count: number }>;
  typeDistribution: Array<{ name: string; value: number }>;
  seasonalPatterns: Array<{ month: string; baptism: number; marriage: number; funeral: number }>;
}

interface DashboardData {
  counts: { baptisms: number; marriages: number; funerals: number; total: number };
  recentActivity: { name: string; type: 'baptism' | 'marriage' | 'funeral'; date: string }[];
  typeDistribution: { name: string; value: number }[];
  monthlyActivity: { month: string; baptism: number; marriage: number; funeral: number }[];
  yearOverYear: { currentYear: number; previousYear: number; current: number; previous: number; changePercent: number };
  completeness: number;
  dateRange: { earliest: number | null; latest: number | null };
}

interface ChurchOption {
  id: number;
  name: string;
}

const OMChartsPage: React.FC = () => {
  const { churchId: paramChurchId } = useParams<{ churchId?: string }>();
  const { user } = useAuth();

  const [selectedChurchId, setSelectedChurchId] = useState<string | number>(
    paramChurchId || user?.church_id || ''
  );
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [loadingChurches, setLoadingChurches] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Charts data
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard data
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const needsChurchPicker = !paramChurchId && !user?.church_id;

  // Fetch churches list for super_admins without a church_id
  useEffect(() => {
    if (!needsChurchPicker) return;

    const fetchChurches = async () => {
      setLoadingChurches(true);
      try {
        const res: any = await apiClient.get('/my/churches');
        const raw = res.data?.churches || res.churches || [];
        const list = (Array.isArray(raw) ? raw : [])
          .filter((c: any) => c.is_active !== false)
          .map((c: any) => ({ id: c.id, name: c.name || c.church_name || `Church ${c.id}` }));
        setChurches(list);
        if (list.length > 0 && !selectedChurchId) {
          setSelectedChurchId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch churches:', err);
      } finally {
        setLoadingChurches(false);
      }
    };

    fetchChurches();
  }, [needsChurchPicker]);

  // Fetch chart data when churchId is resolved
  const fetchChartData = useCallback(async (churchId: string | number) => {
    if (!churchId) return;
    try {
      setLoading(true);
      setError(null);
      setData(null);
      const res: any = await apiClient.get(`/churches/${churchId}/charts/summary`);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error?.message || res.error || 'Failed to load chart data');
      }
    } catch (err: any) {
      if (err.status === 403) {
        setError('OM Charts is not enabled for this church. Ask an administrator to enable it.');
      } else {
        setError(err.message || 'Failed to load chart data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dashboard data
  const fetchDashData = useCallback(async (churchId: string | number) => {
    if (!churchId) return;
    setDashLoading(true);
    try {
      const res = await apiClient.get<any>(`/churches/${churchId}/dashboard`);
      setDashData(res.data || res);
    } catch {
      // Non-critical
    } finally {
      setDashLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChurchId) {
      fetchChartData(selectedChurchId);
      fetchDashData(selectedChurchId);
    }
  }, [selectedChurchId, fetchChartData, fetchDashData]);

  // Church selector for super_admins
  const churchSelector = needsChurchPicker && (
    <FormControl size="small" sx={{ minWidth: 250 }}>
      <InputLabel>Church</InputLabel>
      <Select
        value={selectedChurchId}
        label="Church"
        onChange={(e) => setSelectedChurchId(e.target.value)}
      >
        {churches.map((c) => (
          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  if (loadingChurches) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (needsChurchPicker && churches.length === 0 && !loadingChurches) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>No churches available.</Alert>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={2} flexWrap="wrap">
        <Typography variant="h4">Parish Analytics</Typography>
        {churchSelector}
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Dashboard" />
          <Tab label="Charts" />
        </Tabs>
      </Box>

      {/* Dashboard Tab */}
      {activeTab === 0 && (
        <Box>
          {dashLoading ? (
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Skeleton variant="rounded" height={100} />
                </Grid>
              ))}
              <Grid item xs={12} md={8}><Skeleton variant="rounded" height={350} /></Grid>
              <Grid item xs={12} md={4}><Skeleton variant="rounded" height={350} /></Grid>
            </Grid>
          ) : dashData ? (
            <Box>
              <Box sx={{ mb: 3 }}>
                <SacramentCountCards counts={dashData.counts} yearOverYear={dashData.yearOverYear} />
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <SacramentsByYearChart data={dashData.monthlyActivity} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TypeDistributionChart data={dashData.typeDistribution} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <RecentActivityList data={dashData.recentActivity} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <YearOverYearCard data={dashData.yearOverYear} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <CompletenessGauge value={dashData.completeness} dateRange={dashData.dateRange} />
                </Grid>
              </Grid>
            </Box>
          ) : !selectedChurchId ? (
            <Alert severity="info">Select a church to view dashboard data.</Alert>
          ) : (
            <Alert severity="info">No dashboard data available.</Alert>
          )}
        </Box>
      )}

      {/* Charts Tab */}
      {activeTab === 1 && (
        <Box>
          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
              <CircularProgress />
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          {!loading && !error && !data && selectedChurchId && (
            <Alert severity="info" sx={{ mt: 2 }}>No chart data available.</Alert>
          )}

          {!loading && data && (
            <Grid container spacing={3}>
              {/* 1. Sacraments by Year — Grouped Bar */}
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Sacraments by Year</Typography>
                    {data.sacramentsByYear.length === 0 ? (
                      <Typography color="textSecondary">No data available</Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={data.sacramentsByYear}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="baptism" fill={TYPE_COLORS.baptism} name="Baptisms" />
                          <Bar dataKey="marriage" fill={TYPE_COLORS.marriage} name="Marriages" />
                          <Bar dataKey="funeral" fill={TYPE_COLORS.funeral} name="Funerals" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* 2. Type Distribution — Pie */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Sacrament Distribution</Typography>
                    {data.typeDistribution.length === 0 ? (
                      <Typography color="textSecondary">No data available</Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={data.typeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            dataKey="value"
                          >
                            {data.typeDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* 3. Monthly Trends — Line */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Monthly Trends</Typography>
                    {data.monthlyTrends.length === 0 ? (
                      <Typography color="textSecondary">No data available</Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} interval="preserveStartEnd" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="baptism" stroke={TYPE_COLORS.baptism} name="Baptisms" dot={false} />
                          <Line type="monotone" dataKey="marriage" stroke={TYPE_COLORS.marriage} name="Marriages" dot={false} />
                          <Line type="monotone" dataKey="funeral" stroke={TYPE_COLORS.funeral} name="Funerals" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* 4. By Priest — Horizontal Bar */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>By Priest</Typography>
                    {data.byPriest.length === 0 ? (
                      <Typography color="textSecondary">No data available</Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.max(300, data.byPriest.length * 30)}>
                        <BarChart data={data.byPriest} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" name="Sacraments" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* 5. Baptism Age Distribution */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Baptism Age at Reception</Typography>
                    {data.baptismAge.length === 0 ? (
                      <Typography color="textSecondary">No data available</Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.baptismAge}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#82ca9d" name="Baptisms" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* 6. Seasonal Patterns */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Seasonal Patterns</Typography>
                    {data.seasonalPatterns.length === 0 ? (
                      <Typography color="textSecondary">No data available</Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.seasonalPatterns}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="baptism" fill={TYPE_COLORS.baptism} name="Baptisms" />
                          <Bar dataKey="marriage" fill={TYPE_COLORS.marriage} name="Marriages" />
                          <Bar dataKey="funeral" fill={TYPE_COLORS.funeral} name="Funerals" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default OMChartsPage;
