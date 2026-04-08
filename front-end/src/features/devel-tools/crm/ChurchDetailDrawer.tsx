/**
 * ChurchDetailDrawer — Right-side drawer showing church overview, contacts, and activity.
 * Extracted from CRMPage.tsx
 */

import React from 'react';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Event as EventIcon,
  Language as WebIcon,
  Phone as PhoneIcon,
  Place as PlaceIcon,
  Refresh as RefreshIcon,
  Rocket as ProvisionIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  PRIORITY_COLORS,
  formatDate,
  formatDateTime,
  relativeTime,
  type CRMActivity,
  type CRMChurch,
  type CRMContact,
  type CRMFollowUp,
} from './types';

// Note icon imported separately since it's used as fallback
import { Note as NoteIcon } from '@mui/icons-material';

interface ChurchDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  church: CRMChurch | null;
  detailLoading: boolean;
  drawerTab: number;
  onDrawerTabChange: (tab: number) => void;
  churchContacts: CRMContact[];
  churchActivities: CRMActivity[];
  churchFollowUps: CRMFollowUp[];
  onRefresh: (id: number) => void;
  onStageChange: () => void;
  onLogActivity: () => void;
  onAddFollowUp: () => void;
  onProvision: () => void;
  onPriorityChange: (priority: string) => void;
  onNotesChange: (notes: string) => void;
  onCompleteFollowUp: (id: number) => void;
  onAddContact: () => void;
  onEditContact: (contact: CRMContact) => void;
  onDeleteContact: (id: number) => void;
  renderStageChip: (stage: string, color: string, label: string) => React.ReactNode;
  renderPriorityChip: (priority: string) => React.ReactNode;
}

const ChurchDetailDrawer: React.FC<ChurchDetailDrawerProps> = ({
  open,
  onClose,
  church,
  detailLoading,
  drawerTab,
  onDrawerTabChange,
  churchContacts,
  churchActivities,
  churchFollowUps,
  onRefresh,
  onStageChange,
  onLogActivity,
  onAddFollowUp,
  onProvision,
  onPriorityChange,
  onNotesChange,
  onCompleteFollowUp,
  onAddContact,
  onEditContact,
  onDeleteContact,
  renderStageChip,
  renderPriorityChip,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!church) return null;
  const c = church;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
      {detailLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${isDark ? '#333' : '#eee'}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <IconButton size="small" onClick={onClose}><ArrowBackIcon fontSize="small" /></IconButton>
              <Typography variant="h6" sx={{ flex: 1, fontSize: '1.05rem' }}>{c.name}</Typography>
              <IconButton size="small" onClick={() => { onRefresh(c.id); }}><RefreshIcon fontSize="small" /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {renderStageChip(c.pipeline_stage, c.stage_color, c.stage_label)}
              {renderPriorityChip(c.priority || 'medium')}
              <Chip size="small" label={c.jurisdiction} variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />
              {c.provisioned_church_id && <Chip size="small" label={`Client #${c.provisioned_church_id}`} color="success" sx={{ fontSize: '0.68rem', height: 22 }} />}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" startIcon={<TimelineIcon />} onClick={onStageChange}>Change Stage</Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={onLogActivity}>Log Activity</Button>
              <Button size="small" variant="outlined" startIcon={<EventIcon />} onClick={onAddFollowUp}>Follow-up</Button>
              {!c.provisioned_church_id && (
                <Button size="small" variant="contained" color="success" startIcon={<ProvisionIcon />} onClick={onProvision}>Provision</Button>
              )}
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs value={drawerTab} onChange={(_, v) => onDrawerTabChange(v)} sx={{ borderBottom: `1px solid ${isDark ? '#333' : '#eee'}` }}>
            <Tab label="Overview" sx={{ fontSize: '0.78rem', minHeight: 40 }} />
            <Tab label={`Contacts (${churchContacts.length})`} sx={{ fontSize: '0.78rem', minHeight: 40 }} />
            <Tab label={`Activity (${churchActivities.length})`} sx={{ fontSize: '0.78rem', minHeight: 40 }} />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {/* OVERVIEW */}
            {drawerTab === 0 && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Location</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PlaceIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{[c.street, c.city, c.state_code, c.zip].filter(Boolean).join(', ')}</Typography>
                  </Box>
                </Box>
                {c.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{c.phone}</Typography>
                  </Box>
                )}
                {c.website && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <WebIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Link href={c.website} target="_blank" rel="noopener" variant="body2">{c.website}</Link>
                  </Box>
                )}
                <Divider />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Priority</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {['low', 'medium', 'high', 'urgent'].map(p => (
                      <Chip key={p} size="small" label={p} sx={{ textTransform: 'capitalize', cursor: 'pointer', bgcolor: c.priority === p ? alpha(PRIORITY_COLORS[p], 0.2) : undefined, color: c.priority === p ? PRIORITY_COLORS[p] : undefined }}
                        onClick={() => onPriorityChange(p)} />
                    ))}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Notes</Typography>
                  <TextField
                    multiline rows={3} fullWidth size="small"
                    defaultValue={c.crm_notes || ''}
                    onBlur={(e) => onNotesChange(e.target.value)}
                    placeholder="Add CRM notes..."
                  />
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Follow-ups</Typography>
                  {churchFollowUps.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No follow-ups</Typography>
                  ) : churchFollowUps.map(f => (
                    <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                      {f.status === 'pending' ? (
                        <IconButton size="small" color="success" onClick={() => onCompleteFollowUp(f.id)}><CheckIcon sx={{ fontSize: 16 }} /></IconButton>
                      ) : <CheckIcon sx={{ fontSize: 16, color: 'success.main', ml: 1 }} />}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ textDecoration: f.status === 'completed' ? 'line-through' : 'none', fontSize: '0.82rem' }}>{f.subject}</Typography>
                      </Box>
                      <Typography variant="caption" color={f.status === 'pending' && new Date(f.due_date) < new Date(new Date().toDateString()) ? 'error' : 'text.secondary'}>
                        {formatDate(f.due_date)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {c.last_contacted_at && (
                  <Typography variant="caption" color="text.secondary">Last contacted: {formatDateTime(c.last_contacted_at)}</Typography>
                )}
              </Stack>
            )}

            {/* CONTACTS */}
            {drawerTab === 1 && (
              <Stack spacing={1}>
                <Button size="small" startIcon={<AddIcon />} onClick={onAddContact}>
                  Add Contact
                </Button>
                {churchContacts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No contacts yet</Typography>
                ) : churchContacts.map(contact => (
                  <Paper key={contact.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: contact.is_primary ? 'primary.main' : 'grey.500', fontSize: '0.8rem' }}>
                        {contact.first_name[0]}{contact.last_name?.[0] || ''}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {contact.first_name} {contact.last_name || ''}
                          {contact.is_primary ? <StarIcon sx={{ fontSize: 14, color: 'warning.main', ml: 0.5, verticalAlign: 'text-top' }} /> : null}
                        </Typography>
                        {contact.role && <Typography variant="caption" color="text.secondary">{contact.role}</Typography>}
                      </Box>
                      <IconButton size="small" onClick={() => onEditContact(contact)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" color="error" onClick={() => onDeleteContact(contact.id)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                    <Box sx={{ ml: 5.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.3 }}>
                      {contact.email && <Typography variant="caption" color="text.secondary">{contact.email}</Typography>}
                      {contact.phone && <Typography variant="caption" color="text.secondary">{contact.phone}</Typography>}
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}

            {/* ACTIVITY LOG */}
            {drawerTab === 2 && (
              <Stack spacing={0}>
                {churchActivities.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No activities logged</Typography>
                ) : churchActivities.map(a => (
                  <Box key={a.id} sx={{ display: 'flex', gap: 1, py: 1, borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}` }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(ACTIVITY_COLORS[a.activity_type] || '#999', 0.2), color: ACTIVITY_COLORS[a.activity_type] || '#999' }}>
                      {ACTIVITY_ICONS[a.activity_type] || <NoteIcon fontSize="small" />}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>{a.subject}</Typography>
                      {a.body && <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mt: 0.3 }}>{a.body}</Typography>}
                      <Typography variant="caption" color="text.secondary">{relativeTime(a.created_at)}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      )}
    </Drawer>
  );
};

export default ChurchDetailDrawer;
