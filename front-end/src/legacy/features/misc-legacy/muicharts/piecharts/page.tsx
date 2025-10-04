import Grid2 from '@mui/material/Grid2';

"use client"
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import { Grid } from "@mui/material";
import BasicPieChart from '@/features/analytics/muicharts/piecharts/BasicPieChart";
import TwoLevelPieChart from '@/features/analytics/muicharts/piecharts/TwoLevelPieChart";
import StraightAnglePieChart from '@/features/analytics/muicharts/piecharts/StraightAnglePieChart";
import TwoSimplePieChart from '@/features/analytics/muicharts/piecharts/TwoSimplePieChart";
import PieChartWithCustomizedLabel from '@/features/analytics/muicharts/piecharts/PieChartWithCustomizedLabel";
import PieChartWithPaddingAngleChart from '@/features/analytics/muicharts/piecharts/PieChartWithPaddingAngleChart";
import PieChartWithCenterLabelChart from '@/features/analytics/muicharts/piecharts/PieChartWithCenterLabelChart";
import OnSeriesItemClickChart from '@/features/analytics/muicharts/piecharts/OnSeriesItemClickChart";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "PieCharts ",
    },
];

const PieCharts = () => {
    return (
        <PageContainer title="PieCharts" description="this is PieCharts ">

            <Breadcrumb title="PieCharts" items={BCrumb} />
            <Grid2 container spacing={3}>

                <Grid2
                    size={{
                        md: 6
                    }}
                >
                    <BasicPieChart />
                </Grid2>
                <Grid2
                    size={{
                        md: 6
                    }}
                >

                    <TwoLevelPieChart />
                </Grid2>

                <Grid2
                    size={{
                        md: 6
                    }}
                >
                    <StraightAnglePieChart />
                </Grid2>


                <Grid2
                    size={{
                        md: 6
                    }}
                >

                    <TwoSimplePieChart />
                </Grid2>
                <Grid2
                    size={{
                        md: 6
                    }}
                >
                    <PieChartWithCustomizedLabel />
                </Grid2>

                <Grid2
                    size={{
                        md: 6
                    }}
                >
                    <PieChartWithCenterLabelChart />
                </Grid2>

                <Grid2
                    size={{
                        md: 6
                    }}
                >
                    <PieChartWithPaddingAngleChart />

                </Grid2>


                <Grid2
                    size={{
                        md: 6
                    }}
                >
                    <OnSeriesItemClickChart />
                </Grid2>



            </Grid2>
        </PageContainer>
    );
};

export default PieCharts;
