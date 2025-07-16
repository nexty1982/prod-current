import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Chip,
    Alert,
    Button,
    Grid,
    Collapse,
    IconButton,
    useTheme,
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    FilePresent,
    CloudUpload,
    Speed,
    CheckCircle,
    Error,
    AccessTime,
    Download,
    Visibility,
    Info,
} from '@mui/icons-material';
import { OCRFile } from '../../context/OCRContext';

interface UploadStatusProps {
    files: OCRFile[];
    showDetails?: boolean;
    onDownload?: (fileId: string, format: 'pdf' | 'xlsx') => void;
    onPreview?: (fileId: string) => void;
}

const UploadStatus: React.FC<UploadStatusProps> = ({
    files,
    showDetails = true,
    onDownload,
    onPreview,
}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = React.useState(true);

    // Filter files that have started processing
    const activeFiles = files.filter(f => f.status !== 'pending');

    if (activeFiles.length === 0) {
        return null;
    }

    // Get status statistics
    const stats = {
        total: activeFiles.length,
        uploading: activeFiles.filter(f => f.status === 'uploading').length,
        processing: activeFiles.filter(f => f.status === 'processing').length,
        completed: activeFiles.filter(f => f.status === 'completed').length,
        error: activeFiles.filter(f => f.status === 'error').length,
    };

    // Calculate overall progress
    const overallProgress = activeFiles.reduce((acc, file) => {
        if (file.status === 'completed') return acc + 100;
        if (file.status === 'processing') return acc + 90;
        if (file.status === 'uploading') return acc + file.progress;
        return acc;
    }, 0) / activeFiles.length;

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
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
            case 'uploading': return <CloudUpload />;
            case 'processing': return <Speed />;
            case 'completed': return <CheckCircle />;
            case 'error': return <Error />;
            default: return <FilePresent />;
        }
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Get overall status message
    const getOverallStatus = () => {
        if (stats.error > 0) {
            return `${stats.error} file${stats.error > 1 ? 's' : ''} failed`;
        }
        if (stats.processing > 0) {
            return `Processing ${stats.processing} file${stats.processing > 1 ? 's' : ''}...`;
        }
        if (stats.uploading > 0) {
            return `Uploading ${stats.uploading} file${stats.uploading > 1 ? 's' : ''}...`;
        }
        if (stats.completed === stats.total) {
            return 'All files completed successfully';
        }
        return 'Processing files...';
    };

    return (
        <Card sx={{ mt: 3 }}>
            <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Info sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            Upload Status
                        </Typography>
                    </Box>
                    {showDetails && (
                        <IconButton onClick={() => setExpanded(!expanded)}>
                            {expanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    )}
                </Box>

                {/* Overall Progress */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                            {getOverallStatus()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {Math.round(overallProgress)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={overallProgress}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                </Box>

                {/* Status Summary */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {stats.uploading > 0 && (
                        <Chip
                            size="small"
                            label={`${stats.uploading} Uploading`}
                            color="info"
                            icon={<CloudUpload />}
                        />
                    )}
                    {stats.processing > 0 && (
                        <Chip
                            size="small"
                            label={`${stats.processing} Processing`}
                            color="warning"
                            icon={<Speed />}
                        />
                    )}
                    {stats.completed > 0 && (
                        <Chip
                            size="small"
                            label={`${stats.completed} Completed`}
                            color="success"
                            icon={<CheckCircle />}
                        />
                    )}
                    {stats.error > 0 && (
                        <Chip
                            size="small"
                            label={`${stats.error} Error`}
                            color="error"
                            icon={<Error />}
                        />
                    )}
                </Box>

                {/* Detailed File List */}
                <Collapse in={expanded}>
                    <Grid container spacing={2}>
                        {activeFiles.map((file) => (
                            <Grid item xs={12} key={file.id}>
                                <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                                    <CardContent sx={{ py: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            {getStatusIcon(file.status)}
                                            <Box sx={{ ml: 2, flex: 1 }}>
                                                <Typography variant="subtitle2" noWrap>
                                                    {file.file.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatFileSize(file.file.size)}
                                                    {file.estimatedTime && (
                                                        <> • Est. {Math.round(file.estimatedTime / 60)}min</>
                                                    )}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                size="small"
                                                label={file.status}
                                                color={getStatusColor(file.status) as any}
                                            />
                                        </Box>

                                        {/* Progress Bar */}
                                        {(file.status === 'uploading' || file.status === 'processing') && (
                                            <Box sx={{ mb: 1 }}>
                                                <LinearProgress
                                                    value={file.progress}
                                                    variant={file.status === 'processing' ? 'indeterminate' : 'determinate'}
                                                    sx={{ height: 4, borderRadius: 2 }}
                                                />
                                                {file.status === 'uploading' && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {file.progress}% uploaded
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}

                                        {/* Error Message */}
                                        {file.error && (
                                            <Alert severity="error" sx={{ mt: 1 }}>
                                                {file.error}
                                            </Alert>
                                        )}

                                        {/* Results */}
                                        {file.results && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="body2" gutterBottom>
                                                    <strong>Text Preview:</strong>
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        p: 1,
                                                        backgroundColor: 'white',
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: 'grey.200',
                                                        maxHeight: 100,
                                                        overflow: 'auto',
                                                        mb: 1,
                                                    }}
                                                >
                                                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                                        {file.results.text.substring(0, 200)}
                                                        {file.results.text.length > 200 && '...'}
                                                    </Typography>
                                                </Box>

                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Confidence: {(file.results.confidence * 100).toFixed(1)}% •
                                                        Pages: {file.results.pages}
                                                    </Typography>
                                                    <Box>
                                                        {onPreview && (
                                                            <Button
                                                                size="small"
                                                                onClick={() => onPreview(file.id)}
                                                                startIcon={<Visibility />}
                                                                sx={{ mr: 1 }}
                                                            >
                                                                Preview
                                                            </Button>
                                                        )}
                                                        {onDownload && (
                                                            <>
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => onDownload(file.id, 'pdf')}
                                                                    startIcon={<Download />}
                                                                    sx={{ mr: 1 }}
                                                                >
                                                                    PDF
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => onDownload(file.id, 'xlsx')}
                                                                    startIcon={<Download />}
                                                                >
                                                                    XLSX
                                                                </Button>
                                                            </>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Collapse>

                {/* Success Message */}
                {stats.completed === stats.total && stats.total > 0 && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            <CheckCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
                            All {stats.total} file{stats.total > 1 ? 's' : ''} processed successfully!
                            You can now download your results.
                        </Typography>
                    </Alert>
                )}

                {/* Error Summary */}
                {stats.error > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            <Error sx={{ mr: 1, verticalAlign: 'middle' }} />
                            {stats.error} file{stats.error > 1 ? 's' : ''} failed to process.
                            Please check the individual file errors above and try again.
                        </Typography>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default UploadStatus;
