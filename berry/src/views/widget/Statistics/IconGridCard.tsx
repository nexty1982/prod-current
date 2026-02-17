// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import LocalMallTwoToneIcon from '@mui/icons-material/LocalMallTwoTone';
import FilterVintageTwoToneIcon from '@mui/icons-material/FilterVintageTwoTone';
import RouterTwoToneIcon from '@mui/icons-material/RouterTwoTone';
import ShareTwoToneIcon from '@mui/icons-material/ShareTwoTone';

// ===========================|| WIDGET STATISTICS - ICON GRID CARD ||=========================== //

export default function IconGridCard() {
  const theme = useTheme();

  const blockSX = {
    p: 2.5,
    borderLeft: '1px solid ',
    borderBottom: '1px solid ',
    borderLeftColor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.200',
    borderBottomColor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.200'
  };

  return (
    <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
      <Grid size={{ xs: 12, sm: 6, lg: 12 }}>
        <MainCard
          sx={{
            '& >div': {
              padding: '0px !important'
            },
            '& svg': {
              width: 45,
              height: 45,
              color: 'secondary.main',
              borderRadius: '14px',
              p: 1.25,
              bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'primary.light'
            }
          }}
        >
          <Grid container spacing={0} sx={{ alignItems: 'center' }}>
            <Grid sx={blockSX} size={{ xs: 12, sm: 6 }}>
              <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'center' } }}>
                <Grid>
                  <ShareTwoToneIcon />
                </Grid>
                <Grid size={{ sm: 'grow' }}>
                  <Typography variant="h5" align="center">
                    1000
                  </Typography>
                  <Typography variant="subtitle2" align="center">
                    SHARES
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid sx={blockSX} size={{ xs: 12, sm: 6 }}>
              <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'center' } }}>
                <Grid>
                  <RouterTwoToneIcon />
                </Grid>
                <Grid size={{ sm: 'grow' }}>
                  <Typography variant="h5" align="center">
                    600
                  </Typography>
                  <Typography variant="subtitle2" align="center">
                    NETWORK
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid container spacing={0} sx={{ alignItems: 'center' }}>
            <Grid sx={blockSX} size={{ xs: 12, sm: 6 }}>
              <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'center' } }}>
                <Grid>
                  <FilterVintageTwoToneIcon />
                </Grid>
                <Grid size={{ sm: 'grow' }}>
                  <Typography variant="h5" align="center">
                    3550
                  </Typography>
                  <Typography variant="subtitle2" align="center">
                    RETURNS
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid sx={blockSX} size={{ xs: 12, sm: 6 }}>
              <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'center' } }}>
                <Grid>
                  <LocalMallTwoToneIcon />
                </Grid>
                <Grid size={{ sm: 'grow' }}>
                  <Typography variant="h5" align="center">
                    100%
                  </Typography>
                  <Typography variant="subtitle2" align="center">
                    ORDER
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </MainCard>
      </Grid>
    </Grid>
  );
}
