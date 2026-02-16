/**
 * ColumnBoundaryEditor — Visual column boundary editor for layout templates.
 *
 * Renders a job's scanned image with draggable vertical lines for column
 * boundaries and a draggable horizontal line for the header Y threshold.
 * All positions are stored as fractions (0..1) of image dimensions.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconPlus,
  IconTrash,
  IconZoomIn,
  IconZoomOut,
  IconMaximize,
} from '@tabler/icons-react';

export interface ColumnBand {
  /** Fractional x start (0..1) */
  start: number;
  /** Fractional x end (0..1) */
  end: number;
}

interface ColumnBoundaryEditorProps {
  /** URL of the reference image to display */
  imageUrl: string;
  /** Current column bands — derived from boundary positions */
  columnBands: ColumnBand[];
  /** Header Y threshold as fraction (0..1) */
  headerY: number;
  /** Called when column bands change */
  onBandsChange: (bands: ColumnBand[]) => void;
  /** Called when header Y changes */
  onHeaderYChange: (y: number) => void;
}

/** Convert boundary positions (sorted X fractions) to column bands */
function boundariesToBands(boundaries: number[]): ColumnBand[] {
  const sorted = [...boundaries].sort((a, b) => a - b);
  const bands: ColumnBand[] = [];
  let prev = 0;
  for (const boundary of sorted) {
    if (boundary - prev > 0.005) {
      bands.push({ start: prev, end: boundary });
    }
    prev = boundary;
  }
  if (1 - prev > 0.005) {
    bands.push({ start: prev, end: 1 });
  }
  return bands;
}

/** Convert column bands back to boundary positions (inner edges) */
function bandsToPositions(bands: ColumnBand[]): number[] {
  if (bands.length <= 1) return [];
  const positions: number[] = [];
  for (let i = 0; i < bands.length - 1; i++) {
    positions.push(bands[i].end);
  }
  return positions;
}

const COLORS = [
  '#4fc3f7', '#81c784', '#ffb74d', '#e57373',
  '#ba68c8', '#4dd0e1', '#aed581', '#ff8a65',
  '#9575cd', '#f06292',
];

const ColumnBoundaryEditor: React.FC<ColumnBoundaryEditorProps> = ({
  imageUrl,
  columnBands,
  headerY,
  onBandsChange,
  onHeaderYChange,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(100);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<{
    type: 'boundary' | 'headerY';
    index?: number;
  } | null>(null);

  // Boundary positions (inner edges between columns)
  const [positions, setPositions] = useState<number[]>(() => bandsToPositions(columnBands));

  // Sync positions when columnBands prop changes externally
  useEffect(() => {
    setPositions(bandsToPositions(columnBands));
  }, [columnBands]);

  const scaledWidth = imgSize.width * (zoom / 100);
  const scaledHeight = imgSize.height * (zoom / 100);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  // Emit bands when positions change (after drag end)
  const emitBands = useCallback(
    (pos: number[]) => {
      const bands = boundariesToBands(pos);
      onBandsChange(bands);
    },
    [onBandsChange],
  );

  // Add a new boundary at the midpoint of the widest band
  const handleAddBoundary = useCallback(() => {
    const bands = boundariesToBands(positions);
    if (bands.length === 0) {
      setPositions([0.5]);
      emitBands([0.5]);
      return;
    }
    // Find widest band
    let widestIdx = 0;
    let widestWidth = 0;
    for (let i = 0; i < bands.length; i++) {
      const w = bands[i].end - bands[i].start;
      if (w > widestWidth) {
        widestWidth = w;
        widestIdx = i;
      }
    }
    const mid = (bands[widestIdx].start + bands[widestIdx].end) / 2;
    const newPos = [...positions, mid].sort((a, b) => a - b);
    setPositions(newPos);
    emitBands(newPos);
  }, [positions, emitBands]);

  // Remove a boundary by index
  const handleRemoveBoundary = useCallback(
    (idx: number) => {
      const newPos = positions.filter((_, i) => i !== idx);
      setPositions(newPos);
      emitBands(newPos);
    },
    [positions, emitBands],
  );

  // Mouse handlers for dragging
  const handleMouseDown = useCallback(
    (type: 'boundary' | 'headerY', index?: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging({ type, index });
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (dragging.type === 'boundary' && dragging.index !== undefined) {
        const xFrac = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / scaledWidth));
        setPositions((prev) => {
          const newPos = [...prev];
          newPos[dragging.index!] = xFrac;
          return newPos;
        });
      } else if (dragging.type === 'headerY') {
        const yFrac = Math.max(0, Math.min(0.5, (e.clientY - rect.top) / scaledHeight));
        onHeaderYChange(Math.round(yFrac * 1000) / 1000);
      }
    },
    [dragging, scaledWidth, scaledHeight, onHeaderYChange],
  );

  const handleMouseUp = useCallback(() => {
    if (dragging?.type === 'boundary') {
      // Sort and emit
      const sorted = [...positions].sort((a, b) => a - b);
      setPositions(sorted);
      emitBands(sorted);
    }
    setDragging(null);
  }, [dragging, positions, emitBands]);

  // Compute display bands for coloring
  const displayBands = useMemo(() => boundariesToBands(positions), [positions]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Stack direction="row" spacing={1} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }} alignItems="center">
        <Tooltip title="Add Column Boundary">
          <Button size="small" startIcon={<IconPlus size={16} />} onClick={handleAddBoundary} variant="outlined">
            Add Column
          </Button>
        </Tooltip>
        <Chip
          label={`${displayBands.length} columns`}
          size="small"
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`Header Y: ${(headerY * 100).toFixed(1)}%`}
          size="small"
          variant="outlined"
        />
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={() => setZoom((z) => Math.max(25, z - 25))}>
          <IconZoomOut size={18} />
        </IconButton>
        <Slider
          value={zoom}
          onChange={(_, v) => setZoom(v as number)}
          min={25}
          max={300}
          step={5}
          sx={{ width: 80 }}
          size="small"
        />
        <IconButton size="small" onClick={() => setZoom((z) => Math.min(300, z + 25))}>
          <IconZoomIn size={18} />
        </IconButton>
        <IconButton size="small" onClick={() => setZoom(100)}>
          <IconMaximize size={18} />
        </IconButton>
        <Typography variant="caption" sx={{ minWidth: 40 }}>
          {zoom}%
        </Typography>
      </Stack>

      {/* Image + overlays */}
      <Box
        sx={{ flex: 1, overflow: 'auto', position: 'relative' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Box
          ref={containerRef}
          sx={{
            position: 'relative',
            display: 'inline-block',
            userSelect: 'none',
          }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Layout reference"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onLoad={handleImageLoad}
            style={{
              display: 'block',
              width: scaledWidth || 'auto',
              height: scaledHeight || 'auto',
              maxWidth: 'none',
              pointerEvents: 'none',
            }}
          />

          {imgSize.width > 0 && (
            <>
              {/* Column band color fills */}
              {displayBands.map((band, i) => (
                <Box
                  key={`band-${i}`}
                  sx={{
                    position: 'absolute',
                    left: band.start * scaledWidth,
                    top: 0,
                    width: (band.end - band.start) * scaledWidth,
                    height: scaledHeight,
                    bgcolor: alpha(COLORS[i % COLORS.length], 0.08),
                    pointerEvents: 'none',
                    borderRight: i < displayBands.length - 1 ? 'none' : undefined,
                  }}
                >
                  {/* Column number label */}
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      top: Math.max(4, headerY * scaledHeight + 4),
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: alpha(COLORS[i % COLORS.length], 0.85),
                      color: '#fff',
                      px: 1,
                      py: 0.25,
                      borderRadius: 0.5,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Col {i + 1}
                  </Typography>
                </Box>
              ))}

              {/* Draggable vertical boundary lines */}
              {positions.map((pos, i) => (
                <Box
                  key={`line-${i}`}
                  onMouseDown={handleMouseDown('boundary', i)}
                  sx={{
                    position: 'absolute',
                    left: pos * scaledWidth - 2,
                    top: 0,
                    width: 4,
                    height: scaledHeight,
                    cursor: 'col-resize',
                    zIndex: 5,
                    '&:hover': {
                      '& .line-visual': {
                        bgcolor: theme.palette.primary.main,
                        width: 3,
                      },
                    },
                  }}
                >
                  <Box
                    className="line-visual"
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: 0,
                      width: dragging?.type === 'boundary' && dragging.index === i ? 3 : 2,
                      height: '100%',
                      bgcolor:
                        dragging?.type === 'boundary' && dragging.index === i
                          ? theme.palette.primary.main
                          : theme.palette.warning.main,
                      opacity: 0.8,
                    }}
                  />
                  {/* Delete handle at top */}
                  <Tooltip title={`Remove boundary (${(pos * 100).toFixed(1)}%)`}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBoundary(i);
                      }}
                      sx={{
                        position: 'absolute',
                        top: -2,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: alpha(theme.palette.error.main, 0.9),
                        color: '#fff',
                        width: 18,
                        height: 18,
                        zIndex: 6,
                        '&:hover': { bgcolor: theme.palette.error.main },
                      }}
                    >
                      <IconTrash size={12} />
                    </IconButton>
                  </Tooltip>
                  {/* Position label */}
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      bottom: 4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: alpha(theme.palette.warning.main, 0.85),
                      color: '#fff',
                      px: 0.5,
                      borderRadius: 0.5,
                      fontSize: '0.6rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {(pos * 100).toFixed(1)}%
                  </Typography>
                </Box>
              ))}

              {/* Draggable horizontal header Y line */}
              <Box
                onMouseDown={handleMouseDown('headerY')}
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: headerY * scaledHeight - 2,
                  width: scaledWidth,
                  height: 4,
                  cursor: 'row-resize',
                  zIndex: 5,
                  '&:hover': {
                    '& .hline-visual': {
                      bgcolor: theme.palette.info.main,
                      height: 3,
                    },
                  },
                }}
              >
                <Box
                  className="hline-visual"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: 0,
                    width: '100%',
                    height: dragging?.type === 'headerY' ? 3 : 2,
                    bgcolor:
                      dragging?.type === 'headerY'
                        ? theme.palette.info.main
                        : theme.palette.info.light,
                    opacity: 0.8,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: -16,
                    bgcolor: alpha(theme.palette.info.main, 0.85),
                    color: '#fff',
                    px: 0.75,
                    borderRadius: 0.5,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                  }}
                >
                  Header Y: {(headerY * 100).toFixed(1)}%
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ColumnBoundaryEditor;
export { boundariesToBands, bandsToPositions };
