import React from 'react';
import { Box, Grid, Container } from '@mui/material';

const TestGrid: React.FC = () => {
    return (
        <Container>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Box>Test 1</Box>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Box>Test 2</Box>
                </Grid>
            </Grid>
        </Container>
    );
};

export default TestGrid;
