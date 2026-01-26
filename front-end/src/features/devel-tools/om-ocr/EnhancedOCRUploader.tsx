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
  Card,
  CardContent,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Switch,
  FormControlLabel,
  Collapse,
  Divider,
  alpha,
  useTheme,
  Snackbar,
  Radio,
  RadioGroup,
  FormLabel,
} from '@mui/material';
import {
  IconUpload,
  IconX,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
  IconPlayerPlay,
  IconPlayerPause,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconSettings,
  IconDatabase,
  IconAlertTriangle,
  IconPhoto,
  IconClock,
  IconRotateClockwise
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/shared/lib/axiosInstance';
// @deprecated - Replaced by Workbench
// import InspectionPanel from './components/InspectionPanel';
// import MappingTab from './components/MappingTab';
// import ProcessedImagesTable from './components/ProcessedImagesTable';
import RecordSchemaInfoPopover from './components/RecordSchemaInfoPopover';
import { useOcrJobs } from './hooks/useOcrJobs';
import { WorkbenchProvider } from './context/WorkbenchContext';
import OcrWorkbench from './components/workbench/OcrWorkbench';
import type { OCRJobRow } from './types/ocrJob';
import type { JobDetail } from './types/inspection';
import { getDefaultColumns } from './config/defaultRecordColumns';
import { OcrSelectionProvider } from './context/OcrSelectionContext';
import OcrSetupGate from './components/OcrSetupGate';

// Types
interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  thumbnail?: string;
  jobId?: string; // Backend job ID after upload
  isSimulation?: boolean; // Flag for simulation mode results
}

interface Church {
  id: number;
  name: string;
  database_name: string;
}

interface OCRSettings {
  engine: string;
  dpi: number;
  confidenceThreshold: number;
  autoDetectLanguage: boolean;
  forceGrayscale: boolean;
  deskewImages: boolean;
  language: string;
}

interface DocumentProcessingSettings {
  transcriptionMode: 'exact' | 'fix-spelling';
  textExtractionScope: 'all' | 'handwritten-only';
  formattingMode: 'improve-formatting' | 'preserve-original';
}

type ExtractionAction = 'full-text' | 'tables' | 'custom-data';

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const generateId = (): string => Math.random().toString(36).substring(2, 11);

// Status Badge Component
const StatusBadge: React.FC<{ status: UploadFile['status'] }> = ({ status }) => {
  const theme = useTheme();
  
  const config = {
    queued: { label: 'Queued', color: theme.palette.grey[500], icon: <IconClock size={14} /> },
    uploading: { label: 'Uploading', color: theme.palette.info.main, icon: <CircularProgress size={14} sx={{ color: 'inherit' }} /> },
    processing: { label: 'Processing', color: theme.palette.warning.main, icon: <CircularProgress size={14} sx={{ color: 'inherit' }} /> },
    complete: { label: 'Complete', color: theme.palette.success.main, icon: <IconCheck size={14} /> },
    error: { label: 'Error', color: theme.palette.error.main, icon: <IconAlertCircle size={14} /> }
  };

  const { label, color, icon } = config[status];

  return (
    <Chip
      size="small"
      label={label}
      icon={<Box sx={{ display: 'flex', color: 'inherit' }}>{icon}</Box>}
      sx={{
        bgcolor: alpha(color, 0.1),
        color: color,
        borderColor: alpha(color, 0.3),
        border: '1px solid',
        fontWeight: 500,
        fontSize: '0.75rem',
        '& .MuiChip-icon': { color: 'inherit' }
      }}
    />
  );
};

// Record Type Badge Component
const RecordTypeBadge: React.FC<{ type: 'baptism' | 'marriage' | 'funeral' }> = ({ type }) => {
  const theme = useTheme();
  
  const colors = {
    baptism: theme.palette.primary.main,
    marriage: '#9c27b0',
    funeral: theme.palette.grey[700]
  };

  return (
    <Chip
      size="small"
      label={type.charAt(0).toUpperCase() + type.slice(1)}
      sx={{
        bgcolor: alpha(colors[type], 0.1),
        color: colors[type],
        fontWeight: 600,
        fontSize: '0.7rem',
        textTransform: 'capitalize'
      }}
    />
  );
};

// File Card Component
const FileCard: React.FC<{
  file: UploadFile;
  isSelected?: boolean;
  onRecordTypeChange: (id: string, type: 'baptism' | 'marriage' | 'funeral') => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onSelect?: (id: string) => void;
}> = ({ file, isSelected, onRecordTypeChange, onRemove, onRetry, onSelect }) => {
  const theme = useTheme();
  const isClickable = file.status === 'complete' && onSelect;

  return (
    <Paper
      elevation={0}
      onClick={() => isClickable && onSelect(file.id)}
      sx={{
        p: 2,
        mb: 1.5,
        border: '2px solid',
        borderColor: isSelected ? 'primary.main' : file.status === 'error' ? 'error.light' : 'divider',
        borderRadius: 2,
        bgcolor: isSelected 
          ? alpha(theme.palette.primary.main, 0.05) 
          : file.status === 'error' 
            ? alpha(theme.palette.error.main, 0.02) 
            : 'background.paper',
        transition: 'all 0.2s ease',
        cursor: isClickable ? 'pointer' : 'default',
        '&:hover': {
          boxShadow: theme.shadows[2],
          borderColor: isSelected ? 'primary.dark' : file.status === 'error' ? 'error.main' : 'primary.light'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Thumbnail */}
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {file.thumbnail ? (
            <img src={file.thumbnail} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <IconPhoto size={24} color={theme.palette.grey[400]} />
          )}
        </Box>

        {/* File Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap title={file.name}>
            {file.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(file.size)}
          </Typography>
          
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap">
            <RecordTypeBadge type={file.recordType} />
            {file.isSimulation && (
              <Chip
                label="SIMULATION"
                size="small"
                color="info"
                sx={{ fontSize: '0.7rem', height: 20, fontWeight: 600 }}
              />
            )}
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={file.recordType}
                onChange={(e) => onRecordTypeChange(file.id, e.target.value as any)}
                disabled={file.status !== 'queued'}
                sx={{ 
                  height: 28, 
                  fontSize: '0.75rem',
                  '& .MuiSelect-select': { py: 0.5 }
                }}
              >
                <MenuItem value="baptism">Baptism</MenuItem>
                <MenuItem value="marriage">Marriage</MenuItem>
                <MenuItem value="funeral">Funeral</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Progress Bar */}
          {(file.status === 'uploading' || file.status === 'processing') && (
            <Box sx={{ mt: 1.5 }}>
              <LinearProgress 
                variant="determinate" 
                value={file.progress} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    transition: 'transform 0.3s ease'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {file.progress}%
              </Typography>
            </Box>
          )}

          {/* Error Message */}
          {file.status === 'error' && file.error && (
            <Alert 
              severity="error" 
              sx={{ mt: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.75rem' } }}
              action={
                <Button size="small" onClick={() => onRetry(file.id)} startIcon={<IconRotateClockwise size={14} />}>
                  Retry
                </Button>
              }
            >
              {file.error}
            </Alert>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <StatusBadge status={file.status} />
          <IconButton 
            size="small" 
            onClick={() => onRemove(file.id)}
            disabled={file.status === 'uploading' || file.status === 'processing'}
            sx={{ color: 'text.secondary' }}
          >
            <IconX size={18} />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

// Batch Progress Component
const BatchProgress: React.FC<{
  total: number;
  completed: number;
  processing: boolean;
}> = ({ total, completed, processing }) => {
  const theme = useTheme();
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        {processing && (
          <CircularProgress size={20} sx={{ color: 'primary.main' }} />
        )}
        <Typography variant="subtitle2" fontWeight={600}>
          Batch Progress
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {completed} of {total}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          mt: 1.5,
          height: 10,
          borderRadius: 5,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          '& .MuiLinearProgress-bar': {
            borderRadius: 5,
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
          }
        }}
      />
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {completed} images processed
        </Typography>
        <Typography variant="caption" color="primary.main" fontWeight={600}>
          {percentage}%
        </Typography>
      </Stack>
    </Paper>
  );
};

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

        // Use different endpoint for simulation mode
        const endpoint = (simulationMode && isSimulationModeAvailable)
          ? `/api/church/${selectedChurchId}/ocr/enhanced/process?ocr_mode=simulate`
          : '/api/ocr/jobs/upload';
        
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
      const response: any = await apiClient.get(`/api/ocr/jobs/${file.jobId}?churchId=${selectedChurchId}`);
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
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <IconSettings size={20} style={{ marginRight: 12 }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Settings
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              {showAdvanced ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
            </Box>
          </Box>
          
          <Collapse in={showAdvanced}>
            <Divider />
            <Box sx={{ p: 3 }}>
              {/* Document Processing Settings */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Document processing
                  </Typography>
                  <Chip label="Customize AI" size="small" color="primary" variant="outlined" />
                  <Chip label="Experimental" size="small" color="warning" variant="outlined" />
                </Stack>
                
                <Stack spacing={2.5}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, fontWeight: 500 }}>Transcription mode</FormLabel>
                    <Select
                      value={docSettings.transcriptionMode}
                      onChange={(e) => {
                        setDocSettings(s => ({ ...s, transcriptionMode: e.target.value as any }));
                        showToast('Settings saved', 'success');
                      }}
                      size="small"
                    >
                      <MenuItem value="exact">Transcribe exactly as written</MenuItem>
                      <MenuItem value="fix-spelling">Fix spelling mistakes</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, fontWeight: 500 }}>Text extraction scope</FormLabel>
                    <Select
                      value={docSettings.textExtractionScope}
                      onChange={(e) => {
                        setDocSettings(s => ({ ...s, textExtractionScope: e.target.value as any }));
                        if (e.target.value === 'handwritten-only') {
                          showToast('Handwritten-only not supported for this engine yet.', 'warning');
                        } else {
                          showToast('Settings saved', 'success');
                        }
                      }}
                      size="small"
                    >
                      <MenuItem value="all">Extract all text</MenuItem>
                      <MenuItem value="handwritten-only">Extract handwritten text only</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, fontWeight: 500 }}>Formatting mode</FormLabel>
                    <Select
                      value={docSettings.formattingMode}
                      onChange={(e) => {
                        setDocSettings(s => ({ ...s, formattingMode: e.target.value as any }));
                        showToast('Settings saved', 'success');
                      }}
                      size="small"
                    >
                      <MenuItem value="improve-formatting">Improving formatting for better readability</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Action Selector */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Choose an action
                </Typography>
                <RadioGroup
                  value={extractionAction}
                  onChange={(e) => setExtractionAction(e.target.value as ExtractionAction)}
                >
                  <FormControlLabel
                    value="full-text"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          Extract Full Text
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Extract all text from the document
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="tables"
                    control={<Radio disabled />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.disabled">
                          Extract Tables
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Coming soon
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="custom-data"
                    control={<Radio disabled />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.disabled">
                          Extract Custom Data
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Coming soon
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </Box>
            </Box>
          </Collapse>
        </Paper>

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
        <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box
            sx={{ 
              p: 2, 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <IconSettings size={20} style={{ marginRight: 12 }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Advanced Options
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              {showAdvanced ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
            </Box>
          </Box>
          
          <Collapse in={showAdvanced}>
            <Divider />
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.autoDetectLanguage}
                      onChange={(e) => setSettings(s => ({ ...s, autoDetectLanguage: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Auto-detect Language</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Automatically detect the language in record images
                      </Typography>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.forceGrayscale}
                      onChange={(e) => setSettings(s => ({ ...s, forceGrayscale: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Force Grayscale Preprocessing</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Convert images to grayscale before OCR processing
                      </Typography>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.deskewImages}
                      onChange={(e) => setSettings(s => ({ ...s, deskewImages: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Deskew Images Before OCR</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Automatically correct skewed or rotated images
                      </Typography>
                    </Box>
                  }
                />
                
                <Box>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>OCR Language</Typography>
                  <FormControl sx={{ minWidth: 200 }}>
                    <Select
                      value={settings.language}
                      onChange={(e) => setSettings(s => ({ ...s, language: e.target.value }))}
                      size="small"
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="el">Greek</MenuItem>
                      <MenuItem value="ru">Russian</MenuItem>
                      <MenuItem value="ro">Romanian</MenuItem>
                      <MenuItem value="sr">Serbian</MenuItem>
                      <MenuItem value="bg">Bulgarian</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Default language from church settings
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Upload Directory</Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: 'background.paper', 
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}
                  >
                    {uploadPath}
                  </Paper>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Server path where images will be stored
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Sticky Defaults Section */}
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 2 }}>
                    Sticky Default Fields
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Restrict field mapping to default database columns for each record type
                  </Typography>
                  
                  <Stack spacing={2}>
                    {/* Baptism Records */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <RecordSchemaInfoPopover
                        title="baptism_records"
                        imageSrc="/images/schema-previews/baptism_records.png"
                      />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        baptism_records
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={stickyDefaults.baptism}
                            onChange={(e) => setStickyDefaults(prev => ({ ...prev, baptism: e.target.checked }))}
                            size="small"
                          />
                        }
                        label="Sticky Defaults"
                        labelPlacement="end"
                      />
                    </Box>

                    {/* Marriage Records */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <RecordSchemaInfoPopover
                        title="marriage_records"
                        imageSrc="/images/schema-previews/marriage_records.png"
                      />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        marriage_records
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={stickyDefaults.marriage}
                            onChange={(e) => setStickyDefaults(prev => ({ ...prev, marriage: e.target.checked }))}
                            size="small"
                          />
                        }
                        label="Sticky Defaults"
                        labelPlacement="end"
                      />
                    </Box>

                    {/* Funeral Records */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <RecordSchemaInfoPopover
                        title="funeral_records"
                        imageSrc="/images/schema-previews/funeral_records.png"
                      />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        funeral_records
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={stickyDefaults.funeral}
                            onChange={(e) => setStickyDefaults(prev => ({ ...prev, funeral: e.target.checked }))}
                            size="small"
                          />
                        }
                        label="Sticky Defaults"
                        labelPlacement="end"
                      />
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Collapse>
        </Paper>

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

