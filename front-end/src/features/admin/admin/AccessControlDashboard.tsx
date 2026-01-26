// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Typography,
    Card,
    CardContent,
    Chip,
    Grid
} from '@mui/material';
import PageContainer from '@/shared/ui/PageContainer';
import { useAuth } from '@/context/AuthContext';
import {
    IconShield,
    IconUsers,
    IconSettings,
    IconMenu2,
    IconEye,
    IconActivity
} from '@tabler/icons-react';

// Tab Components
import UserManagement from './UserManagement';
import RoleManagement from './tabs/RoleManagement';
import SessionManagement from './tabs/SessionManagement';
import MenuManagement from './tabs/MenuManagement';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`admin-tabpanel-${index}`}
            aria-labelledby={`admin-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `admin-tab-${index}`,
        'aria-controls': `admin-tabpanel-${index}`,
    };
}

const AccessControlDashboard = () => {
    const { user } = useAuth();
    const [tabValue, setTabValue] = useState(1); // Default to User Management (index 1)

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const tabConfig = [
        {
            label: 'Role Management',
            icon: <IconShield size={18} />,
            component: <RoleManagement />
        },
        {
            label: 'User & Access Management',
            icon: <IconUsers size={18} />,
            component: <UserManagement />
        },
        {
            label: 'Session Management',
            icon: <IconActivity size={18} />,
            component: <SessionManagement />
        },
        {
            label: 'Menu Management',
            icon: <IconMenu2 size={18} />,
            component: <MenuManagement />
        }
    ];

    return (
        <PageContainer title="Access Control" description="Manage users, roles, sessions, and system access">
            <Box>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h4" fontWeight={600}>
                            🔒 Access Control
                        </Typography>
                        <Box display="flex" gap={1}>
                            <Chip
                                label={user?.role || 'Admin'}
                                color="primary"
                                icon={<IconShield size={16} />}
                            />
                            <Chip
                                label="Active Sessions: 47"
                                color="success"
                                variant="outlined"
                                icon={<IconEye size={16} />}
                            />
                        </Box>
                    </Box>
                    <Typography variant="body1" color="text.secondary">
                        Manage system access, user permissions, and administrative settings
                    </Typography>
                </Box>

                {/* Tabs */}
                <Card>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            aria-label="Access Control Tabs"
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {tabConfig.map((tab, index) => (
                                <Tab
                                    key={index}
                                    icon={tab.icon}
                                    iconPosition="start"
                                    label={tab.label}
                                    {...a11yProps(index)}
                                    sx={{
                                        minHeight: 64,
                                        textTransform: 'none',
                                        fontWeight: 500
                                    }}
                                />
                            ))}
                        </Tabs>
                    </Box>

                    {/* Tab Panels */}
                    {tabConfig.map((tab, index) => (
                        <TabPanel key={index} value={tabValue} index={index}>
                            {tab.component}
                        </TabPanel>
                    ))}
                </Card>
            </Box>
        </PageContainer>
    );
};

export default AccessControlDashboard;
