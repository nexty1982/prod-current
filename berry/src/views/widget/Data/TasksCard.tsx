import { Link as RouterLink } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import QueryBuilderOutlinedIcon from '@mui/icons-material/QueryBuilderOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';

// ==============================|| DATA WIDGET - TASKS CARD ||============================== //

export default function TasksCard() {
  const theme = useTheme();
  return (
    <MainCard title="Tasks" content={false}>
      <CardContent>
        <Grid
          container
          spacing={gridSpacing}
          sx={{
            alignItems: 'center',
            position: 'relative',

            '&>*': {
              position: 'relative',
              zIndex: '5'
            },

            '&:after': {
              content: '""',
              position: 'absolute',
              top: -24,
              left: 20,
              width: '1px',
              height: '100%',
              bgcolor: 'divider',
              zIndex: '1'
            }
          }}
        >
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Avatar color="success" size="sm" sx={{ top: 10 }}>
                  <ThumbUpAltOutlinedIcon style={{ color: theme.palette.common.white }} />
                </Avatar>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={0}>
                  <Grid size={12}>
                    <Typography variant="caption">8:50</Typography>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="body2">You’re getting more and more followers, keep it up!</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Avatar color="primary" size="sm" sx={{ top: 10 }}>
                  <QueryBuilderOutlinedIcon style={{ color: theme.palette.common.white }} />
                </Avatar>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={0}>
                  <Grid size={12}>
                    <Typography variant="caption">Sat, 5 Mar</Typography>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="body2">Design mobile Application</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Avatar color="error" size="sm" sx={{ top: 10 }}>
                  <BugReportOutlinedIcon style={{ color: theme.palette.common.white }} />
                </Avatar>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={0}>
                  <Grid size={12}>
                    <Typography variant="caption">Sun, 17 Feb</Typography>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="body2">
                      <Link component={RouterLink} to="#" underline="hover">
                        Jenny
                      </Link>{' '}
                      assign you a task{' '}
                      <Link component={RouterLink} to="#" underline="hover">
                        Mockup Design
                      </Link>
                      .
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Avatar color="warning" size="sm" sx={{ top: 10 }}>
                  <ErrorOutlineOutlinedIcon style={{ color: theme.palette.common.white }} />
                </Avatar>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={0}>
                  <Grid size={12}>
                    <Typography variant="caption">Sat, 18 Mar</Typography>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="body2">Design logo</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Avatar color="success" size="sm" sx={{ top: 10 }}>
                  <ThumbUpAltOutlinedIcon style={{ color: theme.palette.common.white }} />
                </Avatar>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={0}>
                  <Grid size={12}>
                    <Typography variant="caption">Sat, 22 Mar</Typography>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="body2">Design mobile Application</Typography>
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
          View all Projects
        </Button>
      </CardActions>
    </MainCard>
  );
}
