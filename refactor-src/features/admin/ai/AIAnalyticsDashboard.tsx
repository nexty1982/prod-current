// AI Analytics Dashboard Component for Admin Interface
import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Chip,
    IconButton,
    Tooltip,
    LinearProgress,
    Paper,
    Divider,
    Stack,
    Tab,
    Tabs,
    Badge,
} from '@mui/material';
import {
    IconBrain,
    IconTrendingUp,
    IconTrendingDown,
    IconAlertTriangle,
    IconBulb,
    IconRefresh,
    IconEye,
    IconChartBar,
    IconActivity,
    IconUsers,
    IconServer,
    IconShield,
    IconClock,
    IconDownload,
} from '@tabler/icons-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import aiService from '@/shared/lib/aiService';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    ChartTooltip,
    Legend
);

interface AIInsightCardProps {
    insight: {
        type: string;
        title: string;
        description: string;
        confidence: number;
        actionable: boolean;
        recommendations?: string[];
    };
}

const AIInsightCard: React.FC<AIInsightCardProps> = ({ insight }) => {
    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'trend':
                return <IconTrendingUp size={20} />;
            case 'anomaly':
                return <IconAlertTriangle size={20} />;
            case 'prediction':
                return <IconBrain size={20} />;
            case 'optimization':
                return <IconBulb size={20} />;
            default:
                return <IconActivity size={20} />;
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'success';
        if (confidence >= 0.6) return 'warning';
        return 'error';
    };

    return (
        <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        {getInsightIcon(insight.type)}
                        <Typography variant="h6" fontSize="1rem">
                            {insight.title}
                        </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                            size="small"
                            label={`${Math.round(insight.confidence * 100)}% confidence`}
                            color={getConfidenceColor(insight.confidence) as any}
                            variant="outlined"
                        />
                        {insight.actionable && (
                            <Chip size="small" label="Actionable" color="primary" variant="outlined" />
                        )}
                    </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                    {insight.description}
                </Typography>

                {insight.recommendations && insight.recommendations.length > 0 && (
                    <Box mt={2}>
                        <Typography variant="subtitle2" mb={1}>
                            Recommendations:
                        </Typography>
                        <Stack spacing={0.5}>
                            {insight.recommendations.map((rec, index) => (
                                <Typography
                                    key={index}
                                    variant="body2"
                                    sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                                >
                                    • {rec}
                                </Typography>
                            ))}
                        </Stack>
                    </Box>
                )}

                <LinearProgress
                    variant="determinate"
                    value={insight.confidence * 100}
                    sx={{ mt: 2, height: 4, borderRadius: 2 }}
                    color={getConfidenceColor(insight.confidence) as any}
                />
            </CardContent>
        </Card>
    );
};

export const AIAnalyticsDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [analysisType, setAnalysisType] = useState<'trends' | 'anomalies' | 'predictions' | 'insights'>('insights');

    // Fetch AI analytics
    const {
        data: analytics,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['ai-analytics', analysisType],
        queryFn: () =>
            aiService.generateAnalytics({
                data_source: 'admin_dashboard',
                analysis_type: analysisType,
                time_range: '7d',
                metrics: ['user_activity', 'system_performance', 'error_rates', 'church_engagement'],
            }),
        refetchInterval: 300000, // 5 minutes
    });

    const tabLabels = [
        { label: 'AI Insights', value: 'insights', icon: <IconBrain size={16} /> },
        { label: 'Trends', value: 'trends', icon: <IconTrendingUp size={16} /> },
        { label: 'Anomalies', value: 'anomalies', icon: <IconAlertTriangle size={16} /> },
        { label: 'Predictions', value: 'predictions', icon: <IconBulb size={16} /> },
    ];

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        setAnalysisType(tabLabels[newValue].value as any);
    };

    const exportInsights = () => {
        if (!analytics) return;

        const exportData = {
            generated_at: new Date().toISOString(),
            analysis_type: analysisType,
            insights: analytics.insights,
            summary: {
                total_insights: analytics.insights.length,
                actionable_insights: analytics.insights.filter(i => i.actionable).length,
                high_confidence: analytics.insights.filter(i => i.confidence >= 0.8).length,
            },
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-insights-${analysisType}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                    <CircularProgress />
                    <Typography variant="body1" ml={2}>
                        AI is analyzing your data...
                    </Typography>
                </Box>
            </CardContent>
      </Card >
    );
  }

if (error) {
    return (
        <Card>
            <CardContent>
                <Alert
                    severity="error"
                    action={
                        <Button size="small" onClick={() => refetch()}>
                            Retry
                        </Button>
                    }
                >
                    Failed to load AI analytics: {error.message}
                </Alert>
            </CardContent>
        </Card>
    );
}

return (
    <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" display="flex" alignItems="center" gap={1}>
                <IconBrain size={24} />
                AI Analytics Dashboard
            </Typography>
            <Box display="flex" gap={1}>
                <Tooltip title="Refresh Analytics">
                    <IconButton onClick={() => refetch()}>
                        <IconRefresh size={20} />
                    </IconButton>
                </Tooltip>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconDownload size={16} />}
                    onClick={exportInsights}
                    disabled={!analytics}
                >
                    Export
                </Button>
            </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
            <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
                {tabLabels.map((tab, index) => (
                    <Tab
                        key={tab.value}
                        label={
                            <Box display="flex" alignItems="center" gap={1}>
                                {tab.icon}
                                {tab.label}
                                {analytics && (
                                    <Badge
                                        badgeContent={analytics.insights.filter(i =>
                                            tab.value === 'insights' || i.type === tab.value.slice(0, -1)
                                        ).length}
                                        color="primary"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Box>
                        }
                    />
                ))}
            </Tabs>
        </Paper>

        {analytics && (
            <>
                {/* Summary Stats */}
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="primary">
                                    {analytics.insights.length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Insights
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="success.main">
                                    {analytics.insights.filter(i => i.actionable).length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Actionable Items
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="warning.main">
                                    {analytics.insights.filter(i => i.confidence >= 0.8).length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    High Confidence
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="error.main">
                                    {analytics.insights.filter(i => i.type === 'anomaly').length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Anomalies Detected
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* AI Insights Grid */}
                <Grid container spacing={2}>
                    {analytics.insights
                        .filter(insight =>
                            activeTab === 0 || insight.type === tabLabels[activeTab].value.slice(0, -1)
                        )
                        .map((insight, index) => (
                            <Grid item xs={12} md={6} lg={4} key={index}>
                                <AIInsightCard insight={insight} />
                            </Grid>
                        ))}
                </Grid>

                {/* Visualizations */}
                {analytics.visualizations && analytics.visualizations.length > 0 && (
                    <Box mt={4}>
                        <Typography variant="h6" mb={2}>
                            AI-Generated Visualizations
                        </Typography>
                        <Grid container spacing={2}>
                            {analytics.visualizations.map((viz, index) => (
                                <Grid item xs={12} md={6} key={index}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="subtitle1" mb={2}>
                                                {viz.type.toUpperCase()} - Analysis Results
                                            </Typography>
                                            {/* Chart rendering would go here based on viz.type */}
                                            <Box
                                                sx={{
                                                    height: 200,
                                                    bgcolor: 'grey.100',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: 1,
                                                }}
                                            >
                                                <Typography variant="body2" color="text.secondary">
                                                    {viz.type} visualization placeholder
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Empty State */}
                {analytics.insights.filter(insight =>
                    activeTab === 0 || insight.type === tabLabels[activeTab].value.slice(0, -1)
                ).length === 0 && (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <IconBrain size={48} style={{ opacity: 0.3 }} />
                            <Typography variant="h6" mt={2} mb={1}>
                                No {tabLabels[activeTab].label} Available
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                AI analysis didn't find any {tabLabels[activeTab].label.toLowerCase()} for the current dataset.
                            </Typography>
                        </Paper>
                    )}
            </>
        )}
    </Box>
);
};

export default AIAnalyticsDashboard;
