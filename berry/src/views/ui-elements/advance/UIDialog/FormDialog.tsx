import React from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

// ===============================|| UI DIALOG - FORMS ||=============================== //

export default function FormDialog() {
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
        Open form dialog
      </Button>
      <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
        {open && (
          <>
            <DialogTitle id="form-dialog-title">Subscribe</DialogTitle>
            <DialogContent>
              <Stack spacing={3}>
                <DialogContentText>
                  <Typography variant="body2" component="span">
                    Let Google help apps determine location. This means sending anonymous location data to Google, even when no apps are
                    running.
                  </Typography>
                </DialogContentText>
                <TextField autoFocus size="small" id="name" label="Email Address" type="email" fullWidth />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ pr: 2.5 }}>
              <Button sx={{ color: 'error.dark' }} onClick={handleClose} color="secondary">
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
