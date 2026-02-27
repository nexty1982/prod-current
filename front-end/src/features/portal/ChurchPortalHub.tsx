import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
  useTheme,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Skeleton,
  alpha,
} from '@mui/material';
import {
  IconBook2,
  IconHeart,
  IconCross,
  IconUpload,
  IconChartBar,
  IconUser,
  IconHelp,
  IconArrowRight,
  IconChevronDown,
  IconPlus,
  IconClock,
  IconShieldCheck,
  IconBuildingChurch,
  IconLogin,
} from '@tabler/icons-react';
import {
  ChildCare as BaptismIcon,
  Favorite as MarriageIcon,
  LocalFlorist as FuneralIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import { apiClient } from '@/api/utils/axiosInstance';
import { metricsAPI } from '@/api/metrics.api';

import SacramentCountCards from '@/features/dashboard/widgets/SacramentCountCards';
import SacramentsByYearChart from '@/features/dashboard/widgets/SacramentsByYearChart';
import TypeDistributionChart from '@/features/dashboard/widgets/TypeDistributionChart';

/* ─── Types ─── */

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
  recentActivity: { name: string; type: 'baptism' | 'marriage' | 'funeral'; date: string }[];
  typeDistribution: { name: string; value: number }[];
  monthlyActivity: { month: string; baptism: number; marriage: number; funeral: number }[];
  yearOverYear: { currentYear: number; previousYear: number; current: number; previous: number; changePercent: number };
  completeness: number;
  dateRange: { earliest: number | null; latest: number | null };
}

interface RecentRecord {
  id: number;
  label: string;
  date: string;
  sub?: string;
}

interface BaptismFormData {
  child_name: string;
  baptism_date: string;
  father_name: string;
  mother_name: string;
  priest_name: string;
}

interface MarriageFormData {
  groom_name: string;
  bride_name: string;
  marriage_date: string;
  priest_name: string;
}

interface FuneralFormData {
  deceased_name: string;
  death_date: string;
  funeral_date: string;
  priest_name: string;
}

const emptyBaptism: BaptismFormData = { child_name: '', baptism_date: '', father_name: '', mother_name: '', priest_name: '' };
const emptyMarriage: MarriageFormData = { groom_name: '', bride_name: '', marriage_date: '', priest_name: '' };
const emptyFuneral: FuneralFormData = { deceased_name: '', death_date: '', funeral_date: '', priest_name: '' };

/* ─── Static card data ─── */

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

/* ─── Helpers ─── */

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  church_admin: 'Church Admin',
  priest: 'Priest',
  deacon: 'Deacon',
  editor: 'Editor',
  viewer: 'Viewer',
  guest: 'Guest',
};

function formatLastLogin(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day}/${year} at ${hours}:${minutes}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Session timer hook — counts down from 24h since component mount */
function useSessionTimer() {
  const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  const [remaining, setRemaining] = useState(SESSION_DURATION_MS);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      setRemaining(Math.max(0, SESSION_DURATION_MS - elapsed));
    };
    const id = setInterval(tick, 60_000); // update every minute
    return () => clearInterval(id);
  }, []);

  const totalMinutes = Math.floor(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/* ─── Feature Card Component ─── */

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
                width: large ? 56 : 48,
                height: large ? 56 : 48,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDark ? `${feature.color}20` : feature.gradient,
                transition: 'transform 0.3s ease',
              }}
            >
              <Icon size={large ? 28 : 24} color={feature.color} stroke={1.5} />
            </Box>
            <Box
              className="card-arrow"
              sx={{
                opacity: 0,
                transform: 'translateX(-8px)',
                transition: 'all 0.3s ease',
                color: feature.color,
                mt: 0.5,
              }}
            >
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

/* ─── Section Heading ─── */

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="overline"
    sx={{
      color: 'rgba(200,162,75,0.9)',
      fontWeight: 700,
      letterSpacing: 2,
      fontSize: '0.75rem',
      mb: 2,
      display: 'block',
    }}
  >
    {children}
  </Typography>
);

/* ─── Main Component ─── */

const ChurchPortalHub: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeChurchId, churchMetadata } = useChurch();
  const role = user?.role || '';
  const isDark = theme.palette.mode === 'dark';
  const sessionTimeLeft = useSessionTimer();

  const visibleTools = TOOLS.filter((f) => !f.roles || f.roles.includes(role));
  const greeting = user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome';
  const churchName = churchMetadata?.church_name_display || churchMetadata?.church_name;
  const roleLabel = ROLE_LABELS[role] || role;

  /* ── Dashboard data ── */
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  useEffect(() => {
    if (!activeChurchId) return;
    let cancelled = false;
    const fetchDash = async () => {
      setDashLoading(true);
      try {
        const res = await apiClient.get<any>(`/churches/${activeChurchId}/dashboard`);
        if (!cancelled) setDashData(res.data || res);
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    };
    fetchDash();
    return () => { cancelled = true; };
  }, [activeChurchId]);

  /* ── Quick Add state ── */
  const [baptismForm, setBaptismForm] = useState<BaptismFormData>(emptyBaptism);
  const [marriageForm, setMarriageForm] = useState<MarriageFormData>(emptyMarriage);
  const [funeralForm, setFuneralForm] = useState<FuneralFormData>(emptyFuneral);
  const [submitting, setSubmitting] = useState<'baptism' | 'marriage' | 'funeral' | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  /* ── Recent records ── */
  const [recentBaptism, setRecentBaptism] = useState<RecentRecord[]>([]);
  const [recentMarriage, setRecentMarriage] = useState<RecentRecord[]>([]);
  const [recentFuneral, setRecentFuneral] = useState<RecentRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const loadRecentRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const [baptismRes, marriageRes, funeralRes] = await Promise.allSettled([
        metricsAPI.records.getBaptismRecords({ limit: 3, sortField: 'id', sortDirection: 'desc' }),
        metricsAPI.records.getMarriageRecords({ limit: 3, sortField: 'id', sortDirection: 'desc' }),
        metricsAPI.records.getFuneralRecords({ limit: 3, sortField: 'id', sortDirection: 'desc' }),
      ]);

      if (baptismRes.status === 'fulfilled') {
        const rows = baptismRes.value?.records ?? baptismRes.value?.data ?? [];
        setRecentBaptism(rows.slice(0, 3).map((r: any) => ({
          id: r.id,
          label: r.child_name || r.first_name || '—',
          date: r.baptism_date || r.date_entered || '',
          sub: r.priest_name ? `Fr. ${r.priest_name}` : undefined,
        })));
      }
      if (marriageRes.status === 'fulfilled') {
        const rows = marriageRes.value?.records ?? marriageRes.value?.data ?? [];
        setRecentMarriage(rows.slice(0, 3).map((r: any) => ({
          id: r.id,
          label: [r.groom_name, r.bride_name].filter(Boolean).join(' & ') || '—',
          date: r.marriage_date || r.date_entered || '',
          sub: r.priest_name ? `Fr. ${r.priest_name}` : undefined,
        })));
      }
      if (funeralRes.status === 'fulfilled') {
        const rows = funeralRes.value?.records ?? funeralRes.value?.data ?? [];
        setRecentFuneral(rows.slice(0, 3).map((r: any) => ({
          id: r.id,
          label: r.deceased_name || r.first_name || '—',
          date: r.funeral_date || r.death_date || r.date_entered || '',
          sub: r.priest_name ? `Fr. ${r.priest_name}` : undefined,
        })));
      }
    } catch {
      // Non-critical
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => { loadRecentRecords(); }, [loadRecentRecords]);

  /* ── Quick Add handlers ── */
  const handleBaptismSubmit = async () => {
    if (!baptismForm.child_name || !baptismForm.baptism_date) return;
    setSubmitting('baptism');
    try {
      await metricsAPI.records.createBaptismRecord(baptismForm);
      setBaptismForm(emptyBaptism);
      setToast({ open: true, message: 'Baptism record added successfully.', severity: 'success' });
      loadRecentRecords();
    } catch {
      setToast({ open: true, message: 'Failed to save baptism record.', severity: 'error' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleMarriageSubmit = async () => {
    if (!marriageForm.groom_name || !marriageForm.bride_name || !marriageForm.marriage_date) return;
    setSubmitting('marriage');
    try {
      await metricsAPI.records.createMarriageRecord(marriageForm);
      setMarriageForm(emptyMarriage);
      setToast({ open: true, message: 'Marriage record added successfully.', severity: 'success' });
      loadRecentRecords();
    } catch {
      setToast({ open: true, message: 'Failed to save marriage record.', severity: 'error' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleFuneralSubmit = async () => {
    if (!funeralForm.deceased_name || !funeralForm.death_date) return;
    setSubmitting('funeral');
    try {
      await metricsAPI.records.createFuneralRecord(funeralForm);
      setFuneralForm(emptyFuneral);
      setToast({ open: true, message: 'Funeral record added successfully.', severity: 'success' });
      loadRecentRecords();
    } catch {
      setToast({ open: true, message: 'Failed to save funeral record.', severity: 'error' });
    } finally {
      setSubmitting(null);
    }
  };

  const fieldSx = { flex: '1 1 200px', minWidth: 160 };
  const accordionSx = {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '12px !important',
    mb: 1.5,
    '&:before': { display: 'none' },
    boxShadow: 'none',
    bgcolor: 'background.paper',
    '&.Mui-expanded': { mb: 1.5 },
  };

  /* ── Recent records renderer ── */
  const renderRecentRecords = (
    records: RecentRecord[],
    loading: boolean,
    color: string,
    gradient: string,
    icon: React.ReactNode,
    title: string,
    navigateTo: string,
    newTo: string,
  ) => (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          background: gradient,
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#fff' }}>
          {icon}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff' }}>{title}</Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate(newTo)}
          sx={{
            color: '#fff',
            borderColor: alpha('#fff', 0.6),
            '&:hover': { borderColor: '#fff', bgcolor: alpha('#fff', 0.15) },
            textTransform: 'none',
            py: 0.25,
          }}
          startIcon={<AddIcon sx={{ fontSize: '0.9rem' }} />}
        >
          Add
        </Button>
      </Box>
      <CardContent sx={{ p: 0, flex: 1, '&:last-child': { pb: 0 } }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)}
          </Box>
        ) : records.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">No records yet</Typography>
          </Box>
        ) : (
          records.map((rec, idx) => (
            <React.Fragment key={rec.id}>
              <Box
                sx={{
                  px: 2.5, py: 1.25,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: alpha(color, 0.05) },
                  transition: 'background 0.2s',
                }}
                onClick={() => navigate(navigateTo)}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>{rec.label}</Typography>
                  {rec.sub && <Typography variant="caption" color="text.secondary">{rec.sub}</Typography>}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                  {formatDate(rec.date)}
                </Typography>
              </Box>
              {idx < records.length - 1 && <Divider sx={{ mx: 2.5 }} />}
            </React.Fragment>
          ))
        )}
        <Divider />
        <Box
          sx={{
            px: 2.5, py: 1, textAlign: 'right', cursor: 'pointer',
            '&:hover': { bgcolor: alpha(color, 0.05) },
          }}
          onClick={() => navigate(navigateTo)}
        >
          <Typography variant="caption" sx={{ color, fontWeight: 600 }}>View all →</Typography>
        </Box>
      </CardContent>
    </Card>
  );

  /* ─── Render ─── */
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
          mb: 5,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            opacity: isDark ? 0.06 : 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23000000' fill-opacity='0'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23000000' fill-opacity='0.4'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23000000' fill-opacity='0.25'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: '10%',
            right: '10%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(200,162,75,0.4) 50%, transparent 100%)',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 3, md: 4 },
            px: { xs: 3, sm: 4, md: 5 },
            py: { xs: 4, sm: 5, md: 6 },
          }}
        >
          {/* Logo */}
          <Box
            component="img"
            src="/images/logos/om-logo.png"
            alt="Orthodox Metrics"
            sx={{
              width: { xs: 64, sm: 80, md: 96 },
              height: { xs: 64, sm: 80, md: 96 },
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
              border: '3px solid',
              borderColor: isDark ? 'rgba(200,162,75,0.3)' : 'rgba(200,162,75,0.25)',
            }}
          />

          {/* Text + info chips */}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontFamily: '"Cormorant Garamond", "Palatino Linotype", Georgia, serif',
                fontWeight: 700,
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
                color: 'text.primary',
                lineHeight: 1.2,
              }}
            >
              {greeting}
            </Typography>
            <Typography
              variant="h6"
              sx={{ mt: 1, fontWeight: 400, color: 'text.secondary', fontSize: { xs: '0.95rem', sm: '1.1rem' } }}
            >
              Your parish management portal
            </Typography>

            {/* Info chips row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
              {churchName && (
                <Chip
                  icon={<IconBuildingChurch size={16} />}
                  label={churchName}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: isDark ? 'rgba(200,162,75,0.3)' : 'rgba(200,162,75,0.4)',
                    color: 'text.primary',
                    fontWeight: 500,
                    '& .MuiChip-icon': { color: 'rgba(200,162,75,0.8)' },
                  }}
                />
              )}
              <Chip
                icon={<IconShieldCheck size={16} />}
                label={roleLabel}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                  color: 'text.primary',
                  fontWeight: 500,
                  '& .MuiChip-icon': { color: 'text.secondary' },
                }}
              />
              {user?.last_login && (
                <Chip
                  icon={<IconLogin size={16} />}
                  label={`Last login: ${formatLastLogin(user.last_login)}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                    color: 'text.secondary',
                    '& .MuiChip-icon': { color: 'text.secondary' },
                  }}
                />
              )}
              <Chip
                icon={<IconClock size={16} />}
                label={`Session: ${sessionTimeLeft}`}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: isDark ? 'rgba(76,175,80,0.3)' : 'rgba(76,175,80,0.4)',
                  color: isDark ? 'rgba(129,199,132,0.9)' : '#2e7d32',
                  fontWeight: 500,
                  '& .MuiChip-icon': { color: isDark ? 'rgba(129,199,132,0.9)' : '#2e7d32' },
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Dashboard Overview ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeading>Dashboard Overview</SectionHeading>
        {dashLoading ? (
          <Box>
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
            </Grid>
          </Box>
        ) : !activeChurchId ? (
          <Alert severity="info">Select a church to view dashboard data.</Alert>
        ) : null}
      </Box>

      {/* ── Sacramental Records ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeading>Sacramental Records</SectionHeading>
        <Grid container spacing={3}>
          {RECORDS.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.to}>
              <FeatureCardItem feature={feature} large />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Quick Add Record ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeading>Quick Add Record</SectionHeading>

        {/* Baptism */}
        <Accordion sx={accordionSx} disableGutters>
          <AccordionSummary expandIcon={<IconChevronDown size={20} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BaptismIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Baptism Record</Typography>
              <Chip label="Quick Entry" size="small" sx={{ ml: 0.5, fontSize: '0.7rem' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <TextField sx={fieldSx} label="Child's Name *" size="small" value={baptismForm.child_name} onChange={(e) => setBaptismForm((f) => ({ ...f, child_name: e.target.value }))} />
              <TextField sx={fieldSx} label="Baptism Date *" size="small" type="date" InputLabelProps={{ shrink: true }} value={baptismForm.baptism_date} onChange={(e) => setBaptismForm((f) => ({ ...f, baptism_date: e.target.value }))} />
              <TextField sx={fieldSx} label="Father's Name" size="small" value={baptismForm.father_name} onChange={(e) => setBaptismForm((f) => ({ ...f, father_name: e.target.value }))} />
              <TextField sx={fieldSx} label="Mother's Name" size="small" value={baptismForm.mother_name} onChange={(e) => setBaptismForm((f) => ({ ...f, mother_name: e.target.value }))} />
              <TextField sx={fieldSx} label="Priest's Name" size="small" value={baptismForm.priest_name} onChange={(e) => setBaptismForm((f) => ({ ...f, priest_name: e.target.value }))} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => navigate('/portal/records/baptism/new')} sx={{ textTransform: 'none' }}>Full Form</Button>
              <Button
                variant="contained" size="small"
                disabled={!baptismForm.child_name || !baptismForm.baptism_date || submitting === 'baptism'}
                onClick={handleBaptismSubmit}
                startIcon={submitting === 'baptism' ? <CircularProgress size={14} color="inherit" /> : <IconPlus size={16} />}
                sx={{ textTransform: 'none' }}
              >
                Save Baptism
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Marriage */}
        <Accordion sx={accordionSx} disableGutters>
          <AccordionSummary expandIcon={<IconChevronDown size={20} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #c62828 0%, #ef9a9a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MarriageIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Marriage Record</Typography>
              <Chip label="Quick Entry" size="small" sx={{ ml: 0.5, fontSize: '0.7rem' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <TextField sx={fieldSx} label="Groom's Name *" size="small" value={marriageForm.groom_name} onChange={(e) => setMarriageForm((f) => ({ ...f, groom_name: e.target.value }))} />
              <TextField sx={fieldSx} label="Bride's Name *" size="small" value={marriageForm.bride_name} onChange={(e) => setMarriageForm((f) => ({ ...f, bride_name: e.target.value }))} />
              <TextField sx={fieldSx} label="Marriage Date *" size="small" type="date" InputLabelProps={{ shrink: true }} value={marriageForm.marriage_date} onChange={(e) => setMarriageForm((f) => ({ ...f, marriage_date: e.target.value }))} />
              <TextField sx={fieldSx} label="Priest's Name" size="small" value={marriageForm.priest_name} onChange={(e) => setMarriageForm((f) => ({ ...f, priest_name: e.target.value }))} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => navigate('/portal/records/marriage/new')} sx={{ textTransform: 'none' }}>Full Form</Button>
              <Button
                variant="contained" size="small" color="error"
                disabled={!marriageForm.groom_name || !marriageForm.bride_name || !marriageForm.marriage_date || submitting === 'marriage'}
                onClick={handleMarriageSubmit}
                startIcon={submitting === 'marriage' ? <CircularProgress size={14} color="inherit" /> : <IconPlus size={16} />}
                sx={{ textTransform: 'none' }}
              >
                Save Marriage
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Funeral */}
        <Accordion sx={accordionSx} disableGutters>
          <AccordionSummary expandIcon={<IconChevronDown size={20} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FuneralIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Funeral Record</Typography>
              <Chip label="Quick Entry" size="small" sx={{ ml: 0.5, fontSize: '0.7rem' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <TextField sx={fieldSx} label="Deceased Name *" size="small" value={funeralForm.deceased_name} onChange={(e) => setFuneralForm((f) => ({ ...f, deceased_name: e.target.value }))} />
              <TextField sx={fieldSx} label="Date of Death *" size="small" type="date" InputLabelProps={{ shrink: true }} value={funeralForm.death_date} onChange={(e) => setFuneralForm((f) => ({ ...f, death_date: e.target.value }))} />
              <TextField sx={fieldSx} label="Funeral Date" size="small" type="date" InputLabelProps={{ shrink: true }} value={funeralForm.funeral_date} onChange={(e) => setFuneralForm((f) => ({ ...f, funeral_date: e.target.value }))} />
              <TextField sx={fieldSx} label="Priest's Name" size="small" value={funeralForm.priest_name} onChange={(e) => setFuneralForm((f) => ({ ...f, priest_name: e.target.value }))} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => navigate('/portal/records/funeral/new')} sx={{ textTransform: 'none' }}>Full Form</Button>
              <Button
                variant="contained" size="small" color="secondary"
                disabled={!funeralForm.deceased_name || !funeralForm.death_date || submitting === 'funeral'}
                onClick={handleFuneralSubmit}
                startIcon={submitting === 'funeral' ? <CircularProgress size={14} color="inherit" /> : <IconPlus size={16} />}
                sx={{ textTransform: 'none' }}
              >
                Save Funeral
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* ── Recent Records ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeading>Recent Records</SectionHeading>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            {renderRecentRecords(
              recentBaptism, recordsLoading, '#1565c0',
              'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
              <BaptismIcon sx={{ fontSize: 20 }} />, 'Baptisms',
              '/portal/records/baptism', '/portal/records/baptism/new',
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            {renderRecentRecords(
              recentMarriage, recordsLoading, '#c62828',
              'linear-gradient(135deg, #c62828 0%, #ef9a9a 100%)',
              <MarriageIcon sx={{ fontSize: 20 }} />, 'Marriages',
              '/portal/records/marriage', '/portal/records/marriage/new',
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            {renderRecentRecords(
              recentFuneral, recordsLoading, '#4a148c',
              'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)',
              <FuneralIcon sx={{ fontSize: 20 }} />, 'Funerals',
              '/portal/records/funeral', '/portal/records/funeral/new',
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── Tools & Services ── */}
      {visibleTools.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <SectionHeading>Tools & Services</SectionHeading>
          <Grid container spacing={3}>
            {visibleTools.map((feature) => (
              <Grid item xs={12} sm={6} md={4} key={feature.to}>
                <FeatureCardItem feature={feature} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Account ── */}
      <Box sx={{ mb: 3 }}>
        <SectionHeading>Account</SectionHeading>
        <Grid container spacing={3}>
          {ACCOUNT.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.to}>
              <FeatureCardItem feature={feature} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChurchPortalHub;
