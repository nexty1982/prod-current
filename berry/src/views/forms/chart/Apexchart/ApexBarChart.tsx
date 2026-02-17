import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';

// third party
import ReactApexChart, { Props as ChartProps } from 'react-apexcharts';

// project imports
import useConfig from 'hooks/useConfig';

// chart options
const barChartOptions = {
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    padding: {
      left: 0,
      right: 0
    }
  },
  xaxis: {
    categories: ['South Korea', 'Canada', 'United Kingdom', 'Netherlands', 'Italy', 'France', 'Japan', 'United States', 'China', 'Germany']
  },
  legend: {
    show: true,
    fontFamily: `'Roboto', sans-serif`,
    position: 'bottom',
    offsetX: 10,
    offsetY: 10,
    labels: {
      useSeriesColors: false
    },
    markers: {
      width: 16,
      height: 16,
      radius: 5
    },
    itemMargin: {
      horizontal: 15,
      vertical: 8
    }
  },
  responsive: [
    {
      breakpoint: 600,
      options: {
        yaxis: { show: false },
        grid: {
          padding: {
            left: -12
          }
        }
      }
    }
  ]
};

// ==============================|| BAR CHART ||============================== //

export default function ApexBarChart() {
  const theme = useTheme();
  const { mode } = useConfig();

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;

  const successDark = theme.palette.success.dark;

  const [series] = useState([
    {
      data: [400, 430, 448, 470, 540, 580, 690, 1100, 1200, 1380]
    }
  ]);

  const [options, setOptions] = useState<ChartProps>(barChartOptions);

  useEffect(() => {
    setOptions((prevState) => ({
      ...prevState,
      colors: [successDark],
      xaxis: {
        ...prevState.xaxis,
        labels: { style: { colors: primary } }
      },
      yaxis: {
        labels: { style: { colors: primary } }
      },
      grid: { ...prevState.grid, borderColor: divider },
      tooltip: { theme: mode }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  return (
    <div id="chart">
      <ReactApexChart options={options} series={series} type="bar" height={350} />
    </div>
  );
}
