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
import PageContainer from 'src/components/container/PageContainer';
import { useAuth } from 'src/context/AuthContext';
import {
    IconShield,
    IconUsers,
    IconBuilding,
    IconStar,
    IconFileText,
    IconSettings,
    IconCalendar,
    IconEye
} from '@tabler/icons-react';

// Tab Components
import AccessControlDashboard from '../admin/AccessControlDashboard';

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
            id={`orthodox-tabpanel-${index}`}
            aria-labelledby={`orthodox-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 0 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `orthodox-tab-${index}`,
        'aria-controls': `orthodox-tabpanel-${index}`,
    };
}

const OrthodMetrics = () => {
    const { user } = useAuth();
    const [tabValue, setTabValue] = useState(0); // Default to Access Control

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const tabConfig = [
        {
            label: 'Access Control',
            icon: <IconShield size={18} />,
            component: <AccessControlDashboard />,
            description: 'User, role, and session management'
        },
        {
            label: 'Explore Orthodoxy',
            icon: <IconStar size={18} />,
            component: (
                <Box p={3}>
                    <Typography variant="h5" gutterBottom>🌟 Explore Orthodoxy</Typography>
                    <Typography color="text.secondary">
                        Coming soon: Users Online, Church Topics, Orthodox Headlines Settings
                    </Typography>
                </Box>
            ),
            description: 'Community features and content discovery'
        },
        {
            label: 'Church Tools',
            icon: <IconBuilding size={18} />,
            component: (
                <Box p={3}>
                    <Typography variant="h5" gutterBottom>⛪ Church Tools</Typography>
                    <Typography color="text.secondary">
                        Coming soon: Church Management, OCR Processing, Calendar System, Records
                    </Typography>
                </Box>
            ),
            description: 'Church administration and data management'
        },
        {
            label: 'Content Management',
            icon: <IconFileText size={18} />,
            component: (
                <Box p={3}>
                    <Typography variant="h5" gutterBottom>📝 Content Management</Typography>
                    <Typography color="text.secondary">
                        Coming soon: Template Customizer, Welcome Messages, Maintenance Settings
                    </Typography>
                </Box>
            ),
            description: 'System messages and template management'
        }
    ];

    return (
        <PageContainer title="Orthodox Metrics" description="Administrative dashboard for Orthodox Metrics system">
            <Box>
                {/* Header */}
                <Box sx={{ mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h4" fontWeight={600}>
                            📊 Orthodox Metrics Admin
                        </Typography>
                        <Box display="flex" gap={1}>
                            <Chip
                                label={user?.role || 'Admin'}
                                color="primary"
                                icon={<IconShield size={16} />}
                            />
                            <Chip
                                label="System Online"
                                color="success"
                                variant="outlined"
                                icon={<IconEye size={16} />}
                            />
                        </Box>
                    </Box>
                    <Typography variant="body1" color="text.secondary">
                        Welcome back, {user?.username || 'Administrator'}. Manage your Orthodox community platform.
                    </Typography>
                </Box>

                {/* Tabs */}
                <Card>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            aria-label="Orthodox Metrics Admin Tabs"
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
                                        minHeight: 72,
                                        textTransform: 'none',
                                        fontWeight: 500,
                                        flexDirection: 'column',
                                        gap: 0.5
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

                {/* Quick Stats Footer */}
                <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2} sx={{ mt: 2 }}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h6" color="primary">
                                216
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Total Users
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h6" color="success.main">
                                47
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Active Sessions
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h6" color="info.main">
                                18
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Churches
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h6" color="warning.main">
                                99.8%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                System Uptime
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </PageContainer>
    );
};

export default OrthodMetrics;
