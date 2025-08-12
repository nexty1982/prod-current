// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';

const TopChurches = () => {
    const chartOptions = {
        chart: {
            type: 'bar' as const,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            foreColor: '#adb0bb',
            toolbar: {
                show: false,
            },
            height: 370,
        },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                columnWidth: '45%',
                endingShape: 'rounded',
            },
        },
        dataLabels: {
            enabled: false,
        },
        xaxis: {
            categories: [
                'St. Nicholas Cathedral',
                'Holy Trinity Church',
                'St. George Orthodox',
                'Assumption Cathedral',
                'St. Mary Orthodox',
                'Sacred Heart Church'
            ],
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        yaxis: {
            show: true,
        },
        grid: {
            show: false,
        },
        colors: ['#5D87FF'],
        tooltip: {
            theme: 'dark',
        },
    };

    const chartSeries = [
        {
            name: 'Records Count',
            data: [145, 132, 98, 87, 76, 65],
        },
    ];

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" mb={3}>
                    Top Churches by Record Volume
                </Typography>
                <Box>
                    <Chart
                        options={chartOptions}
                        series={chartSeries}
                        type="bar"
                        height="370px"
                    />
                </Box>
            </CardContent>
        </Card>
    );
};

export default TopChurches;
