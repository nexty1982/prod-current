import React, { useEffect, useState, useCallback } from 'react';
import { ScanLine, Settings as SettingsIcon, RefreshCw, Church, ChevronDown } from 'lucide-react';
import { Box, Typography, Button, Paper, useTheme, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import UploadZone from '../components/UploadZone';
import JobList from '../components/JobList';
import ConfigPanel from '../components/ConfigPanel';
import OutputViewer from '../components/OutputViewer';
import { fetchChurches } from '../lib/ocrApi';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/shared/lib/axiosInstance';

const OCRStudioPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isSuperAdmin, user } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [selectedChurchId, setSelectedChurchId] = useState<number | undefined>();
  const [churches, setChurches] = useState<Array<{ id: number; name: string }>>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showChurchSelector, setShowChurchSelector] = useState(false);
  const [showChurchDialog, setShowChurchDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  // Resolve churchId in priority order: URL query > user.church_id > API fetch
  useEffect(() => {
    const resolveChurchId = async () => {
      // Priority 1: Check URL query string
      const urlParams = new URLSearchParams(window.location.search);
      const queryChurchId = urlParams.get('church_id');
      if (queryChurchId) {
        const parsedId = parseInt(queryChurchId, 10);
        if (!isNaN(parsedId)) {
          console.log('[OCR Studio] Resolved churchId from URL query:', parsedId);
          setSelectedChurchId(parsedId);
          return;
        }
      }

      // Priority 2: Check user.church_id from auth context
      if (user?.church_id) {
        console.log('[OCR Studio] Resolved churchId from user.church_id:', user.church_id);
        setSelectedChurchId(user.church_id);
        return;
      }

      // Priority 3: Fallback to API fetch /api/auth/check or /api/users/me
      if (user && !isSuperAdmin()) {
        try {
          // Try /api/auth/check first (most common endpoint)
          const { data } = await apiClient.get('/api/auth/check');
          if (data?.user?.church_id) {
            console.log('[OCR Studio] Resolved churchId from /api/auth/check:', data.user.church_id);
            setSelectedChurchId(data.user.church_id);
            return;
          }
        } catch (error) {
          console.warn('[OCR Studio] Failed to fetch churchId from /api/auth/check, trying /api/users/me');
          try {
            // Fallback to /api/users/me
            const { data } = await apiClient.get('/api/users/me');
            if (data?.church_id) {
              console.log('[OCR Studio] Resolved churchId from /api/users/me:', data.church_id);
              setSelectedChurchId(data.church_id);
              return;
            }
          } catch (err) {
            console.warn('[OCR Studio] Could not resolve churchId from API endpoints');
          }
        }
      }

      // If still no churchId and not superadmin, load churches and auto-select first
      if (!selectedChurchId && !isSuperAdmin()) {
        const loadChurches = async () => {
          try {
            const churchList = await fetchChurches();
            setChurches(churchList);
            if (churchList.length > 0) {
              console.log('[OCR Studio] Auto-selecting first church:', churchList[0].id);
              setSelectedChurchId(churchList[0].id);
            }
          } catch (error) {
            console.error('Failed to load churches:', error);
          }
        };
        loadChurches();
      }
    };

    // Only resolve if selectedChurchId is not already set
    if (!selectedChurchId) {
      resolveChurchId();
    } else {
      console.log('[OCR Studio] Using existing selectedChurchId:', selectedChurchId);
    }
  }, [user, isSuperAdmin, selectedChurchId]); // Include selectedChurchId to prevent unnecessary re-runs

  // Load available churches (separate effect for church list)
  useEffect(() => {
    const loadChurches = async () => {
      try {
        const churchList = await fetchChurches();
        setChurches(churchList);
      } catch (error) {
        console.error('Failed to load churches:', error);
      }
    };

    loadChurches();
  }, []); // Only run once on mount

  const handleUploadSuccess = useCallback((uploadedChurchId?: number) => {
    setSelectedJobId(undefined);
    // If upload was successful and we have a churchId, ensure it's set
    if (uploadedChurchId && !selectedChurchId) {
      setSelectedChurchId(uploadedChurchId);
    }
    setRefreshTrigger(prev => prev + 1);
    setPendingFiles(null);
    setShowChurchDialog(false);
  }, [selectedChurchId]);

  const handleUploadRequest = useCallback((files: File[]) => {
    // If superadmin and no church selected, show dialog to select church
    if (isSuperAdmin() && !selectedChurchId) {
      setPendingFiles(files);
      setShowChurchDialog(true);
      return;
    }
    // Otherwise, proceed with upload (UploadZone will handle it)
  }, [isSuperAdmin, selectedChurchId]);

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleChurchSelected = useCallback(async (churchId: number) => {
    setSelectedChurchId(churchId);
    setShowChurchDialog(false);
    setUploadError(null);
    
    // Trigger upload after church is selected
    if (pendingFiles && pendingFiles.length > 0) {
      try {
        const { uploadFiles } = await import('../lib/ocrApi');
        const jobs = await uploadFiles(pendingFiles, churchId);
        if (jobs && jobs.length > 0) {
          handleUploadSuccess();
        } else {
          setUploadError('Upload completed but no jobs were created. Please check server logs.');
        }
      } catch (err: any) {
        console.error('Upload failed after church selection:', err);
        setUploadError(err.message || 'Failed to upload files. Please try again.');
      } finally {
        setPendingFiles(null);
      }
    }
  }, [pendingFiles, handleUploadSuccess]);

  const handleRefreshJobs = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const selectedChurch = churches.find(c => c.id === selectedChurchId);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: 'primary.light',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main'
                  }}
                >
                  <ScanLine size={24} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="text.primary">
                    OCR Studio
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Optical Character Recognition for Church Documents
                  </Typography>
                </Box>
              </Box>

              {/* Church Selector */}
              {churches.length > 0 && (
                <Box sx={{ position: 'relative' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowChurchSelector(!showChurchSelector)}
                    startIcon={<Church size={16} />}
                    endIcon={<ChevronDown size={16} />}
                    sx={{ textTransform: 'none' }}
                  >
                    {selectedChurch?.name || 'Select Church'}
                  </Button>

                  {showChurchSelector && (
                    <>
                      <Paper
                        elevation={8}
                        sx={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          mt: 1,
                          width: 256,
                          zIndex: 10,
                          overflow: 'hidden'
                        }}
                      >
                        <Box sx={{ p: 1 }}>
                          <Typography variant="caption" fontWeight="medium" color="text.secondary" sx={{ px: 1.5, py: 1, display: 'block' }}>
                            Select Church Context
                          </Typography>
                          <Button
                            fullWidth
                            onClick={() => {
                              setSelectedChurchId(undefined);
                              setShowChurchSelector(false);
                            }}
                            sx={{
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              bgcolor: !selectedChurchId ? 'primary.light' : 'transparent',
                              color: !selectedChurchId ? 'primary.main' : 'text.primary',
                              '&:hover': { bgcolor: !selectedChurchId ? 'primary.light' : 'action.hover' }
                            }}
                          >
                            All Churches
                          </Button>
                          {churches.map((church) => (
                            <Button
                              key={church.id}
                              fullWidth
                              onClick={() => {
                                setSelectedChurchId(church.id);
                                setShowChurchSelector(false);
                              }}
                              sx={{
                                justifyContent: 'flex-start',
                                textTransform: 'none',
                                bgcolor: selectedChurchId === church.id ? 'primary.light' : 'transparent',
                                color: selectedChurchId === church.id ? 'primary.main' : 'text.primary',
                                '&:hover': { bgcolor: selectedChurchId === church.id ? 'primary.light' : 'action.hover' }
                              }}
                            >
                              {church.name}
                            </Button>
                          ))}
                        </Box>
                      </Paper>
                      <Box
                        sx={{
                          position: 'fixed',
                          inset: 0,
                          zIndex: 5
                        }}
                        onClick={() => setShowChurchSelector(false)}
                      />
                    </>
                  )}
                </Box>
              )}
            </Box>

            {/* Header Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshCw size={16} />}
                onClick={handleRefreshJobs}
                size="small"
              >
                Refresh
              </Button>

              <ConfigPanel
                trigger={
                  <Button
                    variant="contained"
                    startIcon={<SettingsIcon size={16} />}
                    sx={{ textTransform: 'none' }}
                  >
                    Settings
                  </Button>
                }
                churchId={selectedChurchId}
              />
            </Box>
          </Box>

          {/* Stats Bar */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
              <Typography variant="caption" color="text.secondary">
                Ready for Processing
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
              <Typography variant="caption" color="text.secondary">
                Multi-language Support
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.main' }} />
              <Typography variant="caption" color="text.secondary">
                Field Extraction
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, py: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '5fr 7fr' }, gap: 3 }}>
          {/* Left Panel - Upload & Jobs */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Upload Zone */}
            {uploadError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
                {uploadError}
              </Alert>
            )}
            <UploadZone
              onUploaded={(jobIds) => {
                // Pass selectedChurchId to handleUploadSuccess to ensure it's set
                handleUploadSuccess(selectedChurchId);
              }}
              churchId={selectedChurchId}
              onUploadRequest={handleUploadRequest}
              isSuperAdmin={isSuperAdmin()}
            />

            {/* Recent Jobs */}
            <JobList
              onSelect={setSelectedJobId}
              selectedJobId={selectedJobId}
              churchId={selectedChurchId}
              refreshTrigger={refreshTrigger}
            />
          </Box>

          {/* Right Panel - Results */}
          <Box>
            <OutputViewer jobId={selectedJobId} />
          </Box>
        </Box>
      </Box>

      {/* Church Selection Dialog for Superadmins */}
      <Dialog
        open={showChurchDialog}
        onClose={() => {
          setShowChurchDialog(false);
          setPendingFiles(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Select Church for OCR Processing
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            As a superadmin, you need to select which church these documents belong to before uploading.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please select a church from the list below:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflowY: 'auto' }}>
            {churches.map((church) => (
              <Button
                key={church.id}
                fullWidth
                variant={selectedChurchId === church.id ? 'contained' : 'outlined'}
                onClick={() => handleChurchSelected(church.id)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  py: 1.5,
                }}
              >
                <Church size={18} style={{ marginRight: 8 }} />
                {church.name}
              </Button>
            ))}
            {churches.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No churches available. Please contact an administrator.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowChurchDialog(false);
              setPendingFiles(null);
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OCRStudioPage;

