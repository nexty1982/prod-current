// AI Deployment Automation Component for Admin Interface
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Stack,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tab,
    Tabs,
} from '@mui/material';
import {
    IconRocket,
    IconServer,
    IconDownload,
    IconCopy,
    IconCheck,
    IconX,
    IconAlertTriangle,
    IconCode,
    IconDatabase,
    IconShield,
    IconChevronDown,
    IconCloudUpload,
    IconGitBranch,
    IconTerminal,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { aiService } from '../../services/aiService';

interface DeploymentRequest {
    church_name: string;
    church_slug: string;
    domain?: string;
    ssl_enabled?: boolean;
    backup_enabled?: boolean;
    monitoring_enabled?: boolean;
}

interface DeploymentResult {
    deployment_id: string;
    church_name: string;
    church_slug: string;
    config: string;
    created_at: string;
    status: string;
}

export const AIDeploymentAutomation: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [request, setRequest] = useState<DeploymentRequest>({
        church_name: '',
        church_slug: '',
        domain: '',
        ssl_enabled: true,
        backup_enabled: true,
        monitoring_enabled: true,
    });
    const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);

    const generateDeploymentMutation = useMutation({
        mutationFn: async (req: DeploymentRequest) => {
            // This would call the AI service API
            const response = await fetch('http://localhost:8001/api/admin/generate-deployment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(req),
            });

            if (!response.ok) {
                throw new Error('Failed to generate deployment');
            }

            return response.json();
        },
        onSuccess: (data) => {
            setDeploymentResult(data);
        },
    });

    const handleGenerate = () => {
        if (request.church_name && request.church_slug) {
            generateDeploymentMutation.mutate(request);
        }
    };

    const handleCopyConfig = () => {
        if (deploymentResult) {
            navigator.clipboard.writeText(deploymentResult.config);
        }
    };

    const handleDownloadConfig = () => {
        if (deploymentResult) {
            const blob = new Blob([deploymentResult.config], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${deploymentResult.church_slug}-deployment-config.yml`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const deploymentSteps = [
        {
            title: 'Server Setup',
            description: 'Configure the target server with required dependencies',
            icon: <IconServer size={20} />,
        },
        {
            title: 'Database Configuration',
            description: 'Set up MariaDB database with Orthodox Metrics schema',
            icon: <IconDatabase size={20} />,
        },
        {
            title: 'Application Deployment',
            description: 'Deploy the Orthodox Metrics application using Docker',
            icon: <IconCloudUpload size={20} />,
        },
        {
            title: 'SSL & Security',
            description: 'Configure SSL certificates and security settings',
            icon: <IconShield size={20} />,
        },
        {
            title: 'Monitoring Setup',
            description: 'Enable monitoring and logging for the deployment',
            icon: <IconTerminal size={20} />,
        },
    ];

    const tabLabels = ['Configuration', 'Generated Config', 'Deployment Steps'];

    return (
        <>
            <Button
                variant="contained"
                startIcon={<IconRocket />}
                onClick={() => setOpen(true)}
                sx={{ mb: 2 }}
            >
                AI Deployment Automation
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconRocket size={24} />
                        AI Deployment Automation
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
                                {/* Church Information */}
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" mb={2}>
                                            Church Information
                                        </Typography>

                                        <Stack spacing={2}>
                                            <TextField
                                                fullWidth
                                                label="Church Name"
                                                placeholder="e.g., St. Nicholas Orthodox Church"
                                                value={request.church_name}
                                                onChange={(e) => {
                                                    const name = e.target.value;
                                                    setRequest({
                                                        ...request,
                                                        church_name: name,
                                                        church_slug: generateSlug(name),
                                                    });
                                                }}
                                            />

                                            <TextField
                                                fullWidth
                                                label="Church Slug (URL identifier)"
                                                placeholder="e.g., st-nicholas-orthodox"
                                                value={request.church_slug}
                                                onChange={(e) => setRequest({ ...request, church_slug: e.target.value })}
                                                helperText="Used for database names, container names, and URLs"
                                            />

                                            <TextField
                                                fullWidth
                                                label="Domain (Optional)"
                                                placeholder="e.g., stnicholas.orthodox-metrics.com"
                                                value={request.domain}
                                                onChange={(e) => setRequest({ ...request, domain: e.target.value })}
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>

                                {/* Deployment Options */}
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" mb={2}>
                                            Deployment Options
                                        </Typography>

                                        <Stack spacing={2}>
                                            <Box display="flex" alignItems="center" gap={2}>
                                                <Chip
                                                    icon={<IconShield size={16} />}
                                                    label="SSL Enabled"
                                                    color={request.ssl_enabled ? 'success' : 'default'}
                                                    variant={request.ssl_enabled ? 'filled' : 'outlined'}
                                                    onClick={() => setRequest({ ...request, ssl_enabled: !request.ssl_enabled })}
                                                />
                                                <Chip
                                                    icon={<IconDatabase size={16} />}
                                                    label="Backup Enabled"
                                                    color={request.backup_enabled ? 'success' : 'default'}
                                                    variant={request.backup_enabled ? 'filled' : 'outlined'}
                                                    onClick={() => setRequest({ ...request, backup_enabled: !request.backup_enabled })}
                                                />
                                                <Chip
                                                    icon={<IconTerminal size={16} />}
                                                    label="Monitoring Enabled"
                                                    color={request.monitoring_enabled ? 'success' : 'default'}
                                                    variant={request.monitoring_enabled ? 'filled' : 'outlined'}
                                                    onClick={() => setRequest({ ...request, monitoring_enabled: !request.monitoring_enabled })}
                                                />
                                            </Box>

                                            <Alert severity="info">
                                                <Typography variant="subtitle2">Deployment Preview</Typography>
                                                This will generate a complete deployment configuration including Docker Compose,
                                                environment variables, database setup, and security configurations.
                                            </Alert>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                {/* Error Display */}
                                {generateDeploymentMutation.isError && (
                                    <Alert severity="error">
                                        {generateDeploymentMutation.error?.message || 'Failed to generate deployment configuration'}
                                    </Alert>
                                )}

                                {/* Processing Status */}
                                {generateDeploymentMutation.isPending && (
                                    <Alert severity="info" icon={<CircularProgress size={20} />}>
                                        AI is generating your deployment configuration... This may take a few moments.
                                    </Alert>
                                )}
                            </Stack>
                        )}

                        {activeTab === 1 && deploymentResult && (
                            <Stack spacing={3}>
                                {/* Configuration Header */}
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                                        <IconCode size={20} />
                                        Generated Configuration
                                    </Typography>
                                    <Box display="flex" gap={1}>
                                        <Chip
                                            size="small"
                                            label={`ID: ${deploymentResult.deployment_id}`}
                                            variant="outlined"
                                        />
                                        <Chip
                                            size="small"
                                            label={deploymentResult.status}
                                            color="success"
                                            variant="outlined"
                                        />
                                        <Tooltip title="Copy Configuration">
                                            <IconButton onClick={handleCopyConfig} size="small">
                                                <IconCopy size={18} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Download Configuration">
                                            <IconButton onClick={handleDownloadConfig} size="small">
                                                <IconDownload size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* Configuration Content */}
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    <Typography
                                        variant="body2"
                                        component="pre"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem',
                                            maxHeight: 400,
                                            overflow: 'auto',
                                        }}
                                    >
                                        {deploymentResult.config}
                                    </Typography>
                                </Paper>

                                <Alert severity="success">
                                    <Typography variant="subtitle2">Configuration Generated</Typography>
                                    Your deployment configuration has been generated successfully. Download the files
                                    and follow the deployment steps to set up Orthodox Metrics for {deploymentResult.church_name}.
                                </Alert>
                            </Stack>
                        )}

                        {activeTab === 2 && (
                            <Stack spacing={2}>
                                <Typography variant="h6" mb={2}>
                                    Deployment Process
                                </Typography>

                                {deploymentSteps.map((step, index) => (
                                    <Accordion key={index}>
                                        <AccordionSummary expandIcon={<IconChevronDown />}>
                                            <Box display="flex" alignItems="center" gap={2}>
                                                <Box color="primary.main">{step.icon}</Box>
                                                <Box>
                                                    <Typography variant="subtitle1">
                                                        Step {index + 1}: {step.title}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {step.description}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography variant="body2">
                                                Detailed instructions for {step.title.toLowerCase()} will be included in the generated
                                                deployment configuration. The AI will provide step-by-step commands and explanations.
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}

                                <Alert severity="info">
                                    <Typography variant="subtitle2">Prerequisites</Typography>
                                    Ensure you have Docker, Docker Compose, and SSH access to your target server
                                    before beginning the deployment process.
                                </Alert>
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpen(false)} startIcon={<IconX />}>
                        Close
                    </Button>
                    {activeTab === 0 && (
                        <Button
                            onClick={handleGenerate}
                            variant="contained"
                            disabled={!request.church_name || !request.church_slug || generateDeploymentMutation.isPending}
                            startIcon={
                                generateDeploymentMutation.isPending ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <IconRocket />
                                )
                            }
                        >
                            {generateDeploymentMutation.isPending ? 'Generating...' : 'Generate Deployment'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AIDeploymentAutomation;
