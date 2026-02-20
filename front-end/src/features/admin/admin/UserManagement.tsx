import React, { useState, useEffect, useMemo } from 'react';
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
    CircularProgress,
    Grid
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
    IconEye,
    IconLock,
    IconLockOpen,
    IconSend,
    IconActivity,
    IconUserCheck,
    IconUserOff,
    IconClockHour4
} from '@tabler/icons-react';

import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import UserFormModal from '@/components/UserFormModal';
import InviteUserDialog from '@/components/InviteUserDialog';
import InviteActivityDialog from '@/components/InviteActivityDialog';

// contexts
import { useAuth } from '@/context/AuthContext';
import { User as AuthUser } from '@/types/orthodox-metrics.types';

// services
import userService, { User, Church, NewUser, UpdateUser, ResetPasswordData } from '@/shared/lib/userService';

// Helper: get expiration info for invite accounts
const getExpirationInfo = (expiresAt?: string): { label: string; color: 'success' | 'warning' | 'error' | 'default'; expired: boolean; daysLeft: number } | null => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { label: 'Expired', color: 'default', expired: true, daysLeft };
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: 'error', expired: false, daysLeft };
    if (daysLeft <= 30) return { label: `${daysLeft}d left`, color: 'warning', expired: false, daysLeft };
    return { label: `${daysLeft}d left`, color: 'success', expired: false, daysLeft };
};

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
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'view' | 'edit' | 'reset-password' | 'delete-confirm'>('edit');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Lockout dialog state
    const [lockDialogOpen, setLockDialogOpen] = useState(false);
    const [lockTargetUser, setLockTargetUser] = useState<User | null>(null);
    const [lockReason, setLockReason] = useState('');

    // Activity dialog state
    const [activityDialogOpen, setActivityDialogOpen] = useState(false);
    const [activityUser, setActivityUser] = useState<User | null>(null);

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
        username: userData.email,
        role: userData.role as any,
        preferred_language: (userData.preferred_language || 'en') as any,
        timezone: userData.timezone || undefined,
        church_id: userData.church_id || undefined
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
            } else {
                setError('Failed to load churches');
            }
        } catch {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.email.trim()) { setError('Email is required'); return; }
        if (!newUser.first_name.trim()) { setError('First name is required'); return; }
        if (!newUser.last_name.trim()) { setError('Last name is required'); return; }
        if (!newUser.role) { setError('Role is required'); return; }
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
                    email: '', first_name: '', last_name: '', role: 'viewer',
                    church_id: '', phone: '', preferred_language: 'en', send_welcome_email: true
                });
                await loadData();
            } else {
                setError(response.message || 'Failed to create user');
            }
        } catch {
            setError('An error occurred while creating the user');
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
        } catch {
            setError('An error occurred during the operation');
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
        } catch {
            setError('An error occurred while updating user status');
        }
    };

    const handleLockUser = (userData: User) => {
        setLockTargetUser(userData);
        setLockReason('');
        setLockDialogOpen(true);
    };

    const handleConfirmLock = async () => {
        if (!lockTargetUser) return;
        try {
            const response = await userService.lockUser(lockTargetUser.id, lockReason || 'Administrative action');
            if (response.success) {
                setSuccess(response.message || `User ${lockTargetUser.email} has been locked`);
                setLockDialogOpen(false);
                await loadData();
            } else {
                setError(response.message || 'Failed to lock user');
            }
        } catch {
            setError('An error occurred while locking the user');
        }
    };

    const handleUnlockUser = async (userData: User) => {
        try {
            const response = await userService.unlockUser(userData.id);
            if (response.success) {
                setSuccess(response.message || `User ${userData.email} has been unlocked`);
                await loadData();
            } else {
                setError(response.message || 'Failed to unlock user');
            }
        } catch {
            setError('An error occurred while unlocking the user');
        }
    };

    const handleViewActivity = (userData: User) => {
        setActivityUser(userData);
        setActivityDialogOpen(true);
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
            (activeFilter === 'active' && userData.is_active && !userData.is_locked) ||
            (activeFilter === 'inactive' && !userData.is_active) ||
            (activeFilter === 'locked' && userData.is_locked) ||
            (activeFilter === 'invited' && !!userData.account_expires_at);

        const hasRoleAccess = isSuperAdmin() ||
            (userData.role !== 'super_admin' && userData.role !== 'admin' && userData.role !== 'church_admin');

        return matchesSearch && matchesRole && matchesChurch && matchesStatus && hasRoleAccess;
    });

    // Summary stats
    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.is_active && !u.is_locked).length;
        const locked = users.filter(u => u.is_locked).length;
        const invited = users.filter(u => !!u.account_expires_at).length;
        return { total, active, locked, invited };
    }, [users]);

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
                    <Tab icon={<IconUsers size={18} />} iconPosition="start" label="Users" />
                    <Tab icon={<IconBuilding size={18} />} iconPosition="start" label="Churches" />
                </Tabs>

                {tabValue === 0 && (
                    <>
                        {/* Summary Stat Cards */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ textAlign: 'center', cursor: 'pointer', border: activeFilter === 'all' ? 2 : 0, borderColor: 'primary.main' }} onClick={() => setActiveFilter('all')}>
                                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                        <IconUsers size={24} color="#5D87FF" />
                                        <Typography variant="h4" sx={{ mt: 0.5 }}>{stats.total}</Typography>
                                        <Typography variant="body2" color="text.secondary">Total Users</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ textAlign: 'center', cursor: 'pointer', border: activeFilter === 'active' ? 2 : 0, borderColor: 'success.main' }} onClick={() => setActiveFilter('active')}>
                                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                        <IconUserCheck size={24} color="#13DEB9" />
                                        <Typography variant="h4" sx={{ mt: 0.5 }}>{stats.active}</Typography>
                                        <Typography variant="body2" color="text.secondary">Active</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ textAlign: 'center', cursor: 'pointer', border: activeFilter === 'locked' ? 2 : 0, borderColor: 'error.main' }} onClick={() => setActiveFilter('locked')}>
                                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                        <IconUserOff size={24} color="#FA896B" />
                                        <Typography variant="h4" sx={{ mt: 0.5 }}>{stats.locked}</Typography>
                                        <Typography variant="body2" color="text.secondary">Locked</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ textAlign: 'center', cursor: 'pointer', border: activeFilter === 'invited' ? 2 : 0, borderColor: 'warning.main' }} onClick={() => setActiveFilter('invited')}>
                                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                        <IconClockHour4 size={24} color="#FFAE1F" />
                                        <Typography variant="h4" sx={{ mt: 0.5 }}>{stats.invited}</Typography>
                                        <Typography variant="body2" color="text.secondary">Invite Accounts</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Search and Filters */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                                    <TextField
                                        size="small"
                                        sx={{ flex: 1, minWidth: 220 }}
                                        placeholder="Search users..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
                                        }}
                                    />
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
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
                                    <FormControl size="small" sx={{ minWidth: 150 }}>
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
                                    <Box sx={{ flex: 1 }} />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<IconSend size={16} />}
                                        onClick={() => setInviteDialogOpen(true)}
                                    >
                                        Invite
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<IconUserPlus size={16} />}
                                        onClick={() => setCreateUserDialogOpen(true)}
                                    >
                                        Add User
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* Users Table */}
                        <Card>
                            <CardContent sx={{ p: 0 }}>
                                {loading ? (
                                    <Box display="flex" justifyContent="center" p={4}>
                                        <CircularProgress />
                                    </Box>
                                ) : (
                                    <>
                                        <TableContainer>
                                            <Table size="small">
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
                                                    {paginatedUsers.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                                                <Typography color="text.secondary">No users found</Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                    {paginatedUsers.map((userData) => {
                                                        const expInfo = getExpirationInfo(userData.account_expires_at);
                                                        return (
                                                        <TableRow key={userData.id} hover>
                                                            <TableCell>
                                                                <Stack direction="row" spacing={1.5} alignItems="center">
                                                                    <Avatar sx={{ bgcolor: expInfo ? 'warning.main' : 'primary.main', width: 36, height: 36, fontSize: '0.85rem' }}>
                                                                        {(userData.first_name?.charAt(0) || '') + (userData.last_name?.charAt(0) || '')}
                                                                    </Avatar>
                                                                    <Box>
                                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                                            <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
                                                                                {userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email}
                                                                            </Typography>
                                                                            {isUserRootSuperAdmin(userData) && (
                                                                                <Tooltip title="Root Super Admin">
                                                                                    <IconCrown size={14} style={{ color: '#FFD700' }} />
                                                                                </Tooltip>
                                                                            )}
                                                                            {expInfo && (
                                                                                <Chip
                                                                                    label="Invited"
                                                                                    size="small"
                                                                                    variant="outlined"
                                                                                    color="warning"
                                                                                    sx={{ height: 20, fontSize: '0.65rem', ml: 0.5 }}
                                                                                />
                                                                            )}
                                                                        </Stack>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                                                            {userData.email}
                                                                        </Typography>
                                                                    </Box>
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                                    <Chip
                                                                        label={userData.role}
                                                                        size="small"
                                                                        color={userService.getRoleBadgeColor(userData.role)}
                                                                        sx={{ height: 22, fontSize: '0.75rem' }}
                                                                    />
                                                                    {isUserRootSuperAdmin(userData) && (
                                                                        <Chip
                                                                            label="ROOT"
                                                                            size="small"
                                                                            sx={{
                                                                                bgcolor: '#FFD700',
                                                                                color: '#000',
                                                                                fontWeight: 'bold',
                                                                                fontSize: '0.65rem',
                                                                                height: 20
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2">
                                                                    {userData.church_name || '—'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                                                                    <Switch
                                                                        checked={userData.is_active}
                                                                        onChange={() => handleToggleUserStatus(userData.id, userData.is_active)}
                                                                        size="small"
                                                                        disabled={!canPerformDestructiveOperation(toAuthUser(userData))}
                                                                    />
                                                                    {userData.is_locked ? (
                                                                        <Chip label="Locked" size="small" color="error" sx={{ height: 22 }} />
                                                                    ) : (
                                                                        <Chip
                                                                            label={userData.is_active ? 'Active' : 'Inactive'}
                                                                            size="small"
                                                                            color={userData.is_active ? 'success' : 'default'}
                                                                            sx={{ height: 22 }}
                                                                        />
                                                                    )}
                                                                    {expInfo && (
                                                                        <Tooltip title={`Account ${expInfo.expired ? 'expired' : 'expires'}: ${new Date(userData.account_expires_at!).toLocaleDateString()}`}>
                                                                            <Chip
                                                                                label={expInfo.label}
                                                                                size="small"
                                                                                color={expInfo.color}
                                                                                variant="outlined"
                                                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                                                            />
                                                                        </Tooltip>
                                                                    )}
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {userService.formatLastLogin(userData.last_login)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Stack direction="row" spacing={0} justifyContent="flex-end">
                                                                    <Tooltip title="View">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleViewUser(userData)}
                                                                            color="info"
                                                                        >
                                                                            <IconEye size={16} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    {canManageUser(toAuthUser(userData)) && (
                                                                        <Tooltip title="Edit">
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
                                                                    {userData.account_expires_at && isSuperAdmin() && (
                                                                        <Tooltip title="View Activity">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleViewActivity(userData)}
                                                                                sx={{ color: '#FFAE1F' }}
                                                                            >
                                                                                <IconActivity size={16} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                    {canPerformDestructiveOperation(toAuthUser(userData)) && (
                                                                        <Tooltip title="Delete">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleDeleteUser(userData)}
                                                                                color="error"
                                                                            >
                                                                                <IconTrash size={16} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                    {canPerformDestructiveOperation(toAuthUser(userData)) && (
                                                                        userData.is_locked ? (
                                                                            <Tooltip title="Unlock">
                                                                                <IconButton
                                                                                    size="small"
                                                                                    onClick={() => handleUnlockUser(userData)}
                                                                                    color="success"
                                                                                >
                                                                                    <IconLockOpen size={16} />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        ) : (
                                                                            <Tooltip title="Lock">
                                                                                <IconButton
                                                                                    size="small"
                                                                                    onClick={() => handleLockUser(userData)}
                                                                                    color="error"
                                                                                >
                                                                                    <IconLock size={16} />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        )
                                                                    )}
                                                                </Stack>
                                                            </TableCell>
                                                        </TableRow>
                                                    )})}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        <TablePagination
                                            rowsPerPageOptions={[10, 25, 50]}
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
                                    Church {['super_admin', 'admin'].includes(newUser.role) ? '(Optional)' : '*'}
                                </InputLabel>
                                <Select
                                    value={newUser.church_id}
                                    onChange={(e) => setNewUser({ ...newUser, church_id: e.target.value })}
                                    label={`Church ${['super_admin', 'admin'].includes(newUser.role) ? '(Optional)' : '*'}`}
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

            {/* Lock User Dialog */}
            <Dialog open={lockDialogOpen} onClose={() => setLockDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Lock User Account</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
                        Locking this account will terminate all active sessions and prevent the user from logging in.
                    </Alert>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        User: <strong>{lockTargetUser?.email}</strong>
                    </Typography>
                    <TextField
                        fullWidth
                        label="Lockout Reason"
                        value={lockReason}
                        onChange={(e) => setLockReason(e.target.value)}
                        multiline
                        rows={2}
                        placeholder="Enter reason for locking this account..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLockDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirmLock} variant="contained" color="error">
                        Lock Account
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

            {/* Invite User Dialog */}
            <InviteUserDialog
                open={inviteDialogOpen}
                onClose={() => setInviteDialogOpen(false)}
                churches={churches}
                currentUserRole={user?.role || ''}
            />

            {/* Invite Activity Dialog */}
            {activityUser && (
                <InviteActivityDialog
                    open={activityDialogOpen}
                    onClose={() => setActivityDialogOpen(false)}
                    userId={activityUser.id}
                    userEmail={activityUser.email}
                />
            )}
        </PageContainer>
    );
};

export default UserManagement;
