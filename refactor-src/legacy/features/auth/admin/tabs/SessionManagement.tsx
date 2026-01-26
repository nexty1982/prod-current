// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Button,
    IconButton,
    TextField,
    InputAdornment,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import {
    IconSearch,
    IconRefresh,
    IconX,
    IconShield,
    IconClock,
    IconDeviceDesktop,
    IconMapPin,
    IconUser,
    IconActivity,
    IconLogout
} from '@tabler/icons-react';

interface Session {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
    loginTime: string;
    lastActivity: string;
    ipAddress: string;
    userAgent: string;
    location?: string;
    isActive: boolean;
    deviceType: 'desktop' | 'mobile' | 'tablet';
}

const mockSessions: Session[] = [
    {
        id: 'sess_1',
        userId: '1',
        userName: 'Father Michael',
        userEmail: 'father.michael@stgeorge.org',
        userRole: 'admin',
        loginTime: '2024-01-15 09:30:00',
        lastActivity: '2024-01-15 14:25:00',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome 120.0.0 / Windows 10',
        location: 'New York, USA',
        isActive: true,
        deviceType: 'desktop'
    },
    {
        id: 'sess_2',
        userId: '2',
        userName: 'Maria Popescu',
        userEmail: 'maria.popescu@gmail.com',
        userRole: 'manager',
        loginTime: '2024-01-15 08:15:00',
        lastActivity: '2024-01-15 14:20:00',
        ipAddress: '10.0.0.45',
        userAgent: 'Safari 17.0 / iOS 17.1',
        location: 'Bucharest, Romania',
        isActive: true,
        deviceType: 'mobile'
    },
    {
        id: 'sess_3',
        userId: '3',
        userName: 'John Smith',
        userEmail: 'john.smith@example.com',
        userRole: 'user',
        loginTime: '2024-01-15 10:00:00',
        lastActivity: '2024-01-15 13:45:00',
        ipAddress: '203.0.113.12',
        userAgent: 'Firefox 121.0 / macOS',
        location: 'London, UK',
        isActive: false,
        deviceType: 'desktop'
    },
    {
        id: 'sess_4',
        userId: '4',
        userName: 'Anna Kowalski',
        userEmail: 'anna.k@church.org',
        userRole: 'viewer',
        loginTime: '2024-01-15 11:30:00',
        lastActivity: '2024-01-15 14:15:00',
        ipAddress: '172.16.0.88',
        userAgent: 'Chrome 120.0.0 / Android 14',
        location: 'Warsaw, Poland',
        isActive: true,
        deviceType: 'tablet'
    }
];

const SessionManagement = () => {
    const [sessions, setSessions] = useState<Session[]>(mockSessions);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        sessionId: string;
        action: 'terminate' | 'terminate-all';
    }>({
        open: false,
        sessionId: '',
        action: 'terminate'
    });

    const filteredSessions = sessions.filter(session =>
        session.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.ipAddress.includes(searchTerm) ||
        (session.location && session.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleTerminateSession = (sessionId: string) => {
        setConfirmDialog({
            open: true,
            sessionId,
            action: 'terminate'
        });
    };

    const handleTerminateAllSessions = () => {
        setConfirmDialog({
            open: true,
            sessionId: '',
            action: 'terminate-all'
        });
    };

    const executeAction = () => {
        if (confirmDialog.action === 'terminate') {
            setSessions(sessions.map(s =>
                s.id === confirmDialog.sessionId
                    ? { ...s, isActive: false }
                    : s
            ));
        } else if (confirmDialog.action === 'terminate-all') {
            setSessions(sessions.map(s => ({ ...s, isActive: false })));
        }
        setConfirmDialog({ open: false, sessionId: '', action: 'terminate' });
    };

    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType) {
            case 'mobile':
            case 'tablet':
                return <IconDeviceDesktop size={16} />;
            default:
                return <IconDeviceDesktop size={16} />;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'error';
            case 'admin': return 'warning';
            case 'manager': return 'info';
            case 'user': return 'success';
            case 'viewer': return 'default';
            default: return 'default';
        }
    };

    const activeSessions = sessions.filter(s => s.isActive);
    const inactiveSessions = sessions.filter(s => !s.isActive);

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" gap={2} alignItems="center">
                    <TextField
                        placeholder="Search sessions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="small"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={18} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ minWidth: 300 }}
                    />
                    <Button
                        variant="outlined"
                        startIcon={<IconRefresh size={18} />}
                    >
                        Refresh
                    </Button>
                </Box>
                <Button
                    variant="contained"
                    color="error"
                    startIcon={<IconLogout size={18} />}
                    onClick={handleTerminateAllSessions}
                >
                    Terminate All Sessions
                </Button>
            </Box>

            {/* Session Statistics */}
            <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2} mb={3}>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                            {activeSessions.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Active Sessions
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="text.secondary">
                            {inactiveSessions.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Ended Sessions
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="info.main">
                            {sessions.filter(s => s.deviceType === 'mobile').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Mobile Sessions
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main">
                            {sessions.filter(s => s.userRole === 'admin').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Admin Sessions
                        </Typography>
                    </CardContent>
                </Card>
            </Box>            {/* Active Sessions Alert */}
            {activeSessions.length > 10 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    High number of active sessions detected ({activeSessions.length}). Consider reviewing for security.
                </Alert>
            )}

            {/* Sessions Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Current Sessions
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Login Time</TableCell>
                                    <TableCell>Last Activity</TableCell>
                                    <TableCell>Location</TableCell>
                                    <TableCell>Device</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredSessions.map((session) => (
                                    <TableRow key={session.id} hover>
                                        <TableCell>
                                            <Box>
                                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {session.userName}
                                                    </Typography>
                                                    <Chip
                                                        label={session.userRole.replace('_', ' ').toUpperCase()}
                                                        color={getRoleColor(session.userRole)}
                                                        size="small"
                                                        icon={<IconShield size={12} />}
                                                    />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    {session.userEmail}
                                                </Typography>
                                                <br />
                                                <Typography variant="caption" color="text.secondary">
                                                    IP: {session.ipAddress}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <IconClock size={14} />
                                                <Typography variant="body2">
                                                    {new Date(session.loginTime).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <IconActivity size={14} />
                                                <Typography variant="body2">
                                                    {new Date(session.lastActivity).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <IconMapPin size={14} />
                                                <Typography variant="body2">
                                                    {session.location || 'Unknown'}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {session.userAgent}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {getDeviceIcon(session.deviceType)}
                                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                                    {session.deviceType}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={session.isActive ? 'Active' : 'Ended'}
                                                color={session.isActive ? 'success' : 'default'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            {session.isActive && (
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleTerminateSession(session.id)}
                                                >
                                                    <IconX size={16} />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
                <DialogTitle>
                    {confirmDialog.action === 'terminate' ? 'Terminate Session' : 'Terminate All Sessions'}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {confirmDialog.action === 'terminate'
                            ? 'Are you sure you want to terminate this user session? The user will be logged out immediately.'
                            : 'Are you sure you want to terminate ALL active sessions? All users will be logged out immediately.'
                        }
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
                        Cancel
                    </Button>
                    <Button
                        onClick={executeAction}
                        color="error"
                        variant="contained"
                    >
                        {confirmDialog.action === 'terminate' ? 'Terminate Session' : 'Terminate All'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SessionManagement;
