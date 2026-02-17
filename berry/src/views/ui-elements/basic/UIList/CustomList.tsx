// material-ui
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// assets
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';

// ================================|| UI LIST - CUSTOM ||================================ //

export default function CustomList() {
  const avatarSuccess = {
    width: 16,
    height: 16,
    borderRadius: '5px',
    bgcolor: 'success.light',
    color: 'success.dark',
    ml: 1.875
  };
  const avatarError = {
    width: 16,
    height: 16,
    borderRadius: '5px',
    bgcolor: 'orange.light',
    color: 'orange.dark',
    ml: 1.875
  };

  return (
    <div>
      <Grid container direction="column">
        <Grid>
          <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid>
              <Typography variant="subtitle1" color="inherit">
                Bajaj Finsery
              </Typography>
            </Grid>
            <Grid>
              <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Typography variant="subtitle1" color="inherit">
                    $1839.00
                  </Typography>
                </Grid>
                <Grid>
                  <Avatar variant="rounded" sx={avatarSuccess}>
                    <KeyboardArrowUpOutlinedIcon fontSize="small" color="inherit" />
                  </Avatar>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid>
          <Typography variant="subtitle2" sx={{ color: 'success.dark' }}>
            10% Profit
          </Typography>
        </Grid>
      </Grid>
      <Divider sx={{ mt: 1.5, mb: 1.5 }} />
      <Grid container direction="column">
        <Grid>
          <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid>
              <Typography variant="subtitle1" color="inherit">
                TTML
              </Typography>
            </Grid>
            <Grid>
              <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Typography variant="subtitle1" color="inherit">
                    $100.00
                  </Typography>
                </Grid>
                <Grid>
                  <Avatar variant="rounded" sx={avatarError}>
                    <KeyboardArrowDownOutlinedIcon fontSize="small" color="inherit" />
                  </Avatar>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid>
          <Typography variant="subtitle2" sx={{ color: 'orange.dark' }}>
            10% loss
          </Typography>
        </Grid>
      </Grid>
      <Divider sx={{ mt: 1.5, mb: 1.5 }} />
      <Grid container direction="column">
        <Grid>
          <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid>
              <Typography variant="subtitle1" color="inherit">
                Reliance
              </Typography>
            </Grid>
            <Grid>
              <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Typography variant="subtitle1" color="inherit">
                    $200.00
                  </Typography>
                </Grid>
                <Grid>
                  <Avatar variant="rounded" sx={avatarSuccess}>
                    <KeyboardArrowUpOutlinedIcon fontSize="small" color="inherit" />
                  </Avatar>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid>
          <Typography variant="subtitle2" sx={{ color: 'success.dark' }}>
            10% Profit
          </Typography>
        </Grid>
      </Grid>
      <Divider sx={{ mt: 1.5, mb: 1.5 }} />
      <Grid container direction="column">
        <Grid>
          <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid>
              <Typography variant="subtitle1" color="inherit">
                TTML
              </Typography>
            </Grid>
            <Grid>
              <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Typography variant="subtitle1" color="inherit">
                    $189.00
                  </Typography>
                </Grid>
                <Grid>
                  <Avatar variant="rounded" sx={avatarError}>
                    <KeyboardArrowDownOutlinedIcon fontSize="small" color="inherit" />
                  </Avatar>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid>
          <Typography variant="subtitle2" sx={{ color: 'orange.dark' }}>
            10% loss
          </Typography>
        </Grid>
      </Grid>
    </div>
  );
}
