// material-ui
import { styled } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

// project imports
import SubCard from 'ui-component/cards/SubCard';

// assets
import banner from 'assets/images/profile/profile-back-10.png';

// styled constant
const BannerImg = styled('img')({
  margin: 'auto',
  display: 'block',
  maxWidth: '100%',
  maxHeight: '100%'
});

// ===============================|| GRID - COMPLEX ||=============================== //

export default function ComplexGrid() {
  return (
    <SubCard content={false} sx={{ p: 2, margin: 'auto', maxWidth: 500, flexGrow: 1 }}>
      <Grid container spacing={2}>
        <Grid>
          <ButtonBase sx={{ width: { xs: '100%', sm: 200 } }}>
            <BannerImg alt="complex" src={banner} />
          </ButtonBase>
        </Grid>
        <Grid container size={{ xs: 12, sm: 'grow' }}>
          <Grid container direction="column" spacing={2} size="grow">
            <Grid size="grow">
              <Typography gutterBottom variant="subtitle1">
                Standard license
              </Typography>
              <Typography variant="body2" gutterBottom>
                Full resolution 1920x1080 • JPEG
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                ID: 1030114
              </Typography>
            </Grid>
            <Grid>
              <Typography sx={{ cursor: 'pointer' }} variant="body2" color="error">
                Remove
              </Typography>
            </Grid>
          </Grid>
          <Grid>
            <Typography variant="subtitle1">$19.00</Typography>
          </Grid>
        </Grid>
      </Grid>
    </SubCard>
  );
}
