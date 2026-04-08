/**
 * ChurchLifecycleDetailPage.tsx — Unified Church Detail View
 *
 * Combines CRM contact management (contacts, activities, follow-ups)
 * with onboarding detail (tokens, members, setup checklist) into
 * a single detail page for any church in the lifecycle pipeline.
 *
 * PP-0003 Step 4 | CS-0050
 */

import { apiClient } from '@/api/utils/axiosInstance';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  ArrowBack as BackIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLOR, EMAIL_TYPES, RECORD_TYPES } from './ChurchLifecycleDetailPage/constants';
import type {
  CRMChurch,
  CRMContact,
  CRMActivity,
  CRMFollowUp,
  ChurchMember,
  ChurchToken,
  OnboardedChurch,
  OnboardingChecklist,
  OnboardingEmail,
  PipelineActivity,
  PipelineStage,
  ProvisioningChecklist,
  RecordRequirement,
  SampleTemplate,
  SnackState,
} from './ChurchLifecycleDetailPage/types';
import OverviewPanel from './ChurchLifecycleDetailPage/OverviewPanel';
import ContactsPanel from './ChurchLifecycleDetailPage/ContactsPanel';
import ActivityPanel from './ChurchLifecycleDetailPage/ActivityPanel';
import FollowUpsPanel from './ChurchLifecycleDetailPage/FollowUpsPanel';
import RequirementsPanel from './ChurchLifecycleDetailPage/RequirementsPanel';
import EmailWorkflowPanel from './ChurchLifecycleDetailPage/EmailWorkflowPanel';
import OnboardingPanel from './ChurchLifecycleDetailPage/OnboardingPanel';
import TimelinePanel from './ChurchLifecycleDetailPage/TimelinePanel';



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

  // Templates (for record requirements + email workflow)
  const [sampleTemplates, setSampleTemplates] = useState<SampleTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<{ type: string; subject: string; body: string }[]>([]);

  // Record requirement dialog
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqForm, setReqForm] = useState({
    record_type: 'baptism' as string,
    uses_sample: false,
    sample_template_id: null as number | null,
    custom_required: false,
    custom_notes: '',
    review_required: false,
  });

  // Email composer dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ email_type: 'welcome', subject: '', recipients: '', cc: '', body: '', notes: '' });

  // Pipeline saving state
  const [pipelineSaving, setPipelineSaving] = useState(false);

  // Inline editing for discovery notes / blockers
  const [editingDiscovery, setEditingDiscovery] = useState(false);
  const [discoveryDraft, setDiscoveryDraft] = useState('');
  const [editingBlockers, setEditingBlockers] = useState(false);
  const [blockersDraft, setBlockersDraft] = useState('');

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
      const data = await apiClient.get<any>(`/api/admin/church-lifecycle/${churchId}`);

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
          const [pipeData, tmplData, eTmplData] = await Promise.all([
            apiClient.get<any>(`/api/admin/onboarding-pipeline/${data.crm.id}/detail`),
            apiClient.get<any>('/api/admin/onboarding-pipeline/templates'),
            apiClient.get<any>('/api/admin/onboarding-pipeline/email-templates'),
          ]);
          if (pipeData?.success) {
            setPipelineRequirements(pipeData.requirements || []);
            setPipelineEmails(pipeData.emails || []);
            setPipelineActivities(pipeData.activities || []);
            setProvisionChecklist(pipeData.checklist || null);
          }
          setSampleTemplates(tmplData?.templates || []);
          setEmailTemplates(eTmplData?.templates || []);
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
      const data = await apiClient.get<any>('/api/admin/church-lifecycle/stages');
      setStages(data.stages || []);
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
        await apiClient.put(`/api/crm/churches/${crmId}`, { crm_notes: notes });
      } else if (onboardedId) {
        await apiClient.post(`/api/admin/church-onboarding/${onboardedId}/update-notes`, { notes });
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
      const payload = { ...contactForm, is_primary: contactForm.is_primary ? 1 : 0 };
      if (editingContact) {
        await apiClient.put(`/api/crm/contacts/${editingContact.id}`, payload);
      } else {
        await apiClient.post(`/api/crm/churches/${crmId}/contacts`, payload);
      }
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
      await apiClient.delete(`/api/crm/contacts/${contactId}`);
      showToast('Contact deleted');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleLogActivity = async () => {
    if (!crmId || !activityForm.subject) return;
    try {
      await apiClient.post(`/api/crm/churches/${crmId}/activities`, activityForm);
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
      await apiClient.post(`/api/crm/churches/${crmId}/follow-ups`, followUpForm);
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
      await apiClient.put(`/api/crm/follow-ups/${id}`, { status: 'completed' });
      showToast('Follow-up completed');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleStageChange = async () => {
    if (!churchId || !newStage) return;
    try {
      await apiClient.put(`/api/admin/church-lifecycle/${churchId}/stage`, { stage: newStage });
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
      await apiClient.post(`/api/admin/church-onboarding/${onboardedId}/toggle-setup`);
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
      await apiClient.post(`/api/admin/church-onboarding/${onboardedId}/send-token`);
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
      await apiClient.delete(`/api/admin/churches/${onboardedId}/registration-token`);
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
      await apiClient.post(`/api/admin/users/${userId}/unlock`);
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
      await apiClient.post(`/api/admin/users/${rejectDialog.userId}/lockout`, {
        reason: `Registration rejected: ${rejectReason || 'Not approved by admin'}`,
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
  /*  Pipeline CRUD actions                                              */
  /* ------------------------------------------------------------------ */

  const handleSaveRequirement = async () => {
    if (!crmId) return;
    setPipelineSaving(true);
    try {
      await apiClient.post(`/api/admin/onboarding-pipeline/${crmId}/requirements`, reqForm);
      showToast('Requirement added');
      setReqDialogOpen(false);
      setReqForm({ record_type: 'baptism', uses_sample: false, sample_template_id: null, custom_required: false, custom_notes: '', review_required: false });
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPipelineSaving(false);
    }
  };

  const handleDeleteRequirement = async (reqId: number) => {
    if (!crmId) return;
    try {
      await apiClient.delete(`/api/admin/onboarding-pipeline/${crmId}/requirements/${reqId}`);
      showToast('Requirement removed');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openEmailComposer = (type?: string) => {
    const primaryContact = contacts.find(c => c.is_primary === 1) || contacts[0];
    const template = emailTemplates.find(t => t.type === (type || 'welcome'));
    const name = churchName;
    const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name || ''}`.trim() : 'Parish Administrator';

    const subject = (template?.subject || '').replace(/{church_name}/g, name).replace(/{contact_name}/g, contactName);
    const body = (template?.body || '').replace(/{church_name}/g, name).replace(/{contact_name}/g, contactName).replace(/{custom_message}/g, '');

    setEmailForm({ email_type: type || 'welcome', subject, recipients: primaryContact?.email || '', cc: '', body, notes: '' });
    setEmailDialogOpen(true);
  };

  const handleSaveEmail = async (status: string = 'draft') => {
    if (!crmId) return;
    setPipelineSaving(true);
    try {
      await apiClient.post(`/api/admin/onboarding-pipeline/${crmId}/emails`, { ...emailForm, status });
      showToast(status === 'sent' ? 'Email marked as sent' : 'Draft saved');
      setEmailDialogOpen(false);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPipelineSaving(false);
    }
  };

  const handleUpdateEmailStatus = async (emailId: number, status: string) => {
    if (!crmId) return;
    try {
      const updates: Record<string, any> = { status };
      if (status === 'sent') updates.sent_at = new Date().toISOString();
      if (status === 'replied') updates.replied_at = new Date().toISOString();
      await apiClient.put(`/api/admin/onboarding-pipeline/${crmId}/emails/${emailId}`, updates);
      showToast(`Email marked as ${status.replace('_', ' ')}`);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveInlineField = async (field: string, value: string) => {
    if (!crmId) return;
    setPipelineSaving(true);
    try {
      await apiClient.put(`/api/admin/onboarding-pipeline/${crmId}`, { [field]: value });
      showToast('Updated successfully');
      if (field === 'discovery_notes') setEditingDiscovery(false);
      if (field === 'blockers') setEditingBlockers(false);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPipelineSaving(false);
    }
  };

  const handleMarkProvisioning = async (field: string, value: any) => {
    if (!crmId) return;
    setPipelineSaving(true);
    try {
      const body: Record<string, any> = { [field]: value };
      if (field === 'provisioning_completed') {
        body.activation_date = new Date().toISOString().split('T')[0];
      }
      await apiClient.put(`/api/admin/onboarding-pipeline/${crmId}`, body);
      showToast(field === 'provisioning_ready' ? 'Marked ready for provisioning' : 'Marked as active');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPipelineSaving(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Tab definitions                                                    */
  /* ------------------------------------------------------------------ */

  const tabDefs: { label: string; badge?: number; show: boolean }[] = [
    { label: 'Overview', show: true },
    { label: 'Contacts', badge: contacts.length, show: hasCrm },
    { label: 'Activity', badge: activities.length, show: hasCrm },
    { label: 'Follow-ups', badge: followUps.filter(f => f.status === 'pending').length, show: hasCrm },
    { label: 'Requirements', badge: pipelineRequirements.length, show: hasCrm },
    { label: 'Email Workflow', badge: pipelineEmails.length, show: hasCrm },
    { label: 'Onboarding', show: hasOnboarding },
    { label: 'Timeline', badge: activities.length + pipelineActivities.length + pipelineEmails.length, show: true },
  ];
  const visibleTabs = tabDefs.filter(t => t.show);

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
              {visibleTabs[tab]?.label === 'Overview' && (
                <OverviewPanel
                  hasOnboarding={hasOnboarding} hasCrm={hasCrm} checklist={checklist}
                  getActiveStep={getActiveStep} sectionPaper={sectionPaper} churchName={churchName}
                  crm={crm} onboarded={onboarded} formatDate={formatDate} notes={notes}
                  setNotes={setNotes} notesOriginal={notesOriginal} notesSaving={notesSaving}
                  handleSaveNotes={handleSaveNotes} followUps={followUps}
                  handleCompleteFollowUp={handleCompleteFollowUp} editingDiscovery={editingDiscovery}
                  discoveryDraft={discoveryDraft} setDiscoveryDraft={setDiscoveryDraft}
                  setEditingDiscovery={setEditingDiscovery} pipelineSaving={pipelineSaving}
                  handleSaveInlineField={handleSaveInlineField} editingBlockers={editingBlockers}
                  blockersDraft={blockersDraft} setBlockersDraft={setBlockersDraft}
                  setEditingBlockers={setEditingBlockers} provisionChecklist={provisionChecklist}
                  handleMarkProvisioning={handleMarkProvisioning} pipelineRequirements={pipelineRequirements}
                  togglingSetup={togglingSetup} handleToggleSetup={handleToggleSetup} isDark={isDark}
                />
              )}
              {visibleTabs[tab]?.label === 'Contacts' && (
                <ContactsPanel
                  contacts={contacts} setEditingContact={setEditingContact}
                  setContactForm={setContactForm} setContactDialogOpen={setContactDialogOpen}
                  handleDeleteContact={handleDeleteContact} isDark={isDark}
                />
              )}
              {visibleTabs[tab]?.label === 'Activity' && (
                <ActivityPanel
                  activities={activities} setActivityForm={setActivityForm}
                  setActivityDialogOpen={setActivityDialogOpen} isDark={isDark} timeAgo={timeAgo}
                />
              )}
              {visibleTabs[tab]?.label === 'Follow-ups' && (
                <FollowUpsPanel
                  followUps={followUps} handleCompleteFollowUp={handleCompleteFollowUp}
                  setFollowUpForm={setFollowUpForm} setFollowUpDialogOpen={setFollowUpDialogOpen}
                  formatDate={formatDate}
                />
              )}
              {visibleTabs[tab]?.label === 'Requirements' && (
                <RequirementsPanel
                  pipelineRequirements={pipelineRequirements} setReqForm={setReqForm}
                  setReqDialogOpen={setReqDialogOpen} handleDeleteRequirement={handleDeleteRequirement}
                  sampleTemplates={sampleTemplates}
                />
              )}
              {visibleTabs[tab]?.label === 'Email Workflow' && (
                <EmailWorkflowPanel
                  pipelineEmails={pipelineEmails} openEmailComposer={openEmailComposer}
                  handleUpdateEmailStatus={handleUpdateEmailStatus} formatDateTime={formatDateTime}
                  isDark={isDark}
                />
              )}
              {visibleTabs[tab]?.label === 'Onboarding' && (
                <OnboardingPanel
                  members={members} tokens={tokens} isDark={isDark} totalMembers={totalMembers}
                  activeMembers={activeMembers} pendingMembers={pendingMembers} formatDate={formatDate}
                  actionLoading={actionLoading} handleApproveMember={handleApproveMember}
                  setRejectDialog={setRejectDialog} hasActiveToken={hasActiveToken}
                  generatingToken={generatingToken} handleGenerateToken={handleGenerateToken}
                  deactivatingToken={deactivatingToken} handleDeactivateToken={handleDeactivateToken}
                  copyToClipboard={copyToClipboard}
                />
              )}
              {visibleTabs[tab]?.label === 'Timeline' && (
                <TimelinePanel
                  activities={activities} pipelineActivities={pipelineActivities}
                  pipelineEmails={pipelineEmails} tokens={tokens} members={members} isDark={isDark}
                />
              )}
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

      {/* Record Requirement Dialog */}
      <Dialog open={reqDialogOpen} onClose={() => setReqDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Record Requirement</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Record Type</InputLabel>
              <Select value={reqForm.record_type} label="Record Type" onChange={(e) => setReqForm(f => ({ ...f, record_type: e.target.value }))}>
                {RECORD_TYPES.map(rt => (
                  <MenuItem key={rt} value={rt} sx={{ textTransform: 'capitalize' }}>{rt}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={reqForm.uses_sample} onChange={(e) => setReqForm(f => ({ ...f, uses_sample: e.target.checked, custom_required: e.target.checked ? false : f.custom_required }))} />}
              label="Use Sample Template"
            />
            {reqForm.uses_sample && (
              <FormControl fullWidth size="small">
                <InputLabel>Template</InputLabel>
                <Select
                  value={reqForm.sample_template_id || ''}
                  label="Template"
                  onChange={(e) => setReqForm(f => ({ ...f, sample_template_id: e.target.value ? Number(e.target.value) : null }))}
                >
                  {sampleTemplates.filter(t => t.record_type === reqForm.record_type).map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControlLabel
              control={<Switch checked={reqForm.custom_required} onChange={(e) => setReqForm(f => ({ ...f, custom_required: e.target.checked, uses_sample: e.target.checked ? false : f.uses_sample }))} />}
              label="Custom Structure Required"
            />
            {reqForm.custom_required && (
              <TextField
                label="Custom Notes" fullWidth multiline rows={3}
                value={reqForm.custom_notes}
                onChange={(e) => setReqForm(f => ({ ...f, custom_notes: e.target.value }))}
                placeholder="Describe custom field requirements..."
              />
            )}
            <FormControlLabel
              control={<Switch checked={reqForm.review_required} onChange={(e) => setReqForm(f => ({ ...f, review_required: e.target.checked }))} />}
              label="Review Required Before Provisioning"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReqDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRequirement} disabled={pipelineSaving} sx={{ bgcolor: COLOR }}>
            Save Requirement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Composer Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Compose Email</Typography>
            <IconButton size="small" onClick={() => setEmailDialogOpen(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Email Type</InputLabel>
              <Select
                value={emailForm.email_type}
                label="Email Type"
                onChange={(e) => {
                  const type = e.target.value;
                  const template = emailTemplates.find(t => t.type === type);
                  const name = churchName;
                  const primaryContact = contacts.find(c => c.is_primary === 1) || contacts[0];
                  const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name || ''}`.trim() : 'Parish Administrator';
                  setEmailForm(prev => ({
                    ...prev,
                    email_type: type,
                    subject: (template?.subject || '').replace(/{church_name}/g, name).replace(/{contact_name}/g, contactName),
                    body: (template?.body || '').replace(/{church_name}/g, name).replace(/{contact_name}/g, contactName).replace(/{custom_message}/g, ''),
                  }));
                }}
              >
                {EMAIL_TYPES.map(et => (
                  <MenuItem key={et.key} value={et.key}>{et.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="To" fullWidth value={emailForm.recipients} onChange={(e) => setEmailForm(f => ({ ...f, recipients: e.target.value }))} />
            <TextField size="small" label="CC" fullWidth value={emailForm.cc} onChange={(e) => setEmailForm(f => ({ ...f, cc: e.target.value }))} />
            <TextField size="small" label="Subject" fullWidth value={emailForm.subject} onChange={(e) => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
            <TextField label="Body" fullWidth multiline rows={12} value={emailForm.body} onChange={(e) => setEmailForm(f => ({ ...f, body: e.target.value }))} />
            <TextField size="small" label="Internal Notes" fullWidth multiline rows={2} value={emailForm.notes} onChange={(e) => setEmailForm(f => ({ ...f, notes: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button variant="outlined" onClick={() => handleSaveEmail('draft')} disabled={pipelineSaving}>Save Draft</Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => handleSaveEmail('sent')} disabled={pipelineSaving}
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
          >
            Log as Sent
          </Button>
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
