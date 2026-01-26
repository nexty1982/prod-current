import React, { useState, useCallback } from 'react';
import { FileUp, Loader2, AlertCircle } from 'lucide-react';
import { uploadFiles } from '../lib/ocrApi';

interface UploadZoneProps {
  onUploaded?: (jobIds: string[]) => void;
  churchId?: number;
  className?: string;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploaded, churchId, className = '' }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    setBusy(true);
    setError(null);

    try {
      const jobs = await uploadFiles(files, churchId);
      onUploaded?.(jobs.map(job => job.id));
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setBusy(false);
    }
  }, [churchId, onUploaded]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleFiles]);

  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>
      <div className="p-4 border-b">
        <h2 className="text-sm font-medium text-gray-900">Upload Documents</h2>
        <p className="text-xs text-gray-500 mt-1">
          Supported formats: PDF, PNG, JPG, JPEG, TIFF
        </p>
      </div>
      
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <label
          className={`
            relative flex items-center justify-center border-2 border-dashed rounded-xl h-40 cursor-pointer transition-all
            ${busy ? 'opacity-60 pointer-events-none' : ''}
            ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleFiles(Array.from(e.target.files));
              }
            }}
            disabled={busy}
          />
          
          <div className="text-center text-gray-600">
            {busy ? (
              <>
                <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-blue-600" />
                <div className="text-sm font-medium text-blue-600">Uploading...</div>
                <div className="text-xs text-gray-500">Processing your documents</div>
              </>
            ) : (
              <>
                <FileUp className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                <div className="text-sm font-medium">Drop files here or click to upload</div>
                <div className="text-xs text-gray-500">
                  PDF, PNG, JPG, TIFF • Max 10MB per file
                </div>
              </>
            )}
          </div>
        </label>

        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>• Documents will be processed automatically using OCR</p>
          <p>• Supported languages: English, Greek, Russian, Romanian</p>
          <p>• Processing time varies based on document size and complexity</p>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
