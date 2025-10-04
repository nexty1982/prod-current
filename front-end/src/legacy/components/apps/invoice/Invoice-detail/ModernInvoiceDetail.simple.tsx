import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    Stack,
    Chip,
    Divider,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    IconEdit,
    IconDownload,
    IconMail,
    IconCash,
    IconArrowLeft,
    IconChevronDown,
    IconFileTypePdf,
    IconLanguage,
} from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { useInvoiceContext } from '@/context/InvoiceContext';
import { Invoice } from '@/types/orthodox-metrics.types';
import { LANGUAGE_LABELS } from '@/shared/lib/invoicePDFGenerator';

const ModernInvoiceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        getInvoiceById,
        markInvoiceAsPaid,
        generateInvoicePDF,
        downloadClientSidePDF,
        sendInvoiceEmail
    } = useInvoiceContext();

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [pdfMenuAnchor, setPdfMenuAnchor] = useState<null | HTMLElement>(null);

    useEffect(() => {
        if (id) {
            fetchInvoice();
        }
    }, [id]);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching invoice with ID:', id);
            const data = await getInvoiceById(Number(id));
            console.log('Invoice data received:', data);

            if (!data) {
                setError('Invoice not found');
                return;
            }

            setInvoice(data);
        } catch (err) {
            console.error('Error fetching invoice:', err);
            setError('Failed to load invoice: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async () => {
        if (!invoice) return;

        try {
            setActionLoading('mark-paid');
            await markInvoiceAsPaid(invoice.id);
            await fetchInvoice(); // Refresh invoice data
        } catch (err) {
            console.error('Error marking invoice as paid:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleGeneratePDF = async () => {
        if (!invoice) return;

        try {
            setActionLoading('generate-pdf');
            console.log('Generating server-side PDF for invoice:', invoice.id);

            const pdfBlob = await generateInvoicePDF(invoice.id);
            if (pdfBlob) {
                const url = window.URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${invoice.invoice_number}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                console.log('Server-side PDF download completed');
            } else {
                console.log('No PDF blob returned, falling back to client-side generation');
                await handleGenerateClientSidePDF();
            }
        } catch (err) {
            console.error('Error generating PDF:', err);
            console.log('Server-side PDF failed, falling back to client-side generation');
            await handleGenerateClientSidePDF();
        } finally {
            setActionLoading(null);
        }
    };

    const handleGenerateClientSidePDF = async (language?: string) => {
        if (!invoice) return;

        try {
            setActionLoading('generate-client-pdf');
            console.log('Generating client-side PDF for language:', language || invoice.language);

            await downloadClientSidePDF(invoice, {
                language: language || invoice.language,
                includeWatermark: invoice.status === 'draft',
            });

            console.log('PDF generation completed successfully');
        } catch (err) {
            console.error('Error generating client-side PDF:', err);
            alert('Failed to generate PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setActionLoading(null);
            setPdfMenuAnchor(null);
        }
    };

    const handlePDFMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setPdfMenuAnchor(event.currentTarget);
    };

    const handlePDFMenuClose = () => {
        setPdfMenuAnchor(null);
    };

    const handleSendEmail = async () => {
        if (!invoice) return;

        const email = prompt('Enter email address:');
        if (!email) return;

        try {
            setActionLoading('send-email');
            await sendInvoiceEmail(invoice.id, email);
            alert('Invoice sent successfully!');
        } catch (err) {
            console.error('Error sending email:', err);
            alert('Failed to send email');
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'success';
            case 'pending':
                return 'warning';
            case 'overdue':
                return 'error';
            case 'draft':
                return 'default';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const getStatusText = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error || !invoice) {
        return (
            <Box>
                <Alert severity="error">
                    {error || 'Invoice not found'}
                </Alert>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Button
                        startIcon={<IconArrowLeft />}
                        onClick={() => navigate('/apps/invoice/list')}
                        sx={{ mb: 1 }}
                    >
                        Back to Invoices
                    </Button>
                    <Typography variant="h4">
                        Invoice {invoice.invoice_number}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit Invoice">
                        <IconButton
                            color="primary"
                            onClick={() => navigate(`/apps/invoice/edit/${invoice.id}`)}
                        >
                            <IconEdit />
                        </IconButton>
                    </Tooltip>

                    {/* PDF Download with Language Options */}
                    <Tooltip title="Download PDF">
                        <Button
                            variant="outlined"
                            startIcon={<IconDownload />}
                            endIcon={<IconChevronDown />}
                            onClick={handlePDFMenuClick}
                            disabled={actionLoading?.includes('pdf')}
                            size="small"
                        >
                            {actionLoading?.includes('pdf') ? 'Generating...' : 'PDF'}
                        </Button>
                    </Tooltip>

                    <Menu
                        anchorEl={pdfMenuAnchor}
                        open={Boolean(pdfMenuAnchor)}
                        onClose={handlePDFMenuClose}
                    >
                        <MenuItem onClick={handleGeneratePDF}>
                            <ListItemIcon>
                                <IconFileTypePdf size="20" />
                            </ListItemIcon>
                            <ListItemText primary="Server PDF (Official)" />
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={() => handleGenerateClientSidePDF()}>
                            <ListItemIcon>
                                <IconLanguage size="20" />
                            </ListItemIcon>
                            <ListItemText
                                primary={`${LANGUAGE_LABELS[invoice.language as keyof typeof LANGUAGE_LABELS] || 'Default'} Template`}
                                secondary="Uses language-specific template"
                            />
                        </MenuItem>
                        <MenuItem onClick={() => handleGenerateClientSidePDF('en')}>
                            <ListItemIcon>
                                <IconFileTypePdf size="20" />
                            </ListItemIcon>
                            <ListItemText primary="English Template" />
                        </MenuItem>
                        <MenuItem onClick={() => handleGenerateClientSidePDF('ru')}>
                            <ListItemIcon>
                                <IconFileTypePdf size="20" />
                            </ListItemIcon>
                            <ListItemText primary="Russian Template" />
                        </MenuItem>
                        <MenuItem onClick={() => handleGenerateClientSidePDF('ro')}>
                            <ListItemIcon>
                                <IconFileTypePdf size="20" />
                            </ListItemIcon>
                            <ListItemText primary="Romanian Template" />
                        </MenuItem>
                        <MenuItem onClick={() => handleGenerateClientSidePDF('gr')}>
                            <ListItemIcon>
                                <IconFileTypePdf size="20" />
                            </ListItemIcon>
                            <ListItemText primary="Greek Template" />
                        </MenuItem>
                    </Menu>

                    <Tooltip title="Send Email">
                        <IconButton
                            color="primary"
                            onClick={handleSendEmail}
                            disabled={actionLoading === 'send-email'}
                        >
                            <IconMail />
                        </IconButton>
                    </Tooltip>

                    {invoice.status !== 'paid' && (
                        <Tooltip title="Mark as Paid">
                            <IconButton
                                color="success"
                                onClick={handleMarkAsPaid}
                                disabled={actionLoading === 'mark-paid'}
                            >
                                <IconCash />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Stack>

            {/* Invoice Details */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <Box sx={{ flex: 2 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Invoice Information</Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Invoice Number</Typography>
                                    <Typography variant="body1" fontWeight="bold">{invoice.invoice_number}</Typography>
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary">Status</Typography>
                                    <Chip
                                        label={getStatusText(invoice.status)}
                                        color={getStatusColor(invoice.status) as any}
                                        size="small"
                                    />
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary">Issue Date</Typography>
                                    <Typography variant="body1">{format(parseISO(invoice.issue_date), 'MMM dd, yyyy')}</Typography>
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary">Due Date</Typography>
                                    <Typography variant="body1">{format(parseISO(invoice.due_date), 'MMM dd, yyyy')}</Typography>
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary">Currency</Typography>
                                    <Typography variant="body1">{invoice.currency}</Typography>
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary">Language</Typography>
                                    <Typography variant="body1">{invoice.language.toUpperCase()}</Typography>
                                </Box>

                                {invoice.paid_at && (
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Paid Date</Typography>
                                        <Typography variant="body1">{format(parseISO(invoice.paid_at), 'MMM dd, yyyy')}</Typography>
                                    </Box>
                                )}
                            </Box>

                            {invoice.internal_notes && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" color="text.secondary">Internal Notes</Typography>
                                    <Typography variant="body1">{invoice.internal_notes}</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: 1 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Totals</Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={2}>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography>Subtotal:</Typography>
                                    <Typography fontWeight="bold">${(invoice.total_amount - (invoice.tax_amount || 0)).toFixed(2)}</Typography>
                                </Box>

                                {invoice.tax_amount && invoice.tax_amount > 0 && (
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography>Tax:</Typography>
                                        <Typography fontWeight="bold">${invoice.tax_amount.toFixed(2)}</Typography>
                                    </Box>
                                )}

                                <Divider />

                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h6">Total:</Typography>
                                    <Typography variant="h6" fontWeight="bold">${invoice.total_amount.toFixed(2)}</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* Invoice Items */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Invoice Items</Typography>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Item</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell align="right">Quantity</TableCell>
                                    <TableCell align="right">Unit Price</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {invoice.items && invoice.items.map((item, index) => {
                                    const itemName = typeof item.name_multilang === 'string'
                                        ? JSON.parse(item.name_multilang)[invoice.language] || JSON.parse(item.name_multilang).en || 'Unnamed Item'
                                        : item.name_multilang?.[invoice.language] || 'Unnamed Item';

                                    const itemDescription = typeof item.description_multilang === 'string'
                                        ? JSON.parse(item.description_multilang)[invoice.language] || JSON.parse(item.description_multilang).en || ''
                                        : item.description_multilang?.[invoice.language] || '';

                                    return (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Typography variant="body1" fontWeight="medium">
                                                    {itemName}
                                                </Typography>
                                                {item.item_code && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Code: {item.item_code}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {itemDescription}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    {item.quantity} {item.unit_type}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    ${item.unit_price.toFixed(2)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body1" fontWeight="medium">
                                                    ${item.line_total.toFixed(2)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ModernInvoiceDetail;
