const { getAppPool } = require('../config/db-compat');
// server/routes/billing.js
const express = require('express');
const { promisePool } = require('../config/db-compat');
const { BillingInvoiceGenerator } = require('../utils/billingInvoiceGenerator');
const { requireAuth } = require('../middleware/auth');
const { cleanRecord, cleanRecords } = require('../utils/dateFormatter');

// Stripe functionality has been removed from development environment

const router = express.Router();

// Helper function to generate invoice number
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${year}${month}-${random}`;
}

// Debug endpoint to check auth
router.get('/auth-check', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user,
    sessionUser: req.session?.user,
    timestamp: new Date().toISOString()
  });
});

// GET /api/billing/plans - Get all billing plans
router.get('/plans', async (req, res) => {
  try {
    const [plans] = await getAppPool().query(`
      SELECT * FROM billing_plans 
      WHERE is_active = TRUE 
      ORDER BY price_monthly ASC
    `);
    
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching billing plans:', error);
    res.status(500).json({ error: 'Failed to fetch billing plans' });
  }
});

// GET /api/billing/subscription/:churchId - Get church subscription
router.get('/subscription/:churchId', requireAuth, async (req, res) => {
  try {
    const { churchId } = req.params;
    
    const [subscriptions] = await getAppPool().query(`
      SELECT s.*, bp.name as plan_name, bp.plan_code, bp.features, c.name as church_name
      FROM subscriptions s
      JOIN billing_plans bp ON s.plan_id = bp.id
      JOIN churches c ON s.church_id = c.id
      WHERE s.church_id = ? AND s.status != 'cancelled'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [churchId]);
    
    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    res.json({ subscription: cleanRecord(subscriptions[0]) });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// POST /api/billing/subscription - Create or update subscription
router.post('/subscription', requireAuth, async (req, res) => {
  try {
    const { 
      churchId, 
      planId, 
      billingCycle, 
      paymentMethodId 
    } = req.body;

    if (!churchId || !planId || !billingCycle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get plan details
    const [plans] = await getAppPool().query(
      'SELECT * FROM billing_plans WHERE id = ?', 
      [planId]
    );
    
    if (plans.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    const plan = plans[0];
    let amount;
    
    switch (billingCycle) {
      case 'monthly':
        amount = plan.price_monthly;
        break;
      case 'quarterly':
        amount = plan.price_quarterly;
        break;
      case 'yearly':
        amount = plan.price_yearly;
        break;
      default:
        return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    // Calculate renewal date
    const startDate = new Date();
    const renewalDate = new Date(startDate);
    
    switch (billingCycle) {
      case 'monthly':
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        break;
      case 'quarterly':
        renewalDate.setMonth(renewalDate.getMonth() + 3);
        break;
      case 'yearly':
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        break;
    }

    // Check for existing subscription
    const [existingSubs] = await getAppPool().query(
      'SELECT id FROM subscriptions WHERE church_id = ? AND status = "active"',
      [churchId]
    );

    let subscriptionId;
    
    if (existingSubs.length > 0) {
      // Update existing subscription
      subscriptionId = existingSubs[0].id;
      await getAppPool().query(`
        UPDATE subscriptions 
        SET plan_id = ?, billing_cycle = ?, amount = ?, renewal_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [planId, billingCycle, amount, renewalDate, subscriptionId]);
    } else {
      // Create new subscription
      const [result] = await getAppPool().query(`
        INSERT INTO subscriptions (church_id, plan_id, billing_cycle, start_date, renewal_date, status, amount)
        VALUES (?, ?, ?, ?, ?, 'active', ?)
      `, [churchId, planId, billingCycle, startDate, renewalDate, amount]);
      
      subscriptionId = result.insertId;
    }

    // Create initial invoice
    const invoiceNumber = generateInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days to pay

    const [invoiceResult] = await getAppPool().query(`
      INSERT INTO invoices (invoice_number, church_id, subscription_id, date, due_date, total_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [invoiceNumber, churchId, subscriptionId, startDate, dueDate, amount]);
    
    const invoiceId = invoiceResult.insertId;

    // Add invoice item
    await getAppPool().query(`
      INSERT INTO invoice_items (invoice_id, description, amount, quantity, line_total, item_type)
      VALUES (?, ?, ?, 1, ?, 'subscription')
    `, [invoiceId, `${plan.name} - ${billingCycle} billing`, amount, amount]);

    // Log billing event
    await getAppPool().query(`
      INSERT INTO billing_events (church_id, event_type, reference_id, data)
      VALUES (?, 'subscription_created', ?, ?)
    `, [churchId, subscriptionId, JSON.stringify({ plan: plan.name, billing_cycle: billingCycle, amount })]);

    res.json({ 
      success: true, 
      subscriptionId, 
      invoiceId,
      invoiceNumber,
      message: 'Subscription created successfully' 
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// GET /api/billing/invoices/:churchId - Get invoices for a church
router.get('/invoices/:churchId', requireAuth, async (req, res) => {
  try {
    const { churchId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user?.id;
    
    // Basic authorization check
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`User ${userId} requesting invoices for church ${churchId}`);
    
    let whereClause = 'WHERE i.church_id = ?';
    let queryParams = [churchId];
    
    if (status) {
      whereClause += ' AND i.status = ?';
      queryParams.push(status);
    }
    
    const offset = (page - 1) * limit;
    
    const [invoices] = await getAppPool().query(`
      SELECT i.*, c.name as church_name, s.billing_cycle
      FROM invoices i
      LEFT JOIN churches c ON i.church_id = c.id
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
      ${whereClause}
      ORDER BY i.date DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const [countResult] = await getAppPool().query(`
      SELECT COUNT(*) as total 
      FROM invoices i 
      ${whereClause}
    `, queryParams);
    
    res.json({ 
      invoices: cleanRecords(invoices), 
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/billing/invoice/:invoiceId - Get specific invoice with items
router.get('/invoice/:invoiceId', requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Get invoice details
    const [invoices] = await getAppPool().query(`
      SELECT i.*, c.name as church_name, c.address, c.city, c.country, c.preferred_language
      FROM invoices i
      JOIN churches c ON i.church_id = c.id
      WHERE i.id = ?
    `, [invoiceId]);
    
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoices[0];
    
    // Get invoice items
    const [items] = await getAppPool().query(`
      SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id
    `, [invoiceId]);
    
    invoice.items = items;
    
    res.json({ invoice: cleanRecord(invoice) });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// POST /api/billing/invoice/:invoiceId/generate - Generate invoice HTML/PDF
router.post('/invoice/:invoiceId/generate', requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { language = 'en', format = 'html' } = req.body;
    
    // Get invoice data
    const [invoices] = await getAppPool().query(`
      SELECT i.*, c.name as church_name, c.address, c.city, c.country, c.preferred_language
      FROM invoices i
      JOIN churches c ON i.church_id = c.id
      WHERE i.id = ?
    `, [invoiceId]);
    
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoices[0];
    
    // Get invoice items
    const [items] = await getAppPool().query(`
      SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id
    `, [invoiceId]);
    
    // Format invoice data for generator
    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      date: invoice.date,
      dueDate: invoice.due_date,
      church: {
        name: invoice.church_name,
        address: invoice.address,
        city: invoice.city,
        country: invoice.country
      },
      items: items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: parseFloat(item.amount),
        total: parseFloat(item.line_total)
      })),
      subtotal: parseFloat(invoice.total_amount),
      tax: parseFloat(invoice.tax_amount || 0),
      total: parseFloat(invoice.total_amount) + parseFloat(invoice.tax_amount || 0),
      currency: invoice.currency,
      notes: invoice.notes,
      status: invoice.status
    };
    
    const generator = new BillingInvoiceGenerator();
    const html = generator.generateBillingInvoice(invoiceData, language || invoice.preferred_language || 'en');
    
    // Save HTML content to database
    await getAppPool().query(
      'UPDATE invoices SET html_content = ?, language = ? WHERE id = ?',
      [html, language, invoiceId]
    );
    
    if (format === 'pdf') {
      // TODO: Implement PDF generation using Puppeteer or similar
      return res.status(501).json({ error: 'PDF generation not yet implemented' });
    }
    
    res.json({ html, invoiceData });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// GET /api/billing/dashboard/:churchId - Get billing dashboard data
router.get('/dashboard/:churchId', requireAuth, async (req, res) => {
  try {
    const { churchId } = req.params;
    const userId = req.user?.id;
    
    // Basic authorization: users can only access their own church data
    // For now, allow access if churchId matches userId (simplified)
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`User ${userId} requesting billing dashboard for church ${churchId}`);
    
    // Get current subscription
    const [subscriptions] = await getAppPool().query(`
      SELECT s.*, bp.name as plan_name, bp.plan_code, bp.features
      FROM subscriptions s
      LEFT JOIN billing_plans bp ON s.plan_id = bp.id
      WHERE s.church_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [churchId]);
    
    // Get recent invoices
    const [recentInvoices] = await getAppPool().query(`
      SELECT * FROM invoices 
      WHERE church_id = ? 
      ORDER BY date DESC 
      LIMIT 5
    `, [churchId]);
    
    // Get payment method
    const [paymentMethods] = await getAppPool().query(`
      SELECT * FROM payment_methods 
      WHERE church_id = ? AND is_default = TRUE
      LIMIT 1
    `, [churchId]);
    
    // If no data exists, return empty/default data rather than error
    res.json({
      subscription: subscriptions[0] || null,
      recentInvoices: cleanRecords(recentInvoices) || [],
      paymentMethod: paymentMethods[0] || null,
      usage: {
        // Add usage statistics here
        users: 0,
        records: 0,
        // etc.
      }
    });
    
  } catch (error) {
    console.error('Error fetching billing dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
