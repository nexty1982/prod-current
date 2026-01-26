import Grid2 from '@mui/material/Grid2';
"use client"

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import { Grid } from "@mui/material";
import BasicGaugesChart from '@/features/analytics/muicharts/gaugecharts/BasicGaugesChart";
import ArcDesignChart from '@/features/analytics/muicharts/gaugecharts/ArcDesignChart";
import GaugePointerChart from '@/features/analytics/muicharts/gaugecharts/GaugePointerChart";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "GaugeCharts ",
    },
];

const GaugeCharts = () => {
    return (
        <PageContainer title="GaugeCharts" description="this is GaugeCharts ">

            <Breadcrumb title="GaugeCharts" items={BCrumb} />
            <Grid2 container spacing={3}>
                <Grid2
                    size={{
                        md: 6
                    }}
                >
                    <BasicGaugesChart />
                </Grid2>
                <Grid2
                    size={{
                        md: 6
                    }}
                >

                    <ArcDesignChart />
                </Grid2>
                <Grid2
                    size={{
                        md: 6
                    }}
                >

                    <GaugePointerChart />
                </Grid2>


            </Grid2>
        </PageContainer>
    );
};

export default GaugeCharts;
