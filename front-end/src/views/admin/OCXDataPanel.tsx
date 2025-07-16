import React from 'react';
import PageContainer from 'src/components/container/PageContainer';
import { OcrInterface } from 'src/components/ocr/OcrInterface';

const OCXDataPanel: React.FC = () => {
    return (
        <PageContainer title="Church OCR" description="OCR Data Management">
            <OcrInterface 
                churchId="14" 
                userEmail="admin@orthodoxmetrics.com"
                theme="light"
            />
        </PageContainer>
    );
};

export default OCXDataPanel;
