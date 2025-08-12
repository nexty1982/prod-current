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
    Snackbar,
    CircularProgress
} from '@mui/material';
import {
    IconKey,
    IconUserPlus,
    IconBuilding,
    IconUsers,
    IconSearch,
    IconEdit,
    IconTrash,
    IconEye,
    IconEyeOff
} from '@tabler/icons-react';

import PageContainer from 'src/components/container/PageContainer';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import UserFormModal from 'src/components/UserFormModal';

// contexts
import { useAuth } from '../../context/AuthContext';

// services
import userService, { User, Church, NewUser, UpdateUser, ResetPasswordData } from '../../services/userService';

const UserManagement: React.FC = () => {
    const { user, canCreateAdmins, canManageAllUsers, isSuperAdmin } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [churches, setChurches] = useState<Church[]>([]);
    const [loading, setLoading] = useState(false);
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
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'edit' | 'reset-password' | 'delete-confirm'>('edit');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Form state for creating users
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
            loadData();
        }
    }, [isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersResponse, churchesResponse] = await Promise.all([
                userService.getUsers(),
                userService.getChurches()
            ]);

            if (usersResponse.success) {
                setUsers(usersResponse.users || []);
            } else {
                setError(usersResponse.message || 'Failed to load users');
            }

            if (churchesResponse.success) {
                setChurches(churchesResponse.churches || []);
            }
        } catch (err) {
            setError('Failed to load data');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async () => {
        try {
            setLoading(true);
            const response = await userService.createUser(newUser);

            if (response.success) {
                setSuccess(`User created successfully! ${response.tempPassword ? `Temporary password: ${response.tempPassword}` : ''}`);
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
                await loadData();
            } else {
                setError(response.message || 'Failed to create user');
            }
        } catch (err) {
            setError('An error occurred while creating the user');
            console.error('Error creating user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleResetPassword = (user: User) => {
        setSelectedUser(user);
        setModalMode('reset-password');
        setModalOpen(true);
    };

    const handleDeleteUser = (user: User) => {
        setSelectedUser(user);
        setModalMode('delete-confirm');
        setModalOpen(true);
    };

    const handleModalSubmit = async (data: UpdateUser | ResetPasswordData | { confirm: boolean }) => {
        if (!selectedUser) return;

        try {
            setModalLoading(true);
            let response;

            if (modalMode === 'edit') {
                response = await userService.updateUser(selectedUser.id, data as UpdateUser);
            } else if (modalMode === 'reset-password') {
                response = await userService.resetPassword(selectedUser.id, data as ResetPasswordData);
                if (response.success && response.newPassword) {
                    setSuccess(`Password reset successfully! New password: ${response.newPassword}`);
                }
            } else if (modalMode === 'delete-confirm') {
                response = await userService.deleteUser(selectedUser.id);
            }

            if (response?.success) {
                if (modalMode !== 'reset-password' || !response.newPassword) {
                    setSuccess(response.message || 'Operation completed successfully');
                }
                setModalOpen(false);
                await loadData();
            } else {
                setError(response?.message || 'Operation failed');
            }
        } catch (err) {
            setError('An error occurred during the operation');
            console.error('Error in modal operation:', err);
        } finally {
            setModalLoading(false);
        }
    };

    const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
        try {
            const response = await userService.toggleUserStatus(userId);

            if (response.success) {
                setSuccess(response.message || `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
                await loadData();
            } else {
                setError(response.message || 'Failed to update user status');
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

        // Role-based access: Regular admins can't see super_admin or other admin users
        const hasRoleAccess = isSuperAdmin() ||
            (user.role !== 'super_admin' && user.role !== 'admin');

        return matchesSearch && matchesRole && matchesChurch && matchesStatus && hasRoleAccess;
    });

    // Paginate filtered users
    const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const canEditUser = (targetUser: User): boolean => {
        if (targetUser.id === user?.id) return false; // Can't edit self
        
        if (isSuperAdmin()) {
            return targetUser.role !== 'super_admin';
        }
        
        if (user?.role === 'admin') {
            return !['admin', 'super_admin'].includes(targetUser.role);
        }
        
        return false;
    };

    const canDeleteUser = (targetUser: User): boolean => {
        if (targetUser.id === user?.id) return false; // Can't delete self
        
        if (isSuperAdmin()) {
            return targetUser.role !== 'super_admin';
        }
        
        if (user?.role === 'admin') {
            return !['admin', 'super_admin'].includes(targetUser.role);
        }
        
        return false;
    };

    if (!isAdmin) {
        return (
            <PageContainer title="User Management" description="Admin user management system">
                <Alert severity="error">
                    You do not have permission to access this page.
                </Alert>
            </PageContainer>
        );
    }

    const BCrumb = [
        { to: '/', title: 'Home' },
        { to: '/admin', title: 'Admin' },
        { title: 'User Management' },
    ];

    return (
        <PageContainer title="User Management" description="Manage users in the Orthodox Metrics system">
            <Breadcrumb title="User Management" items={BCrumb} />
            <Box p={3}>
                <Typography variant="h4" gutterBottom>
                    User Management
                </Typography>

                <Snackbar
                    open={!!error}
                    autoHideDuration={6000}
                    onClose={() => setError(null)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Snackbar>

                <Snackbar
                    open={!!success}
                    autoHideDuration={6000}
                    onClose={() => setSuccess(null)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert severity="success" onClose={() => setSuccess(null)}>
                        {success}
                    </Alert>
                </Snackbar>

                <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
                    <Tab icon={<IconUsers />} label="User Management" />
                    <Tab icon={<IconBuilding />} label="Church Management" />
                </Tabs>

                {tabValue === 0 && (
                    <>
                        {/* Search and Filters */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                                    <TextField
                                        sx={{ flex: 1, minWidth: 250 }}
                                        placeholder="Search users..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: <IconSearch size={20} />,
                                        }}
                                    />
                                    <FormControl sx={{ minWidth: 120 }}>
                                        <InputLabel>Role</InputLabel>
                                        <Select
                                            value={roleFilter}
                                            onChange={(e) => setRoleFilter(e.target.value)}
                                            label="Role"
                                        >
                                            <MenuItem value="all">All Roles</MenuItem>
                                            {isSuperAdmin() && (
                                                <>
                                                    <MenuItem value="admin">Admin</MenuItem>
                                                    <MenuItem value="super_admin">Super Admin</MenuItem>
                                                </>
                                            )}
                                            <MenuItem value="priest">Priest</MenuItem>
                                            <MenuItem value="deacon">Deacon</MenuItem>
                                            <MenuItem value="manager">Manager</MenuItem>
                                            <MenuItem value="user">User</MenuItem>
                                            <MenuItem value="viewer">Viewer</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl sx={{ minWidth: 150 }}>
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
                                    <FormControl sx={{ minWidth: 120 }}>
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
                                    <Button
                                        variant="contained"
                                        startIcon={<IconUserPlus />}
                                        onClick={() => setCreateUserDialogOpen(true)}
                                    >
                                        Add User
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* Users Table */}
                        <Card>
                            <CardContent>
                                {loading ? (
                                    <Box display="flex" justifyContent="center" p={3}>
                                        <CircularProgress />
                                    </Box>
                                ) : (
                                    <>
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
                                                    {paginatedUsers.map((userData) => (
                                                        <TableRow key={userData.id}>
                                                            <TableCell>
                                                                <Stack direction="row" spacing={2} alignItems="center">
                                                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                                        {userData.first_name.charAt(0)}{userData.last_name.charAt(0)}
                                                                    </Avatar>
                                                                    <Box>
                                                                        <Typography variant="subtitle2">
                                                                            {userData.first_name} {userData.last_name}
                                                                        </Typography>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            {userData.email}
                                                                        </Typography>
                                                                    </Box>
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={userData.role}
                                                                    size="small"
                                                                    color={userService.getRoleBadgeColor(userData.role)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                {userData.church_name || 'No Church'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Stack direction="row" spacing={1} alignItems="center">
                                                                    <Switch
                                                                        checked={userData.is_active}
                                                                        onChange={() => handleToggleUserStatus(userData.id, userData.is_active)}
                                                                        size="small"
                                                                        disabled={!canEditUser(userData)}
                                                                    />
                                                                    <Chip
                                                                        label={userData.is_active ? 'Active' : 'Inactive'}
                                                                        size="small"
                                                                        color={userData.is_active ? 'success' : 'default'}
                                                                    />
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2">
                                                                    {userService.formatLastLogin(userData.last_login)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Stack direction="row" spacing={1}>
                                                                    {canEditUser(userData) && (
                                                                        <Tooltip title="Edit User">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleEditUser(userData)}
                                                                                color="primary"
                                                                            >
                                                                                <IconEdit size={16} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                    {canEditUser(userData) && (
                                                                        <Tooltip title="Reset Password">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleResetPassword(userData)}
                                                                                color="warning"
                                                                            >
                                                                                <IconKey size={16} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                    {canDeleteUser(userData) && (
                                                                        <Tooltip title="Delete User">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleDeleteUser(userData)}
                                                                                color="error"
                                                                            >
                                                                                <IconTrash size={16} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                </Stack>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        <TablePagination
                                            rowsPerPageOptions={[5, 10, 25, 50]}
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
                                    </>
                                )}
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
            </Box>

            {/* Create User Dialog */}
            <Dialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create New User</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={2}>
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
                        </Stack>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        />
                        <Stack direction="row" spacing={2}>
                            <FormControl fullWidth>
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    label="Role"
                                >
                                    <MenuItem value="user">User</MenuItem>
                                    <MenuItem value="viewer">Viewer</MenuItem>
                                    <MenuItem value="priest">Priest</MenuItem>
                                    <MenuItem value="deacon">Deacon</MenuItem>
                                    <MenuItem value="manager">Manager</MenuItem>
                                    {canCreateAdmins() && (
                                        <MenuItem value="admin">Admin</MenuItem>
                                    )}
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
                        </Stack>
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
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateUserDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleCreateUser} 
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : undefined}
                    >
                        {loading ? 'Creating...' : 'Create User'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* User Form Modal */}
            <UserFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                user={selectedUser}
                churches={churches}
                mode={modalMode}
                onSubmit={handleModalSubmit}
                loading={modalLoading}
                currentUserRole={user?.role}
            />
        </PageContainer>
    );
};

export default UserManagement;

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
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
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

        // Role-based access: Regular admins can't see super_admin or other admin users
        const hasRoleAccess = isSuperAdmin() ||
            (user.role !== 'super_admin' && user.role !== 'admin');

        return matchesSearch && matchesRole && matchesChurch && matchesStatus && hasRoleAccess;
    });

    // Paginate filtered users
    const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    if (!isAdmin) {
        return (
            <PageContainer title="User Management" description="Admin user management system">
                <Alert severity="error">
                    You do not have permission to access this page.
                </Alert>
            </PageContainer>
        );
    }

    const BCrumb = [
        { to: '/', title: 'Home' },
        { to: '/admin', title: 'Admin' },
        { title: 'User Management' },
    ];

    return (
        <PageContainer title="User Management" description="Manage users in the Orthodox Metrics system">
            <Breadcrumb title="User Management" items={BCrumb} />
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
                                                {isSuperAdmin() && (
                                                    <>
                                                        <MenuItem value="admin">Admin</MenuItem>
                                                        <MenuItem value="super_admin">Super Admin</MenuItem>
                                                    </>
                                                )}
                                                <MenuItem value="priest">Priest</MenuItem>
                                                <MenuItem value="deacon">Deacon</MenuItem>
                                                <MenuItem value="user">User</MenuItem>
                                                <MenuItem value="manager">Manager</MenuItem>
                                                <MenuItem value="viewer">Viewer</MenuItem>
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
                                                            <Tooltip title="Reset Password">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleResetPassword(user.email)}
                                                                >
                                                                    <IconKey size={16} />
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
            </Box>

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
                                    <MenuItem value="manager">Manager</MenuItem>
                                    <MenuItem value="viewer">Viewer</MenuItem>
                                    {canCreateAdmins() && (
                                        <MenuItem value="admin">Admin</MenuItem>
                                    )}
                                    {/* Super Admin role is never selectable - only one exists */}
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
        </PageContainer>
    );
};

export default UserManagement;
