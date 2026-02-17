import { useEffect, useState } from 'react';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// third party
import Chart from 'react-apexcharts';

// project imports
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// chart data
import barChartOptions from './chart-data/total-growth-bar-chart';

const status = [
  { value: 'today', label: 'Today' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' }
];

const series = [
  { name: 'Investment', data: [35, 125, 35, 35, 35, 80, 35, 20, 35, 45, 15, 75] },
  { name: 'Loss', data: [35, 15, 15, 35, 65, 40, 80, 25, 15, 85, 25, 75] },
  { name: 'Profit', data: [35, 145, 35, 35, 20, 105, 100, 10, 65, 45, 30, 10] },
  { name: 'Maintenance', data: [0, 0, 75, 0, 0, 115, 0, 0, 0, 0, 150, 0] }
];

// ==============================|| DASHBOARD DEFAULT - TOTAL GROWTH BAR CHART ||============================== //

interface TotalGrowthBarChartProps {
  isLoading: boolean;
}

export default function TotalGrowthBarChart({ isLoading }: TotalGrowthBarChartProps) {
  const theme = useTheme();
  const { mode } = useConfig();

  const [value, setValue] = useState('today');
  const [chartOptions, setChartOptions] = useState(barChartOptions);

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;
  const grey500 = theme.palette.grey[500];

  const primary200 = theme.palette.primary[200];
  const primaryDark = theme.palette.primary.dark;
  const secondaryMain = theme.palette.secondary.main;
  const secondaryLight = theme.palette.secondary.light;

  useEffect(() => {
    setChartOptions((prev) => ({
      ...prev,
      colors: [primary200, primaryDark, secondaryMain, secondaryLight],
      xaxis: {
        ...prev.xaxis,
        labels: { style: { colors: primary } }
      },
      yaxis: {
        labels: { style: { colors: primary } }
      },
      grid: { ...prev.grid, borderColor: divider },
      tooltip: { theme: mode },
      legend: {
        ...prev.legend,
        labels: { ...prev.legend?.labels, colors: grey500 }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  return (
    <>
      {isLoading ? (
        <SkeletonTotalGrowthBarChart />
      ) : (
        <MainCard>
          <Grid container spacing={gridSpacing}>
            <Grid size={12}>
              <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Grid container direction="column" spacing={1}>
                    <Grid>
                      <Typography variant="subtitle2">Total Growth</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="h3">$2,324.00</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid>
                  <TextField id="standard-select-currency" select value={value} onChange={(e) => setValue(e.target.value)}>
                    {status.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Grid>
            <Grid
              size={12}
              sx={{
                ...theme.applyStyles('light', {
                  '& .apexcharts-series:nth-of-type(4) path:hover': {
                    filter: `brightness(0.95)`,
                    transition: 'all 0.3s ease'
                  }
                }),
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
              }}
            >
              <Chart options={chartOptions} series={series} type="bar" height={480} />
            </Grid>
          </Grid>
        </MainCard>
      )}
    </>
  );
}
