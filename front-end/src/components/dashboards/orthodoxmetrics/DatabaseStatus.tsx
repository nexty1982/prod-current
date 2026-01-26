// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Stack,
    LinearProgress,
    Chip
} from '@mui/material';
import {
    IconDatabase,
    IconServer,
    IconWifi,
    IconClock
} from '@tabler/icons-react';

const DatabaseStatus = () => {
    const systemStats = {
        uptime: '15 days, 4 hours',
        connections: 47,
        maxConnections: 100,
        storage: 68,
        queryTime: '12ms'
    };

    const connectionPercentage = (systemStats.connections / systemStats.maxConnections) * 100;

    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                    <Typography variant="h5">
                        Database Status
                    </Typography>
                    <Chip
                        label="Healthy"
                        color="success"
                        size="small"
                        icon={<IconDatabase size={16} />}
                    />
                </Box>

                <Stack spacing={3}>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <IconClock size={16} color="#5D87FF" />
                            <Typography variant="body2" color="text.secondary">
                                System Uptime
                            </Typography>
                        </Box>
                        <Typography variant="h6" color="#5D87FF">
                            {systemStats.uptime}
                        </Typography>
                    </Box>

                    <Box>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <IconWifi size={16} color="#49BEFF" />
                                <Typography variant="body2" color="text.secondary">
                                    Active Connections
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="#49BEFF" fontWeight={600}>
                                {systemStats.connections}/{systemStats.maxConnections}
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={connectionPercentage}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: '#E3F2FD',
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: '#49BEFF'
                                }
                            }}
                        />
                    </Box>

                    <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <IconServer size={16} color="#13DEB9" />
                            <Typography variant="body2" color="text.secondary">
                                Storage Usage
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6" color="#13DEB9">
                                {systemStats.storage}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Avg Query: {systemStats.queryTime}
                            </Typography>
                        </Box>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default DatabaseStatus;
