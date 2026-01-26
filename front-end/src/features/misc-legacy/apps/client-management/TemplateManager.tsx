// Template Manager - For managing and deploying church templates
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemSecondaryAction,
    IconButton,
    Tabs,
    Tab,
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    Launch as LaunchIcon,
    Settings as SettingsIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    CloudDownload as DownloadIcon,
    Publish as DeployIcon,
} from '@mui/icons-material';
import { useTemplates, useCloneTemplate, useDeployTemplate } from '@/hooks/useClientManagement';
import PageContainer from '@/shared/ui/PageContainer';
import DashboardCard from '@/shared/ui/DashboardCard';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
);

const TemplateManager: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [deployDialogOpen, setDeployDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [targetClientSlug, setTargetClientSlug] = useState('');
    const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');

    // Query hooks
    const { data: templatesResponse, isLoading: loadingTemplates } = useTemplates();
    const cloneTemplateMutation = useCloneTemplate();
    const deployTemplateMutation = useDeployTemplate();

    const templates = templatesResponse?.data || [];

    // Mock template data - in real implementation, this would come from the API
    const mockTemplates = [
        {
            id: 'ssppoc',
            name: 'SS. Peter & Paul Orthodox Church Template',
            description: 'Complete Orthodox church management system with baptism, marriage, and funeral records',
            version: '2.1.0',
            status: 'active',
            features: [
                'Baptism Records Management',
                'Marriage Records Management',
                'Funeral Records Management',
                'Certificate Generation',
                'Calendar System',
                'Dashboard Analytics',
                'Multi-language Support',
                'OCR Document Processing',
                'Email Notifications',
                'User Management',
            ],
            lastUpdated: '2025-01-01',
            deployments: 15,
            size: '2.3 MB',
        },
        {
            id: 'basic-orthodox',
            name: 'Basic Orthodox Template',
            description: 'Simplified church management system for smaller parishes',
            version: '1.5.0',
            status: 'active',
            features: [
                'Basic Record Management',
                'Simple Dashboard',
                'Contact Management',
                'Event Calendar',
            ],
            lastUpdated: '2024-12-15',
            deployments: 8,
            size: '1.1 MB',
        },
    ];

    const handleDeployTemplate = async () => {
        if (!selectedTemplate || !targetClientSlug) return;

        setDeploymentStatus('deploying');
        try {
            await deployTemplateMutation.mutateAsync({
                clientSlug: targetClientSlug,
                templateData: {
                    templateId: selectedTemplate.id,
                    templateName: selectedTemplate.name,
                    version: selectedTemplate.version,
                },
            });
            setDeploymentStatus('success');
            setTimeout(() => {
                setDeployDialogOpen(false);
                setDeploymentStatus('idle');
                setSelectedTemplate(null);
                setTargetClientSlug('');
            }, 2000);
        } catch (error) {
            console.error('Template deployment failed:', error);
            setDeploymentStatus('error');
        }
    };

    const handleCloneTemplate = async (templateId: string, clientSlug: string) => {
        try {
            await cloneTemplateMutation.mutateAsync({ templateId, clientSlug });
        } catch (error) {
            console.error('Template cloning failed:', error);
        }
    };

    const openDeployDialog = (template: any) => {
        setSelectedTemplate(template);
        setDeployDialogOpen(true);
    };

    return (
        <PageContainer title="Template Manager" description="Manage and deploy church templates">
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                    <Tab label="Available Templates" />
                    <Tab label="Deployment History" />
                    <Tab label="Template Settings" />
                </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                    {mockTemplates.map((template) => (
                        <Grid item xs={12} md={6} key={template.id}>
                            <DashboardCard>
                                <CardContent>
                                    {/* Template Header */}
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                        <Box>
                                            <Typography variant="h6" component="h3" gutterBottom>
                                                {template.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                {template.description}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={template.status}
                                            color={template.status === 'active' ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </Box>

                                    {/* Template Info */}
                                    <Box mb={2}>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Version:</strong> {template.version}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Deployments:</strong> {template.deployments}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Size:</strong> {template.size}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Last Updated:</strong> {new Date(template.lastUpdated).toLocaleDateString()}
                                        </Typography>
                                    </Box>

                                    {/* Features List */}
                                    <Box mb={2}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Features:
                                        </Typography>
                                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                                            {template.features.slice(0, 4).map((feature) => (
                                                <Chip
                                                    key={feature}
                                                    label={feature}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ))}
                                            {template.features.length > 4 && (
                                                <Chip
                                                    label={`+${template.features.length - 4} more`}
                                                    size="small"
                                                    variant="outlined"
                                                    color="primary"
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Action Buttons */}
                                    <Box display="flex" gap={1}>
                                        <Button
                                            variant="contained"
                                            startIcon={<DeployIcon />}
                                            onClick={() => openDeployDialog(template)}
                                            size="small"
                                        >
                                            Deploy
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<LaunchIcon />}
                                            size="small"
                                            onClick={() => {
                                                // Preview template
                                                window.open(`/template-preview/${template.id}`, '_blank');
                                            }}
                                        >
                                            Preview
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<DownloadIcon />}
                                            size="small"
                                            onClick={() => {
                                                // Download template
                                                console.log('Download template:', template.id);
                                            }}
                                        >
                                            Download
                                        </Button>
                                    </Box>
                                </CardContent>
                            </DashboardCard>
                        </Grid>
                    ))}
                </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <DashboardCard title="Recent Deployments">
                    <CardContent>
                        <List>
                            {/* Mock deployment history */}
                            <ListItem>
                                <ListItemIcon>
                                    <CheckCircleIcon color="success" />
                                </ListItemIcon>
                                <ListItemText
                                    primary="SS. Peter & Paul Template → stmary"
                                    secondary="Deployed 2 hours ago • Version 2.1.0"
                                />
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => window.open('/client/stmary', '_blank')}>
                                        <LaunchIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                            <ListItem>
                                <ListItemIcon>
                                    <CheckCircleIcon color="success" />
                                </ListItemIcon>
                                <ListItemText
                                    primary="SS. Peter & Paul Template → holytrinity"
                                    secondary="Deployed yesterday • Version 2.1.0"
                                />
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => window.open('/client/holytrinity', '_blank')}>
                                        <LaunchIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                            <ListItem>
                                <ListItemIcon>
                                    <ErrorIcon color="error" />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Basic Orthodox Template → newchurch"
                                    secondary="Failed 3 days ago • Database connection error"
                                />
                                <ListItemSecondaryAction>
                                    <IconButton>
                                        <SettingsIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        </List>
                    </CardContent>
                </DashboardCard>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <DashboardCard title="Template Configuration">
                            <CardContent>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Template settings are managed at the system level. Contact support for template modifications.
                                </Alert>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Default Template:</strong> SS. Peter & Paul Orthodox Church
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Auto-deployment:</strong> Enabled
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Version Check:</strong> Automatic
                                </Typography>
                            </CardContent>
                        </DashboardCard>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <DashboardCard title="Template Statistics">
                            <CardContent>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Total Templates:</strong> 2
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Active Deployments:</strong> 23
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Success Rate:</strong> 95.7%
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Average Deploy Time:</strong> 3.2 minutes
                                </Typography>
                            </CardContent>
                        </DashboardCard>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Deployment Dialog */}
            <Dialog
                open={deployDialogOpen}
                onClose={() => setDeployDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Deploy Template: {selectedTemplate?.name}
                </DialogTitle>
                <DialogContent>
                    {deploymentStatus === 'idle' && (
                        <Box>
                            <Typography variant="body1" gutterBottom>
                                Deploy this template to a client church site.
                            </Typography>
                            <TextField
                                fullWidth
                                label="Target Client Slug"
                                value={targetClientSlug}
                                onChange={(e) => setTargetClientSlug(e.target.value)}
                                helperText="Enter the client slug (e.g., 'stmary', 'holytrinity')"
                                sx={{ mt: 2 }}
                            />
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                This will overwrite any existing configuration for the target client.
                            </Alert>
                        </Box>
                    )}
                    {deploymentStatus === 'deploying' && (
                        <Box display="flex" flexDirection="column" alignItems="center" py={3}>
                            <CircularProgress size={60} sx={{ mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Deploying Template...
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                This may take a few minutes. Please don't close this window.
                            </Typography>
                        </Box>
                    )}
                    {deploymentStatus === 'success' && (
                        <Box display="flex" flexDirection="column" alignItems="center" py={3}>
                            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Deployment Successful!
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                The template has been successfully deployed to {targetClientSlug}.
                            </Typography>
                        </Box>
                    )}
                    {deploymentStatus === 'error' && (
                        <Box display="flex" flexDirection="column" alignItems="center" py={3}>
                            <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Deployment Failed
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                There was an error deploying the template. Please try again.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {deploymentStatus === 'idle' && (
                        <>
                            <Button onClick={() => setDeployDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeployTemplate}
                                variant="contained"
                                disabled={!targetClientSlug || deployTemplateMutation.isPending}
                            >
                                {deployTemplateMutation.isPending ? <CircularProgress size={20} /> : 'Deploy'}
                            </Button>
                        </>
                    )}
                    {(deploymentStatus === 'success' || deploymentStatus === 'error') && (
                        <Button onClick={() => setDeployDialogOpen(false)} variant="contained">
                            Close
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};

export default TemplateManager;
