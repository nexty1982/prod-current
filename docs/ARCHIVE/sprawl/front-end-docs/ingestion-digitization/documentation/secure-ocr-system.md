# Secure OCR Upload System

## Overview

The secure OCR upload system implements a barcode-based session validation flow that ensures only verified users can upload documents for OCR processing. This prevents bots and confirms physical user presence.

## Features

### 🔐 Security Features
- **Barcode/QR Code Session Validation**: Users must scan a generated barcode to verify their session
- **Session Expiration**: Sessions expire in 5-10 minutes with countdown timer
- **Multilingual Disclaimers**: Support for English, Greek, Russian, and Romanian
- **Image Enhancement Pipeline**: Automatic image preprocessing for better OCR results

### 📁 Upload Features
- **Drag & Drop Support**: Modern file upload interface
- **Multiple File Formats**: PNG, JPG, JPEG, PDF support
- **File Size Validation**: Configurable max file size (default 20MB)
- **Processing Time Estimation**: Real-time estimates for upload and OCR processing
- **Tiered Processing**: Standard and Express processing options

### 📧 Additional Features
- **Email Receipts**: Optional email confirmations with download links
- **Progress Tracking**: Real-time upload and processing status
- **Download Results**: PDF and XLSX export of OCR results

## Components

### Main Components

1. **OCRUploader**: Main orchestrating component
2. **BarcodeScannerModal**: Handles QR code generation and session verification
3. **DisclaimerModal**: Manages multilingual terms acceptance and user preferences
4. **UploadForm**: File selection and upload interface
5. **UploadStatus**: Real-time status tracking and results display

### Supporting Components

- **useOCRUploader**: Custom hook for file management and upload logic
- **OCR Types**: TypeScript interfaces for type safety

## Usage Flow

### 1. Initial Setup
```tsx
import OCRUploader from './components/OCRUploader';

function App() {
  const handleUploadComplete = (results) => {
    console.log('OCR Results:', results);
  };

  return (
    <OCRUploader
      onUploadComplete={handleUploadComplete}
      maxFiles={10}
      maxFileSize={20 * 1024 * 1024} // 20MB
      defaultLanguage="en"
      showLanguageSelector={true}
      allowMultipleFiles={true}
      showPreview={true}
    />
  );
}
```

### 2. User Flow
1. User opens OCR upload interface
2. System prompts to start secure session
3. User clicks "Start Secure Upload"
4. **BarcodeScannerModal** opens with QR code
5. User scans QR code with mobile device
6. Backend validates session and marks as verified
7. **DisclaimerModal** opens for terms acceptance
8. User selects language, processing tier, and optionally enters email
9. Upload interface becomes enabled
10. User drags/drops or selects files
11. System shows processing time estimates
12. User starts OCR processing
13. Real-time progress tracking via **UploadStatus**
14. Results displayed with download options
15. Optional email receipt sent

### 3. Backend Integration

The system expects these API endpoints:

```
POST /api/ocr/secure/session       - Create new session
GET  /api/ocr/secure/verify/:id    - Verify session status  
POST /api/ocr/secure/disclaimer    - Accept disclaimer
POST /api/ocr/secure/upload        - Upload files for OCR
GET  /api/ocr/secure/results/:id   - Get processing results
GET  /api/ocr/secure/download/:id  - Download results (PDF/XLSX)
GET  /api/ocr/secure/languages     - Get available languages
GET  /api/ocr/secure/disclaimers   - Get multilingual disclaimers
```

## Configuration

### Props
- `maxFiles`: Maximum number of files (default: 10)
- `maxFileSize`: Maximum file size in bytes (default: 20MB)
- `defaultLanguage`: Default OCR language (default: 'en')
- `showLanguageSelector`: Show language dropdown (default: true)
- `allowMultipleFiles`: Allow multiple file selection (default: true)
- `showPreview`: Show image previews (default: true)

### Supported Languages
- English (en) 🇺🇸
- Russian (ru) 🇷🇺  
- Romanian (ro) 🇷🇴
- Greek (gr) 🇬🇷

### File Types
- Images: PNG, JPG, JPEG
- Documents: PDF

## Security Considerations

1. **Session Validation**: All uploads require verified session ID
2. **Barcode Expiration**: Sessions expire automatically 
3. **Image Enhancement**: Files are preprocessed server-side for security
4. **Rate Limiting**: Backend should implement rate limiting
5. **File Validation**: Strict file type and size validation

## Processing Pipeline

### Client-Side
1. File validation (type, size)
2. Image preview generation
3. Processing time estimation
4. Real-time upload progress

### Server-Side  
1. Session validation
2. Image enhancement (grayscale, denoise, resize, auto-orient)
3. Google Vision OCR processing
4. Result storage and email notifications
5. PDF/XLSX generation for download

## Error Handling

- Session expiration warnings
- File validation errors
- Network timeout handling
- OCR processing failures
- Retry mechanisms for failed uploads

## Accessibility

- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Multilingual interface
- Clear progress indicators

## Performance

- Efficient image preview generation
- Chunked file uploads
- Background processing
- Progressive enhancement
- Responsive design for all screen sizes
