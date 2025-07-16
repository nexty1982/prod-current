/**
 * OCR Data Panel Wrapper
 * 
 * This component wraps the new OcrInterface to maintain compatibility
 * with existing routes while providing the enhanced functionality
 */

import React from 'react';
import { OcrInterface } from '../../components/ocr/OcrInterface';

const OCRDataPanel: React.FC = () => {
  // Get church ID from URL params or context
  const churchId = '14'; // For now, hardcode to test church ID
  const userEmail = localStorage.getItem('userEmail') || undefined;
  
  return (
    <OcrInterface 
      churchId={churchId}
      userEmail={userEmail}
    />
  );
};

export default OCRDataPanel;
