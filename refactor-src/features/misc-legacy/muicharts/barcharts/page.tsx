import Grid2 from '@/components/compat/Grid2';

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import TinyBarChart from '@/components/muicharts/barcharts/SimpleBarChart'
import StackedBarChart from '@/components/muicharts/barcharts/StackedBarChart'
import SimpleBarChart from "@/components/muicharts/barcharts/SimpleBarChart";
import MixedBarChart from '@/components/muicharts/barcharts/MixedBarChart'
import PositiveAndNegativeBarChart from "@/components/muicharts/barcharts/PositiveAndNegativeBarChart";
import BarChartStackedBySignChart from "@/components/muicharts/barcharts/BarChartStackedBySignChart";
import { Grid } from "@mui/material";
import BiaxialBarChart from "@/components/muicharts/barcharts/BiaxialBarChart";

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
