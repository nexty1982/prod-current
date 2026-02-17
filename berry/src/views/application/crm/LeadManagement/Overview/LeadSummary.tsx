import { useState } from 'react';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// third party
import ReactApexChart, { Props as ChartProps } from 'react-apexcharts';

// project imports
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';

import { gridSpacing } from 'store/constant';

// assets
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import TrendingDownTwoToneIcon from '@mui/icons-material/TrendingDownTwoTone';

const status = [
  {
    value: 'month',
    label: 'This Month'
  },
  {
    value: 'today',
    label: 'Today'
  },
  {
    value: 'year',
    label: 'This Year'
  }
];

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

// ==============================|| LEAD SUMMARY - CHART ||============================== //

export default function LeadSummary({ isLoading }: { isLoading: boolean }) {
  const theme = useTheme();
  const { mode } = useConfig();

  const [value, setValue] = useState('today');
  const [tabValue, setTabValue] = useState(0);
  const [series, setSeries] = useState([
    {
      name: 'Cashflow',
      type: 'column',
      data: [300, 200, 150, 200, 250, 250, 200, 250, 260, 110]
    },
    {
      name: 'Revenue',
      type: 'line',
      data: [0, 220, 60, 120, 60, 250, 60, 60, 0, 50]
    }
  ]);

  const { primary } = theme.palette.text;
  const primaryMain = theme.palette.primary.main;
  const primaryLight = mode === ThemeMode.DARK ? alpha(theme.palette.primary.dark, 0.3) : theme.palette.primary.light;
  const secondaryMain = theme.palette.secondary.main;
  const secondaryLight = mode === ThemeMode.DARK ? alpha(theme.palette.secondary.dark, 0.3) : theme.palette.secondary.light;
  const errorMain = theme.palette.error.main;
  const errorLight = mode === ThemeMode.DARK ? alpha(theme.palette.error.dark, 0.3) : alpha(theme.palette.error.light, 0.5);
  const warningMain = theme.palette.warning.main;
  const warningLight = mode === ThemeMode.DARK ? alpha(theme.palette.warning.dark, 0.2) : theme.palette.warning.light;
  const darkLight = theme.palette.dark.light;
  const grey200 = theme.palette.grey[200];

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    switch (newValue) {
      case 0:
        setSeries([
          {
            name: 'Cashflow',
            type: 'column',
            data: [300, 200, 150, 210, 250, 220, 160, 250, 260, 110]
          },
          {
            name: 'Revenue',
            type: 'line',
            data: [0, 220, 60, 120, 60, 250, 60, 60, 0, 50]
          }
        ]);
        break;
      case 1:
        setSeries([
          {
            name: 'Cashflow',
            type: 'column',
            data: [280, 180, 130, 160, 210, 230, 200, 260, 240, 160]
          },
          {
            name: 'Revenue',
            type: 'line',
            data: [0, 130, 40, 110, 30, 210, 45, 54, 30, 60]
          }
        ]);
        break;
      case 2:
        setSeries([
          {
            name: 'Cashflow',
            type: 'column',
            data: [260, 160, 110, 190, 280, 250, 180, 230, 225, 140]
          },
          {
            name: 'Revenue',
            type: 'line',
            data: [0, 185, 50, 145, 50, 260, 55, 35, 0, 45]
          }
        ]);
        break;
      case 3:
      default:
        setSeries([
          {
            name: 'Cashflow',
            type: 'column',
            data: [240, 140, 90, 200, 240, 270, 195, 210, 220, 170]
          },
          {
            name: 'Revenue',
            type: 'line',
            data: [0, 190, 63, 125, 25, 275, 75, 68, 90, 70]
          }
        ]);
        break;
    }
  };

  let color;

  switch (tabValue) {
    case 0:
      color = [primaryLight, primaryMain];
      break;
    case 1:
      color = [secondaryLight, secondaryMain];
      break;
    case 2:
      color = [errorLight, errorMain];
      break;
    case 3:
    default:
      color = [warningLight, warningMain];
      break;
  }

  const mixedChartOptions = {
    colors: color,
    chart: {
      height: 350,
      type: 'line',
      toolbar: {
        show: false
      }
    },
    stroke: {
      width: [0, 4]
    },
    states: {
      hover: { filter: { type: 'none' } }
    },
    legend: {
      show: false
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '30%'
      }
    },
    grid: {
      borderColor: mode === ThemeMode.DARK ? alpha(darkLight, 0.2) : grey200
    },
    tooltip: {
      theme: mode
    },
    dataLabels: {
      enabled: false,
      enabledOnSeries: [1]
    },
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    xaxis: {
      type: 'month',
      labels: {
        style: { colors: primary }
      }
    },
    yaxis: {
      labels: {
        style: { colors: primary }
      }
    }
  };

  if (isLoading) return <SkeletonTotalGrowthBarChart />;

  return (
    <MainCard>
      <Grid container spacing={gridSpacing} rowSpacing={2.5}>
        <Grid size={12}>
          <Typography variant="h3" sx={{ fontWeight: 500 }}>
            Lead Summary
          </Typography>
        </Grid>
        <Grid size={12}>
          <Tabs
            value={tabValue}
            variant="scrollable"
            onChange={handleChange}
            sx={{
              '& .MuiTab-root': {
                minHeight: 'auto',
                minWidth: 10,
                py: 1.5,
                px: 1,
                mr: 2.2,
                color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900'
              },
              '& .Mui-selected': {
                color: 'primary.main'
              },
              '& .MuiTab-root > svg': {
                mb: '1px !important',
                mr: 1.1
              }
            }}
          >
            <Tab label="Customer" {...a11yProps(0)} iconPosition="start" icon={<PersonOutlinedIcon sx={{ fontSize: '1.3rem' }} />} />
            <Tab
              label="Complete"
              {...a11yProps(1)}
              iconPosition="start"
              icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: '1.3rem' }} />}
            />
            <Tab label="Loss Lead" {...a11yProps(2)} iconPosition="start" icon={<TrendingDownTwoToneIcon sx={{ fontSize: '1.3rem' }} />} />
            <Tab label="New Lead" {...a11yProps(2)} iconPosition="start" icon={<PersonAddAlt1OutlinedIcon sx={{ fontSize: '1.3rem' }} />} />
          </Tabs>
        </Grid>
        <Grid size={12}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: '500' }}>
                Total Growth
              </Typography>
              <Typography variant="h3">$2324.00</Typography>
            </Stack>
            <TextField
              id="standard-select-currency"
              select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-input': {
                  borderRadius: 1.5,
                  py: 1,
                  px: 1.5
                }
              }}
            >
              {status.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Grid>
        <Grid
          size={12}
          sx={{
            ...theme.applyStyles('light', {
              '& .apexcharts-series:nth-of-type(1) path:hover': {
                filter: `brightness(0.95)` /* Darken the bar */,
                transition: 'all 0.3s ease' /* Smooth transition */
              }
            })
          }}
        >
          <ReactApexChart options={mixedChartOptions as ChartProps} series={series} height={350} type="line" />
        </Grid>
      </Grid>
    </MainCard>
  );
}
