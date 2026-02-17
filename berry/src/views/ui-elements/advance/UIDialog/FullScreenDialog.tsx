import { useState } from 'react';

// material-ui
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import List from '@mui/material/List';
import Slide, { SlideProps } from '@mui/material/Slide';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

// assets
import CloseIcon from '@mui/icons-material/Close';

// slide animation
function Transition(props: SlideProps) {
  return <Slide direction="up" {...props} />;
}

// ===============================|| UI DIALOG - FULL SCREEN ||=============================== //

export default function FullScreenDialog() {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button variant="outlined" onClick={handleClickOpen}>
        Open full-screen dialog
      </Button>
      <Dialog fullScreen open={open} onClose={handleClose} slots={{ transition: Transition }}>
        {open && (
          <>
            <AppBar sx={{ position: 'relative' }}>
              <Toolbar>
                <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close" size="large">
                  <CloseIcon />
                </IconButton>
                <Typography variant="h3" color="inherit" sx={{ ml: 2, flex: 1 }}>
                  Sound
                </Typography>
                <Button autoFocus color="inherit" onClick={handleClose}>
                  SAVE
                </Button>
              </Toolbar>
            </AppBar>
            <List>
              <ListItemButton>
                <ListItemText
                  primary={<Typography variant="subtitle1">Phone Ringtone</Typography>}
                  secondary={<Typography variant="caption">Titania</Typography>}
                />
              </ListItemButton>
              <Divider />
              <ListItemButton>
                <ListItemText
                  primary={<Typography variant="subtitle1">Default Notification Ringtone</Typography>}
                  secondary={<Typography variant="caption">Tethys</Typography>}
                />
              </ListItemButton>
              <ListItemButton>
                <ListItemText
                  primary={<Typography variant="subtitle1">Phone Ringtone</Typography>}
                  secondary={<Typography variant="caption">Titania</Typography>}
                />
              </ListItemButton>
              <Divider />
              <ListItemButton>
                <ListItemText
                  primary={<Typography variant="subtitle1">Default Notification Ringtone</Typography>}
                  secondary={<Typography variant="caption">Tethys</Typography>}
                />
              </ListItemButton>
            </List>
          </>
        )}
      </Dialog>
    </div>
  );
}
