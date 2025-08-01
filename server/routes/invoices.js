// server/routes/invoices.js
const express = require('express');
const { promisePool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireChurchBilling } = require('../middleware/churchSecurity');
const router = express.Router();

// Import the invoice generator utilities (assuming Node.js compatible version)
// Note: Since the current generator is ES6 modules, we'll need to either:
// 1. Convert to CommonJS, or 2. Use dynamic imports, or 3. Create a Node.js specific version

/**
 * Sample invoice data generator for church services
 */
function generateSampleInvoiceData(serviceType = 'baptism', locale = 'en') {
    const baseData = {
        invoiceNumber: `INV-${Date.now()}`,
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        church: {
            name: "St. John Orthodox Church",
            address: "123 Church Street",
            city: "City Name",
            postalCode: "12345",
            country: "United States",
            phone: "+1 (555) 123-4567",
            email: "info@stjohnorthodox.org"
        },
        client: {
            name: "John and Mary Doe",
            address: "456 Family Lane",
            city: "Client City",
            postalCode: "67890",
            country: "United States",
            phone: "+1 (555) 987-6543",
            email: "john.doe@email.com"
        },
        services: [],
        fees: [],
        totalAmount: 0,
        currency: "USD",
        locale: locale
    };

    // Generate service-specific data
    switch (serviceType) {
        case 'baptism':
            baseData.services = [
                {
                    type: 'baptism',
                    description: 'Baptism Ceremony',
                    participant: 'Baby Jane Doe',
                    date: new Date().toISOString(),
                    duration: '1 hour'
                }
            ];
            baseData.fees = [
                { description: 'Baptism Ceremony', amount: 200, currency: 'USD' },
                { description: 'Certificate Processing', amount: 25, currency: 'USD' }
            ];
            baseData.totalAmount = 225;
            break;

        case 'marriage':
            baseData.services = [
                {
                    type: 'marriage',
                    description: 'Marriage Ceremony',
                    participants: ['John Doe', 'Mary Smith'],
                    date: new Date().toISOString(),
                    duration: '2 hours'
                }
            ];
            baseData.fees = [
                { description: 'Marriage Ceremony', amount: 500, currency: 'USD' },
                { description: 'Certificate Processing', amount: 35, currency: 'USD' },
                { description: 'Church Decoration', amount: 150, currency: 'USD' }
            ];
            baseData.totalAmount = 685;
            break;

        case 'funeral':
            baseData.services = [
                {
                    type: 'funeral',
                    description: 'Memorial Service',
                    participant: 'Late John Smith Sr.',
                    date: new Date().toISOString(),
                    duration: '1.5 hours'
                }
            ];
            baseData.fees = [
                { description: 'Memorial Service', amount: 300, currency: 'USD' },
                { description: 'Church Use', amount: 100, currency: 'USD' }
            ];
            baseData.totalAmount = 400;
            break;

        default:
            baseData.services = [
                {
                    type: 'general',
                    description: 'Church Service',
                    date: new Date().toISOString()
                }
            ];
            baseData.fees = [
                { description: 'Church Service', amount: 100, currency: 'USD' }
            ];
            baseData.totalAmount = 100;
    }

    return baseData;
}

// GET /api/invoices/sample - Generate sample invoice data
router.get('/sample', async (req, res) => {
    try {
        const { serviceType = 'baptism', locale = 'en' } = req.query;
        const sampleData = generateSampleInvoiceData(serviceType, locale);

        res.json({
            success: true,
            data: sampleData
        });
    } catch (error) {
        console.error('Error generating sample invoice:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate sample invoice'
        });
    }
});

// POST /api/invoices/generate - Generate invoice from service record
router.post('/generate', async (req, res) => {
    try {
        const { serviceId, serviceType, locale = 'en' } = req.body;

        if (!serviceId || !serviceType) {
            return res.status(400).json({
                success: false,
                error: 'serviceId and serviceType are required'
            });
        }

        let serviceData;

        // Fetch service data from appropriate table
        switch (serviceType.toLowerCase()) {
            case 'baptism':
                const [baptismRows] = await promisePool.query(
                    'SELECT * FROM baptism_records WHERE id = ?',
                    [serviceId]
                );
                if (baptismRows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Baptism record not found'
                    });
                }
                serviceData = baptismRows[0];
                break;

            case 'marriage':
                const [marriageRows] = await promisePool.query(
                    'SELECT * FROM marriage_records WHERE id = ?',
                    [serviceId]
                );
                if (marriageRows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Marriage record not found'
                    });
                }
                serviceData = marriageRows[0];
                break;

            case 'funeral':
                const [funeralRows] = await promisePool.query(
                    'SELECT * FROM funeral_records WHERE id = ?',
                    [serviceId]
                );
                if (funeralRows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Funeral record not found'
                    });
                }
                serviceData = funeralRows[0];
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid service type'
                });
        }

        // Convert service data to invoice format
        const invoiceData = convertServiceToInvoice(serviceData, serviceType, locale);

        res.json({
            success: true,
            data: invoiceData
        });

    } catch (error) {
        console.error('Error generating invoice from service:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate invoice'
        });
    }
});

// Helper function to convert service record to invoice format
function convertServiceToInvoice(serviceData, serviceType, locale) {
    const invoiceData = {
        invoiceNumber: `INV-${serviceType.toUpperCase()}-${serviceData.id}-${Date.now()}`,
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        church: {
            name: "St. John Orthodox Church",
            address: "123 Church Street",
            city: "City Name",
            postalCode: "12345",
            country: "United States",
            phone: "+1 (555) 123-4567",
            email: "info@stjohnorthodox.org"
        },
        client: {
            name: serviceData.participant_name || serviceData.groom_name || serviceData.deceased_name || "Client Name",
            address: serviceData.participant_address || "Client Address",
            city: serviceData.participant_city || "Client City",
            postalCode: serviceData.participant_postal_code || "12345",
            country: serviceData.participant_country || "Country",
            phone: serviceData.participant_phone || "",
            email: serviceData.participant_email || ""
        },
        services: [],
        fees: [],
        totalAmount: 0,
        currency: "USD",
        locale: locale
    };

    // Service-specific conversions
    switch (serviceType.toLowerCase()) {
        case 'baptism':
            invoiceData.services.push({
                type: 'baptism',
                description: 'Baptism Ceremony',
                participant: serviceData.participant_name,
                date: serviceData.baptism_date || serviceData.created_at,
                duration: '1 hour'
            });
            invoiceData.fees = [
                { description: 'Baptism Ceremony', amount: 200, currency: 'USD' },
                { description: 'Certificate Processing', amount: 25, currency: 'USD' }
            ];
            invoiceData.totalAmount = 225;
            break;

        case 'marriage':
            invoiceData.services.push({
                type: 'marriage',
                description: 'Marriage Ceremony',
                participants: [serviceData.groom_name, serviceData.bride_name],
                date: serviceData.marriage_date || serviceData.created_at,
                duration: '2 hours'
            });
            invoiceData.fees = [
                { description: 'Marriage Ceremony', amount: 500, currency: 'USD' },
                { description: 'Certificate Processing', amount: 35, currency: 'USD' }
            ];
            invoiceData.totalAmount = 535;
            break;

        case 'funeral':
            invoiceData.services.push({
                type: 'funeral',
                description: 'Memorial Service',
                participant: serviceData.deceased_name,
                date: serviceData.service_date || serviceData.created_at,
                duration: '1.5 hours'
            });
            invoiceData.fees = [
                { description: 'Memorial Service', amount: 300, currency: 'USD' },
                { description: 'Church Use', amount: 100, currency: 'USD' }
            ];
            invoiceData.totalAmount = 400;
            break;
    }

    return invoiceData;
}

// GET /api/invoices - Get all invoices with filtering and pagination
router.get('/', requireAuth, requireChurchBilling(), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            church_id,
            date_from,
            date_to,
            search
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = '';
        let queryParams = [];

        // Build WHERE clause based on filters
        const conditions = [];

        if (status) {
            conditions.push('i.status = ?');
            queryParams.push(status);
        }

        if (church_id) {
            conditions.push('i.church_id = ?');
            queryParams.push(church_id);
        }

        if (date_from) {
            conditions.push('i.issue_date >= ?');
            queryParams.push(date_from);
        }

        if (date_to) {
            conditions.push('i.issue_date <= ?');
            queryParams.push(date_to);
        } if (search) {
            conditions.push('(i.invoice_number LIKE ? OR c.name LIKE ? OR i.internal_notes LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Get total count
        const [countResult] = await promisePool.query(
            `SELECT COUNT(*) as total 
       FROM invoices i 
       LEFT JOIN churches c ON i.church_id = c.id 
       ${whereClause}`,
            queryParams
        );

        // Get invoices with pagination
        const [invoices] = await promisePool.query(
            `SELECT 
        i.id,
        i.invoice_number,
        i.church_id,
        c.name as church_name,
        i.issue_date,
        i.due_date,
        i.total_amount,
        i.tax_amount,
        i.currency,
        i.language,
        i.status,
        i.paid_at,
        i.internal_notes,
        i.created_at,
        i.updated_at
       FROM invoices i 
       LEFT JOIN churches c ON i.church_id = c.id 
       ${whereClause}
       ORDER BY i.issue_date DESC, i.id DESC
       LIMIT ? OFFSET ?`,
            [...queryParams, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: invoices,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /api/invoices/:id - Get invoice by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [invoices] = await promisePool.query(
            `SELECT 
        i.*,
        c.name as church_name,
        c.address as church_address,
        c.city as church_city,
        c.country as church_country,
        c.email as church_email
       FROM invoices i 
       LEFT JOIN churches c ON i.church_id = c.id 
       WHERE i.id = ?`,
            [id]
        );

        if (invoices.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        // Get invoice items
        const [items] = await promisePool.query(
            'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id',
            [id]
        );

        const invoice = { ...invoices[0], items };

        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/invoices - Create new invoice
router.post('/', requireAuth, requireChurchBilling(), async (req, res) => {
    try {
        const {
            church_id,
            issue_date,
            due_date,
            total_amount,
            tax_amount = 0,
            currency = 'USD',
            language = 'en',
            internal_notes,
            items = []
        } = req.body;

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}`;

        // Insert invoice
        const [invoiceResult] = await promisePool.query(
            `INSERT INTO invoices (
        invoice_number, church_id, issue_date, due_date, total_amount, tax_amount, 
        currency, language, internal_notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [invoiceNumber, church_id, issue_date, due_date, total_amount, tax_amount, currency, language, internal_notes]
        );

        const invoiceId = invoiceResult.insertId;

        // Insert invoice items
        if (items.length > 0) {
            const itemsQuery = `INSERT INTO invoice_items (
        invoice_id, item_code, name_multilang, description_multilang, category, 
        quantity, unit_type, unit_price, discount_percent, discount_amount, 
        line_total, tax_rate, tax_amount, sort_order
      ) VALUES ?`;
            const itemsValues = items.map(item => [
                invoiceId,
                item.item_code || null,
                item.name_multilang || JSON.stringify({ en: item.name || item.description }),
                item.description_multilang || JSON.stringify({ en: item.description || '' }),
                item.category || 'service',
                item.quantity || 1,
                item.unit_type || 'each',
                item.unit_price || item.amount || 0,
                item.discount_percent || 0,
                item.discount_amount || 0,
                item.line_total || (item.quantity || 1) * (item.unit_price || item.amount || 0),
                item.tax_rate || 0,
                item.tax_amount || 0,
                item.sort_order || 0
            ]);
            await promisePool.query(itemsQuery, [itemsValues]);
        }

        // Get the created invoice
        const [newInvoice] = await promisePool.query(
            `SELECT 
        i.*,
        c.name as church_name
       FROM invoices i 
       LEFT JOIN churches c ON i.church_id = c.id 
       WHERE i.id = ?`,
            [invoiceId]
        );

        res.status(201).json({ success: true, data: newInvoice[0] });
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// PUT /api/invoices/:id - Update invoice
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            church_id,
            issue_date,
            due_date,
            total_amount,
            tax_amount,
            currency,
            language,
            status,
            internal_notes
        } = req.body;

        const [result] = await promisePool.query(
            `UPDATE invoices SET 
        church_id = COALESCE(?, church_id),
        issue_date = COALESCE(?, issue_date),
        due_date = COALESCE(?, due_date),
        total_amount = COALESCE(?, total_amount),
        tax_amount = COALESCE(?, tax_amount),
        currency = COALESCE(?, currency),
        language = COALESCE(?, language),
        status = COALESCE(?, status),
        internal_notes = COALESCE(?, internal_notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
            [church_id, issue_date, due_date, total_amount, tax_amount, currency, language, status, internal_notes, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        // Get updated invoice
        const [updatedInvoice] = await promisePool.query(
            `SELECT 
        i.*,
        c.name as church_name
       FROM invoices i 
       LEFT JOIN churches c ON i.church_id = c.id 
       WHERE i.id = ?`,
            [id]
        );

        res.json({ success: true, data: updatedInvoice[0] });
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await promisePool.query('DELETE FROM invoices WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        res.json({ success: true, message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// PUT /api/invoices/:id/mark-paid - Mark invoice as paid
router.put('/:id/mark-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const { paid_date } = req.body;

        const paidDate = paid_date || new Date().toISOString().split('T')[0];

        const [result] = await promisePool.query(
            'UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?',
            ['paid', paidDate, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        // Get updated invoice
        const [updatedInvoice] = await promisePool.query(
            `SELECT 
        i.*,
        c.name as church_name
       FROM invoices i 
       LEFT JOIN churches c ON i.church_id = c.id 
       WHERE i.id = ?`,
            [id]
        );

        res.json({ success: true, data: updatedInvoice[0] });
    } catch (error) {
        console.error('Error marking invoice as paid:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /api/invoices/:id/pdf - Generate PDF for invoice
router.get('/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;

        // Get invoice data
        const [invoices] = await promisePool.query(
            `SELECT 
        i.*,
        c.name as church_name,
        c.address as church_address,
        c.city as church_city,
        c.country as church_country,
        c.email as church_email
       FROM invoices i 
       LEFT JOIN churches c ON i.church_id = c.id 
       WHERE i.id = ?`,
            [id]
        );

        if (invoices.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        // Get invoice items
        const [items] = await promisePool.query(
            'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id',
            [id]
        );

        const invoice = { ...invoices[0], items };

        // For now, return a simple response indicating PDF would be generated
        // In a real implementation, you'd use a PDF library like pdf-lib or puppeteer
        res.json({
            success: true,
            message: 'PDF generation not implemented on server-side. Use client-side PDF generation.',
            invoice: invoice
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /api/invoices/locales - Get supported locales
router.get('/locales', (req, res) => {
    res.json({
        success: true,
        data: {
            supportedLocales: ['en', 'gr', 'ru', 'ro'],
            localeInfo: {
                en: { name: 'English', flag: '🇺🇸' },
                gr: { name: 'Greek', flag: '🇬🇷' },
                ru: { name: 'Russian', flag: '🇷🇺' },
                ro: { name: 'Romanian', flag: '🇷🇴' }
            }
        }
    });
});

module.exports = router;
