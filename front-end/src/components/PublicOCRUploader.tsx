// Public OCR Upload Component for Token-based uploads
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    LinearProgress,
    Chip,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Divider,
} from '@mui/material';
import { CloudUpload, CheckCircle, Error, AccessTime } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface TokenData {
    church_id: number;
    language: string;
    record_type: string;
    created_by: number;
    created_at: string;
}

interface UploadedFile {
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    progress: number;
    result?: any;
    error?: string;
}

const PublicOCRUploader: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [tokenValid, setTokenValid] = useState<boolean | null>(null);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [submittedBy, setSubmittedBy] = useState('');

    // Verify token on component mount
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setTokenValid(false);
                return;
            }

            try {
                const response = await fetch(`/api/upload/verify-upload-token/${token}`);
                const data = await response.json();

                if (data.success) {
                    setTokenData(data.payload);
                    setSelectedLanguage(data.payload.language || 'en');
                    setTokenValid(true);
                    console.log('Token verified:', data.payload);
                } else {
                    setTokenValid(false);
                    console.error('Token verification failed:', data.message);
                }
            } catch (error) {
                setTokenValid(false);
                console.error('Token verification error:', error);
            }
        };

        verifyToken();
    }, [token]);

    // Dropzone configuration
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles: File[]) => {
            const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                status: 'pending',
                progress: 0
            }));
            setFiles(prev => [...prev, ...newFiles]);
        },
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.gif', '.webp'],
            'application/pdf': ['.pdf']
        },
        maxFiles: 10,
        maxSize: 20 * 1024 * 1024 // 20MB
    });

    // Remove file
    const removeFile = (fileId: string) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    // Start upload process
    const startUpload = async () => {
        if (!tokenData || files.length === 0) return;

        setUploading(true);

        for (const file of files) {
            if (file.status === 'completed') continue;

            // Update status to uploading
            setFiles(prev => prev.map(f =>
                f.id === file.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
            ));

            try {
                const formData = new FormData();
                formData.append('file', file.file);
                formData.append('church_id', tokenData.church_id.toString());
                formData.append('language', selectedLanguage);
                formData.append('record_type', tokenData.record_type);
                formData.append('submitted_by', submittedBy || 'Public Upload');

                // Use public OCR endpoint with token
                const response = await fetch(`/api/public-ocr-${selectedLanguage}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Upload failed: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    setFiles(prev => prev.map(f =>
                        f.id === file.id ? {
                            ...f,
                            status: 'completed' as const,
                            progress: 100,
                            result: result.data
                        } : f
                    ));
                } else {
                    throw new Error(result.message || 'Upload failed');
                }

            } catch (error) {
                console.error('Upload error:', error);
                setFiles(prev => prev.map(f =>
                    f.id === file.id ? {
                        ...f,
                        status: 'error' as const,
                        error: error instanceof Error ? error.message : 'Upload failed'
                    } : f
                ));
            }
        }

        setUploading(false);
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'default';
            case 'uploading': return 'info';
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
            case 'completed': return <CheckCircle />;
            case 'error': return <Error />;
            default: return <AccessTime />;
        }
    };

    // Loading state
    if (tokenValid === null) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <LinearProgress sx={{ width: '50%' }} />
            </Box>
        );
    }

    // Invalid token
    if (tokenValid === false) {
        return (
            <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
                <Alert severity="error">
                    <Typography variant="h6">Invalid or Expired Upload Link</Typography>
                    <Typography>
                        This upload link is invalid or has expired. Please contact your administrator for a new link.
                    </Typography>
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
            <Card>
                <CardContent>
                    {/* Header */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            Document Upload
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Upload documents for OCR processing
                        </Typography>
                        {tokenData && (
                            <Box sx={{ mt: 2 }}>
                                <Chip label={`Church ID: ${tokenData.church_id}`} size="small" sx={{ mr: 1 }} />
                                <Chip label={`Type: ${tokenData.record_type}`} size="small" sx={{ mr: 1 }} />
                                <Chip label={`Language: ${tokenData.language}`} size="small" />
                            </Box>
                        )}
                    </Box>

                    {/* Upload Settings */}
                    <Box sx={{ mb: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>OCR Language</InputLabel>
                                    <Select
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                    >
                                        <MenuItem value="en">🇺🇸 English</MenuItem>
                                        <MenuItem value="gr">🇬🇷 Greek</MenuItem>
                                        <MenuItem value="ru">🇷🇺 Russian</MenuItem>
                                        <MenuItem value="ro">🇷🇴 Romanian</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Submitted By (Optional)"
                                    value={submittedBy}
                                    onChange={(e) => setSubmittedBy(e.target.value)}
                                    placeholder="Your name or identifier"
                                />
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
                            Supported formats: PNG, JPG, JPEG, TIFF, GIF, WEBP, PDF • Max size: 20MB
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
                                        onClick={() => setFiles([])}
                                        sx={{ ml: 2 }}
                                        disabled={uploading}
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
                                                    <Button
                                                        size="small"
                                                        onClick={() => removeFile(file.id)}
                                                        disabled={file.status === 'uploading'}
                                                    >
                                                        Remove
                                                    </Button>
                                                </Box>

                                                {file.status === 'uploading' && (
                                                    <LinearProgress sx={{ mb: 1 }} />
                                                )}

                                                {file.error && (
                                                    <Alert severity="error" sx={{ mt: 1 }}>
                                                        {file.error}
                                                    </Alert>
                                                )}

                                                {file.result && (
                                                    <Box sx={{ mt: 2 }}>
                                                        <Typography variant="body2" gutterBottom>
                                                            <strong>Extracted Text:</strong>
                                                        </Typography>
                                                        <Typography variant="body2" sx={{
                                                            backgroundColor: 'grey.100',
                                                            p: 1,
                                                            borderRadius: 1,
                                                            maxHeight: 200,
                                                            overflow: 'auto'
                                                        }}>
                                                            {file.result.extracted_text || 'No text extracted'}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                            Confidence: {((file.result.confidence || 0) * 100).toFixed(1)}% •
                                                            Words: {file.result.word_count || 0} •
                                                            Job ID: {file.result.id}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Upload Button */}
                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={startUpload}
                                    disabled={uploading || files.length === 0 || files.every(f => f.status === 'completed')}
                                    startIcon={<CloudUpload />}
                                >
                                    {uploading ? 'Processing...' : 'Start OCR Processing'}
                                </Button>
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default PublicOCRUploader;
