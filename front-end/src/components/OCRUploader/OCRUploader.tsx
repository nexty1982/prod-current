import React, { useState, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    IconButton,
    Chip,
    LinearProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Switch,
    FormControlLabel,
    Divider,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    CloudUpload,
    Close,
    Download,
    FilePresent,
    Error,
    CheckCircle,
    AccessTime,
    Language,
    Email,
    Speed,
    Visibility,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useOCR } from '../../context/OCRContext';
import BarcodeScannerModal from './BarcodeScannerModal';
import DisclaimerModal from './DisclaimerModal';
import UploadStatus from './UploadStatus';

interface OCRUploaderProps {
    onUploadComplete?: (results: any[]) => void;
    maxFiles?: number;
    maxFileSize?: number;
    defaultLanguage?: string;
    showLanguageSelector?: boolean;
    allowMultipleFiles?: boolean;
    showPreview?: boolean;
    className?: string;
}

const OCRUploader: React.FC<OCRUploaderProps> = ({
    onUploadComplete,
    maxFiles = 10,
    maxFileSize = 20 * 1024 * 1024, // 20MB
    defaultLanguage = 'en',
    showLanguageSelector = true,
    allowMultipleFiles = true,
    showPreview = true,
    className,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const {
        session,
        files,
        config,
        languages,
        loading,
        error,
        createSession,
        addFiles,
        removeFile,
        clearFiles,
        startUpload,
        downloadResults,
        estimateProcessingTime,
        validateFile,
    } = useOCR();

    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
    const [processingTier, setProcessingTier] = useState<'standard' | 'express'>('standard');
    const [email, setEmail] = useState('');
    const [sendEmail, setSendEmail] = useState(false);

    // Dropzone configuration (Updated for Production Testing)
    const onDrop = useCallback((acceptedFiles: File[]) => {
        // For production testing, directly add files without session verification
        addFiles(acceptedFiles);
    }, [addFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg'],
            'application/pdf': ['.pdf'],
        },
        maxFiles: allowMultipleFiles ? maxFiles : 1,
        maxSize: maxFileSize,
        disabled: false, // Allow uploads without session verification for production testing
    });

    // Handle secure upload start
    const handleStartSecureUpload = async () => {
        try {
            await createSession();
            setShowBarcodeModal(true);
        } catch (error) {
            console.error('Failed to create session:', error);
        }
    };

    // Handle barcode scan complete
    const handleBarcodeComplete = () => {
        setShowBarcodeModal(false);
        setShowDisclaimerModal(true);
    };

    // Handle disclaimer acceptance
    const handleDisclaimerAccept = () => {
        setShowDisclaimerModal(false);
    };

    // Handle upload start
    const handleUploadStart = async () => {
        try {
            console.log('=== OCR Upload Start Debug ===');
            console.log('Session state:', session);
            console.log('Files state:', files);
            console.log('Loading state:', loading);

            await startUpload();

            // Monitor for completion
            const completedResults = files
                .filter(f => f.status === 'completed')
                .map(f => f.results);

            console.log('Completed results:', completedResults);

            if (completedResults.length > 0 && onUploadComplete) {
                onUploadComplete(completedResults);
            }
        } catch (error) {
            console.error('Upload failed in handleUploadStart:', error);
        }
    };

    // Handle file download
    const handleDownload = (fileId: string, format: 'pdf' | 'xlsx') => {
        downloadResults(fileId, format);
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format time
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'default';
            case 'uploading': return 'info';
            case 'processing': return 'warning';
            case 'completed': return 'success';
            case 'error': return 'error';
            default: return 'default';
        }
    };

    // Get status icon
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <AccessTime />;
            case 'uploading': return <CloudUpload />;
            case 'processing': return <Speed />;
            case 'completed': return <CheckCircle />;
            case 'error': return <Error />;
            default: return <FilePresent />;
        }
    };

    return (
        <Box className={className}>
            <Card>
                <CardContent>
                    {/* Header */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h5" component="h2" gutterBottom>
                            Secure OCR Upload
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Upload images or PDFs for optical character recognition (OCR) processing
                        </Typography>
                    </Box>

                    {/* Error Alert */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Session Status */}
                    {session && (
                        <Box sx={{ mb: 3 }}>
                            <Alert
                                severity={session.verified ? 'success' : 'warning'}
                                sx={{ mb: 2 }}
                            >
                                {session.verified ? (
                                    <>
                                        Secure session verified. Session expires in {formatTime(Math.floor(session.remainingTime / 1000))}
                                    </>
                                ) : (
                                    'Please scan the QR code to verify your session'
                                )}
                            </Alert>
                        </Box>
                    )}

                    {/* Upload Area - Production Testing Mode */}
                    {/* Simplified upload without session verification */}
                    <>
                        {/* Settings */}
                        <Box sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                                {showLanguageSelector && (
                                    <Grid item xs={12} sm={6} md={4}>
                                        <FormControl fullWidth>
                                            <InputLabel>OCR Language</InputLabel>
                                            <Select
                                                value={selectedLanguage}
                                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                                startAdornment={<Language />}
                                            >
                                                {languages.map((lang) => (
                                                    <MenuItem key={lang.code} value={lang.code}>
                                                        {lang.flag} {lang.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                )}

                                <Grid item xs={12} sm={6} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Processing Tier</InputLabel>
                                        <Select
                                            value={processingTier}
                                            onChange={(e) => setProcessingTier(e.target.value as 'standard' | 'express')}
                                            startAdornment={<Speed />}
                                        >
                                            <MenuItem value="standard">
                                                Standard (Free)
                                            </MenuItem>
                                            <MenuItem value="express">
                                                Express (Premium)
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={sendEmail}
                                                onChange={(e) => setSendEmail(e.target.checked)}
                                            />
                                        }
                                        label="Email Results"
                                    />
                                    {sendEmail && (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Enter email address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                </Grid>
                            </Grid>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        {/* Drop Zone */}
                        <Box
                            {...getRootProps()}
                            sx={{
                                border: '2px dashed',
                                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                                borderRadius: 2,
                                p: 3,
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: isDragActive ? 'action.hover' : 'background.default',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: 'action.hover',
                                    borderColor: 'primary.main',
                                },
                            }}
                        >
                            <input {...getInputProps()} />
                            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                or click to browse files
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                Supported formats: PNG, JPG, JPEG, PDF • Max size: {formatFileSize(maxFileSize)}
                            </Typography>
                        </Box>

                        {/* File List */}
                        {files.length > 0 && (
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Files ({files.length})
                                    {files.length > 0 && (
                                        <Button
                                            size="small"
                                            onClick={clearFiles}
                                            sx={{ ml: 2 }}
                                        >
                                            Clear All
                                        </Button>
                                    )}
                                </Typography>

                                <Grid container spacing={2}>
                                    {files.map((file) => (
                                        <Grid item xs={12} key={file.id}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                        {getStatusIcon(file.status)}
                                                        <Box sx={{ ml: 2, flex: 1 }}>
                                                            <Typography variant="subtitle2" noWrap>
                                                                {file.file.name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {formatFileSize(file.file.size)}
                                                            </Typography>
                                                        </Box>
                                                        <Chip
                                                            size="small"
                                                            label={file.status}
                                                            color={getStatusColor(file.status) as any}
                                                            sx={{ mr: 1 }}
                                                        />
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => removeFile(file.id)}
                                                            disabled={file.status === 'uploading' || file.status === 'processing'}
                                                        >
                                                            <Close />
                                                        </IconButton>
                                                    </Box>

                                                    {(file.status === 'uploading' || file.status === 'processing') && (
                                                        <LinearProgress
                                                            value={file.progress}
                                                            variant={file.status === 'processing' ? 'indeterminate' : 'determinate'}
                                                            sx={{ mb: 1 }}
                                                        />
                                                    )}

                                                    {file.error && (
                                                        <Alert severity="error" sx={{ mt: 1 }}>
                                                            {file.error}
                                                        </Alert>
                                                    )}

                                                    {file.results && (
                                                        <Box sx={{ mt: 2 }}>
                                                            <Typography variant="body2" gutterBottom>
                                                                <strong>Extracted Text:</strong> {file.results.text.substring(0, 100)}...
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Confidence: {(file.results.confidence * 100).toFixed(1)}% •
                                                                Pages: {file.results.pages}
                                                            </Typography>
                                                            <Box sx={{ mt: 1 }}>
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => handleDownload(file.id, 'pdf')}
                                                                    startIcon={<Download />}
                                                                    sx={{ mr: 1 }}
                                                                >
                                                                    PDF
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => handleDownload(file.id, 'xlsx')}
                                                                    startIcon={<Download />}
                                                                >
                                                                    XLSX
                                                                </Button>
                                                            </Box>
                                                        </Box>
                                                    )}

                                                    {showPreview && file.preview && (
                                                        <Box sx={{ mt: 2 }}>
                                                            <img
                                                                src={file.preview}
                                                                alt="Preview"
                                                                style={{
                                                                    maxWidth: '100%',
                                                                    maxHeight: '200px',
                                                                    objectFit: 'contain',
                                                                }}
                                                            />
                                                        </Box>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* Processing Summary */}
                                <Box sx={{ mt: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Estimated processing time: {formatTime(estimateProcessingTime(files))}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={handleUploadStart}
                                        disabled={loading || files.length === 0}
                                        startIcon={<CloudUpload />}
                                    >
                                        Start OCR Processing
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <BarcodeScannerModal
                open={showBarcodeModal}
                onClose={() => setShowBarcodeModal(false)}
                onComplete={handleBarcodeComplete}
                session={session}
            />

            <DisclaimerModal
                open={showDisclaimerModal}
                onClose={() => setShowDisclaimerModal(false)}
                onAccept={handleDisclaimerAccept}
                language={selectedLanguage}
                email={email}
                processingTier={processingTier}
            />

            {/* Status Component */}
            <UploadStatus files={files} />
        </Box>
    );
};

export default OCRUploader;
