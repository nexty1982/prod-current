// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Alert,
    Stack,
    Chip
} from '@mui/material';
import {
    IconAlertTriangle,
    IconInfoCircle,
    IconCheck,
    IconShieldCheck
} from '@tabler/icons-react';

const SystemNotifications = () => {
    const notifications = [
        {
            id: 1,
            type: 'warning',
            title: 'Backup Overdue',
            message: 'Database backup is 2 hours overdue',
            time: '30 min ago',
            icon: IconAlertTriangle
        },
        {
            id: 2,
            type: 'info',
            title: 'OCR Update Available',
            message: 'New OCR engine version 2.1.4 is available',
            time: '1 hour ago',
            icon: IconInfoCircle
        },
        {
            id: 3,
            type: 'success',
            title: 'Security Scan Complete',
            message: 'No vulnerabilities detected in the last scan',
            time: '2 hours ago',
            icon: IconShieldCheck
        },
        {
            id: 4,
            type: 'success',
            title: 'Daily Backup Complete',
            message: 'Automated backup completed successfully',
            time: '8 hours ago',
            icon: IconCheck
        }
    ];

    const getAlertSeverity = (type: string) => {
        switch (type) {
            case 'warning': return 'warning';
            case 'info': return 'info';
            case 'success': return 'success';
            default: return 'info';
        }
    };

    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5">
                        System Notifications
                    </Typography>
                    <Chip
                        label={`${notifications.length} Active`}
                        size="small"
                        color="primary"
                    />
                </Box>

                <Stack spacing={2}>
                    {notifications.map((notification) => (
                        <Alert
                            key={notification.id}
                            severity={getAlertSeverity(notification.type)}
                            icon={<notification.icon size={20} />}
                            sx={{
                                '& .MuiAlert-message': { width: '100%' },
                                borderRadius: 2
                            }}
                        >
                            <Box>
                                <Typography variant="body2" fontWeight={600} mb={0.5}>
                                    {notification.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mb={1}>
                                    {notification.message}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {notification.time}
                                </Typography>
                            </Box>
                        </Alert>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
};

export default SystemNotifications;
