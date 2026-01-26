"use client"
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { Grid } from "@mui/material";
import BasicSparkLine from '@/features/analytics/muicharts/sparklinecharts/BasicSparkLine";
import AreaSparkLineChart from '@/features/analytics/muicharts/sparklinecharts/AreaSparkLineChart";
import BasicSparkLineCustomizationChart from '@/features/analytics/muicharts/sparklinecharts/BasicSparkLineCustomizationChart";


const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "SparkLineCharts ",
    },
];

const SparkLineCharts = () => {
    return (
        <PageContainer title="SparkLineCharts" description="this is SparkLineCharts ">

            <Breadcrumb title="SparkLineCharts" items={BCrumb} />
            <Grid container spacing={3}>
                <BasicSparkLine />
                <AreaSparkLineChart />
                <BasicSparkLineCustomizationChart />
            </Grid>
        </PageContainer>
    );
};

export default SparkLineCharts;
