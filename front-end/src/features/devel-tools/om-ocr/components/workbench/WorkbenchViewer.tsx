/**
 * WorkbenchViewer - Image viewer with overlays for OCR workbench
 * Extracted from InspectionPanel for cleaner separation
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Stack,
  Slider,
  TextField,
  InputAdornment,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconZoomIn,
  IconZoomOut,
  IconMaximize,
  IconCopy,
  IconSearch,
} from '@tabler/icons-react';
import FusionOverlay from '../FusionOverlay';
import { getVisionPageSize, parseVisionResponse } from '../../utils/visionParser';
import { useWorkbench } from '../../context/WorkbenchContext';
import type { BBox, VisionResponse } from '../../types/fusion';

interface WorkbenchViewerProps {
  onTokenClick?: (tokenId: string, bbox: BBox, text: string) => void;
  onTokenDoubleClick?: (tokenId: string, bbox: BBox, text: string) => void;
}

const WorkbenchViewer: React.FC<WorkbenchViewerProps> = ({
  onTokenClick,
  onTokenDoubleClick,
}) => {
  const theme = useTheme();
  const workbench = useWorkbench();
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(100);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  });
  
  const jobOcrResult = workbench.state.ocrResult;
  const imageUrl = workbench.state.imageUrl;
  const editMode = workbench.state.bboxEditMode;
  
  // Get Vision page dimensions (safe with null)
  const visionPageSize = useMemo(() => {
    if (!jobOcrResult) return { width: 0, height: 0 };
    return getVisionPageSize(jobOcrResult);
  }, [jobOcrResult]);
  
  // Parse OCR tokens for overlay (safe with null, optimized to prevent memory issues)
  const ocrTokens = useMemo(() => {
    if (!jobOcrResult) return [];
    try {
      // Limit processing to prevent browser crashes on very large OCR results
      const lines = parseVisionResponse(jobOcrResult);
      const tokens: Array<{ id: string; text: string; bbox: BBox; confidence?: number }> = [];
      const MAX_TOKENS = 10000; // Limit to prevent memory issues
      
      for (const line of lines) {
        if (tokens.length >= MAX_TOKENS) {
          console.warn('[WorkbenchViewer] Token limit reached, truncating overlay');
          break;
        }
        if (line.tokens) {
          for (const token of line.tokens) {
            if (tokens.length >= MAX_TOKENS) break;
            if (token.id && token.bbox && token.bbox.w > 0 && token.bbox.h > 0) {
              tokens.push({
                id: token.id,
                text: token.text,
                bbox: token.bbox,
                confidence: token.confidence,
              });
            }
          }
        }
      }
      return tokens;
    } catch (error) {
      console.error('[WorkbenchViewer] Error parsing OCR tokens:', error);
      return [];
    }
  }, [jobOcrResult]);
  
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);
  
  const handleZoomFit = useCallback(() => {
    setZoom(100);
  }, []);
  
  const handleZoomChange = useCallback((event: Event, value: number | number[]) => {
    setZoom(value as number);
  }, []);
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Zoom Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 2,
          p: 1,
        }}
      >
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut}>
            <IconZoomOut size={18} />
          </IconButton>
        </Tooltip>
        <Slider
          value={zoom}
          onChange={handleZoomChange}
          min={25}
          max={300}
          step={5}
          sx={{ width: 100 }}
          size="small"
        />
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
        <TextField
          size="small"
          value={zoom}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 25 && val <= 300) {
              setZoom(val);
            }
          }}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
          sx={{ width: 70 }}
        />
      </Box>
      
      {/* Image Container */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          p: 2,
          ...(editMode && {
            overflow: 'hidden',
            touchAction: 'none',
            userSelect: 'none',
          }),
        }}
      >
        {imageUrl && (
          <Box
            sx={{
              position: 'relative',
              display: 'inline-block',
              overflow: 'hidden',
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl || ''}
              alt={workbench.state.jobMetadata?.filename || 'OCR Image'}
              style={{
                maxWidth: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                pointerEvents: 'auto',
              }}
              onLoad={(e) => {
                const img = e.currentTarget;
                setImageDimensions({
                  width: img.clientWidth,
                  height: img.clientHeight,
                  naturalWidth: img.naturalWidth,
                  naturalHeight: img.naturalHeight,
                });
              }}
              onError={(e) => {
                console.error('[WorkbenchViewer] Failed to load image:', imageUrl);
                console.error('[WorkbenchViewer] Image error:', e);
              }}
            />
            {imageRef.current && (
              <FusionOverlay
                boxes={workbench.state.entryAreas.map((area, idx) => {
                  const entryIdx = workbench.state.entries.findIndex(e => e.id === area.entryId);
                  const isSelected = entryIdx === workbench.state.selectedEntryIndex;
                  return {
                    bbox: area.bbox,
                    label: area.label || `Entry ${idx + 1}`,
                    color: `hsl(${(idx * 60) % 360}, 70%, 50%)`,
                    selected: isSelected,
                    editable: editMode && isSelected,
                    onBboxChange: editMode && isSelected
                      ? (newBbox: BBox) => workbench.updateEntryArea(area.entryId, newBbox)
                      : undefined,
                    onBboxChangeEnd: editMode && isSelected
                      ? () => {
                          // Auto-save bbox changes (can be enhanced later)
                          console.log('[WorkbenchViewer] Bbox change ended for', area.entryId);
                        }
                      : undefined,
                  };
                })}
                imageElement={imageRef.current}
                visionWidth={visionPageSize.width || imageDimensions.naturalWidth || 0}
                visionHeight={visionPageSize.height || imageDimensions.naturalHeight || 0}
                showLabels={true}
                ocrTokens={ocrTokens}
                onTokenClick={onTokenClick}
                onTokenDoubleClick={onTokenDoubleClick}
                editMode={editMode}
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WorkbenchViewer;

