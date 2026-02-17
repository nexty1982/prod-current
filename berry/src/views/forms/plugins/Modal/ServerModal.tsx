import React from 'react';

// material-ui
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// assets
import CloseIcon from '@mui/icons-material/Close';

// ==============================|| SERVER MODAL ||============================== //

export default function ServerModal() {
  const rootRef = React.useRef(null);

  return (
    <Box
      ref={rootRef}
      sx={{
        mb: 2,
        height: 500,
        flexGrow: 1,
        minWidth: { xs: 245, sm: 300 },
        zIndex: -1,
        transform: 'translateZ(0)',
        '@media all and (-ms-high-contrast: none)': {
          display: 'none'
        }
      }}
    >
      <Modal
        disablePortal
        disableEnforceFocus
        disableAutoFocus
        open
        aria-labelledby="server-modal-title"
        aria-describedby="server-modal-description"
        sx={{
          display: 'flex',
          p: 1,
          alignItems: 'center',
          justifyContent: 'center'
        }}
        container={() => rootRef.current}
      >
        <MainCard
          sx={{
            width: { xs: 280, sm: 450 },
            zIndex: 1
          }}
          title="Server Side Modal"
          content={false}
          secondary={
            <IconButton size="large" aria-label="close modal">
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          <CardContent>
            <Typography variant="body1">Laboris non ad et aute sint aliquip mollit voluptate velit dolore magna fugiat ex.</Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Commodo amet veniam nostrud mollit quis sint qui nulla elit esse excepteur ullamco esse magna. Nisi duis aute est in mollit
              irure enim tempor in.
            </Typography>
          </CardContent>
          <Divider />
          <CardActions>
            <Grid container sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" type="button">
                Open Modal
              </Button>
            </Grid>
          </CardActions>
        </MainCard>
      </Modal>
    </Box>
  );
}
