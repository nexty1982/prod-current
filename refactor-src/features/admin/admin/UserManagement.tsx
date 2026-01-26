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
    IconCrown,
    IconEye
} from '@tabler/icons-react';

import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import UserFormModal from '@/components/UserFormModal';

// contexts
import { useAuth } from '@/context/AuthContext';
import { User as AuthUser } from '@/types/orthodox-metrics.types';

// services
import userService, { User, Church, NewUser, UpdateUser, ResetPasswordData } from '@/shared/lib/userService';

const UserManagement: React.FC = () => {
    const { 
        user, 
        canCreateAdmins, 
        canManageAllUsers, 
        isSuperAdmin,
        isRootSuperAdmin,
        canManageUser,
        canPerformDestructiveOperation,
        canChangeRole
    } = useAuth();
    
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
    const [modalMode, setModalMode] = useState<'view' | 'edit' | 'reset-password' | 'delete-confirm'>('edit');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Form state for creating users
    const [newUser, setNewUser] = useState<NewUser>({
        email: '',
        first_name: '',
        last_name: '',
        role: 'viewer',
        church_id: '',
        phone: '',
        preferred_language: 'en',
        send_welcome_email: true
    });

    // Check if user is admin
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'church_admin';

    // Helper function to convert userService User to AuthUser for permission checks
    const toAuthUser = (userData: User): AuthUser => ({
        ...userData,
        username: userData.email, // Use email as username since it's missing from userService User
        role: userData.role as any, // Type assertion for role compatibility
        preferred_language: (userData.preferred_language || 'en') as any,
        timezone: userData.timezone || undefined,
        church_id: userData.church_id || undefined // Convert null to undefined
    });

    // Root super admin email constant
    const ROOT_SUPERADMIN_EMAIL = 'superadmin@orthodoxmetrics.com';

    useEffect(() => {
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            console.log('📊 Frontend: Loading data...');
            console.log('🔐 Current user:', user);
            console.log('🔐 User role:', user?.role);
            console.log('🔐 Is admin?', isAdmin);
            
            // Debug: Test direct API call
            try {
                const testResponse = await fetch('/api/admin/users', {
                    credentials: 'include'
                });
                console.log('🔍 Direct API test response status:', testResponse.status);
                console.log('🔍 Direct API test response headers:', Object.fromEntries(testResponse.headers.entries()));
                if (!testResponse.ok) {
                    const errorText = await testResponse.text();
                    console.log('🔍 Direct API test error body:', errorText);
                }
            } catch (directErr) {
                console.log('🔍 Direct API test failed:', directErr);
            }
            
            const [usersResponse, churchesResponse] = await Promise.all([
                userService.getUsers(),
                userService.getChurches()
            ]);

            console.log('📊 Frontend: Users response:', usersResponse);
            if (usersResponse.success) {
                console.log('📊 Frontend: Setting users to:', usersResponse.users?.length, 'users');
                // Debug: Log each user's is_active status
                usersResponse.users?.forEach((u, i) => {
                    console.log(`👤 User ${i+1}: ${u.email} - is_active: ${u.is_active} (type: ${typeof u.is_active})`);
                });
                setUsers(usersResponse.users || []);
            } else {
                console.error('❌ Users API failed:', usersResponse);
                setError(usersResponse.message || 'Failed to load users');
            }

            if (churchesResponse.success) {
                console.log('✅ Churches loaded:', churchesResponse.churches);
                console.log('🔍 Looking for Saints Peter and Paul:', 
                    churchesResponse.churches?.find(ch => ch.name && ch.name.includes('Saints Peter and Paul')));
                setChurches(churchesResponse.churches || []);
            } else {
                console.error('❌ Churches API failed:', churchesResponse);
                console.error('❌ Failed to load churches:', churchesResponse.message);
                if (churchesResponse.message === undefined) {
                    setError('Failed to load churches: API returned undefined message (possible 401 error)');
                } else {
                    setError('Failed to load churches: ' + churchesResponse.message);
                }
            }
        } catch (err) {
            console.error('❌ Error loading data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async () => {
        // Validate required fields
        if (!newUser.email.trim()) {
            setError('Email is required');
            return;
        }
        if (!newUser.first_name.trim()) {
            setError('First name is required');
            return;
        }
        if (!newUser.last_name.trim()) {
            setError('Last name is required');
            return;
        }
        if (!newUser.role) {
            setError('Role is required');
            return;
        }
        // Church selection is only required for non-global roles
        if (!newUser.church_id && !['super_admin', 'admin'].includes(newUser.role)) {
            setError('Church selection is required for this role');
            return;
        }

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
                    role: 'viewer',
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

    const handleViewUser = (userData: User) => {
        setSelectedUser(userData);
        setModalMode('view');
        setModalOpen(true);
    };

    const handleEditUser = (userData: User) => {
        console.log('🔍 EDIT USER CLICKED - userData received:', JSON.stringify(userData, null, 2));
        console.log('🔍 userData.church_id:', userData.church_id, 'type:', typeof userData.church_id);
        console.log('🔍 Current churches state:', churches.length, 'churches loaded');
        setSelectedUser(userData);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleResetPassword = (userData: User) => {
        setSelectedUser(userData);
        setModalMode('reset-password');
        setModalOpen(true);
    };

    const handleDeleteUser = (userData: User) => {
        setSelectedUser(userData);
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
            console.log(`🔄 Frontend: Toggling user ${userId} from ${currentStatus} to ${!currentStatus}`);
            const response = await userService.toggleUserStatus(userId);
            console.log('🔄 Frontend: Toggle response:', response);

            if (response.success) {
                setSuccess(response.message || `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
                console.log('🔄 Frontend: Calling loadData to refresh users list...');
                await loadData();
                console.log('🔄 Frontend: loadData completed');
            } else {
                setError(response.message || 'Failed to update user status');
            }
        } catch (err) {
            setError('An error occurred while updating user status');
            console.error('Error toggling user status:', err);
        }
    };

    // Filter users based on search and filters
    const filteredUsers = users.filter((userData: User) => {
        const matchesSearch =
            (userData.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (userData.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (userData.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (userData.church_name && userData.church_name.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = roleFilter === 'all' || userData.role === roleFilter;
        const matchesChurch = churchFilter === 'all' || (userData.church_id && userData.church_id.toString() === churchFilter);
        const matchesStatus = activeFilter === 'all' ||
            (activeFilter === 'active' && userData.is_active) ||
            (activeFilter === 'inactive' && !userData.is_active);

        // Role-based access: Regular admins can't see super_admin or other admin users
        const hasRoleAccess = isSuperAdmin() ||
            (userData.role !== 'super_admin' && userData.role !== 'admin' && userData.role !== 'church_admin');

        return matchesSearch && matchesRole && matchesChurch && matchesStatus && hasRoleAccess;
    });

    // Paginate filtered users
    const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // Check if a user is the root super admin
    const isUserRootSuperAdmin = (userData: User): boolean => {
        return userData.email === ROOT_SUPERADMIN_EMAIL;
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
                                                                        {(userData.first_name?.charAt(0) || '') + (userData.last_name?.charAt(0) || '')}
                                                                    </Avatar>
                                                                    <Box>
                                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                                            <Typography variant="subtitle2">
                                                                                {userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email}
                                                                            </Typography>
                                                                            {isUserRootSuperAdmin(userData) && (
                                                                                <Tooltip title="Root Super Admin">
                                                                                    <IconCrown size={16} style={{ color: '#FFD700' }} />
                                                                                </Tooltip>
                                                                            )}
                                                                        </Stack>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            {userData.email}
                                                                        </Typography>
                                                                    </Box>
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Stack direction="row" spacing={1} alignItems="center">
                                                                    <Chip
                                                                        label={userData.role}
                                                                        size="small"
                                                                        color={userService.getRoleBadgeColor(userData.role)}
                                                                    />
                                                                    {isUserRootSuperAdmin(userData) && (
                                                                        <Chip
                                                                            label="ROOT"
                                                                            size="small"
                                                                            sx={{ 
                                                                                bgcolor: '#FFD700', 
                                                                                color: '#000',
                                                                                fontWeight: 'bold',
                                                                                fontSize: '0.7rem'
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Stack>
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
                                                                        disabled={!canPerformDestructiveOperation(toAuthUser(userData))}
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
                                                                    <Tooltip title="View User">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleViewUser(userData)}
                                                                            color="info"
                                                                        >
                                                                            <IconEye size={16} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    {canManageUser(toAuthUser(userData)) && (
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
                                                                    {canManageUser(toAuthUser(userData)) && (
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
                                                                    {canPerformDestructiveOperation(toAuthUser(userData)) && (
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
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}
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
                                    <MenuItem value="viewer">Viewer</MenuItem>
                                    <MenuItem value="editor">Editor</MenuItem>
                                    <MenuItem value="deacon">Deacon</MenuItem>
                                    <MenuItem value="priest">Priest</MenuItem>
                                    <MenuItem value="church_admin">Church Administrator</MenuItem>
                                    {canCreateAdmins() && (
                                        <MenuItem value="admin">Platform Administrator</MenuItem>
                                    )}
                                    {isRootSuperAdmin() && (
                                        <MenuItem value="super_admin">Super Administrator</MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                            <FormControl 
                                fullWidth 
                                required={!['super_admin', 'admin'].includes(newUser.role)}
                            >
                                <InputLabel>
                                    Church {['super_admin', 'admin'].includes(newUser.role) ? '(Optional - Global Access)' : '*'}
                                </InputLabel>
                                <Select
                                    value={newUser.church_id}
                                    onChange={(e) => setNewUser({ ...newUser, church_id: e.target.value })}
                                    label={`Church ${['super_admin', 'admin'].includes(newUser.role) ? '(Optional - Global Access)' : '*'}`}
                                >
                                    <MenuItem value="">
                                        {['super_admin', 'admin'].includes(newUser.role) 
                                            ? 'No specific church (Global Access)' 
                                            : 'Select a church...'
                                        }
                                    </MenuItem>
                                    {churches.sort((a, b) => a.name.localeCompare(b.name)).map((church) => (
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
