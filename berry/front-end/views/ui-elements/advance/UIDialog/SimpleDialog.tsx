import React from 'react';

// material-ui
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

// project imports
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// assets
import AddIcon from '@mui/icons-material/Add';

// alert user data
const emails = [
  {
    email: 'username@company.com',
    avatar: 'avatar-1.png'
  },
  {
    email: 'user02@company.com',
    avatar: 'avatar-2.png'
  }
];

// ===============================|| DIALOG ||=============================== //

interface SimpleDialogProps {
  onClose: (s: string) => void;
  selectedValue: string;
  open: boolean;
}

function SimpleDialog({ onClose, selectedValue, open }: SimpleDialogProps) {
  const handleClose = () => {
    onClose(selectedValue);
  };

  const handleListItemClick = (value: string) => {
    onClose(value);
  };

  return (
    <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
      {open && (
        <>
          <DialogTitle sx={{ cursor: 'move' }} id="draggable-dialog-title">
            User Account
          </DialogTitle>
          <Card>
            <CardContent sx={{ pt: 0 }}>
              <List>
                {emails.map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItemButton onClick={() => handleListItemClick(item.email)}>
                      <ListItemAvatar>
                        <Avatar alt="User 1" src={getImageUrl(`${item.avatar}`, ImagePath.USERS)} />
                      </ListItemAvatar>
                      <ListItemText primary={item.email} />
                    </ListItemButton>
                    <Divider />
                  </React.Fragment>
                ))}

                <ListItemButton autoFocus onClick={() => handleListItemClick('addAccount')}>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        border: '2px solid',
                        color: 'grey.500',
                        borderColor: 'grey.500',
                        bgcolor: 'transparent'
                      }}
                    >
                      <AddIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary="Add New Account" />
                </ListItemButton>
              </List>
            </CardContent>
          </Card>
        </>
      )}
    </Dialog>
  );
}

// ===============================|| UI DIALOG - SIMPLE ||=============================== //

export default function SimpleDialogDemo() {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(emails[0].email);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = (value: string) => {
    setOpen(false);
    setSelectedValue(value);
  };

  return (
    <div>
      <Button variant="contained" onClick={handleClickOpen}>
        Open simple dialog
      </Button>
      <SimpleDialog selectedValue={selectedValue} open={open} onClose={handleClose} />
    </div>
  );
}
