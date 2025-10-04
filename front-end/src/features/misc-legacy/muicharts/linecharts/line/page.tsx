
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import { Grid } from "@mui/material";
import SimpleLineChart from "@/components/muicharts/linescharts/linechart/SimpleLineChart";
import TinyLineChart from "@/components/muicharts/linescharts/linechart/TinyLineChart";
import DashedLineChart from "@/components/muicharts/linescharts/linechart/DashedLineChart";
import BiaxialLineChart from "@/components/muicharts/linescharts/linechart/BiaxialLineChart";
import LineChartWithReferenceLines from "@/components/muicharts/linescharts/linechart/LineChartWithReferenceLinesChart";
import LinewithforecastChart from "@/components/muicharts/linescharts/linechart/LinewithforecastChart";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "Mui Line Charts",
    },
];

const LineChart = () => {
    return (
        <PageContainer title="Mui Line Chart" description="this is Mui Line Chart">
            <Breadcrumb title="Mui Line  Chart" items={BCrumb} />
            <Grid container spacing={3}>

                <SimpleLineChart />


                <TinyLineChart />


                <DashedLineChart />


                <BiaxialLineChart />


                <LineChartWithReferenceLines />


                <LinewithforecastChart />


            </Grid>
        </PageContainer>
    );
};

export default LineChart;
