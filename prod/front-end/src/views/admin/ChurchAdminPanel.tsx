import React from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';

// Simplified component to debug loading issues
const ChurchAdminPanel: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <PageContainer title="Church Admin Panel" description="Church administration panel">
            <Box>
                <Typography variant="h4" gutterBottom>
                    Church Admin Panel
                </Typography>
                <Card>
                    <CardContent>
                        <Typography variant="body1">
                            Loading church admin panel for church ID: {id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            This is a simplified version to debug React error #306.
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        </PageContainer>
    );
};

export default ChurchAdminPanel;

