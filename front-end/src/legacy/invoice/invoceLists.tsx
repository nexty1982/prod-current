import { http, HttpResponse } from 'msw';
import { InvoiceList } from '@/types/apps/invoice';

export let invoceLists: InvoiceList[] = [
    {
        id: 101,
        invoice_number: 'INV-101',
        church_id: 1,
        church_name: 'PineappleInc.',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        language: 'en',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 90,
        tax_rate: 0.1,
        tax_amount: 9,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 99,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        church: {
            id: 1,
            name: 'PineappleInc.',
            email: 'info@pineappleinc.com',
            address: '123 Main St, Anytown, USA',
            contact_phone: '+1 555-0101',
            preferred_language: 'en',
            is_active: true,
            upload_capacity_mb: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            customer_id: 'CUS-US-00001',
        },
        items: [
            {
                id: 1,
                invoice_id: 101,
                name_multilang: 'Courge',
                category: 'service',
                quantity: 9,
                unit_type: 'each',
                unit_price: 10,
                discount_percent: 0,
                discount_amount: 0,
                line_total: 90,
                tax_rate: 0.1,
                tax_amount: 9,
                sort_order: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ],
    },
    {
        id: 102,
        invoice_number: 'INV-102',
        church_id: 2,
        church_name: 'Pineapple Church',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        language: 'en',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 90,
        tax_rate: 0.1,
        tax_amount: 9,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 99,
        status: 'paid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        church: {
            id: 2,
            name: 'Pineapple Church',
            email: 'contact@pineapplechurch.org',
            address: '456 Church Ave, Faithville, USA',
            contact_phone: '+1 555-0102',
            preferred_language: 'en',
            is_active: true,
            upload_capacity_mb: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            customer_id: 'CUS-US-00002',
        },
        items: [
            {
                id: 2,
                invoice_id: 102,
                name_multilang: 'Service Fee',
                category: 'service',
                quantity: 9,
                unit_type: 'each',
                unit_price: 10,
                discount_percent: 0,
                discount_amount: 0,
                line_total: 90,
                tax_rate: 0.1,
                tax_amount: 9,
                sort_order: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ],
    },
    {
        id: 103,
        invoice_number: 'INV-103',
        church_id: 3,
        church_name: 'Incorporation Church',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        language: 'en',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 90,
        tax_rate: 0.1,
        tax_amount: 9,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 99,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [
            {
                id: 3,
                invoice_id: 103,
                name_multilang: 'Monthly Subscription',
                category: 'subscription',
                quantity: 1,
                unit_type: 'month',
                unit_price: 90,
                discount_percent: 0,
                discount_amount: 0,
                line_total: 90,
                tax_rate: 0.1,
                tax_amount: 9,
                sort_order: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ],
    },
    {
        id: 104,
        invoice_number: 'INV-104',
        church_id: 4,
        church_name: 'PineappleTimes Church',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        language: 'en',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 90,
        tax_rate: 0.1,
        tax_amount: 9,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 99,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [
            {
                id: 4,
                invoice_id: 104,
                name_multilang: 'Setup Fee',
                category: 'fee',
                quantity: 1,
                unit_type: 'each',
                unit_price: 90,
                discount_percent: 0,
                discount_amount: 0,
                line_total: 90,
                tax_rate: 0.1,
                tax_amount: 9,
                sort_order: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ],
    },
    {
        id: 105,
        invoice_number: 'INV-105',
        church_id: 5,
        church_name: 'FortuneCreation Church',
        issue_date: '2020-10-15',
        due_date: '2020-11-15',
        language: 'en',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 90,
        tax_rate: 0.1,
        tax_amount: 9,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 99,
        status: 'overdue',
        created_at: '2020-10-15T00:00:00.000Z',
        updated_at: '2020-10-15T00:00:00.000Z',
        items: [
            {
                id: 5,
                invoice_id: 105,
                name_multilang: 'Annual Package',
                category: 'subscription',
                quantity: 1,
                unit_type: 'year',
                unit_price: 90,
                discount_percent: 0,
                discount_amount: 0,
                line_total: 90,
                tax_rate: 0.1,
                tax_amount: 9,
                sort_order: 1,
                created_at: '2020-10-15T00:00:00.000Z',
                updated_at: '2020-10-15T00:00:00.000Z',
            },
        ],
    },
    {
        id: 106,
        invoice_number: 'INV-106',
        church_id: 6,
        church_name: 'PineappleTimes Secondary',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        language: 'en',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 90,
        tax_rate: 0.1,
        tax_amount: 9,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 99,
        status: 'cancelled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [
            {
                id: 6,
                invoice_id: 106,
                name_multilang: 'Premium Service',
                category: 'service',
                quantity: 1,
                unit_type: 'each',
                unit_price: 90,
                discount_percent: 0,
                discount_amount: 0,
                line_total: 90,
                tax_rate: 0.1,
                tax_amount: 9,
                sort_order: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ],
    },
    {
        id: 107,
        invoice_number: 'INV-107',
        church_id: 7,
        church_name: 'FortuneCreation Secondary',
        issue_date: '2020-10-15',
        due_date: '2020-11-15',
        language: 'en',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 90,
        tax_rate: 0.1,
        tax_amount: 9,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 99,
        status: 'paid',
        created_at: '2020-10-15T00:00:00.000Z',
        updated_at: '2020-10-15T00:00:00.000Z',
        paid_at: '2020-10-20T00:00:00.000Z',
        items: [
            {
                id: 7,
                invoice_id: 107,
                name_multilang: 'Legacy Service',
                category: 'service',
                quantity: 1,
                unit_type: 'each',
                unit_price: 90,
                discount_percent: 0,
                discount_amount: 0,
                line_total: 90,
                tax_rate: 0.1,
                tax_amount: 9,
                sort_order: 1,
                created_at: '2020-10-15T00:00:00.000Z',
                updated_at: '2020-10-15T00:00:00.000Z',
            },
        ],
    },
];

const getNextId = () => {
    const maxId = Math.max(...invoceLists.map((invoice) => invoice.id));
    return maxId + 1;
};

export const InvoiceHandlers = [

    // NEW V1 API ENDPOINTS (as per instructions.md)
    // GET /api/v1/invoices/:invoice_number - Get invoice by invoice number
    http.get("/api/v1/invoices/:invoice_number", ({ params }) => {
        try {
            const invoiceNumber = params.invoice_number as string;
            console.log('MSW: Fetching invoice with number:', invoiceNumber);
            const invoice = invoceLists.find(inv => inv.invoice_number === invoiceNumber);

            if (!invoice) {
                console.log('MSW: Invoice not found for number:', invoiceNumber);
                return HttpResponse.json({
                    status: 404,
                    message: "Invoice not found",
                }, { status: 404 });
            }

            console.log('MSW: Returning invoice:', invoice);
            return HttpResponse.json(invoice);
        } catch (error) {
            console.error('MSW: Error in getByInvoiceNumber handler:', error);
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // PUT /api/v1/invoices/:invoice_number - Update invoice by invoice number
    http.put("/api/v1/invoices/:invoice_number", async ({ params, request }) => {
        try {
            const invoiceNumber = params.invoice_number as string;
            const updates = await request.json() as any;
            const invoiceIndex = invoceLists.findIndex(inv => inv.invoice_number === invoiceNumber);

            if (invoiceIndex === -1) {
                return HttpResponse.json({
                    status: 404,
                    message: "Invoice not found",
                }, { status: 404 });
            }

            invoceLists[invoiceIndex] = {
                ...invoceLists[invoiceIndex],
                ...updates,
                updated_at: new Date().toISOString(),
            };

            return HttpResponse.json(invoceLists[invoiceIndex]);
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // NEW ORTHODOXMETRICS API ENDPOINTS
    // GET /api/invoices - Get all invoices with filters
    http.get("/api/invoices", ({ request }) => {
        try {
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const status = url.searchParams.get('status');
            const search = url.searchParams.get('search');

            let filteredInvoices = [...invoceLists];

            // Apply filters
            if (status) {
                filteredInvoices = filteredInvoices.filter(invoice => invoice.status === status);
            }

            if (search) {
                filteredInvoices = filteredInvoices.filter(invoice =>
                    invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
                    (invoice.church_name && invoice.church_name.toLowerCase().includes(search.toLowerCase()))
                );
            }

            // Apply pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

            return HttpResponse.json({
                data: paginatedInvoices,
                pagination: {
                    page,
                    limit,
                    total: filteredInvoices.length,
                    totalPages: Math.ceil(filteredInvoices.length / limit),
                },
            });
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),    // GET /api/invoices/:id - Get invoice by ID
    http.get("/api/invoices/:id", ({ params }) => {
        try {
            const id = parseInt(params.id as string);
            console.log('MSW: Fetching invoice with ID:', id);
            const invoice = invoceLists.find(inv => inv.id === id);

            if (!invoice) {
                console.log('MSW: Invoice not found for ID:', id);
                return HttpResponse.json({
                    status: 404,
                    message: "Invoice not found",
                }, { status: 404 });
            }

            console.log('MSW: Returning invoice:', invoice);
            return HttpResponse.json(invoice);
        } catch (error) {
            console.error('MSW: Error in getById handler:', error);
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // POST /api/invoices - Create new invoice
    http.post("/api/invoices", async ({ request }) => {
        try {
            const newInvoiceData = await request.json() as any;
            const newInvoice = {
                id: getNextId(),
                invoice_number: `INV-${getNextId()}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...newInvoiceData,
            };

            invoceLists.push(newInvoice);
            return HttpResponse.json(newInvoice);
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // PUT /api/invoices/:id - Update invoice
    http.put("/api/invoices/:id", async ({ params, request }) => {
        try {
            const id = parseInt(params.id as string);
            const updates = await request.json() as any;
            const invoiceIndex = invoceLists.findIndex(inv => inv.id === id);

            if (invoiceIndex === -1) {
                return HttpResponse.json({
                    status: 404,
                    message: "Invoice not found",
                }, { status: 404 });
            }

            invoceLists[invoiceIndex] = {
                ...invoceLists[invoiceIndex],
                ...updates,
                updated_at: new Date().toISOString(),
            };

            return HttpResponse.json(invoceLists[invoiceIndex]);
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // DELETE /api/invoices/:id - Delete invoice
    http.delete("/api/invoices/:id", ({ params }) => {
        try {
            const id = parseInt(params.id as string);
            const invoiceIndex = invoceLists.findIndex(inv => inv.id === id);

            if (invoiceIndex === -1) {
                return HttpResponse.json({
                    status: 404,
                    message: "Invoice not found",
                }, { status: 404 });
            }

            invoceLists.splice(invoiceIndex, 1);
            return HttpResponse.json({ message: "Invoice deleted successfully" });
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // POST /api/invoices/:id/mark-paid - Mark invoice as paid
    http.post("/api/invoices/:id/mark-paid", async ({ params, request }) => {
        try {
            const id = parseInt(params.id as string);
            const { paid_date } = await request.json() as { paid_date?: string };
            const invoiceIndex = invoceLists.findIndex(inv => inv.id === id);

            if (invoiceIndex === -1) {
                return HttpResponse.json({
                    status: 404,
                    message: "Invoice not found",
                }, { status: 404 });
            }

            invoceLists[invoiceIndex] = {
                ...invoceLists[invoiceIndex],
                status: 'paid',
                paid_at: paid_date || new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            return HttpResponse.json(invoceLists[invoiceIndex]);
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // GET /api/invoices/:id/pdf - Generate PDF (mock response)
    http.get("/api/invoices/:id/pdf", ({ params }) => {
        try {
            const id = parseInt(params.id as string);
            const invoice = invoceLists.find(inv => inv.id === id);

            if (!invoice) {
                return HttpResponse.json({
                    status: 404,
                    message: "Invoice not found",
                }, { status: 404 });
            }

            // Return a mock PDF blob
            const pdfContent = `Mock PDF content for invoice ${invoice.invoice_number}`;
            return new HttpResponse(pdfContent, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
                },
            });
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // POST /api/invoices/:id/send-email - Send invoice email
    http.post("/api/invoices/:id/send-email", async ({ params, request }) => {
        try {
            const id = parseInt(params.id as string);
            const { email } = await request.json() as { email: string };
            const invoice = invoceLists.find(inv => inv.id === id);

            if (!invoice) {
                return HttpResponse.json({
                    status: 404,
                    message: "Invoice not found",
                }, { status: 404 });
            }

            // Mock email sending
            console.log(`Mock: Sending invoice ${invoice.invoice_number} to ${email}`);

            return HttpResponse.json({
                message: "Invoice email sent successfully",
                sent_to: email,
            });
        } catch (error) {
            return HttpResponse.json({
                status: 500,
                message: "Internal server error",
                error,
            }, { status: 500 });
        }
    }),

    // LEGACY ENDPOINTS (for backward compatibility)
    // Endpoint to get all invoice
    http.get("/api/data/invoicedata", () => {
        try {
            return HttpResponse.json({
                status: 200,
                msg: "success",
                data: invoceLists,
            });
        } catch (error) {
            return HttpResponse.json({
                status: 400,
                msg: "Internal server error",
                error,
            });
        }
    }),


    // Endpoint to delete an invoice
    http.delete('/api/data/invoicedata/deleteinvoice', async ({ request }) => {
        try {
            const { invoiceId } = await request.json() as { invoiceId: any };
            const invoiceIndex = invoceLists.findIndex(
                (invoice) => invoice.id === invoiceId
            );
            if (invoiceIndex !== -1) {
                const remainingInvoice = invoceLists.filter(
                    (invoice) => invoice.id !== invoiceId
                );
                invoceLists = remainingInvoice;
                return HttpResponse.json({
                    status: 200,
                    msg: "success",
                    data: invoceLists,
                });
            } else {
                return HttpResponse.json({ status: 400, msg: "invoice not found" });
            }
        } catch (error) {
            return HttpResponse.json({
                status: 400,
                msg: "Internal server error",
                error,
            });
        }
    }),



    // Endpoint to add an invoice
    http.post('/api/data/invoicedata/addinvoice', async ({ request }) => {
        try {
            const newInvoice = await request.json() as InvoiceList;
            newInvoice.id = getNextId();
            invoceLists.push(newInvoice);
            return HttpResponse.json({
                status: 200,
                msg: "success",
                data: invoceLists,
            });
        } catch (error) {
            return HttpResponse.json({
                status: 400,
                msg: "Internal server error",
                error,
            });
        }
    }),

    // Endpoint to update an invoice
    http.put('/api/data/invoicedata/updateinvoice', async ({ request }) => {
        try {
            const updatedInvoice = await request.json() as InvoiceList;
            const invoiceIndex = invoceLists.findIndex(
                (invoice) => invoice.id === updatedInvoice.id
            );

            if (invoiceIndex !== -1) {
                invoceLists[invoiceIndex] = { ...updatedInvoice };
                return HttpResponse.json({
                    status: 200,
                    msg: "success",
                    data: invoceLists,
                });
            } else {
                return HttpResponse.json({ status: 400, msg: "Invoice not found" });
            }
        } catch (error) {
            return HttpResponse.json({
                status: 400,
                msg: "Internal server error",
                error,
            });
        }
    })
]