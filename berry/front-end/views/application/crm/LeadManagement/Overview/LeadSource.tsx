import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// third party
import { ApexOptions } from 'apexcharts';
import ReactApexChart from 'react-apexcharts';

// project imports
import useConfig from 'hooks/useConfig';
import MainCard from 'ui-component/cards/MainCard';

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// chart options
const polarChartOptions: ApexOptions = {
  chart: {
    type: 'polarArea',
    width: 450,
    height: 450
  },
  fill: { opacity: 1 },
  legend: { show: false }
};

const status = [
  { value: 'month', label: 'This Month' },
  { value: 'today', label: 'Today' },
  { value: 'year', label: 'This Year' }
];

const legendData = [
  { name: 'Social Media', chipLabel: '9', color: 'primary.main' },
  { name: 'Website', chipLabel: '100+', color: 'secondary.main' },
  { name: 'Phone Call', chipLabel: '100+', color: 'secondary.200' },
  { name: 'Mail', chipLabel: '100+', color: 'primary.200' }
];

// ==============================|| LEAD SOURCE - CHART ||============================== //

export default function LeadSource() {
  const theme = useTheme();
  const { mode } = useConfig();

  const [value, setValue] = useState('today');
  const [series] = useState<number[]>([20, 30, 25, 15, 35]);
  const [options, setOptions] = useState(polarChartOptions);
  const [isLoading, setLoading] = useState(true);

  const divider = theme.palette.divider;
  const backColor = theme.palette.background.paper;
  const secondary = theme.palette.secondary.main;
  const secondary200 = theme.palette.secondary[200];
  const primaryMain = theme.palette.primary.main;
  const primary200 = theme.palette.primary[200];
  const grey500 = theme.palette.grey[500];

  useEffect(() => {
    setOptions((prevState) => ({
      ...prevState,
      colors: [secondary200, primaryMain, primary200, grey500, secondary],
      xaxis: { show: false, labels: { show: false } },
      yaxis: { show: false, labels: { show: false } },
      grid: { borderColor: divider },
      labels: ['Phone call', 'Social Media', 'Mail', 'Message', 'Website'],
      stroke: { colors: [backColor] },
      plotOptions: {
        polarArea: {
          rings: { strokeColor: divider },
          spokes: { connectorColors: divider }
        }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (isLoading) return null;

  return (
    <MainCard>
      <Grid container>
        <Grid sx={{ alignItems: 'center' }} size={12}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h3" sx={{ fontWeight: 500 }}>
              Lead Source
            </Typography>
            <TextField
              id="standard-select-currency"
              select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              sx={{ '& .MuiOutlinedInput-input': { borderRadius: 1.5, py: 1, px: 1.5 } }}
            >
              {status.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Grid>
        <Grid size={12}>
          <ReactApexChart options={options} series={series} height={220} type="polarArea" />
        </Grid>
        <Grid sx={{ pt: 2 }} size={12}>
          <Stack spacing={2}>
            {legendData.map((data, index) => (
              <Stack direction="row" key={index} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <FiberManualRecordIcon fontSize="small" sx={{ color: data.color }} />
                  <Typography>{data.name}</Typography>
                </Stack>
                <Chip size="small" color="default" label={data.chipLabel} />
              </Stack>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </MainCard>
  );
}
