import React, { useEffect, useState, useCallback } from 'react';
import { ScanLine, Settings as SettingsIcon, RefreshCw, Church, ChevronDown } from 'lucide-react';
import { Box, Typography, Button, Paper, useTheme, useMediaQuery } from '@mui/material';
import UploadZone from '../components/UploadZone';
import JobList from '../components/JobList';
import ConfigPanel from '../components/ConfigPanel';
import OutputViewer from '../components/OutputViewer';
import { fetchChurches } from '../lib/ocrApi';

const OCRStudioPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [selectedChurchId, setSelectedChurchId] = useState<number | undefined>();
  const [churches, setChurches] = useState<Array<{ id: number; name: string }>>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showChurchSelector, setShowChurchSelector] = useState(false);

  // Load available churches
  useEffect(() => {
    const loadChurches = async () => {
      try {
        const churchList = await fetchChurches();
        setChurches(churchList);
        if (churchList.length > 0 && !selectedChurchId) {
          setSelectedChurchId(churchList[0].id);
        }
      } catch (error) {
        console.error('Failed to load churches:', error);
      }
    };

    loadChurches();
  }, [selectedChurchId]);

  const handleUploadSuccess = useCallback(() => {
    setSelectedJobId(undefined);
    setRefreshTrigger(prev => prev + 1);
  }, []);

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
            <UploadZone
              onUploaded={handleUploadSuccess}
              churchId={selectedChurchId}
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
    </Box>
  );
};

export default OCRStudioPage;
