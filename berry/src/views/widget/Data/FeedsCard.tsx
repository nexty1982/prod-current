// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsTwoTone';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartTwoTone';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionTwoTone';

// ==============================|| DATA WIDGET - FEEDS CARD ||============================== //

export default function FeedsCard() {
  const theme = useTheme();

  return (
    <MainCard title="Feeds" content={false}>
      <CardContent>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Grid>
                <Box sx={{ position: 'relative' }}>
                  <Avatar color="primary">
                    <NotificationsNoneOutlinedIcon style={{ color: theme.palette.common.white }} />
                  </Avatar>
                </Box>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size="grow">
                    <Typography variant="body2">You have 3 pending tasks.</Typography>
                  </Grid>
                  <Grid>
                    <Typography variant="caption">Just Now</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Grid>
                <Box sx={{ position: 'relative' }}>
                  <Avatar color="error">
                    <ShoppingCartOutlinedIcon style={{ color: theme.palette.common.white }} />
                  </Avatar>
                </Box>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size="grow">
                    <Typography variant="body2">New order received</Typography>
                  </Grid>
                  <Grid>
                    <Typography variant="caption">Just Now</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Grid>
                <Box sx={{ position: 'relative' }}>
                  <Avatar color="success">
                    <DescriptionOutlinedIcon style={{ color: theme.palette.common.white }} />
                  </Avatar>
                </Box>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size="grow">
                    <Typography variant="body2">You have 3 pending tasks.</Typography>
                  </Grid>
                  <Grid>
                    <Typography variant="caption">Just Now</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Grid>
                <Box sx={{ position: 'relative' }}>
                  <Avatar color="primary">
                    <NotificationsNoneOutlinedIcon style={{ color: theme.palette.common.white }} />
                  </Avatar>
                </Box>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size="grow">
                    <Typography variant="body2">New order received</Typography>
                  </Grid>
                  <Grid>
                    <Typography variant="caption">Just Now</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Grid>
                <Box sx={{ position: 'relative' }}>
                  <Avatar color="warning">
                    <ShoppingCartOutlinedIcon style={{ color: theme.palette.common.white }} />
                  </Avatar>
                </Box>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size="grow">
                    <Typography variant="body2">Order cancelled</Typography>
                  </Grid>
                  <Grid>
                    <Typography variant="caption">Just Now</Typography>
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
          View all Feeds
        </Button>
      </CardActions>
    </MainCard>
  );
}
