/**
 * OCR Manual Uploader Component
 * Drag & drop interface for power users
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Upload, 
  FileText, 
  X, 
  Settings, 
  Play,
  Pause,
  MoreVertical
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useOcrJobs } from '../../hooks/useOcrJobs';
import { OcrUploadConfig, OcrJobMetadata } from './types';

interface OcrManualUploaderProps {
  churchId: string;
  onUploadComplete: () => void;
  theme?: string;
}

interface QueuedFile extends File {
  id: string;
  preview: string;
  status: 'queued' | 'uploading' | 'completed' | 'failed';
  progress: number;
  jobId?: string;
}

export const OcrManualUploader: React.FC<OcrManualUploaderProps> = ({
  churchId,
  onUploadComplete,
  theme = 'light'
}) => {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [config, setConfig] = useState<OcrUploadConfig>({
    churchId,
    recordType: 'baptism',
    language: 'en',
    quality: 'balanced',
    autoSubmit: true,
    batchMode: true
  });
  const [isPaused, setIsPaused] = useState(false);

  const { uploadFile, loading } = useOcrJobs(churchId);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: QueuedFile[] = acceptedFiles.map(file => ({
      ...file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      preview: URL.createObjectURL(file),
      status: 'queued',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`Added ${newFiles.length} file(s) to upload queue`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.tiff'],
      'application/pdf': ['.pdf']
    },
    multiple: true,
    disabled: loading
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const clearAllFiles = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
  };

  const retryFile = (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'queued', progress: 0 }
        : f
    ));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('No files to upload');
      return;
    }

    setIsPaused(false);

    const queuedFiles = files.filter(f => f.status === 'queued');
    
    for (const file of queuedFiles) {
      if (isPaused) break;

      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        ));

        // Use the hook's uploadFile method
        await uploadFile(file, config.recordType, config.language, config.quality);

        // Update status to completed
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        ));

      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'failed', progress: 0 }
            : f
        ));
        toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Small delay between uploads to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    onUploadComplete();
  };

  const pauseUploads = () => {
    setIsPaused(true);
  };

  const resumeUploads = () => {
    setIsPaused(false);
    uploadFiles();
  };

  const getStatusBadge = (status: QueuedFile['status']) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary">Queued</Badge>;
      case 'uploading':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Uploading</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const renderConfigPanel = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Settings className="h-5 w-5 mr-2" />
          Upload Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Record Type
            </label>
            <select
              value={config.recordType}
              onChange={(e) => setConfig(prev => ({ ...prev, recordType: e.target.value as any }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="baptism">Baptism</option>
              <option value="marriage">Marriage</option>
              <option value="funeral">Funeral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Language
            </label>
            <select
              value={config.language}
              onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value as any }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="ru">Russian</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quality
            </label>
            <select
              value={config.quality}
              onChange={(e) => setConfig(prev => ({ ...prev, quality: e.target.value as any }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="fast">Fast</option>
              <option value="balanced">Balanced</option>
              <option value="accurate">Accurate</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.autoSubmit}
                onChange={(e) => setConfig(prev => ({ ...prev, autoSubmit: e.target.checked }))}
                disabled={loading}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-submit</span>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDropZone = () => (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer mb-6
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-300 hover:border-gray-400'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
      </p>
      <p className="text-gray-600 dark:text-gray-400 mb-2">
        or click to select files
      </p>
      <p className="text-sm text-gray-500">
        Supports: JPEG, PNG, TIFF, PDF • Max 10MB each
      </p>
    </div>
  );

  const renderFileList = () => {
    if (files.length === 0) return null;

    const stats = {
      queued: files.filter(f => f.status === 'queued').length,
      uploading: files.filter(f => f.status === 'uploading').length,
      completed: files.filter(f => f.status === 'completed').length,
      failed: files.filter(f => f.status === 'failed').length
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Upload Queue ({files.length})</CardTitle>
              <CardDescription>
                {stats.completed} completed • {stats.failed} failed • {stats.queued} queued
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {!loading && !isPaused && stats.queued > 0 && (
                <Button onClick={uploadFiles} className="bg-blue-600 hover:bg-blue-700">
                  <Play className="h-4 w-4 mr-2" />
                  Start Upload
                </Button>
              )}
              {loading && (
                <Button onClick={pauseUploads} variant="outline">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              {isPaused && stats.queued > 0 && (
                <Button onClick={resumeUploads} className="bg-blue-600 hover:bg-blue-700">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              <Button onClick={clearAllFiles} variant="outline" disabled={loading}>
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center flex-1">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {file.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusBadge(file.status)}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {file.status === 'failed' && (
                        <DropdownMenuItem onClick={() => retryFile(file.id)}>
                          Retry Upload
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => removeFile(file.id)}
                        className="text-red-600"
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {renderConfigPanel()}
      {renderDropZone()}
      {renderFileList()}
    </div>
  );
};
