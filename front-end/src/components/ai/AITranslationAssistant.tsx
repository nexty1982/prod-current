// AI Translation Assistant Component for Admin Interface
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
    Chip,
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
    LinearProgress,
    Switch,
    FormControlLabel,
    Grid,
} from '@mui/material';
import {
    IconLanguage,
    IconTransform,
    IconCopy,
    IconDownload,
    IconX,
    IconCheck,
    IconAlertTriangle,
    IconBrain,
    IconEye,
    IconRefresh,
    IconHistory,
} from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { aiService, AITranslationRequest, AITranslationResponse } from '../../services/aiService.ts';

interface TranslationQualityDisplayProps {
    quality: {
        fluency: number;
        accuracy: number;
        cultural_appropriateness: number;
    };
}

const TranslationQualityDisplay: React.FC<TranslationQualityDisplayProps> = ({ quality }) => {
    const getQualityColor = (score: number) => {
        if (score >= 0.8) return 'success';
        if (score >= 0.6) return 'warning';
        return 'error';
    };

    const qualityMetrics = [
        { label: 'Fluency', value: quality.fluency },
        { label: 'Accuracy', value: quality.accuracy },
        { label: 'Cultural Appropriateness', value: quality.cultural_appropriateness },
    ];

    return (
        <Box>
            <Typography variant="subtitle2" mb={2} display="flex" alignItems="center" gap={1}>
                <IconBrain size={16} />
                Translation Quality Assessment
            </Typography>
            <Stack spacing={2}>
                {qualityMetrics.map((metric) => (
                    <Box key={metric.label}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Typography variant="body2">{metric.label}</Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {Math.round(metric.value * 100)}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={metric.value * 100}
                            color={getQualityColor(metric.value) as any}
                            sx={{ height: 6, borderRadius: 3 }}
                        />
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

interface TranslationHistoryItem {
    id: string;
    source_text: string;
    translated_text: string;
    source_language: string;
    target_language: string;
    timestamp: string;
    confidence: number;
}

export const AITranslationAssistant: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [request, setRequest] = useState<AITranslationRequest>({
        text: '',
        source_language: 'auto',
        target_language: 'el',
        preserve_formatting: true,
    });
    const [translationResult, setTranslationResult] = useState<AITranslationResponse | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    // Mock history - in real implementation, this would come from an API
    const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>([]);

    const translateMutation = useMutation({
        mutationFn: (req: AITranslationRequest) => aiService.translateText(req),
        onSuccess: (data) => {
            setTranslationResult(data);
            // Add to history
            const historyItem: TranslationHistoryItem = {
                id: Date.now().toString(),
                source_text: request.text,
                translated_text: data.translated_text,
                source_language: data.detected_language || request.source_language || 'auto',
                target_language: request.target_language,
                timestamp: new Date().toISOString(),
                confidence: data.confidence_score,
            };
            setTranslationHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Keep last 10
        },
    });

    const handleTranslate = () => {
        if (request.text.trim()) {
            translateMutation.mutate(request);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleDownload = () => {
        if (translationResult) {
            const data = {
                original_text: request.text,
                translated_text: translationResult.translated_text,
                source_language: translationResult.detected_language || request.source_language,
                target_language: request.target_language,
                confidence_score: translationResult.confidence_score,
                quality_assessment: translationResult.quality_assessment,
                translated_at: new Date().toISOString(),
                settings: {
                    preserve_formatting: request.preserve_formatting,
                },
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `translation-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const loadHistoryItem = (item: TranslationHistoryItem) => {
        setRequest({
            text: item.source_text,
            source_language: item.source_language,
            target_language: item.target_language,
            preserve_formatting: true,
        });
        setTranslationResult({
            translated_text: item.translated_text,
            confidence_score: item.confidence,
            quality_assessment: {
                fluency: 0.9,
                accuracy: 0.85,
                cultural_appropriateness: 0.92,
            },
        });
        setShowHistory(false);
    };

    const languages = [
        { value: 'auto', label: 'Auto-detect' },
        { value: 'en', label: 'English' },
        { value: 'el', label: 'Greek (Ελληνικά)' },
        { value: 'ru', label: 'Russian (Русский)' },
        { value: 'sr', label: 'Serbian (Српски)' },
        { value: 'bg', label: 'Bulgarian (Български)' },
        { value: 'ro', label: 'Romanian (Română)' },
        { value: 'ar', label: 'Arabic (العربية)' },
        { value: 'he', label: 'Hebrew (עברית)' },
        { value: 'es', label: 'Spanish (Español)' },
        { value: 'fr', label: 'French (Français)' },
        { value: 'de', label: 'German (Deutsch)' },
        { value: 'it', label: 'Italian (Italiano)' },
    ];

    const commonTexts = [
        'Welcome to our Orthodox Church',
        'Sunday Divine Liturgy at 10:00 AM',
        'Please join us for fellowship after service',
        'Orthodox Christmas celebration details',
        'Confession available before Liturgy',
    ];

    return (
        <>
            <Button
                variant="contained"
                startIcon={<IconLanguage />}
                onClick={() => setOpen(true)}
                sx={{ mb: 2 }}
            >
                AI Translation Assistant
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconLanguage size={24} />
                            AI Translation Assistant
                        </Box>
                        <IconButton onClick={() => setShowHistory(!showHistory)}>
                            <IconHistory size={20} />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Grid container spacing={3}>
                        {/* Main Translation Interface */}
                        <Grid item xs={12} md={showHistory ? 8 : 12}>
                            <Stack spacing={3}>
                                {/* Language Selection */}
                                <Box display="flex" gap={2}>
                                    <FormControl fullWidth>
                                        <InputLabel>From Language</InputLabel>
                                        <Select
                                            value={request.source_language}
                                            label="From Language"
                                            onChange={(e) => setRequest({ ...request, source_language: e.target.value })}
                                        >
                                            {languages.map((lang) => (
                                                <MenuItem key={lang.value} value={lang.value}>
                                                    {lang.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <IconButton
                                        onClick={() => {
                                            if (request.source_language !== 'auto') {
                                                setRequest({
                                                    ...request,
                                                    source_language: request.target_language,
                                                    target_language: request.source_language,
                                                });
                                            }
                                        }}
                                        disabled={request.source_language === 'auto'}
                                    >
                                        <IconTransform size={20} />
                                    </IconButton>

                                    <FormControl fullWidth>
                                        <InputLabel>To Language</InputLabel>
                                        <Select
                                            value={request.target_language}
                                            label="To Language"
                                            onChange={(e) => setRequest({ ...request, target_language: e.target.value })}
                                        >
                                            {languages.filter(lang => lang.value !== 'auto').map((lang) => (
                                                <MenuItem key={lang.value} value={lang.value}>
                                                    {lang.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                {/* Settings */}
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={request.preserve_formatting}
                                            onChange={(e) => setRequest({ ...request, preserve_formatting: e.target.checked })}
                                        />
                                    }
                                    label="Preserve formatting and structure"
                                />

                                {/* Common Texts */}
                                <Box>
                                    <Typography variant="subtitle2" mb={1}>
                                        Quick Translations:
                                    </Typography>
                                    <Box display="flex" gap={1} flexWrap="wrap">
                                        {commonTexts.map((text, index) => (
                                            <Chip
                                                key={index}
                                                label={text}
                                                variant="outlined"
                                                onClick={() => setRequest({ ...request, text })}
                                                sx={{ cursor: 'pointer' }}
                                            />
                                        ))}
                                    </Box>
                                </Box>

                                {/* Input Text */}
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={6}
                                    label="Text to translate"
                                    placeholder="Enter the text you want to translate..."
                                    value={request.text}
                                    onChange={(e) => setRequest({ ...request, text: e.target.value })}
                                />

                                {/* Error Display */}
                                {translateMutation.isError && (
                                    <Alert severity="error">
                                        {translateMutation.error?.message || 'Translation failed'}
                                    </Alert>
                                )}

                                {/* Translation Result */}
                                {translationResult && (
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                                                    <IconCheck size={20} />
                                                    Translation Result
                                                </Typography>
                                                <Box display="flex" gap={1}>
                                                    <Chip
                                                        size="small"
                                                        label={`${Math.round(translationResult.confidence_score * 100)}% confidence`}
                                                        color={translationResult.confidence_score >= 0.8 ? 'success' : 'warning'}
                                                        variant="outlined"
                                                    />
                                                    {translationResult.detected_language && (
                                                        <Chip
                                                            size="small"
                                                            label={`Detected: ${translationResult.detected_language}`}
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    <Tooltip title="Copy Translation">
                                                        <IconButton onClick={() => handleCopy(translationResult.translated_text)} size="small">
                                                            <IconCopy size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Download Results">
                                                        <IconButton onClick={handleDownload} size="small">
                                                            <IconDownload size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>

                                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                                                <Typography
                                                    variant="body1"
                                                    sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                                                >
                                                    {translationResult.translated_text}
                                                </Typography>
                                            </Paper>

                                            <TranslationQualityDisplay quality={translationResult.quality_assessment} />
                                        </CardContent>
                                    </Card>
                                )}
                            </Stack>
                        </Grid>

                        {/* Translation History */}
                        {showHistory && (
                            <Grid item xs={12} md={4}>
                                <Card variant="outlined" sx={{ height: 'fit-content' }}>
                                    <CardContent>
                                        <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
                                            <IconHistory size={20} />
                                            Recent Translations
                                        </Typography>

                                        {translationHistory.length === 0 ? (
                                            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                                                No translation history yet
                                            </Typography>
                                        ) : (
                                            <Stack spacing={1}>
                                                {translationHistory.map((item) => (
                                                    <Paper
                                                        key={item.id}
                                                        variant="outlined"
                                                        sx={{ p: 1, cursor: 'pointer', ':hover': { bgcolor: 'grey.50' } }}
                                                        onClick={() => loadHistoryItem(item)}
                                                    >
                                                        <Typography variant="caption" color="text.secondary">
                                                            {item.source_language} → {item.target_language}
                                                        </Typography>
                                                        <Typography variant="body2" noWrap>
                                                            {item.source_text.substring(0, 50)}...
                                                        </Typography>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {new Date(item.timestamp).toLocaleDateString()}
                                                            </Typography>
                                                            <Chip
                                                                size="small"
                                                                label={`${Math.round(item.confidence * 100)}%`}
                                                                variant="outlined"
                                                            />
                                                        </Box>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpen(false)} startIcon={<IconX />}>
                        Close
                    </Button>
                    <Button
                        onClick={handleTranslate}
                        variant="contained"
                        disabled={!request.text.trim() || translateMutation.isPending}
                        startIcon={
                            translateMutation.isPending ? (
                                <CircularProgress size={16} />
                            ) : (
                                <IconLanguage />
                            )
                        }
                    >
                        {translateMutation.isPending ? 'Translating...' : 'Translate'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AITranslationAssistant;
