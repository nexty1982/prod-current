// material-ui
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import InputLabel from 'ui-component/extended/Form/InputLabel';
import { gridSpacing } from 'store/constant';

// ==============================|| ActionBar ||============================== //

export default function ActionBar() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, md: 6, lg: 6 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <MainCard title="Simple Action Bar" content={false}>
              <CardContent>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={12}>
                    <InputLabel>Name</InputLabel>
                    <TextField fullWidth placeholder="Enter full name" />
                    <FormHelperText>Please enter your full name</FormHelperText>
                  </Grid>
                </Grid>
              </CardContent>
              <Divider />
              <CardActions>
                <Grid container spacing={1}>
                  <Grid>
                    <Button variant="contained" color="secondary">
                      Submit
                    </Button>
                  </Grid>
                  <Grid>
                    <Button variant="outlined">Clear</Button>
                  </Grid>
                </Grid>
              </CardActions>
            </MainCard>
          </Grid>
          <Grid size={12}>
            <MainCard title="Action Button with Link" content={false}>
              <CardContent>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={12}>
                    <InputLabel>Name</InputLabel>
                    <TextField fullWidth placeholder="Enter full name" />
                    <FormHelperText>Please enter your full name</FormHelperText>
                  </Grid>
                </Grid>
              </CardContent>
              <Divider />
              <CardActions>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end', width: 1 }}>
                  <Grid>
                    <Button variant="contained" color="secondary">
                      Submit
                    </Button>
                  </Grid>
                  <Grid>
                    <Typography variant="body2" sx={{ m: 0 }}>
                      or
                    </Typography>
                  </Grid>
                  <Grid>
                    <Button variant="text">Clear</Button>
                  </Grid>
                </Grid>
              </CardActions>
            </MainCard>
          </Grid>
          <Grid size={12}>
            <MainCard title="With side action button" content={false}>
              <CardContent>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={12}>
                    <InputLabel>Name</InputLabel>
                    <TextField fullWidth placeholder="Enter full name" />
                    <FormHelperText>Please enter your full name</FormHelperText>
                  </Grid>
                </Grid>
              </CardContent>
              <Divider />
              <CardActions>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', width: 1 }}>
                  <Grid>
                    <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Grid>
                        <Button variant="contained" color="secondary">
                          Submit
                        </Button>
                      </Grid>
                      <Grid>
                        <Button variant="outlined">Clear</Button>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid>
                    <Grid>
                      <Button variant="contained" color="error">
                        Delete
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </CardActions>
            </MainCard>
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 6 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <MainCard title="Right Align Action Bar" content={false}>
              <CardContent>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={12}>
                    <InputLabel>Name</InputLabel>
                    <TextField fullWidth placeholder="Enter full name" />
                    <FormHelperText>Please enter your full name</FormHelperText>
                  </Grid>
                </Grid>
              </CardContent>
              <Divider />
              <CardActions>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end', width: 1 }}>
                  <Grid>
                    <Button variant="contained" color="secondary">
                      Submit
                    </Button>
                  </Grid>
                  <Grid>
                    <Button variant="outlined">Clear</Button>
                  </Grid>
                </Grid>
              </CardActions>
            </MainCard>
          </Grid>
          <Grid size={12}>
            <MainCard title="Horizontal Form" content={false}>
              <CardContent>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid sx={{ pt: { xs: 2, sm: '0 !important' } }} size={{ xs: 12, sm: 3, lg: 4 }}>
                    <InputLabel horizontal sx={{ textAlign: { xs: 'left', sm: 'right' }, mt: -2.5 }}>
                      Name :
                    </InputLabel>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 9, lg: 8 }}>
                    <TextField fullWidth placeholder="Enter full name" />
                    <FormHelperText>Please enter your full name</FormHelperText>
                  </Grid>
                </Grid>
              </CardContent>
              <Divider />
              <CardActions>
                <Grid container spacing={2} sx={{ alignItems: 'center', width: 1 }}>
                  <Grid size={{ xs: 12, lg: 4 }} />
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Grid container spacing={2} sx={{ alignItems: 'center', width: 1 }}>
                      <Grid>
                        <Button variant="contained" color="secondary">
                          Submit
                        </Button>
                      </Grid>
                      <Grid>
                        <Button variant="outlined">Clear</Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardActions>
            </MainCard>
          </Grid>
          <Grid size={12}>
            <MainCard title="Top & Bottom Actions Bars" content={false}>
              <CardActions>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', width: 1 }}>
                  <Grid>
                    <Typography variant="h5" sx={{ m: 0 }}>
                      Top Actions
                    </Typography>
                  </Grid>
                  <Grid>
                    <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Grid>
                        <Button variant="outlined" color="error">
                          Delete
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardActions>
              <Divider />
              <CardContent>
                <InputLabel>Name</InputLabel>
                <TextField fullWidth placeholder="Enter full name" />
                <FormHelperText>Please enter your full name</FormHelperText>
              </CardContent>
              <Divider />
              <CardActions>
                <Grid container spacing={2} sx={{ alignItems: 'center', width: 1 }}>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                      <Grid>
                        <Button variant="contained" color="secondary">
                          Submit
                        </Button>
                      </Grid>
                      <Grid>
                        <Button variant="outlined">Clear</Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardActions>
            </MainCard>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
