import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';

// third party
import ReactApexChart, { Props as ChartProps } from 'react-apexcharts';

// types
import { KeyedObject } from 'types';

// chart options
const redialBarChartOptions = {
  chart: {
    type: 'radialBar',
    width: 450,
    height: 450
  },
  plotOptions: {
    radialBar: {
      offsetY: 0,
      startAngle: 0,
      endAngle: 270,
      hollow: {
        margin: 5,
        size: '30%',
        background: 'transparent',
        image: undefined
      },
      dataLabels: {
        name: {
          show: false
        },
        value: {
          show: false
        }
      }
    }
  },
  labels: ['Vimeo', 'Messenger', 'Facebook', 'LinkedIn'],
  legend: {
    show: true,
    floating: true,
    fontSize: '16px',
    position: 'left',
    offsetX: 0,
    offsetY: 15,
    labels: {
      useSeriesColors: true
    },
    markers: {
      size: 0
    },
    formatter(seriesName: string, opts: KeyedObject) {
      return `${seriesName}:  ${opts.w.globals.series[opts.seriesIndex]}`;
    },
    itemMargin: {
      vertical: 3
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

// ==============================|| RADIAL BAR CHART ||============================== //

export default function ApexRedialBarChart() {
  const theme = useTheme();

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;

  const [series] = useState<number[]>([76, 67, 61, 90]);
  const [options, setOptions] = useState<ChartProps>(redialBarChartOptions);

  const secondary = theme.palette.secondary.main;
  const primaryMain = theme.palette.primary.main;
  const successDark = theme.palette.success.dark;
  const error = theme.palette.error.main;

  useEffect(() => {
    setOptions((prevState) => ({
      ...prevState,
      colors: [secondary, primaryMain, successDark, error],
      xaxis: { labels: { style: { colors: primary } } },
      yaxis: { labels: { style: { colors: primary } } },
      grid: { borderColor: divider },
      plotOptions: {
        ...prevState.plotOptions,
        radialBar: {
          ...prevState.plotOptions.radialBar,
          track: { background: divider }
        }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.palette]);

  return (
    <div id="chart">
      <ReactApexChart options={options} series={series} type="radialBar" />
    </div>
  );
}
