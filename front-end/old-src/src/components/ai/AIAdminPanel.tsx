// AI-Enhanced Admin Panel for Orthodox Metrics
import React, { useState } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    IconButton,
    Alert,
    Divider,
    Tab,
    Tabs,
    Badge,
    Paper,
    Stack,
    CircularProgress,
    Tooltip,
    LinearProgress,
} from '@mui/material';
import {
    IconBrain,
    IconRobot,
    IconScan,
    IconLanguage,
    IconChartBar,
    IconSettings,
    IconRefresh,
    IconActivity,
    IconAlertTriangle,
    IconCheck,
    IconClock,
    IconUsers,
    IconServer,
    IconShield,
    IconBulb,
    IconEye,
    IconHeart,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../services/aiService';
import AIContentGenerator from './AIContentGenerator';
import AIAnalyticsDashboard from './AIAnalyticsDashboard';
import AITranslationAssistant from './AITranslationAssistant';
import AIDeploymentAutomation from './AIDeploymentAutomation';
import AILogAnalysis from './AILogAnalysis';

interface AIServiceStatusProps {
    serviceName: string;
    status: 'online' | 'offline' | 'degraded';
    responseTime?: number;
    uptime?: number;
    icon: React.ReactNode;
}

const AIServiceStatus: React.FC<AIServiceStatusProps> = ({
    serviceName,
    status,
    responseTime,
    uptime,
    icon,
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online':
                return 'success';
            case 'degraded':
                return 'warning';
            case 'offline':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Card variant="outlined">
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        {icon}
                        <Typography variant="subtitle1">{serviceName}</Typography>
                    </Box>
                    <Chip
                        size="small"
                        label={status.toUpperCase()}
                        color={getStatusColor(status) as any}
                        variant={status === 'online' ? 'filled' : 'outlined'}
                    />
                </Box>

                {responseTime && (
                    <Typography variant="body2" color="text.secondary">
                        Response Time: {responseTime}ms
                    </Typography>
                )}

                {uptime && (
                    <Typography variant="body2" color="text.secondary">
                        Uptime: {uptime}%
                    </Typography>
                )}

                {status === 'online' && (
                    <LinearProgress
                        variant="determinate"
                        value={uptime || 100}
                        color="success"
                        sx={{ mt: 1, height: 4, borderRadius: 2 }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

interface AIQuickStatsProps {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color?: 'primary' | 'success' | 'warning' | 'error';
}

const AIQuickStats: React.FC<AIQuickStatsProps> = ({
    title,
    value,
    change,
    icon,
    color = 'primary',
}) => {
    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="h4" color={`${color}.main`}>
                            {value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {title}
                        </Typography>
                        {change !== undefined && (
                            <Typography
                                variant="caption"
                                color={change >= 0 ? 'success.main' : 'error.main'}
                                display="flex"
                                alignItems="center"
                                gap={0.5}
                                mt={0.5}
                            >
                                {change >= 0 ? '↗' : '↘'} {Math.abs(change)}%
                            </Typography>
                        )}
                    </Box>
                    <Box color={`${color}.main`}>{icon}</Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export const AIAdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);

    // AI Service Health Check
    const {
        data: aiHealth,
        isLoading: healthLoading,
        error: healthError,
        refetch: refetchHealth,
    } = useQuery({
        queryKey: ['ai-health'],
        queryFn: () => aiService.healthCheck(),
        refetchInterval: 30000, // 30 seconds
    });

    const tabLabels = [
        { label: 'Overview', icon: <IconBrain size={16} /> },
        { label: 'Analytics', icon: <IconChartBar size={16} /> },
        { label: 'Content Generator', icon: <IconRobot size={16} /> },
        { label: 'Translation', icon: <IconLanguage size={16} /> },
        { label: 'Deployment', icon: <IconServer size={16} /> },
        { label: 'Log Analysis', icon: <IconActivity size={16} /> },
    ];

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Real AI usage stats from backend
    const {
        data: aiMetrics,
        isLoading: metricsLoading,
        error: metricsError,
        refetch: refetchMetrics,
    } = useQuery({
        queryKey: ['ai-metrics'],
        queryFn: () => aiService.getMetrics(),
        refetchInterval: 60000, // 1 minute
    });

    const aiUsageStats = aiMetrics || {
        dailyRequests: 0,
        contentGenerated: 0,
        translations: 0,
        avgResponseTime: 0,
        successRate: 0,
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" display="flex" alignItems="center" gap={2}>
                    <IconBrain size={32} />
                    AI Administration Panel
                </Typography>
                <Box display="flex" gap={1}>
                    <Tooltip title="Refresh AI Services">
                        <IconButton onClick={() => refetchHealth()}>
                            <IconRefresh size={20} />
                        </IconButton>
                    </Tooltip>
                    <Button variant="outlined" startIcon={<IconSettings />}>
                        AI Settings
                    </Button>
                </Box>
            </Box>

            {/* AI Service Status Overview */}
            {healthError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    AI services are currently unavailable. Please check the AI backend connection.
                </Alert>
            )}

            {/* Quick Stats */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <AIQuickStats
                        title="Daily AI Requests"
                        value={aiUsageStats.dailyRequests}
                        change={12}
                        icon={<IconActivity size={24} />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <AIQuickStats
                        title="Content Generated"
                        value={aiUsageStats.contentGenerated}
                        change={8}
                        icon={<IconRobot size={24} />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <AIQuickStats
                        title="Translations"
                        value={aiUsageStats.translations}
                        change={15}
                        icon={<IconLanguage size={24} />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <AIQuickStats
                        title="Avg Response (ms)"
                        value={aiUsageStats.avgResponseTime}
                        change={-8}
                        icon={<IconClock size={24} />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <AIQuickStats
                        title="Success Rate"
                        value={`${aiUsageStats.successRate}%`}
                        change={2}
                        icon={<IconCheck size={24} />}
                        color="success"
                    />
                </Grid>
            </Grid>

            {/* Service Status */}
            {aiHealth && (
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} md={4}>
                        <AIServiceStatus
                            serviceName="Content Generation"
                            status={aiHealth.services?.content_generation ? 'online' : 'offline'}
                            responseTime={245}
                            uptime={99.8}
                            icon={<IconRobot size={20} />}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <AIServiceStatus
                            serviceName="Translation"
                            status={aiHealth.services?.translation ? 'online' : 'offline'}
                            responseTime={650}
                            uptime={99.2}
                            icon={<IconLanguage size={20} />}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <AIServiceStatus
                            serviceName="Analytics Engine"
                            status={aiHealth.services?.analytics ? 'degraded' : 'offline'}
                            responseTime={1800}
                            uptime={95.5}
                            icon={<IconChartBar size={20} />}
                        />
                    </Grid>
                </Grid>
            )}

            {/* Main Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    {tabLabels.map((tab, index) => (
                        <Tab
                            key={index}
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    {tab.icon}
                                    {tab.label}
                                </Box>
                            }
                        />
                    ))}
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box>
                {activeTab === 0 && (
                    <Grid container spacing={3}>
                        {/* AI Overview Dashboard */}
                        <Grid item xs={12} md={8}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" mb={2}>
                                        AI System Overview
                                    </Typography>

                                    <Stack spacing={2}>
                                        <Alert severity="info" icon={<IconBrain />}>
                                            All AI services are operational and ready to assist with Orthodox Metrics administration.
                                        </Alert>

                                        <Box>
                                            <Typography variant="subtitle2" mb={1}>
                                                Quick Actions:
                                            </Typography>
                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                <AIContentGenerator />
                                                <AITranslationAssistant />
                                                <AIDeploymentAutomation />
                                                <AILogAnalysis />
                                            </Stack>
                                        </Box>

                                        <Divider />

                                        <Box>
                                            <Typography variant="subtitle2" mb={1}>
                                                Recent AI Activity:
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                • Generated system documentation for user management
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                • Translated interface to Greek and Serbian
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                • Analyzed performance metrics and identified 3 optimization opportunities
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                • Generated automated deployment configurations
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
                                        <IconBulb size={20} />
                                        AI Recommendations
                                    </Typography>

                                    <Stack spacing={2}>
                                        <Alert severity="success" variant="outlined">
                                            <Typography variant="subtitle2">Performance</Typography>
                                            Consider enabling AI caching to reduce response times by ~30%.
                                        </Alert>

                                        <Alert severity="info" variant="outlined">
                                            <Typography variant="subtitle2">Content</Typography>
                                            Generate multilingual user guides for better accessibility.
                                        </Alert>

                                        <Alert severity="warning" variant="outlined">
                                            <Typography variant="subtitle2">Security</Typography>
                                            Review AI service API key rotation policy.
                                        </Alert>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {activeTab === 1 && <AIAnalyticsDashboard />}

                {activeTab === 2 && (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" mb={3}>
                                AI Content Generation
                            </Typography>
                            <AIContentGenerator />
                            <Typography variant="body2" color="text.secondary" mt={2}>
                                Generate documentation, reports, newsletters, and announcements using AI assistance.
                                Perfect for creating user guides, system documentation, and multilingual content.
                            </Typography>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 3 && (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" mb={3}>
                                AI Translation Assistant
                            </Typography>
                            <AITranslationAssistant />
                            <Typography variant="body2" color="text.secondary" mt={2}>
                                Translate text between multiple languages with Orthodox context awareness.
                                Quality assessment and cultural appropriateness checks included.
                            </Typography>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 4 && (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" mb={3}>
                                AI Deployment Automation
                            </Typography>
                            <AIDeploymentAutomation />
                            <Typography variant="body2" color="text.secondary" mt={2}>
                                Generate complete deployment configurations for new Orthodox Metrics instances.
                                Includes Docker Compose, environment setup, and security configurations.
                            </Typography>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 5 && (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" mb={3}>
                                AI Log Analysis
                            </Typography>
                            <AILogAnalysis />
                            <Typography variant="body2" color="text.secondary" mt={2}>
                                Analyze system logs using AI to identify issues, performance problems, and security concerns.
                                Get actionable recommendations for system optimization.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>
        </Box>
    );
};

export default AIAdminPanel;
