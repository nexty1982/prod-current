# OcrScanPreview Component Integration Guide

## 🎯 Component Overview

The `OcrScanPreview` component provides a beautiful, animated OCR results interface that:
- Shows a realistic scanning animation
- Progressively reveals extracted fields with confidence scores
- Allows inline editing of detected text
- Highlights high-confidence fields with visual effects
- Shows warnings for low-confidence extractions
- Is fully responsive and mobile-friendly

## 🚀 Integration with Existing OCR System

### 1. Install Required Dependencies

```bash
npm install framer-motion
```

### 2. Integration with OCXDataPanel

Update your `OCXDataPanel.tsx` to use the new preview component:

```typescript
import OcrScanPreview from '../../components/OcrScanPreview';

// In your OCR result viewing function:
const handleViewResultWithPreview = async (jobId: number) => {
  try {
    const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}`);
    if (response.ok) {
      const result = await response.json();
      
      // Transform OCR result into OcrScanPreview format
      const ocrFields = [
        {
          id: 'original_text',
          label: 'Original Text',
          value: result.ocrResult,
          confidence: result.confidenceScore * 100,
          editable: true
        }
      ];

      if (result.ocrResultTranslation) {
        ocrFields.push({
          id: 'translation',
          label: 'English Translation',
          value: result.ocrResultTranslation,
          confidence: result.translationConfidence * 100,
          editable: true
        });
      }

      // Show preview dialog with scanning animation
      setOcrPreviewData({
        imageSrc: `/api/church/${churchId}/ocr/jobs/${jobId}/image`,
        ocrFields,
        confidenceScore: result.confidenceScore * 100
      });
      setShowOcrPreview(true);
    }
  } catch (error) {
    console.error('Failed to load OCR result:', error);
  }
};
```

### 3. Enhanced Dialog with Preview

```typescript
const OcrResultPreviewDialog = () => (
  <Dialog
    open={showOcrPreview}
    onClose={() => setShowOcrPreview(false)}
    maxWidth="lg"
    fullWidth
    PaperProps={{
      sx: { minHeight: '80vh' }
    }}
  >
    <DialogContent sx={{ p: 0 }}>
      {ocrPreviewData && (
        <OcrScanPreview
          imageSrc={ocrPreviewData.imageSrc}
          ocrData={ocrPreviewData.ocrFields}
          confidenceScore={ocrPreviewData.confidenceScore}
          onFieldEdit={handleFieldEdit}
          onScanComplete={() => console.log('Scan complete!')}
          title="Document Analysis Results"
        />
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setShowOcrPreview(false)}>Close</Button>
      <Button variant="contained" startIcon={<IconDownload />}>
        Download Results
      </Button>
    </DialogActions>
  </Dialog>
);
```

### 4. Real-time OCR Processing

For live OCR processing, you can show the component immediately after upload:

```typescript
const handleUploadWithPreview = async () => {
  if (!selectedFiles.length) return;

  setUploading(true);
  
  try {
    // Upload files
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('recordType', uploadRecordType);
    formData.append('language', uploadLanguage);

    const response = await fetch(`/api/church/${churchId}/ocr/upload`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      const newJobId = result.jobs[0]?.id;
      
      if (newJobId) {
        // Show preview with scanning animation while OCR processes
        setOcrPreviewData({
          imageSrc: URL.createObjectURL(selectedFiles[0]),
          ocrFields: [], // Start empty, will populate as OCR completes
          confidenceScore: 0 // Will animate up as OCR completes
        });
        setShowOcrPreview(true);
        
        // Poll for OCR results
        pollForOcrResults(newJobId);
      }
    }
  } catch (error) {
    console.error('Upload failed:', error);
  } finally {
    setUploading(false);
  }
};

const pollForOcrResults = (jobId: number) => {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}`);
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'complete') {
          clearInterval(pollInterval);
          
          // Update preview with real OCR results
          const ocrFields = parseOcrResultToFields(result);
          setOcrPreviewData(prev => ({
            ...prev,
            ocrFields,
            confidenceScore: result.confidenceScore * 100
          }));
        }
      }
    } catch (error) {
      console.error('Polling failed:', error);
      clearInterval(pollInterval);
    }
  }, 2000);
};
```

### 5. Parse OCR Results to Fields

```typescript
const parseOcrResultToFields = (ocrResult: any) => {
  const fields = [];
  
  // Original text
  if (ocrResult.ocrResult) {
    fields.push({
      id: 'original',
      label: `Original Text (${ocrResult.detectedLanguage || ocrResult.language})`,
      value: ocrResult.ocrResult,
      confidence: ocrResult.confidenceScore * 100,
      editable: true
    });
  }
  
  // Translation
  if (ocrResult.ocrResultTranslation) {
    fields.push({
      id: 'translation',
      label: 'English Translation',
      value: ocrResult.ocrResultTranslation,
      confidence: ocrResult.translationConfidence * 100,
      editable: true
    });
  }
  
  // You could also parse structured data if available:
  // - Names, dates, places from church records
  // - Specific fields based on document type
  
  return fields;
};
```

## 🎨 Customization Options

### Custom Field Types for Church Records

```typescript
// For baptism certificates
const baptismFields = [
  { id: 'child_name', label: 'Child\'s Name', editable: true },
  { id: 'baptism_date', label: 'Date of Baptism', editable: true },
  { id: 'priest', label: 'Officiating Priest', editable: true },
  { id: 'parents', label: 'Parents', editable: true },
  { id: 'godparents', label: 'Godparents', editable: true },
  { id: 'church', label: 'Church', editable: false }
];

// For marriage certificates
const marriageFields = [
  { id: 'groom_name', label: 'Groom\'s Name', editable: true },
  { id: 'bride_name', label: 'Bride\'s Name', editable: true },
  { id: 'marriage_date', label: 'Date of Marriage', editable: true },
  { id: 'priest', label: 'Officiating Priest', editable: true },
  { id: 'witnesses', label: 'Witnesses', editable: true }
];
```

### Theme Customization

```typescript
// Custom confidence colors
const customTheme = {
  highConfidence: '#4CAF50',    // Green
  mediumConfidence: '#FF9800',  // Orange  
  lowConfidence: '#F44336',     // Red
  scanningColor: '#2196F3'      // Blue
};
```

## 📱 Mobile Responsive Features

The component automatically adapts to mobile screens:
- Stacked layout on small screens
- Touch-friendly edit buttons
- Optimized typography for mobile reading
- Gesture-friendly interface

## 🎬 Animation Features

- **Scanning Line**: Horizontal sweep animation during OCR processing
- **Progressive Reveal**: Fields appear one by one with stagger effect
- **Confidence Counter**: Animated number counting up to final score
- **High-Confidence Glow**: Pulsing border effect for >90% confidence
- **Success Indicators**: Checkmark animations for completed processing

## 🔧 Advanced Usage

### With Real-time Updates

```typescript
// Stream OCR results as they process
const useOcrStream = (jobId: number) => {
  const [streamData, setStreamData] = useState<OcrField[]>([]);
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/church/${churchId}/ocr/jobs/${jobId}/stream`);
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setStreamData(prev => [...prev, update]);
    };
    
    return () => eventSource.close();
  }, [jobId]);
  
  return streamData;
};
```

This component transforms your OCR results from plain text into an engaging, interactive experience that helps users understand and verify the extracted information! 🎉
