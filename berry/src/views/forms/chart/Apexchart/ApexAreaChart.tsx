import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';

// third party
import ReactApexChart, { Props as ChartProps } from 'react-apexcharts';

// project imports
import useConfig from 'hooks/useConfig';
import value from 'assets/scss/_themes-vars.module.scss';

// chart options
const areaChartOptions: ChartProps = {
  colors: [value.secondaryMain, value.primaryMain],
  dataLabels: {
    enabled: false
  },
  stroke: {
    curve: 'smooth'
  },
  xaxis: {
    type: 'datetime',
    categories: [
      '2018-09-19T00:00:00.000Z',
      '2018-09-19T01:30:00.000Z',
      '2018-09-19T02:30:00.000Z',
      '2018-09-19T03:30:00.000Z',
      '2018-09-19T04:30:00.000Z',
      '2018-09-19T05:30:00.000Z',
      '2018-09-19T06:30:00.000Z'
    ]
  },
  tooltip: {
    x: {
      format: 'dd/MM/yy HH:mm'
    }
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
      size: 7,
      shape: 'square'
    },
    itemMargin: {
      horizontal: 15,
      vertical: 8
    }
  }
};

// ==============================|| AREA CHART ||============================== //

export default function ApexAreaChart() {
  const theme = useTheme();
  const { mode } = useConfig();

  const { primary } = theme.palette.text;
  const grey500 = theme.palette.grey[500];
  const divider = theme.palette.divider;

  const [series] = useState([
    {
      name: 'Series 1',
      data: [31, 40, 28, 51, 42, 109, 100]
    },
    {
      name: 'Series 2',
      data: [11, 32, 45, 32, 34, 52, 41]
    }
  ]);

  const [options, setOptions] = useState(areaChartOptions);

  useEffect(() => {
    setOptions((prevState) => ({
      ...prevState,
      colors: [theme.palette.secondary.main, theme.palette.primary.main],
      xaxis: {
        ...prevState.xaxis,
        labels: { style: { colors: primary } }
      },
      yaxis: { labels: { style: { colors: primary } } },
      grid: { borderColor: divider },
      tooltip: { ...prevState.tooltip, theme: mode },
      legend: { ...prevState.legend, labels: { colors: grey500 } }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  return (
    <div id="chart">
      <ReactApexChart options={options} series={series} type="area" height={350} />
    </div>
  );
}
