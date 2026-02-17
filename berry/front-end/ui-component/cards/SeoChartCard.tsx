import { ReactNode } from 'react';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// third party
import Chart, { Props as ChartProps } from 'react-apexcharts';

// project imports
import MainCard from './MainCard';

// =============================|| SEO CHART CARD ||============================= //

interface SeoChartCardProps {
  chartData: ChartProps;
  value?: string | number;
  title?: string;
  icon?: ReactNode | string;
  type?: number;
}

export default function SeoChartCard({ chartData, value, title, icon, type }: SeoChartCardProps) {
  const downMM = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  return (
    <MainCard content={false} sx={{ p: 2.5 }}>
      <Grid container spacing={1.25} sx={{ justifyContent: 'space-between' }}>
        <Grid size={12}>
          <Stack direction={type === 1 ? 'column-reverse' : 'column'} spacing={type === 1 ? 0.5 : 1}>
            {value && <Typography variant={downMM ? 'h4' : 'h3'}>{value}</Typography>}
            {(title || icon) && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {title && (
                  <Typography variant="body1" sx={{ color: 'grey.500' }}>
                    {title}
                  </Typography>
                )}
                {icon && icon}
              </Stack>
            )}
          </Stack>
        </Grid>
        {chartData && (
          <Grid size={12}>
            <Chart {...chartData} />
          </Grid>
        )}
      </Grid>
    </MainCard>
  );
}
