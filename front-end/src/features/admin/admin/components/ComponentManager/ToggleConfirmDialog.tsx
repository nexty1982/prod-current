import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { IconCircleCheck, IconCircleX, IconShield } from '@tabler/icons-react';
import type { Component } from '@/api/components.api';

interface ToggleConfirmDialogProps {
  open: boolean;
  component: Component | null;
  newState: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ToggleConfirmDialog: React.FC<ToggleConfirmDialogProps> = ({
  open,
  component,
  newState,
  onClose,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>
      <Box display="flex" alignItems="center" gap={1}>
        <IconShield size={20} />
        Confirm Component Toggle
      </Box>
    </DialogTitle>
    <DialogContent>
      <DialogContentText>
        Are you sure you want to <strong>{newState ? 'enable' : 'disable'}</strong> the{' '}
        <strong>"{component?.name}"</strong> component?
      </DialogContentText>
      <Alert severity={newState ? 'info' : 'warning'} sx={{ mt: 2 }}>
        {newState
          ? 'Enabling this component will make it available across the system.'
          : 'Disabling this component may affect system functionality and user experience.'
        }
      </Alert>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        variant="contained"
        color={newState ? 'primary' : 'error'}
        startIcon={newState ? <IconCircleCheck size={16} /> : <IconCircleX size={16} />}
      >
        {newState ? 'Enable Component' : 'Disable Component'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ToggleConfirmDialog;
