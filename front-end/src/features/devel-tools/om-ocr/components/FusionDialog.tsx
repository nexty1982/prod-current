/**
 * FusionDialog - Full-screen dialog for the Fusion workflow
 * Extracted from InspectionPanel.tsx
 */

import React, { lazy, Suspense, useRef, useState } from 'react';
import {
    Box,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Tooltip,
    Typography,
    Stack,
} from '@mui/material';
import {
    IconMaximize,
    IconWand,
    IconX,
    IconZoomIn,
    IconZoomOut,
} from '@tabler/icons-react';
import { BBox, VisionResponse } from '../types/fusion';
import { getImageViewportMetrics } from '../utils/imageViewportMetrics';
import { getVisionPageSize } from '../utils/visionParser';
import FusionOverlay, { OverlayBox } from './FusionOverlay';

// Lazy load FusionTab at module level
const FusionTabLazy = lazy(() => import('./FusionTab'));

interface FusionDialogProps {
    open: boolean;
    onClose: () => void;
    jobFilename: string;
    jobRecordType: string;
    jobOcrText: string | null;
    jobOcrResult: any;
    imageUrl: string | null;
    job: any;
    churchId?: number;
    fusionOverlayBoxes: OverlayBox[];
    showFusionOverlay: boolean;
    bboxEditMode: boolean;
    imageDimensions: { width: number; height: number; naturalWidth: number; naturalHeight: number };
    setImageDimensions: (dims: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => void;
    ocrTokens: Array<{ id: string; text: string; bbox: BBox; confidence?: number }>;
    onHighlightBbox: (bbox: BBox | null, color?: string) => void;
    onHighlightMultiple: (boxes: OverlayBox[] | undefined) => void;
    onTokenClick: (tokenId: string, bbox: BBox, text: string) => void;
    onTokenDoubleClick: (tokenId: string, bbox: BBox, text: string) => void;
    onSendToReview: () => void;
}

const FusionDialog: React.FC<FusionDialogProps> = ({
    open,
    onClose,
    jobFilename,
    jobRecordType,
    jobOcrText,
    jobOcrResult,
    imageUrl,
    job,
    churchId,
    fusionOverlayBoxes,
    showFusionOverlay,
    bboxEditMode,
    imageDimensions,
    setImageDimensions,
    ocrTokens,
    onHighlightBbox,
    onHighlightMultiple,
    onTokenClick,
    onTokenDoubleClick,
    onSendToReview,
}) => {
    const fusionImageRef = useRef<HTMLImageElement | null>(null);
    const [fusionZoom, setFusionZoom] = useState(100);

    // Debug metrics
    const showDebugMetrics = React.useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const queryFlag = urlParams.get('debugMetrics') === 'true';
        const storageFlag = localStorage.getItem('om.ocr.debugMetrics') === 'true';
        return queryFlag || storageFlag;
    }, []);

    const [debugMetrics, setDebugMetrics] = React.useState<ReturnType<typeof getImageViewportMetrics> | null>(null);
    React.useEffect(() => {
        if (!showDebugMetrics || !fusionImageRef.current) return;
        const updateMetrics = () => {
            const metrics = getImageViewportMetrics(fusionImageRef.current);
            setDebugMetrics(metrics);
        };
        updateMetrics();
        const interval = setInterval(updateMetrics, 100);
        return () => clearInterval(interval);
    }, [showDebugMetrics, fusionImageRef.current, fusionZoom]);

    // Fusion dialog zoom controls
    const handleFusionZoomIn = () => setFusionZoom(prev => Math.min(prev + 25, 300));
    const handleFusionZoomOut = () => setFusionZoom(prev => Math.max(prev - 25, 25));
    const handleFusionZoomFit = () => setFusionZoom(100);

    return (
        <Dialog
            open={open}
            onClose={onClose}
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
                <IconButton onClick={onClose}>
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
                                        onTokenClick={onTokenClick}
                                        onTokenDoubleClick={onTokenDoubleClick}
                                        editMode={bboxEditMode || false}
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
                                onHighlightBbox={onHighlightBbox}
                                onHighlightMultiple={onHighlightMultiple}
                                onSendToReview={onSendToReview}
                                onBboxEditModeChange={(enabled) => {
                                    // bboxEditMode is passed as prop, no need to set state here
                                }}
                                onTokenClick={onTokenClick}
                                onTokenDoubleClick={onTokenDoubleClick}
                            />
                        </Suspense>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default FusionDialog;
