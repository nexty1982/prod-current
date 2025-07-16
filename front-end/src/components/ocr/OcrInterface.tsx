/**
 * Enhanced OCR Main Interface Component
 * Complete redesigned interface with wizard flow, preview, and advanced error handling
 * 
 * Features:
 * - Unified Upload + Progress interface
 * - Wizard and Manual upload modes
 * - Real-time image previews and confidence scoring
 * - Inline error resolution with retry capabilities
 * - Batch editing before database insertion
 * - Enhanced visual feedback and progress tracking
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Alert,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Settings, 
  CloudUpload as Upload, 
  PlaylistPlay as Activity, 
  Description as FileText, 
  Bolt as Zap,
  Visibility as Eye,
  CheckCircle as CheckCircle2,
  Warning as AlertCircle,
  AccessTime as Clock,
  Speed as Gauge,
  Close,
  Refresh,
  Download,
  Psychology as SmartToy,
  TableChart as TableIcon
} from '@mui/icons-material';
import { OcrWizardEnhanced } from './OcrWizardEnhanced';
import { OcrPreviewModal } from './OcrPreviewModal';
import { OcrRecordMapper } from './OcrRecordMapper';
import { OcrMultiRecordMapper } from './OcrMultiRecordMapper';
import { GlobalTemplateEditor } from './GlobalTemplateEditor';

interface OcrJobMetadata {
  id: string;
  filename: string;
  original_filename?: string;
  status: string;
  confidence_score?: number;
  record_type?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
  hasResult?: boolean;
  extracted_fields?: any[];
}

interface OcrInterfaceProps {
  churchId: string;
  userEmail?: string;
  theme?: string;
}

export const OcrInterface: React.FC<OcrInterfaceProps> = ({ 
  churchId, 
  userEmail,
  theme = 'light' 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<OcrJobMetadata | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [quickUploading, setQuickUploading] = useState(false);
  const [ocrTextModalOpen, setOcrTextModalOpen] = useState(false);
  const [selectedOcrText, setSelectedOcrText] = useState<{job: OcrJobMetadata, text: string} | null>(null);
  const [loadingOcrText, setLoadingOcrText] = useState(false);
  const [mapperOpen, setMapperOpen] = useState(false);
  
  // Real OCR jobs state
  const [ocrJobs, setOcrJobs] = useState<OcrJobMetadata[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  
  // Calculate real stats from OCR jobs
  const calculateStats = (jobs: OcrJobMetadata[]) => {
    const stats = {
      total: jobs.length,
      pending: jobs.filter(job => job.status === 'pending').length,
      processing: jobs.filter(job => job.status === 'processing').length,
      completed: jobs.filter(job => job.status === 'complete').length,
      failed: jobs.filter(job => job.status === 'error').length
    };
    return stats;
  };
  
  // Real stats calculated from jobs data
  const stats = calculateStats(ocrJobs);
  const loading = false;
  
  // Fetch OCR jobs from backend
  const fetchOcrJobs = async () => {
    setJobsLoading(true);
    setJobsError(null);
    
    try {
      console.log('Fetching OCR jobs for church:', churchId);
      const response = await fetch(`/api/church/${churchId}/ocr/jobs`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch OCR jobs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('OCR jobs response:', data);
      console.log('Sample job data:', data.jobs?.[0]);
      
      setOcrJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch OCR jobs:', error);
      setJobsError(error instanceof Error ? error.message : 'Failed to fetch OCR jobs');
    } finally {
      setJobsLoading(false);
    }
  };
  
  // Fetch jobs when component mounts or when activeTab changes to Processing Queue
  useEffect(() => {
    if (activeTab === 1) {
      fetchOcrJobs();
    }
  }, [activeTab, churchId]);
  
  // Fetch jobs on component mount to populate stats
  useEffect(() => {
    fetchOcrJobs();
  }, [churchId]);
  
  // Auto-refresh jobs every 30 seconds when on Processing Queue tab
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTab === 1) {
      interval = setInterval(() => {
        fetchOcrJobs();
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTab]);
  
  const refreshJobs = () => {
    if (activeTab === 1) {
      fetchOcrJobs();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle job preview
  const handlePreviewJob = (job: OcrJobMetadata) => {
    setSelectedJob(job);
    setPreviewModalOpen(true);
  };

  // Handle save from preview modal
  const handleSaveJob = async (jobId: string, fields: any[]) => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extracted_fields: fields })
      });
      
      if (response.ok) {
        console.log('OCR results updated successfully');
        refreshJobs();
      } else {
        throw new Error('Failed to update OCR results');
      }
    } catch (error) {
      console.error('Failed to save changes');
    }
  };

  // Handle viewing OCR text results
  const handleViewOcrText = async (job: OcrJobMetadata) => {
    setLoadingOcrText(true);
    setOcrTextModalOpen(true);
    
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${job.id}/details`);
      if (response.ok) {
        const data = await response.json();
        const ocrText = data.job?.extracted_text || data.job?.ocr_result || 'No OCR text available';
        setSelectedOcrText({ job, text: ocrText });
      } else {
        setSelectedOcrText({ job, text: 'Failed to load OCR text' });
      }
    } catch (error) {
      console.error('Failed to fetch OCR text:', error);
      setSelectedOcrText({ job, text: 'Error loading OCR text' });
    } finally {
      setLoadingOcrText(false);
    }
  };

  // Handle quick upload
  const handleQuickUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    console.log('Starting quick upload with', files.length, 'files');
    setQuickUploading(true);
    
    try {
      // Process files one by one since the server expects single file uploads
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Uploading file ${i + 1}/${files.length}: ${file.name} (${file.size} bytes)`);
        
        const formData = new FormData();
        formData.append('recordType', 'baptism'); // Default
        formData.append('language', 'en'); // Default
        formData.append('quality', 'balanced'); // Default
        formData.append('image', file); // Server expects 'image' field name

        console.log('Sending upload request to:', `/api/church/${churchId}/ocr/upload`);
        
        const response = await fetch(`/api/church/${churchId}/ocr/upload`, {
          method: 'POST',
          body: formData
        });

        console.log(`Response status for file ${i + 1}:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Upload failed for file ${i + 1} with response:`, errorText);
          throw new Error(`Upload failed for ${file.name}: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`File ${i + 1} upload successful:`, result);
      }
      
      // Switch to processing queue tab to show results
      setActiveTab(1);
      
      // Refresh jobs to show the newly uploaded files
      await fetchOcrJobs();
      
      // Show success message
      alert(`✅ Successfully uploaded ${files.length} file(s) for OCR processing!\n\nCheck the Processing Queue tab to monitor progress.`);
      
    } catch (error) {
      console.error('Quick upload failed:', error);
      alert(`❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check the console for details and try again.`);
    } finally {
      setQuickUploading(false);
    }
  };

  // Create hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerQuickUpload = () => {
    fileInputRef.current?.click();
  };

  const renderStatsCards = () => (
    <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">Total</Typography>
                <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
              </Box>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FileText sx={{ fontSize: 16, color: 'grey.600' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">Pending</Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.pending}</Typography>
              </Box>
              <Chip label={stats.pending} size="small" color="warning" />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">Processing</Typography>
                <Typography variant="h4" fontWeight="bold" color="info.main">{stats.processing}</Typography>
              </Box>
              {stats.processing > 0 && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'info.main',
                    animation: 'pulse 2s infinite'
                  }}
                />
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">Complete</Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">{stats.completed}</Typography>
              </Box>
              <Chip label="✓" size="small" color="success" />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">Failed</Typography>
                <Typography variant="h4" fontWeight="bold" color="error.main">{stats.failed}</Typography>
              </Box>
              <Chip label="!" size="small" color="error" />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Box sx={{ maxWidth: '7xl', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
            OCR Data Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upload, process, and manage Orthodox church records with intelligent OCR
          </Typography>
        </Box>

        {/* Stats Overview */}
        {renderStatsCards()}

        {/* Main Interface */}
        <Paper sx={{ width: '100%' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="OCR management tabs">
            <Tab 
              icon={<Upload sx={{ fontSize: 20 }} />} 
              label="Upload" 
              iconPosition="start"
            />
            <Tab 
              icon={<Activity sx={{ fontSize: 20 }} />} 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  Processing Queue
                  {stats.processing > 0 && (
                    <Chip label={stats.processing} size="small" color="info" />
                  )}
                </Box>
              }
              iconPosition="start"
            />
            <Tab 
              icon={<SmartToy sx={{ fontSize: 20 }} />} 
              label="Smart Mapper" 
              iconPosition="start"
            />
            <Tab 
              icon={<TableIcon sx={{ fontSize: 20 }} />} 
              label="Multi-Record Mapper" 
              iconPosition="start"
            />
            <Tab 
              icon={<Settings sx={{ fontSize: 20 }} />} 
              label="Settings" 
              iconPosition="start"
            />
            {userEmail === 'superadmin@orthodoxmetrics.com' && (
              <Tab 
                label="Global Template Editor"
                icon={<Chip label="SuperAdmin" size="small" color="secondary" />}
                iconPosition="start"
              />
            )}
          </Tabs>

          {/* Tab Panels */}
          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Upload Orthodox Records
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose your preferred upload method to process church records with OCR
                  </Typography>
                </Box>

                {/* Enhanced Upload Options Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
                  {/* Wizard Upload */}
                  <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <FileText sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Guided Wizard
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Step-by-step process with validation and configuration
                      </Typography>
                      <Button 
                        variant="contained" 
                        size="large"
                        startIcon={<FileText />}
                        onClick={() => setWizardOpen(true)}
                        fullWidth
                      >
                        Open Wizard
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Manual Upload */}
                  <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Upload sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Quick Upload
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Direct upload with preset configurations
                      </Typography>
                      <Button 
                        variant="outlined" 
                        size="large"
                        startIcon={<Upload />}
                        onClick={triggerQuickUpload}
                        disabled={quickUploading}
                        fullWidth
                      >
                        {quickUploading ? 'Uploading...' : 'Upload Files'}
                      </Button>
                      
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.tiff,.gif"
                        style={{ display: 'none' }}
                        onChange={(e) => handleQuickUpload(e.target.files)}
                      />
                    </CardContent>
                  </Card>

                  {/* Smart Mapper */}
                  <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <SmartToy sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Smart Mapper
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        AI-powered drag & drop field mapping
                      </Typography>
                      <Button 
                        variant="outlined" 
                        size="large"
                        startIcon={<SmartToy />}
                        onClick={() => setMapperOpen(true)}
                        fullWidth
                        color="info"
                      >
                        Open Mapper
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Multi-Record Mapper */}
                  <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <TableIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Multi-Record
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Process multiple records in one document
                      </Typography>
                      <Button 
                        variant="outlined" 
                        size="large"
                        startIcon={<TableIcon />}
                        onClick={() => setActiveTab(3)}
                        fullWidth
                        color="success"
                      >
                        Open Multi-Mapper
                      </Button>
                    </CardContent>
                  </Card>
                </Box>

                {/* Remove obsolete sections */}
                <Box sx={{ display: 'none' }}>
                </Box>

                {/* Features Comparison */}
                <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Upload Method Comparison
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium" color="primary">
                        Guided Wizard Features:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Step-by-step configuration • File validation & preview • Batch processing • Auto-insert settings
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium" color="secondary">
                        Quick Upload Features:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Instant file upload • Default settings (Baptism, English, Balanced) • Multi-file support • Expert mode
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium" color="info.main">
                        Smart Mapper Features:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • AI-powered suggestions • Drag & drop interface • Field templates • Learning engine • Visual mapping
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium" color="success.main">
                        Multi-Record Features:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Auto-split detection • Multiple records per document • Editable table interface • Bulk field mapping • Death log support
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Processing Queue
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Real-time OCR job monitoring and management
                    </Typography>
                    
                    {/* Jobs Table or Empty State */}
                    {jobsLoading ? (
                      <Box sx={{ mt: 3, p: 4, textAlign: 'center' }}>
                        <Activity sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                          Loading OCR jobs...
                        </Typography>
                      </Box>
                    ) : jobsError ? (
                      <Alert severity="error" sx={{ mt: 3 }}>
                        {jobsError}
                      </Alert>
                    ) : ocrJobs.length === 0 ? (
                      <Box sx={{ mt: 3, p: 4, textAlign: 'center' }}>
                        <Activity sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                          No OCR jobs found
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {ocrJobs.length} job(s) found
                        </Typography>
                        
                        {ocrJobs.map((job) => (
                          <Card key={job.id} sx={{ mb: 2, '&:hover': { boxShadow: 2 } }}>
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                                    {job.filename}
                                  </Typography>
                                  
                                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                                    <Chip 
                                      label={job.status} 
                                      size="small"
                                      color={
                                        job.status === 'complete' ? 'success' :
                                        job.status === 'processing' ? 'info' :
                                        job.status === 'error' ? 'error' : 'warning'
                                      }
                                      icon={
                                        job.status === 'complete' ? <CheckCircle2 sx={{ fontSize: 16 }} /> :
                                        job.status === 'processing' ? <Clock sx={{ fontSize: 16 }} /> :
                                        job.status === 'error' ? <AlertCircle sx={{ fontSize: 16 }} /> :
                                        <Clock sx={{ fontSize: 16 }} />
                                      }
                                    />
                                    
                                    {job.confidence_score && (
                                      <Chip 
                                        label={`${Math.round(job.confidence_score)}% confidence`}
                                        size="small"
                                        color={job.confidence_score > 80 ? 'success' : job.confidence_score > 60 ? 'warning' : 'error'}
                                      />
                                    )}
                                    
                                    {job.record_type && (
                                      <Chip 
                                        label={job.record_type}
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                  </Box>

                                  <Typography variant="body2" color="text.secondary">
                                    ID: {job.id} • Status: {job.status} • Type: {job.record_type || 'Unknown'}
                                    {job.created_at && (
                                      <> • Created: {new Date(job.created_at).toLocaleString()}</>
                                    )}
                                  </Typography>
                                  
                                  {/* OCR Results Preview */}
                                  {job.status === 'complete' && job.extracted_fields && job.extracted_fields.length > 0 && (
                                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                      <Typography variant="body2" fontWeight="medium" gutterBottom>
                                        Extracted Data Preview:
                                      </Typography>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {job.extracted_fields.slice(0, 3).map((field: any, idx: number) => (
                                          <Chip 
                                            key={idx}
                                            label={`${field.field}: ${String(field.value).substring(0, 20)}${String(field.value).length > 20 ? '...' : ''}`}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                          />
                                        ))}
                                        {job.extracted_fields.length > 3 && (
                                          <Chip 
                                            label={`+${job.extracted_fields.length - 3} more`}
                                            size="small"
                                            variant="outlined"
                                          />
                                        )}
                                      </Box>
                                    </Box>
                                  )}
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  {(job.status === 'complete' || job.hasResult) && (
                                    <>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<Eye />}
                                        onClick={() => handlePreviewJob(job)}
                                      >
                                        Preview
                                      </Button>
                                      <Button
                                        variant="text"
                                        size="small"
                                        startIcon={<FileText />}
                                        onClick={() => handleViewOcrText(job)}
                                      >
                                        View OCR Text
                                      </Button>
                                    </>
                                  )}
                                  
                                  {job.status === 'error' && (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      color="error"
                                      onClick={() => console.log('Retry job:', job.id)}
                                    >
                                      Retry
                                    </Button>
                                  )}
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                        
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <Button 
                            variant="outlined" 
                            size="small"
                            onClick={fetchOcrJobs}
                            startIcon={<Refresh />}
                          >
                            Refresh Jobs
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <OcrRecordMapper
                  churchId={churchId}
                  userEmail={userEmail}
                  onSubmit={(mappedRecord) => {
                    console.log('Mapped record submitted:', mappedRecord);
                    // Switch to processing queue to show any new OCR jobs
                    setActiveTab(1);
                    fetchOcrJobs();
                    alert('✅ Smart mapping completed successfully!\n\nRecord has been processed and added to the queue.');
                  }}
                  onClose={() => {
                    // Optional: Handle close if needed
                    console.log('Smart mapper closed');
                  }}
                />
              </Box>
            )}

            {activeTab === 3 && (
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Multi-Record OCR Mapper
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Correct and organize OCR results for documents containing multiple structured records (like death logs)
                  </Typography>
                </Box>

                <OcrMultiRecordMapper
                  churchId={churchId}
                  onSubmit={(correctedRecords) => {
                    console.log('Multi-record mapping completed:', correctedRecords);
                    // Switch to processing queue to show any new records
                    setActiveTab(1);
                    fetchOcrJobs();
                    alert('✅ Multi-record mapping completed successfully!\n\nRecords have been processed and added to the database.');
                  }}
                  onCancel={() => {
                    console.log('Multi-record mapper cancelled');
                  }}
                />
              </Box>
            )}

            {activeTab === 4 && (
              <Box>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      OCR Settings
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configure OCR processing parameters
                    </Typography>
                    <Box sx={{ mt: 3, p: 4, textAlign: 'center' }}>
                      <Settings sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        Settings panel coming soon
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}

            {activeTab === 5 && userEmail === 'superadmin@orthodoxmetrics.com' && (
              <Box>
                <Card>
                  <CardContent sx={{ p: 0 }}>
                    <GlobalTemplateEditor 
                      churchId={churchId}
                      userEmail={userEmail}
                    />
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Loading Overlay */}
        {loading && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}
          >
            <Card sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    border: '2px solid transparent',
                    borderTop: '2px solid primary.main',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <Typography variant="h6">Loading OCR jobs...</Typography>
              </Box>
            </Card>
          </Box>
        )}

        {/* OCR Upload Wizard Modal */}
        <Dialog 
          open={wizardOpen} 
          onClose={() => setWizardOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { 
              minHeight: '80vh',
              maxHeight: '90vh',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">OCR Upload Wizard</Typography>
            <IconButton onClick={() => setWizardOpen(false)}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ 
            p: 0, 
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}>
            <OcrWizardEnhanced
              churchId={churchId}
              onComplete={(data) => {
                console.log('Wizard completed:', data);
                setWizardOpen(false);
                // Switch to processing queue tab to show results
                setActiveTab(1);
                // Refresh jobs to show new uploads
                fetchOcrJobs();
              }}
              onCancel={() => {
                setWizardOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* OCR Preview Modal */}
        <OcrPreviewModal
          job={selectedJob}
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedJob(null);
          }}
          onSave={handleSaveJob}
          churchId={churchId}
        />

        {/* OCR Text Results Modal */}
        <Dialog
          open={ocrTextModalOpen}
          onClose={() => {
            setOcrTextModalOpen(false);
            setSelectedOcrText(null);
          }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { 
              maxHeight: '90vh',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">OCR Text Results</Typography>
              {selectedOcrText?.job && (
                <Typography variant="body2" color="text.secondary">
                  {selectedOcrText.job.filename}
                </Typography>
              )}
            </Box>
            <IconButton onClick={() => {
              setOcrTextModalOpen(false);
              setSelectedOcrText(null);
            }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}>
            {loadingOcrText ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Activity sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Loading OCR text...
                  </Typography>
                </Box>
              </Box>
            ) : selectedOcrText ? (
              <Box>
                {/* Job Info Summary */}
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        label={selectedOcrText.job.status} 
                        size="small"
                        color={selectedOcrText.job.status === 'complete' ? 'success' : 'info'}
                      />
                      {selectedOcrText.job.confidence_score && (
                        <Chip 
                          label={`${Math.round(selectedOcrText.job.confidence_score)}% confidence`}
                          size="small"
                          color={selectedOcrText.job.confidence_score > 80 ? 'success' : selectedOcrText.job.confidence_score > 60 ? 'warning' : 'error'}
                        />
                      )}
                      {selectedOcrText.job.record_type && (
                        <Chip 
                          label={selectedOcrText.job.record_type}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {selectedOcrText.job.language && (
                        <Chip 
                          label={selectedOcrText.job.language.toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* OCR Text Content */}
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'grey.50', 
                  maxHeight: '400px', 
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#888',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#555',
                  },
                }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Extracted Text:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    component="pre"
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      lineHeight: 1.6,
                      color: selectedOcrText.text === 'No OCR text available' || selectedOcrText.text.startsWith('Failed') || selectedOcrText.text.startsWith('Error') ? 'error.main' : 'text.primary'
                    }}
                  >
                    {selectedOcrText.text}
                  </Typography>
                </Paper>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No OCR text to display
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setOcrTextModalOpen(false);
                setSelectedOcrText(null);
              }}
            >
              Close
            </Button>
            {selectedOcrText?.text && selectedOcrText.text !== 'No OCR text available' && !selectedOcrText.text.startsWith('Failed') && !selectedOcrText.text.startsWith('Error') && (
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => {
                  const blob = new Blob([selectedOcrText.text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedOcrText.job.filename}_ocr_text.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                Download Text
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Smart Mapper Modal */}
        <Dialog
          open={mapperOpen}
          onClose={() => setMapperOpen(false)}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: { 
              minHeight: '90vh', 
              maxHeight: '90vh',
              overflow: 'hidden'
            }
          }}
        >
          <DialogContent sx={{ 
            p: 0, 
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}>
            <OcrRecordMapper
              churchId={churchId}
              userEmail={userEmail}
              onSubmit={(mappedRecord) => {
                console.log('Smart mapper completed:', mappedRecord);
                setMapperOpen(false);
                // Switch to processing queue to show any new OCR jobs
                setActiveTab(1);
                fetchOcrJobs();
                alert('✅ Smart mapping completed successfully!\n\nRecord has been processed and is available in the Processing Queue.');
              }}
              onClose={() => setMapperOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </Box>
    </Box>
  );
};
