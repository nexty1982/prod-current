/**
 * ChurchLifecycleDetailPage.tsx — Unified Church Detail View
 *
 * Combines CRM contact management (contacts, activities, follow-ups)
 * with onboarding detail (tokens, members, setup checklist) into
 * a single detail page for any church in the lifecycle pipeline.
 *
 * PP-0003 Step 4 | CS-0050
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  Call as CallIcon,
  Cancel as RejectIcon,
  CheckCircle as ApproveIcon,
  CheckCircle as CheckIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Event as FollowUpIcon,
  Groups as MeetingIcon,
  LinkOff as DeactivateIcon,
  NoteAlt as NoteIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Star as StarIcon,
  SwapHoriz as StageChangeIcon,
  Task as TaskIcon,
  Timeline as TimelineIcon,
  VpnKey as TokenIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CRMChurch {
  id: number;
  name: string;
  city: string | null;
  state_code: string | null;
  phone: string | null;
  website: string | null;
  pipeline_stage: string;
  priority: string | null;
  is_client: number;
  provisioned_church_id: number | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  crm_notes: string | null;
  jurisdiction: string | null;
  created_at: string;
  stage_label?: string;
  stage_color?: string;
  street?: string;
  zip?: string;
  // Extended pipeline fields
  current_records_situation?: string | null;
  estimated_volume?: string | null;
  historical_import_needed?: number;
  ocr_assistance_needed?: number;
  public_records_needed?: number;
  desired_launch_timeline?: string | null;
  custom_structure_required?: number;
  provisioning_ready?: number;
  provisioning_completed?: number;
  activation_date?: string | null;
  assigned_to_user_id?: number | null;
  discovery_notes?: string | null;
  blockers?: string | null;
}

interface OnboardedChurch {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  jurisdiction: string | null;
  is_active: number;
  setup_complete: number;
  created_at: string;
  website: string | null;
  db_name: string | null;
  notes: string | null;
}

interface CRMContact {
  id: number;
  church_id: number;
  first_name: string;
  last_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: number;
  notes: string | null;
}

interface CRMActivity {
  id: number;
  church_id: number;
  activity_type: string;
  subject: string;
  body: string | null;
  metadata: any;
  created_by: number | null;
  created_at: string;
}

interface CRMFollowUp {
  id: number;
  church_id: number;
  due_date: string;
  subject: string;
  description: string | null;
  status: string;
  completed_at: string | null;
}

interface ChurchMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_locked: number;
  lockout_reason: string | null;
  created_at: string;
}

interface ChurchToken {
  id: number;
  token: string;
  is_active: number;
  created_at: string;
  created_by: string | null;
}

interface OnboardingChecklist {
  church_created: boolean;
  token_issued: boolean;
  members_registered: boolean;
  members_active: boolean;
  setup_complete: boolean;
}

interface PipelineStage {
  id: number;
  stage_key: string;
  label: string;
  color: string;
  sort_order: number;
  is_terminal: number;
}

interface RecordRequirement {
  id: number;
  record_type: string;
  uses_sample: number;
  sample_template_id: number | null;
  custom_required: number;
  custom_notes: string | null;
  template_name?: string;
}

interface OnboardingEmail {
  id: number;
  email_type: string;
  subject: string;
  recipients: string;
  status: string;
  sent_at: string | null;
  replied_at: string | null;
  created_at: string;
}

interface PipelineActivity {
  id: number;
  activity_type: string;
  summary: string;
  details_json: any;
  actor_user_id: number | null;
  created_at: string;
}

interface ProvisioningChecklist {
  contact_complete: boolean;
  record_requirements_set: boolean;
  templates_or_custom: boolean;
  internal_review_done: boolean;
  provisioning_email_sent: boolean;
  response_received: boolean;
  account_created: boolean;
  invite_sent: boolean;
  activated: boolean | null;
}

interface TimelineEntry {
  id: string;
  type: 'activity' | 'crm_activity' | 'email' | 'stage_change' | 'member' | 'token' | 'pipeline';
  icon: React.ReactNode;
  color: string;
  title: string;
  detail?: string;
  date: string;
}

type SnackState = { open: boolean; message: string; severity: 'success' | 'error' | 'info' };

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLOR = '#1565c0';

const STEPPER_STEPS = ['Church Created', 'Token Issued', 'Members Registered', 'Members Active', 'Setup Complete'];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <NoteIcon fontSize="small" />,
  call: <CallIcon fontSize="small" />,
  email: <EmailIcon fontSize="small" />,
  meeting: <MeetingIcon fontSize="small" />,
  task: <TaskIcon fontSize="small" />,
  stage_change: <StageChangeIcon fontSize="small" />,
  provision: <TokenIcon fontSize="small" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  note: '#9e9e9e',
  call: '#4caf50',
  email: '#2196f3',
  meeting: '#ff9800',
  task: '#9c27b0',
  stage_change: '#e91e63',
  provision: '#00bcd4',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ChurchLifecycleDetailPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { churchId } = useParams<{ churchId: string }>();

  /* --- state: data ------------------------------------------------- */
  const [source, setSource] = useState<'crm' | 'onboarded' | 'both'>('crm');
  const [unifiedStage, setUnifiedStage] = useState('');
  const [crm, setCrm] = useState<CRMChurch | null>(null);
  const [onboarded, setOnboarded] = useState<OnboardedChurch | null>(null);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [followUps, setFollowUps] = useState<CRMFollowUp[]>([]);
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [tokens, setTokens] = useState<ChurchToken[]>([]);
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* --- state: tab -------------------------------------------------- */
  const [tab, setTab] = useState(0);

  /* --- state: notes ------------------------------------------------ */
  const [notes, setNotes] = useState('');
  const [notesOriginal, setNotesOriginal] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  /* --- state: dialogs ---------------------------------------------- */
  const [snack, setSnack] = useState<SnackState>({ open: false, message: '', severity: 'success' });

  // Contact dialog
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null);
  const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', role: '', email: '', phone: '', is_primary: false, notes: '' });

  // Activity dialog
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({ activity_type: 'note', subject: '', body: '' });

  // Follow-up dialog
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ due_date: '', subject: '', description: '' });

  // Stage dialog
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [newStage, setNewStage] = useState('');

  // Onboarding actions
  const [togglingSetup, setTogglingSetup] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [deactivatingToken, setDeactivatingToken] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; userId: number | null; email: string }>({ open: false, userId: null, email: '' });
  const [rejectReason, setRejectReason] = useState('');

  // Pipeline extended data
  const [pipelineRequirements, setPipelineRequirements] = useState<RecordRequirement[]>([]);
  const [pipelineEmails, setPipelineEmails] = useState<OnboardingEmail[]>([]);
  const [pipelineActivities, setPipelineActivities] = useState<PipelineActivity[]>([]);
  const [provisionChecklist, setProvisionChecklist] = useState<ProvisioningChecklist | null>(null);

  const churchName = crm?.name || onboarded?.name || 'Church Detail';

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/church-lifecycle', title: 'Church Lifecycle' },
    { title: churchName },
  ];

  /* ------------------------------------------------------------------ */
  /*  Data fetching                                                      */
  /* ------------------------------------------------------------------ */

  const fetchDetail = useCallback(async () => {
    if (!churchId) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/admin/church-lifecycle/${churchId}`, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      setSource(data.source || 'crm');
      setUnifiedStage(data.unified_stage || '');
      setCrm(data.crm || null);
      setOnboarded(data.onboarded || null);
      setContacts(data.contacts || []);
      setActivities(data.activities || []);
      setFollowUps(data.followUps || []);
      setMembers(data.members || []);
      setTokens(data.tokens || []);
      setChecklist(data.checklist || null);

      const n = data.crm?.crm_notes || data.onboarded?.notes || '';
      setNotes(n);
      setNotesOriginal(n);

      // Fetch extended pipeline data for CRM churches
      if (data.crm?.id) {
        try {
          const pipeResp = await fetch(`/api/admin/onboarding-pipeline/${data.crm.id}/detail`, { credentials: 'include' });
          if (pipeResp.ok) {
            const pipeData = await pipeResp.json();
            if (pipeData.success) {
              setPipelineRequirements(pipeData.requirements || []);
              setPipelineEmails(pipeData.emails || []);
              setPipelineActivities(pipeData.activities || []);
              setProvisionChecklist(pipeData.checklist || null);
            }
          }
        } catch { /* non-critical — pipeline data is supplementary */ }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load church detail');
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  const fetchStages = useCallback(async () => {
    try {
      const resp = await fetch('/api/admin/church-lifecycle/stages', { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setStages(data.stages || []);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchDetail(); fetchStages(); }, [fetchDetail, fetchStages]);

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnack({ open: true, message, severity });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const timeAgo = (d: string) => {
    const ms = Date.now() - new Date(d).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text).then(() => showToast(`${label} to clipboard`, 'info'));
  };

  const getActiveStep = (): number => {
    if (!checklist) return 0;
    if (checklist.setup_complete) return 5;
    if (checklist.members_active) return 4;
    if (checklist.members_registered) return 3;
    if (checklist.token_issued) return 2;
    if (checklist.church_created) return 1;
    return 0;
  };

  const stageInfo = stages.find(s => s.stage_key === unifiedStage);
  const stageColor = stageInfo?.color || '#9e9e9e';
  const stageLabel = stageInfo?.label || unifiedStage;

  const crmId = crm?.id;
  const onboardedId = onboarded?.id;
  const hasCrm = source === 'crm' || source === 'both';
  const hasOnboarding = source === 'onboarded' || source === 'both';

  const totalMembers = members.length;
  const activeMembers = members.filter(m => !m.is_locked).length;
  const pendingMembers = members.filter(m => m.is_locked && m.lockout_reason?.toLowerCase().includes('pending')).length;

  /* ------------------------------------------------------------------ */
  /*  CRM Actions                                                        */
  /* ------------------------------------------------------------------ */

  const handleSaveNotes = async () => {
    if (!crmId && !onboardedId) return;
    setNotesSaving(true);
    try {
      if (crmId) {
        const resp = await fetch(`/api/crm/churches/${crmId}`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crm_notes: notes }),
        });
        if (!resp.ok) throw new Error('Failed to save notes');
      } else if (onboardedId) {
        const resp = await fetch(`/api/admin/church-onboarding/${onboardedId}/update-notes`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        });
        if (!resp.ok) throw new Error('Failed to save notes');
      }
      setNotesOriginal(notes);
      showToast('Notes saved');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setNotesSaving(false);
    }
  };

  const handleSaveContact = async () => {
    if (!crmId || !contactForm.first_name) return;
    try {
      const url = editingContact
        ? `/api/crm/contacts/${editingContact.id}`
        : `/api/crm/churches/${crmId}/contacts`;
      const method = editingContact ? 'PUT' : 'POST';
      const resp = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          is_primary: contactForm.is_primary ? 1 : 0,
        }),
      });
      if (!resp.ok) throw new Error('Failed to save contact');
      showToast(editingContact ? 'Contact updated' : 'Contact added');
      setContactDialogOpen(false);
      setEditingContact(null);
      setContactForm({ first_name: '', last_name: '', role: '', email: '', phone: '', is_primary: false, notes: '' });
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      const resp = await fetch(`/api/crm/contacts/${contactId}`, { method: 'DELETE', credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to delete contact');
      showToast('Contact deleted');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleLogActivity = async () => {
    if (!crmId || !activityForm.subject) return;
    try {
      const resp = await fetch(`/api/crm/churches/${crmId}/activities`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityForm),
      });
      if (!resp.ok) throw new Error('Failed to log activity');
      showToast('Activity logged');
      setActivityDialogOpen(false);
      setActivityForm({ activity_type: 'note', subject: '', body: '' });
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddFollowUp = async () => {
    if (!crmId || !followUpForm.due_date || !followUpForm.subject) return;
    try {
      const resp = await fetch(`/api/crm/churches/${crmId}/follow-ups`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUpForm),
      });
      if (!resp.ok) throw new Error('Failed to add follow-up');
      showToast('Follow-up scheduled');
      setFollowUpDialogOpen(false);
      setFollowUpForm({ due_date: '', subject: '', description: '' });
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCompleteFollowUp = async (id: number) => {
    try {
      const resp = await fetch(`/api/crm/follow-ups/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!resp.ok) throw new Error('Failed to complete follow-up');
      showToast('Follow-up completed');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleStageChange = async () => {
    if (!churchId || !newStage) return;
    try {
      const resp = await fetch(`/api/admin/church-lifecycle/${churchId}/stage`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!resp.ok) throw new Error('Failed to change stage');
      showToast(`Stage changed to ${newStage}`);
      setStageDialogOpen(false);
      setNewStage('');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Onboarding Actions                                                 */
  /* ------------------------------------------------------------------ */

  const handleToggleSetup = async () => {
    if (!onboardedId) return;
    setTogglingSetup(true);
    try {
      const resp = await fetch(`/api/admin/church-onboarding/${onboardedId}/toggle-setup`, {
        method: 'POST', credentials: 'include',
      });
      if (!resp.ok) throw new Error('Failed to toggle setup');
      showToast('Setup status toggled');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setTogglingSetup(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!onboardedId) return;
    setGeneratingToken(true);
    try {
      const resp = await fetch(`/api/admin/church-onboarding/${onboardedId}/send-token`, {
        method: 'POST', credentials: 'include',
      });
      if (!resp.ok) throw new Error('Failed to generate token');
      showToast('Token generated');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleDeactivateToken = async (tokenId: number) => {
    if (!onboardedId) return;
    setDeactivatingToken(tokenId);
    try {
      const resp = await fetch(`/api/admin/churches/${onboardedId}/registration-token`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!resp.ok) throw new Error('Failed to deactivate token');
      showToast('Token deactivated');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeactivatingToken(null);
    }
  };

  const handleApproveMember = async (userId: number, email: string) => {
    setActionLoading(userId);
    try {
      const resp = await fetch(`/api/admin/users/${userId}/unlock`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error('Failed to unlock user');
      showToast(`${email} approved`);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectMember = async () => {
    if (!rejectDialog.userId) return;
    setActionLoading(rejectDialog.userId);
    try {
      await fetch(`/api/admin/users/${rejectDialog.userId}/lockout`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Registration rejected: ${rejectReason || 'Not approved by admin'}` }),
      });
      showToast(`${rejectDialog.email} rejected`);
      setRejectDialog({ open: false, userId: null, email: '' });
      setRejectReason('');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const hasActiveToken = tokens.some(t => t.is_active);

  /* ------------------------------------------------------------------ */
  /*  Tab definitions                                                    */
  /* ------------------------------------------------------------------ */

  const tabDefs: { label: string; badge?: number; show: boolean }[] = [
    { label: 'Overview', show: true },
    { label: 'Contacts', badge: contacts.length, show: hasCrm },
    { label: 'Activity', badge: activities.length, show: hasCrm },
    { label: 'Follow-ups', badge: followUps.filter(f => f.status === 'pending').length, show: hasCrm },
    { label: 'Onboarding', show: hasOnboarding },
    { label: 'Timeline', badge: activities.length + pipelineActivities.length + pipelineEmails.length, show: true },
  ];
  const visibleTabs = tabDefs.filter(t => t.show);

  /* ------------------------------------------------------------------ */
  /*  Render helpers                                                     */
  /* ------------------------------------------------------------------ */

  const sectionPaper = (children: React.ReactNode) => (
    <Paper
      elevation={0}
      sx={{
        p: 3, mb: 2.5,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 2,
      }}
    >
      {children}
    </Paper>
  );

  /* --- Overview Tab ------------------------------------------------- */
  const renderOverview = () => (
    <>
      {/* Onboarding Stepper (if onboarded) */}
      {hasOnboarding && checklist && sectionPaper(
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2.5 }}>Onboarding Progress</Typography>
          <Stepper activeStep={getActiveStep()} alternativeLabel>
            {STEPPER_STEPS.map(label => (
              <Step key={label}>
                <StepLabel StepIconProps={{ sx: { '&.Mui-active': { color: COLOR }, '&.Mui-completed': { color: COLOR } } }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </>
      )}

      {/* Church Information */}
      {sectionPaper(
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Church Information</Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Name</Typography>
              <Typography variant="body2">{churchName}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Location</Typography>
              <Typography variant="body2">
                {[crm?.city || onboarded?.city, crm?.state_code || onboarded?.state_province].filter(Boolean).join(', ') || '—'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Phone</Typography>
              <Typography variant="body2">{crm?.phone || onboarded?.phone || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Website</Typography>
              <Typography variant="body2">{crm?.website || onboarded?.website || '—'}</Typography>
            </Grid>

            {crm && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Priority</Typography>
                  <Typography variant="body2">{crm.priority || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Last Contacted</Typography>
                  <Typography variant="body2">{formatDate(crm.last_contacted_at)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Next Follow-up</Typography>
                  <Typography variant="body2">{formatDate(crm.next_follow_up)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Jurisdiction</Typography>
                  <Typography variant="body2">{crm.jurisdiction || '—'}</Typography>
                </Grid>
              </>
            )}

            {onboarded && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Email</Typography>
                  <Typography variant="body2">{onboarded.email || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Database</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    {onboarded.db_name || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Status</Typography>
                  <Box>
                    <Chip
                      label={onboarded.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={onboarded.is_active ? 'success' : 'default'}
                      variant={onboarded.is_active ? 'filled' : 'outlined'}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Setup Complete</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={onboarded.setup_complete ? 'Complete' : 'Incomplete'}
                      size="small"
                      color={onboarded.setup_complete ? 'success' : 'warning'}
                      variant={onboarded.setup_complete ? 'filled' : 'outlined'}
                    />
                    <Tooltip title={onboarded.setup_complete ? 'Mark as incomplete' : 'Mark as complete'}>
                      <Switch
                        size="small"
                        checked={!!onboarded.setup_complete}
                        disabled={togglingSetup}
                        onChange={handleToggleSetup}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: COLOR },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: COLOR },
                        }}
                      />
                    </Tooltip>
                  </Box>
                </Grid>
              </>
            )}

            {/* Notes */}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                Notes
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth multiline minRows={2} maxRows={5} size="small"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  InputProps={{ startAdornment: <EditIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18, mt: 0.5 }} /> }}
                />
                <Button
                  variant="contained" size="small"
                  startIcon={notesSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                  disabled={notesSaving || notes === notesOriginal}
                  onClick={handleSaveNotes}
                  sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) }, minWidth: 80, mt: 0.5 }}
                >
                  Save
                </Button>
              </Box>
            </Grid>
          </Grid>
        </>
      )}

      {/* Quick stats for follow-ups (if CRM) */}
      {hasCrm && followUps.length > 0 && sectionPaper(
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Upcoming Follow-ups</Typography>
          {followUps.filter(f => f.status === 'pending').slice(0, 5).map(f => {
            const isOverdue = new Date(f.due_date) < new Date(new Date().toDateString());
            return (
              <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
                <IconButton size="small" onClick={() => handleCompleteFollowUp(f.id)} sx={{ color: '#4caf50' }}>
                  <CheckIcon fontSize="small" />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{f.subject}</Typography>
                  <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
                    {formatDate(f.due_date)}{isOverdue ? ' (overdue)' : ''}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </>
      )}

      {/* Discovery & Qualification (CRM extended fields) */}
      {hasCrm && crm && sectionPaper(
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Discovery & Qualification</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Current Records</Typography>
              <Typography variant="body2">{crm.current_records_situation || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Estimated Volume</Typography>
              <Typography variant="body2">{crm.estimated_volume || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Launch Timeline</Typography>
              <Typography variant="body2">{crm.desired_launch_timeline || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Needs</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {crm.historical_import_needed ? <Chip label="Historical Import" size="small" variant="outlined" /> : null}
                {crm.ocr_assistance_needed ? <Chip label="OCR Assistance" size="small" variant="outlined" /> : null}
                {crm.public_records_needed ? <Chip label="Public Records" size="small" variant="outlined" /> : null}
                {crm.custom_structure_required ? <Chip label="Custom Structure" size="small" color="warning" variant="outlined" /> : null}
                {!crm.historical_import_needed && !crm.ocr_assistance_needed && !crm.public_records_needed && !crm.custom_structure_required && (
                  <Typography variant="body2" color="text.secondary">None specified</Typography>
                )}
              </Box>
            </Grid>
            {crm.discovery_notes && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Discovery Notes</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{crm.discovery_notes}</Typography>
              </Grid>
            )}
            {crm.blockers && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Blockers</Typography>
                <Alert severity="warning" sx={{ mt: 0.5 }}>{crm.blockers}</Alert>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Provisioning Checklist (from pipeline) */}
      {hasCrm && provisionChecklist && sectionPaper(
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Provisioning Checklist</Typography>
          <Grid container spacing={1}>
            {[
              { key: 'contact_complete', label: 'Contact info complete' },
              { key: 'record_requirements_set', label: 'Record requirements defined' },
              { key: 'templates_or_custom', label: 'Templates or custom structure confirmed' },
              { key: 'internal_review_done', label: 'Internal review done' },
              { key: 'provisioning_email_sent', label: 'Provisioning email sent' },
              { key: 'response_received', label: 'Response received' },
              { key: 'account_created', label: 'Account created' },
              { key: 'invite_sent', label: 'Invite sent' },
              { key: 'activated', label: 'Activated' },
            ].map(item => {
              const done = !!(provisionChecklist as Record<string, any>)[item.key];
              return (
                <Grid item xs={12} sm={6} md={4} key={item.key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ fontSize: 18, color: done ? '#4caf50' : alpha('#9e9e9e', 0.4) }} />
                    <Typography variant="body2" sx={{ color: done ? 'text.primary' : 'text.disabled' }}>
                      {item.label}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* Record Requirements (from pipeline) */}
      {pipelineRequirements.length > 0 && sectionPaper(
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Record Requirements</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {pipelineRequirements.map(r => (
              <Paper key={r.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{r.record_type}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {r.uses_sample ? <Chip label={r.template_name || 'Sample Template'} size="small" color="info" variant="outlined" /> : null}
                    {r.custom_required ? <Chip label="Custom Required" size="small" color="warning" variant="outlined" /> : null}
                  </Box>
                </Box>
                {r.custom_notes && <Typography variant="caption" color="text.secondary">{r.custom_notes}</Typography>}
              </Paper>
            ))}
          </Box>
        </>
      )}
    </>
  );

  /* --- Contacts Tab ------------------------------------------------- */
  const renderContacts = () => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>Contacts ({contacts.length})</Typography>
        <Button
          variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => {
            setEditingContact(null);
            setContactForm({ first_name: '', last_name: '', role: '', email: '', phone: '', is_primary: false, notes: '' });
            setContactDialogOpen(true);
          }}
          sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
        >
          Add Contact
        </Button>
      </Box>

      {contacts.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No contacts yet</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {contacts.map(c => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: c.is_primary ? COLOR : alpha(COLOR, 0.3), fontSize: '0.85rem' }}>
                  {(c.first_name?.[0] || '?').toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {c.first_name} {c.last_name || ''}
                    </Typography>
                    {c.is_primary === 1 && <StarIcon sx={{ fontSize: 16, color: '#ff9800' }} />}
                  </Box>
                  {c.role && <Typography variant="caption" color="text.secondary">{c.role}</Typography>}
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.25 }}>
                    {c.email && <Typography variant="caption" color="text.secondary">{c.email}</Typography>}
                    {c.phone && <Typography variant="caption" color="text.secondary">{c.phone}</Typography>}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => {
                      setEditingContact(c);
                      setContactForm({
                        first_name: c.first_name,
                        last_name: c.last_name || '',
                        role: c.role || '',
                        email: c.email || '',
                        phone: c.phone || '',
                        is_primary: c.is_primary === 1,
                        notes: c.notes || '',
                      });
                      setContactDialogOpen(true);
                    }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDeleteContact(c.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </>
  );

  /* --- Activity Tab ------------------------------------------------- */
  const renderActivity = () => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>Activity Log ({activities.length})</Typography>
        <Button
          variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => {
            setActivityForm({ activity_type: 'note', subject: '', body: '' });
            setActivityDialogOpen(true);
          }}
          sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
        >
          Log Activity
        </Button>
      </Box>

      {activities.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No activity yet</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {activities.map(a => {
            const aColor = ACTIVITY_COLORS[a.activity_type] || '#9e9e9e';
            return (
              <Box key={a.id} sx={{ display: 'flex', gap: 1.5, py: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(aColor, isDark ? 0.25 : 0.12), color: aColor }}>
                  {ACTIVITY_ICONS[a.activity_type] || <NoteIcon fontSize="small" />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="body2" fontWeight={600}>{a.subject}</Typography>
                    <Typography variant="caption" color="text.secondary">{timeAgo(a.created_at)}</Typography>
                  </Box>
                  {a.body && <Typography variant="caption" color="text.secondary">{a.body}</Typography>}
                  <Chip label={a.activity_type} size="small" sx={{ fontSize: '0.68rem', height: 20, mt: 0.5, bgcolor: alpha(aColor, 0.1), color: aColor }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </>
  );

  /* --- Follow-ups Tab ----------------------------------------------- */
  const renderFollowUps = () => {
    const pending = followUps.filter(f => f.status === 'pending');
    const completed = followUps.filter(f => f.status === 'completed');
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Follow-ups ({pending.length} pending)
          </Typography>
          <Button
            variant="contained" size="small" startIcon={<AddIcon />}
            onClick={() => {
              setFollowUpForm({ due_date: '', subject: '', description: '' });
              setFollowUpDialogOpen(true);
            }}
            sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
          >
            Schedule Follow-up
          </Button>
        </Box>

        {pending.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {pending.map(f => {
              const isOverdue = new Date(f.due_date) < new Date(new Date().toDateString());
              return (
                <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <IconButton size="small" onClick={() => handleCompleteFollowUp(f.id)} sx={{ color: '#4caf50' }}>
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{f.subject}</Typography>
                    {f.description && <Typography variant="caption" color="text.secondary">{f.description}</Typography>}
                  </Box>
                  <Chip
                    label={formatDate(f.due_date)}
                    size="small"
                    color={isOverdue ? 'error' : 'default'}
                    variant={isOverdue ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              );
            })}
          </Box>
        )}

        {completed.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, mb: 1, display: 'block' }}>
              Completed ({completed.length})
            </Typography>
            {completed.map(f => (
              <Box key={f.id} sx={{ py: 0.75, opacity: 0.6 }}>
                <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>{f.subject}</Typography>
                <Typography variant="caption" color="text.secondary">{formatDate(f.completed_at)}</Typography>
              </Box>
            ))}
          </>
        )}

        {followUps.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No follow-ups scheduled</Typography>
        )}
      </>
    );
  };

  /* --- Onboarding Tab ----------------------------------------------- */
  const renderOnboarding = () => (
    <>
      {/* Members */}
      <Paper
        elevation={0}
        sx={{ mb: 2.5, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 2 }}
      >
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={700}>Members</Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Chip label={`${totalMembers} total`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label={`${activeMembers} active`} size="small"
              sx={{ fontWeight: 600, bgcolor: alpha('#4caf50', isDark ? 0.2 : 0.1), color: '#4caf50', border: `1px solid ${alpha('#4caf50', 0.3)}` }}
            />
            {pendingMembers > 0 && (
              <Chip label={`${pendingMembers} pending`} size="small"
                sx={{ fontWeight: 600, bgcolor: alpha('#ff9800', isDark ? 0.2 : 0.1), color: '#ff9800', border: `1px solid ${alpha('#ff9800', 0.3)}` }}
              />
            )}
          </Box>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(COLOR, isDark ? 0.08 : 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No members found</Typography>
                  </TableCell>
                </TableRow>
              ) : members.map(m => {
                const isPending = m.is_locked && m.lockout_reason?.toLowerCase().includes('pending');
                return (
                  <TableRow key={m.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {m.full_name || `${m.first_name} ${m.last_name}`}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{m.email}</Typography></TableCell>
                    <TableCell><Chip label={m.role || 'viewer'} size="small" sx={{ fontSize: '0.72rem' }} /></TableCell>
                    <TableCell>
                      <Chip
                        label={m.is_locked ? 'Locked' : 'Active'}
                        size="small"
                        color={m.is_locked ? 'error' : 'success'}
                        variant={m.is_locked ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{formatDate(m.created_at)}</Typography></TableCell>
                    <TableCell align="right">
                      {isPending && (
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            variant="contained" size="small" color="success"
                            startIcon={actionLoading === m.id ? <CircularProgress size={14} color="inherit" /> : <ApproveIcon />}
                            disabled={actionLoading !== null}
                            onClick={() => handleApproveMember(m.id, m.email)}
                            sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined" size="small" color="error"
                            startIcon={<RejectIcon />}
                            disabled={actionLoading !== null}
                            onClick={() => setRejectDialog({ open: true, userId: m.id, email: m.email })}
                            sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Tokens */}
      <Paper
        elevation={0}
        sx={{ overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 2 }}
      >
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TokenIcon sx={{ color: COLOR, fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>Token History</Typography>
          </Box>
          {!hasActiveToken && (
            <Button
              variant="contained" size="small"
              startIcon={generatingToken ? <CircularProgress size={14} color="inherit" /> : <TokenIcon />}
              disabled={generatingToken}
              onClick={handleGenerateToken}
              sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
            >
              Generate Token
            </Button>
          )}
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(COLOR, isDark ? 0.08 : 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>Token</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No tokens found</Typography>
                  </TableCell>
                </TableRow>
              ) : tokens.map(t => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.token}
                      </Typography>
                      <Tooltip title="Copy token">
                        <IconButton size="small" onClick={() => copyToClipboard(t.token, 'Token copied')}>
                          <CopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={t.is_active ? 'Active' : 'Inactive'} size="small" color={t.is_active ? 'success' : 'default'} variant={t.is_active ? 'filled' : 'outlined'} />
                  </TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{formatDate(t.created_at)}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{t.created_by || '—'}</Typography></TableCell>
                  <TableCell align="right">
                    {t.is_active ? (
                      <Tooltip title="Deactivate token">
                        <IconButton size="small" color="error" disabled={deactivatingToken === t.id} onClick={() => handleDeactivateToken(t.id)}>
                          {deactivatingToken === t.id ? <CircularProgress size={18} /> : <DeactivateIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  );

  /* --- Timeline Tab -------------------------------------------------- */
  const buildTimeline = (): TimelineEntry[] => {
    const entries: TimelineEntry[] = [];

    // CRM activities
    for (const a of activities) {
      entries.push({
        id: `crm-${a.id}`,
        type: 'crm_activity',
        icon: ACTIVITY_ICONS[a.activity_type] || <NoteIcon fontSize="small" />,
        color: ACTIVITY_COLORS[a.activity_type] || '#9e9e9e',
        title: a.subject,
        detail: a.body || undefined,
        date: a.created_at,
      });
    }

    // Pipeline activities
    for (const a of pipelineActivities) {
      entries.push({
        id: `pipe-${a.id}`,
        type: 'pipeline',
        icon: <TaskIcon fontSize="small" />,
        color: '#00bcd4',
        title: a.summary,
        detail: a.activity_type,
        date: a.created_at,
      });
    }

    // Emails
    for (const e of pipelineEmails) {
      entries.push({
        id: `email-${e.id}`,
        type: 'email',
        icon: <EmailIcon fontSize="small" />,
        color: '#2196f3',
        title: `${e.email_type.replace(/_/g, ' ')}: ${e.subject}`,
        detail: `To: ${e.recipients} — ${e.status}`,
        date: e.sent_at || e.created_at,
      });
    }

    // Token events
    for (const t of tokens) {
      entries.push({
        id: `token-${t.id}`,
        type: 'token',
        icon: <TokenIcon fontSize="small" />,
        color: '#00bcd4',
        title: t.is_active ? 'Registration token generated' : 'Token deactivated',
        date: t.created_at,
      });
    }

    // Member joins
    for (const m of members) {
      entries.push({
        id: `member-${m.id}`,
        type: 'member',
        icon: <PersonIcon fontSize="small" />,
        color: '#4caf50',
        title: `${m.full_name || m.first_name} joined as ${m.role || 'viewer'}`,
        detail: m.email,
        date: m.created_at,
      });
    }

    // Sort descending by date
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries;
  };

  const renderTimeline = () => {
    const timeline = buildTimeline();

    if (timeline.length === 0) {
      return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No timeline events yet</Typography>;
    }

    let lastDateStr = '';

    return (
      <Box sx={{ position: 'relative', pl: 3.5 }}>
        {/* Vertical line */}
        <Box sx={{ position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

        {timeline.map(entry => {
          const d = new Date(entry.date);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const showDate = dateStr !== lastDateStr;
          lastDateStr = dateStr;

          return (
            <React.Fragment key={entry.id}>
              {showDate && (
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1, ml: 1.5 }}>
                  {dateStr}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5, position: 'relative' }}>
                {/* Dot */}
                <Avatar
                  sx={{
                    width: 28, height: 28,
                    bgcolor: alpha(entry.color, isDark ? 0.25 : 0.12),
                    color: entry.color,
                    position: 'absolute',
                    left: -28,
                  }}
                >
                  {entry.icon}
                </Avatar>
                {/* Content */}
                <Box sx={{ flex: 1, ml: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{entry.title}</Typography>
                  {entry.detail && (
                    <Typography variant="caption" color="text.secondary">{entry.detail}</Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                    {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Typography>
                </Box>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Main Render                                                        */
  /* ------------------------------------------------------------------ */

  return (
    <PageContainer title="Church Lifecycle Detail" description="Unified church detail view">
      <Breadcrumb title={churchName} items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* ---- Header ------------------------------------------------ */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate('/admin/control-panel/church-lifecycle')}
            sx={{ bgcolor: alpha(COLOR, 0.08), color: COLOR }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" fontWeight={700}>{churchName}</Typography>
              <Chip
                label={stageLabel}
                size="small"
                sx={{
                  bgcolor: alpha(stageColor, isDark ? 0.2 : 0.12),
                  color: stageColor,
                  fontWeight: 600,
                  border: `1px solid ${alpha(stageColor, 0.3)}`,
                }}
              />
              <Chip
                label={source === 'both' ? 'CRM + Onboarded' : source === 'crm' ? 'CRM Lead' : 'Onboarded'}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {crm ? `CRM ID: ${crm.id}` : ''}{crm && onboarded ? ' · ' : ''}{onboarded ? `Church ID: ${onboarded.id}` : ''}
              {' · Created '}{formatDate(crm?.created_at || onboarded?.created_at || null)}
            </Typography>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Change Stage">
              <Button
                variant="outlined" size="small"
                onClick={() => { setNewStage(unifiedStage); setStageDialogOpen(true); }}
                sx={{ textTransform: 'none' }}
              >
                Change Stage
              </Button>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchDetail} disabled={loading} sx={{ color: COLOR }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ---- Error / Loading --------------------------------------- */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: COLOR }} />
          </Box>
        ) : (
          <>
            {/* Tabs */}
            <Paper elevation={0} sx={{ mb: 2.5, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 2 }}>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: 1, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 } }}
              >
                {visibleTabs.map((t, i) => (
                  <Tab
                    key={t.label}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {t.label}
                        {t.badge !== undefined && t.badge > 0 && (
                          <Chip label={t.badge} size="small" sx={{ height: 20, minWidth: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                        )}
                      </Box>
                    }
                    value={i}
                  />
                ))}
              </Tabs>
            </Paper>

            {/* Tab content */}
            <Box>
              {visibleTabs[tab]?.label === 'Overview' && renderOverview()}
              {visibleTabs[tab]?.label === 'Contacts' && renderContacts()}
              {visibleTabs[tab]?.label === 'Activity' && renderActivity()}
              {visibleTabs[tab]?.label === 'Follow-ups' && renderFollowUps()}
              {visibleTabs[tab]?.label === 'Onboarding' && renderOnboarding()}
              {visibleTabs[tab]?.label === 'Timeline' && renderTimeline()}
            </Box>
          </>
        )}
      </Box>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  Dialogs                                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth size="small" label="First Name" value={contactForm.first_name} onChange={e => setContactForm(f => ({ ...f, first_name: e.target.value }))} required />
              <TextField fullWidth size="small" label="Last Name" value={contactForm.last_name} onChange={e => setContactForm(f => ({ ...f, last_name: e.target.value }))} />
            </Box>
            <TextField fullWidth size="small" label="Role" value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g., Pastor, Secretary" />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth size="small" label="Email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
              <TextField fullWidth size="small" label="Phone" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
            </Box>
            <TextField fullWidth size="small" label="Notes" multiline minRows={2} value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch checked={contactForm.is_primary} onChange={e => setContactForm(f => ({ ...f, is_primary: e.target.checked }))} />
              <Typography variant="body2">Primary Contact</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveContact} variant="contained" disabled={!contactForm.first_name} sx={{ bgcolor: COLOR }}>
            {editingContact ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={activityDialogOpen} onClose={() => setActivityDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Activity</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select fullWidth size="small" label="Type"
              value={activityForm.activity_type}
              onChange={e => setActivityForm(f => ({ ...f, activity_type: e.target.value }))}
            >
              {['note', 'call', 'email', 'meeting', 'task'].map(t => (
                <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth size="small" label="Subject" value={activityForm.subject} onChange={e => setActivityForm(f => ({ ...f, subject: e.target.value }))} required />
            <TextField fullWidth size="small" label="Details" multiline minRows={3} value={activityForm.body} onChange={e => setActivityForm(f => ({ ...f, body: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleLogActivity} variant="contained" disabled={!activityForm.subject} sx={{ bgcolor: COLOR }}>Log</Button>
        </DialogActions>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialogOpen} onClose={() => setFollowUpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Follow-up</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth size="small" label="Due Date" type="date"
              value={followUpForm.due_date}
              onChange={e => setFollowUpForm(f => ({ ...f, due_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField fullWidth size="small" label="Subject" value={followUpForm.subject} onChange={e => setFollowUpForm(f => ({ ...f, subject: e.target.value }))} required />
            <TextField fullWidth size="small" label="Description" multiline minRows={2} value={followUpForm.description} onChange={e => setFollowUpForm(f => ({ ...f, description: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowUpDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddFollowUp} variant="contained" disabled={!followUpForm.due_date || !followUpForm.subject} sx={{ bgcolor: COLOR }}>Schedule</Button>
        </DialogActions>
      </Dialog>

      {/* Stage Change Dialog */}
      <Dialog open={stageDialogOpen} onClose={() => setStageDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Pipeline Stage</DialogTitle>
        <DialogContent>
          <TextField
            select fullWidth size="small" label="New Stage"
            value={newStage}
            onChange={e => setNewStage(e.target.value)}
            sx={{ mt: 1 }}
          >
            {stages.map(s => (
              <MenuItem key={s.stage_key} value={s.stage_key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                  {s.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStageDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStageChange} variant="contained" disabled={!newStage || newStage === unifiedStage} sx={{ bgcolor: COLOR }}>
            Change
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Member Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, userId: null, email: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Registration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Rejecting <strong>{rejectDialog.email}</strong> will keep their account locked.
          </Typography>
          <TextField
            fullWidth label="Reason (optional)" value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="e.g., Not a recognized parishioner" size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, userId: null, email: '' })}>Cancel</Button>
          <Button onClick={handleRejectMember} color="error" variant="contained">Reject</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ChurchLifecycleDetailPage;
