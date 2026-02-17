/**
 * InspectionPanel - Side-by-side image and OCR results viewer
 * Displays selected image with overlay support and tabbed OCR results
 */

import {
    Alert,
    alpha,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    Paper,
    Slider,
    Stack,
    Switch,
    Tab,
    Tabs,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import {
    IconCopy,
    IconEye,
    IconEyeOff,
    IconLayoutColumns,
    IconMaximize,
    IconWand,
    IconX,
    IconZoomIn,
    IconZoomOut
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { lazy, Suspense } from 'react';
import { OcrSelectionItem, useOcrSelection } from '../context/OcrSelectionContext';
import { BBox, VisionResponse } from '../types/fusion';
import type { BoundingBox, JobDetail, TextAnnotation } from '../types/inspection';
import { getImageViewportMetrics } from '../utils/imageViewportMetrics';
import { getVisionPageSize, parseVisionResponse } from '../utils/visionParser';
import FusionOverlay, { OverlayBox } from './FusionOverlay';
import MappingTab from './MappingTab';
import ReviewFinalizeTab from './ReviewFinalizeTab';
import TranscriptionPanel from './TranscriptionPanel';

// Lazy load FusionTab at module level - React.lazy requires module-level declaration
const FusionTabLazy = lazy(() => import('./FusionTab'));

// Re-export types for backward compatibility (components/index.ts still exports these)
export type { BoundingBox, FullTextAnnotation, JobDetail, OCRResult, TextAnnotation } from '../types/inspection';

interface InspectionPanelProps {
  job: JobDetail | null;
  imageUrl: string | null;
  loading?: boolean;
  onMappingTabClick?: () => void;
  churchId?: number;
  initialTab?: number; // Initial tab index to show when component mounts/updates
  onTabChange?: () => void; // Callback when tab is changed programmatically
  bboxEditMode?: boolean; // When true, disable pan/zoom/scroll to allow bbox editing and enable overlay interaction
  onTokenClick?: (tokenId: string, bbox: BBox, text: string) => void; // OCR token click handler
  onTokenDoubleClick?: (tokenId: string, bbox: BBox, text: string) => void; // OCR token double-click handler
  stickyDefaults?: Record<'baptism' | 'marriage' | 'funeral', boolean>; // Sticky defaults from EnhancedOCRUploader
}

// Tab Panel component
const TabPanel: React.FC<{ children: React.ReactNode; value: number; index: number }> = ({
  children,
  value,
  index
}) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    sx={{ height: '100%', overflow: 'auto' }}
  >
    {value === index && children}
  </Box>
);

const InspectionPanel: React.FC<InspectionPanelProps> = ({
  job,
  imageUrl,
  loading = false,
  onMappingTabClick,
  churchId,
  initialTab,
  onTabChange,
  bboxEditMode = false,
  onTokenClick,
  onTokenDoubleClick,
  stickyDefaults = { baptism: false, marriage: false, funeral: false },
}) => {
  const theme = useTheme();
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayGranularity, setOverlayGranularity] = useState<'words' | 'lines'>('words');
  const [overlayOpacity, setOverlayOpacity] = useState(40);
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [copiedText, setCopiedText] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [fusionOverlayBoxes, setFusionOverlayBoxes] = useState<OverlayBox[]>([]); // Always initialized as empty array
  const [showFusionOverlay, setShowFusionOverlay] = useState(true);
  const [fusionDialogOpen, setFusionDialogOpen] = useState(false);
  const [fusionZoom, setFusionZoom] = useState(100);
  const fusionImageRef = useRef<HTMLImageElement | null>(null);
  
  // OCR Selection context
  const { setSelection, addSelection } = useOcrSelection();

  // Handle initialTab prop - switch to specified tab when provided
  useEffect(() => {
    if (initialTab !== undefined && initialTab !== activeTab) {
      console.log('[InspectionPanel] initialTab prop changed, switching to tab', initialTab);
      setActiveTab(initialTab);
      
      // Scroll to tabs and ensure visibility
      requestAnimationFrame(() => {
        const tabsElement = document.querySelector('[role="tablist"]');
        if (tabsElement) {
          tabsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Verify the tab is actually selected
        const targetTabButton = Array.from(document.querySelectorAll('[role="tab"]'))[initialTab];
        if (targetTabButton) {
          const isSelected = targetTabButton.getAttribute('aria-selected') === 'true';
          console.log('[InspectionPanel] Target tab button found, selected:', isSelected);
          if (!isSelected) {
            console.warn('[InspectionPanel] Target tab not selected! Forcing click...');
            (targetTabButton as HTMLElement).click();
          }
        }
        
        // Notify parent that tab has been changed
        if (onTabChange) {
          onTabChange();
        }
      });
    }
  }, [initialTab, activeTab, onTabChange]);

  // Fusion overlay handlers
  const handleHighlightBbox = useCallback((bbox: BBox | null, color?: string) => {
    if (bbox) {
      setFusionOverlayBoxes([{ bbox, color: color || '#4CAF50', emphasized: true }]);
    } else {
      setFusionOverlayBoxes([]);
    }
  }, []);

  const handleHighlightMultiple = useCallback((boxes: OverlayBox[] | undefined) => {
    // Normalize to always be an array
    setFusionOverlayBoxes(Array.isArray(boxes) ? boxes : []);
  }, []);

  // Normalize job properties (handle both snake_case and camelCase)
  const jobFilename = job?.original_filename || job?.originalFilename || job?.filename || '';
  const jobStatus = job?.status || '';
  const jobRecordType = job?.record_type || job?.recordType || 'baptism';
  const jobConfidence = job?.confidence_score || job?.confidenceScore || 0;
  const jobOcrText = job?.ocr_text || job?.ocrText || null;
  const jobOcrResult = job?.ocr_result || job?.ocrResultJson || null;

  // Get text annotations for overlay
  const textAnnotations = jobOcrResult?.textAnnotations || [];
  // Skip first annotation (it's the full text)
  const wordAnnotations = textAnnotations.slice(1);

  // Parse OCR tokens/lines with stable IDs for Fusion overlay
  const ocrTokens = useMemo(() => {
    if (!jobOcrResult) return [];
    const lines = parseVisionResponse(jobOcrResult as VisionResponse);
    const tokens: Array<{ id: string; text: string; bbox: BBox; confidence?: number }> = [];
    lines.forEach((line) => {
      if (line.tokens) {
        line.tokens.forEach((token) => {
          if (token.id && token.bbox.w > 0 && token.bbox.h > 0) {
            tokens.push({
              id: token.id,
              text: token.text,
              bbox: token.bbox,
              confidence: token.confidence,
            });
          }
        });
      }
    });
    return tokens;
  }, [jobOcrResult]);

  // OCR token handlers
  const handleTokenClick = useCallback((tokenId: string, bbox: BBox, text: string) => {
    if (onTokenClick) {
      onTokenClick(tokenId, bbox, text);
    } else {
      console.log('[InspectionPanel] Token clicked:', { tokenId, text, bbox });
    }
  }, [onTokenClick]);

  const handleTokenDoubleClick = useCallback((tokenId: string, bbox: BBox, text: string) => {
    if (onTokenDoubleClick) {
      onTokenDoubleClick(tokenId, bbox, text);
    } else {
      console.log('[InspectionPanel] Token double-clicked:', { tokenId, text, bbox });
      alert(`Double-clicked token: "${text}"`);
    }
  }, [onTokenDoubleClick]);

  // Debug: Check for debug flag (query param or localStorage)
  const showDebugMetrics = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryFlag = urlParams.get('debugMetrics') === 'true';
    const storageFlag = localStorage.getItem('om.ocr.debugMetrics') === 'true';
    return queryFlag || storageFlag;
  }, []);

  // Get image viewport metrics for debug display
  const [debugMetrics, setDebugMetrics] = useState<ReturnType<typeof getImageViewportMetrics> | null>(null);
  useEffect(() => {
    if (!showDebugMetrics || !fusionImageRef.current) return;
    const updateMetrics = () => {
      const metrics = getImageViewportMetrics(fusionImageRef.current);
      setDebugMetrics(metrics);
    };
    updateMetrics();
    const interval = setInterval(updateMetrics, 100);
    return () => clearInterval(interval);
  }, [showDebugMetrics, fusionImageRef.current, fusionZoom]);

  // Handle image load to get dimensions
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.clientWidth,
      height: img.clientHeight,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    });
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleZoomFit = () => setZoom(100);

  // Fusion dialog zoom controls
  const handleFusionZoomIn = () => setFusionZoom(prev => Math.min(prev + 25, 300));
  const handleFusionZoomOut = () => setFusionZoom(prev => Math.max(prev - 25, 25));
  const handleFusionZoomFit = () => setFusionZoom(100);

  // Copy handlers
  const handleCopyText = async () => {
    if (jobOcrText) {
      await navigator.clipboard.writeText(jobOcrText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleCopyJson = async () => {
    if (jobOcrResult) {
      await navigator.clipboard.writeText(JSON.stringify(jobOcrResult, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  // Search highlighting
  const getHighlightedText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === search.toLowerCase() 
        ? <mark key={i} style={{ backgroundColor: theme.palette.warning.light, padding: '0 2px' }}>{part}</mark>
        : part
    );
  };

  // Calculate bounding box position relative to displayed image
  const getBboxStyle = (bbox: BoundingBox | undefined, index: number) => {
    if (!bbox?.vertices || bbox.vertices.length < 4) return null;
    if (!imageDimensions.naturalWidth || !imageDimensions.naturalHeight) return null;

    const scaleX = imageDimensions.width / imageDimensions.naturalWidth;
    const scaleY = imageDimensions.height / imageDimensions.naturalHeight;

    const minX = Math.min(...bbox.vertices.map(v => v.x || 0));
    const minY = Math.min(...bbox.vertices.map(v => v.y || 0));
    const maxX = Math.max(...bbox.vertices.map(v => v.x || 0));
    const maxY = Math.max(...bbox.vertices.map(v => v.y || 0));

    const isHighlighted = highlightedIndex === index;

    return {
      position: 'absolute' as const,
      left: minX * scaleX,
      top: minY * scaleY,
      width: (maxX - minX) * scaleX,
      height: (maxY - minY) * scaleY,
      border: `1px solid ${isHighlighted ? theme.palette.error.main : theme.palette.primary.main}`,
      backgroundColor: alpha(
        isHighlighted ? theme.palette.error.main : theme.palette.primary.main,
        overlayOpacity / 100
      ),
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      zIndex: isHighlighted ? 10 : 1,
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.5),
        borderWidth: 2
      }
    };
  };

  // Handle clicking on overlay box
  const handleBoxClick = (annotation: TextAnnotation, index: number) => {
    setHighlightedIndex(index);
    setActiveTab(0); // Switch to text tab
    
    // Write selection to context if jobId is available
    if (job?.id && jobOcrResult) {
      const jobId = String(job.id);
      const lines = parseVisionResponse(jobOcrResult as VisionResponse);
      
      // Find the token/line that matches this annotation
      // Match by text content and approximate position
      const annotationText = annotation.description?.trim() || '';
      const annotationBbox = annotation.boundingPoly?.vertices 
        ? {
            x: Math.min(...annotation.boundingPoly.vertices.map(v => v.x || 0)),
            y: Math.min(...annotation.boundingPoly.vertices.map(v => v.y || 0)),
            w: Math.max(...annotation.boundingPoly.vertices.map(v => v.x || 0)) - Math.min(...annotation.boundingPoly.vertices.map(v => v.x || 0)),
            h: Math.max(...annotation.boundingPoly.vertices.map(v => v.y || 0)) - Math.min(...annotation.boundingPoly.vertices.map(v => v.y || 0)),
          }
        : null;
      
      if (annotationBbox) {
        // Find matching token or line
        for (const line of lines) {
          if (line.tokens) {
            for (const token of line.tokens) {
              if (token.id && token.text.trim() === annotationText && 
                  Math.abs(token.bbox.x - annotationBbox.x) < 50 &&
                  Math.abs(token.bbox.y - annotationBbox.y) < 50) {
                // Note: entryId and fieldKey should be set when FusionTab is active and an entry is selected
                // For now, we create the selection without entryId - it should be attached later in FusionTab
                const selectionItem: OcrSelectionItem = {
                  type: 'token',
                  id: token.id,
                  text: token.text,
                  bbox: token.bbox, // Already in image pixel coordinates from visionParser
                  confidence: token.confidence,
                  // entryId and fieldKey will be set when this selection is used in FusionTab
                  // TODO: Pass activeEntryId from FusionTab to InspectionPanel to attach here
                };
                addSelection(jobId, selectionItem);
                break;
              }
            }
          }
        }
      }
    }
    
    // Try to scroll to the text in the text panel
    const textEl = document.getElementById(`text-segment-${index}`);
    if (textEl) {
      textEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography color="text.secondary">Loading job details...</Typography>
        </Stack>
      </Paper>
    );
  }

  if (!job) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 4
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <IconLayoutColumns size={48} color={theme.palette.grey[400]} />
          <Typography variant="h6" color="text.secondary">
            No Image Selected
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Click on a completed job from the queue<br />to view its OCR results here.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <>
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {jobFilename}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip
                size="small"
                label={jobStatus}
                color={jobStatus === 'completed' ? 'success' : 'default'}
              />
              <Chip
                size="small"
                label={jobRecordType}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${Math.round(Number(jobConfidence) * 100)}% conf`}
                variant="outlined"
              />
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Main Content - Split View */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Image Preview */}
        <Box
          sx={{
            width: '50%',
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Image Controls */}
          <Box
            sx={{
              p: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Zoom Out">
                <IconButton size="small" onClick={handleZoomOut}>
                  <IconZoomOut size={18} />
                </IconButton>
              </Tooltip>
              <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
                {zoom}%
              </Typography>
              <Tooltip title="Zoom In">
                <IconButton size="small" onClick={handleZoomIn}>
                  <IconZoomIn size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Fit to View">
                <IconButton size="small" onClick={handleZoomFit}>
                  <IconMaximize size={18} />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={showOverlay}
                    onChange={(e) => setShowOverlay(e.target.checked)}
                  />
                }
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {showOverlay ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                    <Typography variant="caption">Overlay</Typography>
                  </Stack>
                }
                sx={{ m: 0 }}
              />
              {showOverlay && (
                <Box sx={{ width: 80 }}>
                  <Slider
                    size="small"
                    value={overlayOpacity}
                    onChange={(_, v) => setOverlayOpacity(v as number)}
                    min={10}
                    max={80}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v}%`}
                  />
                </Box>
              )}
            </Stack>
          </Box>

          {/* Image Container */}
          <Box
            ref={imageContainerRef}
            sx={{
              flex: 1,
              overflow: 'auto',
              bgcolor: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              {imageUrl && (
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={jobFilename}
                  onLoad={handleImageLoad}
                  style={{
                    maxWidth: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left'
                  }}
                />
              )}
              
              {/* Bounding Box Overlay — wrapped in a scaled container matching the image transform */}
              {showOverlay && imageUrl && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: imageDimensions.width || '100%',
                    height: imageDimensions.height || '100%',
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                >
                  {wordAnnotations.map((annotation, index) => {
                    const style = getBboxStyle(annotation.boundingPoly, index);
                    if (!style) return null;
                    
                    return (
                      <Tooltip
                        key={index}
                        title={
                          <Box>
                            <Typography variant="body2">{annotation.description}</Typography>
                            {annotation.confidence !== undefined && (
                              <Typography variant="caption">
                                Confidence: {Math.round(annotation.confidence * 100)}%
                              </Typography>
                            )}
                          </Box>
                        }
                        arrow
                      >
                        <Box
                          sx={{ ...style, pointerEvents: 'auto' }}
                          onClick={() => handleBoxClick(annotation, index)}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Right: OCR Results Tabs */}
        <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => {
              setActiveTab(v);
              if (v === 2 && onMappingTabClick) {
                onMappingTabClick();
              }
            }}
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab label="Transcription" />
            <Tab label="Structured" />
            <Tab label="Mapping" />
            <Tab label="Fusion" icon={<IconWand size={16} />} iconPosition="start" />
            <Tab label="Review & Finalize" />
          </Tabs>

          {/* Transcription Tab (default) */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Use TranscriptionPanel component for consistent display */}
              <TranscriptionPanel
                ocrText={jobOcrText}
                loading={loading}
                onCopy={() => {
                  handleCopyText();
                  // Toast handled by TranscriptionPanel or parent
                }}
              />
            </Box>
          </TabPanel>

          {/* Structured Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconCopy size={16} />}
                  onClick={handleCopyJson}
                >
                  {copiedJson ? 'Copied!' : 'Copy JSON'}
                </Button>
              </Stack>

              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  bgcolor: '#1e1e1e',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  color: '#d4d4d4'
                }}
              >
                {jobOcrResult ? (
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(jobOcrResult, null, 2)}
                  </pre>
                ) : (
                  <Typography color="grey.500" fontStyle="italic">
                    No structured OCR data available
                  </Typography>
                )}
              </Paper>
            </Box>
          </TabPanel>

          {/* Mapping Tab */}
          <TabPanel value={activeTab} index={2}>
            {job && churchId ? (
              <MappingTab
                jobId={job.id?.toString() || '0'}
                churchId={churchId}
                recordType={(jobRecordType as 'baptism' | 'marriage' | 'funeral') || 'baptism'}
                ocrText={jobOcrText}
                ocrResult={jobOcrResult as any}
                onSendToReview={() => {
                  console.log('[InspectionPanel] onSendToReview called, switching to Review tab (index 4)');
                  console.log('[InspectionPanel] Current activeTab:', activeTab);
                  
                  // Force tab switch using functional update to ensure it happens
                  setActiveTab((prev) => {
                    console.log('[InspectionPanel] Setting activeTab from', prev, 'to 4');
                    return 4;
                  });
                  
                  // Use requestAnimationFrame to ensure DOM update happens
                  requestAnimationFrame(() => {
                    // Scroll to tabs area to ensure visibility
                    const tabsElement = document.querySelector('[role="tablist"]');
                    if (tabsElement) {
                      tabsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      console.log('[InspectionPanel] Scrolled to tabs');
                    }
                    
                    // Verify the tab is actually selected
                    const reviewTabButton = Array.from(document.querySelectorAll('[role="tab"]'))[4];
                    if (reviewTabButton) {
                      const isSelected = reviewTabButton.getAttribute('aria-selected') === 'true';
                      console.log('[InspectionPanel] Review tab button found, selected:', isSelected);
                      if (!isSelected) {
                        console.warn('[InspectionPanel] Review tab not selected! Forcing click...');
                        (reviewTabButton as HTMLElement).click();
                      }
                    }
                  });
                  
                  console.log('[InspectionPanel] activeTab update queued');
                }}
              />
            ) : (
              <Box sx={{ p: 2 }}>
                <Alert severity="info">
                  Select a processed image to map fields.
                </Alert>
              </Box>
            )}
          </TabPanel>

          {/* Fusion Tab - Opens in Dialog */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              {job && churchId ? (
                <>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Open the Fusion workflow in a full-screen window for the best experience.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<IconWand size={18} />}
                    onClick={() => setFusionDialogOpen(true)}
                    size="large"
                  >
                    Open Fusion Workflow
                  </Button>
                </>
              ) : (
                <Alert severity="info">
                  Select a processed image to use Fusion workflow.
                </Alert>
              )}
            </Box>
          </TabPanel>

          {/* Review & Finalize Tab */}
          <TabPanel value={activeTab} index={4}>
            {job && churchId ? (
              <ReviewFinalizeTab
                jobId={parseInt(job.id?.toString() || '0')}
                churchId={churchId}
                activeTab={activeTab}
                onEditEntry={(entryIndex) => {
                  // Switch to Fusion tab and open dialog
                  setActiveTab(3);
                  setFusionDialogOpen(true);
                }}
              />
            ) : (
              <Box sx={{ p: 2 }}>
                <Alert severity="info">
                  Select a processed image to review and finalize.
                </Alert>
              </Box>
            )}
          </TabPanel>
        </Box>
      </Box>
    </Paper>

    {/* Fusion Dialog - Full Screen */}
    <Dialog
      open={fusionDialogOpen}
      onClose={() => setFusionDialogOpen(false)}
      maxWidth={false}
      fullScreen
      PaperProps={{
        sx: { bgcolor: 'background.default' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1.5,
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconWand size={24} />
          <Typography variant="h6">
            Fusion Workflow: {jobFilename}
          </Typography>
          <Chip size="small" label={jobRecordType} color="primary" />
        </Stack>
        <IconButton onClick={() => setFusionDialogOpen(false)}>
          <IconX size={24} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', height: 'calc(100vh - 64px)' }}>
        {/* Left: Image with Overlay */}
        <Box 
          sx={{
            width: '50%',
            height: '100%', 
            overflow: 'auto', 
            bgcolor: 'background.default',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Zoom Controls */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 2,
              p: 0.5,
            }}
          >
            <Tooltip title="Zoom Out">
              <IconButton size="small" onClick={handleFusionZoomOut}>
                <IconZoomOut size={18} />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center', px: 1 }}>
              {fusionZoom}%
            </Typography>
            <Tooltip title="Zoom In">
              <IconButton size="small" onClick={handleFusionZoomIn}>
                <IconZoomIn size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Fit to View">
              <IconButton size="small" onClick={handleFusionZoomFit}>
                <IconMaximize size={18} />
              </IconButton>
            </Tooltip>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              p: 2,
              // Disable scrolling when editing bboxes
              ...(bboxEditMode && {
                overflow: 'hidden',
                touchAction: 'none',
                userSelect: 'none',
              }),
            }}
            onWheel={(e) => {
              // Prevent zoom when editing bboxes
              if (bboxEditMode) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onPointerDown={(e) => {
              // Allow pointer events to pass through to overlay when editing
              if (bboxEditMode) {
                // Don't prevent default - let EditableBBox handle it
                // But stop propagation to prevent container scroll
                if (e.target === e.currentTarget) {
                  e.preventDefault();
                }
              }
            }}
            onScroll={(e) => {
              // Prevent scroll when editing bboxes
              if (bboxEditMode) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {imageUrl && (
              <Box 
                sx={{ 
                  position: 'relative', 
                  display: 'inline-block',
                  // Ensure overlay is scoped to this container only (clip overlay to image viewport)
                  overflow: 'hidden',
                }}
              >
                <img
                  ref={fusionImageRef}
                  src={imageUrl}
                  alt={jobFilename}
                  style={{ 
                    maxWidth: '100%', 
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                    transform: `scale(${fusionZoom / 100})`,
                    transformOrigin: 'top left',
                    // Image should always allow pointer events for text selection when not editing
                    pointerEvents: 'auto',
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageDimensions({
                      width: img.clientWidth,
                      height: img.clientHeight,
                      naturalWidth: img.naturalWidth,
                      naturalHeight: img.naturalHeight
                    });
                  }}
                />
              {showFusionOverlay && fusionImageRef.current && (() => {
                // Get Vision page dimensions from Vision response (not image natural dimensions)
                // Vision API coordinates are in Vision page space, which may differ from image dimensions
                const visionPageSize = getVisionPageSize(jobOcrResult as any);
                const visionWidth = visionPageSize.width || imageDimensions.naturalWidth || 0;
                const visionHeight = visionPageSize.height || imageDimensions.naturalHeight || 0;
                
                return (
                  <FusionOverlay
                    boxes={fusionOverlayBoxes}
                    imageElement={fusionImageRef.current}
                    visionWidth={visionWidth}
                    visionHeight={visionHeight}
                    showLabels={true}
                    ocrTokens={ocrTokens || []}
                    onTokenClick={handleTokenClick}
                    onTokenDoubleClick={handleTokenDoubleClick}
                    editMode={bboxEditMode || false} // Pass edit mode to overlay
                  />
                );
              })()}

              {/* Debug Metrics Overlay */}
              {showDebugMetrics && debugMetrics && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    zIndex: 1000,
                    pointerEvents: 'none',
                  }}
                >
                  <div>scaleX: {debugMetrics.scaleX.toFixed(4)}</div>
                  <div>scaleY: {debugMetrics.scaleY.toFixed(4)}</div>
                  <div>img rect: ({Math.round(debugMetrics.left)}, {Math.round(debugMetrics.top)}, {Math.round(debugMetrics.width)}×{Math.round(debugMetrics.height)})</div>
                  <div>natural: {debugMetrics.naturalWidth}×{debugMetrics.naturalHeight}</div>
                  <div>zoom: {fusionZoom}%</div>
                </Box>
              )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Right: Fusion Tab */}
        <Box sx={{ width: '50%', height: '100%', overflow: 'auto', borderLeft: '1px solid', borderColor: 'divider' }}>
          {job && churchId && (
            <Suspense fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            }>
              <FusionTabLazy
                jobId={parseInt(job.id?.toString() || '0')}
                churchId={churchId}
                ocrText={jobOcrText}
                ocrResult={jobOcrResult as VisionResponse | null}
                recordType={(jobRecordType as 'baptism' | 'marriage' | 'funeral') || 'baptism'}
                imageUrl={imageUrl}
                onHighlightBbox={handleHighlightBbox}
                onHighlightMultiple={handleHighlightMultiple}
                onSendToReview={() => {
                  // Close the Fusion dialog and switch to Review & Finalize tab
                  setFusionDialogOpen(false);
                  setActiveTab(4); // Review & Finalize tab
                }}
                onBboxEditModeChange={(enabled) => {
                  // bboxEditMode is passed as prop, no need to set state here
                  // The prop will be updated by FusionTab's state
                }}
                onTokenClick={handleTokenClick}
                onTokenDoubleClick={handleTokenDoubleClick}
              />
            </Suspense>
          )}
        </Box>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default InspectionPanel;

