/**
 * OM Specification Documentation Manager
 * Clone of Gallery component adapted for documentation file management
 * Supports: .docx, .xlsx, .md, .json, .txt, .pdf, .tsx, .ts, .html, .js files
 * Uploads to: /var/www/orthodoxmetrics/prod/front-end/public/docs
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  useTheme,
  Chip,
  Stack,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Drawer,
  Pagination,
  CircularProgress,
} from '@mui/material';
import {
  IconArrowLeft,
  IconArrowRight,
  IconUpload,
  IconX,
  IconFile,
  IconCode,
  IconFileText,
  IconFileSpreadsheet,
  IconDownload,
  IconTrash,
  IconList,
  IconSearch,
  IconFilter,
  IconEye,
  IconEdit,
  IconCheck,
} from '@tabler/icons-react';
import { styled } from '@mui/material/styles';

const DocumentationContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  minHeight: '100vh',
}));

const CarouselContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  marginBottom: theme.spacing(4),
}));

const FilePreviewCard = styled(Card)(({ theme }) => ({
  width: '100%',
  minHeight: '400px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
  borderRadius: '8px',
  [theme.breakpoints.down('md')]: {
    minHeight: '300px',
  },
  [theme.breakpoints.down('sm')]: {
    minHeight: '250px',
  },
}));

const CarouselButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: '#ffffff',
  zIndex: 10,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  [theme.breakpoints.down('sm')]: {
    padding: '8px',
  },
}));

const FileGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
  gap: theme.spacing(2),
  marginTop: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: theme.spacing(1.5),
  },
}));

const FileCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: theme.shadows[8],
  },
}));

interface DocumentFile {
  name: string;
  path: string;
  type: 'docx' | 'xlsx' | 'md' | 'json' | 'txt' | 'pdf' | 'tsx' | 'ts' | 'html' | 'js';
  size: number;
  uploadedAt: string;
  timestamp: string;
}

interface OMAITask {
  id: number;
  title: string;
  category: string;
  importance: string;
  details: string;
  tags: string[];
  attachments: string[] | null;
  status: number;
  type: string;
  visibility: string;
  date_created: string;
  date_completed: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  notes: string | null;
  revisions: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const OMSpecDocumentation: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tasks state
  const [tasks, setTasks] = useState<OMAITask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<OMAITask | null>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [editTask, setEditTask] = useState<OMAITask | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteTask, setDeleteTask] = useState<OMAITask | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Task filters
  const [taskFilters, setTaskFilters] = useState({
    status: '',
    category: '',
    type: '',
    visibility: '',
    search: '',
    page: 1,
    limit: 50,
  });
  const [taskPagination, setTaskPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  // Allowed file types
  const allowedTypes = ['.docx', '.xlsx', '.md', '.json', '.txt', '.pdf', '.tsx', '.ts', '.html', '.js'];
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/markdown', // .md
    'application/json', // .json
    'text/plain', // .txt
    'application/pdf', // .pdf
    'text/typescript', // .tsx, .ts
    'text/html', // .html
    'application/javascript', // .js
    'text/javascript', // .js
  ];

  // Load files from documentation directory
  useEffect(() => {
    if (activeTab === 0) {
      loadFiles();
    }
  }, [activeTab]);

  // Load tasks when tasks tab is active
  useEffect(() => {
    if (activeTab === 1) {
      loadTasks();
    }
  }, [activeTab, taskFilters]);

  const loadFiles = async () => {
    try {
      const response = await fetch('/api/docs/files', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        // Sort by timestamp (newest first)
        const sortedFiles = (data.files || []).sort((a: DocumentFile, b: DocumentFile) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        setFiles(sortedFiles);
      } else {
        console.warn('Could not load files from API. Backend endpoint /api/docs/files may not be implemented.');
        console.warn('Files should be in: front-end/public/docs');
        console.warn('Backend needs to implement GET /api/docs/files to list files from /var/www/orthodoxmetrics/prod/front-end/public/docs');
        // Set empty array to show "no files" message
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      console.error('Backend endpoint /api/docs/files is required. Files should be in: front-end/public/docs');
      // Set empty array to show "no files" message
      setFiles([]);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? files.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === files.length - 1 ? 0 : prev + 1));
  };

  const handleFileClick = (index: number) => {
    setCurrentIndex(index);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file extension
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        setUploadError(`Please select a valid file type: ${allowedTypes.join(', ')}`);
        return;
      }
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'docx':
        return <IconFileText size={64} />;
      case 'xlsx':
        return <IconFileSpreadsheet size={64} />;
      case 'md':
      case 'txt':
        return <IconFileText size={64} />;
      case 'json':
      case 'tsx':
      case 'ts':
      case 'js':
      case 'html':
        return <IconCode size={64} />;
      case 'pdf':
        return <IconFile size={64} />;
      default:
        return <IconFile size={64} />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'docx':
        return '#2B579A';
      case 'xlsx':
        return '#1D6F42';
      case 'md':
        return '#083FA1';
      case 'json':
        return '#F7DF1E';
      case 'txt':
        return '#808080';
      case 'pdf':
        return '#DC143C';
      case 'tsx':
      case 'ts':
        return '#3178C6';
      case 'html':
        return '#E34C26';
      case 'js':
        return '#F7DF1E';
      default:
        return '#666';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Add timestamp for organization
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      formData.append('timestamp', timestamp);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              // Reload files after successful upload
              loadFiles();
              setUploadDialogOpen(false);
              setSelectedFile(null);
              setUploadProgress(0);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            } else {
              setUploadError(response.error || response.message || 'Upload failed');
            }
          } catch (e) {
            // If response is not JSON, assume success for 200 status
            loadFiles();
            setUploadDialogOpen(false);
            setSelectedFile(null);
            setUploadProgress(0);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        } else {
          // Try to parse JSON error response
          let errorMessage = 'Upload failed';
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.error || errorResponse.message || errorMessage;
          } catch (e) {
            // If response is HTML (from nginx), show generic error
            if (xhr.status === 500) {
              errorMessage = 'Internal server error. Please check server logs.';
            } else if (xhr.status === 404) {
              errorMessage = 'Upload endpoint not found. Backend needs to implement POST /api/docs/upload';
            } else {
              errorMessage = `Upload failed with status ${xhr.status}`;
            }
          }
          setUploadError(errorMessage);
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        setUploadError('Upload failed. Backend endpoint /api/docs/upload may not be available. Files should upload to: front-end/public/docs');
        setUploading(false);
      });

      xhr.open('POST', '/api/docs/upload');
      xhr.withCredentials = true; // Include cookies for authentication
      xhr.send(formData);
    } catch (error) {
      setUploadError('An error occurred during upload');
      setUploading(false);
    }
  };

  const handleDownload = (file: DocumentFile) => {
    // Use the API endpoint for downloading files
    const downloadUrl = `/api/docs/download/${encodeURIComponent(file.path)}`;
    window.open(downloadUrl, '_blank');
  };

  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true);
    setSelectedFile(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  const handleCloseUploadDialog = () => {
    if (!uploading) {
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadError(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Tasks functions
  const loadTasks = async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const params = new URLSearchParams();
      if (taskFilters.status) params.append('status', taskFilters.status);
      if (taskFilters.category) params.append('category', taskFilters.category);
      if (taskFilters.type) params.append('type', taskFilters.type);
      if (taskFilters.visibility) params.append('visibility', taskFilters.visibility);
      if (taskFilters.search) params.append('search', taskFilters.search);
      params.append('page', taskFilters.page.toString());
      params.append('limit', taskFilters.limit.toString());

      const response = await fetch(`/api/omai/tasks?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      if (data.success) {
        setTasks(data.data || []);
        setTaskPagination(data.pagination || { total: 0, totalPages: 0 });
      } else {
        throw new Error(data.error || 'Failed to load tasks');
      }
    } catch (err: any) {
      setTasksError(err.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleTaskFilterChange = (field: string, value: any) => {
    setTaskFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // Reset to first page when filter changes
    }));
  };

  const handleTaskView = (task: OMAITask) => {
    setSelectedTask(task);
    setTaskDrawerOpen(true);
  };

  const handleTaskEdit = (task: OMAITask) => {
    setEditTask({ ...task });
    setEditDialogOpen(true);
    setTaskDrawerOpen(false);
  };

  const handleTaskDelete = (task: OMAITask) => {
    setDeleteTask(task);
    setDeleteDialogOpen(true);
    setTaskDrawerOpen(false);
  };

  const handleSaveTask = async () => {
    if (!editTask) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/omai/tasks/${editTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: editTask.title,
          category: editTask.category,
          importance: editTask.importance,
          details: editTask.details,
          tags: editTask.tags,
          attachments: editTask.attachments,
          status: editTask.status,
          type: editTask.type,
          visibility: editTask.visibility,
          date_created: editTask.date_created,
          date_completed: editTask.date_completed,
          assignedTo: editTask.assigned_to,
          assignedBy: editTask.assigned_by,
          notes: editTask.notes,
          remindMe: false,
          revisions: editTask.revisions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task');
      }

      if (data.success) {
        setEditDialogOpen(false);
        setEditTask(null);
        // Reload tasks
        loadTasks();
      } else {
        throw new Error(data.error || 'Failed to update task');
      }
    } catch (err: any) {
      setTasksError(err.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTask) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/omai/tasks/${deleteTask.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete task');
      }

      if (data.success) {
        setDeleteDialogOpen(false);
        setDeleteTask(null);
        // Reload tasks
        loadTasks();
      } else {
        throw new Error(data.error || 'Failed to delete task');
      }
    } catch (err: any) {
      setTasksError(err.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusLabel = (status: number): string => {
    const statusMap: { [key: number]: string } = {
      1: 'Pending',
      2: 'Assigned',
      3: 'In Progress',
      4: 'Review',
      5: 'Testing',
      6: 'On Hold',
      7: 'Completed',
    };
    return statusMap[status] || `Status ${status}`;
  };

  const getImportanceColor = (importance: string): string => {
    const colorMap: { [key: string]: string } = {
      critical: '#d32f2f',
      high: '#f57c00',
      medium: '#fbc02d',
      low: '#388e3c',
    };
    return colorMap[importance] || '#757575';
  };

  const formatTaskDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentFile = files[currentIndex];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DocumentationContainer maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
            }}
          >
            OM Specification Documentation
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {activeTab === 0 ? 'Manage and organize documentation files' : 'View and manage OMAI internal tasks'}
          </Typography>
          
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} centered>
              <Tab icon={<IconFile size={20} />} label="Documentation" iconPosition="start" />
              <Tab icon={<IconList size={20} />} label="Tasks" iconPosition="start" />
            </Tabs>
          </Box>
          
          {/* OM Archives Image - only show on Documentation tab */}
          {activeTab === 0 && (
            <>
              <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                <img
                  src="/images/random/om-archives.png"
                  alt="OM Archives"
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: '200px',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    console.warn('OM Archives image not found');
                  }}
                />
              </Box>

              <Button
                variant="contained"
                startIcon={<IconUpload size={20} />}
                onClick={handleOpenUploadDialog}
                sx={{
                  backgroundColor: '#C8A24B',
                  color: '#1a1a1a',
                  '&:hover': {
                    backgroundColor: '#B8923A',
                  },
                }}
              >
                Upload Documentation
              </Button>
            </>
          )}
        </Box>

        {/* Documentation Tab Content */}
        {activeTab === 0 && (files.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              border: `2px dashed ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <IconFile size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Typography variant="h6" color="text.secondary">
              No documentation files
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Upload your first documentation file to get started
            </Typography>
          </Box>
        ) : (
          <>
            <CarouselContainer>
              {files.length > 1 && (
                <CarouselButton
                  onClick={handlePrevious}
                  sx={{ left: { xs: 8, sm: 16 } }}
                  aria-label="Previous file"
                >
                  <IconArrowLeft size={24} />
                </CarouselButton>
              )}
              
              <FilePreviewCard>
                {currentFile && (
                  <Box sx={{ textAlign: 'center', width: '100%' }}>
                    <Box sx={{ mb: 3, color: getFileTypeColor(currentFile.type) }}>
                      {getFileIcon(currentFile.type)}
                    </Box>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                      {currentFile.name}
                    </Typography>
                    <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
                      <Chip
                        label={currentFile.type.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: getFileTypeColor(currentFile.type),
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={formatFileSize(currentFile.size)}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Uploaded: {formatDate(currentFile.uploadedAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                      Timestamp: {currentFile.timestamp}
                    </Typography>
                    <Stack direction="row" spacing={2} justifyContent="center">
                      <Button
                        variant="contained"
                        startIcon={<IconDownload size={18} />}
                        onClick={() => handleDownload(currentFile)}
                        sx={{
                          backgroundColor: '#C8A24B',
                          color: '#1a1a1a',
                          '&:hover': {
                            backgroundColor: '#B8923A',
                          },
                        }}
                      >
                        Download
                      </Button>
                    </Stack>
                  </Box>
                )}
              </FilePreviewCard>

              {files.length > 1 && (
                <CarouselButton
                  onClick={handleNext}
                  sx={{ right: { xs: 8, sm: 16 } }}
                  aria-label="Next file"
                >
                  <IconArrowRight size={24} />
                </CarouselButton>
              )}

              {files.length > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1,
                  }}
                >
                  {files.map((_, index) => (
                    <Box
                      key={index}
                      onClick={() => handleFileClick(index)}
                      sx={{
                        width: currentIndex === index ? 24 : 8,
                        height: 8,
                        borderRadius: '4px',
                        backgroundColor:
                          currentIndex === index
                            ? '#C8A24B'
                            : 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </Box>
              )}
            </CarouselContainer>

            <FileGrid>
              {files.map((file, index) => (
                <FileCard
                  key={index}
                  onClick={() => handleFileClick(index)}
                  sx={{
                    border:
                      currentIndex === index
                        ? `3px solid #C8A24B`
                        : '3px solid transparent',
                  }}
                >
                  <CardContent>
                    <Box sx={{ textAlign: 'center', mb: 2, color: getFileTypeColor(file.type) }}>
                      {getFileIcon(file.type)}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }} noWrap>
                      {file.name}
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
                      <Chip
                        label={file.type.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: getFileTypeColor(file.type),
                          color: 'white',
                          fontSize: '0.7rem',
                        }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      {formatFileSize(file.size)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatDate(file.uploadedAt)}
                    </Typography>
                  </CardContent>
                </FileCard>
              ))}
            </FileGrid>
          </>
        ))}

        {/* Tasks Tab Content */}
        {activeTab === 1 && (
          <Box>
            {/* Filters */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <IconFilter size={20} />
                  <Typography variant="h6">Filters</Typography>
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Search"
                    size="small"
                    value={taskFilters.search}
                    onChange={(e) => handleTaskFilterChange('search', e.target.value)}
                    InputProps={{
                      startAdornment: <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
                    }}
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={taskFilters.status}
                      label="Status"
                      onChange={(e) => handleTaskFilterChange('status', e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">Pending</MenuItem>
                      <MenuItem value="2">Assigned</MenuItem>
                      <MenuItem value="3">In Progress</MenuItem>
                      <MenuItem value="4">Review</MenuItem>
                      <MenuItem value="5">Testing</MenuItem>
                      <MenuItem value="6">On Hold</MenuItem>
                      <MenuItem value="7">Completed</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={taskFilters.category}
                      label="Category"
                      onChange={(e) => handleTaskFilterChange('category', e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="ingestion-digitization">Ingestion & Digitization</MenuItem>
                      <MenuItem value="data-structuring-accuracy">Data Structuring & Accuracy</MenuItem>
                      <MenuItem value="workflow-user-experience">Workflow & User Experience</MenuItem>
                      <MenuItem value="platform-infrastructure">Platform & Infrastructure</MenuItem>
                      <MenuItem value="analytics-intelligence">Analytics & Intelligence</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={taskFilters.type}
                      label="Type"
                      onChange={(e) => handleTaskFilterChange('type', e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="documentation">Documentation</MenuItem>
                      <MenuItem value="configuration">Configuration</MenuItem>
                      <MenuItem value="reference">Reference</MenuItem>
                      <MenuItem value="guide">Guide</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Visibility</InputLabel>
                    <Select
                      value={taskFilters.visibility}
                      label="Visibility"
                      onChange={(e) => handleTaskFilterChange('visibility', e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="public">Public</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </CardContent>
            </Card>

            {/* Tasks Table */}
            {tasksError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {tasksError}
              </Alert>
            )}

            {tasksLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Title</strong></TableCell>
                        <TableCell><strong>Category</strong></TableCell>
                        <TableCell><strong>Importance</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Visibility</strong></TableCell>
                        <TableCell><strong>Tags</strong></TableCell>
                        <TableCell><strong>Created</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No tasks found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        tasks.map((task) => (
                          <TableRow key={task.id} hover>
                            <TableCell>{task.title}</TableCell>
                            <TableCell>
                              <Chip label={task.category.replace(/-/g, ' ')} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={task.importance}
                                size="small"
                                sx={{
                                  bgcolor: getImportanceColor(task.importance),
                                  color: 'white',
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell>{getStatusLabel(task.status)}</TableCell>
                            <TableCell>{task.type}</TableCell>
                            <TableCell>{task.visibility}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {task.tags?.map((tag, idx) => (
                                  <Chip key={idx} label={tag} size="small" sx={{ fontSize: '0.7rem' }} />
                                ))}
                              </Stack>
                            </TableCell>
                            <TableCell>{formatTaskDate(task.date_created)}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleTaskView(task)}
                                  color="primary"
                                  title="View details"
                                >
                                  <IconEye size={18} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleTaskEdit(task)}
                                  color="primary"
                                  title="Edit task"
                                >
                                  <IconEdit size={18} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleTaskDelete(task)}
                                  color="error"
                                  title="Delete task"
                                >
                                  <IconTrash size={18} />
                                </IconButton>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {taskPagination.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={taskPagination.totalPages}
                      page={taskFilters.page}
                      onChange={(e, page) => handleTaskFilterChange('page', page)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </DocumentationContainer>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upload Documentation File
          <IconButton
            aria-label="close"
            onClick={handleCloseUploadDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.xlsx,.md,.json,.txt,.pdf,.tsx,.ts,.html,.js"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<IconUpload size={20} />}
                sx={{ mb: 2 }}
              >
                {selectedFile ? selectedFile.name : 'Select File'}
              </Button>
            </label>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, textAlign: 'center' }}>
              Allowed formats: {allowedTypes.join(', ')}
            </Typography>

            {selectedFile && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>File:</strong> {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Size:</strong> {formatFileSize(selectedFile.size)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Type:</strong> {selectedFile.type || 'Unknown'}
                </Typography>
              </Box>
            )}

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Uploading... {Math.round(uploadProgress)}%
                </Typography>
              </Box>
            )}

            {uploadError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploading}
            sx={{
              backgroundColor: '#C8A24B',
              color: '#1a1a1a',
              '&:hover': {
                backgroundColor: '#B8923A',
              },
            }}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Details Drawer */}
      <Drawer
        anchor="right"
        open={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 600 } }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">Task Details</Typography>
            <Stack direction="row" spacing={1}>
              <IconButton
                onClick={() => {
                  if (selectedTask) handleTaskEdit(selectedTask);
                }}
                color="primary"
                title="Edit task"
              >
                <IconEdit size={20} />
              </IconButton>
              <IconButton
                onClick={() => {
                  if (selectedTask) handleTaskDelete(selectedTask);
                }}
                color="error"
                title="Delete task"
              >
                <IconTrash size={20} />
              </IconButton>
              <IconButton onClick={() => setTaskDrawerOpen(false)}>
                <IconX size={20} />
              </IconButton>
            </Stack>
          </Box>

          {selectedTask && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Title
                </Typography>
                <Typography variant="h6">{selectedTask.title}</Typography>
              </Box>

              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Category
                  </Typography>
                  <Chip label={selectedTask.category.replace(/-/g, ' ')} size="small" variant="outlined" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Importance
                  </Typography>
                  <Chip
                    label={selectedTask.importance}
                    size="small"
                    sx={{
                      bgcolor: getImportanceColor(selectedTask.importance),
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Stack>

              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Typography>{getStatusLabel(selectedTask.status)}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Type
                  </Typography>
                  <Typography>{selectedTask.type}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Visibility
                  </Typography>
                  <Typography>{selectedTask.visibility}</Typography>
                </Box>
              </Stack>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Details
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    p: 2,
                    borderRadius: 1,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {selectedTask.details}
                </Typography>
              </Box>

              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Tags
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedTask.tags.map((tag, idx) => (
                      <Chip key={idx} label={tag} size="small" />
                    ))}
                  </Stack>
                </Box>
              )}

              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Attachments
                  </Typography>
                  <Stack spacing={1}>
                    {selectedTask.attachments.map((url, idx) => (
                      <Button
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        startIcon={<IconFile size={16} />}
                      >
                        {url}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              )}

              <Divider />

              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Created
                  </Typography>
                  <Typography variant="body2">{formatTaskDate(selectedTask.date_created)}</Typography>
                </Box>
                {selectedTask.date_completed && (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Completed
                    </Typography>
                    <Typography variant="body2">{formatTaskDate(selectedTask.date_completed)}</Typography>
                  </Box>
                )}
              </Stack>

              {selectedTask.assigned_to && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Assigned To
                  </Typography>
                  <Typography>{selectedTask.assigned_to}</Typography>
                </Box>
              )}

              {selectedTask.notes && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Notes
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      p: 2,
                      borderRadius: 1,
                    }}
                  >
                    {selectedTask.notes}
                  </Typography>
                </Box>
              )}

              {selectedTask.revisions && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Revisions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Array.isArray(selectedTask.revisions) 
                      ? `${selectedTask.revisions.length} revision(s)`
                      : 'No revisions'}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Edit Task Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          if (!saving) {
            setEditDialogOpen(false);
            setEditTask(null);
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Task
          <IconButton
            aria-label="close"
            onClick={() => {
              if (!saving) {
                setEditDialogOpen(false);
                setEditTask(null);
              }
            }}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
            disabled={saving}
          >
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editTask && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Title"
                fullWidth
                required
                value={editTask.title}
                onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                disabled={saving}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth required disabled={saving}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={editTask.category}
                    label="Category"
                    onChange={(e) => setEditTask({ ...editTask, category: e.target.value })}
                  >
                    <MenuItem value="ingestion-digitization">Ingestion & Digitization</MenuItem>
                    <MenuItem value="data-structuring-accuracy">Data Structuring & Accuracy</MenuItem>
                    <MenuItem value="workflow-user-experience">Workflow & User Experience</MenuItem>
                    <MenuItem value="platform-infrastructure">Platform & Infrastructure</MenuItem>
                    <MenuItem value="analytics-intelligence">Analytics & Intelligence</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth required disabled={saving}>
                  <InputLabel>Importance</InputLabel>
                  <Select
                    value={editTask.importance}
                    label="Importance"
                    onChange={(e) => setEditTask({ ...editTask, importance: e.target.value })}
                  >
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth required disabled={saving}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editTask.status}
                    label="Status"
                    onChange={(e) => setEditTask({ ...editTask, status: Number(e.target.value) })}
                  >
                    <MenuItem value={1}>Pending</MenuItem>
                    <MenuItem value={2}>Assigned</MenuItem>
                    <MenuItem value={3}>In Progress</MenuItem>
                    <MenuItem value={4}>Review</MenuItem>
                    <MenuItem value={5}>Testing</MenuItem>
                    <MenuItem value={6}>On Hold</MenuItem>
                    <MenuItem value={7}>Completed</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth required disabled={saving}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={editTask.type}
                    label="Type"
                    onChange={(e) => setEditTask({ ...editTask, type: e.target.value })}
                  >
                    <MenuItem value="documentation">Documentation</MenuItem>
                    <MenuItem value="configuration">Configuration</MenuItem>
                    <MenuItem value="reference">Reference</MenuItem>
                    <MenuItem value="guide">Guide</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth required disabled={saving}>
                  <InputLabel>Visibility</InputLabel>
                  <Select
                    value={editTask.visibility}
                    label="Visibility"
                    onChange={(e) => setEditTask({ ...editTask, visibility: e.target.value })}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="public">Public</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <TextField
                label="Details"
                fullWidth
                required
                multiline
                rows={6}
                value={editTask.details}
                onChange={(e) => setEditTask({ ...editTask, details: e.target.value })}
                disabled={saving}
              />

              <TextField
                label="Tags (comma-separated)"
                fullWidth
                value={editTask.tags?.join(', ') || ''}
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                  setEditTask({ ...editTask, tags });
                }}
                disabled={saving}
                helperText="Enter tags separated by commas (e.g., document-ai, bugfix, feature)"
              />

              <TextField
                label="Assigned To"
                fullWidth
                value={editTask.assigned_to || ''}
                onChange={(e) => setEditTask({ ...editTask, assigned_to: e.target.value || null })}
                disabled={saving}
              />

              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={3}
                value={editTask.notes || ''}
                onChange={(e) => setEditTask({ ...editTask, notes: e.target.value || null })}
                disabled={saving}
              />

              {tasksError && (
                <Alert severity="error" onClose={() => setTasksError(null)}>
                  {tasksError}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setEditTask(null);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveTask}
            variant="contained"
            disabled={saving || !editTask}
            startIcon={saving ? <CircularProgress size={16} /> : <IconCheck size={18} />}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteDialogOpen(false);
            setDeleteTask(null);
          }
        }}
      >
        <DialogTitle>Delete Task</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the task <strong>"{deleteTask?.title}"</strong>?
            <br />
            This action cannot be undone.
          </Typography>
          {tasksError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setTasksError(null)}>
              {tasksError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteTask(null);
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <IconTrash size={18} />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OMSpecDocumentation;

