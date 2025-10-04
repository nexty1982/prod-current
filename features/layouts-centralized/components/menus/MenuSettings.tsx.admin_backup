import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Switch,
    FormControlLabel,
    Grid,
    Box,
    Button,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Alert,
    Chip,
    Stack,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Settings as SettingsIcon,
    RestartAlt as ResetIcon,
    Visibility as ShowIcon,
    VisibilityOff as HideIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    Dashboard as DashboardIcon,
    Apps as AppsIcon,
    Assignment as FormsIcon,
    Menu as MenuIcon,
    AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useMenuVisibility } from '../../contexts/MenuVisibilityContext';
import PageContainer from '../../components/container/PageContainer';
import BlankCard from '../../components/shared/BlankCard';
import Breadcrumb from '../../layouts/full/shared/breadcrumb/Breadcrumb';

const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {
        title: 'Settings',
    },
    {
        title: 'Menu Settings',
    },
];

interface MenuSection {
    title: string;
    icon: React.ReactNode;
    items: MenuItemConfig[];
}

interface MenuItemConfig {
    id: string;
    title: string;
    description: string;
    category: 'sidebar' | 'header' | 'dropdown';
}

const menuSections: MenuSection[] = [
    {
        title: 'Dashboard',
        icon: <DashboardIcon />,
        items: [
            { id: 'dashboard-modern', title: 'Modern Dashboard', description: 'Modern analytics dashboard', category: 'sidebar' },
        ],
    },
    {
        title: 'Applications',
        icon: <AppsIcon />,
        items: [
            { id: 'app-notes', title: 'Notes', description: 'Note taking application', category: 'sidebar' },
            { id: 'app-calendar', title: 'Calendar', description: 'Calendar and scheduling', category: 'sidebar' },
            { id: 'app-email', title: 'Email', description: 'Email management', category: 'sidebar' },
            { id: 'app-kanban', title: 'Kanban', description: 'Project management boards', category: 'sidebar' },
            { id: 'app-ocr-upload', title: 'OCR Upload', description: 'Document OCR processing', category: 'sidebar' },
            { id: 'app-invoice', title: 'Invoice', description: 'Invoice and billing management', category: 'sidebar' },
        ],
    },
    {
        title: 'Forms',
        icon: <FormsIcon />,
        items: [
            { id: 'form-tiptap-editor', title: 'Rich Text Editor', description: 'Tiptap rich text editor', category: 'sidebar' },
        ],
    },
    {
        title: 'Administration',
        icon: <AdminIcon />,
        items: [
            { id: 'admin-church-management', title: 'Church Management', description: 'Orthodox church management system', category: 'sidebar' },
            { id: 'admin-client-management', title: 'Client Management', description: 'Multi-tenant client management', category: 'sidebar' },
            { id: 'admin-site-clone', title: 'Site Clone', description: 'Website cloning tool', category: 'sidebar' },
            { id: 'admin-users', title: 'User Management', description: 'Manage system users', category: 'sidebar' },
            { id: 'admin-roles', title: 'Role Management', description: 'Manage user roles and permissions', category: 'sidebar' },
            { id: 'admin-settings', title: 'Admin Settings', description: 'System administration settings', category: 'sidebar' },
            { id: 'admin-orthodox-metrics', title: 'Orthodox Metrics Admin', description: 'Orthodox Metrics administration', category: 'sidebar' },
            { id: 'admin-ai', title: 'AI Administration', description: 'AI system administration', category: 'sidebar' },
            { id: 'admin-omai-logger', title: 'OMAI Ultimate Logger', description: 'Real-time system log monitoring and analysis', category: 'sidebar' },
            { id: 'admin-menu-permissions', title: 'Menu Permissions', description: 'Menu access control', category: 'sidebar' },
        ],
    },
    {
        title: 'Church Tools',
        icon: <SettingsIcon />,
        items: [
            { id: 'church-records-baptism', title: 'Baptism Records', description: 'Baptism record management', category: 'sidebar' },
            { id: 'church-records-marriage', title: 'Marriage Records', description: 'Marriage record management', category: 'sidebar' },
            { id: 'church-records-funeral', title: 'Funeral Records', description: 'Funeral record management', category: 'sidebar' },
        ],
    },
    {
        title: 'Content',
        icon: <MenuIcon />,
        items: [
            { id: 'content-cms', title: 'CMS', description: 'Content management system', category: 'sidebar' },
            { id: 'content-template-manager', title: 'Template Manager', description: 'Template management', category: 'sidebar' },
            { id: 'content-table-theme-editor', title: 'Table Theme Editor', description: 'Orthodox table theming', category: 'sidebar' },
        ],
    },
    {
        title: 'Settings',
        icon: <SettingsIcon />,
        items: [
            { id: 'settings-menu', title: 'Menu Settings', description: 'Configure menu visibility', category: 'sidebar' },
            { id: 'settings-logs', title: 'Server Logs', description: 'Application server logs', category: 'sidebar' },
            { id: 'settings-jit-terminal', title: 'JIT Terminal Access', description: 'Just-In-Time terminal access management', category: 'sidebar' },
        ],
    },
];

const MenuSettings: React.FC = () => {
    const { visibleMenus, extrasEnabled, toggleMenuVisibility, toggleExtras, resetToDefaults, hideAll, showAll } = useMenuVisibility();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedSections, setExpandedSections] = useState<string[]>(['Dashboard', 'Applications', 'Administration', 'Church Tools', 'Settings']);

    const handleSectionToggle = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(section => section.items.length > 0);

    const getTotalVisible = () => {
        return Object.values(visibleMenus).filter(Boolean).length;
    };

    const getTotalMenus = () => {
        return Object.keys(visibleMenus).length;
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'sidebar':
                return <Chip label="Sidebar" size="small" color="primary" variant="outlined" />;
            case 'header':
                return <Chip label="Header" size="small" color="secondary" variant="outlined" />;
            case 'dropdown':
                return <Chip label="Dropdown" size="small" color="success" variant="outlined" />;
            default:
                return null;
        }
    };

    return (
        <PageContainer title="Menu Settings" description="Configure menu visibility">
            <Breadcrumb title="Menu Settings" items={BCrumb} />

            <BlankCard>
                <CardContent>
                    {/* Header */}
                    <Box sx={{ mb: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                            <SettingsIcon color="primary" />
                            <Typography variant="h4">Menu Settings</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            Configure which menu items are visible in the navigation. Changes are saved automatically.
                        </Typography>
                    </Box>

                    {/* Statistics */}
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                            <strong>{getTotalVisible()} of {getTotalMenus()} menu items</strong> are currently visible.
                        </Typography>
                    </Alert>

                    {/* Extras Toggle */}
                    <Card variant="outlined" sx={{ mb: 3, p: 2, bgcolor: 'action.hover' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="h6" color="primary">
                                    Enable Development Extras
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Show additional components like Charts, Forms, Tables, UI Components, and Auth pages for development/demo purposes
                                </Typography>
                            </Box>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={extrasEnabled}
                                        onChange={toggleExtras}
                                        color="primary"
                                        size="medium"
                                    />
                                }
                                label=""
                            />
                        </Stack>
                    </Card>

                    {/* Controls */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search menu items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchTerm && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchTerm('')}>
                                                <ClearIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Stack direction="row" spacing={1}>
                                <Tooltip title="Show all menu items">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ShowIcon />}
                                        onClick={showAll}
                                    >
                                        Show All
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Hide all menu items">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<HideIcon />}
                                        onClick={hideAll}
                                    >
                                        Hide All
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Reset to default settings">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ResetIcon />}
                                        onClick={resetToDefaults}
                                    >
                                        Reset
                                    </Button>
                                </Tooltip>
                            </Stack>
                        </Grid>
                    </Grid>

                    <Divider sx={{ mb: 3 }} />

                    {/* Menu Sections */}
                    <Box>
                        {filteredSections.map((section) => (
                            <Accordion
                                key={section.title}
                                expanded={expandedSections.includes(section.title)}
                                onChange={() => handleSectionToggle(section.title)}
                                sx={{ mb: 1 }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                        {section.icon}
                                        <Typography variant="h6">{section.title}</Typography>
                                        <Chip
                                            label={section.items.length}
                                            size="small"
                                            color="default"
                                            variant="outlined"
                                        />
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        {section.items.map((item) => (
                                            <Grid size={{ xs: 12, md: 6 }} key={item.id}>
                                                <Card variant="outlined" sx={{ p: 2 }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                        <Box sx={{ flex: 1 }}>
                                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                                                <Typography variant="subtitle1" fontWeight="medium">
                                                                    {item.title}
                                                                </Typography>
                                                                {getCategoryIcon(item.category)}
                                                            </Stack>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {item.description}
                                                            </Typography>
                                                        </Box>
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    checked={visibleMenus[item.id] || false}
                                                                    onChange={() => toggleMenuVisibility(item.id)}
                                                                    color="primary"
                                                                />
                                                            }
                                                            label=""
                                                            sx={{ ml: 2 }}
                                                        />
                                                    </Stack>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>

                    {filteredSections.length === 0 && (
                        <Alert severity="warning" sx={{ mt: 3 }}>
                            No menu items found matching your search criteria.
                        </Alert>
                    )}
                </CardContent>
            </BlankCard>
        </PageContainer>
    );
};

export default MenuSettings;
