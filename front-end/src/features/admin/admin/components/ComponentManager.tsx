import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Grid2 from '@/components/compat/Grid2';
import formatTimestamp, { formatRelativeTime } from '@/utils/formatTimestamp';
import { Box, Typography, Card, CardContent, Chip, Switch, FormControlLabel, Alert, IconButton, Tooltip, Stack, Avatar, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, LinearProgress, Snackbar, Divider, DialogContentText, Pagination, TextField, InputAdornment, Tab, Tabs, Badge, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import {
    IconSettings,
    IconEye,
    IconTestPipe,
    IconToggleLeft,
    IconToggleRight,
    IconCircleCheck,
    IconAlertTriangle,
    IconCircleX,
    IconActivity,
    IconRefresh,
    IconReload,
    IconShield,
    IconBug,
    IconChevronDown,
    IconSearch,
    IconFilter,
    IconClock,
    IconUsers,
    IconTarget,
    IconCpu,
    IconDownload,
    IconFileText
} from '@tabler/icons-react';
import {
    componentsAPI, 
    type Component, 
    type ComponentLog, 
    type ComponentsResponse,
    type ComponentFilters 
} from '@/api/components.api';
import { useAuth } from '@/context/AuthContext';

// Health detection utility
type HealthStatus = 'healthy' | 'degraded' | 'failed';

interface HealthDetectionRule {
    pattern: string | RegExp;
    level: ComponentLog['level'][];
    severity: HealthStatus;
    description: string;
}

const HEALTH_DETECTION_RULES: HealthDetectionRule[] = [
    {
        pattern: /Error: Service temporarily unavailable/i,
        level: ['error'],
        severity: 'degraded',
        description: 'Service availability issues detected'
    },
    {
        pattern: /Warning: Performance degraded/i,
        level: ['warn', 'error'],
        severity: 'degraded',
        description: 'Performance degradation detected'
    },
    {
        pattern: /Connection timeout|Database connection failed|Service crashed|Critical error/i,
        level: ['error'],
        severity: 'failed',
        description: 'Critical system failures detected'
    },
    {
        pattern: /Memory leak|Out of memory|Disk space|Storage full/i,
        level: ['error', 'warn'],
        severity: 'degraded',
        description: 'Resource constraints detected'
    }
];

/**
 * Analyzes component logs to determine health status based on recent errors/warnings
 * @param logs Array of ComponentLog entries
 * @param hoursBack Number of hours to look back (default: 24)
 * @returns HealthStatus based on log analysis
 */
const getComponentHealthStatus = (logs: ComponentLog[], hoursBack: number = 24): HealthStatus => {
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
        return 'healthy'; // No logs available, assume healthy
    }

    const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
    
    // Filter recent logs
    const recentLogs = logs.filter(log => {
        const logTime = new Date(log.timestamp);
        return logTime >= cutoffTime;
    });

    // If no recent logs, check last N logs (fallback)
    const logsToAnalyze = recentLogs.length > 0 ? recentLogs : logs.slice(-20);
    
    let worstStatus: HealthStatus = 'healthy';
    const detectedIssues: string[] = [];

    // Analyze logs against detection rules
    for (const log of logsToAnalyze) {
        for (const rule of HEALTH_DETECTION_RULES) {
            // Check if log level matches rule
            if (!rule.level.includes(log.level)) continue;
            
            // Check if message matches pattern
            const matches = typeof rule.pattern === 'string' 
                ? log.message.includes(rule.pattern)
                : rule.pattern.test(log.message);
                
            if (matches) {
                detectedIssues.push(`${rule.description} (${log.timestamp})`);
                
                // Update worst status (failed > degraded > healthy)
                if (rule.severity === 'failed' || 
                    (rule.severity === 'degraded' && worstStatus === 'healthy')) {
                    worstStatus = rule.severity;
                }
            }
        }
    }

    // Additional logic: if we have many error logs, escalate to failed
    const errorCount = logsToAnalyze.filter(log => log.level === 'error').length;
    if (errorCount >= 10 && worstStatus === 'degraded') {
        worstStatus = 'failed';
        detectedIssues.push(`High error frequency detected (${errorCount} errors)`);
    }

    // Log detection results for debugging
    if (worstStatus !== 'healthy') {
        console.log(`Health detection for component: ${worstStatus}`, {
            analyzedLogs: logsToAnalyze.length,
            recentLogs: recentLogs.length,
            detectedIssues,
            worstStatus
        });
    }

    return worstStatus;
};

/**
 * Analyzes component logs and returns health issues found
 * @param logs Array of ComponentLog entries
 * @param hoursBack Number of hours to look back
 * @returns Array of health issue descriptions
 */
const getHealthIssues = (logs: ComponentLog[], hoursBack: number = 24): string[] => {
    if (!logs || !Array.isArray(logs) || logs.length === 0) return [];

    const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
    const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffTime);
    const logsToAnalyze = recentLogs.length > 0 ? recentLogs : logs.slice(-20);
    
    const issues: string[] = [];

    for (const log of logsToAnalyze) {
        for (const rule of HEALTH_DETECTION_RULES) {
            if (!rule.level.includes(log.level)) continue;
            
            const matches = typeof rule.pattern === 'string' 
                ? log.message.includes(rule.pattern)
                : rule.pattern.test(log.message);
                
            if (matches) {
                const timeAgo = new Date(Date.now() - new Date(log.timestamp).getTime());
                const hoursAgo = Math.floor(timeAgo.getTime() / (1000 * 60 * 60));
                issues.push(`${rule.description} (${hoursAgo}h ago)`);
            }
        }
    }

    return [...new Set(issues)]; // Remove duplicates
};

/**
 * Component Manager - Production Frontend with Live Backend Integration
 * 
 * PRODUCTION STATUS: Fully integrated with live backend API
 * 
 * Features implemented:
 * ✅ Component listing with health status indicators
 * ✅ Toggle enable/disable with confirmation dialogs
 * ✅ Logs viewing with enhanced modal interface
 * ✅ Component testing with detailed results display
 * ✅ Role-based access control (admin/super_admin only)
 * ✅ Toast notifications for all actions
 * ✅ Responsive design with comprehensive tooltips
 * ✅ Advanced filtering and search capabilities
 * ✅ Usage tracking and analytics
 * ✅ Category-based organization
 * ✅ Pagination for large datasets
 * ✅ Live backend API integration
 * ✅ Comprehensive error handling
 * 
 * Backend API Integration:
 * - GET /api/admin/components (list all components with filters/pagination)
 * - PATCH /api/admin/components/:id (toggle component status)
 * - GET /api/admin/components/:id/logs (fetch component logs)
 * - POST /api/admin/components/:id/test (run component diagnostics)
 * 
 * All data is loaded from live backend API with proper error handling.
 */
const ComponentManager: React.FC = () => {
    const { isSuperAdmin, hasRole } = useAuth();
    
    // State management
    const [componentsData, setComponentsData] = useState<ComponentsResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filter and pagination state
    const [filters, setFilters] = useState<ComponentFilters>({
        page: 1,
        limit: 20,
        category: 'all',
        status: 'all',
        usageStatus: 'all',
        search: '',
        enabled: 'all'
    });
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [categoryTab, setCategoryTab] = useState<string>('all');
    const [logsDialogOpen, setLogsDialogOpen] = useState<boolean>(false);
    const [selectedComponentLogs, setSelectedComponentLogs] = useState<ComponentLog[]>([]);
    const [selectedComponentName, setSelectedComponentName] = useState<string>('');
    const [toggleConfirmDialog, setToggleConfirmDialog] = useState<{
        open: boolean;
        component: Component | null;
        newState: boolean;
    }>({ open: false, component: null, newState: false });
    const [actionLoading, setActionLoading] = useState<{ [componentId: string]: boolean }>({});
    
    // Toast state
    const [toastOpen, setToastOpen] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
    
    // Test results dialog
    const [testResultDialog, setTestResultDialog] = useState<{
        open: boolean;
        component: Component | null;
        result: any;
    }>({ open: false, component: null, result: null });

    // Toast helper functions
    const showToast = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setToastMessage(message);
        setToastSeverity(severity);
        setToastOpen(true);
    };

    // Check if user has admin permissions
    const canManageComponents = isSuperAdmin || hasRole('admin');

    // Log component mounting for testing tab switching
    useEffect(() => {
        console.log('ComponentManager mounted');
        fetchComponents();
    }, []);

    // Analyze component health based on recent logs
    const analyzeComponentHealth = async (data: ComponentsResponse): Promise<ComponentsResponse> => {
        try {
            console.log('Starting health analysis for components...');
            
            // Validate data structure
            if (!data || !data.components || !Array.isArray(data.components)) {
                console.warn('Invalid components data structure, skipping health analysis:', data);
                return data;
            }
            
            // Create promises for log analysis of each component
            const analysisPromises = data.components.map(async (component) => {
                try {
                    // Fetch recent logs for this component
                    const logsResponse = await componentsAPI.getLogs(component.id);
                    const logs = logsResponse.logs || [];
                    
                    // Analyze health based on logs
                    const analyzedHealth = getComponentHealthStatus(logs);
                    const healthIssues = getHealthIssues(logs);
                    
                    // Update component with analyzed health
                    const updatedComponent: Component = {
                        ...component,
                        health: analyzedHealth,
                        healthIssues: healthIssues.length > 0 ? healthIssues : component.healthIssues,
                        lastHealthCheck: new Date().toISOString()
                    };
                    
                    // Log health changes for debugging
                    if (analyzedHealth !== component.health) {
                        console.log(`Health updated for ${component.name}: ${component.health} → ${analyzedHealth}`, {
                            issues: healthIssues,
                            analyzedLogs: logs.length
                        });
                    }
                    
                    return updatedComponent;
                } catch (logError) {
                    // If log analysis fails, keep original component health
                    console.warn(`Failed to analyze health for ${component.name}:`, logError);
                    return {
                        ...component,
                        lastHealthCheck: new Date().toISOString()
                    };
                }
            });
            
            // Wait for all analyses to complete
            const analyzedComponents = await Promise.all(analysisPromises);
            
            // Recalculate meta information based on new health statuses
            const updatedMeta = {
                ...data.meta,
                // Update category breakdown to reflect new health statuses
                categoryBreakdown: calculateCategoryBreakdown(analyzedComponents),
                usageStats: {
                    ...data.meta.usageStats,
                    // Add health-related stats
                    healthyComponents: analyzedComponents.filter(c => c.health === 'healthy').length,
                    degradedComponents: analyzedComponents.filter(c => c.health === 'degraded').length,
                    failedComponents: analyzedComponents.filter(c => c.health === 'failed').length
                }
            };
            
            const healthChanges = analyzedComponents.filter(c => {
                const original = data.components.find(orig => orig.id === c.id);
                return original && original.health !== c.health;
            });
            
            console.log(`Health analysis completed. Updated ${analyzedComponents.length} components.`, {
                totalAnalyzed: analyzedComponents.length,
                healthChanges: healthChanges.length,
                changedComponents: healthChanges.map(c => ({
                    name: c.name,
                    oldHealth: data.components.find(orig => orig.id === c.id)?.health,
                    newHealth: c.health,
                    issues: c.healthIssues?.length || 0
                }))
            });
            
            return {
                components: analyzedComponents,
                meta: updatedMeta
            };
            
        } catch (error) {
            console.error('Health analysis failed, using original data:', error);
            // Return original data if analysis fails
            return data;
        }
    };

    // Helper function to calculate category breakdown with health info
    const calculateCategoryBreakdown = (components: Component[]) => {
        const breakdown: Record<string, any> = {};
        
        // Validate components is an array
        if (!Array.isArray(components)) {
            console.warn('calculateCategoryBreakdown: components is not an array:', components);
            return breakdown;
        }
        
        components.forEach(component => {
            const category = component.category || 'Uncategorized';
            if (!breakdown[category]) {
                breakdown[category] = {
                    total: 0,
                    healthy: 0,
                    degraded: 0,
                    failed: 0,
                    enabled: 0,
                    disabled: 0,
                    active: 0,
                    inactive: 0,
                    unused: 0
                };
            }
            
            breakdown[category].total++;
            breakdown[category][component.health]++;
            breakdown[category][component.enabled ? 'enabled' : 'disabled']++;
            breakdown[category][component.usageStatus]++;
        });
        
        return breakdown;
    };

    // Fetch components with filters and pagination
    const fetchComponents = async (newFilters?: Partial<ComponentFilters>) => {
        try {
            setLoading(true);
            setError(null);
            
            // Merge filters if provided
            const currentFilters = newFilters ? { ...filters, ...newFilters } : filters;
            setFilters(currentFilters);
            
            const data = await componentsAPI.getAll(currentFilters);
            console.log('Components fetched:', data);
            
            // Analyze component health based on logs
            const componentsWithHealthAnalysis = await analyzeComponentHealth(data);
            setComponentsData(componentsWithHealthAnalysis);
            
            // Count components with analyzed health
            const analyzedComponents = componentsWithHealthAnalysis.components.filter(c => 
                c.lastHealthCheck && new Date(c.lastHealthCheck).getTime() > Date.now() - 60000 // within last minute
            ).length;
            
            const baseMessage = `Loaded ${data.components.length} components (page ${data.meta.page} of ${data.meta.totalPages})`;
            const healthMessage = analyzedComponents > 0 ? ` • Health analyzed for ${analyzedComponents} components` : '';
            
            showToast(`${baseMessage}${healthMessage}`, 'success');
        } catch (err: any) {
            console.error('Error fetching components:', err);
            
            // Handle different types of errors
            let errorMessage = 'Unable to load component data from backend.';
            
            if (err.response) {
                // Server responded with error status
                if (err.response.status === 401 || err.response.status === 403) {
                    errorMessage = 'You do not have permission to access component data. Please contact your administrator.';
                } else if (err.response.status === 404) {
                    errorMessage = 'Component management API endpoint not found. Please contact support.';
                } else if (err.response.status >= 500) {
                    errorMessage = 'Server error occurred while loading components. Please try again later or contact support.';
                } else {
                    errorMessage = err.response.data?.message || `API Error (${err.response.status}): Unable to load components.`;
                }
            } else if (err.request) {
                // Network error
                errorMessage = 'Network error: Unable to connect to the component management API. Please check your connection.';
            } else {
                // Other error
                errorMessage = err.message || 'Unknown error occurred while loading components.';
            }
            
            setError(errorMessage);
            setComponentsData(null);
            
            showToast(
                'Failed to load components from backend API. Please check the API status or contact support.',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    // Handle component toggle (disabled until Phase 3 but structured)
    const handleStatusToggle = (component: Component) => {
        const newState = !component.enabled;
        setToggleConfirmDialog({
            open: true,
            component,
            newState
        });
    };

    // Confirm toggle action
    const handleConfirmToggle = async () => {
        const { component, newState } = toggleConfirmDialog;
        if (!component) return;

        try {
            setActionLoading(prev => ({ ...prev, [component.id]: true }));
            await componentsAPI.toggle(component.id, newState);
            
            // Update local state
            setComponentsData(prev => prev ? {
                ...prev,
                components: prev.components.map(c => 
                    c.id === component.id ? { ...c, enabled: newState, lastUpdated: new Date().toISOString() } : c
                )
            } : null);
            
            showToast(
                `Component "${component.name}" has been ${newState ? 'enabled' : 'disabled'}.`,
                'success'
            );
            console.log(`Component ${component.name} toggled to ${newState ? 'enabled' : 'disabled'}`);
        } catch (err: any) {
            console.error('Error toggling component:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to toggle component';
            setError(errorMessage);
            showToast(
                `Failed to ${newState ? 'enable' : 'disable'} "${component.name}": ${errorMessage}`,
                'error'
            );
        } finally {
            setActionLoading(prev => ({ ...prev, [component.id]: false }));
            setToggleConfirmDialog({ open: false, component: null, newState: false });
        }
    };

    // Handle view logs
    const handleViewLogs = async (component: Component) => {
        try {
            setActionLoading(prev => ({ ...prev, [component.id]: true }));
            const logsResponse = await componentsAPI.getLogs(component.id, 100);
            setSelectedComponentLogs(logsResponse.logs);
            setSelectedComponentName(component.name);
            setLogsDialogOpen(true);
            showToast(`Loaded ${logsResponse.logs.length} log entries for "${component.name}"`, 'info');
            console.log(`Logs for ${component.name}:`, logsResponse.logs);
        } catch (err: any) {
            console.error('Error fetching logs:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch logs';
            
            // Handle logs fetch error
            showToast(
                `Failed to load logs for "${component.name}": ${errorMessage}`,
                'error'
            );
        } finally {
            setActionLoading(prev => ({ ...prev, [component.id]: false }));
        }
    };

    // Handle run test
    const handleRunTest = async (component: Component) => {
        try {
            setActionLoading(prev => ({ ...prev, [component.id]: true }));
            const testResult = await componentsAPI.runTest(component.id);
            
            // Update component health based on test result if provided
            if (testResult?.health) {
                setComponentsData(prev => prev ? {
                    ...prev,
                    components: prev.components.map(c => 
                        c.id === component.id ? { ...c, health: testResult.health, lastUpdated: new Date().toISOString() } : c
                    )
                } : null);
            }
            
            setTestResultDialog({
                open: true,
                component,
                result: testResult
            });
            
            const status = testResult?.status || 'unknown';
            const severity = status === 'pass' ? 'success' : status === 'fail' ? 'error' : 'warning';
            showToast(`Test ${status} for "${component.name}"`, severity);
            
            console.log(`Test completed for component: ${component.name}`, testResult);
        } catch (err: any) {
            console.error('Error running test:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Test failed to execute';
            
            // Handle test execution error
            showToast(
                `Failed to run test for "${component.name}": ${errorMessage}`,
                'error'
            );
        } finally {
            setActionLoading(prev => ({ ...prev, [component.id]: false }));
        }
    };

    // Handle export of degraded component logs
    // Creates a plain text report with format:
    // Component: [Name]
    // Health Status: DEGRADED
    // Category: [Category]
    // Last Updated: [Date]
    // Issues: [Health Issues]
    // ------------------------------
    // [LEVEL] [Timestamp] - [Message]
    // ****************************
    const handleExportDegradedLogs = async () => {
        try {
            setLoading(true);
            
            // Filter degraded components
            const degradedComponents = (Array.isArray(componentsData?.components) ? componentsData.components : []).filter(
                component => component.health === 'degraded'
            );
            
            if (degradedComponents.length === 0) {
                showToast('No degraded components found to export', 'info');
                return;
            }
            
            showToast(`Gathering logs for ${degradedComponents.length} degraded components...`, 'info');
            
            let exportContent = `DEGRADED COMPONENTS LOG REPORT\n`;
            exportContent += `Generated: ${new Date().toLocaleString()}\n`;
            exportContent += `Total degraded components: ${degradedComponents.length}\n\n`;
            exportContent += `${'='.repeat(60)}\n\n`;
            
            // Fetch logs for each degraded component
            const logPromises = degradedComponents.map(async (component) => {
                try {
                    const logsResponse = await componentsAPI.getLogs(component.id);
                    return {
                        component,
                        logs: logsResponse.logs || [],
                        success: true
                    };
                } catch (err) {
                    console.error(`Failed to fetch logs for ${component.name}:`, err);
                    return {
                        component,
                        logs: [],
                        success: false,
                        error: err
                    };
                }
            });
            
            const logResults = await Promise.all(logPromises);
            
            // Format the export content
            logResults.forEach((result, index) => {
                const { component, logs, success, error } = result;
                
                exportContent += `Component: ${component.name}\n`;
                exportContent += `Health Status: ${component.health.toUpperCase()}\n`;
                exportContent += `Category: ${component.category || 'Uncategorized'}\n`;
                exportContent += `Last Updated: ${component.lastUpdated ? new Date(component.lastUpdated).toLocaleString() : 'Unknown'}\n`;
                
                if (component.healthIssues && component.healthIssues.length > 0) {
                    exportContent += `Issues: ${component.healthIssues.join(', ')}\n`;
                }
                
                exportContent += `${'-'.repeat(30)}\n`;
                
                if (!success) {
                    exportContent += `[ERROR] Failed to retrieve logs: ${error?.response?.data?.message || error?.message || 'Unknown error'}\n`;
                } else if (logs.length === 0) {
                    exportContent += `[INFO] No logs available for this component\n`;
                } else {
                    // Sort logs by timestamp (newest first)
                    const sortedLogs = logs.sort((a, b) => 
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                    
                    // Take only the most recent 20 logs
                    const recentLogs = sortedLogs.slice(0, 20);
                    
                    recentLogs.forEach(log => {
                        const timestamp = new Date(log.timestamp).toLocaleString();
                        const level = log.level.toUpperCase();
                        exportContent += `[${level}] ${timestamp} - ${log.message}\n`;
                    });
                    
                    if (sortedLogs.length > 20) {
                        exportContent += `... and ${sortedLogs.length - 20} more log entries\n`;
                    }
                }
                
                exportContent += `\n${'*'.repeat(28)}\n\n`;
            });
            
            // Add summary at the end
            exportContent += `EXPORT SUMMARY\n`;
            exportContent += `${'-'.repeat(15)}\n`;
            exportContent += `Total components processed: ${logResults.length}\n`;
            exportContent += `Successful log retrievals: ${logResults.filter(r => r.success).length}\n`;
            exportContent += `Failed log retrievals: ${logResults.filter(r => !r.success).length}\n`;
            exportContent += `Export completed: ${new Date().toLocaleString()}\n`;
            
            // Create and download the file
            const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
            const dateStr = timestamp[0];
            const timeStr = timestamp[1].split('.')[0];
            link.download = `degraded-components-log-report-${dateStr}-${timeStr}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            showToast(
                `Successfully exported logs for ${degradedComponents.length} degraded components`,
                'success'
            );
            
        } catch (err: any) {
            console.error('Error exporting degraded component logs:', err);
            showToast(
                `Failed to export logs: ${err.message || 'Unknown error'}`,
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'healthy':
                return { color: 'success', icon: IconCircleCheck, bgColor: '#e8f5e8' };
            case 'degraded':
                return { color: 'warning', icon: IconAlertTriangle, bgColor: '#fff8e1' };
            case 'failed':
                return { color: 'error', icon: IconCircleX, bgColor: '#ffebee' };
            default:
                return { color: 'default', icon: IconActivity, bgColor: '#f5f5f5' };
        }
    };

    const formatLastUpdated = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getLogLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'error';
            case 'warn': return 'warning';
            case 'info': return 'info';
            case 'debug': return 'default';
            default: return 'default';
        }
    };

    // Enhanced tooltip content with health detection info
    const getHealthTooltip = (component: Component) => {
        const { health, healthIssues, lastHealthCheck } = component;
        
        let baseMessage = '';
        switch (health) {
            case 'healthy':
                baseMessage = 'This component is running normally and all checks are passing';
                break;
            case 'degraded':
                baseMessage = 'This component is experiencing issues but is still partially functional';
                break;
            case 'failed':
                baseMessage = 'This component has critical issues and may not be functioning properly';
                break;
            default:
                baseMessage = 'Component health status unknown';
        }
        
        // Add health detection info
        let detectionInfo = '';
        if (health !== 'healthy' && healthIssues && healthIssues.length > 0) {
            detectionInfo = `\n\nDetected Issues:\n• ${healthIssues.join('\n• ')}`;
        }
        
        // Add last health check info
        let healthCheckInfo = '';
        if (lastHealthCheck) {
            const checkTime = new Date(lastHealthCheck);
            const timeAgo = Math.round((Date.now() - checkTime.getTime()) / (1000 * 60)); // minutes ago
            healthCheckInfo = `\n\nLast health check: ${timeAgo < 1 ? 'Just now' : `${timeAgo}m ago`}`;
        }
        
        return `${baseMessage}${detectionInfo}${healthCheckInfo}`;
    };

    // Check if health status was automatically detected based on logs
    const isHealthAutoDetected = (component: Component): boolean => {
        return !!(component.healthIssues && 
                component.healthIssues.length > 0 && 
                component.lastHealthCheck &&
                component.health !== 'healthy');
    };

    // Get component card styling based on enabled/disabled state
    const getComponentCardClass = (component: Component) => {
        if (!component.enabled) {
            return {
                opacity: 0.5,
                filter: 'grayscale(0.7)',
                cursor: 'not-allowed',
                '&:hover': {
                    boxShadow: 1, // Reduced hover effect for disabled
                    transform: 'none' // No transform for disabled
                }
            };
        }
        return {
            '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)'
            }
        };
    };

    const getToggleTooltip = (enabled: boolean, canManage: boolean) => {
        if (!canManage) {
            return 'You need admin permissions to enable or disable components';
        }
        return enabled 
            ? 'Click to disable this component across the system' 
            : 'Click to enable this component across the system';
    };

    // Helper function to format relative time
    const getRelativeTime = (timestamp: string | null): string => {
        if (!timestamp) return 'Never used';
        
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now.getTime() - past.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        
        return past.toLocaleDateString();
    };

    // Helper function to render usage status chip
    const getUsageChip = (usageStatus: string, lastUsed: string | null) => {
        const configs = {
            active: { color: '#4caf50', bgColor: '#e8f5e8', icon: '🟢', label: 'Active' },
            inactive: { color: '#ff9800', bgColor: '#fff3e0', icon: '🟡', label: 'Inactive' },
            unused: { color: '#9e9e9e', bgColor: '#f5f5f5', icon: '⚪', label: 'Unused' }
        };
        
        const config = configs[usageStatus as keyof typeof configs] || configs.unused;
        
        return (
            <Chip
                size="small"
                label={
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                    </Box>
                }
                sx={{
                    backgroundColor: config.bgColor,
                    color: config.color,
                    fontWeight: 500,
                    fontSize: '0.75rem'
                }}
            />
        );
    };

    // Get unique categories from components data
    const getAvailableCategories = (): string[] => {
        if (!componentsData?.components || !Array.isArray(componentsData.components)) return [];
        const categories = new Set(componentsData.components.map(c => c.category));
        return Array.from(categories).sort();
    };

    // Handle filter changes
    const handleCategoryChange = (category: string) => {
        setCategoryTab(category);
        fetchComponents({ category: category === 'all' ? 'all' : category, page: 1 });
    };

    const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
        fetchComponents({ page });
    };

    // Debounced search implementation to prevent focus loss
    const debouncedSearch = useMemo(
        () => {
            let timeoutId: NodeJS.Timeout;
            return (value: string) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    setFilters(prev => ({ ...prev, search: value, page: 1 }));
                    fetchComponents({ search: value, page: 1 });
                }, 500); // Increased delay to 500ms for better UX
            };
        },
        [fetchComponents]
    );

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchTerm(value);
        debouncedSearch(value);
    }, [debouncedSearch]);

    const handleFilterChange = (filterType: keyof ComponentFilters, value: string) => {
        fetchComponents({ [filterType]: value, page: 1 });
    };

    // Calculate filtered summary stats - use API meta data for accurate totals
    const getFilteredSummary = () => {
        const components = Array.isArray(componentsData?.components) ? componentsData.components : [];
        const meta = componentsData?.meta;
        
        // If we have meta data from API with breakdown, use it for accuracy
        if (meta?.categoryBreakdown || meta?.usageStats) {
            return {
                total: meta.total || 0,
                healthy: meta.usageStats?.healthBreakdown?.healthy || components.filter(c => c.health === 'healthy').length,
                degraded: meta.usageStats?.healthBreakdown?.degraded || components.filter(c => c.health === 'degraded').length,
                failed: meta.usageStats?.healthBreakdown?.failed || components.filter(c => c.health === 'failed').length,
                active: meta.usageStats?.usageBreakdown?.active || components.filter(c => c.usageStatus === 'active').length,
                inactive: meta.usageStats?.usageBreakdown?.inactive || components.filter(c => c.usageStatus === 'inactive').length,
                unused: meta.usageStats?.usageBreakdown?.unused || components.filter(c => c.usageStatus === 'unused').length,
                enabled: meta.usageStats?.statusBreakdown?.enabled || components.filter(c => c.enabled).length,
                disabled: meta.usageStats?.statusBreakdown?.disabled || components.filter(c => !c.enabled).length
            };
        }
        
        // Fallback to current page data if meta not available
        const summary = {
            total: meta?.total || components.length,
            healthy: components.filter(c => c.health === 'healthy').length,
            degraded: components.filter(c => c.health === 'degraded').length,
            failed: components.filter(c => c.health === 'failed').length,
            active: components.filter(c => c.usageStatus === 'active').length,
            inactive: components.filter(c => c.usageStatus === 'inactive').length,
            unused: components.filter(c => c.usageStatus === 'unused').length,
            enabled: components.filter(c => c.enabled).length,
            disabled: components.filter(c => !c.enabled).length
        };
        return summary;
    };

    // Loading state
    if (loading) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                <CircularProgress size={40} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Loading system components...
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h6">
                    System Components
                </Typography>
                <Stack direction="row" spacing={1}>
                    {canManageComponents && (
                        <Tooltip 
                            title="Export diagnostic logs for all components with degraded health status" 
                            arrow
                        >
                            <span>
                                <Button
                                    variant="outlined"
                                    startIcon={<IconDownload size={16} />}
                                    onClick={handleExportDegradedLogs}
                                    size="small"
                                    color="warning"
                                    disabled={loading || (Array.isArray(componentsData?.components) ? componentsData.components : []).filter(c => c.health === 'degraded').length === 0}
                                >
                                    Export Degraded Logs 
                                    {componentsData?.components && (
                                        <Chip 
                                            size="small" 
                                            label={(Array.isArray(componentsData?.components) ? componentsData.components : []).filter(c => c.health === 'degraded').length}
                                            sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                                            color="warning"
                                        />
                                    )}
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<IconRefresh size={16} />}
                        onClick={fetchComponents}
                        size="small"
                    >
                        Refresh
                    </Button>
                </Stack>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" onClick={fetchComponents}>
                        Retry
                    </Button>
                }>
                    {error}
                </Alert>
            )}

            {/* Production Status Alert */}
            {!canManageComponents ? (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    You need administrator privileges to manage components. Contact your system administrator for access.
                </Alert>
            ) : (
                <Alert severity="success" sx={{ mb: 3 }}>
                    <strong>System Status:</strong> Component management system is fully operational with live backend integration. 
                    All features are connected to the production API:
                    <br />
                    <code>✅ GET /api/admin/components</code> • 
                    <code>✅ PATCH /api/admin/components/:id</code> • 
                    <code>✅ GET /api/admin/components/:id/logs</code> • 
                    <code>✅ POST /api/admin/components/:id/test</code>
                </Alert>
            )}

            {/* Category Filter Tabs */}
            <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Filter by Category
                </Typography>
                <Tabs
                    value={categoryTab}
                    onChange={(e, value) => handleCategoryChange(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ 
                        '& .MuiTab-root': { 
                            minWidth: 'auto',
                            textTransform: 'none',
                            fontSize: '0.875rem'
                        }
                    }}
                >
                    <Tab 
                        label={
                            <Badge 
                                badgeContent={componentsData?.meta?.total || 0} 
                                color="primary"
                                sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
                            >
                                All Components
                            </Badge>
                        } 
                        value="all" 
                    />
                    {getAvailableCategories().map((category) => {
                        const count = componentsData?.meta?.categoryBreakdown?.[category]?.total || 0;
                        return (
                            <Tab 
                                key={category}
                                label={
                                    <Badge 
                                        badgeContent={count} 
                                        color="secondary"
                                        sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
                                    >
                                        {category}
                                    </Badge>
                                } 
                                value={category} 
                            />
                        );
                    })}
                </Tabs>
            </Paper>

            {/* Search and Filters */}
            <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
                <Grid2 container spacing={2} alignItems="center">
                    {/* Search Field */}
                    <Grid2 item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search components..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <IconSearch size={20} />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid2>

                    {/* Health Status Filter */}
                    <Grid2 item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Health</InputLabel>
                            <Select
                                value={filters.status || 'all'}
                                label="Health"
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <MenuItem value="all">All Health</MenuItem>
                                <MenuItem value="healthy">🟢 Healthy</MenuItem>
                                <MenuItem value="degraded">🟡 Degraded</MenuItem>
                                <MenuItem value="failed">🔴 Failed</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid2>

                    {/* Usage Status Filter */}
                    <Grid2 item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Usage</InputLabel>
                            <Select
                                value={filters.usageStatus || 'all'}
                                label="Usage"
                                onChange={(e) => handleFilterChange('usageStatus', e.target.value)}
                            >
                                <MenuItem value="all">All Usage</MenuItem>
                                <MenuItem value="active">🟢 Active</MenuItem>
                                <MenuItem value="inactive">🟡 Inactive</MenuItem>
                                <MenuItem value="unused">⚪ Unused</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid2>

                    {/* Enable/Disable Filter */}
                    <Grid2 item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filters.enabled || 'all'}
                                label="Status"
                                onChange={(e) => handleFilterChange('enabled', e.target.value)}
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="true">✅ Enabled</MenuItem>
                                <MenuItem value="false">❌ Disabled</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid2>

                    {/* Results Info */}
                    <Grid2 item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                            {componentsData?.meta ? (
                                <>
                                    Showing {((componentsData.meta.page - 1) * componentsData.meta.limit) + 1}–
                                    {Math.min(componentsData.meta.page * componentsData.meta.limit, componentsData.meta.total)} of {componentsData.meta.total}
                                </>
                            ) : (
                                'Loading...'
                            )}
                        </Typography>
                    </Grid2>
                </Grid2>
            </Paper>

            {/* Enhanced Summary Panel */}
            <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    {categoryTab === 'all' ? 'Global Summary' : `${categoryTab} Summary`}
                </Typography>
                
                <Grid2 container spacing={2}>
                    {/* Health Summary */}
                    <Grid2 item xs={12} md={4}>
                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                Component Health
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic', display: 'block' }}>
                                Includes automatic log-based detection
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                                <Chip 
                                    size="small" 
                                    label={`${getFilteredSummary().healthy} Healthy`}
                                    color="success"
                                    variant="outlined"
                                />
                                <Chip 
                                    size="small" 
                                    label={`${getFilteredSummary().degraded} Degraded`}
                                    color="warning"
                                    variant="outlined"
                                />
                                <Chip 
                                    size="small" 
                                    label={`${getFilteredSummary().failed} Failed`}
                                    color="error"
                                    variant="outlined"
                                />
                            </Stack>
                            <Typography variant="h6" color="text.primary">
                                {getFilteredSummary().total} Total Components
                            </Typography>
                        </Box>
                    </Grid2>

                    {/* Usage Summary */}
                    <Grid2 item xs={12} md={4}>
                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                Usage Activity
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                                <Chip 
                                    size="small" 
                                    label={`${getFilteredSummary().active} Active`}
                                    sx={{ backgroundColor: '#e8f5e8', color: '#4caf50' }}
                                />
                                <Chip 
                                    size="small" 
                                    label={`${getFilteredSummary().inactive} Inactive`}
                                    sx={{ backgroundColor: '#fff3e0', color: '#ff9800' }}
                                />
                                <Chip 
                                    size="small" 
                                    label={`${getFilteredSummary().unused} Unused`}
                                    sx={{ backgroundColor: '#f5f5f5', color: '#9e9e9e' }}
                                />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                                Last 24h activity tracking
                            </Typography>
                        </Box>
                    </Grid2>

                    {/* Status Summary */}
                    <Grid2 item xs={12} md={4}>
                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                Component Status
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                                <Chip 
                                    size="small" 
                                    label={`${getFilteredSummary().enabled} Enabled`}
                                    color="success"
                                    variant="outlined"
                                />
                                <Chip 
                                    size="small" 
                                    label={`${getFilteredSummary().disabled} Disabled`}
                                    color="default"
                                    variant="outlined"
                                />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                                System-wide component states
                            </Typography>
                        </Box>
                    </Grid2>
                </Grid2>
            </Paper>

            {/* Components Grid */}
            <Grid2 container spacing={3}>
                {(Array.isArray(componentsData?.components) ? componentsData.components : []).map((component, index) => {
                    const healthConfig = getHealthColor(component.health);
                    const HealthIcon = healthConfig.icon;
                    const isActionLoading = actionLoading[component.id];
                    
                    return (
                        <Grid2 item xs={12} md={6} lg={4} key={component.id || index}>
                            <Card 
                                variant="outlined"
                                sx={{ 
                                    height: '100%',
                                    transition: 'all 0.2s ease-in-out',
                                    ...(isActionLoading ? { opacity: 0.7 } : getComponentCardClass(component))
                                }}
                            >
                                {isActionLoading && (
                                    <LinearProgress />
                                )}
                                <CardContent>
                                    <Stack spacing={2}>
                                        {/* Component Header */}
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Box display="flex" alignItems="center">
                                                <Tooltip title={getHealthTooltip(component)} arrow>
                                                    <Avatar 
                                                        sx={{ 
                                                            bgcolor: healthConfig.bgColor, 
                                                            color: `${healthConfig.color}.main`,
                                                            mr: 2,
                                                            width: 40,
                                                            height: 40,
                                                            cursor: 'help'
                                                        }}
                                                    >
                                                        <HealthIcon size={20} />
                                                    </Avatar>
                                                </Tooltip>
                                                <Typography 
                                                    variant="h6" 
                                                    component="h3"
                                                    sx={{ 
                                                        color: !component.enabled ? 'text.disabled' : 'text.primary'
                                                    }}
                                                >
                                                    {component.name}
                                                </Typography>
                                            </Box>
                                            {!canManageComponents && (
                                                <Tooltip title="Admin access required">
                                                    <IconShield size={16} color="#ff9800" />
                                                </Tooltip>
                                            )}
                                        </Box>

                                        {/* Component Description */}
                                        {component.description && (
                                            <Typography 
                                                variant="body2" 
                                                color="text.secondary" 
                                                sx={{ 
                                                    fontStyle: 'italic',
                                                    opacity: !component.enabled ? 0.6 : 1
                                                }}
                                            >
                                                {component.description}
                                            </Typography>
                                        )}

                                        {/* Usage Information */}
                                        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ py: 1 }}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {getUsageChip(component.usageStatus || 'unused', component.lastUsed)}
                                                <Typography variant="caption" color="text.secondary">
                                                    {component.lastUsedFormatted || getRelativeTime(component.lastUsed)}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Tooltip title={`Total accesses: ${component.totalAccesses || 0}`} arrow>
                                                    <Chip
                                                        size="small"
                                                        icon={<IconUsers size={14} />}
                                                        label={component.uniqueUsers || 0}
                                                        variant="outlined"
                                                        sx={{ fontSize: '0.7rem' }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title={`Category: ${component.category || 'Uncategorized'}`} arrow>
                                                    <Chip
                                                        size="small"
                                                        icon={<IconTarget size={14} />}
                                                        label={component.category || 'Other'}
                                                        variant="outlined"
                                                        color="secondary"
                                                        sx={{ fontSize: '0.7rem' }}
                                                    />
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        {/* Status and Health */}
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Tooltip title={getToggleTooltip(component.enabled, canManageComponents)} arrow>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={component.enabled}
                                                            onChange={() => handleStatusToggle(component)}
                                                            disabled={!canManageComponents || isActionLoading}
                                                            color="primary"
                                                        />
                                                    }
                                                    label={component.enabled ? "Enabled" : "Disabled"}
                                                />
                                            </Tooltip>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <Tooltip title={getHealthTooltip(component)} arrow>
                                                    <Chip
                                                        label={component.health.charAt(0).toUpperCase() + component.health.slice(1)}
                                                        color={healthConfig.color as any}
                                                        variant="filled"
                                                        size="small"
                                                        icon={<HealthIcon size={16} />}
                                                    />
                                                </Tooltip>
                                                {isHealthAutoDetected(component) && (
                                                    <Tooltip title="Health status automatically detected based on log analysis in past 24h" arrow>
                                                        <IconBug size={14} style={{ 
                                                            color: '#ff9800', 
                                                            opacity: 0.7 
                                                        }} />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Last Updated */}
                                        <Typography 
                                            variant="body2" 
                                            color="text.secondary"
                                            sx={{ opacity: !component.enabled ? 0.6 : 1 }}
                                        >
                                            Last Updated: {formatLastUpdated(component.lastUpdated)}
                                        </Typography>

                                        {/* Action Buttons */}
                                        <Box display="flex" justifyContent="flex-end" gap={1}>
                                            <Tooltip title={!component.enabled ? "Component is disabled - enable to view logs" : "View recent log output from this component"} arrow>
                                                <span>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleViewLogs(component)}
                                                        disabled={!component.enabled || isActionLoading}
                                                        color="primary"
                                                        sx={{ opacity: !component.enabled ? 0.5 : 1 }}
                                                    >
                                                        <IconEye size={16} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title={
                                                !component.enabled ? "Component is disabled - enable to run tests" :
                                                canManageComponents ? "Run automated self-test for this component" : 
                                                "Admin access required to run tests"
                                            } arrow>
                                                <span>
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => handleRunTest(component)}
                                                        disabled={!component.enabled || !canManageComponents || isActionLoading}
                                                        color="secondary"
                                                        sx={{ opacity: !component.enabled ? 0.5 : 1 }}
                                                    >
                                                        <IconTestPipe size={16} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title={
                                                !component.enabled ? "Component is disabled - enable to access settings" :
                                                "Component configuration and advanced settings (Coming Soon)"
                                            } arrow>
                                                <span>
                                                    <IconButton 
                                                        size="small" 
                                                        disabled
                                                        sx={{ opacity: !component.enabled ? 0.3 : 0.5 }}
                                                    >
                                                        <IconSettings size={16} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid2>
                    );
                })}
            </Grid2>

            {/* Pagination Controls */}
            {componentsData?.meta && componentsData.meta.totalPages > 1 && (
                <Box display="flex" justifyContent="center" alignItems="center" mt={4} mb={2}>
                    <Stack spacing={2} alignItems="center">
                        <Pagination
                            count={componentsData.meta.totalPages}
                            page={componentsData.meta.page}
                            onChange={handlePageChange}
                            color="primary"
                            size="large"
                            showFirstButton
                            showLastButton
                            siblingCount={1}
                            boundaryCount={1}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Page {componentsData.meta.page} of {componentsData.meta.totalPages} • 
                            Showing {((componentsData.meta.page - 1) * componentsData.meta.limit) + 1}–
                            {Math.min(componentsData.meta.page * componentsData.meta.limit, componentsData.meta.total)} of {componentsData.meta.total} components
                        </Typography>
                    </Stack>
                </Box>
            )}

            {/* No Components Message */}
            {componentsData?.components && componentsData.components.length === 0 && (
                <Box textAlign="center" py={6}>
                    <IconCpu size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No components found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {filters.search || filters.category !== 'all' || filters.status !== 'all' || filters.usageStatus !== 'all' || filters.enabled !== 'all' 
                            ? 'Try adjusting your search criteria or filters'
                            : 'No components are currently registered in the system'
                        }
                    </Typography>
                </Box>
            )}

            {/* Toggle Confirmation Dialog */}
            <Dialog
                open={toggleConfirmDialog.open}
                onClose={() => setToggleConfirmDialog({ open: false, component: null, newState: false })}
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconShield size={20} />
                        Confirm Component Toggle
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to <strong>{toggleConfirmDialog.newState ? 'enable' : 'disable'}</strong> the{' '}
                        <strong>"{toggleConfirmDialog.component?.name}"</strong> component?
                    </DialogContentText>
                    <Alert severity={toggleConfirmDialog.newState ? 'info' : 'warning'} sx={{ mt: 2 }}>
                        {toggleConfirmDialog.newState 
                            ? 'Enabling this component will make it available across the system.'
                            : 'Disabling this component may affect system functionality and user experience.'
                        }
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setToggleConfirmDialog({ open: false, component: null, newState: false })}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirmToggle}
                        variant="contained"
                        color={toggleConfirmDialog.newState ? 'primary' : 'error'}
                        startIcon={toggleConfirmDialog.newState ? <IconCircleCheck size={16} /> : <IconCircleX size={16} />}
                    >
                        {toggleConfirmDialog.newState ? 'Enable Component' : 'Disable Component'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Logs Dialog */}
            <Dialog
                open={logsDialogOpen}
                onClose={() => setLogsDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconEye size={20} />
                        {selectedComponentName} - Component Logs
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedComponentLogs.length === 0 ? (
                        <Box textAlign="center" py={3}>
                            <IconBug size={48} color="#ccc" />
                            <Typography variant="h6" color="text.secondary" mt={1}>
                                No logs available
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                This component hasn't generated any log entries yet.
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Showing {selectedComponentLogs.length} recent log entries
                            </Typography>
                            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                                {selectedComponentLogs.map((log, index) => (
                                    <ListItem key={log.id || index} divider>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                                    <Chip 
                                                        label={log.level.toUpperCase()} 
                                                        color={getLogLevelColor(log.level) as any}
                                                        size="small"
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                                                    {log.message}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setLogsDialogOpen(false)}
                        startIcon={<IconChevronDown size={16} />}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Test Results Dialog */}
            <Dialog
                open={testResultDialog.open}
                onClose={() => setTestResultDialog({ open: false, component: null, result: null })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconTestPipe size={20} />
                        Test Results - {testResultDialog.component?.name}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {testResultDialog.result ? (
                        <Stack spacing={2}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle1">Overall Status:</Typography>
                                <Chip 
                                    label={testResultDialog.result.status?.toUpperCase() || 'UNKNOWN'}
                                    color={
                                        testResultDialog.result.status === 'pass' ? 'success' :
                                        testResultDialog.result.status === 'fail' ? 'error' : 'warning'
                                    }
                                    variant="filled"
                                />
                            </Box>
                            
                            {testResultDialog.result.details && (
                                <Alert severity="info">
                                    {testResultDialog.result.details}
                                </Alert>
                            )}

                            {testResultDialog.result.tests && (
                                <>
                                    <Divider />
                                    <Typography variant="subtitle2">Test Details:</Typography>
                                    <List dense>
                                        {testResultDialog.result.tests.map((test: any, index: number) => (
                                            <ListItem key={index}>
                                                <ListItemText
                                                    primary={
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Typography variant="body2">{test.name}</Typography>
                                                            <Chip 
                                                                label={test.status.toUpperCase()}
                                                                color={
                                                                    test.status === 'pass' ? 'success' :
                                                                    test.status === 'fail' ? 'error' : 'warning'
                                                                }
                                                                size="small"
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Typography variant="caption" color="text.secondary">
                                                            Duration: {test.duration}
                                                            {test.error && ` • Error: ${test.error}`}
                                                            {test.details && ` • ${test.details}`}
                                                        </Typography>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </>
                            )}

                            {testResultDialog.result.timestamp && (
                                <Typography variant="caption" color="text.secondary" textAlign="center">
                                    Test completed at {new Date(testResultDialog.result.timestamp).toLocaleString()}
                                </Typography>
                            )}
                        </Stack>
                    ) : (
                        <Typography color="text.secondary">
                            No test results available.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setTestResultDialog({ open: false, component: null, result: null })}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast Snackbar */}
            <Snackbar
                open={toastOpen}
                autoHideDuration={6000}
                onClose={() => setToastOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setToastOpen(false)}
                    severity={toastSeverity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {toastMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ComponentManager;