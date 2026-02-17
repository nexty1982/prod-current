// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormHelperText from '@mui/material/FormHelperText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';

// project imports
import { MenuOrientation } from 'config';
import MainCard from 'ui-component/cards/MainCard';
import InputLabel from 'ui-component/extended/Form/InputLabel';
import { gridSpacing } from 'store/constant';
import useConfig from 'hooks/useConfig';

// assets
import { IconClipboardList } from '@tabler/icons-react';

// ==============================|| Sticky ActionBar ||============================== //

export default function StickyActionBar() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const { menuOrientation } = useConfig();
  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downMD;

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <MainCard content={false} sx={{ overflow: 'visible' }}>
          <CardActions
            sx={{
              position: 'sticky',
              top: isHorizontal ? 132 : 80,
              bgcolor: 'background.paper',
              zIndex: 1,
              borderRadius: '8px 8px 0 0',
              borderBottom: '1px solid',
              borderBottomColor: 'divider'
            }}
          >
            <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', width: 1 }}>
              <Grid>
                <Typography variant="h5" sx={{ m: 0 }}>
                  Sticky Action Bar:
                </Typography>
              </Grid>
              <Grid>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Grid>
                    <Button variant="contained" color="secondary">
                      Submit
                    </Button>
                  </Grid>
                  <Grid>
                    <Button variant="contained">Clear</Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardActions>
          <Divider />
          <CardContent>
            <Grid container spacing={3} sx={{ alignItems: 'center' }}>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                    <Avatar variant="rounded" color="inherit" sx={{ bgcolor: 'secondary.main', ml: 'auto' }}>
                      <IconClipboardList color="#fff" />
                    </Avatar>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                    <Typography variant="h3">Personal Information</Typography>
                    <Typography variant="body2">Sticky Action Bar Lorem Ipsum is simply</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Divider />
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, sm: 3, lg: 4 }} />
                  <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                    <Typography variant="h5" sx={{ mb: 3 }}>
                      A. Personal Info:
                    </Typography>
                  </Grid>
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
                  <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                    <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      Password :
                    </InputLabel>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                    <TextField fullWidth placeholder="Enter Password" />
                    <FormHelperText>Please enter your Password</FormHelperText>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Divider />
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, sm: 3, lg: 4 }} />
                  <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                    <Typography variant="h5" sx={{ mb: 3 }}>
                      B. Educational Info:
                    </Typography>
                  </Grid>
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
                    <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      College Name :
                    </InputLabel>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                    <TextField fullWidth placeholder="Enter College name" />
                    <FormHelperText>Please enter your College name</FormHelperText>
                  </Grid>
                  <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                    <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      Work Experience :
                    </InputLabel>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                    <TextField fullWidth placeholder="Enter Work Experience" />
                    <FormHelperText>Please enter your Work Experience</FormHelperText>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3, lg: 4 }}>
                    <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      Language :
                    </InputLabel>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                    <FormControlLabel control={<Checkbox defaultChecked />} label="English" />
                    <FormControlLabel control={<Checkbox />} label="French" />
                    <FormControlLabel control={<Checkbox />} label="Dutch" />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3, lg: 4 }}>
                    <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      Hobby :
                    </InputLabel>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 9, lg: 6 }}>
                    <FormControlLabel control={<Checkbox />} label="Reading" />
                    <FormControlLabel control={<Checkbox />} label="Dancing" />
                    <FormControlLabel control={<Checkbox />} label="Swimming" />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
          <CardActions>
            <Grid container spacing={2} sx={{ alignItems: 'center', width: 1 }}>
              <Grid size={{ xs: 12, lg: 4 }} />
              <Grid size={{ xs: 12, lg: 6 }}>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid>
                    <Button variant="contained" color="secondary">
                      Submit
                    </Button>
                  </Grid>
                  <Grid>
                    <Button variant="contained">Clear</Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardActions>
        </MainCard>
      </Grid>
    </Grid>
  );
}
