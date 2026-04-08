import React from 'react';
import {
    Box,
    Typography,
    Chip,
    Switch,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    IconChevronDown,
    IconBug,
    IconInfoCircle,
    IconAlertTriangle,
    IconX,
} from '@tabler/icons-react';
import type { LogLevel, ComponentInfo } from '../types';

interface LogLevelsTabProps {
    components: ComponentInfo[];
    logLevels: LogLevel[];
    toggleComponent: (component: string) => void;
    updateLogLevel: (component: string, level: string) => void;
    getLevelColor: (level: string) => string;
}

const LogLevelsTab: React.FC<LogLevelsTabProps> = ({
    components,
    logLevels,
    toggleComponent,
    updateLogLevel,
    getLevelColor,
}) => {
    return (
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
    );
};

export default LogLevelsTab;
