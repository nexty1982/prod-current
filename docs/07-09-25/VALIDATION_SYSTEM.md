# Multilingual Validation System Documentation

## Overview
This validation system provides comprehensive multilingual validation for church management and billing forms in English, Greek, Russian, and Romanian.

## 📁 File Structure
```
data/i18n/
├── churches/validation/
│   ├── en.json     # English validation messages
│   ├── gr.json     # Greek validation messages  
│   ├── ru.json     # Russian validation messages
│   └── ro.json     # Romanian validation messages
├── billing/validation/
│   ├── en.json     # English billing validation messages
│   ├── gr.json     # Greek billing validation messages
│   ├── ru.json     # Russian billing validation messages
│   └── ro.json     # Romanian billing validation messages
src/utils/
└── validationHelper.ts   # Validation utility functions
src/examples/
└── ExampleValidationForm.jsx  # Usage example
```

## 🚀 Quick Start

### 1. Import the validation helper
```javascript
import { useValidation } from '../utils/validationHelper';
```

### 2. Use in your component
```javascript
const MyForm = () => {
  const validation = useValidation();
  
  const validateEmail = (email) => {
    return validation.validateEmail(email, 'churches');
  };
  
  // ... rest of your component
};
```

## 📋 Available Validation Rules

### Church Management Validation
- **churchName**: Required, 3-100 characters
- **location**: Required, 3-200 characters  
- **address**: Required, max 300 characters
- **city**: Required, 2-100 characters
- **state**: Required, max 100 characters
- **postalCode**: Required, valid format, max 20 characters
- **country**: Required, valid selection
- **phone**: Required, valid phone format, max 20 characters
- **email**: Required, valid email format, max 200 characters
- **adminEmail**: Required, valid email format, max 200 characters
- **website**: Valid URL format, max 300 characters
- **timezone**: Required, valid selection
- **language**: Required, valid selection
- **currency**: Required, valid selection
- **establishedYear**: Valid year format, between 1 and current year
- **memberCount**: Positive number, max 1,000,000
- **status**: Required, valid selection
- **denomination**: Max 100 characters
- **patriarchate**: Max 100 characters
- **diocese**: Max 100 characters
- **description**: Max 1000 characters
- **notes**: Max 2000 characters
- **coordinates**: Decimal format (lat, lng)
- **latitude**: Between -90 and 90
- **longitude**: Between -180 and 180

### Billing Validation
- **planName**: Required, 3-100 characters
- **planDescription**: Required, max 500 characters
- **price**: Required, valid number, > 0, < $999,999.99
- **billingCycle**: Required, valid selection
- **currency**: Required, valid selection
- **features**: At least one required, max 200 characters each
- **maxUsers**: Required, positive number, 1-10,000
- **maxStorage**: Positive number, 1GB-1TB
- **trialDays**: Non-negative, max 365 days
- **companyName**: Required, max 200 characters
- **contactName**: Required, max 100 characters
- **contactEmail**: Required, valid email, max 200 characters
- **billingAddress**: Required, max 300 characters
- **billingCity**: Required, max 100 characters
- **billingState**: Required, max 100 characters
- **billingPostalCode**: Required, valid format
- **billingCountry**: Required, valid selection
- **vatNumber**: Valid VAT format, max 50 characters
- **taxId**: Valid tax ID format, max 50 characters
- **paymentMethod**: Required
- **cardNumber**: Required, valid card number format
- **expiryDate**: Required, valid MM/YY format, future date
- **cvv**: Required, 3-4 digits
- **cardHolderName**: Required, max 100 characters
- **invoiceNumber**: Required, alphanumeric + hyphens, max 50 characters
- **dueDate**: Required, valid future date
- **amount**: Required, valid number, > 0, < $999,999.99
- **itemDescription**: Required, max 300 characters
- **quantity**: Required, positive number, 1-999
- **unitPrice**: Required, valid number, > 0
- **discount**: Valid percentage, 0-100
- **taxRate**: Valid percentage, 0-100

## 🔧 Validation Helper Methods

### Basic Validation
```javascript
// Required field validation
validation.validateRequired(value, 'churches', 'fieldName')

// Length validation
validation.validateLength(value, 'churches', 'fieldName', minLength, maxLength)

// Number validation
validation.validateNumber(value, 'churches', 'fieldName', min, max)
```

### Specific Validations
```javascript
// Church name validation
validation.validateChurchName(churchName)

// Email validation
validation.validateEmail(email, 'churches') // or 'billing'

// Phone validation
validation.validatePhone(phoneNumber)

// Price validation
validation.validatePrice(price)

// Card number validation
validation.validateCardNumber(cardNumber)

// Expiry date validation
validation.validateExpiryDate(expiryDate)

// CVV validation
validation.validateCVV(cvv)
```

### Generic Validation
```javascript
const rules = [
  { required: true },
  { minLength: 3 },
  { maxLength: 100 },
  { pattern: /^[A-Za-z\s]+$/ }
];

const result = validation.validate(value, rules, 'churches', 'fieldName');
```

## 🌐 Language Support

The system automatically uses the current language from your `useTranslation` hook. Supported languages:

- **English (en)**: Default fallback language
- **Greek (gr)**: Ελληνικά  
- **Russian (ru)**: Русский
- **Romanian (ro)**: Română

## 💡 Usage Examples

### Basic Form Validation
```javascript
import React, { useState } from 'react';
import { useValidation } from '../utils/validationHelper';

const ChurchForm = () => {
  const validation = useValidation();
  const [formData, setFormData] = useState({
    churchName: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});

  const validateField = (fieldName, value) => {
    let result;
    
    switch (fieldName) {
      case 'churchName':
        result = validation.validateChurchName(value);
        break;
      case 'email':
        result = validation.validateEmail(value, 'churches');
        break;
      case 'phone':
        result = validation.validatePhone(value);
        break;
    }
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.isValid ? null : result.message
    }));
    
    return result.isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isValid = Object.keys(formData).every(field =>
      validateField(field, formData[field])
    );
    
    if (isValid) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields with validation */}
    </form>
  );
};
```

### Real-time Validation
```javascript
const handleInputChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  
  // Validate immediately on change
  validateField(name, value);
};
```

### Custom Validation Rules
```javascript
const customRules = [
  { required: true },
  { 
    custom: (value) => value.toLowerCase().includes('orthodox'),
    message: 'Church name must contain "Orthodox"'
  }
];

const result = validation.validate(
  churchName, 
  customRules, 
  'churches', 
  'churchName'
);
```

## 🎨 Error Display

### Bootstrap Integration
```javascript
<Form.Control
  type="text"
  value={formData.churchName}
  onChange={handleInputChange}
  isInvalid={!!errors.churchName}
/>
{errors.churchName && (
  <Form.Control.Feedback type="invalid">
    {errors.churchName}
  </Form.Control.Feedback>
)}
```

### Custom Error Display
```javascript
{errors.churchName && (
  <div className="text-danger mt-1">
    <small>{errors.churchName}</small>
  </div>
)}
```

## 📝 Adding New Validation Rules

### 1. Add to Translation Files
Add your new validation message to all language files:

```json
// en.json
{
  "newFieldRequired": "New field is required",
  "newFieldFormat": "Please enter a valid format"
}
```

### 2. Add Validation Method
Add a new method to `validationHelper.ts`:

```javascript
validateNewField(value: string): ValidationResult {
  if (!value) {
    return {
      isValid: false,
      message: this.getMessage('churches', 'newFieldRequired')
    };
  }
  
  // Your validation logic here
  
  return { isValid: true };
}
```

### 3. Use in Forms
```javascript
const validateField = (fieldName, value) => {
  switch (fieldName) {
    case 'newField':
      return validation.validateNewField(value);
    // ... other cases
  }
};
```

## 🔍 Testing Validation

### Test Different Languages
```javascript
// Test with different languages
validation.setLanguage('gr');
const result = validation.validateEmail('invalid-email', 'churches');
console.log(result.message); // Greek error message
```

### Test Edge Cases
```javascript
// Test empty values
validation.validateChurchName('');
validation.validateChurchName('ab'); // Too short
validation.validateChurchName('a'.repeat(101)); // Too long

// Test invalid formats
validation.validateEmail('invalid-email');
validation.validatePhone('123');
validation.validatePrice(-10);
```

## 🚀 Performance Tips

1. **Lazy Loading**: Validation translations are loaded asynchronously
2. **Memoization**: Validation results can be memoized for identical inputs
3. **Debouncing**: Use debouncing for real-time validation to avoid excessive calls
4. **Caching**: The validation helper caches translations after first load

## 🔧 Troubleshooting

### Common Issues

**Issue**: Validation messages not appearing
**Solution**: Ensure `useTranslation` hook is working and language is set correctly

**Issue**: Custom validation not working  
**Solution**: Check that custom validation function returns boolean and is properly registered

**Issue**: Translation files not loading
**Solution**: Verify file paths and that files exist in the correct directories

### Debug Mode
```javascript
// Enable debug logging
console.log('Current language:', validation.currentLanguage);
console.log('Available translations:', validation.translations);
```

## 📚 Related Documentation

- [Translation System Documentation](./i18n-documentation.md)
- [Form Component Guidelines](./form-components.md)
- [API Integration Guide](./api-integration.md)

## 🤝 Contributing

To add support for new languages:

1. Create new validation files in `data/i18n/churches/validation/` and `data/i18n/billing/validation/`
2. Translate all validation messages accurately
3. Update `validationHelper.ts` to include the new language
4. Test all validation scenarios in the new language
5. Update this documentation

---

**Note**: This validation system is part of the OrthodoxMetrics Church Management System and integrates seamlessly with the existing translation and form infrastructure.
