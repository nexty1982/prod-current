import React from 'react';
import { Typography, Box } from '@mui/material';
import PageContainer from '../../../components/container/PageContainer';
import BlankCard from '../../../components/shared/BlankCard';

const TestLiturgicalCalendar: React.FC = () => {
    console.log('TestLiturgicalCalendar component loaded');

    return (
        <PageContainer title="Test Liturgical Calendar" description="Test Orthodox Liturgical Calendar">
            <BlankCard>
                <Box sx={{ p: 3 }}>
                    <Typography variant="h4" gutterBottom>
                        Test Liturgical Calendar
                    </Typography>
                    <Typography variant="body1">
                        This is a test page to verify the component loads correctly.
                    </Typography>
                </Box>
            </BlankCard>
        </PageContainer>
    );
};

export default TestLiturgicalCalendar;
