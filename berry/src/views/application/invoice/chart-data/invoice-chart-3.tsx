// third party
import { Props } from 'react-apexcharts';

// ==============================|| DASHBOARD - INVOICE 3 CHART ||============================== //

const chartData: Props = {
  type: 'line',
  height: 30,
  options: {
    chart: {
      id: 'session-timeout-chart',
      sparkline: {
        enabled: true
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'straight',
      width: 2
    },
    yaxis: {
      min: -2,
      max: 5,
      labels: {
        show: false
      }
    },
    colors: ['#673AB7', '#673AB7'],
    tooltip: {
      theme: 'light',
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: (seriesName: string) => 'Pending '
        }
      },
      marker: {
        show: false
      }
    }
  },
  series: [
    {
      data: [2, 1, 2, 1, 1, 3, 0]
    }
  ]
};

export default chartData;
