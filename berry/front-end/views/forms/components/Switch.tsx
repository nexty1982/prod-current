// material-ui
import { useTheme } from '@mui/material/styles';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import Switch from '@mui/material/Switch';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// ==============================|| SWITCH PAGE ||============================== //

export default function UISwitch() {
  const theme = useTheme();

  return (
    <MainCard title="Switch" secondary={<SecondaryAction link="https://next.material-ui.com/components/switches/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Basic Switch">
            <Grid container spacing={2}>
              <Grid>
                <Switch defaultChecked slotProps={{ input: { 'aria-label': 'checked' } }} />
              </Grid>
              <Grid>
                <Switch slotProps={{ input: { 'aria-label': 'unchecked' } }} />
              </Grid>
              <Grid>
                <Switch disabled defaultChecked slotProps={{ input: { 'aria-label': 'disabled checked' } }} />
              </Grid>
              <Grid>
                <Switch disabled slotProps={{ input: { 'aria-label': 'disabled unchecked' } }} />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="With label">
            <Grid container spacing={2}>
              <Grid>
                <FormControl>
                  <FormGroup row>
                    <FormControlLabel control={<Switch defaultChecked />} label="Label" />
                    <FormControlLabel disabled control={<Switch />} label="Disabled" />
                  </FormGroup>
                </FormControl>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="With Placement">
            <Grid container spacing={2}>
              <Grid>
                <FormControl>
                  <FormGroup aria-label="position" row>
                    <FormControlLabel value="top" control={<Switch color="primary" />} label="Top" labelPlacement="top" />
                    <FormControlLabel value="start" control={<Switch color="primary" />} label="Start" labelPlacement="start" />
                    <FormControlLabel value="bottom" control={<Switch color="primary" />} label="Bottom" labelPlacement="bottom" />
                    <FormControlLabel value="end" control={<Switch color="primary" />} label="End" labelPlacement="end" />
                  </FormGroup>
                </FormControl>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Size">
            <Grid container spacing={2}>
              <Grid>
                <Switch defaultChecked size="small" slotProps={{ input: { 'aria-label': 'small' } }} />
              </Grid>
              <Grid>
                <Switch defaultChecked slotProps={{ input: { 'aria-label': 'normal' } }} />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={12}>
          <SubCard title="With Color">
            <Grid container spacing={2}>
              <Grid>
                <Switch defaultChecked color="primary" />
              </Grid>
              <Grid>
                <Switch
                  defaultChecked
                  sx={{
                    color: 'warning.dark',
                    '& .Mui-checked': { color: `${theme.palette.warning.dark} !important` },
                    '& .Mui-checked+.MuiSwitch-track': { bgcolor: `${theme.palette.warning.main} !important` }
                  }}
                />
              </Grid>
              <Grid>
                <Switch
                  defaultChecked
                  sx={{
                    color: 'success.dark',
                    '& .Mui-checked': { color: `${theme.palette.success.dark} !important` },
                    '& .Mui-checked+.MuiSwitch-track': { bgcolor: `${theme.palette.success.light} !important` }
                  }}
                />
              </Grid>
              <Grid>
                <Switch
                  defaultChecked
                  sx={{
                    color: 'error.main',
                    '& .Mui-checked': { color: `${theme.palette.error.main} !important` },
                    '& .Mui-checked+.MuiSwitch-track': { bgcolor: `${theme.palette.error.light} !important` }
                  }}
                />
              </Grid>
              <Grid>
                <Switch defaultChecked color="secondary" />
              </Grid>
              <Grid>
                <Switch
                  defaultChecked
                  sx={{
                    color: 'orange.main',
                    '& .Mui-checked': { color: `${theme.palette.orange.main} !important` },
                    '& .Mui-checked+.MuiSwitch-track': { bgcolor: `${theme.palette.orange.light} !important` }
                  }}
                />
              </Grid>
              <Grid>
                <Switch
                  defaultChecked
                  sx={{
                    color: 'dark.900',
                    '& .Mui-checked': { color: `${theme.palette.dark[900]} !important` },
                    '& .Mui-checked+.MuiSwitch-track': { bgcolor: `${theme.palette.dark.light} !important` }
                  }}
                />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
