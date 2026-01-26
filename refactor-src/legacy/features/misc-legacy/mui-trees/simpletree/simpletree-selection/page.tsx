

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { Grid } from "@mui/material";
import MultiSelectTreeView from '@/features/misc-legacy/muitrees/simpletree/MultiSelectTreeView";
import CheckboxSelection from '@/features/misc-legacy/muitrees/simpletree/CheckboxSelection";
import ControlledSelectiontree from '@/features/misc-legacy/muitrees/simpletree/ControlledSelectiontree";

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

                <MultiSelectTreeView />


                <CheckboxSelection />


                <ControlledSelectiontree />


            </Grid>
        </PageContainer>
    );
};

export default SimpleTreeView;
