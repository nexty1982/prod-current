import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import QuickAdd from './QuickAdd';
import { ThemeMode } from 'config';
import SeoChartCard from 'ui-component/cards/SeoChartCard';
import { gridSpacing } from 'store/constant';
import useConfig from 'hooks/useConfig';

// chart data
import chartData from '../chart-data';
import RevenueBarChart from './RevenueBarChart';
import ClientInsights from './ClientInsights';
import RecentActivity from './RecentActivity';
import MainCard from 'ui-component/cards/MainCard';
import SupportHelp from './SupportHelp';

const chartsData = [
  { data: chartData.InvoiceChartCardData1, value: '180', title: 'New' },
  { data: chartData.InvoiceChartCardData2, value: '25,890', title: 'Paid' },
  { data: chartData.InvoiceChartCardData3, value: '3400', title: 'Pending' },
  { data: chartData.InvoiceChartCardData4, value: '55,865', title: 'Overdue' }
];

// ==============================|| INVOICE DASHBOARD PAGE ||============================== //

export default function InvoiceDashBoard() {
  const { mode } = useConfig();

  const [isLoading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
      <Grid size={12}>
        <QuickAdd />
      </Grid>
      {chartsData.map((data, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <MainCard
            border={false}
            content={false}
            sx={{
              '& .apexcharts-tooltip-series-group': {
                bgcolor: mode === ThemeMode.DARK ? 'background.default' : 'background.paper'
              }
            }}
          >
            <SeoChartCard type={1} chartData={data.data} value={data.value} title={data.title} />
          </MainCard>
        </Grid>
      ))}
      <Grid size={12}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, md: 8 }}>
            <RevenueBarChart isLoading={isLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <ClientInsights isLoading={isLoading} />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={12}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, md: 7 }}>
            <RecentActivity isLoading={isLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <SupportHelp isLoading={isLoading} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
