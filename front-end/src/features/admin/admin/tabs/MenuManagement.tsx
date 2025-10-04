// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Switch,
    FormControlLabel,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    Alert
} from '@mui/material';
import {
    IconMenu2,
    IconPlus,
    IconEdit,
    IconTrash,
    IconChevronRight,
    IconChevronDown,
    IconHome,
    IconDashboard,
    IconUsers,
    IconBuilding,
    IconCalendar,
    IconFileText,
    IconSettings,
    IconShield,
    IconEye,
    IconEyeOff,
    IconGripVertical
} from '@tabler/icons-react';

interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    href?: string;
    parent?: string;
    order: number;
    isVisible: boolean;
    requiredRole?: string;
    children?: MenuItem[];
}

const mockMenuItems: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'IconDashboard',
        href: '/dashboard',
        order: 1,
        isVisible: true,
        requiredRole: 'user'
    },
    {
        id: 'admin-dashboard',
        label: 'Admin Dashboard',
        icon: 'IconDashboard',
        href: '/admin',
        order: 2,
        isVisible: true,
        requiredRole: 'admin'
    },
    {
        id: 'enhanced-modern',
        label: 'Enhanced Modern Dashboard',
        icon: 'IconHome',
        href: '/dashboards/modern',
        order: 3,
        isVisible: true,
        requiredRole: 'user'
    },
    {
        id: 'admin',
        label: 'Administration',
        icon: 'IconShield',
        order: 4,
        isVisible: true,
        requiredRole: 'admin'
    },
    {
        id: 'admin-users',
        label: 'User Management',
        icon: 'IconUsers',
        href: '/admin/users',
        parent: 'admin',
        order: 1,
        isVisible: true,
        requiredRole: 'admin'
    },
    {
        id: 'admin-orthodox',
        label: 'Orthodox Metrics',
        icon: 'IconDashboard',
        href: '/admin/orthodox-metrics',
        parent: 'admin',
        order: 2,
        isVisible: true,
        requiredRole: 'admin'
    },
    {
        id: 'churches',
        label: 'Churches',
        icon: 'IconBuilding',
        order: 5,
        isVisible: true,
        requiredRole: 'manager'
    },
    {
        id: 'churches-list',
        label: 'Church Directory',
        icon: 'IconBuilding',
        href: '/churches',
        parent: 'churches',
        order: 1,
        isVisible: true,
        requiredRole: 'user'
    },
    {
        id: 'calendar',
        label: 'Calendar',
        icon: 'IconCalendar',
        href: '/calendar',
        order: 6,
        isVisible: true,
        requiredRole: 'user'
    },
    {
        id: 'records',
        label: 'Church Records',
        icon: 'IconFileText',
        href: '/records',
        order: 7,
        isVisible: true,
        requiredRole: 'manager'
    }
];

const iconMap: { [key: string]: React.ReactNode } = {
    IconDashboard: <IconDashboard size={18} />,
    IconHome: <IconHome size={18} />,
    IconUsers: <IconUsers size={18} />,
    IconBuilding: <IconBuilding size={18} />,
    IconCalendar: <IconCalendar size={18} />,
    IconFileText: <IconFileText size={18} />,
    IconSettings: <IconSettings size={18} />,
    IconShield: <IconShield size={18} />
};

const MenuManagement = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
    const [editDialog, setEditDialog] = useState<{
        open: boolean;
        item: MenuItem | null;
        isNew: boolean;
    }>({
        open: false,
        item: null,
        isNew: false
    });
    const [expandedItems, setExpandedItems] = useState<string[]>(['admin', 'churches']);

    const handleToggleVisibility = (itemId: string) => {
        setMenuItems(items =>
            items.map(item =>
                item.id === itemId
                    ? { ...item, isVisible: !item.isVisible }
                    : item
            )
        );
    };

    const handleEditItem = (item: MenuItem) => {
        setEditDialog({
            open: true,
            item: { ...item },
            isNew: false
        });
    };

    const handleAddItem = (parentId?: string) => {
        const newItem: MenuItem = {
            id: '',
            label: '',
            icon: 'IconHome',
            href: '',
            parent: parentId,
            order: 1,
            isVisible: true,
            requiredRole: 'user'
        };
        setEditDialog({
            open: true,
            item: newItem,
            isNew: true
        });
    };

    const handleSaveItem = () => {
        if (!editDialog.item) return;

        if (editDialog.isNew) {
            const newId = `item_${Date.now()}`;
            setMenuItems([...menuItems, { ...editDialog.item, id: newId }]);
        } else {
            setMenuItems(items =>
                items.map(item =>
                    item.id === editDialog.item!.id ? editDialog.item! : item
                )
            );
        }
        setEditDialog({ open: false, item: null, isNew: false });
    };

    const handleDeleteItem = (itemId: string) => {
        setMenuItems(items => items.filter(item => item.id !== itemId && item.parent !== itemId));
    };

    const buildMenuTree = (items: MenuItem[]): MenuItem[] => {
        const itemMap = new Map<string, MenuItem>();
        const tree: MenuItem[] = [];

        // Create map and initialize children arrays
        items.forEach(item => {
            itemMap.set(item.id, { ...item, children: [] });
        });

        // Build tree structure
        items.forEach(item => {
            const node = itemMap.get(item.id)!;
            if (item.parent) {
                const parent = itemMap.get(item.parent);
                if (parent) {
                    parent.children!.push(node);
                }
            } else {
                tree.push(node);
            }
        });

        // Sort by order
        const sortByOrder = (items: MenuItem[]) => {
            items.sort((a, b) => a.order - b.order);
            items.forEach(item => {
                if (item.children && item.children.length > 0) {
                    sortByOrder(item.children);
                }
            });
        };

        sortByOrder(tree);
        return tree;
    };

    const renderMenuItem = (item: MenuItem, level: number = 0) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.includes(item.id);

        return (
            <Box key={item.id}>
                <ListItem
                    sx={{
                        pl: level * 2 + 1,
                        borderLeft: level > 0 ? '2px solid #e0e0e0' : 'none',
                        '&:hover': { bgcolor: 'action.hover' }
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 0, flex: 1 }}>
                        <IconGripVertical size={16} color="#999" />
                        {hasChildren && (
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setExpandedItems(prev =>
                                        isExpanded
                                            ? prev.filter(id => id !== item.id)
                                            : [...prev, item.id]
                                    );
                                }}
                            >
                                {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                            </IconButton>
                        )}
                        {!hasChildren && <Box sx={{ width: 32 }} />}
                        <Box sx={{ mr: 1 }}>
                            {item.icon && iconMap[item.icon]}
                        </Box>
                    </Box>

                    <ListItemText
                        primary={
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">{item.label}</Typography>
                                {item.requiredRole && (
                                    <Chip
                                        label={item.requiredRole}
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        }
                        secondary={item.href}
                    />

                    <ListItemSecondaryAction>
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                                size="small"
                                onClick={() => handleToggleVisibility(item.id)}
                                color={item.isVisible ? 'success' : 'default'}
                            >
                                {item.isVisible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => handleEditItem(item)}
                            >
                                <IconEdit size={16} />
                            </IconButton>
                            {hasChildren && (
                                <IconButton
                                    size="small"
                                    onClick={() => handleAddItem(item.id)}
                                    color="primary"
                                >
                                    <IconPlus size={16} />
                                </IconButton>
                            )}
                            <IconButton
                                size="small"
                                onClick={() => handleDeleteItem(item.id)}
                                color="error"
                            >
                                <IconTrash size={16} />
                            </IconButton>
                        </Box>
                    </ListItemSecondaryAction>
                </ListItem>

                {hasChildren && isExpanded && (
                    <Box>
                        {item.children!.map(child => renderMenuItem(child, level + 1))}
                    </Box>
                )}
            </Box>
        );
    };

    const menuTree = buildMenuTree(menuItems);

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                    Navigation Menu Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<IconPlus size={18} />}
                    onClick={() => handleAddItem()}
                >
                    Add Menu Item
                </Button>
            </Box>

            <Box display="flex" gap={3}>
                {/* Menu Structure */}
                <Box flex="2" minWidth="600px">
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Menu Structure
                            </Typography>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Drag items to reorder. Use the eye icon to show/hide items. Items require appropriate roles to be visible.
                            </Alert>
                            <List>
                                {menuTree.map(item => renderMenuItem(item))}
                            </List>
                        </CardContent>
                    </Card>
                </Box>

                {/* Menu Statistics & Settings */}
                <Box flex="1" minWidth="300px">
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Menu Statistics
                            </Typography>
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="primary">
                                        {menuItems.length}
                                    </Typography>
                                    <Typography variant="caption">Total Items</Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="success.main">
                                        {menuItems.filter(i => i.isVisible).length}
                                    </Typography>
                                    <Typography variant="caption">Visible Items</Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="info.main">
                                        {menuItems.filter(i => !i.parent).length}
                                    </Typography>
                                    <Typography variant="caption">Top Level</Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="warning.main">
                                        {menuItems.filter(i => i.parent).length}
                                    </Typography>
                                    <Typography variant="caption">Sub Items</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card sx={{ mt: 2 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Menu Settings
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemText
                                        primary="Auto-hide empty sections"
                                        secondary="Hide menu sections with no visible items"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch defaultChecked />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary="Show role badges"
                                        secondary="Display required roles next to menu items"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch defaultChecked />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary="Collapse by default"
                                        secondary="Start with menu sections collapsed"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch />
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* Edit Dialog */}
            <Dialog open={editDialog.open} onClose={() => setEditDialog({ ...editDialog, open: false })} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editDialog.isNew ? 'Add Menu Item' : 'Edit Menu Item'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField
                                label="Label"
                                fullWidth
                                value={editDialog.item?.label || ''}
                                onChange={(e) => setEditDialog({
                                    ...editDialog,
                                    item: { ...editDialog.item!, label: e.target.value }
                                })}
                            />
                            <TextField
                                label="URL/Href"
                                fullWidth
                                value={editDialog.item?.href || ''}
                                onChange={(e) => setEditDialog({
                                    ...editDialog,
                                    item: { ...editDialog.item!, href: e.target.value }
                                })}
                            />
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Icon</InputLabel>
                                    <Select
                                        value={editDialog.item?.icon || ''}
                                        onChange={(e) => setEditDialog({
                                            ...editDialog,
                                            item: { ...editDialog.item!, icon: e.target.value }
                                        })}
                                    >
                                        {Object.keys(iconMap).map(iconKey => (
                                            <MenuItem key={iconKey} value={iconKey}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    {iconMap[iconKey]}
                                                    {iconKey.replace('Icon', '')}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel>Required Role</InputLabel>
                                    <Select
                                        value={editDialog.item?.requiredRole || ''}
                                        onChange={(e) => setEditDialog({
                                            ...editDialog,
                                            item: { ...editDialog.item!, requiredRole: e.target.value }
                                        })}
                                    >
                                        <MenuItem value="viewer">Viewer</MenuItem>
                                        <MenuItem value="user">User</MenuItem>
                                        <MenuItem value="manager">Manager</MenuItem>
                                        <MenuItem value="admin">Admin</MenuItem>
                                        <MenuItem value="super_admin">Super Admin</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Order"
                                    type="number"
                                    fullWidth
                                    value={editDialog.item?.order || 1}
                                    onChange={(e) => setEditDialog({
                                        ...editDialog,
                                        item: { ...editDialog.item!, order: parseInt(e.target.value) || 1 }
                                    })}
                                />
                                <Box display="flex" alignItems="center">
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={editDialog.item?.isVisible || false}
                                                onChange={(e) => setEditDialog({
                                                    ...editDialog,
                                                    item: { ...editDialog.item!, isVisible: e.target.checked }
                                                })}
                                            />
                                        }
                                        label="Visible"
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog({ ...editDialog, open: false })}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveItem} variant="contained">
                        {editDialog.isNew ? 'Add' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MenuManagement;
