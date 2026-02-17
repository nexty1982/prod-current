// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import chartData from '../../chart-data';
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';
import SeoChartCard from 'ui-component/cards/SeoChartCard';
import useConfig from 'hooks/useConfig';

const chartsData = [
  { data: chartData.InvoiceChartCardData1, value: '810', title: 'Total Invoice' },
  { data: chartData.InvoiceChartCardData2, value: '25,890', title: 'Paid' },
  { data: chartData.InvoiceChartCardData3, value: '3400', title: 'Pending' },
  { data: chartData.InvoiceChartCardData4, value: '55,865', title: 'Overdue' }
];

// ==============================|| PAYMENT LIST - OVERVIEW ||============================== //

export default function Overview() {
  const { mode } = useConfig();

  return (
    <MainCard>
      <Grid container spacing={2.5} sx={{ alignItems: 'center' }}>
        <Grid size={12}>
          <Typography variant="h4">Overview</Typography>
        </Grid>
        {chartsData.map((data, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
            <SubCard
              content={false}
              sx={{
                '& .apexcharts-tooltip-series-group': {
                  bgcolor: mode === ThemeMode.DARK ? 'background.default' : 'background.paper'
                }
              }}
            >
              <SeoChartCard type={1} chartData={data.data} value={data.value} title={data.title} />
            </SubCard>
          </Grid>
        ))}
      </Grid>
    </MainCard>
  );
}
