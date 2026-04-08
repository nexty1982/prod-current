import React from 'react';
import {
    Box,
    Typography,
    Chip,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TablePagination,
} from '@mui/material';
import {
    IconSearch,
    IconTerminal,
    IconAdjustments,
    IconFileText,
} from '@tabler/icons-react';
import type { LogEntry, ComponentInfo, LogStats } from '../types';

// Styled components are passed as props from parent to avoid duplication
interface SiteLogsTabProps {
    filteredLogs: LogEntry[];
    selectedLevel: string;
    setSelectedLevel: (level: string) => void;
    selectedComponent: string;
    setSelectedComponent: (component: string) => void;
    selectedSource: string;
    setSelectedSource: (source: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    components: ComponentInfo[];
    logStats: LogStats;
    page: number;
    setPage: (page: number) => void;
    rowsPerPage: number;
    setRowsPerPage: (rows: number) => void;
    logContainerRef: React.RefObject<HTMLDivElement>;
    getLevelIcon: (level: string) => React.ReactNode;
    getLevelColor: (level: string) => string;
    LogContainer: React.ComponentType<any>;
    LogLine: React.ComponentType<any>;
}

const SiteLogsTab: React.FC<SiteLogsTabProps> = ({
    filteredLogs,
    selectedLevel,
    setSelectedLevel,
    selectedComponent,
    setSelectedComponent,
    selectedSource,
    setSelectedSource,
    searchTerm,
    setSearchTerm,
    components,
    logStats,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    logContainerRef,
    getLevelIcon,
    getLevelColor,
    LogContainer,
    LogLine,
}) => {
    return (
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
    );
};

export default SiteLogsTab;
