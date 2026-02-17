import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// third party
import { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';

// project imports
import useConfig from 'hooks/useConfig';
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';

// assets
import MenuIcon from '@mui/icons-material/Menu';

// chart options
const chartData: ApexOptions = {
  chart: {
    type: 'bar',
    stacked: true,
    toolbar: { show: true },
    zoom: { enabled: true }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '40%'
    }
  },
  xaxis: {
    type: 'category',
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  legend: { show: false },
  fill: {
    type: 'solid'
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: true
  }
};

const widgetData = [
  { number: '200', label: 'Conversion Rate' },
  { number: '120', label: 'Average Deal' },
  { number: '234', label: 'Sales Target' }
];

const series = [
  { name: 'Investment', data: [50, 105, 80, 50, 70, 80, 80] },
  { name: 'Loss', data: [50, 55, 30, 50, 140, 80, 40] },
  { name: 'Maintenance', data: [50, 150, 120, 110, 180, 150, 130] }
];

// ==============================|| SALE PERFORMANCE - CHART ||============================== //

export default function SalesPerformance({ isLoading }: { isLoading: boolean }) {
  const theme = useTheme();
  const { mode } = useConfig();

  const [chartOptions, setChartOptions] = useState(chartData);

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;

  const primary200 = theme.palette.primary[200];
  const primaryDark = theme.palette.primary.dark;
  const secondaryLight = theme.palette.secondary.light;

  useEffect(() => {
    setChartOptions((prevState) => ({
      ...prevState,
      colors: [primary200, primaryDark, secondaryLight],
      xaxis: {
        ...prevState.xaxis,
        labels: { style: { colors: primary } }
      },
      yaxis: {
        labels: { style: { colors: primary } }
      },
      grid: { ...prevState.grid, borderColor: divider },
      tooltip: { theme: mode }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  if (isLoading) return <SkeletonTotalGrowthBarChart />;

  return (
    <MainCard>
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h3" sx={{ fontWeight: 500 }}>
              Sales Performance
            </Typography>
            <IconButton>
              <MenuIcon />
            </IconButton>
          </Stack>
        </Grid>
        <Grid container size={12} spacing={2.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          {widgetData.map((data, index) => (
            <Grid key={index} size={{ xs: 12, sm: 4 }}>
              <SubCard sx={{ bgcolor: 'grey.100', ...theme.applyStyles('dark', { bgcolor: 'background.default' }) }}>
                <Stack spacing={1}>
                  <Typography variant="h3">{data.number}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 400 }}>
                    {data.label}
                  </Typography>
                </Stack>
              </SubCard>
            </Grid>
          ))}
        </Grid>
        <Grid
          size={12}
          sx={{
            ...theme.applyStyles('light', {
              '& .apexcharts-series:nth-of-type(3) path:hover': {
                filter: `brightness(0.95)` /* Darken the bar */,
                transition: 'all 0.3s ease' /* Smooth transition */
              }
            }),
            pt: '0px !important',
            '& .apexcharts-menu-icon': { display: 'none' }
          }}
        >
          <Chart options={chartOptions} series={series} height={320} type="bar" />
        </Grid>
      </Grid>
    </MainCard>
  );
}
