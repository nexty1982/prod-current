import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Typography,
    Button,
    Card,
    CardContent,
    TextField,
    MenuItem,
    Box,
    Stack,
    Divider,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import {
    IconPlus,
    IconTrash,
    IconArrowLeft,
    IconDeviceFloppy,
} from '@tabler/icons-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useInvoiceContext } from '@/context/InvoiceContext';
import { Invoice, CreateInvoiceData } from '@/types/orthodox-metrics.types';

interface EditableInvoiceItem {
    id: number;
    invoice_id: number;
    item_code?: string;
    name: string;
    description: string;
    category: 'service' | 'product' | 'subscription' | 'addon' | 'discount' | 'tax' | 'fee';
    quantity: number;
    unit_type: 'each' | 'hour' | 'month' | 'year' | 'record' | 'page' | 'gb';
    unit_price: number;
    discount_percent: number;
    discount_amount: number;
    line_total: number;
    tax_rate: number;
    tax_amount: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

const ModernInvoiceEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getInvoiceById, updateInvoice, createInvoice } = useInvoiceContext();

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        church_id: null as number | null, // Will be set from user context or invoice data
        issue_date: new Date(),
        due_date: new Date(),
        currency: 'USD',
        language: 'en' as const,
        internal_notes: '',
        status: 'draft' as const,
    });

    const [items, setItems] = useState<EditableInvoiceItem[]>([]);

    const isEditMode = Boolean(id && id !== 'new');

    useEffect(() => {
        if (isEditMode) {
            fetchInvoice();
        } else {
            setLoading(false);
            // Add default item for new invoice
            addNewItem();
        }
    }, [id]);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getInvoiceById(Number(id));
            if (data) {
                setInvoice(data);
                setFormData({
                    church_id: data.church_id,
                    issue_date: new Date(data.issue_date),
                    due_date: new Date(data.due_date),
                    currency: data.currency,
                    language: data.language,
                    internal_notes: data.internal_notes || '',
                    status: data.status,
                });

                // Convert items to editable format
                const editableItems: EditableInvoiceItem[] = (data.items || []).map((item: any) => ({
                    ...item,
                    name: (() => {
                        try {
                            // Try to parse as JSON first
                            const parsed = JSON.parse(item.name_multilang);
                            return parsed[data.language] || parsed.en || '';
                        } catch {
                            // If parsing fails, treat as plain string
                            return item.name_multilang || '';
                        }
                    })(),
                    description: (() => {
                        try {
                            // Try to parse as JSON first
                            const parsed = JSON.parse(item.description_multilang || '{}');
                            return parsed[data.language] || parsed.en || '';
                        } catch {
                            // If parsing fails, treat as plain string
                            return item.description_multilang || '';
                        }
                    })(),
                }));
                setItems(editableItems);
            }
        } catch (err) {
            setError('Failed to load invoice');
            console.error('Error fetching invoice:', err);
        } finally {
            setLoading(false);
        }
    };

    const addNewItem = () => {
        const newItem: EditableInvoiceItem = {
            id: Date.now(), // Temporary ID for new items
            invoice_id: Number(id) || 0,
            item_code: '',
            name: '',
            description: '',
            category: 'service',
            quantity: 1,
            unit_type: 'each',
            unit_price: 0,
            discount_percent: 0,
            discount_amount: 0,
            line_total: 0,
            tax_rate: 0,
            tax_amount: 0,
            sort_order: items.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setItems([...items, newItem]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof EditableInvoiceItem, value: any) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        // Recalculate line total
        if (['quantity', 'unit_price', 'discount_percent', 'discount_amount'].includes(field)) {
            const item = updatedItems[index];
            const subtotal = item.quantity * item.unit_price;
            const discountAmount = item.discount_percent > 0
                ? subtotal * (item.discount_percent / 100)
                : item.discount_amount;
            updatedItems[index].line_total = subtotal - discountAmount;
        }

        setItems(updatedItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
        const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
        const total = subtotal + taxAmount;
        return { subtotal, taxAmount, total };
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const { total, taxAmount } = calculateTotals();

            const invoiceData: CreateInvoiceData = {
                ...formData,
                issue_date: formData.issue_date.toISOString().split('T')[0],
                due_date: formData.due_date.toISOString().split('T')[0],
                total_amount: total,
                tax_amount: taxAmount,
                items: items.map(item => ({
                    item_code: item.item_code,
                    name_multilang: JSON.stringify({ [formData.language]: item.name }),
                    description_multilang: JSON.stringify({ [formData.language]: item.description }),
                    category: item.category,
                    quantity: item.quantity,
                    unit_type: item.unit_type,
                    unit_price: item.unit_price,
                    discount_percent: item.discount_percent,
                    discount_amount: item.discount_amount,
                    line_total: item.line_total,
                    tax_rate: item.tax_rate,
                    tax_amount: item.tax_amount,
                    sort_order: item.sort_order,
                })),
            };

            if (isEditMode) {
                await updateInvoice(Number(id), invoiceData);
            } else {
                const newInvoice = await createInvoice(invoiceData);
                if (newInvoice) {
                    navigate(`/apps/invoice/detail/${newInvoice.id}`);
                    return;
                }
            }

            navigate(`/apps/invoice/detail/${id}`);
        } catch (err) {
            setError('Failed to save invoice');
            console.error('Error saving invoice:', err);
        } finally {
            setSaving(false);
        }
    };

    const { subtotal, taxAmount, total } = calculateTotals();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
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
                            {isEditMode ? `Edit Invoice ${invoice?.invoice_number}` : 'Create New Invoice'}
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} /> : <IconDeviceFloppy />}
                        onClick={handleSave}
                        disabled={saving || items.length === 0}
                    >
                        {saving ? 'Saving...' : 'Save Invoice'}
                    </Button>
                </Stack>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {/* Invoice Details */}
                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' } }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Invoice Details</Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <TextField
                                        fullWidth
                                        label="Church ID"
                                        type="number"
                                        value={formData.church_id}
                                        onChange={(e) => setFormData({ ...formData, church_id: Number(e.target.value) })}
                                    />

                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <DatePicker
                                            label="Issue Date"
                                            value={formData.issue_date}
                                            onChange={(date) => setFormData({ ...formData, issue_date: date || new Date() })}
                                            slotProps={{ textField: { fullWidth: true } }}
                                        />

                                        <DatePicker
                                            label="Due Date"
                                            value={formData.due_date}
                                            onChange={(date) => setFormData({ ...formData, due_date: date || new Date() })}
                                            slotProps={{ textField: { fullWidth: true } }}
                                        />
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <TextField
                                            fullWidth
                                            select
                                            label="Currency"
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        >
                                            <MenuItem value="USD">USD</MenuItem>
                                            <MenuItem value="EUR">EUR</MenuItem>
                                            <MenuItem value="GBP">GBP</MenuItem>
                                        </TextField>

                                        <TextField
                                            fullWidth
                                            select
                                            label="Language"
                                            value={formData.language}
                                            onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                                        >
                                            <MenuItem value="en">English</MenuItem>
                                            <MenuItem value="gr">Greek</MenuItem>
                                            <MenuItem value="ru">Russian</MenuItem>
                                            <MenuItem value="ro">Romanian</MenuItem>
                                        </TextField>
                                    </Box>

                                    <TextField
                                        fullWidth
                                        select
                                        label="Status"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <MenuItem value="draft">Draft</MenuItem>
                                        <MenuItem value="pending">Pending</MenuItem>
                                        <MenuItem value="sent">Sent</MenuItem>
                                        <MenuItem value="paid">Paid</MenuItem>
                                        <MenuItem value="overdue">Overdue</MenuItem>
                                        <MenuItem value="cancelled">Cancelled</MenuItem>
                                    </TextField>

                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="Internal Notes"
                                        value={formData.internal_notes}
                                        onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Invoice Summary */}
                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' } }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Invoice Summary</Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Stack spacing={2}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography>Subtotal:</Typography>
                                        <Typography>{formData.currency} {subtotal.toFixed(2)}</Typography>
                                    </Stack>

                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography>Tax:</Typography>
                                        <Typography>{formData.currency} {taxAmount.toFixed(2)}</Typography>
                                    </Stack>

                                    <Divider />

                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="h6">Total:</Typography>
                                        <Typography variant="h6">{formData.currency} {total.toFixed(2)}</Typography>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Invoice Items */}
                    <Box sx={{ flex: '1 1 100%' }}>
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6">Invoice Items</Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<IconPlus />}
                                        onClick={addNewItem}
                                    >
                                        Add Item
                                    </Button>
                                </Box>
                                <Divider sx={{ mb: 2 }} />

                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Description</TableCell>
                                                <TableCell width="100">Qty</TableCell>
                                                <TableCell width="120">Unit Price</TableCell>
                                                <TableCell width="100">Discount</TableCell>
                                                <TableCell width="120">Line Total</TableCell>
                                                <TableCell width="50">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            placeholder="Item name"
                                                            value={item.name}
                                                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                            sx={{ mb: 1 }}
                                                        />
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            placeholder="Description (optional)"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                            inputProps={{ min: 0, step: 0.001 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            type="number"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                                                            inputProps={{ min: 0, step: 0.01 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            type="number"
                                                            placeholder="% or amount"
                                                            value={item.discount_percent}
                                                            onChange={(e) => updateItem(index, 'discount_percent', Number(e.target.value))}
                                                            inputProps={{ min: 0, max: 100, step: 0.01 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">
                                                            {formData.currency} {item.line_total.toFixed(2)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip title="Remove item">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => removeItem(index)}
                                                            >
                                                                <IconTrash size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {items.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} align="center">
                                                        <Typography color="text.secondary">
                                                            No items added. Click "Add Item" to get started.
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default ModernInvoiceEdit;
