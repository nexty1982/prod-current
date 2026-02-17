import { ApexOptions } from 'apexcharts';

const chartOptions: ApexOptions = {
  chart: {
    type: 'bar',
    height: 286,
    stacked: true,
    toolbar: { show: false },
    zoom: { enabled: true }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '75%'
    }
  },
  dataLabels: { enabled: false },
  xaxis: {
    type: 'category',
    categories: Array.from({ length: 30 }, (_, i) => i + 1),
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  fill: {
    type: 'solid',
    opacity: 1
  },
  states: {
    hover: {
      filter: { type: 'none' }
    }
  },
  legend: {
    show: true,
    fontFamily: `'Roboto', sans-serif`,
    position: 'bottom',
    offsetX: 20,
    offsetY: 10,
    labels: {
      useSeriesColors: false
    },
    markers: {
      size: 7,
      shape: 'circle',
      offsetX: -5
    },
    itemMargin: {
      horizontal: 10,
      vertical: 16
    }
  },
  grid: {
    show: false
  },
  responsive: [
    {
      breakpoint: 480,
      options: {
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '50%'
          }
        },
        xaxis: {
          tickAmount: 15,
          labels: {
            rotate: 0,
            style: {
              fontSize: '9px'
            }
          }
        },
        legend: {
          position: 'bottom',
          offsetX: -10,
          offsetY: 0
        }
      }
    }
  ]
};

export default chartOptions;
