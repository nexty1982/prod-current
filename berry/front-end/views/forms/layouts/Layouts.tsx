// material-ui
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import FormGroup from '@mui/material/FormGroup';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import InputLabel from 'ui-component/extended/Form/InputLabel';
import { gridSpacing } from 'store/constant';

// ==============================|| Layouts ||============================== //

export default function Layouts() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <MainCard title="Simple Form Layout">
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={12}>
              <InputLabel>Name</InputLabel>
              <TextField fullWidth placeholder="Enter full name" />
              <FormHelperText>Please enter your full name</FormHelperText>
            </Grid>
            <Grid size={12}>
              <InputLabel>Email</InputLabel>
              <TextField fullWidth placeholder="Enter email" />
              <FormHelperText>Please enter your Email</FormHelperText>
            </Grid>
            <Grid size={12}>
              <InputLabel>Password</InputLabel>
              <TextField type="password" fullWidth placeholder="Enter Password" />
            </Grid>
            <Grid size={12}>
              <InputLabel>Language</InputLabel>
              <FormGroup sx={{ '& .MuiFormControlLabel-label': { mb: { xs: -0.5, lg: -0.25 } } }}>
                <FormControlLabel control={<Checkbox defaultChecked />} label="English" />
                <FormControlLabel control={<Checkbox />} label="French" />
                <FormControlLabel control={<Checkbox />} label="Dutch" />
              </FormGroup>
            </Grid>
          </Grid>
        </MainCard>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <MainCard title="Horizontal Form Layout">
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={12}>
              <Typography variant="h5" sx={{ mb: 3 }}>
                A. Personal Info:
              </Typography>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal>Name</InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <TextField fullWidth placeholder="Enter full name" />
                  <FormHelperText>Please enter your full name</FormHelperText>
                </Grid>
                <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal>Email</InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <TextField fullWidth placeholder="Enter email" />
                  <FormHelperText>Please enter your Email</FormHelperText>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Typography variant="h5" sx={{ mb: 3 }}>
                B. Educational Info:
              </Typography>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal>Degree Name</InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <TextField fullWidth placeholder="Enter Degree name" />
                  <FormHelperText>Please enter your Degree name</FormHelperText>
                </Grid>
                <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal>Passing Year</InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <TextField fullWidth placeholder="Enter Passing Year" />
                  <FormHelperText>Please enter Passing Year</FormHelperText>
                </Grid>
                <Grid size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal>Language</InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <FormControlLabel
                    sx={{ '& .MuiFormControlLabel-label': { mb: { xs: -0.5, lg: -0.25 } } }}
                    control={<Checkbox defaultChecked />}
                    label="English"
                  />
                  <FormControlLabel
                    sx={{ '& .MuiFormControlLabel-label': { mb: { xs: -0.5, lg: -0.25 } } }}
                    control={<Checkbox />}
                    label="French"
                  />
                  <FormControlLabel
                    sx={{ '& .MuiFormControlLabel-label': { mb: { xs: -0.5, lg: -0.25 } } }}
                    control={<Checkbox />}
                    label="Dutch"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </MainCard>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <MainCard title="Control Divider">
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={12}>
              <InputLabel>Name</InputLabel>
              <TextField fullWidth placeholder="Enter full name" />
              <FormHelperText>Please enter your full name</FormHelperText>
            </Grid>
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <InputLabel>Email</InputLabel>
              <TextField fullWidth placeholder="Enter email" />
              <FormHelperText>Please enter your Email</FormHelperText>
            </Grid>
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <InputLabel>Password</InputLabel>
              <TextField type="password" fullWidth placeholder="Enter Password" />
            </Grid>
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <InputLabel>Language</InputLabel>
              <FormGroup sx={{ '& .MuiFormControlLabel-label': { mb: { xs: -0.25, sm: -0.5 } } }}>
                <FormControlLabel control={<Checkbox defaultChecked />} label="English" />
                <FormControlLabel control={<Checkbox />} label="French" />
                <FormControlLabel control={<Checkbox />} label="Dutch" />
              </FormGroup>
            </Grid>
          </Grid>
        </MainCard>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <MainCard title="Input Label Alignment">
          <Grid container spacing={3} sx={{ alignItems: 'center' }}>
            <Grid size={12}>
              <Typography variant="h5" sx={{ mb: 3 }}>
                A. Personal Info:
              </Typography>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    Name :
                  </InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <TextField fullWidth placeholder="Enter full name" />
                  <FormHelperText>Please enter your full name</FormHelperText>
                </Grid>
                <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    Email :
                  </InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <TextField fullWidth placeholder="Enter email" />
                  <FormHelperText>Please enter your Email</FormHelperText>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <Typography variant="h5" sx={{ mb: 3 }}>
                B. Educational Info:
              </Typography>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    Degree Name :
                  </InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <TextField fullWidth placeholder="Enter Degree name" />
                  <FormHelperText>Please enter your Degree name</FormHelperText>
                </Grid>
                <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    Passing Year :
                  </InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <TextField fullWidth placeholder="Enter Passing Year" />
                  <FormHelperText>Please enter Passing Year</FormHelperText>
                </Grid>
                <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                  <InputLabel horizontal sx={{ pt: 1.5, textAlign: { xs: 'left', sm: 'right' } }}>
                    Language :
                  </InputLabel>
                </Grid>
                <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                  <FormControlLabel
                    sx={{ '& .MuiFormControlLabel-label': { mb: { xs: -0.5, lg: -0.25 } } }}
                    control={<Checkbox defaultChecked />}
                    label="English"
                  />
                  <FormControlLabel
                    sx={{ '& .MuiFormControlLabel-label': { mb: { xs: -0.5, lg: -0.25 } } }}
                    control={<Checkbox />}
                    label="French"
                  />
                  <FormControlLabel
                    sx={{ '& .MuiFormControlLabel-label': { mb: { xs: -0.5, lg: -0.25 } } }}
                    control={<Checkbox />}
                    label="Dutch"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </MainCard>
      </Grid>
    </Grid>
  );
}
