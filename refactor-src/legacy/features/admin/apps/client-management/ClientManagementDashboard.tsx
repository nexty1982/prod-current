// Client Management Dashboard - Main Orthodox Metrics Admin Interface
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Chip,
    IconButton,
    Menu,
    MenuItem,
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
    SelectChangeEvent,
} from '@mui/material';
import {
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    Business as BusinessIcon,
    People as PeopleIcon,
    Analytics as AnalyticsIcon,
    Settings as SettingsIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useClients, useCreateClient, useUpdateClientStatus, useDeleteClient } from '@/hooks/useClientManagement';
import type { Client, CreateClientRequest } from '@/types/client-management.types';
import PageContainer from '@/shared/ui/PageContainer';
import DashboardCard from '@/shared/ui/DashboardCard';

const ClientManagementDashboard: React.FC = () => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newClientData, setNewClientData] = useState<CreateClientRequest>({
        name: '',
        slug: '',
        contact_email: '',
        contact_phone: '',
        subscription_tier: 'basic',
        branding: {},
        admin_username: '',
        admin_email: '',
    });

    // Query hooks
    const { data: clientsResponse, isLoading, error, refetch } = useClients(page, 10, search);
    const createClientMutation = useCreateClient();
    const updateStatusMutation = useUpdateClientStatus();
    const deleteClientMutation = useDeleteClient();

    const clients = clientsResponse?.data?.clients || [];
    const totalPages = clientsResponse?.data?.totalPages || 1;

    // Debug logging
    console.log('ClientManagementDashboard - clientsResponse:', clientsResponse);
    console.log('ClientManagementDashboard - clients:', clients);
    console.log('ClientManagementDashboard - clients length:', clients.length);

    // Handle menu actions
    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, client: Client) => {
        setAnchorEl(event.currentTarget);
        setSelectedClient(client);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedClient(null);
    };

    // Handle client status updates
    const handleStatusUpdate = async (status: 'active' | 'inactive' | 'suspended') => {
        if (!selectedClient) return;

        try {
            await updateStatusMutation.mutateAsync({
                clientId: selectedClient.id,
                status,
            });
            handleMenuClose();
        } catch (error) {
            console.error('Failed to update client status:', error);
        }
    };

    // Handle client deletion
    const handleDeleteClient = async () => {
        if (!selectedClient) return;

        if (window.confirm(`Are you sure you want to delete client "${selectedClient.name}"? This action cannot be undone.`)) {
            try {
                await deleteClientMutation.mutateAsync(selectedClient.id);
                handleMenuClose();
            } catch (error) {
                console.error('Failed to delete client:', error);
            }
        }
    };

    // Handle create client
    const handleCreateClient = async () => {
        try {
            await createClientMutation.mutateAsync(newClientData);
            setCreateDialogOpen(false);
            setNewClientData({
                name: '',
                slug: '',
                contact_email: '',
                contact_phone: '',
                subscription_tier: 'basic',
                branding: {},
                admin_username: '',
                admin_email: '',
            });
        } catch (error) {
            console.error('Failed to create client:', error);
        }
    };

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        setNewClientData(prev => ({
            ...prev,
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20),
        }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'default';
            case 'suspended': return 'error';
            default: return 'default';
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'basic': return 'info';
            case 'premium': return 'warning';
            case 'enterprise': return 'secondary';
            default: return 'default';
        }
    };

    if (isLoading) {
        return (
            <PageContainer title="Client Management" description="Manage Orthodox Metrics client churches">
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    if (error) {
        return (
            <PageContainer title="Client Management" description="Manage Orthodox Metrics client churches">
                <Alert severity="error" sx={{ mb: 3 }}>
                    Failed to load clients. Please try again.
                    <Button onClick={() => refetch()} sx={{ ml: 2 }}>
                        <RefreshIcon /> Retry
                    </Button>
                </Alert>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Client Management" description="Manage Orthodox Metrics client churches">
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Client Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    Add New Church
                </Button>
            </Box>

            {/* Search and Filters */}
            <Box mb={3}>
                <TextField
                    fullWidth
                    placeholder="Search clients by name, email, or slug..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ maxWidth: 400 }}
                />
            </Box>

            {/* Client Grid */}
            <Grid container spacing={3}>
                {clients.map((client: Client) => (
                    <Grid item xs={12} md={6} lg={4} key={client.id}>
                        <DashboardCard>
                            <CardContent>
                                {/* Client Header */}
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                    <Box>
                                        <Typography variant="h6" component="h3" gutterBottom>
                                            {client.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {client.slug}
                                        </Typography>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleMenuClick(e, client)}
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                </Box>

                                {/* Status and Tier */}
                                <Box display="flex" gap={1} mb={2}>
                                    <Chip
                                        label={client.status}
                                        color={getStatusColor(client.status) as any}
                                        size="small"
                                    />
                                    <Chip
                                        label={client.subscription_tier}
                                        color={getTierColor(client.subscription_tier) as any}
                                        size="small"
                                    />
                                </Box>

                                {/* Contact Info */}
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    📧 {client.contact_email}
                                </Typography>
                                {client.contact_phone && (
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        📞 {client.contact_phone}
                                    </Typography>
                                )}

                                {/* Database Info */}
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    🗃️ {client.database_name}
                                </Typography>

                                {/* Created Date */}
                                <Typography variant="caption" color="text.secondary">
                                    Created: {new Date(client.created_at).toLocaleDateString()}
                                </Typography>

                                {/* Action Buttons */}
                                <Box mt={2} display="flex" gap={1}>
                                    <Button
                                        size="small"
                                        startIcon={<BusinessIcon />}
                                        href={`/client/${client.slug}`}
                                        target="_blank"
                                    >
                                        View Site
                                    </Button>
                                    <Button
                                        size="small"
                                        startIcon={<AnalyticsIcon />}
                                        onClick={() => {/* Navigate to client stats */ }}
                                    >
                                        Stats
                                    </Button>
                                </Box>
                            </CardContent>
                        </DashboardCard>
                    </Grid>
                ))}
            </Grid>

            {/* Pagination */}
            <Box mt={4} display="flex" justifyContent="center">
                <Button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    sx={{ mr: 2 }}
                >
                    Previous
                </Button>
                <Typography variant="body1" sx={{ mx: 2, alignSelf: 'center' }}>
                    Page {page} of {totalPages}
                </Typography>
                <Button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    sx={{ ml: 2 }}
                >
                    Next
                </Button>
            </Box>

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => handleStatusUpdate('active')}>
                    <PeopleIcon sx={{ mr: 1 }} /> Activate
                </MenuItem>
                <MenuItem onClick={() => handleStatusUpdate('inactive')}>
                    <SettingsIcon sx={{ mr: 1 }} /> Deactivate
                </MenuItem>
                <MenuItem onClick={() => handleStatusUpdate('suspended')}>
                    <SettingsIcon sx={{ mr: 1 }} /> Suspend
                </MenuItem>
                <MenuItem onClick={handleDeleteClient} sx={{ color: 'error.main' }}>
                    Delete Client
                </MenuItem>
            </Menu>

            {/* Create Client Dialog */}
            <Dialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Add New Church Client</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Church Name"
                                value={newClientData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Slug (URL identifier)"
                                value={newClientData.slug}
                                onChange={(e) => setNewClientData(prev => ({ ...prev, slug: e.target.value }))}
                                required
                                helperText="Used in URLs: /client/[slug]"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Contact Email"
                                type="email"
                                value={newClientData.contact_email}
                                onChange={(e) => setNewClientData(prev => ({ ...prev, contact_email: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Contact Phone"
                                value={newClientData.contact_phone}
                                onChange={(e) => setNewClientData(prev => ({ ...prev, contact_phone: e.target.value }))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Subscription Tier</InputLabel>
                                <Select
                                    value={newClientData.subscription_tier}
                                    onChange={(e: SelectChangeEvent) => setNewClientData(prev => ({
                                        ...prev,
                                        subscription_tier: e.target.value as 'basic' | 'premium' | 'enterprise'
                                    }))}
                                >
                                    <MenuItem value="basic">Basic</MenuItem>
                                    <MenuItem value="premium">Premium</MenuItem>
                                    <MenuItem value="enterprise">Enterprise</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Admin Username"
                                value={newClientData.admin_username}
                                onChange={(e) => setNewClientData(prev => ({ ...prev, admin_username: e.target.value }))}
                                helperText="Default admin user for this church"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Admin Email"
                                type="email"
                                value={newClientData.admin_email}
                                onChange={(e) => setNewClientData(prev => ({ ...prev, admin_email: e.target.value }))}
                                helperText="Admin user's email address"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleCreateClient}
                        variant="contained"
                        disabled={createClientMutation.isPending}
                    >
                        {createClientMutation.isPending ? <CircularProgress size={20} /> : 'Create Church'}
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};

export default ClientManagementDashboard;
