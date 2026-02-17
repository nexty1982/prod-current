import { Props } from 'react-apexcharts';

// ==============================|| INVOICE - TOTAL REVENUE BAR CHART ||============================== //

const chartData: Props = {
  height: 364,
  type: 'bar',
  options: {
    chart: {
      id: 'bar-chart',
      stacked: true,
      toolbar: { show: true },
      zoom: { enabled: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%'
      }
    },
    xaxis: {
      type: 'category',
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    legend: { show: false },
    fill: {
      type: 'solid',
      opacity: 1
    },
    dataLabels: { enabled: false },
    grid: { show: true }
  },
  series: [
    {
      name: 'Investment',
      data: [2, 2.3, 2.5, 2.3, 2, 2.3, 2.7]
    },
    {
      name: 'Loss',
      data: [1.8, 2.3, 1.8, 2.5, 2.3, 1.8, 2.5]
    }
  ]
};

export default chartData;
