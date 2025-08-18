// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
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
    Switch,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import {
    IconShield,
    IconUsers,
    IconEdit,
    IconPlus,
    IconChevronDown,
    IconCheck,
    IconX,
    IconEye,
    IconTrash,
    IconDatabase,
    IconSettings
} from '@tabler/icons-react';

interface Role {
    id: string;
    name: string;
    description: string;
    userCount: number;
    permissions: string[];
    isSystemRole: boolean;
    isActive: boolean;
}

interface Permission {
    id: string;
    name: string;
    category: string;
    description: string;
}

const mockRoles: Role[] = [
    {
        id: '1',
        name: 'Super Administrator',
        description: 'Full system access with all permissions',
        userCount: 2,
        permissions: ['all'],
        isSystemRole: true,
        isActive: true
    },
    {
        id: '2',
        name: 'Administrator',
        description: 'Church-level administrative access',
        userCount: 8,
        permissions: ['church_admin', 'user_management', 'data_management'],
        isSystemRole: true,
        isActive: true
    },
    {
        id: '3',
        name: 'Manager',
        description: 'Limited administrative functions',
        userCount: 15,
        permissions: ['data_entry', 'reports_view', 'user_view'],
        isSystemRole: false,
        isActive: true
    },
    {
        id: '4',
        name: 'User',
        description: 'Basic user access',
        userCount: 124,
        permissions: ['profile_edit', 'data_view'],
        isSystemRole: true,
        isActive: true
    },
    {
        id: '5',
        name: 'Viewer',
        description: 'Read-only access',
        userCount: 67,
        permissions: ['data_view'],
        isSystemRole: true,
        isActive: true
    }
];

const mockPermissions: Permission[] = [
    { id: '1', name: 'User Management', category: 'Administration', description: 'Create, edit, and delete users' },
    { id: '2', name: 'Role Management', category: 'Administration', description: 'Manage roles and permissions' },
    { id: '3', name: 'Church Management', category: 'Church', description: 'Add and manage churches' },
    { id: '4', name: 'Data Entry', category: 'Data', description: 'Enter sacrament and member data' },
    { id: '5', name: 'Data Export', category: 'Data', description: 'Export church data' },
    { id: '6', name: 'Reports View', category: 'Reports', description: 'View and generate reports' },
    { id: '7', name: 'System Settings', category: 'System', description: 'Modify system configuration' },
    { id: '8', name: 'Audit Logs', category: 'System', description: 'View system audit logs' }
];

const RoleManagement = () => {
    const [roles, setRoles] = useState<Role[]>(mockRoles);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);

    const handleRoleToggle = (roleId: string) => {
        setRoles(roles.map(role =>
            role.id === roleId
                ? { ...role, isActive: !role.isActive }
                : role
        ));
    };

    const getPermissionsByCategory = () => {
        const categories: { [key: string]: Permission[] } = {};
        mockPermissions.forEach(permission => {
            if (!categories[permission.category]) {
                categories[permission.category] = [];
            }
            categories[permission.category].push(permission);
        });
        return categories;
    };

    const permissionCategories = getPermissionsByCategory();

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                    Role & Permission Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<IconPlus size={18} />}
                >
                    Create Role
                </Button>
            </Box>

            <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} gap={3}>
                {/* Roles Table */}
                <Box flex={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                System Roles
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Role Name</TableCell>
                                            <TableCell>Users</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {roles.map((role) => (
                                            <TableRow
                                                key={role.id}
                                                hover
                                                onClick={() => setSelectedRole(role.id)}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body1" fontWeight={600}>
                                                            {role.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {role.description}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={`${role.userCount} users`}
                                                        size="small"
                                                        color="info"
                                                        icon={<IconUsers size={14} />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={role.isSystemRole ? 'System' : 'Custom'}
                                                        size="small"
                                                        color={role.isSystemRole ? 'default' : 'secondary'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={role.isActive}
                                                                onChange={() => handleRoleToggle(role.id)}
                                                                size="small"
                                                            />
                                                        }
                                                        label={role.isActive ? 'Active' : 'Inactive'}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" disabled={role.isSystemRole}>
                                                        <IconEdit size={16} />
                                                    </IconButton>
                                                    <IconButton size="small" disabled={role.isSystemRole} color="error">
                                                        <IconTrash size={16} />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Box>

                {/* Role Details & Permissions */}
                <Box flex={1}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Available Permissions
                            </Typography>

                            {Object.entries(permissionCategories).map(([category, permissions]) => (
                                <Accordion key={category}>
                                    <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
                                        <Typography variant="subtitle2">{category}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <List dense>
                                            {permissions.map((permission) => (
                                                <ListItem key={permission.id}>
                                                    <ListItemText
                                                        primary={permission.name}
                                                        secondary={permission.description}
                                                    />
                                                    <ListItemSecondaryAction>
                                                        <IconButton size="small">
                                                            <IconSettings size={14} />
                                                        </IconButton>
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            ))}
                                        </List>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Role Statistics */}
                    <Card sx={{ mt: 2 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Role Statistics
                            </Typography>
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="primary">
                                        {roles.length}
                                    </Typography>
                                    <Typography variant="caption">Total Roles</Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="success.main">
                                        {roles.filter(r => r.isActive).length}
                                    </Typography>
                                    <Typography variant="caption">Active Roles</Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="warning.main">
                                        {roles.filter(r => r.isSystemRole).length}
                                    </Typography>
                                    <Typography variant="caption">System Roles</Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="info.main">
                                        {roles.reduce((sum, role) => sum + role.userCount, 0)}
                                    </Typography>
                                    <Typography variant="caption">Total Users</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default RoleManagement;
