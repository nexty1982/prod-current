// material-ui
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// assets
import CloseIcon from '@mui/icons-material/Close';

// ===============================|| UI ALERT ||=============================== //

export default function UIAlert() {
  return (
    <MainCard title="Alert" secondary={<SecondaryAction link="https://next.material-ui.com/components/alert/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={12}>
          <SubCard title="Basic">
            <Grid container spacing={2}>
              <Grid size={12}>
                <Alert icon={false} severity="error">
                  This is error alert!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert icon={false} severity="warning">
                  This is warning alert!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert icon={false} severity="success" sx={{ color: 'success.dark' }}>
                  This is success alert!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert icon={false} severity="info" sx={{ color: 'primary.main' }}>
                  This is primary alert!
                </Alert>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={12}>
          <SubCard title="Description Alert">
            <Grid container direction="column" spacing={2}>
              <Grid size={12}>
                <Alert severity="error" icon={false}>
                  <AlertTitle>Error</AlertTitle>
                  This is an error alert — <strong>check it out!</strong>
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert severity="warning" icon={false}>
                  <AlertTitle>Warning</AlertTitle>
                  This is a warning alert — <strong>check it out!</strong>
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert severity="info" icon={false}>
                  <AlertTitle>Info</AlertTitle>
                  This is an info alert — <strong>check it out!</strong>
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert severity="success" icon={false}>
                  <AlertTitle>Success</AlertTitle>
                  This is a success alert — <strong>check it out!</strong>
                </Alert>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={12}>
          <SubCard title="Alert with Action">
            <Grid container spacing={2}>
              <Grid size={12}>
                <Alert
                  severity="error"
                  icon={false}
                  sx={{ color: 'error.main' }}
                  action={
                    <>
                      <Button color="inherit" size="small">
                        UNDO
                      </Button>
                      <IconButton size="small" aria-label="close" color="inherit">
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </>
                  }
                >
                  This is error alert!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert
                  severity="warning"
                  icon={false}
                  action={
                    <>
                      <Button color="inherit" size="small">
                        UNDO
                      </Button>
                      <IconButton size="small" aria-label="close" color="inherit">
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </>
                  }
                >
                  This is warning alert!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert
                  severity="success"
                  icon={false}
                  sx={{ color: 'success.dark' }}
                  action={
                    <>
                      <Button color="inherit" size="small">
                        UNDO
                      </Button>
                      <IconButton size="small" aria-label="close" color="inherit">
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </>
                  }
                >
                  This is success alert!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert
                  severity="info"
                  icon={false}
                  sx={{ color: 'primary.main' }}
                  action={
                    <>
                      <Button color="inherit" size="small">
                        UNDO
                      </Button>
                      <IconButton size="small" aria-label="close" color="inherit">
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </>
                  }
                >
                  This is primary alert!
                </Alert>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={12}>
          <SubCard title="Alert with Icon">
            <Grid container spacing={2}>
              <Grid size={12}>
                <Alert severity="error" sx={{ color: 'error.main' }}>
                  This is error alert!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert severity="warning">This is warning alert!</Alert>
              </Grid>
              <Grid size={12}>
                <Alert severity="success" sx={{ color: 'success.dark' }}>
                  This is success alert!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert severity="info" sx={{ color: 'primary.main' }}>
                  This is primary alert!
                </Alert>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={12}>
          <SubCard title="Outline Alert">
            <Grid container direction="column" spacing={2}>
              <Grid size={12}>
                <Alert variant="outlined" severity="error" sx={{ borderColor: 'error.main' }}>
                  This is an error alert — check it out!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert variant="outlined" severity="warning" sx={{ borderColor: 'warning.dark' }}>
                  This is a warning alert — check it out!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert variant="outlined" severity="info" sx={{ borderColor: 'primary.main' }}>
                  This is an info alert — check it out!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert variant="outlined" severity="success" sx={{ borderColor: 'success.dark', color: 'success.dark' }}>
                  This is a success alert — check it out!
                </Alert>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={12}>
          <SubCard title="Filled Alert">
            <Grid container direction="column" spacing={2}>
              <Grid size={12}>
                <Alert variant="filled" severity="error">
                  This is an error alert — check it out!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert variant="filled" severity="warning" sx={{ color: 'grey.800', bgcolor: 'warning.dark' }}>
                  This is a warning alert — check it out!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert variant="filled" severity="info">
                  This is an info alert — check it out!
                </Alert>
              </Grid>
              <Grid size={12}>
                <Alert variant="filled" severity="success" sx={{ bgcolor: 'success.dark' }}>
                  This is a success alert — check it out!
                </Alert>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
