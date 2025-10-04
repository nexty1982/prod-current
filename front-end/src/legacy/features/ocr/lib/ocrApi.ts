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
  userId: string;
  fileSize?: number;
  fileType?: string;
  language?: string;
  engine?: string;
  error?: string;
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
  try {
    const params = churchId ? { churchId } : {};
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

  const { data } = await apiClient.post('/api/ocr/jobs/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data?.jobs ?? [];
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
    const params = churchId ? { churchId } : {};
    const { data } = await apiClient.get('/api/ocr/settings', { params });
    return data ?? {
      engine: 'tesseract',
      language: 'eng',
      dpi: 300,
      deskew: true,
      removeNoise: true,
      preprocessImages: true,
      outputFormat: 'json',
      confidenceThreshold: 75
    };
  } catch (error) {
    return {
      engine: 'tesseract',
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
  const payload = churchId ? { ...settings, churchId } : settings;
  await apiClient.put('/api/ocr/settings', payload);
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
