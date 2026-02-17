// material-ui
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import Chart, { Props as ChartProps } from 'react-apexcharts';

interface TotalLineChartCardProps {
  bgColor?: string;
  chartData?: ChartProps;
  title: string;
  percentage: string;
  value: number;
}

// ============================|| TOTAL LINE CHART CARD ||============================ //

export default function TotalLineChartCard({ bgColor, chartData, title, percentage, value }: TotalLineChartCardProps) {
  return (
    <Card>
      <Box sx={{ color: 'common.white', bgcolor: bgColor || 'primary.dark' }}>
        <Box sx={{ p: 2.5 }}>
          <Grid container direction="column">
            <Grid container sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              {value && (
                <Grid>
                  <Typography variant="h3" color="inherit">
                    {value}
                  </Typography>
                </Grid>
              )}
              {percentage && (
                <Grid>
                  <Typography variant="body2" color="inherit">
                    {percentage}
                  </Typography>
                </Grid>
              )}
            </Grid>
            {title && (
              <Grid>
                <Typography variant="body2" color="inherit">
                  {title}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
        {chartData && <Chart {...chartData} />}
      </Box>
    </Card>
  );
}
