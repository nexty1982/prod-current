"use client"
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { Grid } from "@mui/material";
import BasicScatterChart from "@/components/muicharts/scattercharts/BasicScatterChart";
import ScatterDatasetChart from "@/components/muicharts/scattercharts/ScatterDatasetChart";
import VoronoiInteractionChart from "@/components/muicharts/scattercharts/VoronoiInteractionChart";
import ScatterClickNoSnapChart from "@/components/muicharts/scattercharts/ScatterClickNoSnapChart";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "ScatterCharts ",
    },
];

const ScatterCharts = () => {
    return (
        <PageContainer title="ScatterCharts" description="this is ScatterCharts ">

            <Breadcrumb title="ScatterCharts" items={BCrumb} />
            <Grid container spacing={3}>

                <BasicScatterChart />

                <ScatterDatasetChart />

                <VoronoiInteractionChart />

                <ScatterClickNoSnapChart />


            </Grid>
        </PageContainer>
    );
};

export default ScatterCharts;
