/**
 * useOcrJobs Hook
 * React hook for managing OCR jobs data and API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

export interface OcrJob {
  id: string;
  church_id: string;
  file_path: string;
  original_filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';
  ocr_result: string;
  confidence_score: number;
  processing_time?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  record_type: 'baptism' | 'marriage' | 'funeral';
  auto_process: boolean;
  ocr_result_translation?: string;
  translation_confidence?: number;
  extracted_entities?: string;
  entity_confidence?: number;
  needs_review?: boolean;
  detected_language?: string;
}

export interface OcrStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  needs_review: number;
}

export const useOcrJobs = (churchId: string) => {
  const [jobs, setJobs] = useState<OcrJob[]>([]);
  const [stats, setStats] = useState<OcrStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    needs_review: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate stats from jobs
  const calculateStats = useCallback((jobList: OcrJob[]): OcrStats => {
    const stats = {
      total: jobList.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      needs_review: 0
    };

    jobList.forEach(job => {
      switch (job.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'processing':
          stats.processing++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'needs_review':
          stats.needs_review++;
          break;
      }
    });

    return stats;
  }, []);

  // Fetch OCR jobs from API
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/church/${churchId}/ocr/jobs`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch OCR jobs: ${response.statusText}`);
      }

      const data = await response.json();
      const jobList = data.jobs || [];
      
      setJobs(jobList);
      setStats(calculateStats(jobList));
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch OCR jobs';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [churchId, calculateStats]);

  // Upload file for OCR processing
  const uploadFile = useCallback(async (
    file: File, 
    recordType: string = 'baptism',
    language: string = 'en',
    quality: string = 'balanced'
  ) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('recordType', recordType);
      formData.append('language', language);
      formData.append('quality', quality);

      const response = await fetch(`/api/church/${churchId}/ocr/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      toast.success(`File uploaded successfully: ${file.name}`);
      
      // Refresh jobs to show the new upload
      await fetchJobs();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      toast.error(errorMessage);
      throw err;
    }
  }, [churchId, fetchJobs]);

  // Retry a failed job
  const retryJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}/retry`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Retry failed: ${response.statusText}`);
      }

      toast.success('Job retry initiated');
      await fetchJobs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retry failed';
      toast.error(errorMessage);
      throw err;
    }
  }, [churchId, fetchJobs]);

  // Delete a job
  const deleteJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      toast.success('Job deleted');
      await fetchJobs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      toast.error(errorMessage);
      throw err;
    }
  }, [churchId, fetchJobs]);

  // Get job details
  const getJobDetails = useCallback(async (jobId: string): Promise<OcrJob | null> => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch job details: ${response.statusText}`);
      }

      const data = await response.json();
      return data.job || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job details';
      toast.error(errorMessage);
      return null;
    }
  }, [churchId]);

  // Download job results
  const downloadJobResults = useCallback(async (jobId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}/export`);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ocr-results-${fileName}-${jobId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Results downloaded');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      toast.error(errorMessage);
      throw err;
    }
  }, [churchId]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    stats,
    loading,
    error,
    refreshJobs: fetchJobs,
    uploadFile,
    retryJob,
    deleteJob,
    getJobDetails,
    downloadJobResults
  };
};
