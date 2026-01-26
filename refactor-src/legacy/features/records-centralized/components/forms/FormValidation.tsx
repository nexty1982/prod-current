import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import {
    CardContent,
    Grid
} from '@mui/material';

// common components
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import ChildCard from '@/shared/ui/ChildCard';
import BlankCard from '@/shared/ui/BlankCard';
import Logo from "@/layouts/full/shared/logo/Logo";

// custom components
import FVLogin from '@/shared/ui/forms/form-validation/FVLogin';
import FVRegister from '@/shared/ui/forms/form-validation/FVRegister';
import FVOnLeave from '@/shared/ui/forms/form-validation/FVOnLeave';
import FVRadio from '@/shared/ui/forms/form-validation/FVRadio';
import FVCheckbox from '@/shared/ui/forms/form-validation/FVCheckbox';
import FVSelect from '@/shared/ui/forms/form-validation/FVSelect';

import OnLeaveCode from '@/shared/ui/forms/form-validation/code/OnLeaveCode";
import SelectCode from '@/shared/ui/forms/form-validation/code/SelectCode";
import RadioCode from '@/shared/ui/forms/form-validation/code/RadioCode";
import CheckboxCode from '@/shared/ui/forms/form-validation/code/CheckboxCode";

const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {
        title: 'Form Validation',
    },
];

const FormValidation = () => {
    return (
        (<PageContainer title="Form Validation" description="this is Form Validation page">
            <Breadcrumb title="Form Validation" items={BCrumb} />
            <Grid2 container spacing={3}>
                <Grid2
                    size={{
                        xs: 12,
                        sm: 6
                    }}>
                    <BlankCard>
                        <CardContent sx={{ pt: 0 }}>
                            <Logo />
                            <FVRegister />
                        </CardContent>
                    </BlankCard>
                </Grid2>
                <Grid2
                    size={{
                        xs: 12,
                        sm: 6
                    }}>
                    <BlankCard>
                        <CardContent sx={{ pt: 0 }}>
                            <Logo />
                            <FVLogin />
                        </CardContent>
                    </BlankCard>
                </Grid2>
                <Grid2
                    size={{
                        xs: 12,
                        sm: 6
                    }}>
                    <ChildCard title="On Leave" codeModel={<OnLeaveCode />}>
                        <FVOnLeave />
                    </ChildCard>
                </Grid2>
                <Grid2
                    size={{
                        xs: 12,
                        sm: 6
                    }}>
                    <ChildCard title="Select" codeModel={<SelectCode />}>
                        <FVSelect />
                    </ChildCard>
                </Grid2>
                <Grid2
                    size={{
                        xs: 12,
                        sm: 6
                    }}>
                    <ChildCard title="Radio" codeModel={<RadioCode />}>
                        <FVRadio />
                    </ChildCard>
                </Grid2>
                <Grid2
                    size={{
                        xs: 12,
                        sm: 6
                    }}>
                    <ChildCard title="Checkboxes" codeModel={<CheckboxCode />}>
                        <FVCheckbox />
                    </ChildCard>
                </Grid2>
            </Grid2>
        </PageContainer>)
    );
};

export default FormValidation;
