// server/routes/enhancedInvoices.js
// Enhanced multilingual invoice system with full CRUD operations
const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const { promisePool } = require('../config/db');
const { cleanRecords, cleanRecord, formatDate, formatDateTime } = require('../utils/dateFormatter');

const router = express.Router();

// Comprehensive invoice translations
const invoiceTranslations = {
  en: {
    title: 'INVOICE',
    invoice: 'Invoice',
    date: 'Date',
    dueDate: 'Due Date',
    billTo: 'Bill To',
    description: 'Description',
    quantity: 'Qty',
    rate: 'Rate',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    total: 'Total',
    paymentTerms: 'Payment Terms',
    thankYou: 'Thank you for your business!',
    paymentInstructions: 'Please remit payment within 30 days.',
    notes: 'Notes',
    currency: 'USD',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel'
  },
  gr: {
    title: 'ΤΙΜΟΛΟΓΙΟ',
    invoice: 'Τιμολόγιο',
    date: 'Ημερομηνία',
    dueDate: 'Ημερομηνία Λήξης',
    billTo: 'Πληρωτέος',
    description: 'Περιγραφή',
    quantity: 'Ποσ.',
    rate: 'Τιμή',
    amount: 'Ποσό',
    subtotal: 'Υποσύνολο',
    discount: 'Έκπτωση',
    tax: 'Φόρος',
    total: 'Σύνολο',
    paymentTerms: 'Όροι Πληρωμής',
    thankYou: 'Σας ευχαριστούμε για τη συνεργασία!',
    paymentInstructions: 'Παρακαλούμε να πληρώσετε εντός 30 ημερών.',
    notes: 'Σημειώσεις',
    currency: 'EUR',
    add: 'Προσθήκη',
    edit: 'Επεξεργασία',
    delete: 'Διαγραφή',
    save: 'Αποθήκευση',
    cancel: 'Ακύρωση'
  },
  ru: {
    title: 'СЧЕТ-ФАКТУРА',
    invoice: 'Счет-фактура',
    date: 'Дата',
    dueDate: 'Срок оплаты',
    billTo: 'Плательщик',
    description: 'Описание',
    quantity: 'Кол.',
    rate: 'Цена',
    amount: 'Сумма',
    subtotal: 'Промежуточный итог',
    discount: 'Скидка',
    tax: 'Налог',
    total: 'Итого',
    paymentTerms: 'Условия оплаты',
    thankYou: 'Спасибо за ваш бизнес!',
    paymentInstructions: 'Пожалуйста, произведите оплату в течение 30 дней.',
    notes: 'Примечания',
    currency: 'RUB',
    add: 'Добавить',
    edit: 'Редактировать',
    delete: 'Удалить',
    save: 'Сохранить',
    cancel: 'Отмена'
  },
  ro: {
    title: 'FACTURĂ',
    invoice: 'Factură',
    date: 'Data',
    dueDate: 'Data scadentă',
    billTo: 'Facturare către',
    description: 'Descriere',
    quantity: 'Cant.',
    rate: 'Preț',
    amount: 'Sumă',
    subtotal: 'Subtotal',
    discount: 'Reducere',
    tax: 'Taxă',
    total: 'Total',
    paymentTerms: 'Termeni de plată',
    thankYou: 'Vă mulțumim pentru afacerea dvs.!',
    paymentInstructions: 'Vă rugăm să efectuați plata în termen de 30 de zile.',
    notes: 'Note',
    currency: 'RON',
    add: 'Adaugă',
    edit: 'Editează',
    delete: 'Șterge',
    save: 'Salvează',
    cancel: 'Anulează'
  }
};

// Helper function to get localized text
const getLocalizedText = (key, language = 'en') => {
  return invoiceTranslations[language]?.[key] || invoiceTranslations.en?.[key] || key;
};

// Helper function to get localized service info
const getLocalizedService = async (serviceCode, language = 'en') => {
  try {
    const [rows] = await promisePool.query(
      `SELECT name_${language} as name, description_${language} as description, default_price, unit_type 
       FROM service_catalog WHERE service_code = ? AND is_active = TRUE`,
      [serviceCode]
    );
    
    if (rows.length > 0) {
      return rows[0];
    }
    
    // Fallback to English if preferred language not available
    if (language !== 'en') {
      const [fallbackRows] = await promisePool.query(
        'SELECT name_en as name, description_en as description, default_price, unit_type FROM service_catalog WHERE service_code = ? AND is_active = TRUE',
        [serviceCode]
      );
      return fallbackRows[0] || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching localized service:', error);
    return null;
  }
};

// Generate unique invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};

// GET /api/enhanced-invoices - List all invoices with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      church_id, 
      status, 
      language,
      date_from,
      date_to 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];
    
    if (church_id) {
      whereClause += ' AND i.church_id = ?';
      params.push(church_id);
    }
    
    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }
    
    if (language) {
      whereClause += ' AND i.language = ?';
      params.push(language);
    }
    
    if (date_from) {
      whereClause += ' AND i.date >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      whereClause += ' AND i.date <= ?';
      params.push(date_to);
    }
    
    const [countResult] = await promisePool.query(
      `SELECT COUNT(*) as total FROM invoices i WHERE ${whereClause}`,
      params
    );
    
    const [invoices] = await promisePool.query(`
      SELECT 
        i.*,
        c.name as church_name,
        c.email as church_email,
        COUNT(ii.id) as item_count
      FROM invoices i
      LEFT JOIN churches c ON i.church_id = c.id
      LEFT JOIN invoice_items_enhanced ii ON i.id = ii.invoice_id AND ii.is_active = TRUE
      WHERE ${whereClause}
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      invoices: cleanRecords(invoices),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Could not fetch invoices' });
  }
});

// GET /api/enhanced-invoices/:id - Get specific invoice with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get invoice details
    const [invoiceRows] = await promisePool.query(`
      SELECT 
        i.*,
        c.name as church_name,
        c.email as church_email,
        c.address as church_address,
        c.city as church_city,
        c.country as church_country,
        c.preferred_language as church_language
      FROM invoices i
      LEFT JOIN churches c ON i.church_id = c.id
      WHERE i.id = ?
    `, [id]);
    
    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get invoice items
    const [itemRows] = await promisePool.query(`
      SELECT *
      FROM invoice_items_enhanced
      WHERE invoice_id = ? AND is_active = TRUE
      ORDER BY sort_order ASC, created_at ASC
    `, [id]);
    
    const invoice = cleanRecord(invoiceRows[0]);
    const items = cleanRecords(itemRows);
    
    res.json({
      invoice,
      items,
      localization: invoiceTranslations[invoice.language] || invoiceTranslations.en
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Could not fetch invoice' });
  }
});

// POST /api/enhanced-invoices - Create new invoice
router.post('/', async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    
    const {
      church_id,
      language = 'en',
      due_days = 30,
      currency = 'USD',
      tax_rate = 0,
      notes,
      items = []
    } = req.body;
    
    // Validate required fields
    if (!church_id) {
      return res.status(400).json({ error: 'Church ID is required' });
    }
    
    // Verify church exists
    const [churchRows] = await connection.query(
      'SELECT * FROM churches WHERE id = ?',
      [church_id]
    );
    
    if (churchRows.length === 0) {
      return res.status(404).json({ error: 'Church not found' });
    }
    
    // Generate invoice details
    const invoiceNumber = generateInvoiceNumber();
    const invoiceDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(due_days));
    
    // Calculate totals
    let subtotal = 0;
    const processedItems = [];
    
    for (const item of items) {
      const quantity = parseFloat(item.quantity) || 1;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const discountPercent = parseFloat(item.discount_percent) || 0;
      const discountAmount = parseFloat(item.discount_amount) || 0;
      
      const lineSubtotal = quantity * unitPrice;
      const totalDiscount = discountAmount + (lineSubtotal * discountPercent / 100);
      const lineTotal = lineSubtotal - totalDiscount;
      
      processedItems.push({
        ...item,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        discount_percent: discountPercent,
        discount_amount: totalDiscount
      });
      
      subtotal += lineTotal;
    }
    
    const taxAmount = subtotal * (parseFloat(tax_rate) / 100);
    const totalAmount = subtotal + taxAmount;
    
    // Create invoice
    const [invoiceResult] = await connection.query(`
      INSERT INTO invoices (
        invoice_number, church_id, date, due_date, 
        total_amount, tax_amount, currency, language, 
        status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [
      invoiceNumber, church_id, formatDate(invoiceDate), formatDate(dueDate),
      totalAmount, taxAmount, currency, language, notes
    ]);
    
    const invoiceId = invoiceResult.insertId;
    
    // Create invoice items
    for (let i = 0; i < processedItems.length; i++) {
      const item = processedItems[i];
      await connection.query(`
        INSERT INTO invoice_items_enhanced (
          invoice_id, item_code, name, description, description_key,
          category, quantity, unit_price, line_total, 
          discount_percent, discount_amount, tax_rate, tax_amount, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId, item.item_code || null, item.name, item.description || null,
        item.description_key || null, item.category || 'service',
        item.quantity, item.unit_price, item.line_total,
        item.discount_percent, item.discount_amount, 
        parseFloat(tax_rate), item.line_total * (parseFloat(tax_rate) / 100),
        i
      ]);
    }
    
    await connection.commit();
    
    // Return created invoice
    const [createdInvoice] = await promisePool.query(`
      SELECT 
        i.*,
        c.name as church_name,
        c.email as church_email
      FROM invoices i
      LEFT JOIN churches c ON i.church_id = c.id
      WHERE i.id = ?
    `, [invoiceId]);
    
    res.status(201).json({
      success: true,
      invoice: cleanRecord(createdInvoice[0]),
      message: `Invoice ${invoiceNumber} created successfully`
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Could not create invoice' });
  } finally {
    connection.release();
  }
});

// PUT /api/enhanced-invoices/:id - Update invoice
router.put('/:id', async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const {
      language,
      due_date,
      currency,
      tax_rate,
      notes,
      status,
      items = []
    } = req.body;
    
    // Check if invoice exists and can be modified
    const [existingInvoice] = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );
    
    if (existingInvoice.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (existingInvoice[0].status === 'paid') {
      return res.status(400).json({ error: 'Cannot modify paid invoice' });
    }
    
    // Calculate new totals
    let subtotal = 0;
    const processedItems = [];
    
    for (const item of items) {
      const quantity = parseFloat(item.quantity) || 1;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const discountPercent = parseFloat(item.discount_percent) || 0;
      const discountAmount = parseFloat(item.discount_amount) || 0;
      
      const lineSubtotal = quantity * unitPrice;
      const totalDiscount = discountAmount + (lineSubtotal * discountPercent / 100);
      const lineTotal = lineSubtotal - totalDiscount;
      
      processedItems.push({
        ...item,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        discount_percent: discountPercent,
        discount_amount: totalDiscount
      });
      
      subtotal += lineTotal;
    }
    
    const taxAmount = subtotal * (parseFloat(tax_rate || 0) / 100);
    const totalAmount = subtotal + taxAmount;
    
    // Update invoice
    await connection.query(`
      UPDATE invoices SET
        language = COALESCE(?, language),
        due_date = COALESCE(?, due_date),
        currency = COALESCE(?, currency),
        total_amount = ?,
        tax_amount = ?,
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [language, due_date, currency, totalAmount, taxAmount, status, notes, id]);
    
    // Delete existing items and recreate
    await connection.query(
      'DELETE FROM invoice_items_enhanced WHERE invoice_id = ?',
      [id]
    );
    
    // Create new items
    for (let i = 0; i < processedItems.length; i++) {
      const item = processedItems[i];
      await connection.query(`
        INSERT INTO invoice_items_enhanced (
          invoice_id, item_code, name, description, description_key,
          category, quantity, unit_price, line_total, 
          discount_percent, discount_amount, tax_rate, tax_amount, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, item.item_code || null, item.name, item.description || null,
        item.description_key || null, item.category || 'service',
        item.quantity, item.unit_price, item.line_total,
        item.discount_percent, item.discount_amount, 
        parseFloat(tax_rate || 0), item.line_total * (parseFloat(tax_rate || 0) / 100),
        i
      ]);
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Invoice updated successfully'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Could not update invoice' });
  } finally {
    connection.release();
  }
});

// DELETE /api/enhanced-invoices/:id - Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if invoice can be deleted
    const [existingInvoice] = await promisePool.query(
      'SELECT status FROM invoices WHERE id = ?',
      [id]
    );
    
    if (existingInvoice.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (existingInvoice[0].status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete paid invoice' });
    }
    
    // Delete invoice (cascade will handle items)
    await promisePool.query('DELETE FROM invoices WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Could not delete invoice' });
  }
});

// POST /api/enhanced-invoices/:id/items - Add item to invoice
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_code,
      name,
      description,
      category = 'service',
      quantity = 1,
      unit_price,
      discount_percent = 0,
      discount_amount = 0
    } = req.body;
    
    // Validate required fields
    if (!name || !unit_price) {
      return res.status(400).json({ error: 'Name and unit price are required' });
    }
    
    // Check if invoice exists and can be modified
    const [invoiceRows] = await promisePool.query(
      'SELECT status FROM invoices WHERE id = ?',
      [id]
    );
    
    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoiceRows[0].status === 'paid') {
      return res.status(400).json({ error: 'Cannot modify paid invoice' });
    }
    
    // Calculate line total
    const qty = parseFloat(quantity);
    const price = parseFloat(unit_price);
    const discountPct = parseFloat(discount_percent);
    const discountAmt = parseFloat(discount_amount);
    
    const lineSubtotal = qty * price;
    const totalDiscount = discountAmt + (lineSubtotal * discountPct / 100);
    const lineTotal = lineSubtotal - totalDiscount;
    
    // Get next sort order
    const [maxOrderRows] = await promisePool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM invoice_items_enhanced WHERE invoice_id = ?',
      [id]
    );
    const sortOrder = maxOrderRows[0].next_order;
    
    // Insert item
    const [result] = await promisePool.query(`
      INSERT INTO invoice_items_enhanced (
        invoice_id, item_code, name, description, category,
        quantity, unit_price, line_total, discount_percent, 
        discount_amount, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, item_code, name, description, category,
      qty, price, lineTotal, discountPct, discountAmt, sortOrder
    ]);
    
    // Recalculate invoice total
    await recalculateInvoiceTotal(id);
    
    res.status(201).json({
      success: true,
      item_id: result.insertId,
      message: 'Item added successfully'
    });
    
  } catch (error) {
    console.error('Error adding invoice item:', error);
    res.status(500).json({ error: 'Could not add invoice item' });
  }
});

// PUT /api/enhanced-invoices/:invoiceId/items/:itemId - Update item
router.put('/:invoiceId/items/:itemId', async (req, res) => {
  try {
    const { invoiceId, itemId } = req.params;
    const {
      name,
      description,
      quantity,
      unit_price,
      discount_percent = 0,
      discount_amount = 0
    } = req.body;
    
    // Check if invoice can be modified
    const [invoiceRows] = await promisePool.query(
      'SELECT status FROM invoices WHERE id = ?',
      [invoiceId]
    );
    
    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoiceRows[0].status === 'paid') {
      return res.status(400).json({ error: 'Cannot modify paid invoice' });
    }
    
    // Calculate new line total
    const qty = parseFloat(quantity);
    const price = parseFloat(unit_price);
    const discountPct = parseFloat(discount_percent);
    const discountAmt = parseFloat(discount_amount);
    
    const lineSubtotal = qty * price;
    const totalDiscount = discountAmt + (lineSubtotal * discountPct / 100);
    const lineTotal = lineSubtotal - totalDiscount;
    
    // Update item
    const [result] = await promisePool.query(`
      UPDATE invoice_items_enhanced SET
        name = ?, description = ?, quantity = ?, unit_price = ?,
        discount_percent = ?, discount_amount = ?, line_total = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND invoice_id = ?
    `, [
      name, description, qty, price, discountPct, discountAmt, lineTotal,
      itemId, invoiceId
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invoice item not found' });
    }
    
    // Recalculate invoice total
    await recalculateInvoiceTotal(invoiceId);
    
    res.json({
      success: true,
      message: 'Item updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating invoice item:', error);
    res.status(500).json({ error: 'Could not update invoice item' });
  }
});

// DELETE /api/enhanced-invoices/:invoiceId/items/:itemId - Delete item
router.delete('/:invoiceId/items/:itemId', async (req, res) => {
  try {
    const { invoiceId, itemId } = req.params;
    
    // Check if invoice can be modified
    const [invoiceRows] = await promisePool.query(
      'SELECT status FROM invoices WHERE id = ?',
      [invoiceId]
    );
    
    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoiceRows[0].status === 'paid') {
      return res.status(400).json({ error: 'Cannot modify paid invoice' });
    }
    
    // Delete item
    const [result] = await promisePool.query(
      'DELETE FROM invoice_items_enhanced WHERE id = ? AND invoice_id = ?',
      [itemId, invoiceId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invoice item not found' });
    }
    
    // Recalculate invoice total
    await recalculateInvoiceTotal(invoiceId);
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting invoice item:', error);
    res.status(500).json({ error: 'Could not delete invoice item' });
  }
});

// GET /api/enhanced-invoices/service-catalog - Get available services
router.get('/service-catalog', async (req, res) => {
  try {
    const { language = 'en', category } = req.query;
    
    let whereClause = 'is_active = TRUE';
    const params = [];
    
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    
    const [services] = await promisePool.query(`
      SELECT 
        service_code,
        category,
        name_${language} as name,
        description_${language} as description,
        default_price,
        unit_type,
        is_taxable
      FROM service_catalog
      WHERE ${whereClause}
      ORDER BY category, name_${language}
    `, params);
    
    res.json({
      services: cleanRecords(services),
      categories: ['church_services', 'record_processing', 'certificates', 'software_services', 'consulting', 'other']
    });
    
  } catch (error) {
    console.error('Error fetching service catalog:', error);
    res.status(500).json({ error: 'Could not fetch service catalog' });
  }
});

// POST /api/enhanced-invoices/:id/generate-pdf - Generate PDF
router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { template = 'standard' } = req.body;
    
    // Get invoice with all details
    const [invoiceRows] = await promisePool.query(`
      SELECT 
        i.*,
        c.name as church_name,
        c.email as church_email,
        c.address as church_address,
        c.city as church_city,
        c.country as church_country
      FROM invoices i
      LEFT JOIN churches c ON i.church_id = c.id
      WHERE i.id = ?
    `, [id]);
    
    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceRows[0];
    
    // Get invoice items
    const [itemRows] = await promisePool.query(`
      SELECT *
      FROM invoice_items_enhanced
      WHERE invoice_id = ? AND is_active = TRUE
      ORDER BY sort_order ASC
    `, [id]);
    
    const items = itemRows;
    const translations = invoiceTranslations[invoice.language] || invoiceTranslations.en;
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    
    // Load fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const headerFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Colors
    const primaryColor = rgb(0.2, 0.2, 0.6);
    const secondaryColor = rgb(0.4, 0.4, 0.4);
    const textColor = rgb(0, 0, 0);
    
    let yPosition = height - 50;
    
    // Header - Invoice Title
    page.drawText(translations.title, {
      x: 50,
      y: yPosition,
      size: 28,
      font: titleFont,
      color: primaryColor,
    });
    
    // Invoice number and date (right side)
    page.drawText(`${translations.invoice} #${invoice.invoice_number}`, {
      x: width - 200,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: textColor,
    });
    
    page.drawText(`${translations.date}: ${formatDate(invoice.date)}`, {
      x: width - 200,
      y: yPosition - 20,
      size: 10,
      font: textFont,
      color: textColor,
    });
    
    page.drawText(`${translations.dueDate}: ${formatDate(invoice.due_date)}`, {
      x: width - 200,
      y: yPosition - 35,
      size: 10,
      font: textFont,
      color: textColor,
    });
    
    yPosition -= 80;
    
    // Church Information
    page.drawText(`${translations.billTo}:`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: textColor,
    });
    
    yPosition -= 20;
    page.drawText(invoice.church_name || 'Church Name', {
      x: 50,
      y: yPosition,
      size: 11,
      font: textFont,
      color: textColor,
    });
    
    if (invoice.church_address) {
      yPosition -= 15;
      page.drawText(invoice.church_address, {
        x: 50,
        y: yPosition,
        size: 10,
        font: textFont,
        color: textColor,
      });
    }
    
    if (invoice.church_city) {
      yPosition -= 15;
      page.drawText(`${invoice.church_city}, ${invoice.church_country || ''}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: textFont,
        color: textColor,
      });
    }
    
    yPosition -= 40;
    
    // Table Header
    const tableTop = yPosition;
    const tableLeft = 50;
    const colWidths = [280, 60, 80, 100]; // Description, Qty, Rate, Amount
    const rowHeight = 20;
    
    // Draw table header background
    page.drawRectangle({
      x: tableLeft,
      y: tableTop - rowHeight,
      width: colWidths.reduce((a, b) => a + b, 0),
      height: rowHeight,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    // Table headers
    const headers = [translations.description, translations.quantity, translations.rate, translations.amount];
    let xPos = tableLeft + 5;
    
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: xPos,
        y: tableTop - 15,
        size: 10,
        font: headerFont,
        color: textColor,
      });
      xPos += colWidths[index];
    });
    
    // Table rows
    yPosition = tableTop - rowHeight;
    let subtotal = 0;
    
    items.forEach((item, index) => {
      yPosition -= rowHeight;
      
      // Alternate row background
      if (index % 2 === 1) {
        page.drawRectangle({
          x: tableLeft,
          y: yPosition,
          width: colWidths.reduce((a, b) => a + b, 0),
          height: rowHeight,
          color: rgb(0.95, 0.95, 0.95),
        });
      }
      
      xPos = tableLeft + 5;
      const rowData = [
        item.name + (item.description ? `\n${item.description}` : ''),
        item.quantity.toString(),
        `${invoice.currency} ${parseFloat(item.unit_price).toFixed(2)}`,
        `${invoice.currency} ${parseFloat(item.line_total).toFixed(2)}`
      ];
      
      rowData.forEach((data, colIndex) => {
        page.drawText(data, {
          x: xPos,
          y: yPosition + 5,
          size: 9,
          font: textFont,
          color: textColor,
        });
        xPos += colWidths[colIndex];
      });
      
      subtotal += parseFloat(item.line_total);
    });
    
    // Totals section
    yPosition -= 40;
    const totalsLeft = width - 200;
    
    // Subtotal
    page.drawText(`${translations.subtotal}:`, {
      x: totalsLeft,
      y: yPosition,
      size: 10,
      font: textFont,
      color: textColor,
    });
    
    page.drawText(`${invoice.currency} ${subtotal.toFixed(2)}`, {
      x: totalsLeft + 100,
      y: yPosition,
      size: 10,
      font: textFont,
      color: textColor,
    });
    
    // Tax
    yPosition -= 20;
    page.drawText(`${translations.tax}:`, {
      x: totalsLeft,
      y: yPosition,
      size: 10,
      font: textFont,
      color: textColor,
    });
    
    page.drawText(`${invoice.currency} ${parseFloat(invoice.tax_amount || 0).toFixed(2)}`, {
      x: totalsLeft + 100,
      y: yPosition,
      size: 10,
      font: textFont,
      color: textColor,
    });
    
    // Total
    yPosition -= 25;
    page.drawRectangle({
      x: totalsLeft - 5,
      y: yPosition - 5,
      width: 150,
      height: 25,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    page.drawText(`${translations.total}:`, {
      x: totalsLeft,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: textColor,
    });
    
    page.drawText(`${invoice.currency} ${parseFloat(invoice.total_amount).toFixed(2)}`, {
      x: totalsLeft + 100,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: primaryColor,
    });
    
    // Footer
    yPosition = 100;
    page.drawText(translations.thankYou, {
      x: 50,
      y: yPosition,
      size: 11,
      font: headerFont,
      color: primaryColor,
    });
    
    yPosition -= 20;
    page.drawText(translations.paymentInstructions, {
      x: 50,
      y: yPosition,
      size: 9,
      font: textFont,
      color: textColor,
    });
    
    if (invoice.notes) {
      yPosition -= 30;
      page.drawText(`${translations.notes}:`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: headerFont,
        color: textColor,
      });
      
      yPosition -= 15;
      page.drawText(invoice.notes, {
        x: 50,
        y: yPosition,
        size: 9,
        font: textFont,
        color: textColor,
      });
    }
    
    // Generate PDF buffer
    const pdfBytes = await pdfDoc.save();
    
    // Save PDF file (optional)
    const filename = `invoice-${invoice.invoice_number}.pdf`;
    const pdfPath = path.join(__dirname, '../temp', filename);
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(pdfPath), { recursive: true });
    await fs.writeFile(pdfPath, pdfBytes);
    
    // Update invoice with PDF path
    await promisePool.query(
      'UPDATE invoices SET pdf_path = ? WHERE id = ?',
      [pdfPath, id]
    );
    
    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Could not generate PDF' });
  }
});

// Helper function to recalculate invoice total
async function recalculateInvoiceTotal(invoiceId) {
  try {
    const [items] = await promisePool.query(
      'SELECT SUM(line_total) as subtotal FROM invoice_items_enhanced WHERE invoice_id = ? AND is_active = TRUE',
      [invoiceId]
    );
    
    const subtotal = parseFloat(items[0].subtotal || 0);
    
    // Get current tax rate from invoice
    const [invoiceRows] = await promisePool.query(
      'SELECT tax_amount, total_amount FROM invoices WHERE id = ?',
      [invoiceId]
    );
    
    const currentTaxAmount = parseFloat(invoiceRows[0].tax_amount || 0);
    const taxRate = subtotal > 0 ? (currentTaxAmount / subtotal) * 100 : 0;
    
    const newTaxAmount = subtotal * (taxRate / 100);
    const newTotal = subtotal + newTaxAmount;
    
    await promisePool.query(
      'UPDATE invoices SET total_amount = ?, tax_amount = ? WHERE id = ?',
      [newTotal, newTaxAmount, invoiceId]
    );
    
  } catch (error) {
    console.error('Error recalculating invoice total:', error);
  }
}

// ... continuing with module export at the end
module.exports = router;
