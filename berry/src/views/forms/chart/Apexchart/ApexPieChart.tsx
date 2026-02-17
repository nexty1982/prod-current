import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';

// third party
import ReactApexChart, { Props as ChartProps } from 'react-apexcharts';

// chart options
const pieChartOptions = {
  chart: {
    type: 'pie',
    width: 450,
    height: 450
  },
  labels: ['Team A', 'Team B', 'Team C', 'Team D', 'Team E'],
  legend: {
    show: true,
    fontFamily: `'Roboto', sans-serif`,
    offsetX: 10,
    offsetY: 10,
    labels: {
      useSeriesColors: false
    },
    itemMargin: {
      horizontal: 25,
      vertical: 4
    }
  },
  responsive: [
    {
      breakpoint: 450,
      chart: {
        width: 280,
        height: 280
      },
      options: {
        legend: {
          show: false,
          position: 'bottom'
        }
      }
    }
  ]
};

// ==============================|| PIE CHART ||============================== //

export default function ApexPieChart() {
  const theme = useTheme();

  const backColor = theme.palette.background.paper;

  const [series] = useState([44, 55, 13, 43, 22]);
  const [options, setOptions] = useState<ChartProps>(pieChartOptions);

  const { primary } = theme.palette.text;
  const grey500 = theme.palette.grey[500];
  const secondary = theme.palette.secondary.main;
  const primaryMain = theme.palette.primary.main;
  const successDark = theme.palette.success.dark;
  const error = theme.palette.error.main;
  const warningDark = theme.palette.warning.dark;
  const orangeDark = theme.palette.orange.dark;

  useEffect(() => {
    setOptions((prevState) => ({
      ...prevState,
      colors: [secondary, primaryMain, successDark, error, warningDark, orangeDark],
      xaxis: {
        labels: { style: { colors: primary } }
      },
      yaxis: {
        labels: { style: { colors: primary } }
      },
      legend: { ...prevState.options?.legend, labels: { colors: grey500 } },
      stroke: { colors: [backColor] }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.palette]);

  return (
    <div id="chart">
      <ReactApexChart options={options} series={series} type="pie" />
    </div>
  );
}
