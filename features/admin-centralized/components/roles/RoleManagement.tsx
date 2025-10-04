import React from 'react';
import { Box, Typography, Alert, Card, CardContent } from '@mui/material';
import { IconShield } from '@tabler/icons-react';

const RoleManagement: React.FC = () => {
    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" mb={3}>
                <IconShield size="24" style={{ marginRight: 8 }} />
                <Typography variant="h4">Role Management</Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
                This role management page is under development.
            </Alert>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Coming Soon
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Role creation, permission management, and role assignment features will be available here.
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default RoleManagement;
