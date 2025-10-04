import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import OcrScanPreview from '../components/OcrScanPreview';

// Example usage of the OcrScanPreview component
const OcrScanPreviewDemo: React.FC = () => {
    const [showPreview, setShowPreview] = useState(false);

    // Sample OCR data for a Greek baptism certificate
    const sampleOcrData = [
        {
            id: 'name',
            label: 'Full Name',
            value: 'Ιωάννης Παπαδόπουλος',
            confidence: 95,
            position: { x: 20, y: 25, width: 40, height: 8 },
            editable: true
        },
        {
            id: 'baptism_date',
            label: 'Baptism Date',
            value: '15η Μαΐου 1985',
            confidence: 88,
            position: { x: 25, y: 45, width: 35, height: 6 },
            editable: true
        },
        {
            id: 'priest',
            label: 'Officiating Priest',
            value: 'Πατήρ Γεώργιος Χριστοδούλου',
            confidence: 92,
            position: { x: 15, y: 65, width: 50, height: 8 },
            editable: true
        },
        {
            id: 'church',
            label: 'Church Name',
            value: 'Αγία Τριάδα',
            confidence: 72,
            position: { x: 30, y: 80, width: 25, height: 6 },
            editable: true
        },
        {
            id: 'parents',
            label: 'Parents',
            value: 'Δημήτριος και Μαρία Παπαδόπουλου',
            confidence: 85,
            position: { x: 20, y: 35, width: 45, height: 6 },
            editable: true
        },
        {
            id: 'godparents',
            label: 'Godparents',
            value: 'Νικόλαος και Ελένη Κωνσταντίνου',
            confidence: 78,
            position: { x: 25, y: 55, width: 40, height: 6 },
            editable: true
        }
    ];

    // Sample image (you would replace this with actual uploaded image)
    const sampleImageSrc = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJhcHRpc20gQ2VydGlmaWNhdGU8L3RleHQ+CiAgPHRleHQgeD0iNTAlIiB5PSI3MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdyZWVrIE9ydGhvZG94IENodXJjaDwvdGV4dD4KPC9zdmc+";

    const handleFieldEdit = (fieldId: string, newValue: string) => {
        console.log(`Editing field ${fieldId} to: ${newValue}`);
        // In a real app, you would update your state here
    };

    const handleScanComplete = () => {
        console.log('OCR scan animation completed!');
    };

    if (!showPreview) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>
                    OCR Scan Preview Demo
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
                    This demo shows the OcrScanPreview component in action. It features:
                    animated scanning, progressive field revelation, confidence scoring,
                    field editing capabilities, and responsive design.
                </Typography>
                
                <Paper sx={{ p: 3, mb: 3, maxWidth: 500, mx: 'auto' }}>
                    <Typography variant="h6" gutterBottom>Features Demonstrated:</Typography>
                    <ul style={{ textAlign: 'left', fontSize: '14px' }}>
                        <li>🔍 Animated horizontal scanning line</li>
                        <li>📝 Progressive field revelation with animations</li>
                        <li>📊 Animated confidence score counter</li>
                        <li>✨ Visual highlighting for high-confidence fields (>90%)</li>
                        <li>⚠️ Warning indicators for low-confidence fields (<75%)</li>
                        <li>📱 Mobile responsive design with Material-UI</li>
                        <li>✏️ Inline editing with save/cancel functionality</li>
                        <li>🎨 Framer Motion animations</li>
                        <li>🌟 Glowing effects for high-quality extractions</li>
                    </ul>
                </Paper>

                <Button 
                    variant="contained" 
                    size="large"
                    onClick={() => setShowPreview(true)}
                    sx={{ mt: 2 }}
                >
                    Start OCR Preview Demo
                </Button>
            </Box>
        );
    }

    return (
        <Box>
            <Button 
                variant="outlined" 
                onClick={() => setShowPreview(false)}
                sx={{ m: 2 }}
            >
                ← Back to Demo Info
            </Button>
            
            <OcrScanPreview
                imageSrc={sampleImageSrc}
                ocrData={sampleOcrData}
                confidenceScore={87}
                onFieldEdit={handleFieldEdit}
                onScanComplete={handleScanComplete}
                title="Greek Baptism Certificate Analysis"
            />
        </Box>
    );
};

export default OcrScanPreviewDemo;
