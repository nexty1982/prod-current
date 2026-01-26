
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';


import { Grid } from "@mui/material";
import ControlledExpansionTree from '@/features/misc-legacy/muitrees/simpletree/ControlledExpansionTree";
import ApiMethodSetItemExpansion from '@/features/misc-legacy/muitrees/simpletree/ApiMethodSetItemExpansion";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "SimpleTreeView ",
    },
];

const SimpleTreeView = () => {
    return (
        <PageContainer title="SimpleTreeView" description="this is SimpleTreeView ">
            <Breadcrumb title="SimpleTreeView" items={BCrumb} />
            <Grid container spacing={3}>

                <ControlledExpansionTree />


                <ApiMethodSetItemExpansion />

            </Grid>
        </PageContainer>
    );
};

export default SimpleTreeView;
