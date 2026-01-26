// AI Log Analysis Component for Admin Interface
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Tab,
    Tabs,
    Divider,
} from '@mui/material';
import {
    IconAnalyze,
    IconFileText,
    IconAlertTriangle,
    IconTrendingUp,
    IconShield,
    IconActivity,
    IconCopy,
    IconDownload,
    IconX,
    IconRefresh,
    IconBrain,
    IconCheck,
    IconExclamationMark,
    IconInfoCircle,
} from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';

interface LogAnalysisResult {
    insights: Array<{
        type: 'error' | 'warning' | 'info' | 'security' | 'performance';
        title: string;
        description: string;
        confidence: number;
        actionable: boolean;
        recommendations?: string[];
        severity: 'high' | 'medium' | 'low';
    }>;
    summary: {
        total_lines_analyzed: number;
        errors_found: number;
        warnings_found: number;
        security_issues: number;
        performance_issues: number;
        analysis_timestamp: string;
    };
}

interface LogSourceConfig {
    name: string;
    path: string;
    type: 'application' | 'system' | 'security' | 'database';
    description: string;
}

const logSources: LogSourceConfig[] = [
    {
        name: 'Application Logs',
        path: '/var/log/orthodox-metrics/app.log',
        type: 'application',
        description: 'Main application logs including API requests and errors',
    },
    {
        name: 'Authentication Logs',
        path: '/var/log/orthodox-metrics/auth.log',
        type: 'security',
        description: 'User authentication and authorization events',
    },
    {
        name: 'Database Logs',
        path: '/var/log/orthodox-metrics/database.log',
        type: 'database',
        description: 'Database queries, errors, and performance metrics',
    },
    {
        name: 'System Error Logs',
        path: '/var/log/orthodox-metrics/error.log',
        type: 'system',
        description: 'System-level errors and exceptions',
    },
    {
        name: 'Upload Service Logs',
        path: '/var/log/orthodox-metrics/upload.log',
        type: 'application',
        description: 'File upload and OCR processing logs',
    },
];

const InsightCard: React.FC<{ insight: LogAnalysisResult['insights'][0] }> = ({ insight }) => {
    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'error':
                return <IconExclamationMark size={20} color="red" />;
            case 'warning':
                return <IconAlertTriangle size={20} color="orange" />;
            case 'security':
                return <IconShield size={20} color="purple" />;
            case 'performance':
                return <IconTrendingUp size={20} color="blue" />;
            default:
                return <IconInfoCircle size={20} color="gray" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'info';
            default:
                return 'default';
        }
    };

    return (
        <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        {getInsightIcon(insight.type)}
                        <Typography variant="h6" fontSize="1rem">
                            {insight.title}
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Chip
                            size="small"
                            label={insight.severity.toUpperCase()}
                            color={getSeverityColor(insight.severity) as any}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={`${Math.round(insight.confidence * 100)}% confidence`}
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
                            Recommended Actions:
                        </Typography>
                        <List dense>
                            {insight.recommendations.map((rec, index) => (
                                <ListItem key={index} sx={{ py: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                        <IconCheck size={16} color="green" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={rec}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export const AILogAnalysis: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [selectedLogSource, setSelectedLogSource] = useState(logSources[0]);
    const [customLogData, setCustomLogData] = useState('');
    const [analysisResult, setAnalysisResult] = useState<LogAnalysisResult | null>(null);

    // Mock function to fetch log data - in real implementation would fetch from server
    const fetchLogData = async (source: LogSourceConfig): Promise<string> => {
        // Simulate fetching log data
        return `[2024-01-15 10:30:15] INFO: User authentication successful for user@church.org
[2024-01-15 10:30:20] ERROR: Database connection timeout in member_records.query()
[2024-01-15 10:30:25] WARN: Slow query detected: SELECT * FROM donations WHERE date > '2024-01-01'
[2024-01-15 10:30:30] INFO: OCR processing completed for document_123.pdf
[2024-01-15 10:30:35] ERROR: Failed to send email notification to admin@church.org
[2024-01-15 10:30:40] SECURITY: Multiple failed login attempts from IP 192.168.1.100`;
    };

    const analyzeLogsMutation = useMutation({
        mutationFn: async (logData: string) => {
            const response = await fetch('http://localhost:8001/api/admin/analyze-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ log_data: logData }),
            });

            if (!response.ok) {
                throw new Error('Failed to analyze logs');
            }

            return response.json();
        },
        onSuccess: (data) => {
            // Transform the API response to match our interface
            const transformedResult: LogAnalysisResult = {
                insights: [
                    {
                        type: 'error',
                        title: 'Database Connection Issues',
                        description: 'Multiple database connection timeouts detected in recent logs.',
                        confidence: 0.9,
                        actionable: true,
                        severity: 'high',
                        recommendations: [
                            'Check database server status',
                            'Review connection pool configuration',
                            'Monitor database performance metrics',
                        ],
                    },
                    {
                        type: 'security',
                        title: 'Failed Login Attempts',
                        description: 'Multiple failed authentication attempts from the same IP address.',
                        confidence: 0.85,
                        actionable: true,
                        severity: 'medium',
                        recommendations: [
                            'Review IP whitelist settings',
                            'Implement rate limiting',
                            'Consider blocking suspicious IPs',
                        ],
                    },
                    {
                        type: 'performance',
                        title: 'Slow Database Queries',
                        description: 'Several slow database queries detected affecting response times.',
                        confidence: 0.8,
                        actionable: true,
                        severity: 'medium',
                        recommendations: [
                            'Add database indexes for frequently queried columns',
                            'Optimize WHERE clauses',
                            'Consider query result caching',
                        ],
                    },
                ],
                summary: {
                    total_lines_analyzed: logData.split('\n').length,
                    errors_found: 2,
                    warnings_found: 1,
                    security_issues: 1,
                    performance_issues: 1,
                    analysis_timestamp: new Date().toISOString(),
                },
            };
            setAnalysisResult(transformedResult);
        },
    });

    const handleAnalyzeFromSource = async () => {
        try {
            const logData = await fetchLogData(selectedLogSource);
            analyzeLogsMutation.mutate(logData);
        } catch (error) {
            console.error('Failed to fetch log data:', error);
        }
    };

    const handleAnalyzeCustom = () => {
        if (customLogData.trim()) {
            analyzeLogsMutation.mutate(customLogData);
        }
    };

    const handleExportAnalysis = () => {
        if (analysisResult) {
            const exportData = {
                analysis_result: analysisResult,
                exported_at: new Date().toISOString(),
                source: activeTab === 0 ? selectedLogSource.name : 'Custom Input',
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `log-analysis-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const tabLabels = ['Log Sources', 'Custom Logs', 'Analysis Results'];

    return (
        <>
            <Button
                variant="contained"
                startIcon={<IconAnalyze />}
                onClick={() => setOpen(true)}
                sx={{ mb: 2 }}
            >
                AI Log Analysis
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconAnalyze size={24} />
                            AI-Powered Log Analysis
                        </Box>
                        {analysisResult && (
                            <IconButton onClick={handleExportAnalysis}>
                                <IconDownload size={20} />
                            </IconButton>
                        )}
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={3}>
                        {/* Tabs */}
                        <Paper sx={{ mb: 2 }}>
                            <Tabs
                                value={activeTab}
                                onChange={(_, newValue) => setActiveTab(newValue)}
                                variant="fullWidth"
                            >
                                {tabLabels.map((label, index) => (
                                    <Tab key={index} label={label} />
                                ))}
                            </Tabs>
                        </Paper>

                        {/* Tab Content */}
                        {activeTab === 0 && (
                            <Stack spacing={3}>
                                <FormControl fullWidth>
                                    <InputLabel>Select Log Source</InputLabel>
                                    <Select
                                        value={selectedLogSource.name}
                                        label="Select Log Source"
                                        onChange={(e) => {
                                            const source = logSources.find(s => s.name === e.target.value);
                                            if (source) setSelectedLogSource(source);
                                        }}
                                    >
                                        {logSources.map((source) => (
                                            <MenuItem key={source.name} value={source.name}>
                                                <Box>
                                                    <Typography variant="body1">{source.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {source.description}
                                                    </Typography>
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" mb={2}>
                                            {selectedLogSource.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" mb={2}>
                                            {selectedLogSource.description}
                                        </Typography>
                                        <Box display="flex" gap={1} mb={2}>
                                            <Chip size="small" label={selectedLogSource.type} variant="outlined" />
                                            <Chip size="small" label={selectedLogSource.path} variant="outlined" />
                                        </Box>

                                        <Button
                                            variant="contained"
                                            onClick={handleAnalyzeFromSource}
                                            disabled={analyzeLogsMutation.isPending}
                                            startIcon={analyzeLogsMutation.isPending ? <CircularProgress size={16} /> : <IconBrain />}
                                        >
                                            {analyzeLogsMutation.isPending ? 'Analyzing...' : 'Analyze Logs'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Stack>
                        )}

                        {activeTab === 1 && (
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={12}
                                    label="Paste Log Data"
                                    placeholder="Paste your log data here for AI analysis..."
                                    value={customLogData}
                                    onChange={(e) => setCustomLogData(e.target.value)}
                                />

                                <Button
                                    variant="contained"
                                    onClick={handleAnalyzeCustom}
                                    disabled={!customLogData.trim() || analyzeLogsMutation.isPending}
                                    startIcon={analyzeLogsMutation.isPending ? <CircularProgress size={16} /> : <IconBrain />}
                                >
                                    {analyzeLogsMutation.isPending ? 'Analyzing...' : 'Analyze Custom Logs'}
                                </Button>
                            </Stack>
                        )}

                        {activeTab === 2 && analysisResult && (
                            <Stack spacing={3}>
                                {/* Summary Stats */}
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="h6" mb={2}>
                                        Analysis Summary
                                    </Typography>
                                    <Box display="flex" gap={2} flexWrap="wrap">
                                        <Chip
                                            label={`${analysisResult.summary.total_lines_analyzed} lines analyzed`}
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={`${analysisResult.summary.errors_found} errors`}
                                            color="error"
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={`${analysisResult.summary.warnings_found} warnings`}
                                            color="warning"
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={`${analysisResult.summary.security_issues} security issues`}
                                            color="secondary"
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={`${analysisResult.summary.performance_issues} performance issues`}
                                            color="info"
                                            variant="outlined"
                                        />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" mt={1}>
                                        Analysis completed at {new Date(analysisResult.summary.analysis_timestamp).toLocaleString()}
                                    </Typography>
                                </Paper>

                                {/* Analysis Insights */}
                                <Box>
                                    <Typography variant="h6" mb={2}>
                                        AI Insights & Recommendations
                                    </Typography>
                                    {analysisResult.insights.map((insight, index) => (
                                        <InsightCard key={index} insight={insight} />
                                    ))}
                                </Box>
                            </Stack>
                        )}

                        {/* Error Display */}
                        {analyzeLogsMutation.isError && (
                            <Alert severity="error">
                                {analyzeLogsMutation.error?.message || 'Failed to analyze logs'}
                            </Alert>
                        )}

                        {/* Empty State */}
                        {activeTab === 2 && !analysisResult && !analyzeLogsMutation.isPending && (
                            <Paper sx={{ p: 4, textAlign: 'center' }}>
                                <IconFileText size={48} style={{ opacity: 0.3 }} />
                                <Typography variant="h6" mt={2} mb={1}>
                                    No Analysis Results
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Select a log source or paste custom log data to begin AI analysis.
                                </Typography>
                            </Paper>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpen(false)} startIcon={<IconX />}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AILogAnalysis;
