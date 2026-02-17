import { useEffect, useState } from 'react';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// third party
import Chart from 'react-apexcharts';

// project imports
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';

// chart data
import chartData from '../chart-data/revenue-bar-chart';

// assets
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const status = [
  { value: 'month', label: 'This Month' },
  { value: 'today', label: 'Today' },
  { value: 'year', label: 'This Year' }
];

// ==============================|| REVENUE BAR CHART ||============================== //

interface TotalGrowthBarChartProps {
  isLoading: boolean;
}

export default function RevenueBarChart({ isLoading }: TotalGrowthBarChartProps) {
  const theme = useTheme();
  const { mode } = useConfig();

  const [value, setValue] = useState('month');
  const [chartConfig, setChartConfig] = useState(chartData);

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;
  const grey500 = theme.palette.grey[500];

  const secondaryMain = theme.palette.primary.main;
  const secondaryLight = theme.palette.primary.light;

  useEffect(() => {
    setChartConfig((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [secondaryMain, secondaryLight],
        xaxis: {
          ...prevState.options?.xaxis,
          labels: {
            style: { colors: primary }
          }
        },
        yaxis: {
          ...prevState.options?.yaxis,
          labels: {
            style: { colors: primary }
          }
        },
        grid: { ...prevState.options?.grid, borderColor: divider },
        tooltip: { theme: mode },
        legend: { ...prevState.options?.legend, labels: { colors: grey500 } }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  if (isLoading) return <SkeletonTotalGrowthBarChart />;

  return (
    <MainCard>
      <Grid container spacing={{ xs: 2.5, sm: 1.5 }}>
        <Grid size={12}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 1 }}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack spacing={0.5}>
              <Typography sx={{ color: 'grey.600', fontSize: '1rem' }}>Total Revenue Trends</Typography>
              <Typography variant="h1">$999.00</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                id="standard-select-currency"
                select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                sx={{
                  '& .MuiSelect-outlined': {
                    borderRadius: theme.shape.borderRadius / 2
                  },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: theme.shape.borderRadius / 2
                  },
                  '& .MuiOutlinedInput-input': {
                    py: 1,
                    px: 1.5,
                    color: mode === ThemeMode.DARK ? 'grey.600' : 'grey.900'
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderRadius: theme.shape.borderRadius / 2,
                    borderColor: 'divider'
                  }
                }}
              >
                {status.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                sx={{
                  borderRadius: theme.shape.borderRadius / 2,
                  py: 0.5,
                  px: 1.25,
                  ml: 1,
                  borderColor: 'divider',
                  color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900'
                }}
                endIcon={<OpenInNewIcon color="disabled" sx={{ fontSize: 18 }} />}
              >
                Export
              </Button>
            </Stack>
          </Stack>
        </Grid>
        <Grid
          sx={{
            ...theme.applyStyles('light', {
              '& .apexcharts-series:nth-of-type(2) path:hover': {
                filter: `brightness(0.95)` /* Darken the bar */,
                transition: 'all 0.3s ease' /* Smooth transition */
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
          size={12}
        >
          <Chart {...chartConfig} />
        </Grid>
      </Grid>
    </MainCard>
  );
}
