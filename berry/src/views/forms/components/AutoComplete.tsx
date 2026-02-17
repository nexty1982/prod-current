// material-ui
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// assets
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';

// autocomplete options
const top100Films = [
  { label: 'The Dark Knight', id: 1 },
  { label: 'Control with Control', id: 2 },
  { label: 'Combo with Solo', id: 3 },
  { label: 'The Dark', id: 4 },
  { label: 'Fight Club', id: 5 },
  { label: 'demo@company.com', id: 6 },
  { label: 'Pulp Fiction', id: 7 }
];

// ==============================|| AUTOCOMPLETE ||============================== //

export default function AutoComplete() {
  return (
    <MainCard
      title="Autocomplete"
      secondary={<SecondaryAction link="https://next.material-ui.com/components/autocomplete/#main-content" />}
    >
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SubCard title="Combo Box">
            <Grid container direction="column" spacing={3}>
              <Grid>
                <Autocomplete
                  disableClearable
                  options={top100Films}
                  defaultValue={top100Films[0]}
                  renderInput={(params) => <TextField {...params} label="" />}
                />
              </Grid>
              <Grid>
                <Autocomplete
                  disablePortal
                  options={top100Films}
                  defaultValue={top100Films[1]}
                  renderInput={(params) => <TextField {...params} label="" />}
                />
              </Grid>
              <Grid>
                <Autocomplete
                  disablePortal
                  options={top100Films}
                  defaultValue={top100Films[2]}
                  renderInput={(params) => <TextField {...params} label="" />}
                />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SubCard title="With Caption">
            <Grid container direction="column" spacing={3}>
              <Grid>
                <Autocomplete
                  disablePortal
                  options={top100Films}
                  defaultValue={top100Films[5]}
                  renderInput={(params) => <TextField {...params} label="Email Address" />}
                />
              </Grid>
              <Grid>
                <Autocomplete
                  disablePortal
                  options={top100Films}
                  defaultValue={top100Films[5]}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Email Address"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailTwoToneIcon fontSize="small" sx={{ color: 'grey.700' }} />
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SubCard title="Combo with Multiple Options">
            <Grid container direction="column" spacing={3}>
              <Grid>
                <Autocomplete
                  multiple
                  options={top100Films}
                  getOptionLabel={(option) => option.label}
                  defaultValue={[top100Films[0], top100Films[4]]}
                  renderInput={(params) => <TextField {...params} />}
                />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
