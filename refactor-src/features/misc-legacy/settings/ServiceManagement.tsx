import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Alert,
    Card,
    CardContent,
    Stack,
    Button,
    CircularProgress,
    Grid,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    Snackbar,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Switch,
    FormControlLabel,
    TextField,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Checkbox,
    FormGroup,
    Slider,
    Select,
    MenuItem,
    InputLabel,
    FormControl
} from '@mui/material';
import {
    IconServer,
    IconDatabase,
    IconRefresh,
    IconAlertTriangle,
    IconCheck,
    IconX,
    IconClock,
    IconBuildingFactory,
    IconCode,
    IconActivity,
    IconSettings,
    IconTerminal,
    IconCloudDownload,
    IconEye,
    IconReload,
    IconChevronDown,
    IconChevronUp,
    IconBrain,
    IconRobot,
    IconBook,
    IconSearch,
    IconChartBar,
    IconZap,
    IconShield,
    IconDatabase as IconDatabase2,
    IconFileText,
    IconNetwork,
    IconCpu,
    IconMemory,
    IconHardDrive,
    IconWifi,
    IconWifiOff,
    IconVolume,
    IconVolumeOff,
    IconBug,
    IconInfoCircle,
    IconDownload,
    IconUpload,
    IconTrash,
    IconPlus,
    IconMinus,
    IconEdit,
    IconPlayerPlay,
    IconPlayerStop,
    IconRotate,
    IconHistory,
    IconTimeline,
    IconGraph,
    IconTrendingUp,
    IconTrendingDown,
    IconAlertCircle,
    IconListDetails
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { adminAPI } from '@/api/admin.api';

// Import the BackendDetails component
import BackendDetails from './services/BackendDetails';

interface ServiceStatus {
    name: string;
    displayName: string;
    status: 'running' | 'stopped' | 'error' | 'unknown';
    pid?: number;
    uptime?: string;
    cpu?: number;
    memory?: number;
    lastRestart?: string;
    description: string;
    category: 'core' | 'worker' | 'frontend' | 'database';
    restartable: boolean;
    logs?: string[];
    port?: number;
}

interface ServiceAction {
    service: string;
    action: 'start' | 'stop' | 'restart' | 'reload';
    timestamp: string;
    success: boolean;
    message?: string;
}

interface SystemHealth {
    overall: 'healthy' | 'warning' | 'critical';
    servicesUp: number;
    servicesTotal: number;
    lastUpdate: string;
    criticalServices: string[];
}

interface OMaiSettings {
    enabled: boolean;
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    maxLogEntries: number;
    autoRefreshLogs: boolean;
    logRefreshInterval: number;
    features: {
        ask: boolean;
        autofix: boolean;
        generateModule: boolean;
        runAgents: boolean;
        runPlugins: boolean;
        generateDoc: boolean;
        knowledgeIndexing: boolean;
        patternAnalysis: boolean;
        agentMetrics: boolean;
        backgroundScheduler: boolean;
    };
    performance: {
        maxConcurrentRequests: number;
        requestTimeout: number;
        cacheEnabled: boolean;
        cacheSize: number;
        cacheTTL: number;
    };
    security: {
        requireAuth: boolean;
        rateLimitEnabled: boolean;
        rateLimitPerHour: number;
        auditLogging: boolean;
        auditLogRetentionDays: number;
    };
    agents: {
        omaiRefactor: boolean;
        omaiAnalyzer: boolean;
        omaiGenerator: boolean;
        omaiValidator: boolean;
        omaiOptimizer: boolean;
    };
    knowledge: {
        autoIndexing: boolean;
        indexInterval: number;
        maxEmbeddings: number;
        similarityThreshold: number;
        vectorDimensions: number;
    };
}

interface OMaiLogEntry {
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    component: string;
    message: string;
    details?: any;
    userId?: number;
    sessionId?: string;
}

interface OMaiStatus {
    status: 'healthy' | 'warning' | 'error' | 'unknown';
    version: string;
    uptime: number;
    memory: any;
    activeAgents: string[];
    components: {
        orchestrator: 'healthy' | 'warning' | 'error';
        scheduler: 'healthy' | 'warning' | 'error';
        knowledgeEngine: 'healthy' | 'warning' | 'error';
        agentManager: 'healthy' | 'warning' | 'error';
    };
    stats: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        averageResponseTime: number;
        activeSessions: number;
        totalEmbeddings: number;
        indexedFiles: number;
    };
}

const ServiceManagement: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    // const { fetchNotifications, fetchCounts } = useNotifications(); // DISABLED
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [recentActions, setRecentActions] = useState<ServiceAction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        service: string;
        action: string;
    }>({ open: false, service: '', action: '' });
    const [frontendBuilding, setFrontendBuilding] = useState(false);
    const [buildProgress, setBuildProgress] = useState<{
        phase: string;
        progress: number;
        estimatedTime: number;
        startTime: number | null;
        refreshCountdown: number | null;
    }>({
        phase: '',
        progress: 0,
        estimatedTime: 0,
        startTime: null,
        refreshCountdown: null
    });
    const [logsDialog, setLogsDialog] = useState<{
        open: boolean;
        service: string;
        logs: string[];
        loading: boolean;
    }>({ open: false, service: '', logs: [], loading: false });
    const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());
    const [removedActions, setRemovedActions] = useState<Set<number>>(new Set());

    // OMAI specific state
    const [omaiSettings, setOmaiSettings] = useState<OMaiSettings>({
        enabled: true,
        debugMode: false,
        logLevel: 'info',
        maxLogEntries: 1000,
        autoRefreshLogs: true,
        logRefreshInterval: 5,
        features: {
            ask: true,
            autofix: true,
            generateModule: true,
            runAgents: true,
            runPlugins: true,
            generateDoc: true,
            knowledgeIndexing: true,
            patternAnalysis: true,
            agentMetrics: true,
            backgroundScheduler: true,
        },
        performance: {
            maxConcurrentRequests: 10,
            requestTimeout: 30000,
            cacheEnabled: true,
            cacheSize: 1000,
            cacheTTL: 3600,
        },
        security: {
            requireAuth: true,
            rateLimitEnabled: true,
            rateLimitPerHour: 100,
            auditLogging: true,
            auditLogRetentionDays: 90,
        },
        agents: {
            omaiRefactor: true,
            omaiAnalyzer: true,
            omaiGenerator: true,
            omaiValidator: true,
            omaiOptimizer: true,
        },
        knowledge: {
            autoIndexing: true,
            indexInterval: 30,
            maxEmbeddings: 10000,
            similarityThreshold: 0.7,
            vectorDimensions: 1536,
        },
    });
    const [omaiStatus, setOmaiStatus] = useState<OMaiStatus | null>(null);
    const [omaiLogs, setOmaiLogs] = useState<OMaiLogEntry[]>([]);
    const [omaiLogsLoading, setOmaiLogsLoading] = useState(false);
    const [omaiSettingsLoading, setOmaiSettingsLoading] = useState(false);
    const [omaiSettingsSaving, setOmaiSettingsSaving] = useState(false);
    const [omaiLogsDialog, setOmaiLogsDialog] = useState(false);
    const [omaiSettingsDialog, setOmaiSettingsDialog] = useState(false);
    const [omaiLogsTab, setOmaiLogsTab] = useState(0);
    const [omaiSettingsTab, setOmaiSettingsTab] = useState(0);



    useEffect(() => {
        if (isSuperAdmin()) {
            fetchServiceStatus();
            fetchSystemHealth();
            fetchRecentActions();
        }
    }, [isSuperAdmin]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        if (!autoRefresh || !isSuperAdmin()) return;

        const interval = setInterval(() => {
            fetchServiceStatus();
            fetchSystemHealth();
        }, 10000);

        return () => clearInterval(interval);
    }, [autoRefresh, isSuperAdmin]);

    // Update build progress timer
    useEffect(() => {
        if (!frontendBuilding || !buildProgress.startTime) return;

        const timer = setInterval(() => {
            setBuildProgress(prev => ({ ...prev })); // Force re-render to update elapsed time
        }, 1000);

        return () => clearInterval(timer);
    }, [frontendBuilding, buildProgress.startTime]);

    // OMAI specific useEffect hooks
    useEffect(() => {
        if (isSuperAdmin()) {
            if (omaiSettings.autoRefreshLogs) {
                fetchOmaiLogs();
            }
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (!omaiSettings.autoRefreshLogs || !isSuperAdmin()) return;

        const interval = setInterval(() => {
            fetchOmaiLogs();
        }, omaiSettings.logRefreshInterval * 1000);

        return () => clearInterval(interval);
    }, [omaiSettings.autoRefreshLogs, omaiSettings.logRefreshInterval, isSuperAdmin]);

    const fetchServiceStatus = async () => {
        try {
            // Fetch regular services
            const response = await adminAPI.services.getStatus();
            const regularServices = response.services || [];
            
            // Fetch OMAI status and convert to service format
            let omaiService: ServiceStatus | null = null;
            try {
                const omaiResponse = await adminAPI.services.getOmaiStatus();
                if (omaiResponse) {
                    // Convert OMAI uptime from seconds to formatted string
                    const formatUptime = (seconds: number): string => {
                        const days = Math.floor(seconds / 86400);
                        const hours = Math.floor((seconds % 86400) / 3600);
                        const minutes = Math.floor((seconds % 3600) / 60);
                        
                        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
                        if (hours > 0) return `${hours}h ${minutes}m`;
                        return `${minutes}m`;
                    };

                    omaiService = {
                        name: 'omai',
                        displayName: 'OMAI (Orthodox Metrics AI)',
                        status: omaiResponse.status === 'healthy' ? 'running' : 
                               omaiResponse.status === 'warning' ? 'stopped' :
                               omaiResponse.status === 'error' ? 'error' : 'unknown',
                        uptime: formatUptime(omaiResponse.uptime || 0),
                        description: 'AI service for Orthodox Metrics with orchestrator, scheduler, and agent management',
                        category: 'ai',
                        restartable: true,
                        cpu: omaiResponse.memory?.cpuUsage || 0,
                        memory: omaiResponse.memory?.heapUsed ? Math.round(omaiResponse.memory.heapUsed / 1024 / 1024) : 0
                    };
                }
            } catch (omaiError) {
                console.error('Failed to fetch OMAI status:', omaiError);
                // Create a default OMAI service entry if fetch fails
                omaiService = {
                    name: 'omai',
                    displayName: 'OMAI (Orthodox Metrics AI)',
                    status: 'error',
                    uptime: 'Unknown',
                    description: 'AI service for Orthodox Metrics - Status unavailable',
                    category: 'ai',
                    restartable: true
                };
            }
            
            // Combine services with OMAI at the top
            const allServices = omaiService ? [omaiService, ...regularServices] : regularServices;
            setServices(allServices);
            
        } catch (err: any) {
            setError(err.message || 'Failed to load service status');
        }
    };

    const fetchSystemHealth = async () => {
        try {
            const response = await adminAPI.services.getHealth();
            setSystemHealth(response);
        } catch (err: any) {
            console.error('Failed to fetch system health:', err);
        }
    };

    const fetchRecentActions = async () => {
        try {
            const response = await adminAPI.services.getRecentActions();
            setRecentActions(response.actions || []);
        } catch (err: any) {
            console.error('Failed to fetch recent actions:', err);
        }
    };

    const pollForBuildCompletion = async () => {
        let pollCount = 0;
        const maxPolls = 30; // 5 minutes max (10 seconds * 30)
        
        const checkCompletion = async () => {
            try {
                // Check backend logs for completion message
                const response = await adminAPI.services.getBackendLogs(50);

                if (response.success) {
                    const logs = response.logs || [];
                    
                    // Look for build completion messages
                    const hasSuccess = logs.some(log => 
                        log.includes('🎉 FRONTEND BUILD COMPLETED SUCCESSFULLY 🎉') ||
                        log.includes('✅ Build process completed successfully')
                    );
                    
                    const hasFailure = logs.some(log => 
                        log.includes('🚨 FRONTEND BUILD FAILED 🚨') ||
                        log.includes('❌ Build process failed')
                    );
                    
                    if (hasSuccess || hasFailure) {
                        // Build completed - update UI
                        setBuildProgress(prev => ({
                            ...prev,
                            phase: hasSuccess ? 'Build completed! Refreshing page...' : 'Build failed - check logs',
                            progress: 100
                        }));
                        
                        if (hasSuccess) {
                            setSuccess('Frontend rebuild completed! Page will refresh automatically...');
                            
                            // Refresh notifications to show build completion
                            // fetchNotifications(); // DISABLED
                            // fetchCounts(); // DISABLED
                            
                            // Start countdown
                            setBuildProgress(prev => ({
                                ...prev,
                                refreshCountdown: 3
                            }));
                            
                            // Countdown timer
                            let countdown = 3;
                            const countdownInterval = setInterval(() => {
                                countdown--;
                                setBuildProgress(prev => ({
                                    ...prev,
                                    phase: `Build completed! Refreshing page in ${countdown}s...`,
                                    refreshCountdown: countdown
                                }));
                                
                                if (countdown <= 0) {
                                    clearInterval(countdownInterval);
                                    window.location.reload();
                                }
                            }, 1000);
                        } else {
                            setError('Frontend build failed. Check backend logs for details.');
                            
                            // Refresh notifications to show build failure
                            fetchNotifications();
                            fetchCounts();
                            
                            setFrontendBuilding(false);
                            setBuildProgress({
                                phase: '',
                                progress: 0,
                                estimatedTime: 0,
                                startTime: null,
                                refreshCountdown: null
                            });
                        }
                        return; // Stop polling
                    }
                }
                
                // Continue polling if not complete and under max polls
                pollCount++;
                if (pollCount < maxPolls) {
                    setTimeout(checkCompletion, 10000); // Check every 10 seconds
                } else {
                    // Timeout - stop polling
                    setError('Build status check timed out. Please check manually.');
                    setFrontendBuilding(false);
                    setBuildProgress({
                        phase: '',
                        progress: 0,
                        estimatedTime: 0,
                        startTime: null,
                        refreshCountdown: null
                    });
                }
                
            } catch (error) {
                console.error('Error checking build completion:', error);
                pollCount++;
                if (pollCount < maxPolls) {
                    setTimeout(checkCompletion, 10000); // Continue polling on error
                }
            }
        };
        
        // Start polling
        checkCompletion();
    };

    const handleFrontendRebuild = async () => {
        setFrontendBuilding(true);
        setError(null);
        setSuccess(null);
        const startTime = Date.now();
        setBuildProgress({
            phase: 'Initializing build...',
            progress: 0,
            estimatedTime: 60, // 1 minute estimated
            startTime,
            refreshCountdown: null
        });
        
        // Simulate build progress
        const progressSteps = [
            { phase: 'Analyzing modules...', progress: 25, delay: 2000 },
            { phase: 'Building components...', progress: 50, delay: 3000 },
            { phase: 'Optimizing assets...', progress: 75, delay: 2000 },
            { phase: 'Finalizing build...', progress: 95, delay: 1500 }
        ];
        
        let progressTimeout: NodeJS.Timeout;
        let currentStep = 0;
        
        const updateProgress = () => {
            if (currentStep < progressSteps.length) {
                const step = progressSteps[currentStep];
                setBuildProgress(prev => ({
                    ...prev,
                    phase: step.phase,
                    progress: step.progress
                }));
                currentStep++;
                progressTimeout = setTimeout(updateProgress, step.delay);
            }
        };
        
        // Start progress simulation
        progressTimeout = setTimeout(updateProgress, 1000);
        
        try {
            const response = await adminAPI.services.rebuildFrontend();

            if (response.success) {
                const data = response;
                
                // Refresh notifications to show build start notification
                fetchNotifications();
                fetchCounts();
                
                // Complete the progress
                setBuildProgress(prev => ({
                    ...prev,
                    phase: 'Build completed successfully!',
                    progress: 100
                }));
                
                // Start polling for actual build completion
                setTimeout(() => {
                    pollForBuildCompletion();
                }, 2000);
                
                fetchRecentActions();
            } else {
                clearTimeout(progressTimeout);
                const errorData = response;
                throw new Error(errorData.message || 'Failed to trigger frontend rebuild');
            }
        } catch (err: any) {
            clearTimeout(progressTimeout);
            setError(err.message || 'Failed to rebuild frontend');
            setFrontendBuilding(false);
            setBuildProgress({
                phase: '',
                progress: 0,
                estimatedTime: 0,
                startTime: null,
                refreshCountdown: null
            });
        }
    };

    const handleViewLogs = async (serviceName: string) => {
        if (serviceName === 'omai') {
            // Use OMAI-specific logs dialog
            setOmaiLogsDialog(true);
            return;
        }
        
        setLogsDialog({ open: true, service: serviceName, logs: [], loading: true });
        
        try {
            const response = await adminAPI.services.getServiceLogs(serviceName, 100);

            if (response.success) {
                setLogsDialog({ 
                    open: true, 
                    service: serviceName, 
                    logs: response.logs || [], 
                    loading: false 
                });
            } else {
                const errorData = response;
                throw new Error(errorData.message || 'Failed to fetch logs');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch service logs');
            setLogsDialog({ open: false, service: '', logs: [], loading: false });
        }
    };

    const toggleActionExpanded = (index: number) => {
        setExpandedActions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const removeAction = (index: number) => {
        setRemovedActions(prev => new Set([...prev, index]));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'success';
            case 'stopped': return 'warning';
            case 'error': return 'error';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running': return <IconCheck size={16} />;
            case 'stopped': return <IconPlayerStop size={16} />;
            case 'error': return <IconX size={16} />;
            default: return <IconAlertTriangle size={16} />;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'core': return <IconServer size={20} />;
            case 'database': return <IconDatabase size={20} />;
            case 'worker': return <IconActivity size={20} />;
            case 'frontend': return <IconCode size={20} />;
            case 'ai': return <IconBrain size={20} />;
            default: return <IconSettings size={20} />;
        }
    };

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'healthy': return 'success';
            case 'warning': return 'warning';
            case 'critical': return 'error';
            default: return 'default';
        }
    };

    // OMAI specific functions
    const fetchOmaiStatus = async () => {
        try {
            const response = await adminAPI.services.getOmaiStatus();
            setOmaiStatus(response);
        } catch (err: any) {
            console.error('Failed to fetch OMAI status:', err);
        }
    };

    const fetchOmaiLogs = async () => {
        if (omaiLogsLoading) return;
        
        setOmaiLogsLoading(true);
        try {
            const response = await adminAPI.services.getOmaiLogs(omaiSettings.maxLogEntries);
            setOmaiLogs(response.logs || []);
        } catch (err: any) {
            console.error('Failed to fetch OMAI logs:', err);
        } finally {
            setOmaiLogsLoading(false);
        }
    };

    const fetchOmaiSettings = async () => {
        setOmaiSettingsLoading(true);
        try {
            const response = await adminAPI.services.getOmaiSettings();
            setOmaiSettings(response.settings || omaiSettings);
        } catch (err: any) {
            console.error('Failed to fetch OMAI settings:', err);
        } finally {
            setOmaiSettingsLoading(false);
        }
    };

    const saveOmaiSettings = async () => {
        setOmaiSettingsSaving(true);
        try {
            const response = await adminAPI.services.updateOmaiSettings(omaiSettings);
            if (response.success) {
                setSuccess('OMAI settings updated successfully');
                fetchOmaiStatus();
            } else {
                throw new Error(response.message || 'Failed to update OMAI settings');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update OMAI settings');
        } finally {
            setOmaiSettingsSaving(false);
        }
    };

    // Handle service actions for both regular services and OMAI
    const handleServiceAction = async (serviceName: string, action: string) => {
        setConfirmDialog({ open: false, service: '', action: '' });
        
        if (serviceName === 'omai') {
            // Handle OMAI service actions
            await handleOmaiServiceAction(action as 'start' | 'stop' | 'restart' | 'reload');
        } else {
            // Handle regular service actions
            setLoading(true);
            setError(null);
            
            try {
                const response = await adminAPI.services.performAction(serviceName, action);
                
                if (response.success) {
                    setSuccess(`Successfully ${action}ed ${serviceName} service`);
                    fetchServiceStatus();
                    fetchSystemHealth();
                    
                    // Add to recent actions
                    const newAction: ServiceAction = {
                        service: serviceName,
                        action: action as 'start' | 'stop' | 'restart' | 'reload',
                        timestamp: new Date().toISOString(),
                        success: true,
                        message: response.message
                    };
                    setRecentActions(prev => [newAction, ...prev]);
                } else {
                    throw new Error(response.message || `Failed to ${action} ${serviceName} service`);
                }
            } catch (err: any) {
                setError(err.message || `Failed to ${action} ${serviceName} service`);
                
                // Add failed action to recent actions
                const newAction: ServiceAction = {
                    service: serviceName,
                    action: action as 'start' | 'stop' | 'restart' | 'reload',
                    timestamp: new Date().toISOString(),
                    success: false,
                    message: err.message
                };
                setRecentActions(prev => [newAction, ...prev]);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleOmaiServiceAction = async (action: 'start' | 'stop' | 'restart' | 'reload') => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await adminAPI.services.performOmaiAction(action);
            if (response.success) {
                setSuccess(`Successfully ${action}ed OMAI service`);
                fetchOmaiStatus();
                fetchOmaiLogs();
            } else {
                throw new Error(response.message || `Failed to ${action} OMAI service`);
            }
        } catch (err: any) {
            setError(err.message || `Failed to ${action} OMAI service`);
        } finally {
            setLoading(false);
        }
    };

    const getOmaiStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'success';
            case 'warning': return 'warning';
            case 'error': return 'error';
            default: return 'default';
        }
    };

    const getOmaiStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy': return <IconCheck size={16} />;
            case 'warning': return <IconAlertTriangle size={16} />;
            case 'error': return <IconX size={16} />;
            default: return <IconHelpCircle size={16} />;
        }
    };

    const getLogLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'error';
            case 'warn': return 'warning';
            case 'info': return 'info';
            case 'debug': return 'default';
            case 'trace': return 'default';
            default: return 'default';
        }
    };

    const getLogLevelIcon = (level: string) => {
        switch (level) {
            case 'error': return <IconX size={16} />;
            case 'warn': return <IconAlertTriangle size={16} />;
            case 'info': return <IconInfoCircle size={16} />;
            case 'debug': return <IconBug size={16} />;
            case 'trace': return <IconTimeline size={16} />;
            default: return <IconInfoCircle size={16} />;
        }
    };



    if (!isSuperAdmin()) {
        return (
            <Alert severity="error">
                Access denied. Only super administrators can manage services.
            </Alert>
        );
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Service Management
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                Monitor and control essential OrthodMetrics services. Critical services are automatically monitored for 24/7 uptime.
            </Alert>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" onClick={fetchServiceStatus}>
                        Retry
                    </Button>
                }>
                    {error}
                </Alert>
            )}

            {/* System Health Overview */}
            {systemHealth && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">
                                System Health Overview
                            </Typography>
                            <Box display="flex" alignItems="center" gap={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={autoRefresh}
                                            onChange={(e) => setAutoRefresh(e.target.checked)}
                                        />
                                    }
                                    label="Auto Refresh"
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<IconRefresh />}
                                    onClick={() => {
                                        fetchServiceStatus();
                                        fetchSystemHealth();
                                    }}
                                    disabled={loading}
                                >
                                    Refresh
                                </Button>
                            </Box>
                        </Box>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={3}>
                                <Box textAlign="center">
                                    <Chip
                                        label={systemHealth.overall.toUpperCase()}
                                        color={getHealthColor(systemHealth.overall)}
                                        size="large"
                                        icon={getStatusIcon(systemHealth.overall)}
                                    />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Overall Status
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Box textAlign="center">
                                    <Typography variant="h4">
                                        {systemHealth.servicesUp}/{systemHealth.servicesTotal}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Services Online
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Box textAlign="center">
                                    <Typography variant="h6">
                                        {systemHealth.criticalServices.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Critical Services
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Box textAlign="center">
                                    <Typography variant="body2">
                                        {new Date(systemHealth.lastUpdate).toLocaleTimeString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Last Updated
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Service Control Actions */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Quick Actions
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                        <Button
                            variant="contained"
                            startIcon={frontendBuilding ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <IconBuildingFactory />}
                            onClick={handleFrontendRebuild}
                            disabled={frontendBuilding}
                            sx={{ 
                                minWidth: 160,
                                '&.Mui-disabled': {
                                    background: frontendBuilding ? 'primary.main' : undefined,
                                    color: frontendBuilding ? 'white' : undefined,
                                    opacity: frontendBuilding ? 0.8 : undefined
                                }
                            }}
                        >
                            {frontendBuilding ? 'Building Frontend...' : 'Rebuild Frontend'}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<IconReload />}
                            onClick={() => setConfirmDialog({ open: true, service: 'pm2', action: 'reload' })}
                        >
                            Reload PM2
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<IconRefresh />}
                            onClick={() => setConfirmDialog({ open: true, service: 'nginx', action: 'restart' })}
                        >
                            Restart Nginx
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* Build Progress Indicator */}
            {frontendBuilding && (
                <Card sx={{ mb: 3, border: '1px solid', borderColor: 'primary.main' }}>
                    <CardContent>
                        <Box sx={{ mb: 2 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                <Typography variant="h6" color="primary">
                                    Frontend Build in Progress
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {buildProgress.startTime && (
                                        `${Math.floor((Date.now() - buildProgress.startTime) / 1000)}s elapsed`
                                    )}
                                </Typography>
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {buildProgress.phase}
                            </Typography>
                            
                            <LinearProgress 
                                variant="determinate" 
                                value={buildProgress.progress} 
                                sx={{ 
                                    height: 8, 
                                    borderRadius: 4,
                                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 4,
                                    }
                                }} 
                            />
                            
                            <Box display="flex" justifyContent="space-between" mt={1}>
                                <Typography variant="body2" color="text.secondary">
                                    {buildProgress.progress}% complete
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Est. {Math.max(0, buildProgress.estimatedTime - (buildProgress.startTime ? Math.floor((Date.now() - buildProgress.startTime) / 1000) : 0))}s remaining
                                </Typography>
                            </Box>
                        </Box>
                        
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Build Command:</strong> NODE_OPTIONS="--max-old-space-size=4096" npm run build
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Monitor Progress:</strong> Click "View Logs" on Backend Server below to see real build status
                            </Typography>
                            <Typography variant="body2" color="primary">
                                <strong>Auto-Refresh:</strong> Page will automatically refresh when build completes
                            </Typography>
                        </Alert>
                    </CardContent>
                </Card>
            )}

            {/* Services Table */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Service Status
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Service</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Resource Usage</TableCell>
                                    <TableCell>Uptime</TableCell>
                                    <TableCell>Last Restart</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {services.map((service) => (
                                    <TableRow 
                                        key={service.name}
                                        sx={frontendBuilding && service.name === 'backend' ? {
                                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                            border: '1px solid rgba(25, 118, 210, 0.3)'
                                        } : {}}
                                    >
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {getCategoryIcon(service.category)}
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {service.displayName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {service.description}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={service.status}
                                                color={getStatusColor(service.status)}
                                                size="small"
                                                icon={getStatusIcon(service.status)}
                                            />
                                            {service.pid && (
                                                <Typography variant="caption" display="block">
                                                    PID: {service.pid}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {service.cpu !== undefined && (
                                                <Box>
                                                    <Typography variant="caption">
                                                        CPU: {service.cpu.toFixed(1)}%
                                                    </Typography>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={service.cpu}
                                                        sx={{ height: 4, mb: 0.5 }}
                                                    />
                                                    <Typography variant="caption">
                                                        RAM: {service.memory?.toFixed(1)}MB
                                                    </Typography>
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {service.uptime || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {service.lastRestart 
                                                    ? new Date(service.lastRestart).toLocaleString()
                                                    : 'Never'
                                                }
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                {service.restartable && service.status === 'running' && (
                                                    <Tooltip title="Restart Service">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setConfirmDialog({
                                                                open: true,
                                                                service: service.name,
                                                                action: 'restart'
                                                            })}
                                                        >
                                                            <IconRefresh size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {service.restartable && service.status === 'stopped' && (
                                                    <Tooltip title="Start Service">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setConfirmDialog({
                                                                open: true,
                                                                service: service.name,
                                                                action: 'start'
                                                            })}
                                                        >
                                                            <IconPlayerPlay size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {service.restartable && service.status === 'running' && (
                                                    <Tooltip title="Stop Service">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setConfirmDialog({
                                                                open: true,
                                                                service: service.name,
                                                                action: 'stop'
                                                            })}
                                                        >
                                                            <IconPlayerStop size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title={
                                                    frontendBuilding && service.name === 'backend' 
                                                        ? "View Build Progress - Check for completion status!" 
                                                        : "View Logs"
                                                }>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewLogs(service.name)}
                                                        sx={frontendBuilding && service.name === 'backend' ? {
                                                            backgroundColor: 'primary.main',
                                                            color: 'white',
                                                            '&:hover': {
                                                                backgroundColor: 'primary.dark'
                                                            }
                                                        } : {}}
                                                    >
                                                        <IconEye size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                                {service.name === 'backend' && (
                                                    <Tooltip title="View Backend Details">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setConfirmDialog({ open: true, service: 'backend', action: 'details' })}
                                                        >
                                                            <IconListDetails size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {service.name === 'omai' && (
                                                    <>
                                                        <Tooltip title="OMAI Settings">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setOmaiSettingsDialog(true)}
                                                            >
                                                                <IconSettings size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Console Logs">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setOmaiLogsDialog(true)}
                                                            >
                                                                <IconTerminal size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>



            {/* Recent Actions */}
            {recentActions.filter((_, index) => !removedActions.has(index)).length > 0 && (
                <Card>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">
                                Recent Service Actions
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<IconX />}
                                onClick={() => {
                                    const allIndexes = recentActions.slice(0, 10).map((_, index) => index);
                                    setRemovedActions(new Set(allIndexes));
                                }}
                                sx={{ fontSize: '0.75rem' }}
                            >
                                Clear All
                            </Button>
                        </Box>
                        <Stack spacing={1}>
                            {recentActions
                                .slice(0, 10)
                                .map((action, index) => {
                                    if (removedActions.has(index)) return null;
                                    
                                    const isExpanded = expandedActions.has(index);
                                    const hasLongMessage = action.message && action.message.length > 100;
                                    const displayMessage = action.message ? 
                                        (hasLongMessage && !isExpanded ? 
                                            `${action.message.substring(0, 100)}...` : 
                                            action.message
                                        ) : '';

                                    return (
                                        <Card
                                            key={index}
                                            variant="outlined"
                                            sx={{
                                                border: `1px solid ${action.success ? 'success.main' : 'error.main'}`,
                                                backgroundColor: action.success ? 'success.light' : 'error.light',
                                                '&:hover': {
                                                    backgroundColor: action.success ? 'success.dark' : 'error.dark',
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                                                {/* Header Row */}
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box display="flex" alignItems="center" gap={1} flex={1}>
                                                        <Chip
                                                            label={action.action.toUpperCase()}
                                                            size="small"
                                                            color={action.success ? 'success' : 'error'}
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {action.service}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(action.timestamp).toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                    
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        {hasLongMessage && (
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => toggleActionExpanded(index)}
                                                                sx={{ color: 'text.secondary' }}
                                                            >
                                                                {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                                                            </IconButton>
                                                        )}
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => removeAction(index)}
                                                            sx={{ color: 'text.secondary' }}
                                                        >
                                                            <IconX size={16} />
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                                
                                                {/* Message Row */}
                                                {displayMessage && (
                                                    <Box mt={1}>
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.75rem',
                                                                wordBreak: 'break-word',
                                                                whiteSpace: 'pre-wrap',
                                                                backgroundColor: 'rgba(0,0,0,0.1)',
                                                                padding: 1,
                                                                borderRadius: 1,
                                                                maxHeight: isExpanded ? 'none' : '100px',
                                                                overflow: isExpanded ? 'visible' : 'hidden'
                                                            }}
                                                        >
                                                            {displayMessage}
                                                        </Typography>
                                                        {hasLongMessage && !isExpanded && (
                                                            <Button
                                                                size="small"
                                                                onClick={() => toggleActionExpanded(index)}
                                                                sx={{ mt: 0.5, fontSize: '0.7rem' }}
                                                            >
                                                                Show More
                                                            </Button>
                                                        )}
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })
                                .filter(Boolean)}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, service: '', action: '' })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Confirm Service Action
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Are you sure you want to {confirmDialog.action} the {confirmDialog.service} service?
                        This action may temporarily affect system availability.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog({ open: false, service: '', action: '' })}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleServiceAction(confirmDialog.service, confirmDialog.action)}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : `${confirmDialog.action.toUpperCase()}`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Logs Dialog */}
            <Dialog
                open={logsDialog.open}
                onClose={() => setLogsDialog({ open: false, service: '', logs: [], loading: false })}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconTerminal size={20} />
                        Service Logs: {logsDialog.service}
                        {logsDialog.loading && <CircularProgress size={16} />}
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {logsDialog.loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                bgcolor: 'grey.900',
                                color: 'common.white',
                                p: 2,
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                maxHeight: 400,
                                overflowY: 'auto',
                                minHeight: 200,
                                border: '1px solid',
                                borderColor: 'grey.700'
                            }}
                        >
                            {logsDialog.logs.length > 0 ? (
                                logsDialog.logs.map((log, index) => (
                                    <Typography 
                                        key={index} 
                                        component="div" 
                                        variant="body2"
                                        sx={{ 
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            py: 0.25
                                        }}
                                    >
                                        {log}
                                    </Typography>
                                ))
                            ) : (
                                <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center', py: 2 }}>
                                    No logs available
                                </Typography>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => handleViewLogs(logsDialog.service)}
                        disabled={logsDialog.loading}
                        startIcon={<IconRefresh />}
                    >
                        Refresh
                    </Button>
                    <Button onClick={() => setLogsDialog({ open: false, service: '', logs: [], loading: false })}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* OMAI Settings Dialog */}
            <Dialog
                open={omaiSettingsDialog}
                onClose={() => setOmaiSettingsDialog(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconSettings size={20} />
                        OMAI Service Settings
                        {omaiSettingsLoading && <CircularProgress size={16} />}
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={omaiSettingsTab} onChange={(_, newValue) => setOmaiSettingsTab(newValue)}>
                            <Tab label="General" />
                            <Tab label="Features" />
                            <Tab label="Performance" />
                            <Tab label="Security" />
                            <Tab label="Agents" />
                            <Tab label="Knowledge" />
                        </Tabs>
                    </Box>

                    {omaiSettingsTab === 0 && (
                        <Stack spacing={3}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={omaiSettings.enabled}
                                        onChange={(e) => setOmaiSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                    />
                                }
                                label="Enable OMAI Service"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={omaiSettings.debugMode}
                                        onChange={(e) => setOmaiSettings(prev => ({ ...prev, debugMode: e.target.checked }))}
                                    />
                                }
                                label="Debug Mode"
                            />
                            <FormControl fullWidth>
                                <InputLabel>Log Level</InputLabel>
                                <Select
                                    value={omaiSettings.logLevel}
                                    onChange={(e) => setOmaiSettings(prev => ({ ...prev, logLevel: e.target.value as any }))}
                                    label="Log Level"
                                >
                                    <MenuItem value="error">Error</MenuItem>
                                    <MenuItem value="warn">Warning</MenuItem>
                                    <MenuItem value="info">Info</MenuItem>
                                    <MenuItem value="debug">Debug</MenuItem>
                                    <MenuItem value="trace">Trace</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                type="number"
                                label="Max Log Entries"
                                value={omaiSettings.maxLogEntries}
                                onChange={(e) => setOmaiSettings(prev => ({ ...prev, maxLogEntries: parseInt(e.target.value) }))}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={omaiSettings.autoRefreshLogs}
                                        onChange={(e) => setOmaiSettings(prev => ({ ...prev, autoRefreshLogs: e.target.checked }))}
                                    />
                                }
                                label="Auto Refresh Logs"
                            />
                            {omaiSettings.autoRefreshLogs && (
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Log Refresh Interval (seconds)"
                                    value={omaiSettings.logRefreshInterval}
                                    onChange={(e) => setOmaiSettings(prev => ({ ...prev, logRefreshInterval: parseInt(e.target.value) }))}
                                />
                            )}
                        </Stack>
                    )}

                    {omaiSettingsTab === 1 && (
                        <Stack spacing={2}>
                            <Typography variant="subtitle2">Core Features</Typography>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.ask}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, ask: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Ask/Query System"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.autofix}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, autofix: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Auto-Fix System"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.generateModule}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, generateModule: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Module Generation"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.runAgents}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, runAgents: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Agent Execution"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.runPlugins}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, runPlugins: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Plugin System"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.generateDoc}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, generateDoc: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Documentation Generation"
                                />
                            </FormGroup>
                            <Divider />
                            <Typography variant="subtitle2">Background Features</Typography>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.knowledgeIndexing}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, knowledgeIndexing: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Knowledge Indexing"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.patternAnalysis}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, patternAnalysis: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Pattern Analysis"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.agentMetrics}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, agentMetrics: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Agent Metrics"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.features.backgroundScheduler}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                features: { ...prev.features, backgroundScheduler: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="Background Scheduler"
                                />
                            </FormGroup>
                        </Stack>
                    )}

                    {omaiSettingsTab === 2 && (
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Max Concurrent Requests"
                                value={omaiSettings.performance.maxConcurrentRequests}
                                onChange={(e) => setOmaiSettings(prev => ({
                                    ...prev,
                                    performance: { ...prev.performance, maxConcurrentRequests: parseInt(e.target.value) }
                                }))}
                            />
                            <TextField
                                fullWidth
                                type="number"
                                label="Request Timeout (ms)"
                                value={omaiSettings.performance.requestTimeout}
                                onChange={(e) => setOmaiSettings(prev => ({
                                    ...prev,
                                    performance: { ...prev.performance, requestTimeout: parseInt(e.target.value) }
                                }))}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={omaiSettings.performance.cacheEnabled}
                                        onChange={(e) => setOmaiSettings(prev => ({
                                            ...prev,
                                            performance: { ...prev.performance, cacheEnabled: e.target.checked }
                                        }))}
                                    />
                                }
                                label="Enable Caching"
                            />
                            {omaiSettings.performance.cacheEnabled && (
                                <>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Cache Size"
                                        value={omaiSettings.performance.cacheSize}
                                        onChange={(e) => setOmaiSettings(prev => ({
                                            ...prev,
                                            performance: { ...prev.performance, cacheSize: parseInt(e.target.value) }
                                        }))}
                                    />
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Cache TTL (seconds)"
                                        value={omaiSettings.performance.cacheTTL}
                                        onChange={(e) => setOmaiSettings(prev => ({
                                            ...prev,
                                            performance: { ...prev.performance, cacheTTL: parseInt(e.target.value) }
                                        }))}
                                    />
                                </>
                            )}
                        </Stack>
                    )}

                    {omaiSettingsTab === 3 && (
                        <Stack spacing={3}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={omaiSettings.security.requireAuth}
                                        onChange={(e) => setOmaiSettings(prev => ({
                                            ...prev,
                                            security: { ...prev.security, requireAuth: e.target.checked }
                                        }))}
                                    />
                                }
                                label="Require Authentication"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={omaiSettings.security.rateLimitEnabled}
                                        onChange={(e) => setOmaiSettings(prev => ({
                                            ...prev,
                                            security: { ...prev.security, rateLimitEnabled: e.target.checked }
                                        }))}
                                    />
                                }
                                label="Enable Rate Limiting"
                            />
                            {omaiSettings.security.rateLimitEnabled && (
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Rate Limit (requests per hour)"
                                    value={omaiSettings.security.rateLimitPerHour}
                                    onChange={(e) => setOmaiSettings(prev => ({
                                        ...prev,
                                        security: { ...prev.security, rateLimitPerHour: parseInt(e.target.value) }
                                    }))}
                                />
                            )}
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={omaiSettings.security.auditLogging}
                                        onChange={(e) => setOmaiSettings(prev => ({
                                            ...prev,
                                            security: { ...prev.security, auditLogging: e.target.checked }
                                        }))}
                                    />
                                }
                                label="Audit Logging"
                            />
                            {omaiSettings.security.auditLogging && (
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Audit Log Retention (days)"
                                    value={omaiSettings.security.auditLogRetentionDays}
                                    onChange={(e) => setOmaiSettings(prev => ({
                                        ...prev,
                                        security: { ...prev.security, auditLogRetentionDays: parseInt(e.target.value) }
                                    }))}
                                />
                            )}
                        </Stack>
                    )}

                    {omaiSettingsTab === 4 && (
                        <Stack spacing={2}>
                            <Typography variant="subtitle2">Available Agents</Typography>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.agents.omaiRefactor}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                agents: { ...prev.agents, omaiRefactor: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="OMAI Refactor Agent"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.agents.omaiAnalyzer}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                agents: { ...prev.agents, omaiAnalyzer: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="OMAI Analyzer Agent"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.agents.omaiGenerator}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                agents: { ...prev.agents, omaiGenerator: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="OMAI Generator Agent"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.agents.omaiValidator}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                agents: { ...prev.agents, omaiValidator: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="OMAI Validator Agent"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={omaiSettings.agents.omaiOptimizer}
                                            onChange={(e) => setOmaiSettings(prev => ({
                                                ...prev,
                                                agents: { ...prev.agents, omaiOptimizer: e.target.checked }
                                            }))}
                                        />
                                    }
                                    label="OMAI Optimizer Agent"
                                />
                            </FormGroup>
                        </Stack>
                    )}

                    {omaiSettingsTab === 5 && (
                        <Stack spacing={3}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={omaiSettings.knowledge.autoIndexing}
                                        onChange={(e) => setOmaiSettings(prev => ({
                                            ...prev,
                                            knowledge: { ...prev.knowledge, autoIndexing: e.target.checked }
                                        }))}
                                    />
                                }
                                label="Auto Indexing"
                            />
                            {omaiSettings.knowledge.autoIndexing && (
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Index Interval (minutes)"
                                    value={omaiSettings.knowledge.indexInterval}
                                    onChange={(e) => setOmaiSettings(prev => ({
                                        ...prev,
                                        knowledge: { ...prev.knowledge, indexInterval: parseInt(e.target.value) }
                                    }))}
                                />
                            )}
                            <TextField
                                fullWidth
                                type="number"
                                label="Max Embeddings"
                                value={omaiSettings.knowledge.maxEmbeddings}
                                onChange={(e) => setOmaiSettings(prev => ({
                                    ...prev,
                                    knowledge: { ...prev.knowledge, maxEmbeddings: parseInt(e.target.value) }
                                }))}
                            />
                            <TextField
                                fullWidth
                                type="number"
                                label="Similarity Threshold"
                                value={omaiSettings.knowledge.similarityThreshold}
                                onChange={(e) => setOmaiSettings(prev => ({
                                    ...prev,
                                    knowledge: { ...prev.knowledge, similarityThreshold: parseFloat(e.target.value) }
                                }))}
                                inputProps={{ step: 0.1, min: 0, max: 1 }}
                            />
                            <TextField
                                fullWidth
                                type="number"
                                label="Vector Dimensions"
                                value={omaiSettings.knowledge.vectorDimensions}
                                onChange={(e) => setOmaiSettings(prev => ({
                                    ...prev,
                                    knowledge: { ...prev.knowledge, vectorDimensions: parseInt(e.target.value) }
                                }))}
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOmaiSettingsDialog(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={saveOmaiSettings}
                        disabled={omaiSettingsSaving}
                        startIcon={omaiSettingsSaving ? <CircularProgress size={16} /> : <IconCheck />}
                    >
                        {omaiSettingsSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* OMAI Logs Dialog */}
            <Dialog
                open={omaiLogsDialog}
                onClose={() => setOmaiLogsDialog(false)}
                maxWidth="xl"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconTerminal size={20} />
                        OMAI Console Logs
                        {omaiLogsLoading && <CircularProgress size={16} />}
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={omaiLogsTab} onChange={(_, newValue) => setOmaiLogsTab(newValue)}>
                            <Tab label="Live Logs" />
                            <Tab label="Error Logs" />
                            <Tab label="Debug Logs" />
                            <Tab label="Audit Logs" />
                        </Tabs>
                    </Box>

                    <Box
                        sx={{
                            bgcolor: 'grey.900',
                            color: 'common.white',
                            p: 2,
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            maxHeight: 500,
                            overflowY: 'auto',
                            minHeight: 300,
                            border: '1px solid',
                            borderColor: 'grey.700'
                        }}
                    >
                        {omaiLogs.length > 0 ? (
                            <List dense>
                                {omaiLogs
                                    .filter(log => {
                                        if (omaiLogsTab === 1) return log.level === 'error';
                                        if (omaiLogsTab === 2) return log.level === 'debug' || log.level === 'trace';
                                        if (omaiLogsTab === 3) return log.component === 'audit';
                                        return true;
                                    })
                                    .map((log, index) => (
                                        <ListItem key={index} sx={{ py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <ListItemIcon sx={{ minWidth: 40 }}>
                                                <Chip
                                                    icon={getLogLevelIcon(log.level)}
                                                    label={log.level.toUpperCase()}
                                                    color={getLogLevelColor(log.level)}
                                                    size="small"
                                                    sx={{ fontSize: '0.7rem' }}
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box display="flex" alignItems="center" gap={2}>
                                                        <Typography variant="caption" sx={{ color: 'grey.400', minWidth: 150 }}>
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'grey.300', minWidth: 100 }}>
                                                            {log.component}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: 'common.white' }}>
                                                            {log.message}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    log.details && (
                                                        <Typography variant="caption" sx={{ color: 'grey.500', fontFamily: 'monospace' }}>
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </Typography>
                                                    )
                                                }
                                            />
                                        </ListItem>
                                    ))}
                            </List>
                        ) : (
                            <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center', py: 4 }}>
                                No logs available
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={fetchOmaiLogs}
                        disabled={omaiLogsLoading}
                        startIcon={<IconRefresh />}
                    >
                        Refresh
                    </Button>
                    <Button onClick={() => setOmaiLogsDialog(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Backend Details Dialog */}
            <Dialog
                open={confirmDialog.open && confirmDialog.service === 'backend' && confirmDialog.action === 'details'}
                onClose={() => setConfirmDialog({ open: false, service: '', action: '' })}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    Backend Server Details
                </DialogTitle>
                <DialogContent>
                    <BackendDetails />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog({ open: false, service: '', action: '' })}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success Snackbar */}
            <Snackbar
                open={!!success}
                autoHideDuration={6000}
                onClose={() => setSuccess(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ServiceManagement; 