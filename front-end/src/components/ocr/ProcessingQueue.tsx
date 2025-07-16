/**
 * Enhanced OCR Processing Queue Component
 * Real-time queue management with improved UX, visual feedback, and error handling
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  RefreshCw, 
  Search, 
  Filter,
  Download,
  Eye,
  MoreVertical,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Pause,
  FileText
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { toast } from 'react-toastify';

import { OcrJobMetadata } from './types';
import { ConfidenceBadge } from './ConfidenceBadge';

interface ProcessingQueueProps {
  churchId: string;
  onPreviewJob: (job: OcrJobMetadata) => void;
  theme?: string;
}

interface QueueFilters {
  status: string;
  recordType: string;
  dateRange: string;
  search: string;
}

export const ProcessingQueue: React.FC<ProcessingQueueProps> = ({
  churchId,
  onPreviewJob,
  theme = 'light'
}) => {
  const [jobs, setJobs] = useState<OcrJobMetadata[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<OcrJobMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filters, setFilters] = useState<QueueFilters>({
    status: 'all',
    recordType: 'all',
    dateRange: '7days',
    search: ''
  });

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      } else {
        throw new Error('Failed to fetch jobs');
      }
    } catch (error) {
      console.error('Error fetching OCR jobs:', error);
      toast.error('Failed to load OCR jobs');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to jobs
  useEffect(() => {
    let filtered = [...jobs];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(job => job.status === filters.status);
    }

    // Record type filter
    if (filters.recordType !== 'all') {
      filtered = filtered.filter(job => job.recordType === filters.recordType);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      
      switch (filters.dateRange) {
        case '1day':
          cutoff.setDate(now.getDate() - 1);
          break;
        case '7days':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '30days':
          cutoff.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(job => 
        new Date(job.createdAt) >= cutoff
      );
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(job => 
        job.fileName.toLowerCase().includes(searchTerm) ||
        job.id.toString().includes(searchTerm) ||
        (job.extractedFields && job.extractedFields.some(field => 
          field.value?.toLowerCase().includes(searchTerm)
        ))
      );
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredJobs(filtered);
  }, [jobs, filters]);

  // Auto-refresh effect
  useEffect(() => {
    fetchJobs();
    
    if (autoRefresh) {
      const interval = setInterval(fetchJobs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, churchId]);

  const retryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}/retry`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success('Job retry initiated');
        fetchJobs();
      } else {
        throw new Error('Failed to retry job');
      }
    } catch (error) {
      toast.error('Failed to retry job');
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Job deleted');
        setJobs(prev => prev.filter(job => job.id !== jobId));
      } else {
        throw new Error('Failed to delete job');
      }
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const downloadResults = async (jobId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}/export`);
      
      if (response.ok) {
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
      } else {
        throw new Error('Failed to download results');
      }
    } catch (error) {
      toast.error('Failed to download results');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'needs_review':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'needs_review':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">Needs Review</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Queue Filters</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 text-green-700' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh
            </Button>
            <Button variant="outline" size="sm" onClick={fetchJobs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="needs_review">Needs Review</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Record Type
            </label>
            <select
              value={filters.recordType}
              onChange={(e) => setFilters(prev => ({ ...prev, recordType: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="baptism">Baptism</option>
              <option value="marriage">Marriage</option>
              <option value="funeral">Funeral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="1day">Last 24 Hours</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search files, IDs..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderJobList = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mr-3" />
            <span className="text-gray-600">Loading OCR jobs...</span>
          </CardContent>
        </Card>
      );
    }

    if (filteredJobs.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No jobs found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              {jobs.length === 0 
                ? "No OCR jobs have been created yet. Upload some files to get started."
                : "No jobs match your current filters. Try adjusting your search criteria."
              }
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Processing Queue</CardTitle>
              <CardDescription>
                Showing {filteredJobs.length} of {jobs.length} jobs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  {/* Left Section: Image Preview + Details */}
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Image Thumbnail */}
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center relative overflow-hidden">
                      {job.image_preview_url ? (
                        <img 
                          src={job.image_preview_url} 
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-400" />
                      )}
                      {/* Status overlay */}
                      <div className="absolute -top-1 -right-1">
                        {getStatusIcon(job.status)}
                      </div>
                    </div>
                    
                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {job.original_filename || job.filename}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {job.record_type}
                        </Badge>
                        {job.language && (
                          <Badge variant="secondary" className="text-xs">
                            {job.language.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Confidence and Progress */}
                      {job.status === 'completed' && job.confidence_score && (
                        <div className="mb-2">
                          <ConfidenceBadge confidence={job.confidence_score} />
                        </div>
                      )}

                      {/* Processing Status Details */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <span>ID: {job.id.slice(0, 8)}...</span>
                        <span>{new Date(job.created_at).toLocaleString()}</span>
                        {job.processing_completed_at && job.status === 'completed' && (
                          <span className="text-green-600">
                            ✓ Completed {new Date(job.processing_completed_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      {/* Extracted Fields Preview */}
                      {job.extracted_fields && job.extracted_fields.length > 0 && job.status === 'completed' && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className="text-xs text-gray-600 mr-2">Extracted:</span>
                          {job.extracted_fields.slice(0, 3).map((field, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {field.field}: {field.value?.slice(0, 15)}...
                            </Badge>
                          ))}
                          {job.extracted_fields.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{job.extracted_fields.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Error Message */}
                      {job.error_message && job.status === 'failed' && (
                        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded mt-2">
                          {job.error_message}
                        </div>
                      )}

                      {/* Processing Progress */}
                      {job.status === 'processing' && (
                        <div className="mt-2">
                          <div className="flex items-center space-x-2 text-xs text-blue-600">
                            <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                            <span>Processing with Google Vision API...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Section: Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Preview Button */}
                    {(job.status === 'completed' || job.status === 'failed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPreviewJob(job)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Preview
                      </Button>
                    )}

                    {/* More Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {job.retryable && job.status === 'failed' && (
                          <DropdownMenuItem onClick={() => retryJob(job.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry Job
                          </DropdownMenuItem>
                        )}
                        {job.status === 'completed' && (
                          <DropdownMenuItem onClick={() => downloadResults(job.id, job.filename)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Results
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => deleteJob(job.id)}
                          className="text-red-600"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Delete Job
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
                          <ConfidenceBadge
                            key={index}
                            confidence={field.confidence}
                            size="sm"
                          />
                        ))}
                        {job.extractedFields.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{job.extractedFields.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusBadge(job.status)}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPreviewJob(job)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {(job.status === 'failed' || job.status === 'needs_review') && (
                        <DropdownMenuItem onClick={() => retryJob(job.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry Job
                        </DropdownMenuItem>
                      )}
                      {job.status === 'completed' && (
                        <DropdownMenuItem onClick={() => downloadResults(job.id, job.fileName)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download Results
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => deleteJob(job.id)}
                        className="text-red-600"
                      >
                        Delete Job
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
      {renderFilters()}
      {renderJobList()}
    </div>
  );
};
