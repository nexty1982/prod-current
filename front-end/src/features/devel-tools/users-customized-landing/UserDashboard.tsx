/**
 * Orthodox Metrics - User Dashboard
 * Clean, minimal landing page for standard users (non-admin)
 * Features: greeting with church, quick-add wizard, recent records, module cards
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Fade,
  Card,
  CardContent,
  CardActionArea,
  alpha,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Divider,
  Skeleton,
} from '@mui/material';
import {
  Person as ProfileIcon,
  BarChart as MetricsIcon,
  CloudUpload as UploadIcon,
  Translate as LanguageIcon,
  StickyNote2 as NotesIcon,
  ExpandMore as ExpandMoreIcon,
  ChildCare as BaptismIcon,
  Favorite as MarriageIcon,
  LocalFlorist as FuneralIcon,
  Church as ChurchIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import { metricsAPI } from '@/api/metrics.api';

interface ModuleCard {
  icon: React.ReactNode;
  label: string;
  description: string;
  to: string;
  color: string;
  gradient: string;
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

interface RecentRecord {
  id: number;
  label: string;
  date: string;
  sub?: string;
}

const emptyBaptism: BaptismFormData = {
  child_name: '',
  baptism_date: '',
  father_name: '',
  mother_name: '',
  priest_name: '',
};

const emptyMarriage: MarriageFormData = {
  groom_name: '',
  bride_name: '',
  marriage_date: '',
  priest_name: '',
};

const emptyFuneral: FuneralFormData = {
  deceased_name: '',
  death_date: '',
  funeral_date: '',
  priest_name: '',
};

/**
 * User Dashboard Component
 * Minimal, clean landing page with bouncy module cards
 */
export const UserDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { churchMetadata } = useChurch();

  // Quick-add form state
  const [baptismForm, setBaptismForm] = useState<BaptismFormData>(emptyBaptism);
  const [marriageForm, setMarriageForm] = useState<MarriageFormData>(emptyMarriage);
  const [funeralForm, setFuneralForm] = useState<FuneralFormData>(emptyFuneral);

  // Submission state
  const [submitting, setSubmitting] = useState<'baptism' | 'marriage' | 'funeral' | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Recent records state
  const [recentBaptism, setRecentBaptism] = useState<RecentRecord[]>([]);
  const [recentMarriage, setRecentMarriage] = useState<RecentRecord[]>([]);
  const [recentFuneral, setRecentFuneral] = useState<RecentRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // User modules — Calendar removed, OCR upload URL updated
  const modules: ModuleCard[] = [
    {
      icon: <ProfileIcon sx={{ fontSize: 48 }} />,
      label: 'My Profile',
      description: 'View and edit your profile',
      to: '/user-profile',
      color: '#1976d2',
      gradient: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
    },
    {
      icon: <MetricsIcon sx={{ fontSize: 48 }} />,
      label: 'Church Metrics',
      description: 'Baptism, marriage & funeral records',
      to: '/apps/records/baptism',
      color: '#7b1fa2',
      gradient: 'linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%)',
    },
    {
      icon: <UploadIcon sx={{ fontSize: 48 }} />,
      label: 'OM Record Uploads',
      description: 'Upload & process church documents',
      to: '/devel/ocr-studio/upload',
      color: '#00897b',
      gradient: 'linear-gradient(135deg, #00897b 0%, #4db6ac 100%)',
    },
    {
      icon: <LanguageIcon sx={{ fontSize: 48 }} />,
      label: 'Multi Language',
      description: 'Language samples & translations',
      to: '/samples',
      color: '#f57c00',
      gradient: 'linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)',
    },
    {
      icon: <NotesIcon sx={{ fontSize: 48 }} />,
      label: 'Sticky Notes',
      description: 'Personal notes & reminders',
      to: '/apps/notes',
      color: '#fbc02d',
      gradient: 'linear-gradient(135deg, #f9a825 0%, #ffee58 100%)',
    },
  ];

  const handleNavigate = (to: string) => {
    navigate(to);
  };

  // Fetch 3 most recent records for each type
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
        setRecentBaptism(
          rows.slice(0, 3).map((r: any) => ({
            id: r.id,
            label: r.child_name || r.first_name || '—',
            date: r.baptism_date || r.date_entered || '',
            sub: r.priest_name ? `Fr. ${r.priest_name}` : undefined,
          }))
        );
      }

      if (marriageRes.status === 'fulfilled') {
        const rows = marriageRes.value?.records ?? marriageRes.value?.data ?? [];
        setRecentMarriage(
          rows.slice(0, 3).map((r: any) => ({
            id: r.id,
            label: [r.groom_name, r.bride_name].filter(Boolean).join(' & ') || '—',
            date: r.marriage_date || r.date_entered || '',
            sub: r.priest_name ? `Fr. ${r.priest_name}` : undefined,
          }))
        );
      }

      if (funeralRes.status === 'fulfilled') {
        const rows = funeralRes.value?.records ?? funeralRes.value?.data ?? [];
        setRecentFuneral(
          rows.slice(0, 3).map((r: any) => ({
            id: r.id,
            label: r.deceased_name || r.first_name || '—',
            date: r.funeral_date || r.death_date || r.date_entered || '',
            sub: r.priest_name ? `Fr. ${r.priest_name}` : undefined,
          }))
        );
      }
    } catch (_e) {
      // Non-critical — silently ignore
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentRecords();
  }, [loadRecentRecords]);

  // Quick-add submit handlers
  const handleBaptismSubmit = async () => {
    if (!baptismForm.child_name || !baptismForm.baptism_date) return;
    setSubmitting('baptism');
    try {
      await metricsAPI.records.createBaptismRecord(baptismForm);
      setBaptismForm(emptyBaptism);
      setToast({ open: true, message: 'Baptism record added successfully.', severity: 'success' });
      loadRecentRecords();
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_e) {
      setToast({ open: true, message: 'Failed to save funeral record.', severity: 'error' });
    } finally {
      setSubmitting(null);
    }
  };

  const isDark = theme.palette.mode === 'dark';

  const sectionHeadingSx = {
    fontWeight: 600,
    mb: 2,
    color: 'text.primary',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  };

  const accordionSx = {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '12px !important',
    mb: 1.5,
    '&:before': { display: 'none' },
    boxShadow: 'none',
    bgcolor: 'background.paper',
    '&.Mui-expanded': { mb: 1.5 },
  };

  const fieldSx = { flex: '1 1 200px', minWidth: 160 };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderRecentRecords = (
    records: RecentRecord[],
    loading: boolean,
    color: string,
    gradient: string,
    icon: React.ReactNode,
    title: string,
    navigateTo: string,
    newTo: string
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
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff' }}>
            {title}
          </Typography>
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
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />
            ))}
          </Box>
        ) : records.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              No records yet
            </Typography>
          </Box>
        ) : (
          records.map((rec, idx) => (
            <React.Fragment key={rec.id}>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.25,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: alpha(color, 0.05) },
                  transition: 'background 0.2s',
                }}
                onClick={() => navigate(navigateTo)}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {rec.label}
                  </Typography>
                  {rec.sub && (
                    <Typography variant="caption" color="text.secondary">
                      {rec.sub}
                    </Typography>
                  )}
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
            px: 2.5,
            py: 1,
            textAlign: 'right',
            cursor: 'pointer',
            '&:hover': { bgcolor: alpha(color, 0.05) },
          }}
          onClick={() => navigate(navigateTo)}
        >
          <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
            View all →
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'User';
  const churchName = churchMetadata?.church_name_display || churchMetadata?.church_name;

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header / Greeting */}
      <Box mb={5} textAlign="center">
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            background: isDark
              ? 'linear-gradient(135deg, #90caf9 0%, #ce93d8 100%)'
              : 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome Back, {firstName}
        </Typography>
        {churchName && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <ChurchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
              {churchName}
            </Typography>
          </Box>
        )}
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
          Select a module to get started or quickly add a new sacramental record below.
        </Typography>
      </Box>

      {/* Quick Add Section */}
      <Box mb={5}>
        <Typography variant="h5" sx={{ ...sectionHeadingSx, mb: 2.5 }}>
          <AddIcon sx={{ fontSize: '1.3em', color: 'primary.main' }} /> Quick Add Record
        </Typography>

        {/* Baptism Accordion */}
        <Accordion sx={accordionSx} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BaptismIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Baptism Record
              </Typography>
              <Chip label="Quick Entry" size="small" sx={{ ml: 0.5, fontSize: '0.7rem' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <TextField
                sx={fieldSx}
                label="Child's Name *"
                size="small"
                value={baptismForm.child_name}
                onChange={(e) => setBaptismForm((f) => ({ ...f, child_name: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Baptism Date *"
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={baptismForm.baptism_date}
                onChange={(e) => setBaptismForm((f) => ({ ...f, baptism_date: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Father's Name"
                size="small"
                value={baptismForm.father_name}
                onChange={(e) => setBaptismForm((f) => ({ ...f, father_name: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Mother's Name"
                size="small"
                value={baptismForm.mother_name}
                onChange={(e) => setBaptismForm((f) => ({ ...f, mother_name: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Priest's Name"
                size="small"
                value={baptismForm.priest_name}
                onChange={(e) => setBaptismForm((f) => ({ ...f, priest_name: e.target.value }))}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                onClick={() => navigate('/apps/records/baptism/new')}
                sx={{ textTransform: 'none' }}
              >
                Full Form
              </Button>
              <Button
                variant="contained"
                size="small"
                disabled={!baptismForm.child_name || !baptismForm.baptism_date || submitting === 'baptism'}
                onClick={handleBaptismSubmit}
                startIcon={submitting === 'baptism' ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                sx={{ textTransform: 'none' }}
              >
                Save Baptism
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Marriage Accordion */}
        <Accordion sx={accordionSx} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #c62828 0%, #ef9a9a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MarriageIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Marriage Record
              </Typography>
              <Chip label="Quick Entry" size="small" sx={{ ml: 0.5, fontSize: '0.7rem' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <TextField
                sx={fieldSx}
                label="Groom's Name *"
                size="small"
                value={marriageForm.groom_name}
                onChange={(e) => setMarriageForm((f) => ({ ...f, groom_name: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Bride's Name *"
                size="small"
                value={marriageForm.bride_name}
                onChange={(e) => setMarriageForm((f) => ({ ...f, bride_name: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Marriage Date *"
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={marriageForm.marriage_date}
                onChange={(e) => setMarriageForm((f) => ({ ...f, marriage_date: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Priest's Name"
                size="small"
                value={marriageForm.priest_name}
                onChange={(e) => setMarriageForm((f) => ({ ...f, priest_name: e.target.value }))}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                onClick={() => navigate('/apps/records/marriage/new')}
                sx={{ textTransform: 'none' }}
              >
                Full Form
              </Button>
              <Button
                variant="contained"
                size="small"
                color="error"
                disabled={!marriageForm.groom_name || !marriageForm.bride_name || !marriageForm.marriage_date || submitting === 'marriage'}
                onClick={handleMarriageSubmit}
                startIcon={submitting === 'marriage' ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                sx={{ textTransform: 'none' }}
              >
                Save Marriage
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Funeral Accordion */}
        <Accordion sx={accordionSx} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FuneralIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Funeral Record
              </Typography>
              <Chip label="Quick Entry" size="small" sx={{ ml: 0.5, fontSize: '0.7rem' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <TextField
                sx={fieldSx}
                label="Deceased Name *"
                size="small"
                value={funeralForm.deceased_name}
                onChange={(e) => setFuneralForm((f) => ({ ...f, deceased_name: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Date of Death *"
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={funeralForm.death_date}
                onChange={(e) => setFuneralForm((f) => ({ ...f, death_date: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Funeral Date"
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={funeralForm.funeral_date}
                onChange={(e) => setFuneralForm((f) => ({ ...f, funeral_date: e.target.value }))}
              />
              <TextField
                sx={fieldSx}
                label="Priest's Name"
                size="small"
                value={funeralForm.priest_name}
                onChange={(e) => setFuneralForm((f) => ({ ...f, priest_name: e.target.value }))}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                onClick={() => navigate('/apps/records/funeral/new')}
                sx={{ textTransform: 'none' }}
              >
                Full Form
              </Button>
              <Button
                variant="contained"
                size="small"
                color="secondary"
                disabled={!funeralForm.deceased_name || !funeralForm.death_date || submitting === 'funeral'}
                onClick={handleFuneralSubmit}
                startIcon={submitting === 'funeral' ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                sx={{ textTransform: 'none' }}
              >
                Save Funeral
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* All Modules Section */}
      <Box mb={6}>
        <Typography variant="h5" sx={sectionHeadingSx}>
          <span style={{ fontSize: '1.2em' }}>🏠</span> All Modules
        </Typography>

        {/* Modules Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          {modules.map((module, index) => (
            <Fade in={true} timeout={400 + index * 100} key={module.label}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-12px) scale(1.02)',
                    boxShadow: isDark
                      ? `0 20px 40px ${alpha(module.color, 0.3)}, 0 0 0 1px ${alpha(module.color, 0.2)}`
                      : `0 20px 40px ${alpha(module.color, 0.25)}, 0 0 0 1px ${alpha(module.color, 0.1)}`,
                    '& .module-icon-container': {
                      transform: 'scale(1.1) rotate(-5deg)',
                    },
                  },
                  '&:active': {
                    transform: 'translateY(-8px) scale(0.98)',
                  },
                }}
                onClick={() => handleNavigate(module.to)}
              >
                <CardActionArea sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                      className="module-icon-container"
                      sx={{
                        width: 90,
                        height: 90,
                        borderRadius: '24px',
                        background: module.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        boxShadow: `0 8px 24px ${alpha(module.color, 0.35)}`,
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      <Box sx={{ color: '#fff' }}>{module.icon}</Box>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                      {module.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                      {module.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Fade>
          ))}
        </Box>
      </Box>

      {/* Recent Records Section */}
      <Box mb={4}>
        <Typography variant="h5" sx={sectionHeadingSx}>
          <span style={{ fontSize: '1.2em' }}>📋</span> Recent Records
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {renderRecentRecords(
            recentBaptism,
            recordsLoading,
            '#1565c0',
            'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
            <BaptismIcon sx={{ fontSize: 20 }} />,
            'Baptisms',
            '/apps/records/baptism',
            '/apps/records/baptism/new'
          )}
          {renderRecentRecords(
            recentMarriage,
            recordsLoading,
            '#c62828',
            'linear-gradient(135deg, #c62828 0%, #ef9a9a 100%)',
            <MarriageIcon sx={{ fontSize: 20 }} />,
            'Marriages',
            '/apps/records/marriage',
            '/apps/records/marriage/new'
          )}
          {renderRecentRecords(
            recentFuneral,
            recordsLoading,
            '#4a148c',
            'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)',
            <FuneralIcon sx={{ fontSize: 20 }} />,
            'Funerals',
            '/apps/records/funeral',
            '/apps/records/funeral/new'
          )}
        </Box>
      </Box>

      {/* Toast notification */}
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
    </Container>
  );
};

export default UserDashboard;
