import React from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Paper, { PaperProps } from '@mui/material/Paper';

// third party
import Draggable from 'react-draggable';

// draggable
function PaperComponent(props: PaperProps) {
  return (
    <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

// ===============================|| UI DIALOG - DRAGGABLE ||=============================== //

export default function DraggableDialog() {
  const [open, setOpen] = React.useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button variant="outlined" onClick={handleClickOpen}>
        Open Draggable Dialog
      </Button>
      <Dialog open={open} onClose={handleClose} PaperComponent={PaperComponent} aria-labelledby="draggable-dialog-title">
        {open && (
          <>
            <DialogTitle sx={{ cursor: 'move' }} id="draggable-dialog-title">
              Subscribe
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                <Typography variant="body2" component="span">
                  To subscribe to this website, please enter your email address here. We will send updates occasionally.
                </Typography>
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button sx={{ color: 'error.dark' }} autoFocus onClick={handleClose} color="secondary">
                Cancel
              </Button>
              <Button variant="contained" size="small" onClick={handleClose}>
                Subscribe
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
}
