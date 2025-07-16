import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Fade,
  Backdrop,
  CircularProgress,
  Grid,
  Slider,
  Switch,
  FormControlLabel,
  AppBar,
  Toolbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { saveAs } from 'file-saver';

// Icons
import {
  IconUpload,
  IconDownload,
  IconDeviceFloppy,
  IconTrash,
  IconEdit,
  IconEye,
  IconZoomIn,
  IconZoomOut,
  IconRotate,
  IconSquare,
  IconChevronDown,
  IconPlus,
  IconFileText,
  IconMapPin,
  IconSettings,
  IconTarget,
  IconFocusCentered,
  IconGripVertical,
  IconCopy,
  IconShare,
  IconSearch,
  IconFilter,
  IconGridDots,
  IconRefresh,
  IconFileTypePdf,
  IconPhoto,
  IconMaximize,
  IconMinimize,
  IconLock,
  IconLockOpen,
  IconMagnet,
  IconX,
  IconExternalLink
} from '@tabler/icons-react';

// Import types and constants from the original component
interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  fieldType: string;
  confidence?: number;
  isActive?: boolean;
  isHovered?: boolean;
  isLocked?: boolean;
  order?: number;
  color?: string;
  notes?: string;
}

interface FieldTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  recordType: string;
  fields: BoundingBox[];
  imageWidth: number;
  imageHeight: number;
  createdAt: string;
  updatedAt?: string;
  version?: string;
  author?: string;
  tags?: string[];
}

interface DrawingState {
  isDrawing: boolean;
  startPoint: { x: number; y: number };
  currentBox?: BoundingBox;
  mode: 'select' | 'draw' | 'pan';
}

interface ViewState {
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

interface OCRFieldMappingWindowProps {
  initialImage?: string;
  initialFields?: BoundingBox[];
  onSave?: (template: FieldTemplate) => void;
  onClose?: () => void;
  title?: string;
}

// Field types and constants (simplified for the window version)
const FIELD_TYPES = [
  { value: 'firstName', label: 'First Name', category: 'Personal' },
  { value: 'lastName', label: 'Last Name', category: 'Personal' },
  { value: 'middleName', label: 'Middle Name', category: 'Personal' },
  { value: 'birthDate', label: 'Birth Date', category: 'Dates' },
  { value: 'baptismDate', label: 'Baptism Date', category: 'Dates' },
  { value: 'marriageDate', label: 'Marriage Date', category: 'Dates' },
  { value: 'deathDate', label: 'Death Date', category: 'Dates' },
  { value: 'fatherName', label: 'Father Name', category: 'Family' },
  { value: 'motherName', label: 'Mother Name', category: 'Family' },
  { value: 'spouseName', label: 'Spouse Name', category: 'Family' },
  { value: 'birthPlace', label: 'Birth Place', category: 'Location' },
  { value: 'residence', label: 'Residence', category: 'Location' },
  { value: 'parish', label: 'Parish', category: 'Religious' },
  { value: 'priest', label: 'Priest', category: 'Religious' },
  { value: 'godparents', label: 'Godparents', category: 'Religious' },
  { value: 'witnesses', label: 'Witnesses', category: 'Religious' },
  { value: 'recordNumber', label: 'Record Number', category: 'Administrative' },
  { value: 'pageNumber', label: 'Page Number', category: 'Administrative' },
  { value: 'registrarSignature', label: 'Registrar Signature', category: 'Administrative' },
  { value: 'custom', label: 'Custom Field', category: 'Other' }
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Greek' },
  { code: 'ru', name: 'Russian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ar', name: 'Arabic' }
];

const RECORD_TYPES = [
  { value: 'baptism', label: 'Baptism Records' },
  { value: 'marriage', label: 'Marriage Records' },
  { value: 'funeral', label: 'Funeral Records' },
  { value: 'general', label: 'General Records' }
];

// Styled components
const ImageCanvas = styled(Box)(({ theme }) => ({
  position: 'relative',
  cursor: 'crosshair',
  border: '2px solid #e0e0e0',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  backgroundColor: '#fafafa',
  '&.drawing': { cursor: 'crosshair' },
  '&.selecting': { cursor: 'pointer' },
  '&.panning': { cursor: 'grab' },
  '&:active.panning': { cursor: 'grabbing' }
}));

const BoundingBoxOverlay = styled(Box)<{ 
  isActive?: boolean; 
  isHovered?: boolean; 
  isLocked?: boolean;
  category?: string;
}>(({ theme, isActive, isHovered, isLocked, category }) => {
  const getCategoryColor = (cat?: string) => {
    const colors = {
      'Personal': theme.palette.primary.main,
      'Religious': theme.palette.secondary.main,
      'Dates': theme.palette.success.main,
      'Location': theme.palette.warning.main,
      'Identification': theme.palette.info.main,
      'Family': theme.palette.error.main,
      'Administrative': '#9c27b0',
      'Other': theme.palette.grey[600]
    };
    return colors[cat as keyof typeof colors] || theme.palette.primary.main;
  };

  const borderColor = isActive ? theme.palette.primary.main : getCategoryColor(category);
  
  return {
    position: 'absolute',
    border: `2px solid ${borderColor}`,
    backgroundColor: isActive || isHovered ? `${borderColor}15` : 'transparent',
    cursor: isLocked ? 'not-allowed' : 'pointer',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    opacity: isLocked ? 0.7 : 1,
    '&:hover': {
      backgroundColor: `${borderColor}25`,
      borderColor: borderColor,
      transform: isLocked ? 'none' : 'scale(1.01)',
      boxShadow: isLocked ? 'none' : theme.shadows[4]
    }
  };
});

const GridOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  opacity: 0.3,
  backgroundImage: `
    linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
  `,
  backgroundSize: '20px 20px'
}));

const ResizeHandle = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '8px',
  height: '8px',
  backgroundColor: theme.palette.primary.main,
  border: `2px solid ${theme.palette.common.white}`,
  borderRadius: '50%',
  cursor: 'nw-resize',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.3)',
    backgroundColor: theme.palette.primary.dark
  },
  '&.nw': { top: '-4px', left: '-4px', cursor: 'nw-resize' },
  '&.ne': { top: '-4px', right: '-4px', cursor: 'ne-resize' },
  '&.sw': { bottom: '-4px', left: '-4px', cursor: 'sw-resize' },
  '&.se': { bottom: '-4px', right: '-4px', cursor: 'se-resize' },
  '&.n': { top: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' },
  '&.s': { bottom: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' },
  '&.w': { left: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' },
  '&.e': { right: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' }
}));

const FieldLabel = styled(Box)<{ category?: string }>(({ theme, category }) => {
  const getCategoryColor = (cat?: string) => {
    const colors = {
      'Personal': theme.palette.primary.main,
      'Religious': theme.palette.secondary.main,
      'Dates': theme.palette.success.main,
      'Location': theme.palette.warning.main,
      'Identification': theme.palette.info.main,
      'Family': theme.palette.error.main,
      'Administrative': '#9c27b0',
      'Other': theme.palette.grey[600]
    };
    return colors[cat as keyof typeof colors] || theme.palette.primary.main;
  };

  return {
    position: 'absolute',
    top: '-28px',
    left: '0px',
    backgroundColor: getCategoryColor(category),
    color: theme.palette.common.white,
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    zIndex: 10,
    boxShadow: theme.shadows[2],
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };
});

const ControlPanel = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  right: '20px',
  top: '80px',
  bottom: '20px',
  width: '400px',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: theme.shadows[8]
}));

const OCRFieldMappingWindow: React.FC<OCRFieldMappingWindowProps> = ({
  initialImage,
  initialFields = [],
  onSave,
  onClose,
  title = 'OCR Field Mapping - Large View'
}) => {
  // State management
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [fields, setFields] = useState<BoundingBox[]>(initialFields);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // Drawing and interaction state
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startPoint: { x: 0, y: 0 },
    mode: 'draw'
  });
  
  // View state with larger default zoom
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1.2,
    pan: { x: 0, y: 0 },
    rotation: 0,
    showGrid: true,
    snapToGrid: false,
    gridSize: 20
  });

  // Template metadata
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [recordType, setRecordType] = useState('baptism');
  
  // UI state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'warning' | 'info' });
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  // Image coordinate conversion
  const screenToImageCoords = useCallback((screenX: number, screenY: number) => {
    if (!imageRef.current || !canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    const relativeX = screenX - imgRect.left;
    const relativeY = screenY - imgRect.top;
    
    const imageX = (relativeX / imgRect.width) * imageDimensions.width;
    const imageY = (relativeY / imgRect.height) * imageDimensions.height;
    
    return { x: imageX, y: imageY };
  }, [imageDimensions]);

  const imageToScreenCoords = useCallback((imageX: number, imageY: number) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    
    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();
    
    const screenX = (imageX / imageDimensions.width) * imgRect.width;
    const screenY = (imageY / imageDimensions.height) * imgRect.height;
    
    return { x: screenX, y: screenY };
  }, [imageDimensions]);

  // Field operations
  const updateField = useCallback((fieldId: string, updates: Partial<BoundingBox>) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  }, []);

  const deleteField = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId));
    if (activeField === fieldId) setActiveField(null);
    setSelectedFields(prev => prev.filter(id => id !== fieldId));
  }, [activeField]);

  const duplicateField = useCallback((fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    const newField: BoundingBox = {
      ...field,
      id: `field_${Date.now()}`,
      x: field.x + 20,
      y: field.y + 20,
      label: `${field.label} (Copy)`,
      order: fields.length
    };
    
    setFields(prev => [...prev, newField]);
    setActiveField(newField.id);
  }, [fields]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  }, []);

  // Mouse event handlers for drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!image) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const coords = screenToImageCoords(e.clientX, e.clientY);
    
    if (drawingState.mode === 'draw') {
      setDrawingState(prev => ({
        ...prev,
        isDrawing: true,
        startPoint: coords
      }));
    }
  }, [image, screenToImageCoords, drawingState.mode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawingState.isDrawing || drawingState.mode !== 'draw') return;
    
    // Show preview of the box being drawn
    // This could be implemented with a temporary overlay
  }, [drawingState]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!drawingState.isDrawing || drawingState.mode !== 'draw') return;
    
    const coords = screenToImageCoords(e.clientX, e.clientY);
    const startPoint = drawingState.startPoint;
    
    // Calculate bounding box
    const x = Math.min(startPoint.x, coords.x);
    const y = Math.min(startPoint.y, coords.y);
    const width = Math.abs(coords.x - startPoint.x);
    const height = Math.abs(coords.y - startPoint.y);
    
    // Only create field if box has reasonable size
    if (width > 10 && height > 10) {
      const newField: BoundingBox = {
        id: `field_${Date.now()}`,
        x,
        y,
        width,
        height,
        label: `Field ${fields.length + 1}`,
        fieldType: 'custom',
        isActive: true,
        order: fields.length
      };
      
      setFields(prev => [...prev, newField]);
      setActiveField(newField.id);
    }
    
    setDrawingState(prev => ({
      ...prev,
      isDrawing: false
    }));
  }, [drawingState, screenToImageCoords, fields.length]);

  // Save template
  const saveTemplate = useCallback(() => {
    const template: FieldTemplate = {
      id: `template_${Date.now()}`,
      name: templateName || 'Untitled Template',
      description: templateDescription,
      language,
      recordType,
      fields,
      imageWidth: imageDimensions.width,
      imageHeight: imageDimensions.height,
      createdAt: new Date().toISOString(),
      version: '1.0',
      author: 'OCR Field Mapping Tool'
    };
    
    if (onSave) {
      onSave(template);
    }
    
    setSnackbar({ open: true, message: 'Template saved successfully', severity: 'success' });
    setShowTemplateDialog(false);
  }, [templateName, templateDescription, language, recordType, fields, imageDimensions, onSave]);

  return (
    <Box sx={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      backgroundColor: 'background.default',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* App Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconSquare size={24} style={{ marginRight: 8 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          
          {/* Quick Actions */}
          <Stack direction="row" spacing={1} sx={{ mr: 2 }}>
            <Tooltip title="Zoom In">
              <IconButton 
                onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.1, 3) }))}
                size="small"
              >
                <IconZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton 
                onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.1, 0.1) }))}
                size="small"
              >
                <IconZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset View">
              <IconButton 
                onClick={() => setViewState(prev => ({ ...prev, zoom: 1.2, pan: { x: 0, y: 0 } }))}
                size="small"
              >
                <IconFocusCentered />
              </IconButton>
            </Tooltip>
          </Stack>
          
          <Button
            variant="contained"
            startIcon={<IconDeviceFloppy />}
            onClick={() => setShowTemplateDialog(true)}
            disabled={fields.length === 0}
            sx={{ mr: 1 }}
          >
            Save Template
          </Button>
          
          <IconButton onClick={onClose} color="inherit">
            <IconX />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Large Image Canvas */}
        <Box sx={{ 
          flex: 1, 
          p: 2, 
          overflow: 'auto',
          backgroundColor: '#f5f5f5'
        }}>
          {!image ? (
            <Paper 
              {...getRootProps()} 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px dashed #ccc',
                cursor: 'pointer',
                minHeight: '400px',
                '&:hover': { 
                  borderColor: 'primary.main', 
                  bgcolor: 'primary.light', 
                  opacity: 0.1 
                }
              }}
            >
              <input {...getInputProps()} />
              <IconUpload size={80} style={{ marginBottom: '24px', opacity: 0.7 }} />
              <Typography variant="h4" gutterBottom>
                {isDragActive ? 'Drop image here...' : 'Upload Document Image'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Supports JPEG, PNG, PDF (max 10MB) - Large view for precise field mapping
              </Typography>
            </Paper>
          ) : (
            <ImageCanvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={
                drawingState.mode === 'draw' ? 'drawing' : 
                drawingState.mode === 'pan' ? 'panning' : 'selecting'
              }
              sx={{ 
                width: '100%',
                minHeight: '100%',
                position: 'relative'
              }}
            >
              {viewState.showGrid && <GridOverlay />}
              
              <img
                ref={imageRef}
                src={image}
                alt="Document to map"
                onLoad={handleImageLoad}
                style={{
                  width: '100%',
                  height: 'auto',
                  transform: `scale(${viewState.zoom}) translate(${viewState.pan.x}px, ${viewState.pan.y}px)`,
                  transformOrigin: 'top left',
                  display: 'block',
                  minWidth: '800px' // Ensure minimum width for detailed work
                }}
              />
              
              {/* Bounding Box Overlays */}
              {fields.map((field) => {
                const screenCoords = imageToScreenCoords(field.x, field.y);
                const screenWidth = (field.width / imageDimensions.width) * (imageRef.current?.getBoundingClientRect().width || 0);
                const screenHeight = (field.height / imageDimensions.height) * (imageRef.current?.getBoundingClientRect().height || 0);
                const fieldType = FIELD_TYPES.find(ft => ft.value === field.fieldType);
                
                return (
                  <BoundingBoxOverlay
                    key={field.id}
                    isActive={activeField === field.id}
                    isHovered={field.isHovered}
                    isLocked={field.isLocked}
                    category={fieldType?.category}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveField(field.id);
                    }}
                    sx={{
                      left: screenCoords.x,
                      top: screenCoords.y,
                      width: screenWidth,
                      height: screenHeight,
                      transform: `scale(${viewState.zoom}) translate(${viewState.pan.x}px, ${viewState.pan.y}px)`,
                      transformOrigin: 'top left'
                    }}
                  >
                    <FieldLabel category={fieldType?.category}>
                      {fieldType?.label || field.label}
                      {field.isLocked && <IconLock size={12} style={{ marginLeft: 4 }} />}
                    </FieldLabel>
                    
                    {/* Resize Handles - Only show for active field */}
                    {activeField === field.id && !field.isLocked && (
                      <>
                        <ResizeHandle className="nw" />
                        <ResizeHandle className="ne" />
                        <ResizeHandle className="sw" />
                        <ResizeHandle className="se" />
                        <ResizeHandle className="n" />
                        <ResizeHandle className="s" />
                        <ResizeHandle className="w" />
                        <ResizeHandle className="e" />
                      </>
                    )}
                  </BoundingBoxOverlay>
                );
              })}
            </ImageCanvas>
          )}
        </Box>

        {/* Control Panel - Fixed on the right */}
        <ControlPanel>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>Controls</Typography>
            
            {/* Mode Controls */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                variant={drawingState.mode === 'draw' ? 'contained' : 'outlined'}
                size="small"
                startIcon={<IconSquare />}
                onClick={() => setDrawingState(prev => ({ ...prev, mode: 'draw' }))}
                fullWidth
              >
                Draw
              </Button>
              <Button
                variant={drawingState.mode === 'select' ? 'contained' : 'outlined'}
                size="small"
                startIcon={<IconTarget />}
                onClick={() => setDrawingState(prev => ({ ...prev, mode: 'select' }))}
                fullWidth
              >
                Select
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Mode: {drawingState.mode === 'draw' ? 'Drawing' : 'Selecting'} | 
              Zoom: {Math.round(viewState.zoom * 100)}%
            </Typography>

            {/* View Controls */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Zoom: {Math.round(viewState.zoom * 100)}%
              </Typography>
              <Slider
                value={viewState.zoom}
                onChange={(_, value) => setViewState(prev => ({ ...prev, zoom: value as number }))}
                min={0.1}
                max={3}
                step={0.1}
                size="small"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={viewState.showGrid}
                  onChange={(e) => setViewState(prev => ({ ...prev, showGrid: e.target.checked }))}
                  size="small"
                />
              }
              label="Show Grid"
            />
          </Box>

          {/* Template Settings */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" gutterBottom>Template Settings</Typography>
            
            <TextField
              fullWidth
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              sx={{ mb: 2 }}
              size="small"
            />
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Record Type</InputLabel>
              <Select value={recordType} onChange={(e) => setRecordType(e.target.value)} label="Record Type">
                {RECORD_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Active Field Editor */}
          {activeField && (
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" gutterBottom>Edit Field</Typography>
              
              {(() => {
                const field = fields.find(f => f.id === activeField);
                if (!field) return null;
                
                return (
                  <Box>
                    <TextField
                      fullWidth
                      label="Field Label"
                      value={field.label}
                      onChange={(e) => updateField(activeField, { label: e.target.value })}
                      sx={{ mb: 2 }}
                      size="small"
                    />
                    
                    <FormControl fullWidth sx={{ mb: 2 }} size="small">
                      <InputLabel>Field Type</InputLabel>
                      <Select 
                        value={field.fieldType} 
                        onChange={(e) => updateField(activeField, { fieldType: e.target.value })}
                        label="Field Type"
                      >
                        {FIELD_TYPES.map(fieldType => (
                          <MenuItem key={fieldType.value} value={fieldType.value}>
                            {fieldType.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<IconCopy />}
                        onClick={() => duplicateField(activeField)}
                        size="small"
                        fullWidth
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<IconTrash />}
                        onClick={() => deleteField(activeField)}
                        size="small"
                        fullWidth
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Box>
                );
              })()}
            </Box>
          )}

          {/* Field List */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Fields ({fields.length})
              </Typography>
              <Tooltip title="Add Field Manually">
                <IconButton 
                  size="small"
                  onClick={() => {
                    const newField: BoundingBox = {
                      id: `field_${Date.now()}`,
                      x: 50,
                      y: 50,
                      width: 100,
                      height: 30,
                      label: `Field ${fields.length + 1}`,
                      fieldType: 'custom',
                      isActive: true,
                      order: fields.length
                    };
                    setFields(prev => [...prev, newField]);
                    setActiveField(newField.id);
                  }}
                >
                  <IconPlus />
                </IconButton>
              </Tooltip>
            </Box>

            {fields.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No fields defined yet. Draw boxes on the image to create fields.
              </Typography>
            ) : (
              <List dense>
                {fields
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((field) => {
                    const fieldType = FIELD_TYPES.find(ft => ft.value === field.fieldType);
                    return (
                      <ListItem
                        key={field.id}
                        sx={{ 
                          border: activeField === field.id ? '2px solid' : '1px solid',
                          borderColor: activeField === field.id ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          mb: 1,
                          cursor: 'pointer',
                          opacity: field.isLocked ? 0.7 : 1
                        }}
                        onClick={() => setActiveField(field.id)}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                {fieldType?.label || field.label}
                              </Typography>
                              <Chip 
                                label={fieldType?.category || 'Other'} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '10px' }}
                              />
                            </Box>
                          }
                          secondary={`${Math.round(field.x)}, ${Math.round(field.y)} | ${Math.round(field.width)}×${Math.round(field.height)}`}
                        />
                      </ListItem>
                    );
                  })}
              </List>
            )}
          </Box>
        </ControlPanel>
      </Box>

      {/* Save Template Dialog */}
      <Dialog open={showTemplateDialog} onClose={() => setShowTemplateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Template</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            This template contains {fields.length} field(s) and will be saved for reuse.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
          <Button onClick={saveTemplate} variant="contained" disabled={!templateName.trim()}>
            Save Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OCRFieldMappingWindow;
