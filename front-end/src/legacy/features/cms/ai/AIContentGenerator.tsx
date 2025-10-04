// AI Content Generator Component for Admin Dashboard
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
} from '@mui/material';
import {
    IconRobot,
    IconFileText,
    IconCopy,
    IconDownload,
    IconRefresh,
    IconLanguage,
    IconBulb,
    IconCheck,
    IconX,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import aiService from '@/shared/lib/aiService';

interface AIContentGeneratorProps {
    onContentGenerated?: (content: string) => void;
    defaultContentType?: string;
    defaultContext?: string;
}

export const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({
    onContentGenerated,
    defaultContentType = 'documentation',
    defaultContext = '',
}) => {
    const [open, setOpen] = useState(false);
    const [request, setRequest] = useState<AIContentRequest>({
        content_type: defaultContentType as any,
        context: defaultContext,
        language: 'en',
        target_audience: 'admin',
    });
    const [generatedContent, setGeneratedContent] = useState<AIContentResponse | null>(null);

    const generateMutation = useMutation({
        mutationFn: (req: AIContentRequest) => aiService.generateContent(req),
        onSuccess: (data) => {
            setGeneratedContent(data);
            if (onContentGenerated) {
                onContentGenerated(data.content);
            }
        },
    });

    const handleGenerate = () => {
        generateMutation.mutate(request);
    };

    const handleCopy = () => {
        if (generatedContent) {
            navigator.clipboard.writeText(generatedContent.content);
        }
    };

    const handleDownload = () => {
        if (generatedContent) {
            const blob = new Blob([generatedContent.content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-generated-${request.content_type}-${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const contentTypes = [
        { value: 'documentation', label: 'Documentation' },
        { value: 'report', label: 'System Report' },
        { value: 'newsletter', label: 'Newsletter' },
        { value: 'announcement', label: 'Announcement' },
        { value: 'admin_guide', label: 'Admin Guide' },
    ];

    const languages = [
        { value: 'en', label: 'English' },
        { value: 'el', label: 'Greek' },
        { value: 'ru', label: 'Russian' },
        { value: 'sr', label: 'Serbian' },
        { value: 'bg', label: 'Bulgarian' },
        { value: 'ro', label: 'Romanian' },
    ];

    const audiences = [
        { value: 'admin', label: 'System Administrators' },
        { value: 'church_admin', label: 'Church Administrators' },
        { value: 'clergy', label: 'Clergy' },
        { value: 'parishioners', label: 'Parishioners' },
        { value: 'general', label: 'General Audience' },
    ];

    return (
        <>
            <Button
                variant="contained"
                startIcon={<IconRobot />}
                onClick={() => setOpen(true)}
                sx={{ mb: 2 }}
            >
                AI Content Generator
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconRobot size={24} />
                        AI Content Generator
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={3}>
                        {/* Content Type Selection */}
                        <FormControl fullWidth>
                            <InputLabel>Content Type</InputLabel>
                            <Select
                                value={request.content_type}
                                label="Content Type"
                                onChange={(e) => setRequest({ ...request, content_type: e.target.value as any })}
                            >
                                {contentTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>
                                        {type.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Context Input */}
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Context & Instructions"
                            placeholder="Describe what content you need. Be specific about requirements, tone, and key points to include..."
                            value={request.context}
                            onChange={(e) => setRequest({ ...request, context: e.target.value })}
                        />

                        {/* Language and Audience */}
                        <Box display="flex" gap={2}>
                            <FormControl fullWidth>
                                <InputLabel>Language</InputLabel>
                                <Select
                                    value={request.language}
                                    label="Language"
                                    onChange={(e) => setRequest({ ...request, language: e.target.value })}
                                >
                                    {languages.map((lang) => (
                                        <MenuItem key={lang.value} value={lang.value}>
                                            {lang.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>Target Audience</InputLabel>
                                <Select
                                    value={request.target_audience}
                                    label="Target Audience"
                                    onChange={(e) => setRequest({ ...request, target_audience: e.target.value })}
                                >
                                    {audiences.map((audience) => (
                                        <MenuItem key={audience.value} value={audience.value}>
                                            {audience.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Church Context (Optional) */}
                        <TextField
                            fullWidth
                            label="Church Context (Optional)"
                            placeholder="Specific church traditions, customs, or requirements..."
                            value={request.church_context || ''}
                            onChange={(e) => setRequest({ ...request, church_context: e.target.value })}
                        />

                        {/* Error Display */}
                        {generateMutation.isError && (
                            <Alert severity="error">
                                {generateMutation.error?.message || 'Failed to generate content'}
                            </Alert>
                        )}

                        {/* Generated Content */}
                        {generatedContent && (
                            <Card variant="outlined">
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                                            <IconFileText size={20} />
                                            Generated Content
                                        </Typography>
                                        <Box display="flex" gap={1}>
                                            <Tooltip title="Copy to Clipboard">
                                                <IconButton onClick={handleCopy} size="small">
                                                    <IconCopy size={18} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Download as Text File">
                                                <IconButton onClick={handleDownload} size="small">
                                                    <IconDownload size={18} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>

                                    {/* Content Metadata */}
                                    <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                                        <Chip
                                            size="small"
                                            label={`${generatedContent.metadata.word_count} words`}
                                            variant="outlined"
                                        />
                                        <Chip
                                            size="small"
                                            label={`${generatedContent.metadata.estimated_reading_time} min read`}
                                            variant="outlined"
                                        />
                                        <Chip
                                            size="small"
                                            label={generatedContent.metadata.content_type}
                                            variant="outlined"
                                        />
                                    </Box>

                                    <Divider sx={{ mb: 2 }} />

                                    {/* Content Text */}
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <Typography
                                            variant="body1"
                                            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                                        >
                                            {generatedContent.content}
                                        </Typography>
                                    </Paper>

                                    {/* AI Suggestions */}
                                    {generatedContent.suggestions && generatedContent.suggestions.length > 0 && (
                                        <Box mt={2}>
                                            <Typography variant="subtitle2" display="flex" alignItems="center" gap={1} mb={1}>
                                                <IconBulb size={16} />
                                                AI Suggestions
                                            </Typography>
                                            <Stack spacing={1}>
                                                {generatedContent.suggestions.map((suggestion, index) => (
                                                    <Alert key={index} severity="info" variant="outlined">
                                                        {suggestion}
                                                    </Alert>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpen(false)} startIcon={<IconX />}>
                        Close
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        variant="contained"
                        disabled={!request.context.trim() || generateMutation.isPending}
                        startIcon={
                            generateMutation.isPending ? (
                                <CircularProgress size={16} />
                            ) : (
                                <IconRobot />
                            )
                        }
                    >
                        {generateMutation.isPending ? 'Generating...' : 'Generate Content'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AIContentGenerator;
