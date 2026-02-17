// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { useDispatch } from 'store';
import { gridSpacing } from 'store/constant';
import { openSnackbar } from 'store/slices/snackbar';
import {
  ColorVariants,
  CustomComponent,
  Dense,
  DismissSnackBar,
  HideDuration,
  IconVariants,
  MaxSnackbar,
  PositioningSnackbar,
  PreventDuplicate,
  SnackBarAction,
  TransitionBar
} from 'ui-component/extended/notistack';

// ==============================|| UI SNACKBAR ||============================== //

export default function UISnackbar() {
  const theme = useTheme();
  const dispatch = useDispatch();

  return (
    <MainCard title="Snackbar" secondary={<SecondaryAction link="https://next.material-ui.com/components/snackbars/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Basic Snackbar">
            <Grid container spacing={3} sx={{ alignItems: 'center' }}>
              <Grid>
                <Button
                  variant="outlined"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is default message',
                        variant: 'alert',
                        close: false,
                        severity: 'info'
                      })
                    )
                  }
                >
                  Default
                </Button>
              </Grid>
              <Grid>
                <Button
                  sx={{
                    color: 'error.dark',
                    borderColor: 'error.dark',
                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2), borderColor: 'error.dark' }
                  }}
                  variant="outlined"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is error message',
                        variant: 'alert',
                        alert: { color: 'error' },
                        close: false,
                        severity: 'error'
                      })
                    )
                  }
                >
                  Error
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="outlined"
                  sx={{
                    color: 'success.dark',
                    borderColor: 'success.dark',
                    '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.2), borderColor: 'success.dark' }
                  }}
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is success message',
                        variant: 'alert',
                        alert: { color: 'success' },
                        close: false,
                        severity: 'success'
                      })
                    )
                  }
                >
                  Success
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="outlined"
                  sx={{
                    color: 'warning.dark',
                    borderColor: 'warning.dark',
                    '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.2), borderColor: 'warning.dark' }
                  }}
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is warning message',
                        variant: 'alert',
                        alert: { color: 'warning' },
                        close: false,
                        severity: 'warning'
                      })
                    )
                  }
                >
                  Warning
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="With Close">
            <Grid container spacing={3} sx={{ alignItems: 'center' }}>
              <Grid>
                <Button
                  variant="outlined"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is default message',
                        variant: 'alert',
                        severity: 'info'
                      })
                    )
                  }
                >
                  Default
                </Button>
              </Grid>
              <Grid>
                <Button
                  sx={{
                    color: 'error.dark',
                    borderColor: 'error.dark',
                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2), borderColor: 'error.dark' }
                  }}
                  variant="outlined"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is error message',
                        variant: 'alert',
                        alert: { color: 'error' },
                        severity: 'error'
                      })
                    )
                  }
                >
                  Error
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="outlined"
                  sx={{
                    color: 'success.dark',
                    borderColor: 'success.dark',
                    '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.2), borderColor: 'success.dark' }
                  }}
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is success message',
                        variant: 'alert',
                        alert: { color: 'success' },
                        severity: 'success'
                      })
                    )
                  }
                >
                  Success
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="outlined"
                  sx={{
                    color: 'warning.dark',
                    borderColor: 'warning.dark',
                    '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.2), borderColor: 'warning.dark' }
                  }}
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is warning message',
                        variant: 'alert',
                        alert: { color: 'warning' },
                        severity: 'warning'
                      })
                    )
                  }
                >
                  Warning
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="With Close + Action">
            <Grid container spacing={3} sx={{ alignItems: 'center' }}>
              <Grid>
                <Button
                  variant="outlined"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is default message',
                        variant: 'alert',
                        actionButton: true,
                        severity: 'info'
                      })
                    )
                  }
                >
                  Default
                </Button>
              </Grid>
              <Grid>
                <Button
                  sx={{
                    color: 'error.dark',
                    borderColor: 'error.dark',
                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2), borderColor: 'error.dark' }
                  }}
                  variant="outlined"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is error message',
                        variant: 'alert',
                        alert: { color: 'error' },
                        actionButton: true,
                        severity: 'error'
                      })
                    )
                  }
                >
                  Error
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="outlined"
                  sx={{
                    color: 'success.dark',
                    borderColor: 'success.dark',
                    '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.2), borderColor: 'success.dark' }
                  }}
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is success message',
                        variant: 'alert',
                        alert: { color: 'success' },
                        actionButton: true,
                        severity: 'success'
                      })
                    )
                  }
                >
                  Success
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="outlined"
                  sx={{
                    color: 'warning.dark',
                    borderColor: 'warning.dark',
                    '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.2), borderColor: 'warning.dark' }
                  }}
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is warning message',
                        variant: 'alert',
                        alert: { color: 'warning' },
                        actionButton: true,
                        severity: 'warning'
                      })
                    )
                  }
                >
                  Warning
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Snackbar Position">
            <Grid container spacing={2}>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        anchorOrigin: { vertical: 'top', horizontal: 'left' },
                        message: 'This is a top-left message!'
                      })
                    )
                  }
                >
                  Top-Left
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        anchorOrigin: { vertical: 'top', horizontal: 'center' },
                        message: 'This is a top-center message!'
                      })
                    )
                  }
                >
                  Top-Center
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        anchorOrigin: { vertical: 'top', horizontal: 'right' },
                        message: 'This is a top-right message!'
                      })
                    )
                  }
                >
                  Top-Right
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                        message: 'This is a bottom-right message!'
                      })
                    )
                  }
                >
                  Bottom-Right
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
                        message: 'This is a bottom-center message!'
                      })
                    )
                  }
                >
                  Bottom-Center
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                        message: 'This is a bottom-left message!'
                      })
                    )
                  }
                >
                  Bottom-Left
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Snackbar Trasition">
            <Grid container spacing={2}>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is a fade message!',
                        transition: 'Fade'
                      })
                    )
                  }
                >
                  Default/Fade
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is a slide-left message!',
                        transition: 'SlideLeft'
                      })
                    )
                  }
                >
                  Slide Left
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is a slide-up message!',
                        transition: 'SlideUp'
                      })
                    )
                  }
                >
                  Slide Up
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is a slide-right message!',
                        transition: 'SlideRight'
                      })
                    )
                  }
                >
                  Slide Right
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is a slide-down message!',
                        transition: 'SlideDown'
                      })
                    )
                  }
                >
                  Slide Down
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      openSnackbar({
                        open: true,
                        message: 'This is a grow message!',
                        transition: 'Grow'
                      })
                    )
                  }
                >
                  Grow
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={12}>
          <Typography variant="h5" sx={{ mt: 2 }}>
            Extended - Notistack
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ColorVariants />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <MaxSnackbar />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <IconVariants />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <HideDuration />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SnackBarAction />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <DismissSnackBar />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <PreventDuplicate />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <TransitionBar />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Dense />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <CustomComponent />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <PositioningSnackbar />
        </Grid>
      </Grid>
    </MainCard>
  );
}
