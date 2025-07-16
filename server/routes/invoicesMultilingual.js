// server/routes/invoices.js
const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { promisePool } = require('../config/db');

const router = express.Router();

// Localized invoice templates
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
    tax: 'Tax',
    total: 'Total',
    paymentTerms: 'Payment Terms',
    thankYou: 'Thank you for your business!',
    months: {
      1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
      7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
    },
    services: {
      baptism_processing: 'Baptism Record Processing',
      marriage_processing: 'Marriage Record Processing',
      funeral_processing: 'Funeral Record Processing',
      certificate_generation: 'Certificate Generation',
      ocr_processing: 'OCR Document Processing',
      monthly_subscription: 'Monthly Subscription',
      annual_subscription: 'Annual Subscription'
    }
  },
  el: {
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
    tax: 'Φόρος',
    total: 'Σύνολο',
    paymentTerms: 'Όροι Πληρωμής',
    thankYou: 'Σας ευχαριστούμε για τη συνεργασία!',
    months: {
      1: 'Ιανουάριος', 2: 'Φεβρουάριος', 3: 'Μάρτιος', 4: 'Απρίλιος', 5: 'Μάιος', 6: 'Ιούνιος',
      7: 'Ιούλιος', 8: 'Αύγουστος', 9: 'Σεπτέμβριος', 10: 'Οκτώβριος', 11: 'Νοέμβριος', 12: 'Δεκέμβριος'
    },
    services: {
      baptism_processing: 'Επεξεργασία Μητρώου Βάπτισης',
      marriage_processing: 'Επεξεργασία Μητρώου Γάμου',
      funeral_processing: 'Επεξεργασία Μητρώου Κηδείας',
      certificate_generation: 'Δημιουργία Πιστοποιητικού',
      ocr_processing: 'Επεξεργασία OCR Εγγράφων',
      monthly_subscription: 'Μηνιαία Συνδρομή',
      annual_subscription: 'Ετήσια Συνδρομή'
    }
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
    tax: 'Налог',
    total: 'Итого',
    paymentTerms: 'Условия оплаты',
    thankYou: 'Спасибо за ваш бизнес!',
    months: {
      1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
      7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
    },
    services: {
      baptism_processing: 'Обработка записей о крещении',
      marriage_processing: 'Обработка записей о браке',
      funeral_processing: 'Обработка записей о похоронах',
      certificate_generation: 'Генерация сертификатов',
      ocr_processing: 'OCR обработка документов',
      monthly_subscription: 'Месячная подписка',
      annual_subscription: 'Годовая подписка'
    }
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
    tax: 'Taxă',
    total: 'Total',
    paymentTerms: 'Termeni de plată',
    thankYou: 'Vă mulțumim pentru afacerea dvs.!',
    months: {
      1: 'Ianuarie', 2: 'Februarie', 3: 'Martie', 4: 'Aprilie', 5: 'Mai', 6: 'Iunie',
      7: 'Iulie', 8: 'August', 9: 'Septembrie', 10: 'Octombrie', 11: 'Noiembrie', 12: 'Decembrie'
    },
    services: {
      baptism_processing: 'Procesarea înregistrărilor de botez',
      marriage_processing: 'Procesarea înregistrărilor de căsătorie',
      funeral_processing: 'Procesarea înregistrărilor de înmormântare',
      certificate_generation: 'Generarea certificatelor',
      ocr_processing: 'Procesarea OCR a documentelor',
      monthly_subscription: 'Abonament lunar',
      annual_subscription: 'Abonament anual'
    }
  }
};

// Helper function to get localized text
const getLocalizedText = (key, language = 'en', fallback = null) => {
  const translation = invoiceTranslations[language]?.[key] || invoiceTranslations.en?.[key];
  return translation || fallback || key;
};

// Helper function to get localized service name
const getLocalizedService = (serviceKey, language = 'en') => {
  return invoiceTranslations[language]?.services?.[serviceKey] || 
         invoiceTranslations.en?.services?.[serviceKey] || 
         serviceKey;
};

// Helper function to get localized month name
const getLocalizedMonth = (monthNum, language = 'en') => {
  return invoiceTranslations[language]?.months?.[monthNum] || 
         invoiceTranslations.en?.months?.[monthNum] || 
         monthNum.toString();
};

// Generate multilingual invoice PDF
router.post('/generate/:billingId', async (req, res) => {
  try {
    const { billingId } = req.params;
    const { language = 'en', churchId } = req.body;

    // Fetch billing information
    const [billingRows] = await promisePool.query(
      'SELECT * FROM billing WHERE id = ?',
      [billingId]
    );

    if (billingRows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    const billing = billingRows[0];

    // Fetch church information
    const [churchRows] = await promisePool.query(
      'SELECT * FROM churches WHERE id = ?',
      [churchId || billing.church_id]
    );

    const church = churchRows[0] || {
      name: 'Orthodox Church',
      address: 'Church Address',
      email: 'church@example.com'
    };

    // Fetch billing items/services
    const [itemRows] = await promisePool.query(`
      SELECT 
        service_type,
        description,
        quantity,
        unit_price,
        total_amount
      FROM billing_items 
      WHERE billing_id = ?
    `, [billingId]);

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Load fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const headerFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const darkBlue = rgb(0.1, 0.1, 0.5);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.5, 0.5, 0.5);
    const lightGray = rgb(0.9, 0.9, 0.9);

    let yPosition = height - 60;

    // Header
    page.drawText(getLocalizedText('title', language), {
      x: 50,
      y: yPosition,
      size: 28,
      font: titleFont,
      color: darkBlue,
    });

    page.drawText(`#${billing.invoice_number || billingId}`, {
      x: width - 200,
      y: yPosition,
      size: 20,
      font: headerFont,
      color: darkBlue,
    });

    yPosition -= 50;

    // Company info (left side)
    page.drawText('Orthodox Church Records', {
      x: 50,
      y: yPosition,
      size: 14,
      font: headerFont,
      color: black,
    });

    yPosition -= 20;
    page.drawText('Management System', {
      x: 50,
      y: yPosition,
      size: 12,
      font: textFont,
      color: gray,
    });

    // Invoice details (right side)
    const invoiceDate = new Date(billing.created_at);
    const dueDate = new Date(billing.due_date || billing.created_at);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from invoice date

    let rightX = width - 200;
    let rightY = yPosition + 20;

    page.drawText(`${getLocalizedText('date', language)}: ${invoiceDate.toLocaleDateString()}`, {
      x: rightX,
      y: rightY,
      size: 10,
      font: textFont,
      color: black,
    });

    rightY -= 15;
    page.drawText(`${getLocalizedText('dueDate', language)}: ${dueDate.toLocaleDateString()}`, {
      x: rightX,
      y: rightY,
      size: 10,
      font: textFont,
      color: black,
    });

    yPosition -= 60;

    // Bill To section
    page.drawText(getLocalizedText('billTo', language), {
      x: 50,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: black,
    });

    yPosition -= 20;
    page.drawText(church.name, {
      x: 50,
      y: yPosition,
      size: 11,
      font: textFont,
      color: black,
    });

    yPosition -= 15;
    if (church.address) {
      page.drawText(church.address, {
        x: 50,
        y: yPosition,
        size: 10,
        font: textFont,
        color: gray,
      });
      yPosition -= 15;
    }

    if (church.email) {
      page.drawText(church.email, {
        x: 50,
        y: yPosition,
        size: 10,
        font: textFont,
        color: gray,
      });
    }

    yPosition -= 40;

    // Table header
    const tableStartY = yPosition;
    const descriptionX = 50;
    const quantityX = 350;
    const rateX = 420;
    const amountX = 500;

    // Table header background
    page.drawRectangle({
      x: 45,
      y: tableStartY - 5,
      width: width - 90,
      height: 20,
      color: lightGray,
    });

    page.drawText(getLocalizedText('description', language), {
      x: descriptionX,
      y: tableStartY,
      size: 10,
      font: headerFont,
      color: black,
    });

    page.drawText(getLocalizedText('quantity', language), {
      x: quantityX,
      y: tableStartY,
      size: 10,
      font: headerFont,
      color: black,
    });

    page.drawText(getLocalizedText('rate', language), {
      x: rateX,
      y: tableStartY,
      size: 10,
      font: headerFont,
      color: black,
    });

    page.drawText(getLocalizedText('amount', language), {
      x: amountX,
      y: tableStartY,
      size: 10,
      font: headerFont,
      color: black,
    });

    yPosition = tableStartY - 25;

    // Table rows
    let subtotal = 0;
    
    if (itemRows.length === 0) {
      // If no specific items, create default entries based on billing
      const defaultItems = [{
        service_type: 'monthly_subscription',
        description: getLocalizedService('monthly_subscription', language),
        quantity: 1,
        unit_price: billing.amount,
        total_amount: billing.amount
      }];
      
      for (const item of defaultItems) {
        page.drawText(item.description, {
          x: descriptionX,
          y: yPosition,
          size: 9,
          font: textFont,
          color: black,
        });

        page.drawText(item.quantity.toString(), {
          x: quantityX,
          y: yPosition,
          size: 9,
          font: textFont,
          color: black,
        });

        page.drawText(`$${item.unit_price.toFixed(2)}`, {
          x: rateX,
          y: yPosition,
          size: 9,
          font: textFont,
          color: black,
        });

        page.drawText(`$${item.total_amount.toFixed(2)}`, {
          x: amountX,
          y: yPosition,
          size: 9,
          font: textFont,
          color: black,
        });

        subtotal += parseFloat(item.total_amount);
        yPosition -= 20;
      }
    } else {
      for (const item of itemRows) {
        const localizedDescription = item.service_type ? 
          getLocalizedService(item.service_type, language) : 
          item.description;

        page.drawText(localizedDescription, {
          x: descriptionX,
          y: yPosition,
          size: 9,
          font: textFont,
          color: black,
        });

        page.drawText(item.quantity.toString(), {
          x: quantityX,
          y: yPosition,
          size: 9,
          font: textFont,
          color: black,
        });

        page.drawText(`$${item.unit_price.toFixed(2)}`, {
          x: rateX,
          y: yPosition,
          size: 9,
          font: textFont,
          color: black,
        });

        page.drawText(`$${item.total_amount.toFixed(2)}`, {
          x: amountX,
          y: yPosition,
          size: 9,
          font: textFont,
          color: black,
        });

        subtotal += parseFloat(item.total_amount);
        yPosition -= 20;
      }
    }

    yPosition -= 20;

    // Totals section
    const totalsX = 400;
    
    page.drawText(`${getLocalizedText('subtotal', language)}:`, {
      x: totalsX,
      y: yPosition,
      size: 10,
      font: textFont,
      color: black,
    });

    page.drawText(`$${subtotal.toFixed(2)}`, {
      x: amountX,
      y: yPosition,
      size: 10,
      font: textFont,
      color: black,
    });

    yPosition -= 15;

    const taxAmount = billing.tax_amount || 0;
    if (taxAmount > 0) {
      page.drawText(`${getLocalizedText('tax', language)}:`, {
        x: totalsX,
        y: yPosition,
        size: 10,
        font: textFont,
        color: black,
      });

      page.drawText(`$${taxAmount.toFixed(2)}`, {
        x: amountX,
        y: yPosition,
        size: 10,
        font: textFont,
        color: black,
      });

      yPosition -= 15;
    }

    // Total line
    page.drawRectangle({
      x: totalsX - 5,
      y: yPosition - 5,
      width: 170,
      height: 20,
      color: lightGray,
    });

    page.drawText(`${getLocalizedText('total', language)}:`, {
      x: totalsX,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: black,
    });

    const totalAmount = subtotal + taxAmount;
    page.drawText(`$${totalAmount.toFixed(2)}`, {
      x: amountX,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: darkBlue,
    });

    yPosition -= 60;

    // Thank you message
    page.drawText(getLocalizedText('thankYou', language), {
      x: 50,
      y: yPosition,
      size: 12,
      font: textFont,
      color: darkBlue,
    });

    // Footer
    yPosition = 60;
    page.drawText('Orthodox Church Records Management System', {
      x: 50,
      y: yPosition,
      size: 8,
      font: textFont,
      color: gray,
    });

    page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: width - 150,
      y: yPosition,
      size: 8,
      font: textFont,
      color: gray,
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${billingId}-${language}.pdf"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Get invoice data for preview
router.get('/preview/:billingId', async (req, res) => {
  try {
    const { billingId } = req.params;
    const { language = 'en', churchId } = req.query;

    // Fetch billing information
    const [billingRows] = await promisePool.query(
      'SELECT * FROM billing WHERE id = ?',
      [billingId]
    );

    if (billingRows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    const billing = billingRows[0];

    // Fetch church information
    const [churchRows] = await promisePool.query(
      'SELECT * FROM churches WHERE id = ?',
      [churchId || billing.church_id]
    );

    const church = churchRows[0];

    // Fetch billing items
    const [itemRows] = await promisePool.query(
      'SELECT * FROM billing_items WHERE billing_id = ?',
      [billingId]
    );

    res.json({
      billing,
      church,
      items: itemRows,
      language,
      translations: invoiceTranslations[language] || invoiceTranslations.en,
      downloadUrl: `/api/invoices/generate/${billingId}`
    });

  } catch (error) {
    console.error('Invoice preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

module.exports = router;
