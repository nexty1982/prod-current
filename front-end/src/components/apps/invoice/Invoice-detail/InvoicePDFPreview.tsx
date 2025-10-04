import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
    Alert,
    Chip,
} from '@mui/material';
import {
    IconDownload,
    IconFileTypePdf,
    IconLanguage,
} from '@tabler/icons-react';
import { Invoice } from '@/types/orthodox-metrics.types';
import { downloadInvoicePDF, LANGUAGE_LABELS } from '@/@/shared/lib/invoicePDFGenerator';

interface InvoicePDFPreviewProps {
    invoice: Invoice;
}

const InvoicePDFPreview: React.FC<InvoicePDFPreviewProps> = ({ invoice }) => {
    const [generating, setGenerating] = React.useState<string | null>(null);

    const handleDownloadPDF = async (language?: string) => {
        try {
            setGenerating(language || 'default');
            await downloadInvoicePDF(invoice, {
                language: language as any,
                includeWatermark: invoice.status === 'draft',
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setGenerating(null);
        }
    };

    return (
        <Card>
            <CardContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        <IconFileTypePdf style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        PDF Generation Options
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Generate invoices using language-specific SVG templates
                    </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        <strong>Available Templates:</strong> Your Orthodox Metrics instance includes
                        SVG templates for English, Russian, Romanian, and Greek languages.
                    </Typography>
                </Alert>

                <Stack spacing={2}>
                    {/* Default Language */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Invoice Language: {LANGUAGE_LABELS[invoice.language as keyof typeof LANGUAGE_LABELS] || invoice.language}
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<IconDownload />}
                            onClick={() => handleDownloadPDF()}
                            disabled={generating === 'default'}
                            fullWidth
                        >
                            {generating === 'default' ? 'Generating...' : 'Download PDF (Default Language)'}
                        </Button>
                    </Box>

                    {/* Language Options */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            <IconLanguage style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            Other Languages
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleDownloadPDF('en')}
                                disabled={generating === 'en'}
                                startIcon={generating === 'en' ? null : <IconFileTypePdf size="16" />}
                            >
                                {generating === 'en' ? 'Generating...' : 'English'}
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleDownloadPDF('ru')}
                                disabled={generating === 'ru'}
                                startIcon={generating === 'ru' ? null : <IconFileTypePdf size="16" />}
                            >
                                {generating === 'ru' ? 'Generating...' : 'Russian'}
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleDownloadPDF('ro')}
                                disabled={generating === 'ro'}
                                startIcon={generating === 'ro' ? null : <IconFileTypePdf size="16" />}
                            >
                                {generating === 'ro' ? 'Generating...' : 'Romanian'}
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleDownloadPDF('gr')}
                                disabled={generating === 'gr'}
                                startIcon={generating === 'gr' ? null : <IconFileTypePdf size="16" />}
                            >
                                {generating === 'gr' ? 'Generating...' : 'Greek'}
                            </Button>
                        </Stack>
                    </Box>

                    {/* Features */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Features
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                            <Chip
                                label="SVG Templates"
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                            <Chip
                                label="Multilingual Support"
                                size="small"
                                color="secondary"
                                variant="outlined"
                            />
                            <Chip
                                label="Currency Formatting"
                                size="small"
                                color="success"
                                variant="outlined"
                            />
                            <Chip
                                label="Draft Watermark"
                                size="small"
                                color="warning"
                                variant="outlined"
                            />
                            {invoice.status === 'draft' && (
                                <Chip
                                    label="Watermark Active"
                                    size="small"
                                    color="warning"
                                />
                            )}
                        </Stack>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default InvoicePDFPreview;
