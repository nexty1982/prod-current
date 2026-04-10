import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
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
import { adminAPI } from '@/api/admin.api';
import SiteLogsTab from './tabs/SiteLogsTab';
import ComponentLogsTab from './tabs/ComponentLogsTab';
import LogLevelsTab from './tabs/LogLevelsTab';
import type { LogEntry, LogLevel, ComponentInfo, LogStats } from './types';

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
            const data = await apiClient.get<any>('/logs/components');
            const levels: LogLevel[] = data.components.map((comp: any) => ({
                component: comp.name,
                level: comp.level,
                enabled: comp.enabled,
            }));
            setLogLevels(levels);
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

            const data = await apiClient.get<any>(`/logs?${params}`);
            setLogs(data.logs);
            
            // Update available components from server
            if (data.components) {
                setAvailableComponents(data.components);
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

            const data = await apiClient.get<any>(`/logs?${params}`);
            if (data.logs.length > 0) {
                setLogs(prev => {
                    const newLogs = data.logs.filter((newLog: LogEntry) =>
                        !prev.some(existingLog => existingLog.id === newLog.id)
                    );
                    return [...prev, ...newLogs].slice(-1000);
                });
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
            await apiClient.put<any>(`/logs/shared/ui/legacy/${component}/level`, { level });
            setLogLevels(prev => prev.map(item =>
                item.component === component ? { ...item, level: level as any } : item
            ));

            setSnackbarMessage(`Log level updated for ${component}`);
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Error updating log level:', error);
            setSnackbarMessage('Failed to update log level');
            setSnackbarOpen(true);
        }
    };

    const toggleComponent = async (component: string) => {
        try {
            await apiClient.put<any>(`/logs/shared/ui/legacy/${component}/toggle`);
            setLogLevels(prev => prev.map(item =>
                item.component === component ? { ...item, enabled: !item.enabled } : item
            ));

            const currentState = logLevels.find(l => l.component === component);
            setSnackbarMessage(`Logging ${currentState?.enabled ? 'disabled' : 'enabled'} for ${component}`);
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Error toggling component:', error);
            setSnackbarMessage('Failed to toggle component logging');
            setSnackbarOpen(true);
        }
    };

    const clearLogs = async () => {
        try {
            await apiClient.delete<any>('/logs');
            setLogs([]);
            setSnackbarMessage('Logs cleared');
            setSnackbarOpen(true);
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
            await apiClient.post<any>('/logs/test', { count: 10, component: 'API Server' });
            setSnackbarMessage('Test logs generated successfully');
            setSnackbarOpen(true);
            // Refresh logs to see the new entries
            loadInitialLogs();
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
                        <SiteLogsTab
                            filteredLogs={filteredLogs}
                            selectedLevel={selectedLevel}
                            setSelectedLevel={setSelectedLevel}
                            selectedComponent={selectedComponent}
                            setSelectedComponent={setSelectedComponent}
                            selectedSource={selectedSource}
                            setSelectedSource={setSelectedSource}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            components={components}
                            logStats={logStats}
                            page={page}
                            setPage={setPage}
                            rowsPerPage={rowsPerPage}
                            setRowsPerPage={setRowsPerPage}
                            logContainerRef={logContainerRef}
                            getLevelIcon={getLevelIcon}
                            getLevelColor={getLevelColor}
                            LogContainer={LogContainer}
                            LogLine={LogLine}
                        />
                    )}

                    {/* Component Logs Tab */}
                    {activeTab === 1 && (
                        <ComponentLogsTab
                            filteredLogs={filteredLogs}
                            components={components}
                            selectedComponent={selectedComponent}
                            setSelectedComponent={setSelectedComponent}
                            getLevelIcon={getLevelIcon}
                            getLevelColor={getLevelColor}
                            LogContainer={LogContainer}
                            LogLine={LogLine}
                        />
                    )}

                    {/* Log Levels Tab */}
                    {activeTab === 2 && (
                        <LogLevelsTab
                            components={components}
                            logLevels={logLevels}
                            toggleComponent={toggleComponent}
                            updateLogLevel={updateLogLevel}
                            getLevelColor={getLevelColor}
                        />
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
