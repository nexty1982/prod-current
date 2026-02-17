// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

// types
interface Props {
  title: string;
  open: boolean;
  handleClose: (status: boolean) => void;
}

// ==============================|| KANBAN BACKLOGS - STORY DELETE ||============================== //

export default function AlertStoryDelete({ title, open, handleClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={() => handleClose(false)}
      keepMounted
      maxWidth="xs"
      aria-labelledby="item-delete-title"
      aria-describedby="item-delete-description"
    >
      {open && (
        <>
          <DialogTitle id="item-delete-title">{title} - Are you sure you want to delete?</DialogTitle>
          <DialogContent>
            <DialogContentText id="item-delete-description">
              By deleting user story, all task inside that user story will also be deleted.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ mr: 2 }}>
            <Button onClick={() => handleClose(false)} color="error">
              Cancel
            </Button>
            <Button variant="contained" size="small" onClick={() => handleClose(true)} autoFocus>
              Delete
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
