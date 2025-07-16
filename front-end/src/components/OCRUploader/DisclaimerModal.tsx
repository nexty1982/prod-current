import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Switch,
    FormControlLabel,
    Alert,
    Checkbox,
    FormGroup,
    IconButton,
    Divider,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Close,
    Language,
    Email,
    Speed,
    Info,
    Warning,
    CheckCircle,
} from '@mui/icons-material';
import { useOCR } from '../../context/OCRContext';

interface DisclaimerModalProps {
    open: boolean;
    onClose: () => void;
    onAccept: () => void;
    language: string;
    email: string;
    processingTier: string;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
    open,
    onClose,
    onAccept,
    language: initialLanguage,
    email: initialEmail,
    processingTier: initialProcessingTier,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { disclaimers, languages, acceptDisclaimer, loading } = useOCR();

    const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
    const [email, setEmail] = useState(initialEmail);
    const [sendEmail, setSendEmail] = useState(false);
    const [processingTier, setProcessingTier] = useState(initialProcessingTier);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [acceptedProcessing, setAcceptedProcessing] = useState(false);

    // Get current disclaimer
    const currentDisclaimer = disclaimers.find(d => d.language === selectedLanguage) || disclaimers[0];

    // Handle acceptance
    const handleAccept = async () => {
        if (!acceptedTerms || !acceptedPrivacy || !acceptedProcessing) {
            return;
        }

        try {
            await acceptDisclaimer(
                selectedLanguage,
                sendEmail ? email : undefined,
                processingTier
            );
            onAccept();
        } catch (error) {
            console.error('Failed to accept disclaimer:', error);
        }
    };

    // Check if form is valid
    const isFormValid = acceptedTerms && acceptedPrivacy && acceptedProcessing &&
        (!sendEmail || (sendEmail && email.includes('@')));

    // Get processing tier info
    const getProcessingTierInfo = (tier: string) => {
        switch (tier) {
            case 'standard':
                return {
                    name: 'Standard Processing',
                    description: 'Free processing with standard queue priority',
                    estimatedTime: '5-15 minutes',
                    features: ['Basic OCR', 'Standard accuracy', 'PDF/XLSX export'],
                    price: 'Free',
                };
            case 'express':
                return {
                    name: 'Express Processing',
                    description: 'Premium processing with high priority queue',
                    estimatedTime: '1-3 minutes',
                    features: ['Enhanced OCR', 'Higher accuracy', 'PDF/XLSX export', 'Priority support'],
                    price: '$2.99 per document',
                };
            default:
                return null;
        }
    };

    const tierInfo = getProcessingTierInfo(processingTier);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Info sx={{ mr: 1 }} />
                        Terms & Processing Options
                    </Box>
                    <IconButton onClick={onClose}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ py: 1 }}>
                    {/* Language Selection */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            <Language sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Language & Processing Options
                        </Typography>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>OCR Language</InputLabel>
                            <Select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                            >
                                {languages.map((lang) => (
                                    <MenuItem key={lang.code} value={lang.code}>
                                        {lang.flag} {lang.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Processing Tier</InputLabel>
                            <Select
                                value={processingTier}
                                onChange={(e) => setProcessingTier(e.target.value)}
                            >
                                <MenuItem value="standard">Standard (Free)</MenuItem>
                                <MenuItem value="express">Express (Premium)</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Processing Tier Details */}
                        {tierInfo && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    {tierInfo.name} - {tierInfo.price}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    {tierInfo.description}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Estimated Time:</strong> {tierInfo.estimatedTime}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Features:</strong> {tierInfo.features.join(', ')}
                                </Typography>
                            </Alert>
                        )}

                        {/* Email Options */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={sendEmail}
                                    onChange={(e) => setSendEmail(e.target.checked)}
                                />
                            }
                            label="Email results when processing is complete"
                        />

                        {sendEmail && (
                            <TextField
                                fullWidth
                                label="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                required
                                sx={{ mt: 2 }}
                                startAdornment={<Email />}
                                helperText="You'll receive a download link when processing is complete"
                            />
                        )}
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Terms and Conditions */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Terms & Conditions
                        </Typography>

                        {currentDisclaimer && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    {currentDisclaimer.title}
                                </Typography>
                                <Box
                                    sx={{
                                        maxHeight: 200,
                                        overflow: 'auto',
                                        p: 2,
                                        backgroundColor: 'grey.50',
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'grey.200',
                                    }}
                                >
                                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                        {currentDisclaimer.content}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {/* Acceptance Checkboxes */}
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    />
                                }
                                label="I accept the Terms of Service and understand the OCR processing limitations"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={acceptedPrivacy}
                                        onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                                    />
                                }
                                label="I accept the Privacy Policy and consent to document processing"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={acceptedProcessing}
                                        onChange={(e) => setAcceptedProcessing(e.target.checked)}
                                    />
                                }
                                label="I understand that uploaded documents will be processed using third-party OCR services"
                            />
                        </FormGroup>
                    </Box>

                    {/* Important Notes */}
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            <strong>Important:</strong> Please ensure that documents do not contain sensitive personal information
                            such as social security numbers, credit card details, or other confidential data.
                            All uploaded documents are processed securely and deleted after processing is complete.
                        </Typography>
                    </Alert>

                    {/* Processing Information */}
                    <Alert severity="info">
                        <Typography variant="body2">
                            <strong>Processing Information:</strong> Your documents will be enhanced (grayscale conversion,
                            noise reduction, auto-orientation) and then processed using Google Vision OCR.
                            Results will be available for download in PDF and XLSX formats.
                        </Typography>
                    </Alert>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    onClick={handleAccept}
                    variant="contained"
                    disabled={!isFormValid || loading}
                    startIcon={<CheckCircle />}
                >
                    Accept & Continue
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DisclaimerModal;
