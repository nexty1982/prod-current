import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
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
} from '@mui/material';
import {
    IconEdit,
    IconDownload,
    IconMail,
    IconCash,
    IconArrowLeft,
} from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { useInvoiceContext } from 'src/context/InvoiceContext';
import { Invoice } from 'src/types/orthodox-metrics.types';

const ModernInvoiceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getInvoiceById, markInvoiceAsPaid, generateInvoicePDF, sendInvoiceEmail } = useInvoiceContext();

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        console.log('Component mounted, ID from params:', id);
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
            setInvoice(data);
        } catch (err) {
            setError('Failed to load invoice');
            console.error('Error fetching invoice:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async () => {
        if (!invoice) return;

        try {
            setActionLoading('mark-paid');
            const updatedInvoice = await markInvoiceAsPaid(invoice.id);
            if (updatedInvoice) {
                setInvoice(updatedInvoice);
            }
        } catch (err) {
            console.error('Error marking invoice as paid:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleGeneratePDF = async () => {
        if (!invoice) return;

        try {
            setActionLoading('pdf');
            const pdfBlob = await generateInvoicePDF(invoice.id);
            if (pdfBlob) {
                const url = window.URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${invoice.invoice_number}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Error generating PDF:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendEmail = async () => {
        if (!invoice || !invoice.church?.email) return;

        try {
            setActionLoading('email');
            await sendInvoiceEmail(invoice.id, invoice.church.email);
        } catch (err) {
            console.error('Error sending email:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
        switch (status) {
            case 'paid': return 'success';
            case 'pending': return 'warning';
            case 'overdue': return 'error';
            case 'sent': return 'info';
            case 'draft': return 'default';
            default: return 'default';
        }
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
            <Alert severity="error" sx={{ mt: 2 }}>
                {error || 'Invoice not found'}
            </Alert>
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
                    <Typography variant="h4">Invoice {invoice.invoice_number}</Typography>
                    <Box mt={1}>
                        <Chip
                            label={invoice.status.toUpperCase()}
                            color={getStatusColor(invoice.status)}
                            size="small"
                        />
                    </Box>
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

                    <Tooltip title="Download PDF">
                        <IconButton
                            color="secondary"
                            onClick={handleGeneratePDF}
                            disabled={actionLoading === 'pdf'}
                        >
                            {actionLoading === 'pdf' ? <CircularProgress size={20} /> : <IconDownload />}
                        </IconButton>
                    </Tooltip>

                    {invoice.church?.email && (
                        <Tooltip title="Send Email">
                            <IconButton
                                color="info"
                                onClick={handleSendEmail}
                                disabled={actionLoading === 'email'}
                            >
                                {actionLoading === 'email' ? <CircularProgress size={20} /> : <IconMail />}
                            </IconButton>
                        </Tooltip>
                    )}

                    {invoice.status !== 'paid' && (
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={actionLoading === 'mark-paid' ? <CircularProgress size={20} /> : <IconCash />}
                            onClick={handleMarkAsPaid}
                            disabled={actionLoading === 'mark-paid'}
                        >
                            Mark as Paid
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Top Section */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    {/* Invoice Information */}
                    <Box sx={{ flex: 2 }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Invoice Information</Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Invoice Number</Typography>
                                        <Typography variant="body1" fontWeight="bold">{invoice.invoice_number}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Issue Date</Typography>
                                        <Typography variant="body1">{format(parseISO(invoice.issue_date), 'PPP')}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Due Date</Typography>
                                        <Typography variant="body1">{format(parseISO(invoice.due_date), 'PPP')}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Status</Typography>
                                        <Chip
                                            label={invoice.status.toUpperCase()}
                                            color={getStatusColor(invoice.status)}
                                            size="small"
                                        />
                                    </Box>
                                    {invoice.paid_at && (
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Paid Date</Typography>
                                            <Typography variant="body1">{format(parseISO(invoice.paid_at), 'PPP')}</Typography>
                                        </Box>
                                    )}
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Typography variant="body2" color="text.secondary">Notes</Typography>
                                        <Typography variant="body1">{invoice.internal_notes || 'No notes'}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Church Information */}
                    <Box sx={{ flex: 1 }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Church Information</Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Typography variant="body1" fontWeight="bold">{invoice.church_name}</Typography>
                                {invoice.church && (
                                    <>
                                        <Typography variant="body2" color="text.secondary" mt={1}>
                                            {invoice.church.address}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {invoice.church.email}
                                        </Typography>
                                        {invoice.church.contact_phone && (
                                            <Typography variant="body2" color="text.secondary">
                                                {invoice.church.contact_phone}
                                            </Typography>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                {/* Invoice Items */}
                <Box>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Invoice Items</Typography>
                            <Divider sx={{ mb: 2 }} />

                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Description</TableCell>
                                            <TableCell align="center">Quantity</TableCell>
                                            <TableCell align="center">Unit Price</TableCell>
                                            <TableCell align="center">Discount</TableCell>
                                            <TableCell align="right">Line Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {invoice.items && invoice.items.length > 0 ? (
                                            invoice.items.map((item) => (
                                                <TableRow key={item.id}>                                    <TableCell>
                                                    <Typography variant="body2">
                                                        {(() => {
                                                            try {
                                                                // Try to parse as JSON first
                                                                const parsed = JSON.parse(item.name_multilang);
                                                                return parsed[invoice.language] || parsed.en || 'Unnamed Item';
                                                            } catch {
                                                                // If parsing fails, treat as plain string
                                                                return item.name_multilang || 'Unnamed Item';
                                                            }
                                                        })()}
                                                    </Typography>
                                                    {item.description_multilang && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {(() => {
                                                                try {
                                                                    // Try to parse as JSON first
                                                                    const parsed = JSON.parse(item.description_multilang);
                                                                    return parsed[invoice.language] || parsed.en || '';
                                                                } catch {
                                                                    // If parsing fails, treat as plain string
                                                                    return item.description_multilang || '';
                                                                }
                                                            })()}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                    <TableCell align="center">{item.quantity}</TableCell>
                                                    <TableCell align="center">{invoice.currency} {item.unit_price.toFixed(2)}</TableCell>
                                                    <TableCell align="center">
                                                        {item.discount_percent > 0 && `${item.discount_percent}%`}
                                                        {item.discount_amount > 0 && `${invoice.currency} ${item.discount_amount.toFixed(2)}`}
                                                        {item.discount_percent === 0 && item.discount_amount === 0 && '-'}
                                                    </TableCell>
                                                    <TableCell align="right">{invoice.currency} {item.line_total.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">
                                                    <Typography color="text.secondary">No items found</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Invoice Totals */}
                            <Box mt={3} display="flex" justifyContent="flex-end">
                                <Box minWidth="300px">
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography>Subtotal:</Typography>
                                            <Typography>{invoice.currency} {(invoice.total_amount - invoice.tax_amount).toFixed(2)}</Typography>
                                        </Stack>
                                        {invoice.tax_amount > 0 && (
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography>Tax:</Typography>
                                                <Typography>{invoice.currency} {invoice.tax_amount.toFixed(2)}</Typography>
                                            </Stack>
                                        )}
                                        <Divider />
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="h6">Total:</Typography>
                                            <Typography variant="h6">{invoice.currency} {invoice.total_amount.toFixed(2)}</Typography>
                                        </Stack>
                                    </Stack>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default ModernInvoiceDetail;
