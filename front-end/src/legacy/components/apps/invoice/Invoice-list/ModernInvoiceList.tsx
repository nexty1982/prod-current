/**
 * Modern Invoice List Component
 * Updated to use new API and modern UI patterns
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Alert,
  Fab,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
} from '@mui/material';
import {
  IconSearch,
  IconDownload,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconFileInvoice,
  IconMail,
  IconCreditCard,
  IconDots,
  IconRefresh,
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useInvoiceContext } from '@/context/InvoiceContext';
import { InvoiceStatus } from '@/types/apps/invoice';
import { Invoice } from '@/types/orthodox-metrics.types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

// Status color mapping
const getStatusColor = (status: InvoiceStatus): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  switch (status) {
    case 'paid': return 'success';
    case 'pending': return 'warning';
    case 'overdue': return 'error';
    case 'draft': return 'info';
    case 'cancelled': return 'default';
    default: return 'default';
  }
};

// Status icon mapping
const getStatusIcon = (status: InvoiceStatus) => {
  switch (status) {
    case 'paid': return <IconCheck size={16} />;
    case 'pending': return <IconClock size={16} />;
    case 'overdue': return <IconAlertCircle size={16} />;
    case 'draft': return <IconEdit size={16} />;
    case 'cancelled': return <IconX size={16} />;
    default: return <IconFileInvoice size={16} />;
  }
};

const ModernInvoiceList: React.FC = () => {
  const {
    invoices,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    filters,
    setFilters,
    fetchInvoices,
    deleteInvoice,
    markInvoiceAsPaid,
    generateInvoicePDF,
    sendInvoiceEmail,
    exportInvoices,
  } = useInvoiceContext();

  // Component lifecycle logging
  React.useEffect(() => {
    logger.componentMount('Invoice List - Modern');
    logger.info('Invoice List - Modern', 'Component mounted', {
      totalInvoices: invoices.length,
      currentPage,
      filters
    });

    return () => {
      logger.componentUnmount('Invoice List - Modern');
    };
  }, []);

  // Log when invoices data changes
  React.useEffect(() => {
    if (invoices.length > 0) {
      logger.info('Invoice List - Modern', 'Invoices data loaded', {
        totalCount: invoices.length,
        statuses: invoices.reduce((acc: Record<string, number>, invoice: Invoice) => {
          acc[invoice.status] = (acc[invoice.status] || 0) + 1;
          return acc;
        }, {})
      });
    }
  }, [invoices]);

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');

  // Statistics
  const stats = {
    total: totalCount,
    draft: invoices.filter((i: Invoice) => i.status === 'draft').length,
    pending: invoices.filter((i: Invoice) => i.status === 'pending').length,
    paid: invoices.filter((i: Invoice) => i.status === 'paid').length,
    overdue: invoices.filter((i: Invoice) => i.status === 'overdue').length,
  };

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);

    logger.userAction('Invoice List - Modern', 'search_performed', {
      searchTerm: value,
      searchLength: value.length,
      currentPage: filters.page
    });

    // Debounced search
    const timeoutId = setTimeout(() => {
      setFilters({
        ...filters,
        search: value || undefined,
        page: 1,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Handle status filter
  const handleStatusFilter = (status: InvoiceStatus | 'all') => {
    setStatusFilter(status);

    logger.userAction('Invoice List - Modern', 'status_filter_changed', {
      previousStatus: statusFilter,
      newStatus: status,
      currentPage: filters.page
    });

    setFilters({
      ...filters,
      status: status === 'all' ? undefined : status,
      page: 1,
    });
  };

  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    logger.userAction('Invoice List - Modern', 'page_changed', {
      previousPage: currentPage,
      newPage: page,
      totalPages: Math.ceil(totalCount / (filters.limit || 10))
    });

    setCurrentPage(page);
  };

  // Handle invoice selection
  const handleSelectInvoice = (id: number) => {
    const isSelected = selectedInvoices.includes(id);

    logger.userAction('Invoice List - Modern', 'invoice_selected', {
      invoiceId: id,
      action: isSelected ? 'deselect' : 'select',
      totalSelected: isSelected ? selectedInvoices.length - 1 : selectedInvoices.length + 1
    });

    setSelectedInvoices(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    const isAllSelected = selectedInvoices.length === invoices.length;

    logger.userAction('Invoice List - Modern', 'select_all_toggled', {
      action: isAllSelected ? 'deselect_all' : 'select_all',
      totalInvoices: invoices.length,
      previouslySelected: selectedInvoices.length
    });

    setSelectedInvoices(
      selectedInvoices.length === invoices.length
        ? []
        : invoices.map((i: Invoice) => i.id)
    );
  };

  // Handle actions menu
  const handleActionClick = (event: React.MouseEvent<HTMLElement>, invoiceId: number) => {
    logger.userAction('Invoice List - Modern', 'action_menu_opened', {
      invoiceId: invoiceId
    });

    setAnchorEl(event.currentTarget);
    setSelectedInvoiceId(invoiceId);
  };

  const handleActionClose = () => {
    if (selectedInvoiceId) {
      logger.userAction('Invoice List - Modern', 'action_menu_closed', {
        invoiceId: selectedInvoiceId
      });
    }

    setAnchorEl(null);
    setSelectedInvoiceId(null);
  };

  // Handle invoice actions
  const handleMarkAsPaid = async (id: number) => {
    try {
      logger.userAction('Invoice List - Modern', 'mark_as_paid_attempted', {
        invoiceId: id
      });

      await markInvoiceAsPaid(id);

      logger.userAction('Invoice List - Modern', 'mark_as_paid_success', {
        invoiceId: id
      });
    } catch (error) {
      logger.error('Invoice List - Modern', 'mark_as_paid_failed', {
        invoiceId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    handleActionClose();
  };

  const handleGeneratePDF = async (id: number) => {
    try {
      logger.userAction('Invoice List - Modern', 'generate_pdf_attempted', {
        invoiceId: id
      });

      const blob = await generateInvoicePDF(id);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);

        logger.userAction('Invoice List - Modern', 'generate_pdf_success', {
          invoiceId: id,
          fileSize: blob.size
        });
      }
    } catch (error) {
      logger.error('Invoice List - Modern', 'generate_pdf_failed', {
        invoiceId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    handleActionClose();
  };

  const handleSendEmail = async (id: number) => {
    try {
      // You would typically show a dialog to enter email address
      // For now, we'll use a simple prompt
      const email = window.prompt('Enter email address:');
      if (email) {
        logger.userAction('Invoice List - Modern', 'send_email_attempted', {
          invoiceId: id,
          recipientEmail: email
        });

        await sendInvoiceEmail(id, email);

        logger.userAction('Invoice List - Modern', 'send_email_success', {
          invoiceId: id,
          recipientEmail: email
        });
      } else {
        logger.userAction('Invoice List - Modern', 'send_email_cancelled', {
          invoiceId: id
        });
      }
    } catch (error) {
      logger.error('Invoice List - Modern', 'send_email_failed', {
        invoiceId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    handleActionClose();
  };

  const handleDelete = async (id: number) => {
    try {
      logger.userAction('Invoice List - Modern', 'delete_invoice_attempted', {
        invoiceId: id
      });

      await deleteInvoice(id);

      logger.userAction('Invoice List - Modern', 'delete_invoice_success', {
        invoiceId: id
      });
    } catch (error) {
      logger.error('Invoice List - Modern', 'delete_invoice_failed', {
        invoiceId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    setDeleteDialogOpen(false);
    handleActionClose();
  };

  // Handle bulk export
  const handleExport = async () => {
    try {
      logger.userAction('Invoice List - Modern', 'export_attempted', {
        format: exportFormat,
        totalInvoices: invoices.length,
        selectedInvoices: selectedInvoices.length,
        filters: filters
      });

      const blob = await exportInvoices(exportFormat);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoices-export.${exportFormat}`;
        a.click();
        window.URL.revokeObjectURL(url);

        logger.userAction('Invoice List - Modern', 'export_success', {
          format: exportFormat,
          fileSize: blob.size,
          totalInvoices: invoices.length
        });
      }
    } catch (error) {
      logger.error('Invoice List - Modern', 'export_failed', {
        format: exportFormat,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="h6">Error loading invoices</Typography>
        <Typography>{error.message}</Typography>
        <Button onClick={fetchInvoices} startIcon={<IconRefresh />}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Box mb={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" fontWeight="bold">
            Invoices
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<IconDownload />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<IconPlus />}
              component={Link}
              to="/apps/invoice/create"
              onClick={() => {
                logger.userAction('Invoice List - Modern', 'create_invoice_clicked', {
                  currentPage: filters.page,
                  totalInvoices: invoices.length
                });
              }}
            >
              Create Invoice
            </Button>
          </Stack>
        </Stack>

        {/* Statistics Cards */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 18%' } }}>
            <Card
              sx={{
                bgcolor: 'primary.light',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'primary.main', '& .MuiTypography-root': { color: 'white' } }
              }}
              onClick={() => handleStatusFilter('all')}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <IconFileInvoice />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Invoices
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 18%' } }}>
            <Card
              sx={{
                bgcolor: 'info.light',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'info.main', '& .MuiTypography-root': { color: 'white' } }
              }}
              onClick={() => handleStatusFilter('draft')}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'info.main',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <IconEdit />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.draft}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Draft
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 18%' } }}>
            <Card
              sx={{
                bgcolor: 'warning.light',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'warning.main', '& .MuiTypography-root': { color: 'white' } }
              }}
              onClick={() => handleStatusFilter('pending')}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'warning.main',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <IconClock />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.pending}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 18%' } }}>
            <Card
              sx={{
                bgcolor: 'success.light',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'success.main', '& .MuiTypography-root': { color: 'white' } }
              }}
              onClick={() => handleStatusFilter('paid')}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'success.main',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <IconCheck />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.paid}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Paid
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 18%' } }}>
            <Card
              sx={{
                bgcolor: 'error.light',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'error.main', '& .MuiTypography-root': { color: 'white' } }
              }}
              onClick={() => handleStatusFilter('overdue')}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'error.main',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <IconAlertCircle />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.overdue}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Overdue
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Filters */}
        <Stack direction="row" spacing={2} mb={3}>
          <TextField
            placeholder="Search invoices..."
            variant="outlined"
            value={searchTerm}
            onChange={handleSearch}
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => handleStatusFilter(e.target.value as InvoiceStatus | 'all')}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e) => {
                const newFormat = e.target.value as 'csv' | 'xlsx' | 'pdf';
                logger.userAction('Invoice List - Modern', 'export_format_changed', {
                  previousFormat: exportFormat,
                  newFormat: newFormat
                });
                setExportFormat(newFormat);
              }}
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="xlsx">Excel</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Invoice Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedInvoices.length === invoices.length}
                          indeterminate={selectedInvoices.length > 0 && selectedInvoices.length < invoices.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Church</TableCell>
                      <TableCell>Customer ID</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Issue Date</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((invoice: Invoice) => (
                      <TableRow
                        key={invoice.id}
                        hover
                        sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedInvoices.includes(invoice.id)}
                            onChange={() => handleSelectInvoice(invoice.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {invoice.invoice_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {invoice.church_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium" color="primary.main">
                            {invoice.church?.customer_id || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {invoice.total_amount} {invoice.currency}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(invoice.status)}
                            label={invoice.status.toUpperCase()}
                            color={getStatusColor(invoice.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View">
                              <IconButton
                                size="small"
                                component={Link}
                                to={`/apps/invoice/view/${invoice.invoice_number}`}
                              >
                                <IconEye size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                component={Link}
                                to={`/apps/invoice/edit/${invoice.invoice_number}`}
                              >
                                <IconEdit size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="More actions">
                              <IconButton
                                size="small"
                                onClick={(e) => handleActionClick(e, invoice.id)}
                              >
                                <IconDots size={18} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={Math.ceil(totalCount / (filters.limit || 10))}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionClose}
      >
        <MenuItem onClick={() => selectedInvoiceId && handleMarkAsPaid(selectedInvoiceId)}>
          <IconCreditCard size={18} />
          <ListItemText primary="Mark as Paid" sx={{ ml: 1 }} />
        </MenuItem>
        <MenuItem onClick={() => selectedInvoiceId && handleGeneratePDF(selectedInvoiceId)}>
          <IconFileInvoice size={18} />
          <ListItemText primary="Generate PDF" sx={{ ml: 1 }} />
        </MenuItem>
        <MenuItem onClick={() => selectedInvoiceId && handleSendEmail(selectedInvoiceId)}>
          <IconMail size={18} />
          <ListItemText primary="Send Email" sx={{ ml: 1 }} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            logger.userAction('Invoice List - Modern', 'delete_dialog_opened', {
              invoiceId: selectedInvoiceId
            });
            setDeleteDialogOpen(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <IconTrash size={18} />
          <ListItemText primary="Delete" sx={{ ml: 1 }} />
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          logger.userAction('Invoice List - Modern', 'delete_dialog_cancelled', {
            invoiceId: selectedInvoiceId
          });
          setDeleteDialogOpen(false);
        }}
      >
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this invoice? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            logger.userAction('Invoice List - Modern', 'delete_dialog_cancelled', {
              invoiceId: selectedInvoiceId
            });
            setDeleteDialogOpen(false);
          }}>Cancel</Button>
          <Button
            onClick={() => selectedInvoiceId && handleDelete(selectedInvoiceId)}
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        component={Link}
        to="/apps/invoice/create"
        onClick={() => {
          logger.userAction('Invoice List - Modern', 'create_invoice_fab_clicked', {
            currentPage: filters.page,
            totalInvoices: invoices.length
          });
        }}
      >
        <IconPlus />
      </Fab>
    </Box>
  );
};

export default ModernInvoiceList;
