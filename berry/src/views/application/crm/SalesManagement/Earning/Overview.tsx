import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// third party
import Chart, { Props as ChartProps } from 'react-apexcharts';

// project imports
import useConfig from 'hooks/useConfig';
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// chart options
const chartData: ChartProps = {
  height: 480,
  type: 'bar',
  options: {
    chart: {
      id: 'bar-chart',
      toolbar: {
        show: true
      },
      zoom: {
        enabled: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%'
      }
    },
    xaxis: {
      type: 'category',
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    legend: { show: false },
    fill: { type: 'solid' },
    dataLabels: { enabled: false },
    grid: { show: true }
  },
  series: [
    {
      name: 'Investment',
      data: [40, 110, 85, 20, 94, 95, 64, 104, 75, 80, 29, 15]
    },
    {
      name: 'Maintenance',
      data: [102, 103, 25, 85, 90, 90, 85, 40, 40, 48, 68, 25]
    },
    {
      name: 'Loss',
      data: [70, 52, 72, 50, 60, 40, 95, 86, 67, 41, 19, 9]
    }
  ]
};

const widget = [
  {
    name: 'Total Investment',
    number: 586,
    color: 'secondary.dark'
  },
  {
    name: 'Total Maintenance',
    number: 256,
    color: 'secondary.200'
  },
  {
    name: 'Total Loss',
    number: 256,
    color: 'secondary.light'
  }
];

interface SalesChartProps {
  isLoading: boolean;
}

// ==============================|| EARNING OVERVIEW ||============================== //

export default function Overview({ isLoading }: SalesChartProps) {
  const theme = useTheme();
  const { container, mode } = useConfig();

  const [chartConfig, setChartConfig] = useState(chartData);

  const { secondary } = theme.palette.text;
  const divider = theme.palette.divider;
  const grey500 = theme.palette.grey[500];

  const secondary200 = theme.palette.secondary[200];
  const secondaryDark = theme.palette.secondary.dark;
  const secondaryLight = theme.palette.secondary.light;

  useEffect(() => {
    setChartConfig((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [secondaryDark, secondary200, secondaryLight],
        xaxis: {
          ...prevState.options?.xaxis,
          labels: {
            style: { colors: secondary }
          }
        },
        yaxis: {
          labels: {
            style: { colors: secondary }
          }
        },
        grid: { ...prevState.options?.grid, borderColor: divider },
        tooltip: { theme: mode },
        legend: { ...prevState.options?.legend, labels: { colors: grey500 } }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  if (isLoading) return null;

  return (
    <MainCard content={false}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 5 } }}>
        <Grid container spacing={1}>
          <Grid size={12}>
            <Typography variant="h3" sx={{ fontWeight: 500 }}>
              Earning Report
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, lg: container ? 3 : 2 }}>
            <Stack spacing={2} sx={{ mt: 2, justifyContent: 'center', textAlign: 'center' }}>
              <SubCard
                sx={{
                  bgcolor: divider,
                  ...theme.applyStyles('dark', { bgcolor: 'background.default' }),
                  height: { lg: 380, xs: 179 },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  textAlign: 'center'
                }}
              >
                <Stack spacing={1}>
                  <Typography sx={{ fontSize: 16, color: 'text.secondary' }}>Your earning this month</Typography>
                  <Typography variant="h3" sx={{ fontSize: 34, fontWeight: 700 }}>
                    $586
                  </Typography>
                </Stack>
                <Button variant="contained" sx={{ mt: 3 }}>
                  Withdraw all earnings
                </Button>
              </SubCard>
            </Stack>
          </Grid>
          <Grid sx={{ '& .apexcharts-menu-icon': { display: 'none' } }} size={{ xs: 12, lg: container ? 9 : 10 }}>
            <Chart {...chartConfig} height={320} />
            <Grid container sx={{ justifyContent: { xs: 'center', sm: 'flex-end' } }} size={12}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                {widget.map((item, index) => (
                  <Stack
                    key={index}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      p: '10px 20px',
                      borderRadius: '12px'
                    }}
                    spacing={1}
                    direction="row"
                  >
                    <FiberManualRecordIcon fontSize="small" sx={{ color: item.color }} />
                    <Stack spacing={0.5}>
                      <Typography variant="h6" sx={{ color: 'grey.500' }}>
                        {item.name}
                      </Typography>
                      <Typography variant="h4" sx={{ color: 'grey.900', fontWeight: 500 }}>
                        ${item.number}
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </MainCard>
  );
}
