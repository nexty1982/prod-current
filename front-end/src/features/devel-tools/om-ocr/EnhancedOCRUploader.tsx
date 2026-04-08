/**
 * Enhanced OCR Record Uploader
 * Production-ready interface for Orthodox Church sacramental record digitization
 * 
 * Features:
 * - Batch image uploads with progress tracking
 * - SuperAdmin church database selector
 * - Individual and batch progress indicators
 * - Advanced OCR options
 * - Error handling with retry capability
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Switch,
  FormControlLabel,
  alpha,
  useTheme,
  Snackbar,
} from '@mui/material';
import {
  IconUpload,
  IconPlayerPlay,
  IconPlayerPause,
  IconTrash,
  IconSettings,
  IconDatabase,
  IconAlertTriangle,
  IconPhoto,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import { useOcrJobs } from './hooks/useOcrJobs';
import { WorkbenchProvider } from './context/WorkbenchContext';
import OcrWorkbench from './components/workbench/OcrWorkbench';
import type { OCRJobRow } from './types/ocrJob';
import type { JobDetail } from './types/inspection';
import { OcrSelectionProvider } from './context/OcrSelectionContext';
import OcrSetupGate from './components/OcrSetupGate';
import type { UploadFile, Church, OCRSettings, DocumentProcessingSettings, ExtractionAction } from './EnhancedOCRUploader/types';
import { formatFileSize, generateId, FileCard, BatchProgress } from './EnhancedOCRUploader/components';
import SettingsPanel from './EnhancedOCRUploader/SettingsPanel';
import AdvancedOptionsPanel from './EnhancedOCRUploader/AdvancedOptionsPanel';


// Main Component
const EnhancedOCRUploader: React.FC = () => {
  const theme = useTheme();
  const { user, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to ensure church ID is valid
  const getValidChurchId = (churchId: any): number | null => {
    if (churchId === null || churchId === undefined || churchId === '') return null;
    const num = typeof churchId === 'string' ? parseInt(churchId, 10) : Number(churchId);
    return !isNaN(num) && num > 0 ? num : null;
  };

  // Get church_id from URL query params
  const urlChurchId = getValidChurchId(searchParams.get('church_id'));
  // Get ocr_mode from URL query params
  const urlOcrMode = searchParams.get('ocr_mode');

  // State
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(urlChurchId);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  // Simulation mode state
  const [simulationMode, setSimulationMode] = useState<boolean>(urlOcrMode === 'simulate');
  const isSimulationModeAvailable = selectedChurchId === 46;
  // @deprecated - Replaced by Workbench (but still used for backward compatibility)
  const [showInspectionPanel, setShowInspectionPanel] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<JobDetail | null>(null);
  const [loadingJobDetail, setLoadingJobDetail] = useState(false);
  const [showMappingTab, setShowMappingTab] = useState(false);
  const [inspectionPanelInitialTab, setInspectionPanelInitialTab] = useState<number | undefined>(undefined);
  // Use the OCR jobs hook for processed images table
  const {
    jobs: ocrJobs,
    loading: loadingOcrJobs,
    refresh: refreshOcrJobs,
    fetchJobDetail: fetchOcrJobDetail,
    updateRecordType,
    retryJob,
    deleteJobs,
    reprocessJobs,
    completedCount: ocrCompletedCount,
    failedCount: ocrFailedCount
  } = useOcrJobs({ churchId: selectedChurchId });
  const [settings, setSettings] = useState<OCRSettings>({
    engine: 'Google Vision',
    dpi: 300,
    confidenceThreshold: 85,
    autoDetectLanguage: true,
    forceGrayscale: false,
    deskewImages: true,
    language: 'en'
  });

  // Document processing settings (Phase 1)
  const [docSettings, setDocSettings] = useState<DocumentProcessingSettings>(() => {
    try {
      const stored = sessionStorage.getItem('om.ocr.docSettings');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load doc settings from sessionStorage:', e);
    }
    return {
      transcriptionMode: 'fix-spelling', // Default per spec
      textExtractionScope: 'all', // Default per spec
      formattingMode: 'improve-formatting', // Default per spec
    };
  });

  // Extraction action selector
  const [extractionAction, setExtractionAction] = useState<ExtractionAction>('full-text');

  // Toast notifications state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Persist doc settings to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('om.ocr.docSettings', JSON.stringify(docSettings));
    } catch (e) {
      console.warn('Failed to save doc settings to sessionStorage:', e);
    }
  }, [docSettings]);

  // Toast helper
  const showToast = useCallback((message: string, severity: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  // Sticky defaults state with localStorage persistence
  const [stickyDefaults, setStickyDefaults] = useState<Record<'baptism' | 'marriage' | 'funeral', boolean>>(() => {
    try {
      const stored = localStorage.getItem('om.enhancedOcrUploader.stickyDefaults.v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          baptism: parsed.baptism_records || false,
          marriage: parsed.marriage_records || false,
          funeral: parsed.funeral_records || false,
        };
      }
    } catch (e) {
      console.warn('Failed to load sticky defaults from localStorage:', e);
    }
    return { baptism: false, marriage: false, funeral: false };
  });

  // Update URL when simulation mode changes
  useEffect(() => {
    if (isSimulationModeAvailable) {
      const newParams = new URLSearchParams(searchParams);
      if (simulationMode) {
        newParams.set('ocr_mode', 'simulate');
      } else {
        newParams.delete('ocr_mode');
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [simulationMode, isSimulationModeAvailable, searchParams, setSearchParams]);

  // Persist sticky defaults to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('om.enhancedOcrUploader.stickyDefaults.v1', JSON.stringify({
        baptism_records: stickyDefaults.baptism,
        marriage_records: stickyDefaults.marriage,
        funeral_records: stickyDefaults.funeral,
      }));
    } catch (e) {
      console.warn('Failed to save sticky defaults to localStorage:', e);
    }
  }, [stickyDefaults]);

  // Computed values
  const completedCount = files.filter(f => f.status === 'complete').length;
  const failedCount = files.filter(f => f.status === 'error').length;
  // Upload path: prod/uploads/om_church_##/uploaded -> queue -> processed/failed
  const uploadPath = selectedChurchId 
    ? `/var/www/orthodoxmetrics/prod/uploads/om_church_${selectedChurchId}/uploaded/` 
    : '/var/www/orthodoxmetrics/prod/uploads/';

  // Load churches - try /api/my/churches first, fall back to /api/churches for admins
  useEffect(() => {
    const loadChurches = async () => {
      try {
        // Step 1: Try /api/my/churches first (works for all roles including priest)
        let churchList: Church[] = [];
        let useMyChurches = false;

        try {
          // Explicitly ensure no church_id headers are sent for this endpoint
          // The axios interceptor should handle this, but we'll be extra explicit
          const myChurchesResponse: any = await apiClient.get('/api/my/churches');
          const myChurchesData = myChurchesResponse.data;
          churchList = myChurchesData?.churches || myChurchesData || [];
          useMyChurches = true;
          
          if (churchList.length > 0) {
            console.log(`✅ Loaded ${churchList.length} churches from /api/my/churches`);
            setChurches(churchList);
            
            // Priority: URL param > user's church_id > first church
            if (urlChurchId) {
              setSelectedChurchId(urlChurchId);
            } else if (user?.church_id) {
              setSelectedChurchId(getValidChurchId(user.church_id) || churchList[0].id);
            } else if (churchList.length > 0) {
              setSelectedChurchId(churchList[0].id);
            }
            return; // Success, exit early
          }
        } catch (myChurchesError: any) {
          // If 404 or 400, endpoint might not be implemented or invalid request - continue to fallback
          const status = myChurchesError.response?.status;
          if (status === 404 || status === 400) {
            console.log(`⚠️ /api/my/churches returned ${status}, trying fallback`);
          } else {
            // Other error (500, etc.) - log but continue to fallback
            console.warn('⚠️ /api/my/churches error:', status || myChurchesError.message);
          }
        }

        // Step 2: Fall back to /api/churches for admin/manager/super_admin roles
        // Only if /api/my/churches returned empty or 404
        if (!useMyChurches || churchList.length === 0) {
          const isAdminRole = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin' || isSuperAdmin;
          
          if (isAdminRole) {
            try {
              const response: any = await apiClient.get('/api/churches');
              const data = response.data;
              churchList = data?.churches || data || [];
              
              if (churchList.length > 0) {
                console.log(`✅ Loaded ${churchList.length} churches from /api/churches (admin fallback)`);
                setChurches(churchList);
                
                // Priority: URL param > user's church_id > first church
                if (urlChurchId) {
                  setSelectedChurchId(urlChurchId);
                } else if (user?.church_id) {
                  setSelectedChurchId(getValidChurchId(user.church_id) || churchList[0].id);
                } else if (churchList.length > 0) {
                  setSelectedChurchId(churchList[0].id);
                }
                return; // Success
              }
            } catch (churchesError: any) {
              // If 403, user doesn't have access - try to use user's church_id
              if (churchesError.response?.status === 403) {
                console.warn('⚠️ /api/churches returned 403, using user church_id');
                
                // Priority: URL param > user's church_id
                const fallbackChurchId = urlChurchId || getValidChurchId(user?.church_id);
                if (fallbackChurchId) {
                  // Create a minimal church object from church_id
                  // The OCR endpoints will work with just the church_id
                  setChurches([{
                    id: fallbackChurchId,
                    name: `Church ${fallbackChurchId}`,
                    database_name: `om_church_${fallbackChurchId}`
                  }]);
                  setSelectedChurchId(fallbackChurchId);
                  return;
                }
              }
              // Re-throw other errors
              throw churchesError;
            }
          }
        }

        // Step 3: If still no churches, use URL param or user's church_id
        const fallbackChurchId = urlChurchId || getValidChurchId(user?.church_id);
        if (churchList.length === 0 && fallbackChurchId) {
          console.log(`⚠️ No churches loaded, using church_id: ${fallbackChurchId}`);
          setChurches([{
            id: fallbackChurchId,
            name: `Church ${fallbackChurchId}`,
            database_name: `om_church_${fallbackChurchId}`
          }]);
          setSelectedChurchId(fallbackChurchId);
          return;
        }

        // Step 4: No churches found and no user church_id
        if (churchList.length === 0) {
          console.error('❌ No churches available for user');
          setChurches([]);
        }

      } catch (error: any) {
        console.error('❌ Failed to load churches:', error);
        
        // Last resort: use URL param or user's church_id
        const fallbackChurchId = urlChurchId || getValidChurchId(user?.church_id);
        if (fallbackChurchId) {
          console.log(`⚠️ Using church_id as fallback: ${fallbackChurchId}`);
          setChurches([{
            id: fallbackChurchId,
            name: `Church ${fallbackChurchId}`,
            database_name: `om_church_${fallbackChurchId}`
          }]);
          setSelectedChurchId(fallbackChurchId);
        } else {
          setChurches([]);
        }
      }
    };

    loadChurches();
  }, [user, isSuperAdmin, urlChurchId]);

  // Handle selecting a job to view in the inspector (from ProcessedImagesTable)
  const handleInspectJob = useCallback(async (job: OCRJobRow) => {
    if (!selectedChurchId || job.status !== 'completed') return;
    
    setSelectedFileId(String(job.id));
    setShowInspectionPanel(true);
    setLoadingJobDetail(true);
    setShowMappingTab(false);
    setSelectedJobDetail(null);

    const detail = await fetchOcrJobDetail(job.id);
    if (detail) {
      // Convert to JobDetail format for InspectionPanel
      setSelectedJobDetail({
        id: String(detail.id),
        original_filename: detail.original_filename,
        filename: detail.filename,
        file_path: detail.file_path,
        status: detail.status,
        record_type: detail.record_type,
        language: detail.language,
        confidence_score: detail.confidence_score,
        created_at: detail.created_at,
        updated_at: detail.updated_at,
        ocr_text: detail.ocr_text,
        ocr_result: detail.ocr_result,
        mapping: detail.mapping
      } as any);
    }
    setLoadingJobDetail(false);
  }, [selectedChurchId, fetchOcrJobDetail]);

  // Handle file selection
  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/tiff'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 50;

    const newFiles: UploadFile[] = [];

    Array.from(fileList).slice(0, maxFiles - files.length).forEach(file => {
      if (!validTypes.includes(file.type)) {
        console.warn(`Invalid file type: ${file.name}`);
        return;
      }
      if (file.size > maxSize) {
        console.warn(`File too large: ${file.name}`);
        return;
      }

      // Create thumbnail
      const reader = new FileReader();
      const uploadFile: UploadFile = {
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        recordType: 'baptism',
        status: 'queued',
        progress: 0
      };

      reader.onload = (e) => {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, thumbnail: e.target?.result as string } : f
        ));
      };
      reader.readAsDataURL(file);

      newFiles.push(uploadFile);
    });

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length]);

  // Load demo images function (must be after handleFiles)
  const handleLoadDemoImages = useCallback(async () => {
    const demoFiles = [
      'IMG_2025_03_05_10_44_50S.jpg',
      'IMG_2024_10_25_12_32_04S.jpg',
      'IMG_2025_03_05_11_04_55S.jpg',
      'IMG_2024_10_22_11_27_57S.jpg',
      'IMG_2024_10_22_11_29_28S.jpg',
      'IMG_2024_10_25_12_28_25S.jpg',
      'IMG_2024_10_22_11_39_09S.jpg',
      'IMG_2025_03_12_12_48_44S.jpg',
    ];

    try {
      const loadedFiles: File[] = [];
      
      for (const filename of demoFiles) {
        try {
          const response = await fetch(`/images/misc/demo/${filename}`);
          if (!response.ok) {
            console.warn(`Failed to load demo image: ${filename}`);
            continue;
          }
          const blob = await response.blob();
          const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          loadedFiles.push(file);
        } catch (error) {
          console.error(`Error loading demo image ${filename}:`, error);
        }
      }

      if (loadedFiles.length > 0) {
        // Create a FileList-like object
        const dataTransfer = new DataTransfer();
        loadedFiles.forEach(file => dataTransfer.items.add(file));
        handleFiles(dataTransfer.files);
        showToast(`Loaded ${loadedFiles.length} demo images`, 'success');
      } else {
        showToast('Failed to load demo images', 'error');
      }
    } catch (error) {
      console.error('Error loading demo images:', error);
      showToast('Error loading demo images', 'error');
    }
  }, [handleFiles, showToast]);

  // Drag and drop handlers
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
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Upload files
  const startUpload = useCallback(async () => {
    if (!selectedChurchId || files.length === 0) return;

    setIsUploading(true);
    setIsPaused(false);

    const queuedFiles = files.filter(f => f.status === 'queued' || f.status === 'error');
    
    // Show OCR start toast
    if (queuedFiles.length > 0) {
      showToast('Extracting text...', 'info');
    }

    for (const uploadFile of queuedFiles) {
      if (isPaused) break;

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      try {
        const formData = new FormData();
        formData.append('files', uploadFile.file);
        formData.append('churchId', selectedChurchId.toString());
        // Send recordType - backend should store this as record_type in ocr_jobs table
        formData.append('recordType', uploadFile.recordType);
        formData.append('language', settings.language);
        formData.append('settings', JSON.stringify({
          autoDetectLanguage: settings.autoDetectLanguage,
          forceGrayscale: settings.forceGrayscale,
          deskewImages: settings.deskewImages,
          dpi: settings.dpi
        }));

        // Add simulation mode if enabled
        if (simulationMode && isSimulationModeAvailable) {
          formData.append('ocr_mode', 'simulate');
        }

        // Simulate progress (real implementation would use XMLHttpRequest for progress)
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => {
            if (f.id === uploadFile.id && f.progress < 90) {
              return { ...f, progress: f.progress + 10 };
            }
            return f;
          }));
        }, 200);

        // Use different endpoint for simulation mode vs real upload
        const endpoint = (simulationMode && isSimulationModeAvailable)
          ? `/api/church/${selectedChurchId}/ocr/enhanced/process?ocr_mode=simulate`
          : `/api/ocr/jobs/upload`;
        
        const response: any = await apiClient.post(endpoint, formData);

        clearInterval(progressInterval);

        // Extract jobId from response
        const jobs = response.data?.jobs || response.jobs || [];
        const jobId = jobs.length > 0 ? jobs[0].id : undefined;
        
        // Check if this was a simulation response
        const isSimulation = response.data?.source === 'simulation' || jobs[0]?.source === 'simulation';
        
        // Show appropriate message for unmatched simulation files
        if (simulationMode && isSimulationModeAvailable && !isSimulation && jobs.length === 0) {
          showToast('No simulation data for this file', 'warning');
        }

        // Update to processing then complete
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'processing', progress: 95, jobId } : f
        ));

        await new Promise(resolve => setTimeout(resolve, 500));

        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { 
            ...f, 
            status: 'complete', 
            progress: 100, 
            jobId,
            isSimulation: isSimulation || false
          } : f
        ));

        // Refresh the processed images table to show new job
        refreshOcrJobs();
        
        // Show success toast with simulation indicator
        if (simulationMode && isSimulationModeAvailable && response.data?.source === 'simulation') {
          showToast('Loaded verified demo OCR results', 'success');
        } else {
          showToast('OCR completed', 'success');
        }

      } catch (error: any) {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { 
            ...f, 
            status: 'error', 
            progress: 0,
            error: error.message || 'Upload failed'
          } : f
        ));
        
        // Show error toast (matches spec: "OCR processing failed" with reason)
        const errorMessage = error.message || 'Unknown error';
        showToast(`OCR processing failed: ${errorMessage}`, 'error');
      }
    }

    setIsUploading(false);
    // Final refresh to ensure all jobs are shown
    refreshOcrJobs();
  }, [files, selectedChurchId, settings, isPaused, refreshOcrJobs]);

  // Other handlers
  const handleRecordTypeChange = useCallback((id: string, type: 'baptism' | 'marriage' | 'funeral') => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, recordType: type } : f));
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleRetryFile = useCallback((id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'queued', progress: 0, error: undefined } : f));
  }, []);

  const handleClearAll = useCallback(() => {
    setFiles([]);
    setSelectedFileId(null);
    setSelectedJobDetail(null);
    setShowInspectionPanel(false);
  }, []);

  // Handle selecting a completed file to view its OCR results
  const handleSelectFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || file.status !== 'complete' || !file.jobId || !selectedChurchId) {
      return;
    }

    setSelectedFileId(fileId);
    setShowInspectionPanel(true);
    setLoadingJobDetail(true);

    try {
      const response: any = await apiClient.get(`/api/church/${selectedChurchId}/ocr/jobs/${file.jobId}`);
      setSelectedJobDetail(response.data);
    } catch (error) {
      console.error('Failed to fetch job detail:', error);
      setSelectedJobDetail(null);
    } finally {
      setLoadingJobDetail(false);
    }
  }, [files, selectedChurchId]);

  // @deprecated - Image URLs now handled by Workbench
  // Removed getImageUrl - WorkbenchViewer handles image URLs via WorkbenchContext

  const selectedChurch = churches.find(c => c.id === selectedChurchId);

  return (
    <OcrSetupGate>
      <OcrSelectionProvider>
        <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default',
        pb: 4
    }}>
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          mb: 3
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                OCR Record Uploader
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Upload, organize, and process church record images with OCR.
              </Typography>
            </Box>
            
            {/* Info Badges */}
            <Stack direction="row" spacing={1}>
              <Chip 
                icon={<IconSettings size={14} />} 
                label={settings.engine} 
                variant="outlined" 
                size="small"
                sx={{ fontWeight: 500 }}
              />
              <Chip 
                label={`${settings.dpi} DPI`} 
                variant="outlined" 
                size="small"
                sx={{ fontWeight: 500 }}
              />
              <Chip 
                label={`${settings.confidenceThreshold}% Confidence`} 
                variant="outlined" 
                size="small"
                sx={{ fontWeight: 500 }}
              />
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {/* Settings Section */}
        <SettingsPanel
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          docSettings={docSettings}
          setDocSettings={setDocSettings}
          showToast={showToast}
          extractionAction={extractionAction}
          setExtractionAction={setExtractionAction}
        />

        {/* SuperAdmin Church Selector */}
        {isSuperAdmin() && (
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              mb: 3, 
              borderRadius: 2,
              bgcolor: alpha(theme.palette.warning.main, 0.03),
              border: '2px dashed',
              borderColor: alpha(theme.palette.warning.main, 0.3)
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: 'warning.main'
                }}
              >
                <IconDatabase size={28} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Target Church Database
                  </Typography>
                  <Tooltip title="Changes affect live production data" arrow>
                    <IconAlertTriangle size={18} color={theme.palette.warning.main} />
                  </Tooltip>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Select the church database where OCR results will be stored.
                </Typography>
              </Box>
              <FormControl sx={{ minWidth: 300 }}>
                <Select
                  value={selectedChurchId || ''}
                  onChange={(e) => setSelectedChurchId(Number(e.target.value))}
                  displayEmpty
                  sx={{ 
                    bgcolor: 'background.paper',
                    '& .MuiSelect-select': { py: 1.5 }
                  }}
                >
                  {churches.map(church => (
                    <MenuItem key={church.id} value={church.id}>
                      {church.name} - Church {church.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Paper>
        )}

        {/* Drop Zone */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 3,
            borderRadius: 3,
            border: '2px dashed',
            borderColor: dragActive ? 'primary.main' : alpha(theme.palette.primary.main, 0.3),
            bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.02),
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.05)
            }
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.tiff"
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
          
          <Box
            sx={{
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 2,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconPhoto size={40} color={theme.palette.primary.main} />
          </Box>
          
          <Typography variant="h6" fontWeight={600} color="text.primary">
            Drag & drop record images here
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            or click to browse files
          </Typography>
          
          <Stack 
            direction="row" 
            spacing={2} 
            justifyContent="center" 
            sx={{ mt: 2 }}
          >
            <Chip label="• JPG" size="small" variant="outlined" />
            <Chip label="• PNG" size="small" variant="outlined" />
            <Chip label="• TIFF" size="small" variant="outlined" />
          </Stack>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Max 50 files per batch • 10MB per file
          </Typography>
          
          {/* Demo Images and Simulation Mode (only for church 46) */}
          {isSimulationModeAvailable && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<IconPhoto />}
                onClick={handleLoadDemoImages}
                disabled={isUploading}
                sx={{ mt: 1 }}
              >
                Load Demo Images
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={simulationMode}
                    onChange={(e) => setSimulationMode(e.target.checked)}
                    disabled={isUploading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      Simulation Mode
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use pre-validated demo OCR results
                    </Typography>
                  </Box>
                }
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </Paper>

        {/* Advanced Options */}
        <AdvancedOptionsPanel
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          settings={settings}
          setSettings={setSettings}
          uploadPath={uploadPath}
          stickyDefaults={stickyDefaults}
          setStickyDefaults={setStickyDefaults}
        />

        {/* Upload Controls */}
        {files.length > 0 && (
          <>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                mb: 3, 
                borderRadius: 2, 
                border: '1px solid', 
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                {simulationMode && isSimulationModeAvailable && (
                  <Chip
                    label="SIMULATION (Verified Demo)"
                    color="info"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                <Button
                  variant="contained"
                  startIcon={isUploading ? <IconPlayerPause /> : <IconUpload />}
                  onClick={isUploading ? () => setIsPaused(true) : startUpload}
                  disabled={!selectedChurchId || files.filter(f => f.status === 'queued').length === 0}
                  sx={{ 
                    px: 3,
                    background: 'linear-gradient(135deg, #5e35b1 0%, #3949ab 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4527a0 0%, #303f9f 100%)'
                    }
                  }}
                >
                  {isUploading ? 'Pause' : 'Start Upload'}
                </Button>
                
                {isPaused && (
                  <Button
                    variant="outlined"
                    startIcon={<IconPlayerPlay />}
                    onClick={() => { setIsPaused(false); startUpload(); }}
                  >
                    Resume
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash />}
                  onClick={handleClearAll}
                  disabled={isUploading}
                >
                  Clear All
                </Button>

                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <BatchProgress 
                    total={files.length} 
                    completed={completedCount}
                    processing={isUploading}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                    {isUploading ? 'Processing...' : completedCount > 0 ? `Completed: ${completedCount}` : 'Ready to upload'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* File Queue */}
            <Paper 
              elevation={0} 
              sx={{ 
                borderRadius: 2, 
                border: '1px solid', 
                borderColor: 'divider',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                p: 2, 
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Upload Queue ({files.length} files)
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Typography variant="body2" color="success.main">
                    Completed: {completedCount}
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    Failed: {failedCount}
                  </Typography>
                </Stack>
              </Box>
              
              <Box sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                {files.map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    isSelected={false}
                    onRecordTypeChange={handleRecordTypeChange}
                    onRemove={handleRemoveFile}
                    onRetry={handleRetryFile}
                    onSelect={() => {
                      // File selection now handled in Workbench via UnifiedJobsList
                      // After upload completes, jobs appear in UnifiedJobsList
                    }}
                  />
                ))}
              </Box>
            </Paper>
          </>
        )}

        {/* Workbench - Unified Jobs List + Workbench for selected job */}
        {selectedChurchId && (
          <Box sx={{ mt: 3, height: 'calc(100vh - 400px)', minHeight: 600 }}>
            <WorkbenchProvider>
              <OcrWorkbench
                churchId={selectedChurchId}
              />
            </WorkbenchProvider>
          </Box>
        )}
      </Box>

      {/* Toast Notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={12000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
        sx={{
          position: 'fixed',
          top: '50% !important',
          left: '50% !important',
          transform: 'translate(-50%, -50%) !important',
          zIndex: 10000,
          '& .MuiSnackbar-root': {
            position: 'fixed',
            top: '50% !important',
            left: '50% !important',
            transform: 'translate(-50%, -50%) !important',
          }
        }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{ 
            minWidth: '400px',
            maxWidth: '600px',
            fontSize: '1.1rem',
            padding: '16px 20px',
            '& .MuiAlert-message': {
              fontSize: '1.1rem',
              fontWeight: 500,
            },
            '& .MuiAlert-icon': {
              fontSize: '28px',
            }
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
      </Box>
      </OcrSelectionProvider>
    </OcrSetupGate>
  );
};

export default EnhancedOCRUploader;
export { EnhancedOCRUploader };

