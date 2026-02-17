// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';

// project imports
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import useConfig from 'hooks/useConfig';

// charts
import ApexAreaChart from './ApexAreaChart';
import ApexBarChart from './ApexBarChart';
import ApexColumnChart from './ApexColumnChart';
import ApexLineChart from './ApexLineChart';
import ApexMixedChart from './ApexMixedChart';
import ApexPieChart from './ApexPieChart';
import ApexPolarChart from './ApexPolarChart';
import ApexRedialBarChart from './ApexRedialChart';

// types

// ==============================|| APEX CHARTS ||============================== //

export default function Apexchart() {
  const theme = useTheme();
  const { mode } = useConfig();

  const menuDesign = {
    '& .apexcharts-menu': {
      bgcolor: mode === ThemeMode.DARK ? 'background.default' : 'background.paper',
      ...(mode === ThemeMode.DARK && {
        borderColor: alpha(theme.palette.grey[200], 0.2)
      })
    },
    '.apexcharts-theme-light .apexcharts-menu-item:hover': {
      bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.200'
    },
    '& .apexcharts-theme-light .apexcharts-menu-icon:hover svg, .apexcharts-theme-light .apexcharts-reset-icon:hover svg, .apexcharts-theme-light .apexcharts-selection-icon:not(.apexcharts-selected):hover svg, .apexcharts-theme-light .apexcharts-zoom-icon:not(.apexcharts-selected):hover svg, .apexcharts-theme-light .apexcharts-zoomin-icon:hover svg, .apexcharts-theme-light .apexcharts-zoomout-icon:hover svg':
      {
        fill: theme.palette.mode === ThemeMode.DARK ? alpha(theme.palette.primary.light, 0.3) : theme.palette.grey[400]
      }
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid sx={menuDesign} size={{ xs: 12, md: 6, lg: 6 }}>
        <MainCard title="Column Chart">
          <ApexColumnChart />
        </MainCard>
      </Grid>
      <Grid sx={menuDesign} size={{ xs: 12, md: 6, lg: 6 }}>
        <MainCard title="Bar Chart">
          <ApexBarChart />
        </MainCard>
      </Grid>
      <Grid sx={menuDesign} size={{ xs: 12, md: 6, lg: 4 }}>
        <MainCard title="Line Chart">
          <ApexLineChart />
        </MainCard>
      </Grid>
      <Grid sx={menuDesign} size={{ xs: 12, md: 6, lg: 4 }}>
        <MainCard title="Area Chart">
          <ApexAreaChart />
        </MainCard>
      </Grid>
      <Grid sx={menuDesign} size={{ xs: 12, md: 6, lg: 4 }}>
        <MainCard title="Mixed Chart">
          <ApexMixedChart />
        </MainCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <MainCard title="Redial Chart">
          <ApexRedialBarChart />
        </MainCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <MainCard title="Polar Chart">
          <ApexPolarChart />
        </MainCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <MainCard title="Pie Chart">
          <ApexPieChart />
        </MainCard>
      </Grid>
    </Grid>
  );
}
