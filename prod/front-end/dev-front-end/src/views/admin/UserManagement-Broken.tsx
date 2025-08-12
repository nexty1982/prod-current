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
import { useAuth } from '../../context/AuthContext';

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
    const [loading, setLoading] = useState(true);
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
            setLoading(true);
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
        } finally {
            setLoading(false);
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

    const handleUpdateUser = async () => {
        if (!selectedUser) return;

        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: selectedUser.email,
                    first_name: selectedUser.first_name,
                    last_name: selectedUser.last_name,
                    role: selectedUser.role,
                    church_id: selectedUser.church_id,
                    phone: selectedUser.phone,
                    preferred_language: selectedUser.preferred_language,
                    is_active: selectedUser.is_active
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess('User updated successfully!');
                setEditUserDialogOpen(false);
                setSelectedUser(null);
                fetchUsers();
            } else {
                setError(data.message || 'Failed to update user');
            }
        } catch (err) {
            setError('An error occurred while updating the user');
            console.error('Error updating user:', err);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess('User deleted successfully!');
                setDeleteUserDialogOpen(false);
                setSelectedUser(null);
                fetchUsers();
            } else {
                setError(data.message || 'Failed to delete user');
            }
        } catch (err) {
            setError('An error occurred while deleting the user');
            console.error('Error deleting user:', err);
        }
    };

    const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
                method: 'PUT',
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(`User ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
                fetchUsers();
            } else {
                setError(data.message || 'Failed to update user status');
            }
        } catch (err) {
            setError('An error occurred while updating user status');
            console.error('Error toggling user status:', err);
        }
    };

    const handleResetPassword = async (email: string) => {
        try {
            const response = await fetch('/api/auth/admin-reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(`Password reset for ${email}! New password: ${data.tempPassword}`);
            } else {
                setError(data.message || 'Failed to reset password');
            }
        } catch (err) {
            setError('An error occurred while resetting password');
            console.error('Error resetting password:', err);
        }
    };

    // Filter users based on search and filters
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.last_name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesChurch = churchFilter === 'all' ||
            (churchFilter === 'none' && !user.church_id) ||
            (churchFilter !== 'none' && user.church_id === parseInt(churchFilter));
        const matchesActive = activeFilter === 'all' ||
            (activeFilter === 'active' && user.is_active) ||
            (activeFilter === 'inactive' && !user.is_active);

        return matchesSearch && matchesRole && matchesChurch && matchesActive;
    });

    // Get paginated users
    const paginatedUsers = filteredUsers.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'error';
            case 'admin': return 'warning';
            case 'priest': return 'info';
            case 'deacon': return 'secondary';
            default: return 'default';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

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
                <Tab icon={<IconUsers />} label="All Users" />
                <Tab icon={<IconBuilding />} label="Church Management" />
                <Tab icon={<IconSettings />} label="System Settings" />
            </Tabs>

            {tabValue === 0 && (
                <>
                    {/* Search and Filters */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        placeholder="Search users..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: <IconSearch size={20} />,
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <FormControl fullWidth>
                                        <InputLabel>Role</InputLabel>
                                        <Select
                                            value={roleFilter}
                                            onChange={(e) => setRoleFilter(e.target.value)}
                                            label="Role"
                                        >
                                            <MenuItem value="all">All Roles</MenuItem>
                                            <MenuItem value="super_admin">Super Admin</MenuItem>
                                            <MenuItem value="admin">Admin</MenuItem>
                                            <MenuItem value="priest">Priest</MenuItem>
                                            <MenuItem value="deacon">Deacon</MenuItem>
                                            <MenuItem value="user">User</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <FormControl fullWidth>
                                        <InputLabel>Church</InputLabel>
                                        <Select
                                            value={churchFilter}
                                            onChange={(e) => setChurchFilter(e.target.value)}
                                            label="Church"
                                        >
                                            <MenuItem value="all">All Churches</MenuItem>
                                            <MenuItem value="none">No Church</MenuItem>
                                            {churches.map((church) => (
                                                <MenuItem key={church.id} value={church.id.toString()}>
                                                    {church.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={2}>
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
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Button
                                        variant="contained"
                                        startIcon={<IconUserPlus />}
                                        onClick={() => setCreateUserDialogOpen(true)}
                                        fullWidth
                                    >
                                        Create New User
                                    </Button>
                                </Grid>
                            </Grid>
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
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedUsers.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <Stack direction="row" alignItems="center" spacing={2}>
                                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                            {user.first_name[0]}{user.last_name[0]}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="body1" fontWeight="bold">
                                                                {user.first_name} {user.last_name}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {user.email}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={user.role.replace('_', ' ').toUpperCase()}
                                                        color={getRoleBadgeColor(user.role)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {user.church_name || 'No Church'}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={user.is_active ? 'Active' : 'Inactive'}
                                                        color={user.is_active ? 'success' : 'error'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                                                </TableCell>
                                                <TableCell>
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
                                                        <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                                            >
                                                                {user.is_active ? <IconUserX size={16} /> : <IconUserCheck size={16} />}
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

            {/* Create User Dialog */}
            <Dialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create New User</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="First Name"
                                value={newUser.first_name}
                                onChange={(e) => setNewUser(prev => ({ ...prev, first_name: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Last Name"
                                value={newUser.last_name}
                                onChange={(e) => setNewUser(prev => ({ ...prev, last_name: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                                    label="Role"
                                >
                                    <MenuItem value="user">User</MenuItem>
                                    <MenuItem value="deacon">Deacon</MenuItem>
                                    <MenuItem value="priest">Priest</MenuItem>
                                    <MenuItem value="admin">Admin</MenuItem>
                                    {user?.role === 'super_admin' && (
                                        <MenuItem value="super_admin">Super Admin</MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Church</InputLabel>
                                <Select
                                    value={newUser.church_id}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, church_id: e.target.value }))}
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
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Phone"
                                value={newUser.phone}
                                onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Language</InputLabel>
                                <Select
                                    value={newUser.preferred_language}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, preferred_language: e.target.value }))}
                                    label="Language"
                                >
                                    <MenuItem value="en">English</MenuItem>
                                    <MenuItem value="el">Greek</MenuItem>
                                    <MenuItem value="ru">Russian</MenuItem>
                                    <MenuItem value="ar">Arabic</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newUser.send_welcome_email}
                                        onChange={(e) => setNewUser(prev => ({ ...prev, send_welcome_email: e.target.checked }))}
                                    />
                                }
                                label="Send welcome email with login credentials"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateUserDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateUser} variant="contained">Create User</Button>
                </DialogActions>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={editUserDialogOpen} onClose={() => setEditUserDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit User</DialogTitle>
                <DialogContent>
                    {selectedUser && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="First Name"
                                    value={selectedUser.first_name}
                                    onChange={(e) => setSelectedUser(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Last Name"
                                    value={selectedUser.last_name}
                                    onChange={(e) => setSelectedUser(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={selectedUser.email}
                                    onChange={(e) => setSelectedUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Role</InputLabel>
                                    <Select
                                        value={selectedUser.role}
                                        onChange={(e) => setSelectedUser(prev => prev ? { ...prev, role: e.target.value as any } : null)}
                                        label="Role"
                                    >
                                        <MenuItem value="user">User</MenuItem>
                                        <MenuItem value="deacon">Deacon</MenuItem>
                                        <MenuItem value="priest">Priest</MenuItem>
                                        <MenuItem value="admin">Admin</MenuItem>
                                        {user?.role === 'super_admin' && (
                                            <MenuItem value="super_admin">Super Admin</MenuItem>
                                        )}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Church</InputLabel>
                                    <Select
                                        value={selectedUser.church_id?.toString() || ''}
                                        onChange={(e) => setSelectedUser(prev => prev ? { ...prev, church_id: e.target.value ? parseInt(e.target.value) : null } : null)}
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
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Phone"
                                    value={selectedUser.phone || ''}
                                    onChange={(e) => setSelectedUser(prev => prev ? { ...prev, phone: e.target.value } : null)}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Language</InputLabel>
                                    <Select
                                        value={selectedUser.preferred_language || 'en'}
                                        onChange={(e) => setSelectedUser(prev => prev ? { ...prev, preferred_language: e.target.value } : null)}
                                        label="Language"
                                    >
                                        <MenuItem value="en">English</MenuItem>
                                        <MenuItem value="el">Greek</MenuItem>
                                        <MenuItem value="ru">Russian</MenuItem>
                                        <MenuItem value="ar">Arabic</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={selectedUser.is_active}
                                            onChange={(e) => setSelectedUser(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                                        />
                                    }
                                    label="Active User"
                                />
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditUserDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateUser} variant="contained">Update User</Button>
                </DialogActions>
            </Dialog>

            {/* View User Dialog */}
            <Dialog open={viewUserDialogOpen} onClose={() => setViewUserDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>User Details</DialogTitle>
                <DialogContent>
                    {selectedUser && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                                    <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64 }}>
                                        {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h5">
                                            {selectedUser.first_name} {selectedUser.last_name}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary">
                                            {selectedUser.email}
                                        </Typography>
                                        <Chip
                                            label={selectedUser.role.replace('_', ' ').toUpperCase()}
                                            color={getRoleBadgeColor(selectedUser.role)}
                                            size="small"
                                        />
                                    </Box>
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconMail size={16} />
                                    <Typography variant="body2">Email: {selectedUser.email}</Typography>
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconPhone size={16} />
                                    <Typography variant="body2">Phone: {selectedUser.phone || 'Not provided'}</Typography>
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconBuilding size={16} />
                                    <Typography variant="body2">Church: {selectedUser.church_name || 'No church assigned'}</Typography>
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconCalendar size={16} />
                                    <Typography variant="body2">Created: {formatDate(selectedUser.created_at)}</Typography>
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconCalendar size={16} />
                                    <Typography variant="body2">
                                        Last Login: {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                                    </Typography>
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="body2">
                                        Status: <Chip
                                            label={selectedUser.is_active ? 'Active' : 'Inactive'}
                                            color={selectedUser.is_active ? 'success' : 'error'}
                                            size="small"
                                        />
                                    </Typography>
                                </Stack>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewUserDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Delete User Dialog */}
            <Dialog open={deleteUserDialogOpen} onClose={() => setDeleteUserDialogOpen(false)}>
                <DialogTitle>Delete User</DialogTitle>
                <DialogContent>
                    {selectedUser && (
                        <Typography>
                            Are you sure you want to delete the user <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>?
                            This action cannot be undone.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteUserDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteUser} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserManagement;
