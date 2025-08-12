// Admin component for generating upload tokens
import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
} from '@mui/material';
import {
    Add,
    Link as LinkIcon,
    ContentCopy,
    QrCode,
    AccessTime
} from '@mui/icons-material';

interface GeneratedLink {
    url: string;
    token: string;
    church_id: number;
    language: string;
    record_type: string;
    expires_in: string;
    generated_at: string;
}

const UploadTokenManager: React.FC = () => {
    const [formData, setFormData] = useState({
        church_id: '',
        language: 'en',
        record_type: 'baptism',
        expires_in: '24h'
    });
    const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showQRDialog, setShowQRDialog] = useState(false);
    const [selectedLink, setSelectedLink] = useState<GeneratedLink | null>(null);

    // Generate new upload link
    const generateLink = async () => {
        if (!formData.church_id) {
            setError('Church ID is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/upload/upload-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    church_id: parseInt(formData.church_id),
                    language: formData.language,
                    record_type: formData.record_type,
                    expires_in: formData.expires_in
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to generate link: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const newLink: GeneratedLink = {
                    url: result.url,
                    token: result.token,
                    church_id: result.church_id,
                    language: result.language,
                    record_type: result.record_type,
                    expires_in: result.expires_in,
                    generated_at: new Date().toISOString()
                };

                setGeneratedLinks(prev => [newLink, ...prev]);

                // Reset form
                setFormData({
                    church_id: '',
                    language: 'en',
                    record_type: 'baptism',
                    expires_in: '24h'
                });

                console.log('Upload link generated:', newLink);
            } else {
                throw new Error(result.message || 'Failed to generate link');
            }

        } catch (err) {
            console.error('Error generating link:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate link');
        } finally {
            setLoading(false);
        }
    };

    // Copy link to clipboard
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // You could add a toast notification here
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    // Show QR code dialog
    const showQRCode = (link: GeneratedLink) => {
        setSelectedLink(link);
        setShowQRDialog(true);
    };

    // Format expiry time
    const formatExpiryTime = (expiresIn: string) => {
        const now = new Date();
        const expiry = new Date(now);

        if (expiresIn.endsWith('h')) {
            const hours = parseInt(expiresIn);
            expiry.setHours(expiry.getHours() + hours);
        } else if (expiresIn.endsWith('d')) {
            const days = parseInt(expiresIn);
            expiry.setDate(expiry.getDate() + days);
        }

        return expiry.toLocaleDateString() + ' ' + expiry.toLocaleTimeString();
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Upload Token Manager
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Generate secure upload links for churches to upload documents without requiring login
            </Typography>

            <Grid container spacing={3}>
                {/* Generation Form */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Generate New Upload Link
                            </Typography>

                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Church ID"
                                    type="number"
                                    value={formData.church_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, church_id: e.target.value }))}
                                    required
                                    fullWidth
                                />

                                <FormControl fullWidth>
                                    <InputLabel>Language</InputLabel>
                                    <Select
                                        value={formData.language}
                                        onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                                    >
                                        <MenuItem value="en">🇺🇸 English</MenuItem>
                                        <MenuItem value="gr">🇬🇷 Greek</MenuItem>
                                        <MenuItem value="ru">🇷🇺 Russian</MenuItem>
                                        <MenuItem value="ro">🇷🇴 Romanian</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth>
                                    <InputLabel>Record Type</InputLabel>
                                    <Select
                                        value={formData.record_type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, record_type: e.target.value }))}
                                    >
                                        <MenuItem value="baptism">Baptism</MenuItem>
                                        <MenuItem value="marriage">Marriage</MenuItem>
                                        <MenuItem value="funeral">Funeral</MenuItem>
                                        <MenuItem value="general">General</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth>
                                    <InputLabel>Expires In</InputLabel>
                                    <Select
                                        value={formData.expires_in}
                                        onChange={(e) => setFormData(prev => ({ ...prev, expires_in: e.target.value }))}
                                    >
                                        <MenuItem value="1h">1 Hour</MenuItem>
                                        <MenuItem value="6h">6 Hours</MenuItem>
                                        <MenuItem value="12h">12 Hours</MenuItem>
                                        <MenuItem value="24h">24 Hours (1 Day)</MenuItem>
                                        <MenuItem value="48h">48 Hours (2 Days)</MenuItem>
                                        <MenuItem value="72h">72 Hours (3 Days)</MenuItem>
                                        <MenuItem value="168h">1 Week</MenuItem>
                                    </Select>
                                </FormControl>

                                <Button
                                    variant="contained"
                                    onClick={generateLink}
                                    disabled={loading || !formData.church_id}
                                    startIcon={<Add />}
                                    size="large"
                                >
                                    {loading ? 'Generating...' : 'Generate Upload Link'}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Generated Links */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Generated Links ({generatedLinks.length})
                            </Typography>

                            {generatedLinks.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    No links generated yet. Create your first upload link using the form.
                                </Typography>
                            ) : (
                                <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                                    {generatedLinks.map((link, index) => (
                                        <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                                            <CardContent sx={{ pb: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                    <Box>
                                                        <Typography variant="subtitle2" gutterBottom>
                                                            Church {link.church_id} - {link.record_type}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                                            <Chip label={link.language.toUpperCase()} size="small" />
                                                            <Chip
                                                                label={`Expires: ${link.expires_in}`}
                                                                size="small"
                                                                icon={<AccessTime />}
                                                            />
                                                        </Box>
                                                    </Box>
                                                    <Box>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => copyToClipboard(link.url)}
                                                            title="Copy link"
                                                        >
                                                            <ContentCopy />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => showQRCode(link)}
                                                            title="Show QR code"
                                                        >
                                                            <QrCode />
                                                        </IconButton>
                                                    </Box>
                                                </Box>

                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    value={link.url}
                                                    readOnly
                                                    sx={{
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '0.75rem',
                                                            fontFamily: 'monospace'
                                                        }
                                                    }}
                                                />

                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                    Generated: {new Date(link.generated_at).toLocaleString()}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Expires: {formatExpiryTime(link.expires_in)}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* QR Code Dialog */}
            <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>QR Code for Upload Link</DialogTitle>
                <DialogContent>
                    {selectedLink && (
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Church {selectedLink.church_id} - {selectedLink.record_type} ({selectedLink.language})
                            </Typography>

                            {/* QR Code would be generated here using a QR code library */}
                            <Box sx={{
                                width: 200,
                                height: 200,
                                border: '1px dashed grey',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2
                            }}>
                                <Typography variant="body2" color="text.secondary">
                                    QR Code<br />
                                    (Install qrcode library)
                                </Typography>
                            </Box>

                            <TextField
                                fullWidth
                                size="small"
                                value={selectedLink.url}
                                readOnly
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                        textAlign: 'center'
                                    }
                                }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowQRDialog(false)}>Close</Button>
                    {selectedLink && (
                        <Button
                            onClick={() => copyToClipboard(selectedLink.url)}
                            startIcon={<ContentCopy />}
                        >
                            Copy Link
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UploadTokenManager;
