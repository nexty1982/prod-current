// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { gridSpacing } from 'store/constant';

// assets
import LayersTwoToneIcon from '@mui/icons-material/LayersTwoTone';
import { IconSettings } from '@tabler/icons-react';

// ==============================|| FORMS BUTTONS ||============================== //

export default function UIButton() {
  const theme = useTheme();

  return (
    <MainCard title="Button" secondary={<SecondaryAction link="https://next.material-ui.com/components/buttons/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Base">
            <Grid container spacing={2}>
              <Grid>
                <Button variant="contained">Primary</Button>
              </Grid>
              <Grid>
                <Button variant="contained" color="secondary">
                  Secondary
                </Button>
              </Grid>
              <Grid>
                <Button variant="contained" disabled>
                  Disabled
                </Button>
              </Grid>
              <Grid>
                <Button variant="contained" href="#contained-buttons">
                  Link
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Colors">
            <Grid container spacing={2}>
              <Grid>
                <Button variant="contained">Primary</Button>
              </Grid>
              <Grid>
                <Button variant="contained" color="secondary">
                  Secondary
                </Button>
              </Grid>
              <Grid>
                <Button variant="contained" sx={{ bgcolor: 'success.dark', '&:hover': { bgcolor: 'success.main' } }}>
                  Success
                </Button>
              </Grid>
              <Grid>
                <Button variant="contained" sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}>
                  Error
                </Button>
              </Grid>
              <Grid>
                <Button variant="contained" sx={{ bgcolor: 'warning.dark', '&:hover': { bgcolor: 'warning.main' } }}>
                  warning
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Outlined">
            <Grid container spacing={2}>
              <Grid>
                <Button variant="outlined">Primary</Button>
              </Grid>
              <Grid>
                <Button variant="outlined" color="secondary">
                  Secondary
                </Button>
              </Grid>
              <Grid>
                <Button variant="outlined" disabled>
                  Disabled
                </Button>
              </Grid>
              <Grid>
                <Button variant="outlined" href="#contained-buttons">
                  Link
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="With Icons">
            <Grid container spacing={2}>
              <Grid>
                <Button variant="contained" startIcon={<LayersTwoToneIcon />}>
                  Button
                </Button>
              </Grid>
              <Grid>
                <Button variant="contained" endIcon={<LayersTwoToneIcon />}>
                  Button
                </Button>
              </Grid>
              <Grid>
                <Button variant="contained" aria-label="two layer button">
                  <LayersTwoToneIcon />
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Size">
            <Grid container spacing={2}>
              <Grid>
                <Button variant="contained" size="small">
                  Button
                </Button>
              </Grid>
              <Grid>
                <Button variant="contained">Button</Button>
              </Grid>
              <Grid>
                <Button variant="contained" size="large">
                  Button
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Text Button">
            <Grid container spacing={2}>
              <Grid>
                <Button variant="text">Primary</Button>
              </Grid>
              <Grid>
                <Button variant="text" color="secondary">
                  Secondary
                </Button>
              </Grid>
              <Grid>
                <Button variant="text" disabled>
                  Disabled
                </Button>
              </Grid>
              <Grid>
                <Button variant="text" href="#contained-buttons">
                  Link
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Shadow Button">
            <Grid container spacing={2}>
              <Grid>
                <Button
                  variant="contained"
                  sx={{
                    boxShadow: theme.customShadows.primary,
                    ':hover': {
                      boxShadow: 'none'
                    }
                  }}
                >
                  Primary
                </Button>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Animation">
            <Grid container spacing={2}>
              <Grid>
                <AnimateButton>
                  <Button
                    variant="contained"
                    sx={{
                      boxShadow: theme.customShadows.primary,
                      ':hover': {
                        boxShadow: 'none'
                      }
                    }}
                  >
                    Default
                  </Button>
                </AnimateButton>
              </Grid>
              <Grid>
                <AnimateButton
                  scale={{
                    hover: 1.1,
                    tap: 0.9
                  }}
                >
                  <Button
                    variant="contained"
                    color="secondary"
                    sx={{
                      boxShadow: theme.customShadows.secondary,
                      ':hover': {
                        boxShadow: 'none'
                      }
                    }}
                  >
                    Scale
                  </Button>
                </AnimateButton>
              </Grid>
              <Grid>
                <AnimateButton type="slide">
                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: 'error.main',
                      borderColor: 'divider',
                      boxShadow: theme.customShadows.error,
                      ':hover': { boxShadow: 'none' }
                    }}
                  >
                    Slide
                  </Button>
                </AnimateButton>
              </Grid>
              <Grid>
                <AnimateButton type="rotate">
                  <Tooltip title="Rotate">
                    <IconButton color="primary" size="small">
                      <IconSettings stroke={1.5} size="1.8rem" />
                    </IconButton>
                  </Tooltip>
                </AnimateButton>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
