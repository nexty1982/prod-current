import React, { useEffect, useState, useCallback } from 'react';
import { fetchJobs, retryJob, deleteJob } from '../lib/ocrApi';
import { Loader2, Play, Trash2, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import type { OCRJob } from '../lib/ocrApi';

interface JobListProps {
  className?: string;
  onSelect?: (id: string) => void;
  selectedJobId?: string;
  churchId?: number;
  refreshTrigger?: number;
}

const StatusIcon = ({ status }: { status: OCRJob['status'] }) => {
  const iconClass = "h-4 w-4";
  
  switch (status) {
    case 'completed':
      return <CheckCircle className={`${iconClass} text-green-600`} />;
    case 'failed':
      return <AlertCircle className={`${iconClass} text-red-600`} />;
    case 'processing':
      return <Loader2 className={`${iconClass} text-blue-600 animate-spin`} />;
    case 'pending':
      return <Clock className={`${iconClass} text-yellow-600`} />;
    default:
      return <FileText className={`${iconClass} text-gray-400`} />;
  }
};

const StatusBadge = ({ status }: { status: OCRJob['status'] }) => {
  const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  
  const statusStyles = {
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    processing: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-gray-100 text-gray-800"
  };
  
  return (
    <span className={`${baseClasses} ${statusStyles[status] || statusStyles.cancelled}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const JobList: React.FC<JobListProps> = ({ 
  className = '', 
  onSelect, 
  selectedJobId, 
  churchId,
  refreshTrigger = 0 
}) => {
  const [jobs, setJobs] = useState<OCRJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedJobs = await fetchJobs(churchId);
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('Failed to load OCR jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs, refreshTrigger]);

  // Auto-refresh every 5 seconds for processing jobs
  useEffect(() => {
    const hasProcessingJobs = jobs.some(job => job.status === 'processing' || job.status === 'pending');
    
    if (hasProcessingJobs) {
      const interval = setInterval(loadJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [jobs, loadJobs]);

  const handleRetry = useCallback(async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(jobId);
    
    try {
      await retryJob(jobId);
      await loadJobs();
    } catch (error) {
      console.error('Failed to retry job:', error);
    } finally {
      setActionLoading(null);
    }
  }, [loadJobs]);

  const handleDelete = useCallback(async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this OCR job?')) {
      return;
    }
    
    setActionLoading(jobId);
    
    try {
      await deleteJob(jobId);
      await loadJobs();
    } catch (error) {
      console.error('Failed to delete job:', error);
    } finally {
      setActionLoading(null);
    }
  }, [loadJobs]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Recent OCR Jobs</h2>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
      </div>
      
      <div className="divide-y">
        {jobs.length === 0 && !loading ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No OCR jobs yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload some documents to get started</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className={`
                p-4 cursor-pointer hover:bg-gray-50 transition-colors
                ${selectedJobId === job.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''}
              `}
              onClick={() => onSelect?.(job.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIcon status={job.status} />
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {job.originalFilename || job.filename}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <StatusBadge status={job.status} />
                    {job.pages && <span>Pages: {job.pages}</span>}
                    {job.fileSize && <span>{formatFileSize(job.fileSize)}</span>}
                    {job.engine && <span className="capitalize">{job.engine}</span>}
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-400">
                    Created: {formatDate(job.createdAt)}
                  </div>
                  
                  {job.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      {job.error}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  {job.status === 'failed' && (
                    <button
                      onClick={(e) => handleRetry(job.id, e)}
                      disabled={actionLoading === job.id}
                      className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                      title="Retry OCR processing"
                    >
                      {actionLoading === job.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => handleDelete(job.id, e)}
                    disabled={actionLoading === job.id}
                    className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-red-300 disabled:opacity-50"
                    title="Delete job"
                  >
                    {actionLoading === job.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-gray-600 hover:text-red-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobList;
