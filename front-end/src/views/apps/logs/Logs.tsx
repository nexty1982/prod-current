import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  BugReport as BugReportIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { adminAPI } from '../../../api/admin.api';

// Types
interface LogEntry {
    id: string;
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    component: string;
    message: string;
    details?: any;
    userId?: string;
    ip?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    duration?: number;
}

interface LogLevel {
    component: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    enabled: boolean;
}

interface ComponentInfo {
    name: string;
    icon: React.ReactNode;
    description: string;
    logCount: number;
    lastActivity: string;
}

// Styled components
const LogContainer = styled(Box)(({ theme }) => ({
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: theme.palette.grey[900],
    color: theme.palette.common.white,
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    maxHeight: '500px',
    overflowY: 'auto',
    border: `1px solid ${theme.palette.grey[700]}`,
}));

const LogLine = styled(Box)<{ level: string }>(({ theme, level }) => {
    const colors = {
        debug: theme.palette.grey[400],
        info: theme.palette.info.main,
        warn: theme.palette.warning.main,
        error: theme.palette.error.main,
        fatal: theme.palette.error.dark,
    };

    return {
        display: 'flex',
        alignItems: 'flex-start',
        padding: theme.spacing(0.5, 1),
        borderLeft: `3px solid ${colors[level as keyof typeof colors]}`,
        marginBottom: theme.spacing(0.5),
        backgroundColor: `${colors[level as keyof typeof colors]}15`,
        '&:hover': {
            backgroundColor: `${colors[level as keyof typeof colors]}25`,
        },
    };
});

const Logs: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
    const [logLevels, setLogLevels] = useState<LogLevel[]>([]);
    const [selectedComponent, setSelectedComponent] = useState<string>('all');
    const [selectedLevel, setSelectedLevel] = useState<string>('all');
    const [selectedSource, setSelectedSource] = useState<string>('both'); // 'memory', 'file', 'both'
    const [searchTerm, setSearchTerm] = useState('');
    const [isRealTime, setIsRealTime] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [availableComponents, setAvailableComponents] = useState<ComponentInfo[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | EventSource | null>(null);

    const components: ComponentInfo[] = [
        {
            name: 'Authentication',
            icon: <IconShield size={20} />,
            description: 'User authentication and authorization',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
        {
            name: 'Database',
            icon: <IconDatabase size={20} />,
            description: 'Database queries and operations',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
        {
            name: 'API Server',
            icon: <IconServer size={20} />,
            description: 'REST API endpoints and middleware',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
        {
            name: 'Email Service',
            icon: <IconMail size={20} />,
            description: 'Email sending and notifications',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
        {
            name: 'File Upload',
            icon: <IconUpload size={20} />,
            description: 'File uploads and processing',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
        {
            name: 'OCR Service',
            icon: <IconFileText size={20} />,
            description: 'OCR processing and document analysis',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
        {
            name: 'Frontend',
            icon: <IconTerminal size={20} />,
            description: 'Frontend application logs',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
        {
            name: 'Backend',
            icon: <IconServer size={20} />,
            description: 'Backend application server logs',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
        {
            name: 'Error Logs',
            icon: <IconBug size={20} />,
            description: 'System error logs',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
        {
            name: 'Combined',
            icon: <IconAdjustments size={20} />,
            description: 'All logs combined',
            logCount: 0,
            lastActivity: new Date().toISOString(),
        },
    ];

    useEffect(() => {
        initializeLogLevels();
        loadInitialLogs();

        if (isRealTime) {
            startRealTimeLogging();
        } else {
            stopRealTimeLogging();
        }

        return () => stopRealTimeLogging();
    }, [isRealTime]);

    useEffect(() => {
        filterLogs();
    }, [logs, selectedComponent, selectedLevel, searchTerm]);

    useEffect(() => {
        loadInitialLogs();
    }, [selectedSource, selectedComponent, selectedLevel]);

    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [filteredLogs, autoScroll]);

    const initializeLogLevels = async () => {
        try {
            const response = await fetch('/api/logs/components', {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                const levels: LogLevel[] = data.components.map((comp: any) => ({
                    component: comp.name,
                    level: comp.level,
                    enabled: comp.enabled,
                }));
                setLogLevels(levels);
            } else {
                // Fallback to initial levels
                const initialLevels: LogLevel[] = components.map(component => ({
                    component: component.name,
                    level: 'info',
                    enabled: true,
                }));
                setLogLevels(initialLevels);
            }
        } catch (error) {
            console.error('Error initializing log levels:', error);
            // Fallback to initial levels
            const initialLevels: LogLevel[] = components.map(component => ({
                component: component.name,
                level: 'info',
                enabled: true,
            }));
            setLogLevels(initialLevels);
        }
    };

    const loadInitialLogs = async () => {
        try {
            const params = new URLSearchParams({
                limit: '100',
                offset: '0',
                source: selectedSource,
                component: selectedComponent,
                level: selectedLevel
            });

            const response = await fetch(`/api/logs?${params}`, {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs);
                
                // Update available components from server
                if (data.components) {
                    setAvailableComponents(data.components);
                }
            } else {
                console.error('Failed to load logs');
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    };

    const startRealTimeLogging = () => {
        if (typeof EventSource !== 'undefined') {
            const eventSource = new EventSource(`/api/logs/stream?component=${selectedComponent}&level=${selectedLevel}`);

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'log') {
                    setLogs(prev => [...prev, data.data].slice(-1000));
                }
            };

            eventSource.onerror = (error) => {
                console.error('EventSource failed:', error);
                eventSource.close();
                // Fallback to polling
                intervalRef.current = setInterval(() => {
                    fetchNewLogs();
                }, 2000);
            };

            // Store reference for cleanup
            intervalRef.current = eventSource as any;
        } else {
            // Fallback to polling for browsers without EventSource
            intervalRef.current = setInterval(() => {
                fetchNewLogs();
            }, 2000);
        }
    };

    const stopRealTimeLogging = () => {
        if (intervalRef.current) {
            if (intervalRef.current instanceof EventSource) {
                intervalRef.current.close();
            } else {
                clearInterval(intervalRef.current);
            }
            intervalRef.current = null;
        }
    };

    const fetchNewLogs = async () => {
        try {
            const params = new URLSearchParams({
                limit: '10',
                offset: '0',
                component: selectedComponent,
                level: selectedLevel,
                source: selectedSource
            });

            const response = await fetch(`/api/logs?${params}`, {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.logs.length > 0) {
                    setLogs(prev => {
                        const newLogs = data.logs.filter((newLog: LogEntry) =>
                            !prev.some(existingLog => existingLog.id === newLog.id)
                        );
                        return [...prev, ...newLogs].slice(-1000);
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching new logs:', error);
        }
    };

    const filterLogs = () => {
        let filtered = logs;

        if (selectedComponent !== 'all') {
            filtered = filtered.filter(log => log.component === selectedComponent);
        }

        if (selectedLevel !== 'all') {
            filtered = filtered.filter(log => log.level === selectedLevel);
        }

        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.component.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredLogs(filtered);
    };

    const updateLogLevel = async (component: string, level: string) => {
        try {
            const response = await fetch(`/api/logs/components/${component}/level`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ level }),
            });

            if (response.ok) {
                setLogLevels(prev => prev.map(item =>
                    item.component === component ? { ...item, level: level as any } : item
                ));

                setSnackbarMessage(`Log level updated for ${component}`);
                setSnackbarOpen(true);
            } else {
                throw new Error('Failed to update log level');
            }
        } catch (error) {
            console.error('Error updating log level:', error);
            setSnackbarMessage('Failed to update log level');
            setSnackbarOpen(true);
        }
    };

    const toggleComponent = async (component: string) => {
        try {
            const response = await fetch(`/api/logs/components/${component}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                setLogLevels(prev => prev.map(item =>
                    item.component === component ? { ...item, enabled: !item.enabled } : item
                ));

                const currentState = logLevels.find(l => l.component === component);
                setSnackbarMessage(`Logging ${currentState?.enabled ? 'disabled' : 'enabled'} for ${component}`);
                setSnackbarOpen(true);
            } else {
                throw new Error('Failed to toggle component logging');
            }
        } catch (error) {
            console.error('Error toggling component:', error);
            setSnackbarMessage('Failed to toggle component logging');
            setSnackbarOpen(true);
        }
    };

    const clearLogs = async () => {
        try {
            const response = await fetch('/api/logs', {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                setLogs([]);
                setSnackbarMessage('Logs cleared');
                setSnackbarOpen(true);
            } else {
                throw new Error('Failed to clear logs');
            }
        } catch (error) {
            console.error('Error clearing logs:', error);
            setSnackbarMessage('Failed to clear logs');
            setSnackbarOpen(true);
        }
    };

    const exportLogs = () => {
        const dataStr = JSON.stringify(filteredLogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        setSnackbarMessage('Logs exported successfully');
        setSnackbarOpen(true);
    };

    const generateTestLogs = async () => {
        try {
            const response = await fetch('/api/logs/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ count: 10, component: 'API Server' }),
            });

            if (response.ok) {
                setSnackbarMessage('Test logs generated successfully');
                setSnackbarOpen(true);
                // Refresh logs to see the new entries
                loadInitialLogs();
            } else {
                throw new Error('Failed to generate test logs');
            }
        } catch (error) {
            console.error('Error generating test logs:', error);
            setSnackbarMessage('Failed to generate test logs');
            setSnackbarOpen(true);
        }
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'debug': return <IconBug size={16} />;
            case 'info': return <IconInfoCircle size={16} />;
            case 'warn': return <IconAlertTriangle size={16} />;
            case 'error': return <IconX size={16} />;
            case 'fatal': return <IconX size={16} />;
            default: return <IconInfoCircle size={16} />;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'debug': return 'default';
            case 'info': return 'info';
            case 'warn': return 'warning';
            case 'error': return 'error';
            case 'fatal': return 'error';
            default: return 'default';
        }
    };

    const getLogStats = () => {
        const stats = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0,
            fatal: 0,
            total: logs.length
        };
        
        logs.forEach(log => {
            if (stats.hasOwnProperty(log.level)) {
                stats[log.level as keyof typeof stats]++;
            }
        });
        
        return stats;
    };

    const logStats = getLogStats();

    const BCrumb = [
        {
            to: '/',
            title: 'Home',
        },
        {
            title: 'Logs',
        },
    ];

    return (
        <PageContainer title="Logs" description="System logs and monitoring">
            <Breadcrumb title="System Logs" items={BCrumb} />

            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h4">System Logs</Typography>
                        <Box display="flex" gap={1}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isRealTime}
                                        onChange={(e) => setIsRealTime(e.target.checked)}
                                    />
                                }
                                label="Real-time"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={autoScroll}
                                        onChange={(e) => setAutoScroll(e.target.checked)}
                                    />
                                }
                                label="Auto-scroll"
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<IconRefresh />}
                                onClick={loadInitialLogs}
                            >
                                Refresh
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<IconDownload />}
                                onClick={exportLogs}
                            >
                                Export
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                startIcon={<IconClearAll />}
                                onClick={clearLogs}
                            >
                                Clear
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                color="warning"
                                startIcon={<IconBug />}
                                onClick={() => generateTestLogs()}
                                sx={{ ml: 1 }}
                            >
                                Test Logs
                            </Button>
                        </Box>
                    </Box>

                    <Tabs value={activeTab} onChange={(_e, value) => setActiveTab(value)} sx={{ mb: 3 }}>
                        <Tab
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <IconTerminal size={16} />
                                    Site Logs
                                    <Badge badgeContent={filteredLogs.length} color="primary" max={999} />
                                </Box>
                            }
                        />
                        <Tab
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <IconAdjustments size={16} />
                                    Component Logs
                                </Box>
                            }
                        />
                        <Tab
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <IconSettings size={16} />
                                    Log Levels
                                </Box>
                            }
                        />
                    </Tabs>

                    {/* Site Logs Tab */}
                    {activeTab === 0 && (
                        <Box>
                            {/* Filters */}
                            <Box mb={3}>
                                <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                                    <Box minWidth="200px">
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Log Level</InputLabel>
                                            <Select
                                                value={selectedLevel}
                                                label="Log Level"
                                                onChange={(e) => setSelectedLevel(e.target.value)}
                                            >
                                                <MenuItem value="all">All Levels</MenuItem>
                                                <MenuItem value="debug">Debug</MenuItem>
                                                <MenuItem value="info">Info</MenuItem>
                                                <MenuItem value="warn">Warning</MenuItem>
                                                <MenuItem value="error">Error</MenuItem>
                                                <MenuItem value="fatal">Fatal</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                    <Box minWidth="200px">
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Component</InputLabel>
                                            <Select
                                                value={selectedComponent}
                                                label="Component"
                                                onChange={(e) => setSelectedComponent(e.target.value)}
                                            >
                                                <MenuItem value="all">All Components</MenuItem>
                                                {components.map((component) => (
                                                    <MenuItem key={component.name} value={component.name}>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            {component.icon}
                                                            {component.name}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Box>
                                    <Box minWidth="200px">
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Log Source</InputLabel>
                                            <Select
                                                value={selectedSource}
                                                label="Log Source"
                                                onChange={(e) => setSelectedSource(e.target.value)}
                                            >
                                                <MenuItem value="both">
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <IconAdjustments size={16} />
                                                        All Sources
                                                    </Box>
                                                </MenuItem>
                                                <MenuItem value="memory">
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <IconTerminal size={16} />
                                                        Real-time (Memory)
                                                    </Box>
                                                </MenuItem>
                                                <MenuItem value="file">
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <IconFileText size={16} />
                                                        Log Files
                                                    </Box>
                                                </MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                    <Box flexGrow={1} minWidth="300px">
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Search logs..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            InputProps={{
                                                startAdornment: <IconSearch size={16} style={{ marginRight: 8 }} />,
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Box>

                            {/* Log Statistics */}
                            <Box mb={2} display="flex" gap={2} flexWrap="wrap" alignItems="center">
                                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                                    Log Statistics:
                                </Typography>
                                <Chip size="small" label={`Total: ${logStats.total}`} variant="outlined" />
                                <Chip size="small" label={`Debug: ${logStats.debug}`} color="default" variant="outlined" />
                                <Chip size="small" label={`Info: ${logStats.info}`} color="info" variant="outlined" />
                                <Chip size="small" label={`Warn: ${logStats.warn}`} color="warning" variant="outlined" />
                                <Chip size="small" label={`Error: ${logStats.error}`} color="error" variant="outlined" />
                                <Chip size="small" label={`Fatal: ${logStats.fatal}`} color="error" variant="outlined" />
                                {(selectedLevel !== 'all' || selectedComponent !== 'all' || searchTerm) && (
                                    <Chip 
                                        size="small" 
                                        label={`Filtered: ${filteredLogs.length}`} 
                                        color="secondary" 
                                        variant="filled"
                                    />
                                )}
                            </Box>

                            {/* Real-time Log Display */}
                            <LogContainer ref={logContainerRef}>
                                {filteredLogs.length === 0 ? (
                                    <Box textAlign="center" py={4}>
                                        <Typography variant="body2" color="textSecondary">
                                            No logs found matching the current filters
                                        </Typography>
                                    </Box>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <LogLine key={log.id} level={log.level}>
                                            <Box mr={2} display="flex" alignItems="center" minWidth="120px">
                                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </Typography>
                                            </Box>
                                            <Box mr={2} display="flex" alignItems="center" minWidth="80px">
                                                <Chip
                                                    size="small"
                                                    label={log.level.toUpperCase()}
                                                    color={getLevelColor(log.level) as any}
                                                    icon={getLevelIcon(log.level)}
                                                    sx={{ fontSize: '10px', height: '20px' }}
                                                />
                                            </Box>
                                            <Box mr={2} minWidth="120px">
                                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                                    {log.component}
                                                </Typography>
                                            </Box>
                                            <Box mr={2} minWidth="60px">
                                                <Chip
                                                    size="small"
                                                    label={(log as any).source === 'file' ? 'FILE' : 'LIVE'}
                                                    color={(log as any).source === 'file' ? 'secondary' : 'success'}
                                                    sx={{ fontSize: '9px', height: '18px', minWidth: '50px' }}
                                                />
                                            </Box>
                                            <Box flexGrow={1}>
                                                <Typography variant="caption">{log.message}</Typography>
                                                {log.details && (
                                                    <Box mt={0.5}>
                                                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                            {JSON.stringify(log.details)}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </LogLine>
                                    ))
                                )}
                            </LogContainer>

                            {/* Pagination for table view */}
                            <Box mt={2}>
                                <TablePagination
                                    component="div"
                                    count={filteredLogs.length}
                                    page={page}
                                    onPageChange={(_e, newPage) => setPage(newPage)}
                                    rowsPerPage={rowsPerPage}
                                    onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                                    rowsPerPageOptions={[10, 25, 50, 100]}
                                />
                            </Box>

                            {/* Log Level Statistics */}
                            <Box mt={3}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Log Level Statistics
                                </Typography>
                                <Box display="flex" gap={2}>
                                    <Chip label={`Total: ${logStats.total}`} color="default" />
                                    <Chip label={`Debug: ${logStats.debug}`} color="info" />
                                    <Chip label={`Info: ${logStats.info}`} color="primary" />
                                    <Chip label={`Warning: ${logStats.warn}`} color="warning" />
                                    <Chip label={`Error: ${logStats.error}`} color="error" />
                                    <Chip label={`Fatal: ${logStats.fatal}`} color="error" variant="outlined" />
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Component Logs Tab */}
                    {activeTab === 1 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Component Log Sources
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mb={3}>
                                View logs from different components and sources. Each component may have both real-time logs and historical log files.
                            </Typography>

                            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(350px, 1fr))" gap={2} mb={3}>
                                {components.map((component) => {
                                    const componentLogs = filteredLogs.filter(log => log.component === component.name);
                                    const fileLogs = componentLogs.filter(log => (log as any).source === 'file');
                                    const liveLogs = componentLogs.filter(log => (log as any).source !== 'file');
                                    
                                    return (
                                        <Card key={component.name} variant="outlined" sx={{ 
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                        onClick={() => setSelectedComponent(component.name)}>
                                            <CardContent>
                                                <Box display="flex" alignItems="center" gap={2} mb={2}>
                                                    {component.icon}
                                                    <Box flexGrow={1}>
                                                        <Typography variant="h6">{component.name}</Typography>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {component.description}
                                                        </Typography>
                                                    </Box>
                                                    <Badge badgeContent={componentLogs.length} color="primary" max={999} />
                                                </Box>
                                                
                                                <Box display="flex" gap={1} mb={1}>
                                                    <Chip 
                                                        size="small" 
                                                        label={`${liveLogs.length} Live`}
                                                        color="success"
                                                        variant="outlined"
                                                    />
                                                    <Chip 
                                                        size="small" 
                                                        label={`${fileLogs.length} File`}
                                                        color="secondary"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                                
                                                {componentLogs.length > 0 && (
                                                    <Typography variant="caption" color="textSecondary">
                                                        Last activity: {new Date(componentLogs[0].timestamp).toLocaleString()}
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Box>

                            {selectedComponent !== 'all' && (
                                <Card variant="outlined">
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={2} mb={3}>
                                            <Typography variant="h6">
                                                {selectedComponent} Logs
                                            </Typography>
                                            <Button 
                                                size="small" 
                                                onClick={() => setSelectedComponent('all')}
                                                variant="outlined"
                                            >
                                                Back to All
                                            </Button>
                                        </Box>
                                        
                                        <LogContainer>
                                            {filteredLogs
                                                .filter(log => log.component === selectedComponent)
                                                .map((log) => (
                                                    <LogLine key={log.id} level={log.level}>
                                                        <Box mr={2} display="flex" alignItems="center" minWidth="120px">
                                                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                                {new Date(log.timestamp).toLocaleTimeString()}
                                                            </Typography>
                                                        </Box>
                                                        <Box mr={2} display="flex" alignItems="center" minWidth="80px">
                                                            <Chip
                                                                size="small"
                                                                label={log.level.toUpperCase()}
                                                                color={getLevelColor(log.level) as any}
                                                                icon={getLevelIcon(log.level)}
                                                                sx={{ fontSize: '10px', height: '20px' }}
                                                            />
                                                        </Box>
                                                        <Box mr={2} minWidth="60px">
                                                            <Chip
                                                                size="small"
                                                                label={(log as any).source === 'file' ? 'FILE' : 'LIVE'}
                                                                color={(log as any).source === 'file' ? 'secondary' : 'success'}
                                                                sx={{ fontSize: '9px', height: '18px', minWidth: '50px' }}
                                                            />
                                                        </Box>
                                                        <Box flexGrow={1}>
                                                            <Typography variant="caption">{log.message}</Typography>
                                                            {log.details && (
                                                                <Box mt={0.5}>
                                                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                                        {JSON.stringify(log.details)}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </LogLine>
                                                ))}
                                        </LogContainer>
                                    </CardContent>
                                </Card>
                            )}
                        </Box>
                    )}

                    {/* Log Levels Tab */}
                    {activeTab === 2 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Configure Log Levels
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mb={3}>
                                Set the minimum log level for each component. Logs below the selected level will not be captured.
                            </Typography>

                            {components.map((component) => {
                                const logLevel = logLevels.find(l => l.component === component.name);
                                return (
                                    <Accordion key={component.name}>
                                        <AccordionSummary expandIcon={<IconChevronDown />}>
                                            <Box display="flex" alignItems="center" gap={2} width="100%">
                                                {component.icon}
                                                <Box flexGrow={1}>
                                                    <Typography variant="h6">{component.name}</Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {component.description}
                                                    </Typography>
                                                </Box>
                                                <Box display="flex" alignItems="center" gap={2}>
                                                    <Chip
                                                        label={logLevel?.level?.toUpperCase() || 'INFO'}
                                                        color={getLevelColor(logLevel?.level || 'info') as any}
                                                        size="small"
                                                    />
                                                    <Switch
                                                        checked={logLevel?.enabled || false}
                                                        onChange={() => toggleComponent(component.name)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Box display="flex" flexDirection="column" gap={2}>
                                                <FormControl fullWidth>
                                                    <InputLabel>Log Level</InputLabel>
                                                    <Select
                                                        value={logLevel?.level || 'info'}
                                                        label="Log Level"
                                                        onChange={(e) => updateLogLevel(component.name, e.target.value)}
                                                    >
                                                        <MenuItem value="debug">
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <IconBug size={16} />
                                                                Debug - All messages
                                                            </Box>
                                                        </MenuItem>
                                                        <MenuItem value="info">
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <IconInfoCircle size={16} />
                                                                Info - General information
                                                            </Box>
                                                        </MenuItem>
                                                        <MenuItem value="warn">
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <IconAlertTriangle size={16} />
                                                                Warning - Potential issues
                                                            </Box>
                                                        </MenuItem>
                                                        <MenuItem value="error">
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <IconX size={16} />
                                                                Error - Error messages only
                                                            </Box>
                                                        </MenuItem>
                                                        <MenuItem value="fatal">
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <IconX size={16} />
                                                                Fatal - Critical errors only
                                                            </Box>
                                                        </MenuItem>
                                                    </Select>
                                                </FormControl>

                                                <Alert severity="info" sx={{ mt: 1 }}>
                                                    Current setting: Only <strong>{logLevel?.level || 'info'}</strong> level
                                                    and above will be logged for {component.name}.
                                                </Alert>
                                            </Box>
                                        </AccordionDetails>
                                    </Accordion>
                                );
                            })}
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
            />
        </PageContainer>
    );
};

export default Logs;
