import React, { useEffect, useState, useCallback } from 'react';
import { getJobResult } from '../lib/ocrApi';
import { Eye, FileText, Loader2, AlertCircle, Download, Copy } from 'lucide-react';
import OcrScanPreview from '../OcrScanPreview';
import type { OCRResult } from '../lib/ocrApi';

interface OutputViewerProps {
  jobId?: string;
  className?: string;
}

const OutputViewer: React.FC<OutputViewerProps> = ({ jobId, className = '' }) => {
  const [result, setResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'text' | 'json'>('preview');

  const loadResult = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getJobResult(id);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load OCR result');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (jobId) {
      loadResult(jobId);
    } else {
      setResult(null);
      setError(null);
    }
  }, [jobId, loadResult]);

  const handleFieldEdit = useCallback((fieldId: string, newValue: string) => {
    console.log(`Editing field ${fieldId} to: ${newValue}`);
    // TODO: Implement field update API call
  }, []);

  const handleCopyText = useCallback(() => {
    if (result?.extractedText) {
      navigator.clipboard.writeText(result.extractedText);
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-result-${result.jobId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  const renderViewModeButtons = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setViewMode('preview')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          viewMode === 'preview' 
            ? 'bg-white text-gray-900 shadow-sm' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Eye className="h-3 w-3 inline mr-1" />
        Preview
      </button>
      <button
        onClick={() => setViewMode('text')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          viewMode === 'text' 
            ? 'bg-white text-gray-900 shadow-sm' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <FileText className="h-3 w-3 inline mr-1" />
        Text
      </button>
      <button
        onClick={() => setViewMode('json')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          viewMode === 'json' 
            ? 'bg-white text-gray-900 shadow-sm' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        JSON
      </button>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading OCR result...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      );
    }

    if (!jobId) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Select a completed OCR job to view results</p>
            <p className="text-xs text-gray-400 mt-1">
              Extracted text and field data will appear here
            </p>
          </div>
        </div>
      );
    }

    if (!result) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No result available</p>
            <p className="text-xs text-gray-400 mt-1">
              This job may still be processing or failed
            </p>
          </div>
        </div>
      );
    }

    switch (viewMode) {
      case 'preview':
        if (result.fields && result.fields.length > 0) {
          // Create a mock image URL for the preview (you might want to get this from the job data)
          const mockImageSrc = `data:image/svg+xml;base64,${btoa(`
            <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f5f5f5"/>
              <text x="50%" y="50%" font-family="Arial" font-size="18" fill="#333" text-anchor="middle" dy=".3em">
                Document Preview
              </text>
            </svg>
          `)}`;

          const confidence = result.fields.reduce((sum, field) => sum + field.confidence, 0) / result.fields.length;

          return (
            <OcrScanPreview
              imageSrc={mockImageSrc}
              ocrData={result.fields}
              confidenceScore={confidence}
              onFieldEdit={handleFieldEdit}
              title={`OCR Result - Job ${result.jobId}`}
            />
          );
        }
        // Fall through to text view if no fields
        
      case 'text':
        return (
          <div className="p-4 space-y-4">
            {result.metadata && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-700 mb-2">Processing Info</h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>Engine: <span className="font-medium">{result.metadata.engine}</span></div>
                  <div>Language: <span className="font-medium">{result.metadata.language}</span></div>
                  <div>Pages: <span className="font-medium">{result.metadata.totalPages}</span></div>
                  <div>Time: <span className="font-medium">{result.metadata.processingTime}ms</span></div>
                </div>
              </div>
            )}
            
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-gray-700">Extracted Text</h4>
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center px-2 py-1 text-xs border rounded hover:bg-gray-50"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </button>
              </div>
              <textarea
                value={result.extractedText || 'No text extracted'}
                readOnly
                className="w-full h-64 p-3 text-xs font-mono border rounded-lg bg-gray-50 resize-none"
              />
            </div>
          </div>
        );

      case 'json':
        return (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-700">Raw JSON Data</h4>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-2 py-1 text-xs border rounded hover:bg-gray-50"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </button>
            </div>
            <pre className="text-xs overflow-auto whitespace-pre-wrap bg-gray-50 p-3 rounded-lg h-64 border">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`rounded-2xl border bg-white shadow-sm h-full min-h-[24rem] flex flex-col ${className}`}>
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">OCR Result</h2>
        {result && renderViewModeButtons()}
      </div>
      
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

export default OutputViewer;
