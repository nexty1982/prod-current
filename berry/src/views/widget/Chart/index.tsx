import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';

// project imports
import MarketSaleChartCard from './MarketSaleChartCard';
import RevenueChartCard from './RevenueChartCard';
import ConversionsChartCard from './ConversionsChartCard';
import SatisfactionChartCard from './SatisfactionChartCard';

import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import TotalLineChartCard from 'ui-component/cards/TotalLineChartCard';
import SeoChartCard from 'ui-component/cards/SeoChartCard';
import SalesLineChartCard from 'ui-component/cards/SalesLineChartCard';
import AnalyticsChartCard from 'ui-component/cards/AnalyticsChartCard';
import { gridSpacing } from 'store/constant';

// chart data
import chartData from './chart-data';

// assets
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ImportantDevicesIcon from '@mui/icons-material/ImportantDevices';
import PhonelinkLockIcon from '@mui/icons-material/PhonelinkLock';
import TabletAndroidIcon from '@mui/icons-material/TabletAndroid';
import LaptopIcon from '@mui/icons-material/Laptop';

// ================================|| CHART ||================================ //

export default function Chart() {
  const theme = useTheme();
  const { mode } = useConfig();

  const [marketSalechartConfig, setMarketSaleChartConfig] = useState(chartData.MarketChartCardData);
  const [revenueChartConfig, setRevenueChartConfig] = useState(chartData.RevenueChartCardData);
  const [seoChart1Config, setSeoChart1Config] = useState(chartData.SeoChartCardData1);
  const [seoChart2Config, setSeoChart2Config] = useState(chartData.SeoChartCardData2);
  const [seoChart3Config, setSeoChart3Config] = useState(chartData.SeoChartCardData3);
  const [seoChart4Config, setSeoChart4Config] = useState(chartData.SeoChartCardData4);
  const [seoChart5Config, setSeoChart5Config] = useState(chartData.SeoChartCardData5);
  const [seoChart6Config, setSeoChart6Config] = useState(chartData.SeoChartCardData6);
  const [seoChart7Config, setSeoChart7Config] = useState(chartData.SeoChartCardData7);
  const [seoChart8Config, setSeoChart8Config] = useState(chartData.SeoChartCardData8);
  const [seoChart9Config, setSeoChart9Config] = useState(chartData.SeoChartCardData9);
  const [analyticsChartConfig, setAnalyticsChartConfig] = useState(chartData.AnalyticsChartCardData);
  const [conversionsChartConfig, setConversionsChartConfig] = useState(chartData.ConversionsChartCardData);
  const [satisfactionChartConfig, setSatisfactionChartConfig] = useState(chartData.SatisfactionChartCardData);

  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const backColor = theme.palette.background.paper;
  const secondary = theme.palette.secondary.main;
  const error = theme.palette.error.main;
  const primary = theme.palette.primary.main;
  const successDark = theme.palette.success.dark;
  const orange = theme.palette.orange.main;
  const orangeDark = theme.palette.orange.dark;

  useEffect(() => {
    setMarketSaleChartConfig((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [secondary, error, primary],
        tooltip: { theme: mode }
      }
    }));

    setRevenueChartConfig((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [error, primary, secondary],
        stroke: { colors: [backColor] }
      }
    }));

    setSeoChart1Config((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [primary],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setSeoChart2Config((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [successDark],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setSeoChart3Config((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [error],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setSeoChart4Config((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [orange],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setSeoChart5Config((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [secondary],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setSeoChart6Config((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [error],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setSeoChart7Config((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [secondary],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setSeoChart8Config((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [primary],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setSeoChart9Config((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [successDark],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setAnalyticsChartConfig((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [primary, successDark, error, orangeDark],
        tooltip: { theme: mode }
      }
    }));

    setConversionsChartConfig((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        colors: [secondary],
        tooltip: { ...prevState.options?.tooltip, theme: mode }
      }
    }));

    setSatisfactionChartConfig((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        theme: { monochrome: { color: orangeDark, enabled: true } },
        stroke: { colors: [backColor] }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
            .apexcharts-tooltip {
                color: ${mode === ThemeMode.DARK ? theme.palette.common.white : theme.palette.common.black} !important;
                background-color: ${theme.palette.background.paper} !important;
            }
        `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, [mode, theme.palette]);

  if (isLoading) return null;

  return (
    <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <TotalLineChartCard chartData={chartData.TotalLineCardChart1} value={4000} title="Total Sales" percentage="42%" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <TotalLineChartCard
          chartData={chartData.TotalLineCardChart2}
          bgColor={theme.palette.error.main}
          value={2500}
          title="Total Comment"
          percentage="15%"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <TotalLineChartCard
          chartData={chartData.TotalLineCardChart3}
          bgColor={theme.palette.success.dark}
          value={2500}
          title="Total Status"
          percentage="95%"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <TotalLineChartCard
          chartData={chartData.TotalLineCardChart3}
          bgColor={theme.palette.secondary.main}
          value={12500}
          title="Total Visitors"
          percentage="75%"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 7 }}>
        <MarketSaleChartCard chartData={marketSalechartConfig} />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 5 }}>
        <RevenueChartCard chartData={revenueChartConfig} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <SeoChartCard type={1} chartData={seoChart4Config} value={798} title="Users" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <SeoChartCard type={1} chartData={seoChart5Config} value={486} title="Timeout" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <SeoChartCard type={1} chartData={seoChart6Config} value="9, 454" title="Views" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <SeoChartCard type={1} chartData={seoChart7Config} value={7.15} title="Session" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <SeoChartCard type={1} chartData={seoChart8Config} value="04:30" title="Avg. Session" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
        <SeoChartCard type={1} chartData={seoChart9Config} value="1.55%" title="Bounce Rate" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <SalesLineChartCard
          chartData={chartData.SalesLineCardChart}
          bgColor={theme.palette.error.main}
          title="Sales Per Day"
          percentage="3%"
          icon={<TrendingDownIcon />}
          footerData={[
            {
              value: '$4230',
              label: 'Total Revenue'
            },
            {
              value: '321',
              label: 'Today Sales'
            }
          ]}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <SalesLineChartCard
          chartData={chartData.SalesLineCardChart}
          title="Order Per Month"
          percentage="28%"
          icon={<TrendingDownIcon />}
          footerData={[
            {
              value: '1695',
              label: 'Total Orders'
            },
            {
              value: '321',
              label: 'Today Orders'
            }
          ]}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 12, lg: 4 }}>
        <AnalyticsChartCard
          chartData={analyticsChartConfig}
          title="Page view by device"
          dropData={{
            title: 'Weekly',
            options: [
              {
                value: 1,
                label: '1 Week'
              },
              {
                value: 104,
                label: '2 Years'
              },
              {
                value: 12,
                label: '3 Monthes'
              }
            ]
          }}
          listData={[
            {
              color: theme.palette.primary.main,
              icon: <ImportantDevicesIcon color="inherit" fontSize="small" />,
              value: 66.6,
              percentage: 2,
              state: 1
            },
            {
              color: theme.palette.success.dark,
              icon: <PhonelinkLockIcon color="inherit" fontSize="small" />,
              value: 29.7,
              percentage: 3,
              state: 1
            },
            {
              color: theme.palette.error.main,
              icon: <TabletAndroidIcon color="inherit" fontSize="small" />,
              value: 32.8,
              percentage: 8,
              state: 0
            },
            {
              color: theme.palette.orange.dark,
              icon: <LaptopIcon color="inherit" fontSize="small" />,
              value: 50.2,
              percentage: 5,
              state: 1
            }
          ]}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <SeoChartCard chartData={seoChart1Config} value="$16,756" title="Visits" icon={<ArrowDropDownIcon color="error" />} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <SeoChartCard chartData={seoChart2Config} value="49.54%" title="Bounce Rate" icon={<ArrowDropUpIcon color="primary" />} />
      </Grid>
      <Grid size={{ xs: 12, sm: 12, lg: 4 }}>
        <SeoChartCard chartData={seoChart3Config} value="1,62,564" title="Products" icon={<ArrowDropDownIcon color="error" />} />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 6 }}>
        <ConversionsChartCard chartData={conversionsChartConfig} />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 6 }}>
        <SatisfactionChartCard chartData={satisfactionChartConfig} />
      </Grid>
    </Grid>
  );
}
