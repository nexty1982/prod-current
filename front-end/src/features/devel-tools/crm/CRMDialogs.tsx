/**
 * CRMDialogs — Activity, Contact, Follow-up, Stage Change, and Provision dialogs.
 * Extracted from CRMPage.tsx
 */

import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Rocket as ProvisionIcon } from '@mui/icons-material';
import type { CRMChurch, CRMContact, PipelineStage } from './types';

interface CRMDialogsProps {
  // Activity dialog
  activityDialogOpen: boolean;
  onActivityDialogClose: () => void;
  activityForm: { activity_type: string; subject: string; body: string };
  onActivityFormChange: (form: { activity_type: string; subject: string; body: string }) => void;
  onAddActivity: () => void;
  // Contact dialog
  contactDialogOpen: boolean;
  onContactDialogClose: () => void;
  contactForm: { first_name: string; last_name: string; role: string; email: string; phone: string; is_primary: boolean; notes: string };
  onContactFormChange: (form: { first_name: string; last_name: string; role: string; email: string; phone: string; is_primary: boolean; notes: string }) => void;
  editingContact: CRMContact | null;
  onSaveContact: () => void;
  // Follow-up dialog
  followUpDialogOpen: boolean;
  onFollowUpDialogClose: () => void;
  followUpForm: { due_date: string; subject: string; description: string };
  onFollowUpFormChange: (form: { due_date: string; subject: string; description: string }) => void;
  onAddFollowUp: () => void;
  // Stage change dialog
  stageDialogOpen: boolean;
  onStageDialogClose: () => void;
  newStage: string;
  onNewStageChange: (stage: string) => void;
  stages: PipelineStage[];
  onStageChange: () => void;
  // Provision dialog
  provisionDialogOpen: boolean;
  onProvisionDialogClose: () => void;
  selectedChurch: CRMChurch | null;
  churchContacts: CRMContact[];
  onProvision: () => void;
}

const CRMDialogs: React.FC<CRMDialogsProps> = ({
  activityDialogOpen,
  onActivityDialogClose,
  activityForm,
  onActivityFormChange,
  onAddActivity,
  contactDialogOpen,
  onContactDialogClose,
  contactForm,
  onContactFormChange,
  editingContact,
  onSaveContact,
  followUpDialogOpen,
  onFollowUpDialogClose,
  followUpForm,
  onFollowUpFormChange,
  onAddFollowUp,
  stageDialogOpen,
  onStageDialogClose,
  newStage,
  onNewStageChange,
  stages,
  onStageChange,
  provisionDialogOpen,
  onProvisionDialogClose,
  selectedChurch,
  churchContacts,
  onProvision,
}) => {
  return (
    <>
      {/* Activity Dialog */}
      <Dialog open={activityDialogOpen} onClose={onActivityDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Log Activity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value={activityForm.activity_type} label="Type" onChange={(e) => onActivityFormChange({ ...activityForm, activity_type: e.target.value })}>
                <MenuItem value="note">Note</MenuItem>
                <MenuItem value="call">Call</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="meeting">Meeting</MenuItem>
                <MenuItem value="task">Task</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Subject" size="small" fullWidth value={activityForm.subject} onChange={(e) => onActivityFormChange({ ...activityForm, subject: e.target.value })} required />
            <TextField label="Details" size="small" fullWidth multiline rows={3} value={activityForm.body} onChange={(e) => onActivityFormChange({ ...activityForm, body: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onActivityDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={onAddActivity} disabled={!activityForm.subject}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onClose={onContactDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1}>
              <TextField label="First Name" size="small" fullWidth value={contactForm.first_name} onChange={(e) => onContactFormChange({ ...contactForm, first_name: e.target.value })} required />
              <TextField label="Last Name" size="small" fullWidth value={contactForm.last_name} onChange={(e) => onContactFormChange({ ...contactForm, last_name: e.target.value })} />
            </Stack>
            <TextField label="Role" size="small" fullWidth value={contactForm.role} onChange={(e) => onContactFormChange({ ...contactForm, role: e.target.value })} placeholder="e.g. Pastor, Secretary" />
            <TextField label="Email" size="small" fullWidth value={contactForm.email} onChange={(e) => onContactFormChange({ ...contactForm, email: e.target.value })} />
            <TextField label="Phone" size="small" fullWidth value={contactForm.phone} onChange={(e) => onContactFormChange({ ...contactForm, phone: e.target.value })} />
            <TextField label="Notes" size="small" fullWidth multiline rows={2} value={contactForm.notes} onChange={(e) => onContactFormChange({ ...contactForm, notes: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onContactDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={onSaveContact} disabled={!contactForm.first_name}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialogOpen} onClose={onFollowUpDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create Follow-up</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Due Date" type="date" size="small" fullWidth value={followUpForm.due_date} onChange={(e) => onFollowUpFormChange({ ...followUpForm, due_date: e.target.value })} InputLabelProps={{ shrink: true }} required />
            <TextField label="Subject" size="small" fullWidth value={followUpForm.subject} onChange={(e) => onFollowUpFormChange({ ...followUpForm, subject: e.target.value })} required />
            <TextField label="Description" size="small" fullWidth multiline rows={2} value={followUpForm.description} onChange={(e) => onFollowUpFormChange({ ...followUpForm, description: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onFollowUpDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={onAddFollowUp} disabled={!followUpForm.due_date || !followUpForm.subject}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Stage Change Dialog */}
      <Dialog open={stageDialogOpen} onClose={onStageDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>Change Pipeline Stage</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Stage</InputLabel>
            <Select value={newStage} label="Stage" onChange={(e) => onNewStageChange(e.target.value)}>
              {stages.map(s => (
                <MenuItem key={s.stage_key} value={s.stage_key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                    {s.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onStageDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={onStageChange}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Provision Confirmation Dialog */}
      <Dialog open={provisionDialogOpen} onClose={onProvisionDialogClose}>
        <DialogTitle>Provision Church</DialogTitle>
        <DialogContent>
          <Typography>
            This will create <strong>{selectedChurch?.name}</strong> as an OrthodoxMetrics client church,
            adding it to the churches table and marking it as a client in the CRM.
          </Typography>
          {churchContacts.filter(c => c.is_primary).length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>No primary contact set. Consider adding one first.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onProvisionDialogClose}>Cancel</Button>
          <Button variant="contained" color="success" onClick={onProvision} startIcon={<ProvisionIcon />}>Provision</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CRMDialogs;
