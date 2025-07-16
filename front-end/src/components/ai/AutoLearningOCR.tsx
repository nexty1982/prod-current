// Auto-Learning OCR Component for Orthodox Metrics AI System
import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Alert,
    LinearProgress,
    CircularProgress,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tooltip,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
} from '@mui/material';
import {
    IconBrain,
    IconPlayerPlay,
    IconPlayerStop,
    IconRefresh,
    IconClock,
    IconActivity,
    IconCheck,
    IconX,
    IconSettings,
    IconDownload,
    IconChartBar,
    IconAlertTriangle,
    IconChevronDown,
    IconFile,
    IconEye,
    IconActivity,
    IconScan,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autoLearningAPI } from '../../services/autoLearningAPI';

interface TaskStatus {
    isRunning: boolean;
    status: string;
    recordsProcessed: number;
    totalRecords: number;
    progress: number;
    successRate: number;
    averageConfidence: number;
    errorCount: number;
    trainingRulesGenerated: number;
    timeRemaining: string;
    lastImage: string;
    elapsed?: string;
    duration?: number;
}

interface TaskConfig {
    path: string;
    hours: number;
}

interface LearningRule {
    id: string;
    type: string;
    pattern: string;
    description: string;
    confidence: number;
    examples: string[];
    frequency: number;
    accuracy: number;
}

const AutoLearningOCR: React.FC = () => {
    const [taskConfig, setTaskConfig] = useState<TaskConfig>({
        path: 'data/records/',
        hours: 24
    });
    const [showStartDialog, setShowStartDialog] = useState(false);
    const [showResultsDialog, setShowResultsDialog] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0);
    const queryClient = useQueryClient();

    // Fetch task status
    const { data: taskStatus, isLoading: statusLoading } = useQuery<TaskStatus>({
        queryKey: ['autoLearningStatus'],
        queryFn: () => autoLearningAPI.getStatus().then(res => res.status),
        refetchInterval: 5000, // Refresh every 5 seconds
    });

    // Fetch learning rules
    const { data: learningRules } = useQuery<{ rules: any }>({
        queryKey: ['learningRules'],
        queryFn: () => autoLearningAPI.getLearningRules(),
        enabled: !taskStatus?.isRunning,
    });

    // Start task mutation
    const startTaskMutation = useMutation({
        mutationFn: (config: TaskConfig) => autoLearningAPI.startTask(config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['autoLearningStatus'] });
            setShowStartDialog(false);
        },
    });

    // Stop task mutation
    const stopTaskMutation = useMutation({
        mutationFn: () => autoLearningAPI.stopTask(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['autoLearningStatus'] });
        },
    });

    // Reset task mutation
    const resetTaskMutation = useMutation({
        mutationFn: () => autoLearningAPI.resetTask(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['autoLearningStatus'] });
            queryClient.invalidateQueries({ queryKey: ['learningRules'] });
        },
    });

    const handleStartTask = () => {
        startTaskMutation.mutate(taskConfig);
    };

    const handleStopTask = () => {
        if (window.confirm('Are you sure you want to stop the auto-learning task?')) {
            stopTaskMutation.mutate();
        }
    };

    const handleResetTask = () => {
        if (window.confirm('Are you sure you want to reset all auto-learning data? This cannot be undone.')) {
            resetTaskMutation.mutate();
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'primary';
            case 'completed': return 'success';
            case 'idle': return 'default';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running': return <IconActivity />;
            case 'completed': return <IconCheck />;
            case 'idle': return <IconClock />;
            default: return <IconClock />;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconBrain size={32} color="#1976d2" />
                    <Typography variant="h4" component="h1">
                        Auto-Learning OCR System
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        startIcon={<IconRefresh />}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['autoLearningStatus'] })}
                        disabled={statusLoading}
                    >
                        Refresh
                    </Button>
                    {taskStatus?.status !== 'running' && (
                        <>
                            <Button
                                variant="contained"
                                startIcon={<IconPlayerPlay />}
                                onClick={() => setShowStartDialog(true)}
                                disabled={startTaskMutation.isPending}
                            >
                                Start Learning
                            </Button>
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<IconSettings />}
                                onClick={handleResetTask}
                                disabled={resetTaskMutation.isPending}
                            >
                                Reset
                            </Button>
                        </>
                    )}
                    {taskStatus?.status === 'running' && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<IconPlayerStop />}
                            onClick={handleStopTask}
                            disabled={stopTaskMutation.isPending}
                        >
                            Stop Task
                        </Button>
                    )}
                </Stack>
            </Box>

            {/* Status Overview */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {getStatusIcon(taskStatus?.status || 'idle')}
                                <Box>
                                    <Typography variant="h6">Status</Typography>
                                    <Chip 
                                        label={taskStatus?.status || 'Unknown'} 
                                        color={getStatusColor(taskStatus?.status || 'idle')}
                                        size="small"
                                    />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <IconScan />
                                <Box>
                                    <Typography variant="h6">Progress</Typography>
                                    <Typography variant="h4" color="primary">
                                        {taskStatus?.progress || 0}%
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <IconChartBar />
                                <Box>
                                    <Typography variant="h6">Success Rate</Typography>
                                    <Typography variant="h4" color="success.main">
                                        {taskStatus?.successRate?.toFixed(1) || 0}%
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <IconBrain />
                                <Box>
                                    <Typography variant="h6">Learning Rules</Typography>
                                    <Typography variant="h4" color="info.main">
                                        {taskStatus?.trainingRulesGenerated || 0}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Progress Details */}
            {taskStatus?.isRunning && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Processing Progress
                        </Typography>
                        <LinearProgress 
                            variant="determinate" 
                            value={taskStatus.progress} 
                            sx={{ mb: 2, height: 8, borderRadius: 4 }}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Typography variant="body2" color="text.secondary">
                                    Records Processed: {taskStatus.recordsProcessed} / {taskStatus.totalRecords}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="body2" color="text.secondary">
                                    Time Remaining: {taskStatus.timeRemaining}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="body2" color="text.secondary">
                                    Last Image: {taskStatus.lastImage}
                                </Typography>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Statistics */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Processing Statistics
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={6} md={3}>
                            <Box textAlign="center">
                                <Typography variant="h4" color="primary">
                                    {taskStatus?.recordsProcessed || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Records Processed
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box textAlign="center">
                                <Typography variant="h4" color="success.main">
                                    {taskStatus?.averageConfidence?.toFixed(1) || 0}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Avg Confidence
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box textAlign="center">
                                <Typography variant="h4" color="error.main">
                                    {taskStatus?.errorCount || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Errors
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box textAlign="center">
                                <Typography variant="h4" color="info.main">
                                    {taskStatus?.elapsed || '0s'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Runtime
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Learning Rules */}
            {learningRules?.rules && (
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                Generated Learning Rules
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<IconDownload />}
                                size="small"
                            >
                                Export Rules
                            </Button>
                        </Box>
                        
                        {Object.entries(learningRules.rules.categories || {}).map(([category, rules]: [string, any]) => (
                            <Accordion key={category}>
                                <AccordionSummary expandIcon={<IconChevronDown />}>
                                    <Typography variant="subtitle1">
                                        {category} ({rules.count} rules)
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <List>
                                        {rules.rules?.slice(0, 3).map((rule: any, index: number) => (
                                            <ListItem key={index}>
                                                <ListItemIcon>
                                                    <IconEye size={16} />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={rule.description}
                                                    secondary={`Confidence: ${(rule.confidence * 100).toFixed(1)}% | Accuracy: ${rule.accuracy.toFixed(1)}%`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Start Task Dialog */}
            <Dialog open={showStartDialog} onClose={() => setShowStartDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Start Auto-Learning Task</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Data Path"
                            value={taskConfig.path}
                            onChange={(e) => setTaskConfig({ ...taskConfig, path: e.target.value })}
                            fullWidth
                            helperText="Path to the directory containing baptism, marriage, and funeral record images"
                        />
                        <TextField
                            label="Maximum Hours"
                            type="number"
                            value={taskConfig.hours}
                            onChange={(e) => setTaskConfig({ ...taskConfig, hours: parseInt(e.target.value) })}
                            fullWidth
                            inputProps={{ min: 1, max: 72 }}
                            helperText="Maximum time the task should run (1-72 hours)"
                        />
                        <Alert severity="info">
                            The auto-learning task will process all available record images to improve OCR accuracy and generate learning rules for better field mapping.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowStartDialog(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleStartTask} 
                        variant="contained"
                        disabled={startTaskMutation.isPending}
                    >
                        {startTaskMutation.isPending ? <CircularProgress size={20} /> : 'Start Task'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AutoLearningOCR;
