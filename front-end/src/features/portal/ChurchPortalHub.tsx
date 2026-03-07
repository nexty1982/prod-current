import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconBook2,
  IconHeart,
  IconCross,
  IconCertificate,
  IconUpload,
  IconChartBar,
  IconUser,
  IconHelp,
  IconArrowRight,
  IconPlus,
  IconClock,
  IconTrendingUp,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

// ─── Types ───────────────────────────────────────────────────

interface FeatureCard {
  title: string;
  description: string;
  to: string;
  icon: React.ElementType;
  roles?: string[];
  color: string;
  gradient: string;
}

interface DashboardData {
  counts: { baptisms: number; marriages: number; funerals: number; total: number };
  recentActivity: { name: string; type: string; date: string }[];
  typeDistribution: { name: string; value: number }[];
}

// ─── Feature Definitions ─────────────────────────────────────

const RECORDS: FeatureCard[] = [
  {
    title: 'Baptism Records',
    description: 'Browse, search, and manage all baptism records for your parish',
    to: '/portal/records/baptism',
    icon: IconBook2,
    color: '#1565c0',
    gradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
  },
  {
    title: 'Marriage Records',
    description: 'View and manage marriage sacrament records and related documents',
    to: '/portal/records/marriage',
    icon: IconHeart,
    color: '#c2185b',
    gradient: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
  },
  {
    title: 'Funeral Records',
    description: 'Access funeral and memorial service records for your community',
    to: '/portal/records/funeral',
    icon: IconCross,
    color: '#5d4037',
    gradient: 'linear-gradient(135deg, #efebe9 0%, #d7ccc8 100%)',
  },
];

const TOOLS: FeatureCard[] = [
  {
    title: 'Certificate Generator',
    description: 'Create official baptism, marriage, and funeral certificates',
    to: '/portal/certificates',
    icon: IconCertificate,
    color: '#2e7d32',
    gradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
  },
  {
    title: 'Upload Records',
    description: 'Upload scanned images of historical record ledgers for OCR processing',
    to: '/portal/upload',
    icon: IconUpload,
    roles: ['super_admin', 'admin', 'church_admin', 'priest'],
    color: '#e65100',
    gradient: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
  },
  {
    title: 'Parish Charts',
    description: 'Visualize sacramental trends and parish analytics over time',
    to: '/portal/charts',
    icon: IconChartBar,
    roles: ['super_admin', 'admin', 'church_admin', 'priest'],
    color: '#7b1fa2',
    gradient: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
  },
];

const ACCOUNT: FeatureCard[] = [
  {
    title: 'My Profile',
    description: 'View and update your account settings',
    to: '/portal/profile',
    icon: IconUser,
    color: '#0277bd',
    gradient: 'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)',
  },
  {
    title: 'User Guide',
    description: 'Documentation and help for all features',
    to: '/portal/guide',
    icon: IconHelp,
    color: '#546e7a',
    gradient: 'linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%)',
  },
];

const QUICK_ADD_ITEMS = [
  { label: 'Baptism', to: '/apps/records/baptism/new', color: '#1565c0', icon: IconBook2 },
  { label: 'Marriage', to: '/apps/records/marriage/new', color: '#c2185b', icon: IconHeart },
  { label: 'Funeral', to: '/apps/records/funeral/new', color: '#5d4037', icon: IconCross },
];

const RECORD_TYPE_CONFIG: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  baptism: { color: '#1565c0', label: 'Baptism', icon: IconBook2 },
  marriage: { color: '#c2185b', label: 'Marriage', icon: IconHeart },
  funeral: { color: '#5d4037', label: 'Funeral', icon: IconCross },
};

// ─── Sub-components ──────────────────────────────────────────

const FeatureCardItem: React.FC<{ feature: FeatureCard; large?: boolean }> = ({ feature, large }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const Icon = feature.icon;
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 3,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: isDark
            ? `0 12px 40px rgba(0,0,0,0.4)`
            : `0 12px 40px ${feature.color}18`,
          borderColor: `${feature.color}40`,
          '& .card-arrow': { opacity: 1, transform: 'translateX(0)' },
          '& .card-icon-bg': { transform: 'scale(1.05)' },
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(feature.to)}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${feature.color}, ${feature.color}88)` }} />
        <CardContent sx={{ p: large ? 3.5 : 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box
              className="card-icon-bg"
              sx={{
                width: large ? 56 : 48, height: large ? 56 : 48, borderRadius: 2.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDark ? `${feature.color}20` : feature.gradient,
                transition: 'transform 0.3s ease',
              }}
            >
              <Icon size={large ? 28 : 24} color={feature.color} stroke={1.5} />
            </Box>
            <Box className="card-arrow" sx={{ opacity: 0, transform: 'translateX(-8px)', transition: 'all 0.3s ease', color: feature.color, mt: 0.5 }}>
              <IconArrowRight size={20} />
            </Box>
          </Box>
          <Typography variant={large ? 'h6' : 'subtitle1'} fontWeight={700} sx={{ mb: 0.75, color: 'text.primary' }}>
            {feature.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, flex: 1 }}>
            {feature.description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

function formatRecordDate(d: string | null) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}

// ─── Main Component ──────────────────────────────────────────

const ChurchPortalHub: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || '';
  const isDark = theme.palette.mode === 'dark';
  const churchId = user?.church_id;

  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!churchId) return;
    setDashLoading(true);
    try {
      const resp = await fetch(`/api/churches/${churchId}/dashboard`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setDashData(data);
      }
    } catch {}
    finally { setDashLoading(false); }
  }, [churchId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const visibleTools = TOOLS.filter((f) => !f.roles || f.roles.includes(role));
  const greeting = user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome';

  const canAddRecords = ['super_admin', 'admin', 'church_admin', 'priest', 'editor'].includes(role);

  return (
    <Box sx={{ minHeight: '60vh' }}>
      {/* ── Hero Section ── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)'
            : 'linear-gradient(135deg, #f8f6f1 0%, #eee9df 30%, #f5f0e8 60%, #ece7dd 100%)',
          borderRadius: 4,
          mb: 4,
          '&::before': {
            content: '""',
            position: 'absolute', inset: 0, opacity: isDark ? 0.06 : 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23000000' fill-opacity='0'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23000000' fill-opacity='0.4'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23000000' fill-opacity='0.25'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat', pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(200,162,75,0.4) 50%, transparent 100%)',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', gap: { xs: 3, md: 4 },
            px: { xs: 3, sm: 4, md: 5 }, py: { xs: 4, sm: 5, md: 6 },
          }}
        >
          <Box
            component="img"
            src="/images/logos/om-logo.png"
            alt="Orthodox Metrics"
            sx={{
              width: { xs: 64, sm: 80, md: 96 }, height: { xs: 64, sm: 80, md: 96 },
              borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
              border: '3px solid', borderColor: isDark ? 'rgba(200,162,75,0.3)' : 'rgba(200,162,75,0.25)',
            }}
          />
          <Box>
            <Typography
              variant="h3" component="h1"
              sx={{
                fontFamily: '"Cormorant Garamond", "Palatino Linotype", Georgia, serif',
                fontWeight: 700, fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
                color: 'text.primary', lineHeight: 1.2,
              }}
            >
              {greeting}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1, fontWeight: 400, color: 'text.secondary', fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
              Your parish management portal
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Quick Actions + Stats Row ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 4 }}>

        {/* Quick Record Add */}
        {canAddRecords && (
          <Paper
            elevation={0}
            sx={{
              p: 3, borderRadius: 3,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <IconPlus size={20} color="rgba(200,162,75,0.9)" />
              <Typography variant="subtitle1" fontWeight={700}>Quick Record Add</Typography>
            </Box>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {QUICK_ADD_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.label}
                    variant="outlined"
                    startIcon={<Icon size={18} />}
                    onClick={() => navigate(item.to)}
                    sx={{
                      borderColor: alpha(item.color, 0.3),
                      color: item.color,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 2.5,
                      py: 1,
                      borderRadius: 2,
                      '&:hover': {
                        borderColor: item.color,
                        bgcolor: alpha(item.color, 0.06),
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    New {item.label}
                  </Button>
                );
              })}
            </Stack>
          </Paper>
        )}

        {/* Record Counts */}
        <Paper
          elevation={0}
          sx={{
            p: 3, borderRadius: 3,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <IconTrendingUp size={20} color="rgba(200,162,75,0.9)" />
            <Typography variant="subtitle1" fontWeight={700}>Parish Records</Typography>
            {dashLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
          </Box>
          {dashData?.counts ? (
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              {[
                { label: 'Baptisms', count: dashData.counts.baptisms, color: '#1565c0' },
                { label: 'Marriages', count: dashData.counts.marriages, color: '#c2185b' },
                { label: 'Funerals', count: dashData.counts.funerals, color: '#5d4037' },
                { label: 'Total', count: dashData.counts.total, color: 'rgba(200,162,75,0.9)' },
              ].map((stat) => (
                <Box key={stat.label} sx={{ textAlign: 'center', minWidth: 70 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color }}>{stat.count}</Typography>
                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                </Box>
              ))}
            </Stack>
          ) : !dashLoading ? (
            <Typography variant="body2" color="text.secondary">No records data available</Typography>
          ) : null}
        </Paper>
      </Box>

      {/* ── Recent Activity ── */}
      {dashData?.recentActivity && dashData.recentActivity.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3, borderRadius: 3, mb: 4,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <IconClock size={20} color="rgba(200,162,75,0.9)" />
            <Typography variant="subtitle1" fontWeight={700}>Recent Records</Typography>
          </Box>
          <Box>
            {dashData.recentActivity.slice(0, 8).map((record, idx) => {
              const config = RECORD_TYPE_CONFIG[record.type] || { color: '#666', label: record.type, icon: IconBook2 };
              const RecIcon = config.icon;
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2,
                    borderBottom: idx < Math.min(dashData.recentActivity.length, 8) - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : 'none',
                  }}
                >
                  <Box sx={{
                    width: 32, height: 32, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: alpha(config.color, isDark ? 0.15 : 0.08), flexShrink: 0,
                  }}>
                    <RecIcon size={16} color={config.color} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.88rem' }}>
                      {record.name}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={config.label}
                    sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, bgcolor: alpha(config.color, 0.1), color: config.color }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', flexShrink: 0 }}>
                    {formatRecordDate(record.date)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* ── Sacramental Records ── */}
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="overline"
          sx={{ color: 'rgba(200,162,75,0.9)', fontWeight: 700, letterSpacing: 2, fontSize: '0.75rem', mb: 2, display: 'block' }}
        >
          Sacramental Records
        </Typography>
        <Grid container spacing={3}>
          {RECORDS.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.to}>
              <FeatureCardItem feature={feature} large />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Tools & Services ── */}
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="overline"
          sx={{ color: 'rgba(200,162,75,0.9)', fontWeight: 700, letterSpacing: 2, fontSize: '0.75rem', mb: 2, display: 'block' }}
        >
          Tools & Services
        </Typography>
        <Grid container spacing={3}>
          {visibleTools.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.to}>
              <FeatureCardItem feature={feature} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Account ── */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="overline"
          sx={{ color: 'rgba(200,162,75,0.9)', fontWeight: 700, letterSpacing: 2, fontSize: '0.75rem', mb: 2, display: 'block' }}
        >
          Account
        </Typography>
        <Grid container spacing={3}>
          {ACCOUNT.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.to}>
              <FeatureCardItem feature={feature} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default ChurchPortalHub;
