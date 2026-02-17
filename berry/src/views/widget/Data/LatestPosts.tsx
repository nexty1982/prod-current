// material-ui
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import Dashboard1 from 'assets/images/widget/dashboard-1.jpg';
import Dashboard2 from 'assets/images/widget/dashboard-2.jpg';

const mediaSX = {
  width: 90,
  height: 80,
  borderRadius: '12px'
};

// ===========================|| DATA WIDGET - LATEST POSTS CARD ||=========================== //

export default function LatestPosts() {
  return (
    <MainCard title="Latest Posts" content={false}>
      <CardContent>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid>
                <CardMedia component="img" image={Dashboard1} title="image" sx={mediaSX} />
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="subtitle1">Up unpacked friendly</Typography>
                    <Typography variant="caption">Video | 14 minutes ago</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid>
                <CardMedia component="iframe" src="https://www.youtube.com/embed/668nUCeBHyY" title="image" sx={mediaSX} />
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="subtitle1">Up unpacked friendly</Typography>
                    <Typography variant="caption">Video | 14 minutes ago</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid>
                <CardMedia component="img" image={Dashboard2} title="image" sx={mediaSX} />
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="subtitle1">Up unpacked friendly</Typography>
                    <Typography variant="caption">Video | 14 minutes ago</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button variant="text" size="small">
          View Friend List
        </Button>
      </CardActions>
    </MainCard>
  );
}
