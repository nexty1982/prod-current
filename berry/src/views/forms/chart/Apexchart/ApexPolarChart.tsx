import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';

// third party
import ReactApexChart, { Props as ChartProps } from 'react-apexcharts';

// chart options
const polarChartOptions = {
  chart: {
    width: 450,
    height: 450,
    type: 'polarArea'
  },
  fill: {
    opacity: 1
  },
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

// ==============================|| POLAR CHART ||============================== //

export default function ApexPolarChart() {
  const theme = useTheme();

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;
  const backColor = theme.palette.background.paper;

  const [series] = useState<number[]>([14, 23, 21, 17, 15, 10, 12, 17, 21]);
  const [options, setOptions] = useState<ChartProps>(polarChartOptions);

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
      colors: [secondary, primaryMain, successDark, error, warningDark, orangeDark, error],
      xaxis: { labels: { style: { colors: primary } } },
      yaxis: { labels: { style: { colors: primary } } },
      grid: {
        borderColor: divider
      },
      legend: { ...prevState.legend, labels: { colors: grey500 } },
      stroke: { colors: [backColor] },
      plotOptions: {
        polarArea: {
          rings: {
            strokeColor: divider
          },
          spokes: {
            connectorColors: divider
          }
        }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.palette]);

  return (
    <div id="chart">
      <ReactApexChart options={options} series={series} type="polarArea" />
    </div>
  );
}
