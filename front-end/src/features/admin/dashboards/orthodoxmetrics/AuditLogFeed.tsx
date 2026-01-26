// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Chip
} from '@mui/material';
import {
    IconUser,
    IconFileText,
    IconDatabase,
    IconUpload,
    IconTrash
} from '@tabler/icons-react';

const AuditLogFeed = () => {
    const auditLogs = [
        {
            id: 1,
            action: 'User Created',
            user: 'Father Michael',
            church: 'St. Nicholas Cathedral',
            time: '2 minutes ago',
            icon: IconUser,
            color: '#5D87FF'
        },
        {
            id: 2,
            action: 'Record Uploaded',
            user: 'Admin John',
            church: 'Holy Trinity Church',
            time: '15 minutes ago',
            icon: IconUpload,
            color: '#13DEB9'
        },
        {
            id: 3,
            action: 'Database Backup',
            user: 'System',
            church: 'All Churches',
            time: '1 hour ago',
            icon: IconDatabase,
            color: '#49BEFF'
        },
        {
            id: 4,
            action: 'Record Deleted',
            user: 'Admin Sarah',
            church: 'St. George Orthodox',
            time: '2 hours ago',
            icon: IconTrash,
            color: '#FF6B35'
        },
        {
            id: 5,
            action: 'Batch Processing',
            user: 'OCR System',
            church: 'Multiple Churches',
            time: '3 hours ago',
            icon: IconFileText,
            color: '#9C27B0'
        }
    ];

    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5">
                        Audit Log Feed
                    </Typography>
                    <Chip
                        label="Live"
                        size="small"
                        color="success"
                        sx={{ animation: 'pulse 2s infinite' }}
                    />
                </Box>

                <List sx={{ p: 0 }}>
                    {auditLogs.map((log, index) => (
                        <ListItem
                            key={log.id}
                            sx={{
                                borderBottom: index < auditLogs.length - 1 ? '1px solid #f5f5f5' : 'none',
                                py: 2
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: log.color, width: 40, height: 40 }}>
                                    <log.icon size={20} />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="body1" fontWeight={600}>
                                            {log.action}
                                        </Typography>
                                        <Chip
                                            label={log.church}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: '0.75rem' }}
                                        />
                                    </Box>
                                }
                                secondary={
                                    <Typography variant="body2" color="text.secondary">
                                        by {log.user} • {log.time}
                                    </Typography>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            </CardContent>
        </Card>
    );
};

export default AuditLogFeed;
