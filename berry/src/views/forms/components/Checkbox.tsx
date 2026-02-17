// material-ui
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// ==============================|| CHECKBOX ||============================== //

export default function UICheckbox() {
  return (
    <MainCard title="Checkbox" secondary={<SecondaryAction link="https://next.material-ui.com/components/checkboxes/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SubCard title="Basic checkboxes">
            <Grid container spacing={2}>
              <Grid>
                <Checkbox color="primary" sx={{ color: 'success.main', '&.Mui-checked': { color: 'success.main' } }} />
              </Grid>
              <Grid>
                <Checkbox defaultChecked color="primary" />
              </Grid>
              <Grid>
                <Checkbox color="secondary" />
              </Grid>
              <Grid>
                <Checkbox defaultChecked color="secondary" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SubCard title="With label">
            <Grid container spacing={2}>
              <Grid>
                <FormControlLabel control={<Checkbox defaultChecked />} label="Checked" />
              </Grid>
              <Grid>
                <FormControlLabel disabled control={<Checkbox />} label="Unchecked" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SubCard title="Size">
            <Grid container spacing={2}>
              <Grid>
                <Checkbox defaultChecked color="primary" size="small" />
              </Grid>
              <Grid>
                <Checkbox defaultChecked color="primary" />
              </Grid>
              <Grid>
                <Checkbox defaultChecked color="primary" sx={{ '& .MuiSvgIcon-root': { fontSize: 28 } }} />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={12}>
          <SubCard title="With Color">
            <Grid container spacing={2}>
              <Grid>
                <Checkbox defaultChecked color="primary" />
              </Grid>
              <Grid>
                <Checkbox defaultChecked color="secondary" sx={{ color: 'secondary.main' }} />
              </Grid>
              <Grid>
                <Checkbox defaultChecked sx={{ color: 'error.main', '&.Mui-checked': { color: 'error.main' } }} />
              </Grid>
              <Grid>
                <Checkbox defaultChecked sx={{ color: 'warning.dark', '&.Mui-checked': { color: 'warning.main' } }} />
              </Grid>
              <Grid>
                <Checkbox defaultChecked sx={{ color: 'success.dark', '&.Mui-checked': { color: 'success.main' } }} />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
