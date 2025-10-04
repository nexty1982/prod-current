import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Tooltip,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Snackbar,
} from '@mui/material';
import {
    IconFiles,
    IconPlus,
    IconRefresh,
    IconServer,
    IconDatabase,
    IconWorld,
    IconCheck,
    IconX,
    IconTrash,
    IconInfoCircle,
} from '@tabler/icons-react';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import { logger } from 'src/utils/logger';

interface SiteInstance {
    id: string;
    name: string;
    domain: string;
    status: 'active' | 'inactive' | 'pending' | 'error';
    lastUpdated: string;
    template: string;
    port: number;
    dbName: string;
}

const SiteClone: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [instances, setInstances] = useState<SiteInstance[]>([]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newInstanceName, setNewInstanceName] = useState('');
    const [newInstanceDomain, setNewInstanceDomain] = useState('');
    const [newInstanceTemplate, setNewInstanceTemplate] = useState('Orthodox Parish Template');
    const [creating, setCreating] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    useEffect(() => {
        logger.componentMount('Site Clone');
        logger.pageView('Site Clone', '/apps/site-clone');
        loadInstances();

        return () => {
            logger.componentUnmount('Site Clone');
        };
    }, []);

    const loadInstances = async () => {
        try {
            setLoading(true);
            logger.userAction('Site Clone', 'load_instances', { action: 'fetch_instances' });

            // Mock data - replace with actual API call
            const mockInstances: SiteInstance[] = [
                {
                    id: '1',
                    name: 'St. Nicholas Parish',
                    domain: 'stnicolas.orthodoxmetrics.com',
                    status: 'active',
                    lastUpdated: '2024-01-15T10:30:00Z',
                    template: 'Orthodox Parish Template',
                    port: 3001,
                    dbName: 'stnicolas_db',
                },
                {
                    id: '2',
                    name: 'Holy Trinity Church',
                    domain: 'holytrinity.orthodoxmetrics.com',
                    status: 'inactive',
                    lastUpdated: '2024-01-10T14:20:00Z',
                    template: 'Orthodox Parish Template',
                    port: 3002,
                    dbName: 'holytrinity_db',
                },
            ];
            setInstances(mockInstances);
            logger.dataOperation('Site Clone', 'fetch', 'instances', mockInstances.length);
        } catch (error) {
            logger.error('Site Clone', 'Failed to load instances', { error });
            console.error('Error loading instances:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInstance = async () => {
        if (!newInstanceName.trim() || !newInstanceDomain.trim()) {
            setSnackbarMessage('Please fill in all required fields');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }

        try {
            setCreating(true);
            logger.userAction('Site Clone', 'create_instance', {
                name: newInstanceName,
                domain: newInstanceDomain,
                template: newInstanceTemplate
            });

            // Mock API call - replace with actual implementation
            await new Promise(resolve => setTimeout(resolve, 2000));

            const newInstance: SiteInstance = {
                id: Date.now().toString(),
                name: newInstanceName,
                domain: newInstanceDomain,
                status: 'pending',
                lastUpdated: new Date().toISOString(),
                template: newInstanceTemplate,
                port: 3000 + instances.length + 1,
                dbName: newInstanceName.toLowerCase().replace(/\s+/g, '_') + '_db'
            };

            setInstances(prev => [...prev, newInstance]);
            setCreateDialogOpen(false);
            setNewInstanceName('');
            setNewInstanceDomain('');
            setNewInstanceTemplate('Orthodox Parish Template');

            setSnackbarMessage('Instance created successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);

            logger.dataOperation('Site Clone', 'create', 'instance', 1);
        } catch (error) {
            logger.error('Site Clone', 'Failed to create instance', { error });
            setSnackbarMessage('Failed to create instance. Please try again.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setCreating(false);
        }
    };

    const handleCloseDialog = () => {
        setCreateDialogOpen(false);
        setNewInstanceName('');
        setNewInstanceDomain('');
        setNewInstanceTemplate('Orthodox Parish Template');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'default';
            case 'pending': return 'warning';
            case 'error': return 'error';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <IconCheck size={16} />;
            case 'inactive': return <IconX size={16} />;
            case 'pending': return <CircularProgress size={16} />;
            case 'error': return <IconX size={16} />;
            default: return <IconInfoCircle size={16} />;
        }
    };

    const BCrumb = [
        {
            to: '/',
            title: 'Home',
        },
        {
            title: 'Site Clone',
        },
    ];

    return (
        <PageContainer title="Site Clone" description="Manage site instances and templates">
            <Breadcrumb title="Site Clone Management" items={BCrumb} />

            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<IconPlus />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    Create New Instance
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<IconRefresh />}
                    onClick={loadInstances}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>

            <Card>
                <CardContent>
                    <Typography variant="h5" sx={{ mb: 2 }}>
                        Site Instances
                    </Typography>

                    {loading && <LinearProgress sx={{ mb: 2 }} />}

                    {instances.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <IconFiles size={64} color="gray" />
                            <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
                                No site instances found
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Create your first site instance to get started
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {instances.map((instance) => (
                                <Card key={instance.id} variant="outlined">
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ mb: 1 }}>
                                                    {instance.name}
                                                </Typography>
                                                <Chip
                                                    label={instance.status}
                                                    color={getStatusColor(instance.status) as any}
                                                    size="small"
                                                    icon={getStatusIcon(instance.status)}
                                                />
                                            </Box>
                                            <Box>
                                                <Tooltip title="Toggle Status">
                                                    <IconButton size="small" disabled={loading}>
                                                        <IconServer size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Instance">
                                                    <IconButton size="small" color="error" disabled={loading}>
                                                        <IconTrash size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <IconWorld size={16} />
                                                <Typography variant="body2" sx={{ ml: 1 }}>
                                                    {instance.domain}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <IconServer size={16} />
                                                <Typography variant="body2" sx={{ ml: 1 }}>
                                                    Port: {instance.port}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <IconDatabase size={16} />
                                                <Typography variant="body2" sx={{ ml: 1 }}>
                                                    DB: {instance.dbName}
                                                </Typography>
                                            </Box>

                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                Last updated: {new Date(instance.lastUpdated).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Create Instance Dialog */}
            <Dialog open={createDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Site Instance</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Instance Name"
                            value={newInstanceName}
                            onChange={(e) => setNewInstanceName(e.target.value)}
                            placeholder="e.g., St. Mary's Parish"
                            sx={{ mb: 2 }}
                            required
                        />

                        <TextField
                            fullWidth
                            label="Domain"
                            value={newInstanceDomain}
                            onChange={(e) => setNewInstanceDomain(e.target.value)}
                            placeholder="e.g., stmary.orthodoxmetrics.com"
                            sx={{ mb: 2 }}
                            required
                        />

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Template</InputLabel>
                            <Select
                                value={newInstanceTemplate}
                                label="Template"
                                onChange={(e) => setNewInstanceTemplate(e.target.value)}
                            >
                                <MenuItem value="Orthodox Parish Template">Orthodox Parish Template</MenuItem>
                                <MenuItem value="Cathedral Template">Cathedral Template</MenuItem>
                                <MenuItem value="Monastery Template">Monastery Template</MenuItem>
                                <MenuItem value="Diocese Template">Diocese Template</MenuItem>
                            </Select>
                        </FormControl>

                        <Alert severity="info" sx={{ mt: 2 }}>
                            A new database and configuration will be created for this instance.
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} disabled={creating}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateInstance}
                        variant="contained"
                        disabled={creating || !newInstanceName.trim() || !newInstanceDomain.trim()}
                        startIcon={creating ? <CircularProgress size={20} /> : <IconPlus />}
                    >
                        {creating ? 'Creating...' : 'Create Instance'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </PageContainer>
    );
};

export default SiteClone;
