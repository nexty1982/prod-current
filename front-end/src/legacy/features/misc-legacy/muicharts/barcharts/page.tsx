import Grid2 from '@mui/material/Grid2';

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import TinyBarChart from '@/features/analytics/muicharts/barcharts/SimpleBarChart'
import StackedBarChart from '@/features/analytics/muicharts/barcharts/StackedBarChart'
import SimpleBarChart from '@/features/analytics/muicharts/barcharts/SimpleBarChart";
import MixedBarChart from '@/features/analytics/muicharts/barcharts/MixedBarChart'
import PositiveAndNegativeBarChart from '@/features/analytics/muicharts/barcharts/PositiveAndNegativeBarChart";
import BarChartStackedBySignChart from '@/features/analytics/muicharts/barcharts/BarChartStackedBySignChart";
import { Grid } from "@mui/material";
import BiaxialBarChart from '@/features/analytics/muicharts/barcharts/BiaxialBarChart";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "Bar Charts",
    },
];

const BarChart = () => {
    return (
        <PageContainer title="Bar Chart" description="this is Bar Chart">
            <Breadcrumb title="Bar Chart" items={BCrumb} />
            <Grid2 container spacing={3}>
                <Grid2
                    size={{
                        md: 6
                    }}
                >
                    <SimpleBarChart />
                </Grid2>

                <Grid2 size={{
                    md: 6
                }} >
                    <MixedBarChart />
                </Grid2>
                <Grid2 size={{

                    md: 6
                }}>
                    <PositiveAndNegativeBarChart />
                </Grid2>
                <Grid2 size={{

                    md: 6
                }} >
                    <BarChartStackedBySignChart />
                </Grid2>
                <Grid2 size={{
                    md: 6
                }}>
                    <BiaxialBarChart />
                </Grid2>
                <Grid2
                    size={{
                        md: 6
                    }}>
                    <StackedBarChart />

                </Grid2>
                <Grid2 size={{
                    md: 6
                }}>
                    <TinyBarChart />
                </Grid2>
            </Grid2>
        </PageContainer>
    );
};

export default BarChart;
