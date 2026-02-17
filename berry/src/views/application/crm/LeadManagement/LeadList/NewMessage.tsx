import { SyntheticEvent } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';

// assets
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';

// ==============================|| LEAD - ADD NEW MESSAGE ||============================== //

type NewMessageProps = {
  open: boolean;
  handleToggleMsgDialog: (e: SyntheticEvent) => void;
};

export default function NewMessage({ open, handleToggleMsgDialog }: NewMessageProps) {
  return (
    <Dialog
      open={open}
      onClose={handleToggleMsgDialog}
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: '100%',
          width: 596,
          borderRadius: 3,
          py: 0
        }
      }}
    >
      {open && (
        <>
          <DialogTitle sx={{ px: 3, py: 2 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h4">New Message</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                <IconButton size="medium">
                  <OpenInFullIcon sx={{ transform: 'rotate(90deg)' }} />
                </IconButton>
                <IconButton sx={{ p: 0 }} size="medium" onClick={handleToggleMsgDialog}>
                  <CancelTwoToneIcon />
                </IconButton>
              </Stack>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <MainCard content={false}>
              <Box sx={{ px: 3 }}>
                <TextField fullWidth id="outlined-multiline-flexible" placeholder="type a message" multiline rows={5} />
              </Box>
            </MainCard>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <UploadFileOutlinedIcon fontSize="small" />
              <Button variant="text" startIcon={<InsertDriveFileOutlinedIcon />} size="small">
                file.doc
              </Button>
            </Stack>
            <Stack spacing={1.5} direction="row" sx={{ justifyContent: 'flex-end' }}>
              <AnimateButton>
                <Button variant="outlined" size="small">
                  Reset
                </Button>
              </AnimateButton>
              <AnimateButton>
                <Button variant="contained" size="small" onClick={handleToggleMsgDialog}>
                  Send
                </Button>
              </AnimateButton>
            </Stack>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
