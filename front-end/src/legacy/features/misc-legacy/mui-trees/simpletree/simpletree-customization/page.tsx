
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import { Grid } from "@mui/material";
import BasicCustomIcons from '@/features/misc-legacy/muitrees/simpletree/BasicCustomIcons";
import CustomTreeItemView from '@/features/misc-legacy/muitrees/simpletree/CustomTreeItemView";

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

                <BasicCustomIcons />
                <CustomTreeItemView />

            </Grid>
        </PageContainer>
    );
};

export default SimpleTreeView;
