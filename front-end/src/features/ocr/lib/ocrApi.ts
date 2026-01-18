/**
 * OCR API Service
 * Service layer for OCR job management and file processing
 */

import { apiClient } from '../../../shared/lib/axiosInstance';

export interface OCRJob {
  id: string;
  filename: string;
  originalFilename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  pages?: number;
  progress?: number;
  createdAt: string;
  updatedAt: string;
  churchId?: number;
  userId?: string; // Made optional since API doesn't always return it
  fileSize?: number;
  fileType?: string;
  language?: string;
  engine?: string;
  error?: string;
  recordType?: string;
  confidenceScore?: number;
}

export interface OCRResult {
  id: string;
  jobId: string;
  extractedText: string;
  confidence?: number;
  fields: Array<{
    id: string;
    label: string;
    value: string;
    confidence: number;
    position?: { x: number; y: number; width: number; height: number };
    editable?: boolean;
  }>;
  metadata?: {
    engine?: string;
    language?: string;
    totalPages?: number;
    processingTime?: number;
  };
}

export interface OCRSettings {
  engine: 'tesseract' | 'google-vision' | 'azure-cognitive';
  language: string;
  dpi?: number;
  deskew?: boolean;
  removeNoise?: boolean;
  preprocessImages?: boolean;
  outputFormat?: 'text' | 'json' | 'pdf' | 'hocr';
  confidenceThreshold?: number;
}

export async function fetchJobs(churchId?: number): Promise<OCRJob[]> {
  // Don't make API call if churchId is not provided
  // This prevents errors for superadmins who haven't selected a church yet
  if (!churchId) {
    return [];
  }

  try {
    const params = { churchId };
    const { data } = await apiClient.get('/api/ocr/jobs', { params });
    return data?.jobs ?? [];
  } catch (error) {
    console.error('Failed to fetch OCR jobs:', error);
    return [];
  }
}

export async function uploadFiles(files: File[], churchId?: number, settings?: Partial<OCRSettings>): Promise<OCRJob[]> {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });

  if (churchId) {
    formData.append('churchId', churchId.toString());
  }

  if (settings) {
    formData.append('settings', JSON.stringify(settings));
  }

  try {
    // Axios instance automatically handles FormData by removing Content-Type header
    // so the browser can set it with the proper boundary parameter
    const { data } = await apiClient.post('/api/ocr/jobs/upload', formData);

    return data?.jobs ?? [];
  } catch (error: any) {
    // Enhanced error handling for 500 errors and HTML responses
    console.error('Upload error details:', error);
    
    // The axios interceptor preserves status and response
    const status = error?.status || error?.response?.status;
    const responseData = error?.response?.data;
    const isHtmlResponse = typeof responseData === 'string' && responseData.trim().startsWith('<');
    
    // Handle 500 Internal Server Error
    if (status === 500) {
      if (isHtmlResponse) {
        throw new Error('Server error (500): The server encountered an internal error while processing your upload. Please check the server logs or contact support.');
      } else {
        // Try to extract error message from JSON response
        const errorMessage = responseData?.message || responseData?.error || 'Internal server error';
        throw new Error(`Server error (500): ${errorMessage}`);
      }
    }
    
    // Handle other HTTP errors (4xx, etc.)
    if (status && status >= 400) {
      const errorMessage = isHtmlResponse 
        ? `Request failed with status code ${status}`
        : (responseData?.message || responseData?.error || `Request failed with status code ${status}`);
      throw new Error(errorMessage);
    }
    
    // Handle network errors (no status code means no response from server)
    if (error?.isNetworkError || (!status && !error?.response)) {
      throw new Error('Network error: Unable to connect to the server. Please check your connection and try again.');
    }
    
    // Fallback to original error message
    throw new Error(error?.message || 'Failed to upload files. Please try again.');
  }
}

export async function retryJob(id: string): Promise<void> {
  await apiClient.post(`/api/ocr/jobs/${id}/retry`);
}

export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/api/ocr/jobs/${id}`);
}

export async function getJobResult(id: string): Promise<OCRResult | null> {
  try {
    const { data } = await apiClient.get(`/api/ocr/jobs/${id}/result`);
    return data ?? null;
  } catch (error) {
    console.error('Failed to fetch OCR result:', error);
    return null;
  }
}

export async function fetchSettings(churchId?: number): Promise<OCRSettings> {
  try {
    console.log('[OCR Settings] fetchSettings called with churchId:', churchId);
    
    // If churchId exists, only call church-specific endpoint
    if (churchId) {
      try {
        const response = await apiClient.get(`/api/church/${churchId}/ocr/settings`);
        const data = response?.data;
        console.log('[OCR Settings] Loaded settings from: church', data);
        if (data) return data;
      } catch (err: any) {
        console.error('[OCR Settings] Church-specific endpoint failed:', err.response?.data || err.message);
        // Fall through to defaults if church endpoint fails
      }
    } else {
      // Only call global endpoint if no churchId
      try {
        const response = await apiClient.get('/api/ocr/settings');
        const data = response?.data;
        console.log('[OCR Settings] Loaded settings from: global', data);
        if (data) return data;
      } catch (err: any) {
        console.error('[OCR Settings] Global endpoint failed:', err.response?.data || err.message);
      }
    }
    
    // Return defaults if no endpoint worked
    return {
      engine: 'google-vision',
      language: 'eng',
      dpi: 300,
      deskew: true,
      removeNoise: true,
      preprocessImages: true,
      outputFormat: 'json',
      confidenceThreshold: 75
    };
  } catch (error) {
    // Return defaults if endpoint doesn't exist
    console.warn('OCR settings endpoint not available, using defaults');
    return {
      engine: 'google-vision',
      language: 'eng',
      dpi: 300,
      deskew: true,
      removeNoise: true,
      preprocessImages: true,
      outputFormat: 'json',
      confidenceThreshold: 75
    };
  }
}

export async function updateSettings(settings: OCRSettings, churchId?: number): Promise<void> {
  try {
    console.log('[OCR Settings] updateSettings called with:', { churchId, settings });
    
    // If churchId exists, only call church-specific endpoint
    if (churchId) {
      try {
        const response = await apiClient.put(`/api/church/${churchId}/ocr/settings`, settings);
        const responseData = response?.data;
        console.log('[OCR Settings] Save successful via: church', responseData);
        return;
      } catch (err: any) {
        console.error('[OCR Settings] Church-specific endpoint failed:', err.response?.data || err.message);
        throw err;
      }
    } else {
      // Only call global endpoint if no churchId
      const response = await apiClient.put('/api/ocr/settings', settings);
      const responseData = response?.data;
      console.log('[OCR Settings] Save successful via: global', responseData);
    }
  } catch (error: any) {
    console.error('[OCR Settings] Save failed:', error.response?.data || error.message);
    // If endpoint doesn't exist, throw a more helpful error
    if (error.response?.status === 404) {
      throw new Error('OCR settings endpoint not implemented on backend. Settings are saved locally only.');
    }
    throw error;
  }
}

export async function fetchChurches(): Promise<Array<{ id: number; name: string }>> {
  try {
    const { data } = await apiClient.get('/api/admin/churches', {
      params: { is_active: 1 }
    });
    return (data?.rows ?? data ?? []).map((church: any) => ({
      id: church.id ?? church.church_id,
      name: church.name ?? church.church_name
    }));
  } catch (error) {
    console.error('Failed to fetch churches:', error);
    return [];
  }
}

