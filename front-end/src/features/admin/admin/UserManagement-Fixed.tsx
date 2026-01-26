import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Chip,
    Avatar,
    Stack,
    Switch,
    FormControlLabel,
    Tooltip,
    TablePagination,
    Tabs,
    Tab,
    Paper
} from '@mui/material';
import {
    IconEdit,
    IconTrash,
    IconKey,
    IconUserPlus,
    IconBuilding,
    IconUsers,
    IconSearch,
    IconEye,
    IconUserCheck,
    IconUserX,
    IconMail,
    IconPhone,
    IconCalendar,
    IconSettings
} from '@tabler/icons-react';

// contexts
import { useAuth } from '@/context/AuthContext';

// types
interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'super_admin' | 'user' | 'priest' | 'deacon';
    church_id: number | null;
    church_name?: string;
    is_active: boolean;
    phone?: string;
    preferred_language?: string;
    created_at: string;
    updated_at: string;
    last_login?: string;
}

interface Church {
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
    website?: string;
    preferred_language?: string;
    timezone?: string;
    currency?: string;
    is_active: boolean;
}

interface NewUser {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    church_id: string;
    phone: string;
    preferred_language: string;
    send_welcome_email: boolean;
}

const UserManagement: React.FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [churches, setChurches] = useState<Church[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [churchFilter, setChurchFilter] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');

    // Tabs
    const [tabValue, setTabValue] = useState(0);

    // Dialog states
    const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
    const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
    const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
    const [viewUserDialogOpen, setViewUserDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form state
    const [newUser, setNewUser] = useState<NewUser>({
        email: '',
        first_name: '',
        last_name: '',
        role: 'user',
        church_id: '',
        phone: '',
        preferred_language: 'en',
        send_welcome_email: true
    });

    // Check if user is admin
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
            fetchChurches();
        }
    }, [isAdmin]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            setError('Failed to load users');
            console.error('Error fetching users:', err);
        }
    };

    const fetchChurches = async () => {
        try {
            const response = await fetch('/api/admin/churches', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch churches');
            }

            const data = await response.json();
            setChurches(data.churches || []);
        } catch (err) {
            console.error('Error fetching churches:', err);
        }
    };

    const handleCreateUser = async () => {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...newUser,
                    church_id: newUser.church_id || null
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(`User created successfully! ${data.tempPassword ? `Temporary password: ${data.tempPassword}` : ''}`);
                setCreateUserDialogOpen(false);
                setNewUser({
                    email: '',
                    first_name: '',
                    last_name: '',
                    role: 'user',
                    church_id: '',
                    phone: '',
                    preferred_language: 'en',
                    send_welcome_email: true
                });
                fetchUsers();
            } else {
                setError(data.message || 'Failed to create user');
            }
        } catch (err) {
            setError('An error occurred while creating the user');
            console.error('Error creating user:', err);
        }
    };

    const handleResetPassword = async (email: string) => {
        try {
            const response = await fetch('/api/admin/users/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(`Password reset successfully! New password: ${data.newPassword}`);
            } else {
                setError(data.message || 'Failed to reset password');
            }
        } catch (err) {
            setError('An error occurred while resetting password');
            console.error('Error resetting password:', err);
        }
    };

    const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ is_active: !currentStatus })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
                fetchUsers();
            } else {
                setError(data.message || 'Failed to update user status');
            }
        } catch (err) {
            setError('An error occurred while updating user status');
            console.error('Error toggling user status:', err);
        }
    };

    // Filter users based on search and filters
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.church_name && user.church_name.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesChurch = churchFilter === 'all' || (user.church_id && user.church_id.toString() === churchFilter);
        const matchesStatus = activeFilter === 'all' ||
            (activeFilter === 'active' && user.is_active) ||
            (activeFilter === 'inactive' && !user.is_active);

        return matchesSearch && matchesRole && matchesChurch && matchesStatus;
    });

    // Paginate filtered users
    const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    if (!isAdmin) {
        return (
            <Box p={3}>
                <Alert severity="error">
                    You do not have permission to access this page.
                </Alert>
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                User Management
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
                <Tab icon={<IconUsers />} label="User Management" />
                <Tab icon={<IconBuilding />} label="Church Management" />
            </Tabs>

            {tabValue === 0 && (
                <>
                    {/* Search and Filters */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                                <Box flex={1} minWidth={250}>
                                    <TextField
                                        fullWidth
                                        placeholder="Search users..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: <IconSearch size={20} />,
                                        }}
                                    />
                                </Box>
                                <Box minWidth={120}>
                                    <FormControl fullWidth>
                                        <InputLabel>Role</InputLabel>
                                        <Select
                                            value={roleFilter}
                                            onChange={(e) => setRoleFilter(e.target.value)}
                                            label="Role"
                                        >
                                            <MenuItem value="all">All Roles</MenuItem>
                                            <MenuItem value="admin">Admin</MenuItem>
                                            <MenuItem value="super_admin">Super Admin</MenuItem>
                                            <MenuItem value="priest">Priest</MenuItem>
                                            <MenuItem value="deacon">Deacon</MenuItem>
                                            <MenuItem value="user">User</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <Box minWidth={150}>
                                    <FormControl fullWidth>
                                        <InputLabel>Church</InputLabel>
                                        <Select
                                            value={churchFilter}
                                            onChange={(e) => setChurchFilter(e.target.value)}
                                            label="Church"
                                        >
                                            <MenuItem value="all">All Churches</MenuItem>
                                            {churches.map((church) => (
                                                <MenuItem key={church.id} value={church.id.toString()}>
                                                    {church.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                                <Box minWidth={120}>
                                    <FormControl fullWidth>
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            value={activeFilter}
                                            onChange={(e) => setActiveFilter(e.target.value)}
                                            label="Status"
                                        >
                                            <MenuItem value="all">All Status</MenuItem>
                                            <MenuItem value="active">Active</MenuItem>
                                            <MenuItem value="inactive">Inactive</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={<IconUserPlus />}
                                    onClick={() => setCreateUserDialogOpen(true)}
                                >
                                    Add User
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Users Table */}
                    <Card>
                        <CardContent>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>User</TableCell>
                                            <TableCell>Role</TableCell>
                                            <TableCell>Church</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Last Login</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedUsers.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={2}>
                                                        <Avatar>
                                                            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="subtitle2">
                                                                {user.first_name} {user.last_name}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {user.email}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={user.role}
                                                        size="small"
                                                        color={user.role === 'admin' || user.role === 'super_admin' ? 'error' : 'primary'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {user.church_name || 'No Church'}
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Switch
                                                            checked={user.is_active}
                                                            onChange={() => handleToggleUserStatus(user.id, user.is_active)}
                                                            size="small"
                                                        />
                                                        <Chip
                                                            label={user.is_active ? 'Active' : 'Inactive'}
                                                            size="small"
                                                            color={user.is_active ? 'success' : 'default'}
                                                        />
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={1}>
                                                        <Tooltip title="View Details">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setViewUserDialogOpen(true);
                                                                }}
                                                            >
                                                                <IconEye size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Edit User">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setEditUserDialogOpen(true);
                                                                }}
                                                            >
                                                                <IconEdit size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Reset Password">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleResetPassword(user.email)}
                                                            >
                                                                <IconKey size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete User">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setDeleteUserDialogOpen(true);
                                                                }}
                                                            >
                                                                <IconTrash size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={filteredUsers.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={(_, newPage) => setPage(newPage)}
                                onRowsPerPageChange={(e) => {
                                    setRowsPerPage(parseInt(e.target.value, 10));
                                    setPage(0);
                                }}
                            />
                        </CardContent>
                    </Card>
                </>
            )}

            {tabValue === 1 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Church Management
                        </Typography>
                        <Alert severity="info">
                            Church management features are coming soon.
                        </Alert>
                    </CardContent>
                </Card>
            )}

            {/* Create User Dialog */}
            <Dialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create New User</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
                        <Box display="flex" gap={2}>
                            <TextField
                                fullWidth
                                label="First Name"
                                value={newUser.first_name}
                                onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Last Name"
                                value={newUser.last_name}
                                onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                            />
                        </Box>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        />
                        <Box display="flex" gap={2}>
                            <FormControl fullWidth>
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    label="Role"
                                >
                                    <MenuItem value="user">User</MenuItem>
                                    <MenuItem value="priest">Priest</MenuItem>
                                    <MenuItem value="deacon">Deacon</MenuItem>
                                    <MenuItem value="admin">Admin</MenuItem>
                                    <MenuItem value="super_admin">Super Admin</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Church</InputLabel>
                                <Select
                                    value={newUser.church_id}
                                    onChange={(e) => setNewUser({ ...newUser, church_id: e.target.value })}
                                    label="Church"
                                >
                                    <MenuItem value="">No Church</MenuItem>
                                    {churches.map((church) => (
                                        <MenuItem key={church.id} value={church.id.toString()}>
                                            {church.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <TextField
                            fullWidth
                            label="Phone"
                            value={newUser.phone}
                            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newUser.send_welcome_email}
                                    onChange={(e) => setNewUser({ ...newUser, send_welcome_email: e.target.checked })}
                                />
                            }
                            label="Send welcome email with temporary password"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateUserDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateUser} variant="contained">Create User</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserManagement;
