import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Slide, { SlideProps } from '@mui/material/Slide';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import { gridSpacing } from 'store/constant';
import ReactQuill from 'ui-component/third-party/ReactQuill';

// assets
import AddCircleOutlineTwoToneIcon from '@mui/icons-material/AddCircleOutlineTwoTone';
import AttachmentTwoToneIcon from '@mui/icons-material/AttachmentTwoTone';
import HighlightOffTwoToneIcon from '@mui/icons-material/HighlightOffTwoTone';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { IconArrowsDiagonal2 } from '@tabler/icons-react';

// animation
function Transition(props: SlideProps) {
  return <Slide direction="up" {...props} />;
}

// ==============================|| MAIL COMPOSE DIALOG ||============================== //

export default function ComposeDialog() {
  const theme = useTheme();

  const [open, setOpen] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleCloseDialog = () => {
    setOpen(false);
  };

  const [ccBccValue, setCcBccValue] = useState<boolean>(false);
  const handleCcBccChange = (event: React.MouseEvent<HTMLSpanElement> | undefined) => {
    setCcBccValue((prev) => !prev);
  };

  let composePosition = {};

  const [position, setPosition] = useState(true);
  if (!position) {
    composePosition = {
      '& .MuiDialog-container': {
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        '& .MuiPaper-root': { mb: 0, borderRadius: '12px 12px 0px 0px', maxWidth: 595 }
      }
    };
  }

  return (
    <>
      <Button variant="contained" onClick={handleClickOpen} sx={{ width: '100%' }} size="large" startIcon={<AddCircleOutlineTwoToneIcon />}>
        Compose
      </Button>
      <Dialog open={open} slots={{ transition: Transition }} keepMounted onClose={handleCloseDialog} sx={composePosition}>
        {open && (
          <DialogContent>
            <Grid container spacing={gridSpacing}>
              <Grid size={12}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h4">New Message</Typography>
                  <Stack direction="row">
                    <IconButton onClick={() => setPosition(!position)} size="large">
                      <IconArrowsDiagonal2 />
                    </IconButton>
                    <IconButton onClick={handleCloseDialog} size="large">
                      <HighlightOffTwoToneIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={0} sx={{ justifyContent: 'flex-end' }}>
                  <Grid>
                    <Link
                      component={RouterLink}
                      to="#"
                      color={theme.palette.mode === ThemeMode.DARK ? 'primary' : 'secondary'}
                      onClick={handleCcBccChange}
                      underline="hover"
                    >
                      CC & BCC
                    </Link>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="To" />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Subject" />
              </Grid>
              <Grid sx={{ display: ccBccValue ? 'block' : 'none' }} size={12}>
                <Collapse in={ccBccValue}>
                  {ccBccValue && (
                    <Grid container spacing={gridSpacing}>
                      <Grid size={12}>
                        <TextField fullWidth label="CC" />
                      </Grid>
                      <Grid size={12}>
                        <TextField fullWidth label="BCC" />
                      </Grid>
                    </Grid>
                  )}
                </Collapse>
              </Grid>

              {/* quill editor */}
              <Grid size={12}>
                <ReactQuill />
              </Grid>
              <Grid size={12}>
                <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                  <Grid>
                    <IconButton size="large">
                      <UploadFileIcon />
                    </IconButton>
                  </Grid>
                  <Grid>
                    <IconButton size="large">
                      <AttachmentTwoToneIcon />
                    </IconButton>
                  </Grid>
                  <Grid sx={{ flexGrow: 1 }} />
                  <Grid>
                    <Button variant="contained">Reply</Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
