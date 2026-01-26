// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    TextField,
    InputAdornment,
    Menu,
    MenuItem,
    Avatar,
    Tooltip
} from '@mui/material';
import {
    IconList,
    IconLayoutGrid,
    IconCategory2,
    IconPhotoPlus,
    IconSearch,
    IconPlus,
    IconDots,
    IconEdit,
    IconTrash,
    IconShield,
    IconLock,
    IconMail,
    IconCheck,
    IconX,
    IconUser
} from '@tabler/icons-react';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer';
    church?: string;
    lastLogin?: string;
    status: 'active' | 'inactive' | 'locked';
    avatar?: string;
}

const mockUsers: User[] = [
    {
        id: '1',
        name: 'Father Michael',
        email: 'father.michael@stgeorge.org',
        role: 'admin',
        church: 'St. George Orthodox Church',
        lastLogin: '2024-01-15 14:30',
        status: 'active',
        avatar: '/images/profile/default-avatar.png'
    },
    {
        id: '2',
        name: 'Maria Popescu',
        email: 'maria.popescu@gmail.com',
        role: 'manager',
        church: 'Holy Trinity Cathedral',
        lastLogin: '2024-01-15 12:15',
        status: 'active'
    },
    {
        id: '3',
        name: 'John Smith',
        email: 'john.smith@example.com',
        role: 'user',
        lastLogin: '2024-01-14 16:45',
        status: 'inactive'
    }
];

const UserManagement = () => {
    const [viewMode, setViewMode] = useState<'list' | 'details' | 'icons' | 'large-icons'>('list');
    const [users, setUsers] = useState<User[]>(mockUsers);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    const handleViewModeChange = (
        event: React.MouseEvent<HTMLElement>,
        newViewMode: 'list' | 'details' | 'icons' | 'large-icons' | null,
    ) => {
        if (newViewMode !== null) {
            setViewMode(newViewMode);
        }
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, userId: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedUser(userId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedUser(null);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'default';
            case 'locked': return 'error';
            default: return 'default';
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.church && user.church.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const renderListView = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Church</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredUsers.map((user) => (
                        <TableRow key={user.id} hover>
                            <TableCell>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Avatar src={user.avatar} sx={{ width: 32, height: 32 }}>
                                        <IconUser size={18} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>
                                            {user.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {user.email}
                                        </Typography>
                                    </Box>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={user.role.replace('_', ' ').toUpperCase()}
                                    color={getRoleColor(user.role)}
                                    size="small"
                                    icon={<IconShield size={14} />}
                                />
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2">
                                    {user.church || 'No Church Assigned'}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                    {user.lastLogin || 'Never'}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={user.status.toUpperCase()}
                                    color={getStatusColor(user.status)}
                                    size="small"
                                    variant="outlined"
                                />
                            </TableCell>
                            <TableCell align="right">
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleMenuClick(e, user.id)}
                                >
                                    <IconDots size={16} />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const renderIconView = () => (
        <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap={2}>
            {filteredUsers.map((user) => (
                <Card key={user.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                        <Avatar
                            src={user.avatar}
                            sx={{
                                width: viewMode === 'large-icons' ? 80 : 56,
                                height: viewMode === 'large-icons' ? 80 : 56,
                                mx: 'auto',
                                mb: 2
                            }}
                        >
                            <IconUser size={viewMode === 'large-icons' ? 32 : 24} />
                        </Avatar>
                        <Typography variant="h6" gutterBottom>
                            {user.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {user.email}
                        </Typography>
                        <Chip
                            label={user.role.replace('_', ' ').toUpperCase()}
                            color={getRoleColor(user.role)}
                            size="small"
                            sx={{ mb: 1 }}
                        />
                        <Box mt={1}>
                            <Chip
                                label={user.status.toUpperCase()}
                                color={getStatusColor(user.status)}
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                        {viewMode === 'large-icons' && (
                            <Box mt={2}>
                                <Typography variant="caption" color="text.secondary">
                                    {user.church || 'No Church'}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                    Last: {user.lastLogin || 'Never'}
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                    <Box p={1} pt={0}>
                        <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, user.id)}
                            sx={{ width: '100%' }}
                        >
                            <IconDots size={16} />
                        </IconButton>
                    </Box>
                </Card>
            ))}
        </Box>
    );

    return (
        <Box>
            {/* Header Controls */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" gap={2} alignItems="center">
                    <TextField
                        placeholder="Search users..."
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
                        sx={{ minWidth: 250 }}
                    />

                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={handleViewModeChange}
                        size="small"
                    >
                        <ToggleButton value="list">
                            <Tooltip title="List View">
                                <IconList size={18} />
                            </Tooltip>
                        </ToggleButton>
                        <ToggleButton value="details">
                            <Tooltip title="Details View">
                                <IconCategory2 size={18} />
                            </Tooltip>
                        </ToggleButton>
                        <ToggleButton value="icons">
                            <Tooltip title="Icons View">
                                <IconLayoutGrid size={18} />
                            </Tooltip>
                        </ToggleButton>
                        <ToggleButton value="large-icons">
                            <Tooltip title="Large Icons View">
                                <IconPhotoPlus size={18} />
                            </Tooltip>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<IconPlus size={18} />}
                >
                    Add User
                </Button>
            </Box>

            {/* Content based on view mode */}
            {viewMode === 'list' || viewMode === 'details' ? renderListView() : renderIconView()}

            {/* Action Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleMenuClose}>
                    <IconEdit size={16} style={{ marginRight: 8 }} />
                    Edit User
                </MenuItem>
                <MenuItem onClick={handleMenuClose}>
                    <IconLock size={16} style={{ marginRight: 8 }} />
                    Reset Password
                </MenuItem>
                <MenuItem onClick={handleMenuClose}>
                    <IconMail size={16} style={{ marginRight: 8 }} />
                    Send Email
                </MenuItem>
                <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
                    <IconTrash size={16} style={{ marginRight: 8 }} />
                    Delete User
                </MenuItem>
            </Menu>

            {/* Stats Summary */}
            <Box mt={3}>
                <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="primary">
                                {users.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Users
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main">
                                {users.filter(u => u.status === 'active').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Active Users
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main">
                                {users.filter(u => u.role === 'admin').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Administrators
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="info.main">
                                {users.filter(u => u.church).length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Church Members
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default UserManagement;
