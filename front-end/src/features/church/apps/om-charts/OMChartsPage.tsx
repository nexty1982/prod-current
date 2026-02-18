import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Alert, Chip, Stack,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/utils/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';

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

  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const needsChurchPicker = !paramChurchId && !user?.church_id;

  // Fetch churches list for super_admins without a church_id
  useEffect(() => {
    if (!needsChurchPicker) return;

    const fetchChurches = async () => {
      setLoadingChurches(true);
      try {
        const res = await apiClient.get('/my/churches');
        const list = (res.data?.churches || res.data || [])
          .filter((c: any) => c.is_active !== false)
          .map((c: any) => ({ id: c.id, name: c.name || c.church_name || `Church ${c.id}` }));
        setChurches(list);
        // Auto-select the first church
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
      const res = await apiClient.get(`/churches/${churchId}/charts/summary`);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.error || 'Failed to load chart data');
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('OM Charts is not enabled for this church. Ask an administrator to enable it.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load chart data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChurchId) {
      fetchChartData(selectedChurchId);
    }
  }, [selectedChurchId, fetchChartData]);

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

  const selectedChurchName = churches.find(c => c.id === selectedChurchId)?.name;

  if (loadingChurches) {
    return (
      <PageContainer title="OM Charts" description="Church sacramental record charts">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (needsChurchPicker && churches.length === 0 && !loadingChurches) {
    return (
      <PageContainer title="OM Charts" description="Church sacramental record charts">
        <Alert severity="info" sx={{ mt: 2 }}>No churches available.</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="OM Charts" description="Church sacramental record charts">
      <Stack direction="row" alignItems="center" spacing={2} mb={3} flexWrap="wrap">
        <Typography variant="h4">OM Charts</Typography>
        {churchSelector}
        {selectedChurchName && !needsChurchPicker === false && null}
        {data && (
          <Chip
            label={`${data.typeDistribution.reduce((sum, d) => sum + d.value, 0).toLocaleString()} Total Records`}
            color="primary"
            variant="outlined"
          />
        )}
      </Stack>

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

          {/* Coming Soon Placeholder */}
          <Grid item xs={12}>
            <Card sx={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h5" gutterBottom color="textSecondary">
                  OM Charts Enhanced
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Coming Soon &mdash; Advanced analytics, trend analysis, and exportable reports
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </PageContainer>
  );
};

export default OMChartsPage;
