import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Badge,
} from '@mui/material';
import type { LogEntry, ComponentInfo } from '../types';

interface ComponentLogsTabProps {
    filteredLogs: LogEntry[];
    components: ComponentInfo[];
    selectedComponent: string;
    setSelectedComponent: (component: string) => void;
    getLevelIcon: (level: string) => React.ReactNode;
    getLevelColor: (level: string) => string;
    LogContainer: React.ComponentType<any>;
    LogLine: React.ComponentType<any>;
}

const ComponentLogsTab: React.FC<ComponentLogsTabProps> = ({
    filteredLogs,
    components,
    selectedComponent,
    setSelectedComponent,
    getLevelIcon,
    getLevelColor,
    LogContainer,
    LogLine,
}) => {
    return (
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
    );
};

export default ComponentLogsTab;
