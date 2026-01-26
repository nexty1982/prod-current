// Church Setup Component - For setting up individual church sites
import React, { useState, useEffect } from 'react';
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
    Stepper,
    Step,
    StepLabel,
    Paper,
    Divider,
    Switch,
    FormControlLabel,
    Chip,
} from '@mui/material';
import {
    Church as ChurchIcon,
    Settings as SettingsIcon,
    Palette as PaletteIcon,
    CheckCircle as CheckCircleIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { useChurchInfo, useUpdateChurchInfo, useTestClientConnection } from '@/hooks/useClientManagement';
import type { ChurchInfo, ChurchInfoUpdateRequest, ClientBranding } from '@/types/client-management.types';
import PageContainer from '@/shared/ui/PageContainer';
import DashboardCard from '@/shared/ui/DashboardCard';

interface ChurchSetupProps {
    clientSlug: string;
    isNewClient?: boolean;
}

const ChurchSetup: React.FC<ChurchSetupProps> = ({ clientSlug, isNewClient = false }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [churchData, setChurchData] = useState<ChurchInfoUpdateRequest>({
        name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        established_date: '',
        patron_saint: '',
        priest_name: '',
        priest_email: '',
        priest_phone: '',
        liturgical_language: 'en',
        timezone: 'America/New_York',
    });
    const [brandingData, setBrandingData] = useState<ClientBranding>({
        primary_color: '#1976d2',
        secondary_color: '#dc004e',
        church_name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
    });
    const [connectionTested, setConnectionTested] = useState(false);

    // Query hooks
    const { data: churchInfoResponse, isLoading: loadingChurchInfo } = useChurchInfo(clientSlug);
    const updateChurchInfoMutation = useUpdateChurchInfo(clientSlug);
    const testConnectionMutation = useTestClientConnection();

    const churchInfo = churchInfoResponse?.data;

    // Load existing church data when available
    useEffect(() => {
        if (churchInfo) {
            setChurchData({
                name: churchInfo.name || '',
                address: churchInfo.address || '',
                phone: churchInfo.phone || '',
                email: churchInfo.email || '',
                website: churchInfo.website || '',
                established_date: churchInfo.established_date || '',
                patron_saint: churchInfo.patron_saint || '',
                priest_name: churchInfo.priest_name || '',
                priest_email: churchInfo.priest_email || '',
                priest_phone: churchInfo.priest_phone || '',
                liturgical_language: churchInfo.liturgical_language || 'en',
                timezone: churchInfo.timezone || 'America/New_York',
            });

            if (churchInfo.branding) {
                setBrandingData(churchInfo.branding);
            }
        }
    }, [churchInfo]);

    const steps = [
        'Test Connection & Church Information',
        'Priest Information',
        'Branding & Customization'
    ];

    // Test database connection
    const handleTestConnection = async () => {
        try {
            const result = await testConnectionMutation.mutateAsync(clientSlug);
            if (result.data?.connected) {
                setConnectionTested(true);
                setActiveStep(1);
            }
        } catch (error) {
            console.error('Connection test failed:', error);
        }
    };

    // Handle church info update
    const handleUpdateChurchInfo = async () => {
        try {
            await updateChurchInfoMutation.mutateAsync(churchData);
            setActiveStep(activeStep + 1);
        } catch (error) {
            console.error('Failed to update church info:', error);
        }
    };

    // Handle next step
    const handleNext = () => {
        if (activeStep === 0) {
            handleTestConnection();
        } else if (activeStep === 1 || activeStep === 2) {
            handleUpdateChurchInfo();
        } else {
            setActiveStep(activeStep + 1);
        }
    };

    // Handle previous step
    const handleBack = () => {
        setActiveStep(activeStep - 1);
    };

    // Render step content based on current step
    const renderStepContent = () => {
        switch (activeStep) {
            case 0: // Test Connection & Church Information
                return (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Test Connection & Church Information
                            </Typography>
                            
                            {/* Connection Test Section */}
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Database Connection Test
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    First, let's test the connection to your church's database to ensure everything is set up correctly.
                                </Typography>
                                
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <strong>Client Slug:</strong> {clientSlug}
                                </Alert>
                                
                                {testConnectionMutation.isError && (
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        Connection test failed. Please check your database configuration.
                                    </Alert>
                                )}
                                
                                {connectionTested && (
                                    <Alert severity="success" sx={{ mb: 2 }}>
                                        <CheckCircleIcon sx={{ mr: 1 }} />
                                        Database connection successful!
                                    </Alert>
                                )}
                                
                                <Button
                                    variant="contained"
                                    onClick={handleTestConnection}
                                    disabled={testConnectionMutation.isPending}
                                    startIcon={testConnectionMutation.isPending ? <CircularProgress size={20} /> : <SettingsIcon />}
                                    sx={{ mb: 3 }}
                                >
                                    {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                                </Button>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            {/* Church Information Section */}
                            <Typography variant="subtitle1" gutterBottom>
                                Church Information
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        fullWidth
                                        label="Church Name"
                                        value={churchData.name}
                                        onChange={(e) => setChurchData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                    <TextField
                                        fullWidth
                                        label="Patron Saint"
                                        value={churchData.patron_saint}
                                        onChange={(e) => setChurchData(prev => ({ ...prev, patron_saint: e.target.value }))}
                                    />
                                </Box>
                                <TextField
                                    fullWidth
                                    label="Address"
                                    multiline
                                    rows={2}
                                    value={churchData.address}
                                    onChange={(e) => setChurchData(prev => ({ ...prev, address: e.target.value }))}
                                />
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        fullWidth
                                        label="Phone"
                                        value={churchData.phone}
                                        onChange={(e) => setChurchData(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        type="email"
                                        value={churchData.email}
                                        onChange={(e) => setChurchData(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        fullWidth
                                        label="Website"
                                        value={churchData.website}
                                        onChange={(e) => setChurchData(prev => ({ ...prev, website: e.target.value }))}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Established Date"
                                        type="date"
                                        value={churchData.established_date}
                                        onChange={(e) => setChurchData(prev => ({ ...prev, established_date: e.target.value }))}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>Liturgical Language</InputLabel>
                                        <Select
                                            value={churchData.liturgical_language}
                                            onChange={(e) => setChurchData(prev => ({ ...prev, liturgical_language: e.target.value }))}
                                        >
                                            <MenuItem value="en">English</MenuItem>
                                            <MenuItem value="gr">Greek</MenuItem>
                                            <MenuItem value="ru">Russian</MenuItem>
                                            <MenuItem value="ro">Romanian</MenuItem>
                                            <MenuItem value="sr">Serbian</MenuItem>
                                            <MenuItem value="bg">Bulgarian</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth>
                                        <InputLabel>Timezone</InputLabel>
                                        <Select
                                            value={churchData.timezone}
                                            onChange={(e) => setChurchData(prev => ({ ...prev, timezone: e.target.value }))}
                                        >
                                            <MenuItem value="America/New_York">Eastern Time</MenuItem>
                                            <MenuItem value="America/Chicago">Central Time</MenuItem>
                                            <MenuItem value="America/Denver">Mountain Time</MenuItem>
                                            <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                                            <MenuItem value="Europe/Athens">Athens</MenuItem>
                                            <MenuItem value="Europe/Moscow">Moscow</MenuItem>
                                            <MenuItem value="Europe/Bucharest">Bucharest</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                );

            case 1: // Priest Information
                return (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Priest Information
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Please provide contact information for the parish priest.
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        fullWidth
                                        label="Priest Name"
                                        value={churchData.priest_name}
                                        onChange={(e) => setChurchData(prev => ({ ...prev, priest_name: e.target.value }))}
                                        required
                                    />
                                    <TextField
                                        fullWidth
                                        label="Priest Email"
                                        type="email"
                                        value={churchData.priest_email}
                                        onChange={(e) => setChurchData(prev => ({ ...prev, priest_email: e.target.value }))}
                                        required
                                    />
                                </Box>
                                <TextField
                                    fullWidth
                                    label="Priest Phone"
                                    value={churchData.priest_phone}
                                    onChange={(e) => setChurchData(prev => ({ ...prev, priest_phone: e.target.value }))}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                );

            case 2: // Branding & Customization
                return (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Branding & Customization
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Customize the visual appearance of your church's interface. This step is optional.
                            </Typography>
                            
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Primary Color"
                                    type="color"
                                    value={brandingData.primary_color}
                                    onChange={(e) => setBrandingData(prev => ({ ...prev, primary_color: e.target.value }))}
                                />
                                <TextField
                                    fullWidth
                                    label="Secondary Color"
                                    type="color"
                                    value={brandingData.secondary_color}
                                    onChange={(e) => setBrandingData(prev => ({ ...prev, secondary_color: e.target.value }))}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                );

            default:
                return null;
        }
    };

    if (loadingChurchInfo && !isNewClient) {
        return (
            <PageContainer title="Church Setup" description="Configure your church settings">
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Church Setup" description="Configure your church settings">
            <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
                <Typography variant="h4" gutterBottom>
                    Church Setup Wizard
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                    Follow these 3 steps to configure your church
                </Typography>
                
                <Stepper activeStep={activeStep} sx={{ my: 4 }}>
                    {steps.map((label, index) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {renderStepContent()}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                    <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                    
                    <Box>
                        {activeStep === steps.length - 1 ? (
                            <Button
                                variant="contained"
                                onClick={() => {
                                    handleUpdateChurchInfo();
                                    // Could add completion logic here
                                }}
                                disabled={updateChurchInfoMutation.isPending}
                                startIcon={updateChurchInfoMutation.isPending ? <CircularProgress size={20} /> : undefined}
                            >
                                {updateChurchInfoMutation.isPending ? 'Finishing...' : 'Complete Setup'}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                                disabled={
                                    updateChurchInfoMutation.isPending ||
                                    testConnectionMutation.isPending ||
                                    (activeStep === 0 && !connectionTested && !testConnectionMutation.isPending)
                                }
                            >
                                {updateChurchInfoMutation.isPending || testConnectionMutation.isPending ? (
                                    <CircularProgress size={20} />
                                ) : activeStep === 0 ? (
                                    'Test Connection & Continue'
                                ) : (
                                    'Continue'
                                )}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </PageContainer>
    );
};

export default ChurchSetup;
