// AI OCR Document Processor Component for Admin Interface
import React, { useState, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Stack,
    Chip,
    LinearProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Tab,
    Tabs,
} from '@mui/material';
import {
    IconScan,
    IconUpload,
    IconFileText,
    IconCopy,
    IconDownload,
    IconEye,
    IconX,
    IconCheck,
    IconAlertTriangle,
    IconLanguage,
    IconSettings,
    IconBrain,
} from '@tabler/icons-react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { aiService, AIOCRResponse } from '../../services/aiService';

interface OCRResultDisplayProps {
    result: AIOCRResponse;
    onCopy: () => void;
    onDownload: () => void;
}

const OCRResultDisplay: React.FC<OCRResultDisplayProps> = ({ result, onCopy, onDownload }) => {
    const [activeTab, setActiveTab] = useState(0);

    const tabLabels = ['Extracted Text', 'Structured Data', 'Analysis'];

    return (
        <Box>
            {/* Result Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                    <IconFileText size={20} />
                    OCR Results
                </Typography>
                <Box display="flex" gap={1}>
                    <Chip
                        size="small"
                        label={`${Math.round(result.confidence * 100)}% confidence`}
                        color={result.confidence >= 0.8 ? 'success' : result.confidence >= 0.6 ? 'warning' : 'error'}
                        variant="outlined"
                    />
                    {result.detected_language && (
                        <Chip
                            size="small"
                            label={result.detected_language}
                            variant="outlined"
                            icon={<IconLanguage size={14} />}
                        />
                    )}
                    <Tooltip title="Copy to Clipboard">
                        <IconButton onClick={onCopy} size="small">
                            <IconCopy size={18} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Download Results">
                        <IconButton onClick={onDownload} size="small">
                            <IconDownload size={18} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Confidence Indicator */}
            <LinearProgress
                variant="determinate"
                value={result.confidence * 100}
                sx={{ mb: 2, height: 6, borderRadius: 3 }}
                color={result.confidence >= 0.8 ? 'success' : result.confidence >= 0.6 ? 'warning' : 'error'}
            />

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    variant="fullWidth"
                >
                    {tabLabels.map((label, index) => (
                        <Tab key={index} label={label} />
                    ))}
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <Paper variant="outlined" sx={{ p: 2, minHeight: 300 }}>
                {activeTab === 0 && (
                    <Typography
                        variant="body1"
                        sx={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                        }}
                    >
                        {result.extracted_text}
                    </Typography>
                )}

                {activeTab === 1 && result.structure && (
                    <Stack spacing={2}>
                        {result.structure.sections.map((section, index) => (
                            <Card key={index} variant="outlined">
                                <CardContent>
                                    <Box display="flex" justifyContent="between" alignItems="center" mb={1}>
                                        <Typography variant="subtitle2" color="primary">
                                            {section.type.toUpperCase()}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={`${Math.round(section.confidence * 100)}%`}
                                            variant="outlined"
                                        />
                                    </Box>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {section.content}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                )}

                {activeTab === 2 && (
                    <Stack spacing={2}>
                        <Alert severity="info" icon={<IconBrain />}>
                            <Typography variant="subtitle2">AI Analysis</Typography>
                            This document appears to contain {result.structure?.sections.length || 0} distinct sections
                            with an overall confidence of {Math.round(result.confidence * 100)}%.
                        </Alert>

                        {result.detected_language && (
                            <Alert severity="success">
                                <Typography variant="subtitle2">Language Detection</Typography>
                                Detected language: {result.detected_language}
                            </Alert>
                        )}

                        {result.confidence < 0.7 && (
                            <Alert severity="warning">
                                <Typography variant="subtitle2">Quality Notice</Typography>
                                Low confidence score detected. Consider improving image quality or adjusting OCR settings.
                            </Alert>
                        )}
                    </Stack>
                )}
            </Paper>
        </Box>
    );
};

export const AIOCRProcessor: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [ocrResult, setOcrResult] = useState<AIOCRResponse | null>(null);
    const [settings, setSettings] = useState({
        language: 'en',
        enhancement: true,
        output_format: 'structured' as 'text' | 'structured' | 'json',
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setOcrResult(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'],
            'application/pdf': ['.pdf'],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    const ocrMutation = useMutation({
        mutationFn: async (file: File) => {
            return aiService.processOCR(file, settings);
        },
        onSuccess: (data) => {
            setOcrResult(data);
        },
    });

    const handleProcess = () => {
        if (file) {
            ocrMutation.mutate(file);
        }
    };

    const handleCopy = () => {
        if (ocrResult) {
            navigator.clipboard.writeText(ocrResult.extracted_text);
        }
    };

    const handleDownload = () => {
        if (ocrResult) {
            const data = {
                extracted_text: ocrResult.extracted_text,
                confidence: ocrResult.confidence,
                detected_language: ocrResult.detected_language,
                structure: ocrResult.structure,
                processed_at: new Date().toISOString(),
                settings: settings,
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ocr-result-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const languages = [
        { value: 'en', label: 'English' },
        { value: 'el', label: 'Greek' },
        { value: 'ru', label: 'Russian' },
        { value: 'sr', label: 'Serbian' },
        { value: 'bg', label: 'Bulgarian' },
        { value: 'ro', label: 'Romanian' },
        { value: 'auto', label: 'Auto-detect' },
    ];

    const outputFormats = [
        { value: 'text', label: 'Plain Text' },
        { value: 'structured', label: 'Structured Data' },
        { value: 'json', label: 'JSON Format' },
    ];

    return (
        <>
            <Button
                variant="contained"
                startIcon={<IconScan />}
                onClick={() => setOpen(true)}
                sx={{ mb: 2 }}
            >
                AI OCR Processor
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconScan size={24} />
                        AI-Powered Document OCR
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={3}>
                        {/* Settings */}
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="subtitle1" mb={2} display="flex" alignItems="center" gap={1}>
                                    <IconSettings size={18} />
                                    OCR Settings
                                </Typography>

                                <Box display="flex" gap={2} flexWrap="wrap">
                                    <FormControl sx={{ minWidth: 120 }}>
                                        <InputLabel>Language</InputLabel>
                                        <Select
                                            value={settings.language}
                                            label="Language"
                                            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                        >
                                            {languages.map((lang) => (
                                                <MenuItem key={lang.value} value={lang.value}>
                                                    {lang.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl sx={{ minWidth: 140 }}>
                                        <InputLabel>Output Format</InputLabel>
                                        <Select
                                            value={settings.output_format}
                                            label="Output Format"
                                            onChange={(e) => setSettings({ ...settings, output_format: e.target.value as any })}
                                        >
                                            {outputFormats.map((format) => (
                                                <MenuItem key={format.value} value={format.value}>
                                                    {format.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.enhancement}
                                                onChange={(e) => setSettings({ ...settings, enhancement: e.target.checked })}
                                            />
                                        }
                                        label="AI Enhancement"
                                    />
                                </Box>
                            </CardContent>
                        </Card>

                        {/* File Upload */}
                        <Card variant="outlined">
                            <CardContent>
                                <Box
                                    {...getRootProps()}
                                    sx={{
                                        border: '2px dashed',
                                        borderColor: isDragActive ? 'primary.main' : 'grey.300',
                                        borderRadius: 2,
                                        p: 4,
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        bgcolor: isDragActive ? 'primary.50' : 'grey.50',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <input {...getInputProps()} />
                                    <IconUpload size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
                                    <Typography variant="h6" mb={1}>
                                        {isDragActive ? 'Drop the file here' : 'Drag & drop a document'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        Or click to select a file
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Supports: Images (PNG, JPG, GIF, BMP, TIFF) and PDF files up to 10MB
                                    </Typography>
                                </Box>

                                {file && (
                                    <Box mt={2} p={2} bgcolor="success.50" borderRadius={1}>
                                        <Typography variant="body2" display="flex" alignItems="center" gap={1}>
                                            <IconCheck size={16} />
                                            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>

                        {/* Error Display */}
                        {ocrMutation.isError && (
                            <Alert severity="error">
                                {ocrMutation.error?.message || 'Failed to process document'}
                            </Alert>
                        )}

                        {/* Processing Status */}
                        {ocrMutation.isPending && (
                            <Alert severity="info" icon={<CircularProgress size={20} />}>
                                AI is processing your document... This may take a few moments.
                            </Alert>
                        )}

                        {/* Results */}
                        {ocrResult && (
                            <OCRResultDisplay
                                result={ocrResult}
                                onCopy={handleCopy}
                                onDownload={handleDownload}
                            />
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpen(false)} startIcon={<IconX />}>
                        Close
                    </Button>
                    <Button
                        onClick={handleProcess}
                        variant="contained"
                        disabled={!file || ocrMutation.isPending}
                        startIcon={
                            ocrMutation.isPending ? (
                                <CircularProgress size={16} />
                            ) : (
                                <IconScan />
                            )
                        }
                    >
                        {ocrMutation.isPending ? 'Processing...' : 'Process Document'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AIOCRProcessor;
