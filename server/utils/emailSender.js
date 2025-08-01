// Email Sender for OCR Upload Receipts
const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailSender {
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@orthodmetrics.com';
    this.fromName = process.env.FROM_NAME || 'Orthodox Metrics OCR System';
  }
  
  /**
   * Send upload receipt email
   */
  async sendUploadReceipt(toEmail, receiptData) {
    try {
      const { sessionId, uploadResults, timestamp, language } = receiptData;
      
      const subject = this.getLocalizedSubject(language);
      const htmlContent = this.generateReceiptHTML(receiptData);
      const textContent = this.generateReceiptText(receiptData);
      
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
        headers: {
          'X-Session-ID': sessionId
        }
      };
      
      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Upload receipt sent to ${toEmail}, messageId: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (error) {
      logger.error('Failed to send upload receipt:', error);
      throw error;
    }
  }
  
  /**
   * Get localized email subject
   */
  getLocalizedSubject(language) {
    const subjects = {
      en: 'OCR Processing Complete - Orthodox Metrics',
      gr: 'Ολοκλήρωση Επεξεργασίας OCR - Orthodox Metrics',
      ru: 'Обработка OCR завершена - Orthodox Metrics',
      ro: 'Procesarea OCR finalizată - Orthodox Metrics'
    };
    
    return subjects[language] || subjects.en;
  }
  
  /**
   * Generate HTML email content
   */
  generateReceiptHTML(data) {
    const { sessionId, uploadResults, timestamp, language } = data;
    const successfulUploads = uploadResults.filter(r => r.success);
    const failedUploads = uploadResults.filter(r => !r.success);
    
    const translations = this.getTranslations(language);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${translations.subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 30px;
        }
        .session-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        .session-info h3 {
          margin-top: 0;
          color: #495057;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: 600;
          color: #6c757d;
        }
        .results-section {
          margin-bottom: 25px;
        }
        .results-section h3 {
          color: #495057;
          border-bottom: 2px solid #dee2e6;
          padding-bottom: 10px;
        }
        .file-result {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 10px;
          border-left: 4px solid #28a745;
        }
        .file-result.failed {
          border-left-color: #dc3545;
        }
        .file-name {
          font-weight: 600;
          margin-bottom: 5px;
        }
        .file-details {
          font-size: 14px;
          color: #6c757d;
        }
        .text-preview {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 10px;
          margin-top: 10px;
          font-family: monospace;
          font-size: 12px;
          max-height: 100px;
          overflow-y: auto;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #6c757d;
          font-size: 14px;
        }
        .download-links {
          text-align: center;
          margin: 25px 0;
        }
        .download-btn {
          display: inline-block;
          background: #007bff;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          margin: 0 10px;
          font-weight: 600;
        }
        .download-btn:hover {
          background: #0056b3;
          color: white;
          text-decoration: none;
        }
        .stats {
          display: flex;
          justify-content: space-around;
          margin: 20px 0;
          text-align: center;
        }
        .stat {
          flex: 1;
        }
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
        }
        .stat-label {
          font-size: 12px;
          color: #6c757d;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 ${translations.title}</h1>
          <p>${translations.subtitle}</p>
        </div>
        
        <div class="content">
          <div class="session-info">
            <h3>${translations.sessionInfo}</h3>
            <div class="info-row">
              <span class="info-label">${translations.sessionId}:</span>
              <span><code>${sessionId}</code></span>
            </div>
            <div class="info-row">
              <span class="info-label">${translations.timestamp}:</span>
              <span>${new Date(timestamp).toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${translations.language}:</span>
              <span>${this.getLanguageName(language)}</span>
            </div>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-number">${uploadResults.length}</div>
              <div class="stat-label">${translations.totalFiles}</div>
            </div>
            <div class="stat">
              <div class="stat-number">${successfulUploads.length}</div>
              <div class="stat-label">${translations.successful}</div>
            </div>
            <div class="stat">
              <div class="stat-number">${failedUploads.length}</div>
              <div class="stat-label">${translations.failed}</div>
            </div>
          </div>
          
          ${successfulUploads.length > 0 ? `
          <div class="results-section">
            <h3>✅ ${translations.successfulFiles}</h3>
            ${successfulUploads.map(result => `
            <div class="file-result">
              <div class="file-name">${result.filename}</div>
              <div class="file-details">
                ${translations.confidence}: ${Math.round(result.confidence || 0)}% • 
                ${translations.processingTime}: ${Math.round((result.processingTime || 0) / 1000)}s
              </div>
              ${result.text ? `
              <div class="text-preview">
                ${result.text.substring(0, 200)}${result.text.length > 200 ? '...' : ''}
              </div>
              ` : ''}
            </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${failedUploads.length > 0 ? `
          <div class="results-section">
            <h3>❌ ${translations.failedFiles}</h3>
            ${failedUploads.map(result => `
            <div class="file-result failed">
              <div class="file-name">${result.filename}</div>
              <div class="file-details" style="color: #dc3545;">
                ${translations.error}: ${result.error}
              </div>
            </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${successfulUploads.length > 0 ? `
          <div class="download-links">
            <p><strong>${translations.downloadResults}:</strong></p>
            <a href="${process.env.BASE_URL}/api/ocr/download/${sessionId}/pdf" class="download-btn">
              📄 ${translations.downloadPdf}
            </a>
            <a href="${process.env.BASE_URL}/api/ocr/download/${sessionId}/xlsx" class="download-btn">
              📊 ${translations.downloadExcel}
            </a>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>${translations.footerText}</p>
          <p><strong>${translations.supportText}</strong> support@orthodmetrics.com</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
  
  /**
   * Generate plain text email content
   */
  generateReceiptText(data) {
    const { sessionId, uploadResults, timestamp, language } = data;
    const successfulUploads = uploadResults.filter(r => r.success);
    const failedUploads = uploadResults.filter(r => !r.success);
    
    const translations = this.getTranslations(language);
    
    let text = `${translations.title}\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `${translations.sessionInfo}:\n`;
    text += `${translations.sessionId}: ${sessionId}\n`;
    text += `${translations.timestamp}: ${new Date(timestamp).toLocaleString()}\n`;
    text += `${translations.language}: ${this.getLanguageName(language)}\n\n`;
    
    text += `${translations.summary}:\n`;
    text += `${translations.totalFiles}: ${uploadResults.length}\n`;
    text += `${translations.successful}: ${successfulUploads.length}\n`;
    text += `${translations.failed}: ${failedUploads.length}\n\n`;
    
    if (successfulUploads.length > 0) {
      text += `${translations.successfulFiles}:\n`;
      text += `${'-'.repeat(30)}\n`;
      successfulUploads.forEach(result => {
        text += `• ${result.filename}\n`;
        text += `  ${translations.confidence}: ${Math.round(result.confidence || 0)}%\n`;
        text += `  ${translations.processingTime}: ${Math.round((result.processingTime || 0) / 1000)}s\n`;
        if (result.text) {
          text += `  ${translations.textPreview}: ${result.text.substring(0, 100)}...\n`;
        }
        text += '\n';
      });
    }
    
    if (failedUploads.length > 0) {
      text += `${translations.failedFiles}:\n`;
      text += `${'-'.repeat(30)}\n`;
      failedUploads.forEach(result => {
        text += `• ${result.filename}\n`;
        text += `  ${translations.error}: ${result.error}\n\n`;
      });
    }
    
    if (successfulUploads.length > 0) {
      text += `${translations.downloadResults}:\n`;
      text += `PDF: ${process.env.BASE_URL}/api/ocr/download/${sessionId}/pdf\n`;
      text += `Excel: ${process.env.BASE_URL}/api/ocr/download/${sessionId}/xlsx\n\n`;
    }
    
    text += `${translations.footerText}\n`;
    text += `${translations.supportText} support@orthodmetrics.com\n`;
    
    return text;
  }
  
  /**
   * Get translations for different languages
   */
  getTranslations(language) {
    const translations = {
      en: {
        subject: 'OCR Processing Complete - Orthodox Metrics',
        title: 'OCR Processing Complete',
        subtitle: 'Your church records have been processed',
        sessionInfo: 'Session Information',
        sessionId: 'Session ID',
        timestamp: 'Processed At',
        language: 'Language',
        summary: 'Processing Summary',
        totalFiles: 'Total Files',
        successful: 'Successful',
        failed: 'Failed',
        successfulFiles: 'Successfully Processed Files',
        failedFiles: 'Failed Files',
        confidence: 'Confidence',
        processingTime: 'Processing Time',
        textPreview: 'Text Preview',
        error: 'Error',
        downloadResults: 'Download Your Results',
        downloadPdf: 'Download PDF',
        downloadExcel: 'Download Excel',
        footerText: 'This is an automated message from Orthodox Metrics OCR System.',
        supportText: 'For support, contact:'
      },
      gr: {
        subject: 'Ολοκλήρωση Επεξεργασίας OCR - Orthodox Metrics',
        title: 'Ολοκλήρωση Επεξεργασίας OCR',
        subtitle: 'Τα εκκλησιαστικά σας αρχεία έχουν επεξεργαστεί',
        sessionInfo: 'Πληροφορίες Συνεδρίας',
        sessionId: 'ID Συνεδρίας',
        timestamp: 'Επεξεργάστηκε Στις',
        language: 'Γλώσσα',
        summary: 'Σύνοψη Επεξεργασίας',
        totalFiles: 'Συνολικά Αρχεία',
        successful: 'Επιτυχή',
        failed: 'Αποτυχημένα',
        successfulFiles: 'Επιτυχώς Επεξεργασμένα Αρχεία',
        failedFiles: 'Αποτυχημένα Αρχεία',
        confidence: 'Εμπιστοσύνη',
        processingTime: 'Χρόνος Επεξεργασίας',
        textPreview: 'Προεπισκόπηση Κειμένου',
        error: 'Σφάλμα',
        downloadResults: 'Κατεβάστε τα Αποτελέσματα',
        downloadPdf: 'Κατεβάστε PDF',
        downloadExcel: 'Κατεβάστε Excel',
        footerText: 'Αυτό είναι ένα αυτοματοποιημένο μήνυμα από το σύστημα OCR Orthodox Metrics.',
        supportText: 'Για υποστήριξη, επικοινωνήστε:'
      },
      ru: {
        subject: 'Обработка OCR завершена - Orthodox Metrics',
        title: 'Обработка OCR завершена',
        subtitle: 'Ваши церковные записи были обработаны',
        sessionInfo: 'Информация о сессии',
        sessionId: 'ID сессии',
        timestamp: 'Обработано в',
        language: 'Язык',
        summary: 'Сводка обработки',
        totalFiles: 'Всего файлов',
        successful: 'Успешно',
        failed: 'Неудачно',
        successfulFiles: 'Успешно обработанные файлы',
        failedFiles: 'Неудачные файлы',
        confidence: 'Уверенность',
        processingTime: 'Время обработки',
        textPreview: 'Предварительный просмотр текста',
        error: 'Ошибка',
        downloadResults: 'Скачать результаты',
        downloadPdf: 'Скачать PDF',
        downloadExcel: 'Скачать Excel',
        footerText: 'Это автоматическое сообщение от системы OCR Orthodox Metrics.',
        supportText: 'Для поддержки обращайтесь:'
      },
      ro: {
        subject: 'Procesarea OCR finalizată - Orthodox Metrics',
        title: 'Procesarea OCR finalizată',
        subtitle: 'Înregistrările dumneavoastră bisericești au fost procesate',
        sessionInfo: 'Informații sesiune',
        sessionId: 'ID sesiune',
        timestamp: 'Procesat la',
        language: 'Limba',
        summary: 'Rezumat procesare',
        totalFiles: 'Total fișiere',
        successful: 'Reușite',
        failed: 'Eșuate',
        successfulFiles: 'Fișiere procesate cu succes',
        failedFiles: 'Fișiere eșuate',
        confidence: 'Încredere',
        processingTime: 'Timp de procesare',
        textPreview: 'Previzualizare text',
        error: 'Eroare',
        downloadResults: 'Descărcați rezultatele',
        downloadPdf: 'Descărcați PDF',
        downloadExcel: 'Descărcați Excel',
        footerText: 'Acesta este un mesaj automatizat de la sistemul OCR Orthodox Metrics.',
        supportText: 'Pentru suport, contactați:'
      }
    };
    
    return translations[language] || translations.en;
  }
  
  /**
   * Get language display name
   */
  getLanguageName(code) {
    const names = {
      en: 'English',
      gr: 'Ελληνικά',
      ru: 'Русский',
      ro: 'Română'
    };
    
    return names[code] || code.toUpperCase();
  }
  
  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email configuration is valid');
      return true;
    } catch (error) {
      logger.error('Email configuration error:', error);
      return false;
    }
  }
}

module.exports = new EmailSender();
