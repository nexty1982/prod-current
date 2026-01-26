// server/utils/billingInvoiceGenerator.js
const fs = require('fs');
const path = require('path');

class BillingInvoiceGenerator {
  constructor() {
    this.translations = this.loadTranslations();
  }

  loadTranslations() {
    const translations = {};
    const locales = ['en', 'gr', 'ru', 'ro'];
    
    locales.forEach(locale => {
      try {
        const filePath = path.join(__dirname, '../../data/i18n/billing', `${locale}.json`);
        if (fs.existsSync(filePath)) {
          translations[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
      } catch (error) {
        console.error(`Error loading translations for ${locale}:`, error);
        translations[locale] = translations['en'] || {}; // Fallback to English
      }
    });
    
    return translations;
  }

  formatCurrency(amount, currency = 'USD', locale = 'en') {
    const localeMap = {
      'en': 'en-US',
      'gr': 'el-GR', 
      'ru': 'ru-RU',
      'ro': 'ro-RO'
    };
    
    try {
      return new Intl.NumberFormat(localeMap[locale] || 'en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
  }

  formatDate(date, locale = 'en') {
    const localeMap = {
      'en': 'en-US',
      'gr': 'el-GR',
      'ru': 'ru-RU', 
      'ro': 'ro-RO'
    };
    
    try {
      return new Date(date).toLocaleDateString(localeMap[locale] || 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return new Date(date).toLocaleDateString();
    }
  }

  getTranslation(key, locale = 'en') {
    const keys = key.split('.');
    let translation = this.translations[locale] || this.translations['en'];
    
    for (const k of keys) {
      translation = translation?.[k];
      if (!translation) break;
    }
    
    return translation || key;
  }

  generateBillingInvoice(invoiceData, locale = 'en') {
    const t = (key) => this.getTranslation(key, locale);
    
    const logoUrl = 'data:image/svg+xml;base64,' + Buffer.from(`
      <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="60" fill="#003f7f"/>
        <text x="100" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#ffd700">
          OrthodoxMetrics
        </text>
        <text x="100" y="45" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#e6f3ff">
          Church Management System
        </text>
      </svg>
    `).toString('base64');

    return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('billing.invoice.title')} #${invoiceData.invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 20px auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .invoice-header {
            background: linear-gradient(135deg, #003f7f 0%, #2c5282 100%);
            color: white;
            padding: 30px;
            position: relative;
        }
        
        .invoice-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: #ffd700;
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .company-info h1 {
            font-size: 24px;
            margin-bottom: 8px;
            color: #ffd700;
        }
        
        .company-info p {
            color: #e6f3ff;
            font-size: 14px;
        }
        
        .invoice-meta {
            text-align: right;
        }
        
        .invoice-meta h2 {
            font-size: 20px;
            margin-bottom: 10px;
            color: #ffd700;
        }
        
        .invoice-meta p {
            font-size: 14px;
            color: #e6f3ff;
            margin-bottom: 5px;
        }
        
        .invoice-body {
            padding: 30px;
        }
        
        .billing-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }
        
        .billing-info h3 {
            color: #003f7f;
            font-size: 16px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #ffd700;
        }
        
        .billing-info p {
            margin-bottom: 5px;
            font-size: 14px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-pending {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        .status-paid {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status-failed {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .items-table th {
            background: #003f7f;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        
        .items-table td {
            padding: 15px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }
        
        .items-table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        .items-table tr:hover {
            background-color: #e8f4fd;
        }
        
        .text-right {
            text-align: right;
        }
        
        .totals-section {
            margin-left: auto;
            width: 300px;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
        }
        
        .total-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
            color: #003f7f;
            border-top: 2px solid #ffd700;
            padding-top: 15px;
            margin-top: 10px;
        }
        
        .invoice-footer {
            background: #f8f9fa;
            padding: 30px;
            border-top: 1px solid #dee2e6;
            text-align: center;
        }
        
        .invoice-footer p {
            margin-bottom: 10px;
            font-size: 14px;
            color: #666;
        }
        
        .thank-you {
            font-size: 16px;
            color: #003f7f;
            font-weight: 600;
            margin-bottom: 15px;
        }
        
        .payment-terms {
            background: #e8f4fd;
            border-left: 4px solid #003f7f;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
        
        .payment-terms h4 {
            color: #003f7f;
            margin-bottom: 8px;
        }
        
        @media print {
            body {
                background: white;
            }
            
            .invoice-container {
                box-shadow: none;
                margin: 0;
            }
            
            .invoice-header {
                background: #003f7f !important;
                -webkit-print-color-adjust: exact;
            }
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
            }
            
            .invoice-meta {
                text-align: left;
            }
            
            .billing-section {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .totals-section {
                width: 100%;
            }
            
            .items-table {
                font-size: 12px;
            }
            
            .items-table th,
            .items-table td {
                padding: 10px 8px;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="header-content">
                <div class="company-info">
                    <h1>OrthodoxMetrics</h1>
                    <p>Church Management System</p>
                    <p>Digital Solutions for Orthodox Communities</p>
                </div>
                <div class="invoice-meta">
                    <h2>${t('billing.invoice.title')} #${invoiceData.invoiceNumber}</h2>
                    <p><strong>${t('billing.invoice.date')}:</strong> ${this.formatDate(invoiceData.date, locale)}</p>
                    <p><strong>${t('billing.invoice.due_date')}:</strong> ${this.formatDate(invoiceData.dueDate, locale)}</p>
                    <p><strong>${t('billing.invoice.status')}:</strong> 
                        <span class="status-badge status-${invoiceData.status}">
                            ${t(`billing.payment.status.${invoiceData.status}`)}
                        </span>
                    </p>
                </div>
            </div>
        </div>
        
        <div class="invoice-body">
            <div class="billing-section">
                <div class="billing-info">
                    <h3>${t('billing.invoice.billing_address')}</h3>
                    <p><strong>${invoiceData.church.name}</strong></p>
                    ${invoiceData.church.address ? `<p>${invoiceData.church.address}</p>` : ''}
                    ${invoiceData.church.city ? `<p>${invoiceData.church.city}</p>` : ''}
                    ${invoiceData.church.country ? `<p>${invoiceData.church.country}</p>` : ''}
                </div>
                <div class="billing-info">
                    <h3>${t('billing.payment.title')}</h3>
                    <p><strong>${t('billing.invoice.service_period')}:</strong> ${this.formatDate(invoiceData.date, locale)}</p>
                    <p><strong>${t('billing.invoice.payment_terms')}:</strong> Net 14 days</p>
                    <p><strong>Currency:</strong> ${invoiceData.currency}</p>
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>${t('billing.invoice.description')}</th>
                        <th class="text-right">${t('billing.invoice.quantity')}</th>
                        <th class="text-right">${t('billing.invoice.unit_price')}</th>
                        <th class="text-right">${t('billing.invoice.line_total')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoiceData.items.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td class="text-right">${item.quantity}</td>
                            <td class="text-right">${this.formatCurrency(item.unitPrice, invoiceData.currency, locale)}</td>
                            <td class="text-right">${this.formatCurrency(item.total, invoiceData.currency, locale)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="totals-section">
                <div class="total-row">
                    <span>${t('billing.invoice.subtotal')}:</span>
                    <span>${this.formatCurrency(invoiceData.subtotal, invoiceData.currency, locale)}</span>
                </div>
                ${invoiceData.tax > 0 ? `
                <div class="total-row">
                    <span>${t('billing.invoice.tax')}:</span>
                    <span>${this.formatCurrency(invoiceData.tax, invoiceData.currency, locale)}</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span>${t('billing.invoice.total')}:</span>
                    <span>${this.formatCurrency(invoiceData.total, invoiceData.currency, locale)}</span>
                </div>
            </div>
            
            ${invoiceData.notes ? `
            <div class="payment-terms">
                <h4>${t('billing.invoice.notes')}</h4>
                <p>${invoiceData.notes}</p>
            </div>
            ` : ''}
        </div>
        
        <div class="invoice-footer">
            <p class="thank-you">${t('billing.invoice.thank_you')}</p>
            <p>This invoice was generated automatically by OrthodoxMetrics.</p>
            <p>For questions about this invoice, please contact your administrator.</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateSampleBillingInvoice(locale = 'en') {
    const sampleData = {
      invoiceNumber: 'INV-202507-001',
      date: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      church: {
        name: 'Saints Peter & Paul Orthodox Church',
        address: '123 Church Street',
        city: 'Manville, NJ 08835',
        country: 'United States'
      },
      items: [
        {
          description: 'OrthodoxMetrics Plus Plan - Monthly Subscription',
          quantity: 1,
          unitPrice: 59.99,
          total: 59.99
        }
      ],
      subtotal: 59.99,
      tax: 5.40,
      total: 65.39,
      currency: 'USD',
      status: 'pending',
      notes: 'Thank you for using OrthodoxMetrics to manage your church records and community.'
    };

    return this.generateBillingInvoice(sampleData, locale);
  }
}

module.exports = { BillingInvoiceGenerator };
