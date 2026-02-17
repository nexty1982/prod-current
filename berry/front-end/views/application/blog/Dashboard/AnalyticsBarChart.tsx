import { MouseEvent, SyntheticEvent, useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import Chart from 'react-apexcharts';

// project imports
import { ThemeDirection, ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';

// chart data
import barChartOptions from '../chart-data/analytics-bar-charts';

// assets
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';

// ==============================|| ANALYTICS BAR CHART ||============================== //

interface TotalGrowthBarChartProps {
  isLoading: boolean;
}

export default function AnalyticsBarChart({ isLoading }: TotalGrowthBarChartProps) {
  const theme = useTheme();
  const downSM = useMediaQuery(theme.breakpoints.down('sm'));
  const { mode, borderRadius, themeDirection } = useConfig();

  const [tabValue, setTabValue] = useState(1);
  const [chartOptions, setChartOptions] = useState(barChartOptions);
  const [series, setSeries] = useState([
    {
      name: 'Blog views',
      data: [0, 0, 0, 0, 6, 7, 10, 18, 10, 12, 0, 14, 11, 7, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 12, 6, 4, 2]
    },
    {
      name: 'None',
      data: [4, 16, 7, 7, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 22, 6, 11, 7, 3, 4, 6, 8, 10, 8, 0, 0, 0, 0, 0]
    }
  ]);

  const { primary } = theme.palette.text;
  const dividerDark = theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[900] : theme.palette.divider;

  const grey500 = theme.palette.grey[500];
  const primaryMain = theme.palette.primary.main;

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    switch (newValue) {
      case 0:
        setSeries([
          {
            name: 'Blog views',
            data: [0, 5, 0, 0, 0, 8, 0, 0, 3, 0, 7, 0, 0, 0, 9, 0, 0, 0, 13, 0, 12, 0, 0, 0, 0, 0, 0, 6, 11, 0]
          },
          {
            name: 'None',
            data: [12, 0, 8, 4, 5, 0, 7, 10, 0, 6, 0, 9, 11, 14, 0, 7, 5, 8, 0, 2, 0, 4, 8, 10, 6, 5, 9, 0, 0, 3]
          }
        ]);
        break;
      case 1:
        setSeries([
          {
            name: 'Blog views',
            data: [0, 0, 0, 0, 6, 7, 10, 18, 10, 12, 0, 14, 11, 7, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 12, 6, 4, 2]
          },
          {
            name: 'None',
            data: [4, 16, 7, 7, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 22, 6, 11, 7, 3, 4, 6, 8, 10, 8, 0, 0, 0, 0, 0]
          }
        ]);
        break;
      case 2:
      default:
        setSeries([
          {
            name: 'Blog views',
            data: [8, 0, 7, 9, 0, 3, 0, 7, 0, 15, 15, 12, 7, 0, 6, 8, 0, 7, 4, 0, 10, 13, 0, 8, 6, 9, 0, 2, 7, 0]
          },
          {
            name: 'None',
            data: [0, 12, 0, 0, 6, 0, 10, 0, 9, 0, 0, 0, 0, 11, 0, 0, 10, 0, 0, 7, 0, 0, 12, 0, 0, 0, 14, 0, 0, 5]
          }
        ]);
        break;
    }
  };

  useEffect(() => {
    setChartOptions((prevState) => ({
      ...prevState,
      colors: [primaryMain, dividerDark],
      xaxis: {
        ...prevState.xaxis,
        labels: { style: { colors: primary } }
      },
      yaxis: {
        labels: { style: { colors: primary }, offsetX: -10 }
      },
      tooltip: { theme: mode },
      legend: { ...prevState.legend, labels: { colors: grey500 } }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  if (isLoading) return <SkeletonTotalGrowthBarChart />;

  return (
    <MainCard
      title="Analytics Summary"
      secondary={
        <IconButton size="small" onClick={handleClick}>
          <MoreHorizOutlinedIcon fontSize="small" sx={{ opacity: 0.6 }} aria-controls="menu-popular-card" aria-haspopup="true" />
        </IconButton>
      }
      contentSX={{ '&:last-child': { pb: 0 } }}
    >
      <Stack sx={{ gap: 3 }}>
        <SubCard
          content={false}
          sx={{ border: 'none', p: 1.25, bgcolor: 'grey.100', ...theme.applyStyles('dark', { bgcolor: 'background.default' }) }}
        >
          <Box sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              variant={downSM ? 'scrollable' : 'fullWidth'}
              onChange={handleChange}
              sx={{
                '& .MuiTabs-indicator': {
                  display: 'none'
                },
                '& .MuiTab-root': {
                  width: 1,
                  maxWidth: 1,
                  borderBottom: 'none',
                  border: 1,
                  borderColor: mode === ThemeMode.DARK ? 'divider' : 'grey.200',
                  minHeight: 'auto',
                  minWidth: 10,
                  py: 1.5,
                  px: 1,
                  color: theme.palette.mode === 'dark' ? 'grey.600' : 'grey.900',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  borderRadius: `${borderRadius}px`,
                  backgroundColor: theme.palette.mode === 'dark' ? 'dark.main' : 'common.white',
                  '&.Mui-selected': {
                    color: 'common.white',
                    backgroundColor: theme.palette.primary.main,
                    '& .MuiTypography-root': {
                      color: 'common.white'
                    }
                  }
                },
                '& .MuiTabs-flexContainer': {
                  justifyContent: 'space-between',
                  gap: 1.5,
                  borderBottom: 'none',
                  flexDirection: { xs: 'column', sm: 'row' }
                }
              }}
            >
              <Tab
                label={
                  <Stack sx={{ gap: 0.5, alignItems: 'flex-start', p: { xs: 1.5, md: 2 } }}>
                    <Typography variant="h2" color="inherit" sx={{ fontWeight: 900 }}>
                      50
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Views (7 days)
                    </Typography>
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack sx={{ gap: 0.5, alignItems: 'flex-start', p: { xs: 1.5, md: 2 } }}>
                    <Typography variant="h2" color="inherit" sx={{ fontWeight: 900 }}>
                      1230
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Views (30 days)
                    </Typography>
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack sx={{ gap: 0.5, alignItems: 'flex-start', p: { xs: 1.5, md: 2 } }}>
                    <Typography variant="h2" color="inherit" sx={{ fontWeight: 900 }}>
                      20,987
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Views (All time)
                    </Typography>
                  </Stack>
                }
              />
            </Tabs>
          </Box>
        </SubCard>
        <Box sx={{ '& .apexcharts-legend-text': { pl: themeDirection === ThemeDirection.RTL ? 0 : 1 } }}>
          <Chart options={chartOptions} series={series} height={downSM ? 300 : 346} type="bar" />
        </Box>
      </Stack>
      <Menu
        id="menu-popular-card"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        variant="selectedMenu"
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <MenuItem onClick={handleClose}>Today</MenuItem>
        <MenuItem onClick={handleClose}>This Month</MenuItem>
        <MenuItem onClick={handleClose}>This Year </MenuItem>
      </Menu>
    </MainCard>
  );
}
