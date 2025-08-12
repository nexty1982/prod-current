import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    FormControl,
    FormControlLabel,
    FormGroup,
    Switch,
    Select,
    MenuItem,
    InputLabel,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Button,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Stack,
    Chip,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Tooltip,
    IconButton
} from '@mui/material';
import {
    ExpandMore,
    Email,
    NotificationsActive,
    Sms,
    PhoneAndroid,
    Settings,
    Person,
    AdminPanelSettings,
    Receipt,
    Backup,
    Security,
    VerifiedUser,
    Schedule,
    Save,
    RestoreFromTrash,
    Info,
    Warning,
    CheckCircle
} from '@mui/icons-material';
import { useNotifications, NotificationPreference } from '../../contexts/NotificationContext';
import { LoadingButton } from '@mui/lab';

const NotificationPreferences: React.FC = () => {
    const { preferences, updatePreferences, loading } = useNotifications();
    const [localPreferences, setLocalPreferences] = useState<NotificationPreference[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setLocalPreferences(preferences);
    }, [preferences]);

    useEffect(() => {
        // Check if there are changes
        const hasChanges = JSON.stringify(preferences) !== JSON.stringify(localPreferences);
        setHasChanges(hasChanges);
    }, [preferences, localPreferences]);

    const handlePreferenceChange = (typeName: string, field: keyof NotificationPreference, value: any) => {
        setLocalPreferences(prev =>
            prev.map(pref =>
                pref.type_name === typeName
                    ? { ...pref, [field]: value }
                    : pref
            )
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);

            await updatePreferences(localPreferences);
            setMessage({ type: 'success', text: 'Notification preferences updated successfully!' });
            setHasChanges(false);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update preferences. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setLocalPreferences(preferences);
        setHasChanges(false);
        setMessage(null);
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'system':
                return <Settings fontSize="small" />;
            case 'user':
                return <Person fontSize="small" />;
            case 'admin':
                return <AdminPanelSettings fontSize="small" />;
            case 'billing':
                return <Receipt fontSize="small" />;
            case 'backup':
                return <Backup fontSize="small" />;
            case 'security':
                return <Security fontSize="small" />;
            case 'certificates':
                return <VerifiedUser fontSize="small" />;
            case 'reminders':
                return <Schedule fontSize="small" />;
            default:
                return <Info fontSize="small" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'system':
                return 'primary';
            case 'user':
                return 'secondary';
            case 'admin':
                return 'error';
            case 'billing':
                return 'warning';
            case 'backup':
                return 'info';
            case 'security':
                return 'error';
            case 'certificates':
                return 'success';
            case 'reminders':
                return 'info';
            default:
                return 'default';
        }
    };

    const getFrequencyDescription = (frequency: string) => {
        switch (frequency) {
            case 'immediate':
                return 'Receive notifications immediately';
            case 'daily':
                return 'Receive daily digest';
            case 'weekly':
                return 'Receive weekly digest';
            case 'monthly':
                return 'Receive monthly digest';
            case 'disabled':
                return 'Notifications disabled';
            default:
                return 'Immediate notifications';
        }
    };

    // Group preferences by category
    const groupedPreferences = localPreferences.reduce((acc, pref) => {
        if (!acc[pref.category]) {
            acc[pref.category] = [];
        }
        acc[pref.category].push(pref);
        return acc;
    }, {} as Record<string, NotificationPreference[]>);

    if (loading) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Loading notification preferences...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Notification Preferences
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Customize how and when you receive notifications for different types of events.
            </Typography>

            {message && (
                <Alert
                    severity={message.type}
                    sx={{ mb: 3 }}
                    onClose={() => setMessage(null)}
                >
                    {message.text}
                </Alert>
            )}

            {/* Action Buttons */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                        variant="outlined"
                        startIcon={<RestoreFromTrash />}
                        onClick={handleReset}
                        disabled={!hasChanges || saving}
                    >
                        Reset Changes
                    </Button>
                    <LoadingButton
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSave}
                        loading={saving}
                        disabled={!hasChanges}
                    >
                        Save Preferences
                    </LoadingButton>
                </Stack>
            </Paper>

            {/* Preferences by Category */}
            {Object.entries(groupedPreferences).map(([category, categoryPreferences]) => (
                <Accordion key={category} defaultExpanded sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            {getCategoryIcon(category)}
                            <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                                {category} Notifications
                            </Typography>
                            <Chip
                                size="small"
                                label={`${categoryPreferences.length} types`}
                                color={getCategoryColor(category) as any}
                                variant="outlined"
                            />
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            {categoryPreferences.map((pref) => (
                                <Grid item xs={12} key={pref.type_name}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Stack spacing={2}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                                    {pref.type_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </Typography>

                                                {/* Delivery Methods */}
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                        Delivery Methods
                                                    </Typography>
                                                    <FormGroup row>
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    checked={pref.in_app_enabled}
                                                                    onChange={(e) => handlePreferenceChange(pref.type_name, 'in_app_enabled', e.target.checked)}
                                                                    color="primary"
                                                                />
                                                            }
                                                            label={
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    <NotificationsActive fontSize="small" />
                                                                    <Typography variant="body2">In-App</Typography>
                                                                </Stack>
                                                            }
                                                        />
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    checked={pref.email_enabled}
                                                                    onChange={(e) => handlePreferenceChange(pref.type_name, 'email_enabled', e.target.checked)}
                                                                    color="primary"
                                                                />
                                                            }
                                                            label={
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    <Email fontSize="small" />
                                                                    <Typography variant="body2">Email</Typography>
                                                                </Stack>
                                                            }
                                                        />
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    checked={pref.push_enabled}
                                                                    onChange={(e) => handlePreferenceChange(pref.type_name, 'push_enabled', e.target.checked)}
                                                                    color="primary"
                                                                />
                                                            }
                                                            label={
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    <PhoneAndroid fontSize="small" />
                                                                    <Typography variant="body2">Push</Typography>
                                                                </Stack>
                                                            }
                                                        />
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    checked={pref.sms_enabled}
                                                                    onChange={(e) => handlePreferenceChange(pref.type_name, 'sms_enabled', e.target.checked)}
                                                                    color="primary"
                                                                />
                                                            }
                                                            label={
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    <Sms fontSize="small" />
                                                                    <Typography variant="body2">SMS</Typography>
                                                                </Stack>
                                                            }
                                                        />
                                                    </FormGroup>
                                                </Box>

                                                {/* Frequency */}
                                                <Box>
                                                    <FormControl size="small" sx={{ minWidth: 200 }}>
                                                        <InputLabel>Frequency</InputLabel>
                                                        <Select
                                                            value={pref.frequency}
                                                            label="Frequency"
                                                            onChange={(e) => handlePreferenceChange(pref.type_name, 'frequency', e.target.value)}
                                                        >
                                                            <MenuItem value="immediate">Immediate</MenuItem>
                                                            <MenuItem value="daily">Daily</MenuItem>
                                                            <MenuItem value="weekly">Weekly</MenuItem>
                                                            <MenuItem value="monthly">Monthly</MenuItem>
                                                            <MenuItem value="disabled">Disabled</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                        {getFrequencyDescription(pref.frequency)}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            ))}

            {/* Information Card */}
            <Card sx={{ mt: 3 }}>
                <CardHeader
                    avatar={<Info color="primary" />}
                    title="About Notification Preferences"
                />
                <CardContent>
                    <List dense>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary="In-App Notifications"
                                secondary="Appear in the notification dropdown and are stored until dismissed"
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Email Notifications"
                                secondary="Sent to your registered email address"
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Push Notifications"
                                secondary="Browser notifications when the app is open"
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <Warning color="warning" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary="SMS Notifications"
                                secondary="Currently not implemented - coming soon"
                            />
                        </ListItem>
                    </List>
                </CardContent>
            </Card>
        </Box>
    );
};

export default NotificationPreferences;
