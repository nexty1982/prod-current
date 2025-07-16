# Orthodox Metrics - Component Logging Integration Guide

This document provides examples and guidelines for integrating logging into all major components.

## Components to Add Logging

### 1. Calendar Components
- **BigCalendar.tsx** - Calendar view interactions
- **LiturgicalCalendar.tsx** - Religious calendar events
- **TestLiturgicalCalendar.tsx** - Testing calendar functionality

### 2. Invoice Components
- **List.tsx** - Invoice listing and filtering
- **Create.tsx** - New invoice creation
- **Edit.tsx** - Invoice editing
- **Detail.tsx** - Invoice detail view
- **View.tsx** - Invoice viewing

### 3. OCR Components
- **OCRUpload.tsx** - File uploads and OCR processing
- **OCRSessions.tsx** - OCR session management

### 4. Site Management
- **SiteClone.tsx** - Site cloning operations
- **Logs.tsx** - Log monitoring (already implemented)

### 5. Church Records
- **Baptism components** - Baptism record management
- **Marriage components** - Marriage record management
- **Funeral components** - Funeral record management

### 6. Dashboard Components
- **Dashboard.tsx** - Main dashboard analytics
- **Ecommerce.tsx** - E-commerce analytics

## Logging Integration Steps

### Step 1: Import Logger
```typescript
import logger from 'src/utils/logger';
```

### Step 2: Component Lifecycle Logging
```typescript
useEffect(() => {
  logger.componentMount('Component Name');
  logger.pageView('Component Name', window.location.pathname);
  
  return () => {
    logger.componentUnmount('Component Name');
  };
}, []);
```

### Step 3: User Action Logging
```typescript
// Button clicks
const handleButtonClick = () => {
  logger.userAction('Component Name', 'button_clicked', { buttonType: 'submit' });
  // ... existing logic
};

// Form submissions
const handleFormSubmit = (data: any) => {
  logger.formSubmission('Component Name', 'invoice_form', true, data);
  // ... existing logic
};

// Navigation
const handleNavigation = (from: string, to: string) => {
  logger.navigationEvent('Component Name', from, to);
  // ... existing logic
};
```

### Step 4: API Call Logging
```typescript
const apiCall = async () => {
  const startTime = Date.now();
  try {
    const response = await fetch('/api/endpoint');
    const duration = Date.now() - startTime;
    
    logger.apiCall('Component Name', '/api/endpoint', 'GET', response.status, duration);
    
    if (response.ok) {
      const data = await response.json();
      logger.dataOperation('Component Name', 'fetch', 'invoices', data.length);
      return data;
    }
  } catch (error) {
    logger.error('Component Name', 'API call failed', { error, endpoint: '/api/endpoint' });
  }
};
```

### Step 5: File Operations Logging
```typescript
const handleFileUpload = async (file: File) => {
  try {
    logger.fileOperation('Component Name', 'upload_start', file.name, true);
    
    // Upload logic...
    
    logger.fileOperation('Component Name', 'upload_complete', file.name, true);
  } catch (error) {
    logger.fileOperation('Component Name', 'upload_failed', file.name, false, error);
  }
};
```

### Step 6: Search and Filter Logging
```typescript
const handleSearch = (query: string, resultCount: number) => {
  logger.searchAction('Component Name', query, resultCount);
};

const handleFilter = (filters: any, resultCount: number) => {
  logger.userAction('Component Name', 'filter_applied', { filters, resultCount });
};
```

### Step 7: Export/Import Logging
```typescript
const handleExport = (format: string, count: number) => {
  logger.exportAction('Component Name', format, 'invoices', count);
};

const handleImport = (file: File, recordCount: number, success: boolean) => {
  logger.importAction('Component Name', 'xlsx', file.name, recordCount, success);
};
```

### Step 8: Error and Validation Logging
```typescript
const handleValidationError = (field: string, error: string, value: any) => {
  logger.validationError('Component Name', field, error, value);
};

const handleError = (error: Error, context: string) => {
  logger.error('Component Name', `Error in ${context}`, { 
    error: error.message, 
    stack: error.stack 
  });
};
```

### Step 9: Performance Logging
```typescript
const measurePerformance = (operation: string, duration: number) => {
  logger.performanceMetric('Component Name', operation, duration, 'ms');
};

// Example usage
const startTime = Date.now();
// ... expensive operation
const duration = Date.now() - startTime;
measurePerformance('data_processing', duration);
```

## Component-Specific Logging Examples

### Calendar Component
```typescript
// Calendar event creation
logger.userAction('Calendar', 'event_created', { 
  eventType: 'liturgical', 
  date: eventDate 
});

// Calendar view change
logger.userAction('Calendar', 'view_changed', { 
  view: 'month', 
  date: currentDate 
});
```

### Invoice Component
```typescript
// Invoice creation
logger.userAction('Invoice', 'invoice_created', { 
  invoiceNumber, 
  amount, 
  client 
});

// PDF generation
logger.userAction('Invoice', 'pdf_generated', { 
  invoiceId, 
  language, 
  template 
});

// Invoice status change
logger.dataOperation('Invoice', 'status_change', 'invoice', 1);
```

### OCR Component
```typescript
// OCR processing start
logger.userAction('OCR', 'processing_started', { 
  fileCount: files.length, 
  language: selectedLanguage 
});

// OCR processing complete
logger.dataOperation('OCR', 'processing_complete', 'documents', processedCount);

// Barcode verification
logger.userAction('OCR', 'barcode_verified', { 
  barcode, 
  fileName 
});
```

### Site Clone Component
```typescript
// Site clone operation
logger.userAction('Site Clone', 'clone_started', { 
  sourceInstance, 
  targetName 
});

// Database migration
logger.dataOperation('Site Clone', 'database_migrated', 'tables', tableCount);

// Site deployment
logger.userAction('Site Clone', 'site_deployed', { 
  instanceId, 
  domain, 
  port 
});
```

## Backend Logging Integration

The backend will automatically log all API requests, but you can add specific business logic logging:

```javascript
// In route handlers
const { logMessage } = require('../routes/logs');

router.post('/invoices', async (req, res) => {
  try {
    logMessage('info', 'Invoice Service', 'Invoice creation started', {
      userId: req.user?.id,
      invoiceData: req.body
    }, req);
    
    const invoice = await createInvoice(req.body);
    
    logMessage('info', 'Invoice Service', 'Invoice created successfully', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number
    }, req);
    
    res.json(invoice);
  } catch (error) {
    logMessage('error', 'Invoice Service', 'Invoice creation failed', {
      error: error.message,
      stack: error.stack
    }, req);
    
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});
```

## Testing the Logging System

1. **Navigate to `/apps/logs`** to view the logs panel
2. **Perform actions** in different components
3. **Watch real-time logs** appear in the Site Logs tab
4. **Filter by component** to see component-specific logs
5. **Test log levels** by changing component log levels
6. **Export logs** for analysis

## Log Analysis and Monitoring

The logging system provides:
- **Real-time monitoring** of user actions
- **Performance metrics** for optimization
- **Error tracking** for debugging
- **User behavior analysis** for UX improvements
- **System health monitoring** for maintenance

## Best Practices

1. **Log meaningful events** - Focus on user actions, errors, and system events
2. **Include context** - Add relevant data like user ID, timestamps, etc.
3. **Use appropriate log levels** - Debug for development, info for general events, error for problems
4. **Avoid logging sensitive data** - Don't log passwords, tokens, or personal information
5. **Monitor performance** - Don't let logging impact application performance
6. **Structure log data** - Use consistent formats for easier analysis
