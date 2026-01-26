import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface AdvancedGridDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
  title?: string;
  children?: React.ReactNode;
}

const AdvancedGridDialog = ({ 
  open, 
  onClose, 
  onSave, 
  title = 'Advanced Grid Dialog',
  children 
}: AdvancedGridDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {children || <div>Advanced Grid Dialog Content</div>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {onSave && <Button onClick={onSave} variant="contained">Save</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedGridDialog;
