// Add New Church Client Component - Dedicated page for creating new church clients
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    Paper,
    Divider,
} from '@mui/material';
import {
    Church as ChurchIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCreateClient } from '@/hooks/useClientManagement';
import { useQueryClient } from '@tanstack/react-query';
import type { CreateClientRequest } from '@/types/client-management.types';
import PageContainer from '@/shared/ui/PageContainer';
import DashboardCard from '@/shared/ui/DashboardCard';

const AddNewClient: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const createClientMutation = useCreateClient();
    
    const [clientData, setClientData] = useState<CreateClientRequest>({
        name: '',
        slug: '',
        contact_email: '',
        contact_phone: '',
        subscription_tier: 'basic',
        branding: {
            primaryColor: '#1976d2',
            secondaryColor: '#dc004e',
        },
        admin_username: '',
        admin_email: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!clientData.name) newErrors.name = 'Church name is required';
        if (!clientData.slug) newErrors.slug = 'Slug is required';
        if (!clientData.contact_email) newErrors.contact_email = 'Contact email is required';
        if (!clientData.admin_email) newErrors.admin_email = 'Admin email is required';
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (clientData.contact_email && !emailRegex.test(clientData.contact_email)) {
            newErrors.contact_email = 'Please enter a valid email address';
        }
        if (clientData.admin_email && !emailRegex.test(clientData.admin_email)) {
            newErrors.admin_email = 'Please enter a valid email address';
        }
        
        // Validate slug format (lowercase, no spaces, alphanumeric + hyphens)
        if (clientData.slug && !/^[a-z0-9-]+$/.test(clientData.slug)) {
            newErrors.slug = 'Slug must be lowercase letters, numbers, and hyphens only';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        
        try {
            await createClientMutation.mutateAsync(clientData);
            // Force a hard refresh of the clients cache
            await queryClient.invalidateQueries({ queryKey: ['clients'] });
            await queryClient.refetchQueries({ queryKey: ['clients'] });
            navigate('/apps/client-management');
        } catch (error) {
            console.error('Failed to create client:', error);
        }
    };

    const handleInputChange = (field: keyof CreateClientRequest, value: any) => {
        setClientData(prev => ({ ...prev, [field]: value }));
        
        // Auto-generate slug from name if slug is empty
        if (field === 'name' && !clientData.slug) {
            const autoSlug = value.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 50);
            setClientData(prev => ({ ...prev, slug: autoSlug }));
        }
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <PageContainer title="Add New Church Client" description="Create a new church client">
            <DashboardCard title="Add New Church Client">
                <Box>
                    {/* Header */}
                    <Box display="flex" alignItems="center" mb={3}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/apps/client-management')}
                            sx={{ mr: 2 }}
                        >
                            Back to Client Management
                        </Button>
                        <ChurchIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h4" component="h1">
                            Add New Church Client
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* Error Display */}
                    {createClientMutation.isError && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {createClientMutation.error?.message || 'Failed to create client. Please try again.'}
                        </Alert>
                    )}

                    {/* Form */}
                    <Grid container spacing={3}>
                        {/* Basic Information */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Basic Information
                                </Typography>
                                
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Church Name"
                                            value={clientData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            error={!!errors.name}
                                            helperText={errors.name}
                                            required
                                        />
                                    </Grid>
                                    
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Slug (URL identifier)"
                                            value={clientData.slug}
                                            onChange={(e) => handleInputChange('slug', e.target.value)}
                                            error={!!errors.slug}
                                            helperText={errors.slug || "Used in URLs: /client/[slug]"}
                                            required
                                        />
                                    </Grid>
                                    
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Contact Email"
                                            type="email"
                                            value={clientData.contact_email}
                                            onChange={(e) => handleInputChange('contact_email', e.target.value)}
                                            error={!!errors.contact_email}
                                            helperText={errors.contact_email}
                                            required
                                        />
                                    </Grid>
                                    
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Contact Phone"
                                            value={clientData.contact_phone}
                                            onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* Admin Account */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Admin Account
                                </Typography>
                                
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Admin Username"
                                            value={clientData.admin_username}
                                            onChange={(e) => handleInputChange('admin_username', e.target.value)}
                                            helperText="Usually the admin's email address"
                                        />
                                    </Grid>
                                    
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Admin Email"
                                            type="email"
                                            value={clientData.admin_email}
                                            onChange={(e) => handleInputChange('admin_email', e.target.value)}
                                            error={!!errors.admin_email}
                                            helperText={errors.admin_email}
                                            required
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* Subscription */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Subscription
                                </Typography>
                                
                                <FormControl fullWidth>
                                    <InputLabel>Subscription Tier</InputLabel>
                                    <Select
                                        value={clientData.subscription_tier}
                                        onChange={(e) => handleInputChange('subscription_tier', e.target.value)}
                                        label="Subscription Tier"
                                    >
                                        <MenuItem value="basic">Basic</MenuItem>
                                        <MenuItem value="standard">Standard</MenuItem>
                                        <MenuItem value="premium">Premium</MenuItem>
                                    </Select>
                                </FormControl>
                            </Paper>
                        </Grid>

                        {/* Branding */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Branding Colors
                                </Typography>
                                
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Primary Color"
                                            type="color"
                                            value={clientData.branding?.primaryColor || '#1976d2'}
                                            onChange={(e) => handleInputChange('branding', {
                                                ...clientData.branding,
                                                primaryColor: e.target.value
                                            })}
                                        />
                                    </Grid>
                                    
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Secondary Color"
                                            type="color"
                                            value={clientData.branding?.secondaryColor || '#dc004e'}
                                            onChange={(e) => handleInputChange('branding', {
                                                ...clientData.branding,
                                                secondaryColor: e.target.value
                                            })}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* Actions */}
                        <Grid item xs={12}>
                            <Box display="flex" justifyContent="flex-end" gap={2}>
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate('/apps/client-management')}
                                    disabled={createClientMutation.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={createClientMutation.isPending}
                                    startIcon={createClientMutation.isPending ? <CircularProgress size={20} /> : <ChurchIcon />}
                                >
                                    {createClientMutation.isPending ? 'Creating...' : 'Create Church Client'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </DashboardCard>
        </PageContainer>
    );
};

export default AddNewClient;
