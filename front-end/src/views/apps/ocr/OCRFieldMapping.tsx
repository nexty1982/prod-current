// Advanced OCR Field Mapping Component
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
  FormControlLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { saveAs } from 'file-saver';
import OCRFieldMappingWindow from './OCRFieldMappingWindow';

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
  IconExternalLink
} from '@tabler/icons-react';

// Types
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

interface OCRFieldMappingProps {
  onMappingComplete?: (mapping: FieldTemplate) => void;
  initialTemplate?: FieldTemplate;
  mode?: 'create' | 'edit' | 'apply';
}

interface DrawingState {
  isDrawing: boolean;
  startPoint: { x: number; y: number };
  mode: 'draw' | 'select' | 'pan';
}

interface ViewState {
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
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

// Predefined field types with expanded categories
const FIELD_TYPES = [
  // Personal Information
  { value: 'firstName', label: '👤 First Name', category: 'Personal' },
  { value: 'lastName', label: '👤 Last Name', category: 'Personal' },
  { value: 'middleName', label: '👤 Middle Name', category: 'Personal' },
  { value: 'fullName', label: '👤 Full Name', category: 'Personal' },
  { value: 'title', label: '👑 Title/Rank', category: 'Personal' },
  { value: 'gender', label: '⚧ Gender', category: 'Personal' },
  { value: 'occupation', label: '💼 Occupation', category: 'Personal' },
  { value: 'education', label: '🎓 Education', category: 'Personal' },
  
  // Religious Information
  { value: 'clergy', label: '⛪ Clergy Status', category: 'Religious' },
  { value: 'parish', label: '🏛️ Parish', category: 'Religious' },
  { value: 'diocese', label: '🏰 Diocese', category: 'Religious' },
  { value: 'ordination', label: '📜 Ordination', category: 'Religious' },
  { value: 'confession', label: '✝️ Confession', category: 'Religious' },
  { value: 'godparent', label: '👨‍👩‍👧‍👦 Godparent', category: 'Religious' },
  { value: 'witness', label: '👁️ Witness', category: 'Religious' },
  
  // Dates and Times
  { value: 'birthDate', label: '🎂 Birth Date', category: 'Dates' },
  { value: 'deathDate', label: '⚰️ Death Date', category: 'Dates' },
  { value: 'marriageDate', label: '💒 Marriage Date', category: 'Dates' },
  { value: 'baptismDate', label: '💧 Baptism Date', category: 'Dates' },
  { value: 'confirmationDate', label: '✨ Confirmation Date', category: 'Dates' },
  { value: 'ordainationDate', label: '📜 Ordination Date', category: 'Dates' },
  { value: 'issueDate', label: '📅 Issue Date', category: 'Dates' },
  { value: 'expiryDate', label: '⏰ Expiry Date', category: 'Dates' },
  
  // Location Information
  { value: 'address', label: '🏠 Address', category: 'Location' },
  { value: 'city', label: '🏙️ City', category: 'Location' },
  { value: 'region', label: '🗺️ Region/State', category: 'Location' },
  { value: 'country', label: '🌍 Country', category: 'Location' },
  { value: 'birthPlace', label: '🏥 Birth Place', category: 'Location' },
  { value: 'residence', label: '🏡 Residence', category: 'Location' },
  
  // Identification
  { value: 'idNumber', label: '🆔 ID Number', category: 'Identification' },
  { value: 'passportNumber', label: '� Passport Number', category: 'Identification' },
  { value: 'socialSecurity', label: '🔐 Social Security', category: 'Identification' },
  { value: 'registrationNumber', label: '📋 Registration Number', category: 'Identification' },
  { value: 'certificateNumber', label: '📜 Certificate Number', category: 'Identification' },
  
  // Family Relations
  { value: 'father', label: '👨 Father', category: 'Family' },
  { value: 'mother', label: '👩 Mother', category: 'Family' },
  { value: 'spouse', label: '💑 Spouse', category: 'Family' },
  { value: 'child', label: '👶 Child', category: 'Family' },
  { value: 'sibling', label: '👫 Sibling', category: 'Family' },
  { value: 'guardian', label: '🛡️ Guardian', category: 'Family' },
  
  // Administrative
  { value: 'signature', label: '✍️ Signature', category: 'Administrative' },
  { value: 'stamp', label: '🔖 Official Stamp', category: 'Administrative' },
  { value: 'seal', label: '🏷️ Official Seal', category: 'Administrative' },
  { value: 'registrar', label: '👨‍💼 Registrar', category: 'Administrative' },
  { value: 'officiant', label: '🎭 Officiant', category: 'Administrative' },
  { value: 'authority', label: '⚖️ Authority', category: 'Administrative' },
  
  // Other
  { value: 'notes', label: '📝 Notes', category: 'Other' },
  { value: 'remarks', label: '💭 Remarks', category: 'Other' },
  { value: 'custom', label: '🔧 Custom Field', category: 'Other' }
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'ro', name: 'Romanian (Română)' },
  { code: 'ka', name: 'Georgian (ქართული)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'sr', name: 'Serbian (Српски)' },
  { code: 'bg', name: 'Bulgarian (Български)' }
];

const RECORD_TYPES = [
  { value: 'birth', label: '👶 Birth Certificate' },
  { value: 'marriage', label: '💒 Marriage Certificate' },
  { value: 'death', label: '⚰️ Death Certificate' },
  { value: 'baptism', label: '💧 Baptism Record' },
  { value: 'clergy', label: '⛪ Clergy Record' },
  { value: 'census', label: '📊 Census Record' },
  { value: 'passport', label: '📘 Passport' },
  { value: 'id', label: '🆔 ID Document' },
  { value: 'other', label: '📄 Other Document' }
];

// Styled Components
const ImageCanvas = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'auto',
  border: `2px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  backgroundColor: '#f5f5f5',
  cursor: 'crosshair',
  userSelect: 'none',
  maxHeight: '80vh',
  '&.drawing': {
    cursor: 'crosshair'
  },
  '&.panning': {
    cursor: 'grabbing'
  },
  '&.selecting': {
    cursor: 'default'
  }
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

  const borderColor = isActive 
    ? theme.palette.primary.main 
    : isHovered 
    ? getCategoryColor(category)
    : getCategoryColor(category);

  return {
    position: 'absolute',
    border: `2px solid ${borderColor}`,
    borderStyle: isLocked ? 'dashed' : 'solid',
    backgroundColor: isActive 
      ? `${borderColor}20` 
      : isHovered 
      ? `${borderColor}15` 
      : `${borderColor}08`,
    pointerEvents: 'all',
    cursor: isLocked ? 'not-allowed' : 'move',
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

const OCRFieldMapping: React.FC<OCRFieldMappingProps> = ({
  onMappingComplete,
  initialTemplate,
  mode = 'create'
}) => {
  // State management
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [fields, setFields] = useState<BoundingBox[]>(initialTemplate?.fields || []);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // Drawing and interaction state
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startPoint: { x: 0, y: 0 },
    mode: 'draw'
  });
  
  // View state
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    showGrid: false,
    snapToGrid: false,
    gridSize: 20
  });
  
  // Template state
  const [templateName, setTemplateName] = useState(initialTemplate?.name || '');
  const [templateDescription, setTemplateDescription] = useState(initialTemplate?.description || '');
  const [language, setLanguage] = useState(initialTemplate?.language || 'en');
  const [recordType, setRecordType] = useState(initialTemplate?.recordType || 'other');
  
  // UI state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<FieldTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLargeView, setShowLargeView] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ocrFieldTemplates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved templates:', error);
      }
    }
  }, []);

  // File upload handler with PDF support
  const handlePDFUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1); // Get first page
      
      const viewport = page.getViewport({ scale: 2 }); // Higher scale for better quality
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        const imageDataUrl = canvas.toDataURL('image/png');
        setImage(imageDataUrl);
        setImageFile(file);
        setFields([]);
        setActiveField(null);
        setSnackbar({ open: true, message: 'PDF converted to image successfully', severity: 'success' });
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      setSnackbar({ open: true, message: 'Failed to process PDF file', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.type === 'application/pdf') {
        handlePDFUpload(file);
      } else {
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setImage(e.target.result as string);
            setFields([]); // Clear existing fields when new image is loaded
            setActiveField(null);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }, [handlePDFUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Image load handler
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({ width: naturalWidth, height: naturalHeight });
    }
  }, []);

  // Convert screen coordinates to image coordinates
  const screenToImageCoords = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current || !imageRef.current) return { x: 0, y: 0 };
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    
    const relativeX = (screenX - imageRect.left) / imageRect.width;
    const relativeY = (screenY - imageRect.top) / imageRect.height;
    
    return {
      x: relativeX * imageDimensions.width,
      y: relativeY * imageDimensions.height
    };
  }, [imageDimensions]);

  // Convert image coordinates to screen coordinates
  const imageToScreenCoords = useCallback((imageX: number, imageY: number) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    
    const imageRect = imageRef.current.getBoundingClientRect();
    
    return {
      x: (imageX / imageDimensions.width) * imageRect.width,
      y: (imageY / imageDimensions.height) * imageRect.height
    };
  }, [imageDimensions]);

  // Mouse event handlers for drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!image || drawingState.mode !== 'draw') return;
    
    const coords = screenToImageCoords(e.clientX, e.clientY);
    setDrawingState(prev => ({
      ...prev,
      isDrawing: true,
      startPoint: coords
    }));
    setActiveField(null);
  }, [image, drawingState.mode, screenToImageCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawingState.isDrawing || !image || drawingState.mode !== 'draw') return;
    
    const coords = screenToImageCoords(e.clientX, e.clientY);
    const width = Math.abs(coords.x - drawingState.startPoint.x);
    const height = Math.abs(coords.y - drawingState.startPoint.y);
    const x = Math.min(coords.x, drawingState.startPoint.x);
    const y = Math.min(coords.y, drawingState.startPoint.y);
    
    // Update preview box (you might want to add a preview state)
  }, [drawingState.isDrawing, drawingState.mode, drawingState.startPoint, image, screenToImageCoords]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!drawingState.isDrawing || !image || drawingState.mode !== 'draw') return;
    
    const coords = screenToImageCoords(e.clientX, e.clientY);
    const width = Math.abs(coords.x - drawingState.startPoint.x);
    const height = Math.abs(coords.y - drawingState.startPoint.y);
    const x = Math.min(coords.x, drawingState.startPoint.x);
    const y = Math.min(coords.y, drawingState.startPoint.y);
    
    // Only create field if box is large enough
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
      setSnackbar({ open: true, message: 'New field created', severity: 'success' });
    }
    
    setDrawingState(prev => ({ ...prev, isDrawing: false }));
  }, [drawingState.isDrawing, drawingState.mode, drawingState.startPoint, image, fields.length, screenToImageCoords]);

  // Field management functions
  const updateField = useCallback((fieldId: string, updates: Partial<BoundingBox>) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  }, []);

  const deleteField = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId));
    if (activeField === fieldId) {
      setActiveField(null);
    }
  }, [activeField]);

  // Template management
  const saveTemplate = useCallback(() => {
    if (!templateName.trim()) {
      setSnackbar({ open: true, message: 'Please enter a template name', severity: 'error' });
      return;
    }
    
    const template: FieldTemplate = {
      id: `template_${Date.now()}`,
      name: templateName,
      description: templateDescription,
      language,
      recordType,
      fields: fields.map((field, index) => ({ ...field, order: index })),
      imageWidth: imageDimensions.width,
      imageHeight: imageDimensions.height,
      createdAt: new Date().toISOString(),
      version: '2.0',
      author: 'OCR Field Mapping Tool',
      tags: []
    };
    
    // Check if template with same name exists
    const existingIndex = savedTemplates.findIndex(t => t.name === templateName);
    let updated: FieldTemplate[];
    
    if (existingIndex >= 0) {
      // Update existing template
      updated = [...savedTemplates];
      updated[existingIndex] = { ...template, updatedAt: new Date().toISOString() };
      setSnackbar({ open: true, message: `Template "${templateName}" updated successfully`, severity: 'success' });
    } else {
      // Add new template
      updated = [...savedTemplates, template];
      setSnackbar({ open: true, message: `Template "${templateName}" saved successfully`, severity: 'success' });
    }
    
    setSavedTemplates(updated);
    localStorage.setItem('ocrFieldTemplates', JSON.stringify(updated));
    
    setShowTemplateDialog(false);
    
    if (onMappingComplete) {
      onMappingComplete(template);
    }
  }, [templateName, templateDescription, language, recordType, fields, imageDimensions, savedTemplates, onMappingComplete]);

  const exportMapping = useCallback(() => {
    const template: FieldTemplate = {
      id: `export_${Date.now()}`,
      name: templateName || 'Exported Template',
      description: templateDescription,
      language,
      recordType,
      fields: fields.map((field, index) => ({ ...field, order: index })),
      imageWidth: imageDimensions.width,
      imageHeight: imageDimensions.height,
      createdAt: new Date().toISOString(),
      version: '2.0',
      author: 'OCR Field Mapping Tool'
    };
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    saveAs(blob, `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_mapping.json`);
    setSnackbar({ open: true, message: 'Template exported successfully', severity: 'success' });
  }, [templateName, templateDescription, language, recordType, fields, imageDimensions]);

  const loadTemplate = useCallback((template: FieldTemplate) => {
    setFields(template.fields.sort((a, b) => (a.order || 0) - (b.order || 0)));
    setLanguage(template.language);
    setRecordType(template.recordType);
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setActiveField(null);
    setFilterCategory('all');
    setSearchTerm('');
  }, []);

  // Advanced field manipulation functions
  const duplicateField = useCallback((fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      const newField: BoundingBox = {
        ...field,
        id: `field_${Date.now()}`,
        x: field.x + 20,
        y: field.y + 20,
        label: `${field.label} (Copy)`,
        isActive: true
      };
      setFields(prev => [...prev, newField]);
      setActiveField(newField.id);
      setSnackbar({ open: true, message: 'Field duplicated successfully', severity: 'success' });
    }
  }, [fields]);

  const lockField = useCallback((fieldId: string, locked: boolean) => {
    updateField(fieldId, { isLocked: locked });
    setSnackbar({ 
      open: true, 
      message: locked ? 'Field locked' : 'Field unlocked', 
      severity: 'info' 
    });
  }, [updateField, setSnackbar]);

  const deleteSelectedFields = useCallback(() => {
    if (selectedFields.length === 0) return;
    
    setFields(prev => prev.filter(field => !selectedFields.includes(field.id)));
    setSelectedFields([]);
    setActiveField(null);
    setSnackbar({ 
      open: true, 
      message: `${selectedFields.length} fields deleted`, 
      severity: 'success' 
    });
  }, [selectedFields]);

  const selectAllFields = useCallback(() => {
    setSelectedFields(fields.map(f => f.id));
  }, [fields]);

  const clearSelection = useCallback(() => {
    setSelectedFields([]);
    setActiveField(null);
  }, []);

  const alignFields = useCallback((direction: 'left' | 'right' | 'top' | 'bottom' | 'center-v' | 'center-h') => {
    if (selectedFields.length < 2) return;
    
    const selectedFieldsData = fields.filter(f => selectedFields.includes(f.id));
    
    switch (direction) {
      case 'left': {
        const minX = Math.min(...selectedFieldsData.map(f => f.x));
        selectedFieldsData.forEach(field => updateField(field.id, { x: minX }));
        break;
      }
      case 'right': {
        const maxX = Math.max(...selectedFieldsData.map(f => f.x + f.width));
        selectedFieldsData.forEach(field => updateField(field.id, { x: maxX - field.width }));
        break;
      }
      case 'top': {
        const minY = Math.min(...selectedFieldsData.map(f => f.y));
        selectedFieldsData.forEach(field => updateField(field.id, { y: minY }));
        break;
      }
      case 'bottom': {
        const maxY = Math.max(...selectedFieldsData.map(f => f.y + f.height));
        selectedFieldsData.forEach(field => updateField(field.id, { y: maxY - field.height }));
        break;
      }
    }
    
    setSnackbar({ open: true, message: 'Fields aligned successfully', severity: 'success' });
  }, [selectedFields, fields, updateField, setSnackbar]);

  const distributeFields = useCallback((direction: 'horizontal' | 'vertical') => {
    if (selectedFields.length < 3) return;
    
    const selectedFieldsData = fields.filter(f => selectedFields.includes(f.id))
      .sort((a, b) => direction === 'horizontal' ? a.x - b.x : a.y - b.y);
    
    if (direction === 'horizontal') {
      const totalWidth = selectedFieldsData[selectedFieldsData.length - 1].x - selectedFieldsData[0].x;
      const spacing = totalWidth / (selectedFieldsData.length - 1);
      selectedFieldsData.forEach((field, index) => {
        if (index > 0 && index < selectedFieldsData.length - 1) {
          updateField(field.id, { x: selectedFieldsData[0].x + spacing * index });
        }
      });
    } else {
      const totalHeight = selectedFieldsData[selectedFieldsData.length - 1].y - selectedFieldsData[0].y;
      const spacing = totalHeight / (selectedFieldsData.length - 1);
      selectedFieldsData.forEach((field, index) => {
        if (index > 0 && index < selectedFieldsData.length - 1) {
          updateField(field.id, { y: selectedFieldsData[0].y + spacing * index });
        }
      });
    }
    
    setSnackbar({ open: true, message: 'Fields distributed evenly', severity: 'success' });
  }, [selectedFields, fields, updateField, setSnackbar]);

  const importTemplateFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target?.result as string) as FieldTemplate;
        loadTemplate(template);
        setSnackbar({ open: true, message: 'Template imported successfully', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: 'Failed to import template', severity: 'error' });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [loadTemplate]);

  // Filter fields based on category and search term
  const filteredFields = fields.filter(field => {
    const matchesCategory = filterCategory === 'all' || 
      FIELD_TYPES.find(ft => ft.value === field.fieldType)?.category === filterCategory;
    const matchesSearch = field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      FIELD_TYPES.find(ft => ft.value === field.fieldType)?.label.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconSquare size={32} />
        OCR Field Mapping Tool
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload an image and draw boxes around text areas to create precise OCR field mappings.
      </Typography>

      {/* Upload Area */}
      {!image && (
        <Paper 
          {...getRootProps()} 
          sx={{ 
            p: 6, 
            textAlign: 'center', 
            border: '2px dashed #ccc',
            cursor: 'pointer',
            mb: 3,
            '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.light', opacity: 0.1 }
          }}
        >
          <input {...getInputProps()} />
          <IconUpload size={64} style={{ marginBottom: '16px', opacity: 0.7 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Drop image here...' : 'Upload Document Image'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports JPEG, PNG, PDF (max 10MB)
          </Typography>
        </Paper>
      )}

      {/* Main Interface */}
      {image && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', lg: 'row' }, 
          gap: 3 
        }}>
          {/* Image Canvas */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper sx={{ p: { xs: 1, sm: 2 } }}>
              {/* Canvas Controls */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'stretch', sm: 'center' }, 
                mb: 2,
                gap: 1
              }}>
                <Typography variant="h6">Field Mapping Canvas</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                  <Tooltip title="Open Large View">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<IconExternalLink />}
                      onClick={() => setShowLargeView(true)}
                      disabled={!image}
                      sx={{ mr: 1 }}
                    >
                      Large View
                    </Button>
                  </Tooltip>
                  <Tooltip title="Zoom In">
                    <IconButton onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.1, 3) }))}>
                      <IconZoomIn />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Zoom Out">
                    <IconButton onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.1, 0.1) }))}>
                      <IconZoomOut />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reset View">
                    <IconButton onClick={() => setViewState(prev => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }))}>
                      <IconFocusCentered />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Toggle Grid">
                    <IconButton 
                      onClick={() => setViewState(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                      color={viewState.showGrid ? 'primary' : 'default'}
                    >
                      <IconGridDots />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Image Canvas */}
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
                  height: '500px',
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
                    display: 'block'
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
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                💡 Current mode: {drawingState.mode === 'draw' ? 'Drawing' : drawingState.mode === 'select' ? 'Selecting' : 'Panning'} | 
                Click and drag to {drawingState.mode === 'draw' ? 'create new fields' : 'select fields'}. 
                Zoom: {Math.round(viewState.zoom * 100)}%
              </Typography>

              {/* Mode Controls */}
              <Box sx={{ 
                mt: 2, 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1, 
                flexWrap: 'wrap', 
                alignItems: 'center',
                justifyContent: { xs: 'center', sm: 'flex-start' }
              }}>
                <Button
                  variant={drawingState.mode === 'draw' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<IconSquare />}
                  onClick={() => setDrawingState(prev => ({ ...prev, mode: 'draw' }))}
                  sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                >
                  Draw Fields
                </Button>
                <Button
                  variant={drawingState.mode === 'select' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<IconTarget />}
                  onClick={() => setDrawingState(prev => ({ ...prev, mode: 'select' }))}
                  sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                >
                  Select
                </Button>
                <Button
                  variant={drawingState.mode === 'pan' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<IconGripVertical />}
                  onClick={() => setDrawingState(prev => ({ ...prev, mode: 'pan' }))}
                  sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                >
                  Pan
                </Button>
                
                <Divider orientation="vertical" sx={{ height: 28, display: { xs: 'none', sm: 'block' } }} />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={viewState.snapToGrid}
                      onChange={(e) => setViewState(prev => ({ ...prev, snapToGrid: e.target.checked }))}
                      size="small"
                    />
                  }
                  label="Snap to Grid"
                  sx={{ ml: { xs: 0, sm: 1 }, mt: { xs: 1, sm: 0 } }}
                />
              </Box>
            </Paper>
          </Box>

          {/* Controls Panel */}
          <Box sx={{ width: { xs: '100%', lg: '350px' }, flexShrink: 0 }}>
            {/* Template Info */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>Template Settings</Typography>
              
              <TextField
                fullWidth
                label="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                sx={{ mb: 2 }}
                size="small"
              />
              
              <TextField
                fullWidth
                label="Description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                multiline
                rows={2}
                sx={{ mb: 2 }}
                size="small"
              />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select value={language} onChange={(e) => setLanguage(e.target.value)} label="Language">
                    {LANGUAGES.map(lang => (
                      <MenuItem key={lang.code} value={lang.code}>{lang.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth size="small">
                  <InputLabel>Record Type</InputLabel>
                  <Select value={recordType} onChange={(e) => setRecordType(e.target.value)} label="Record Type">
                    {RECORD_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Paper>

            {/* Field List */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Fields ({fields.filter(f => 
                    (filterCategory === 'all' || FIELD_TYPES.find(ft => ft.value === f.fieldType)?.category === filterCategory) &&
                    (searchTerm === '' || f.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                     FIELD_TYPES.find(ft => ft.value === f.fieldType)?.label.toLowerCase().includes(searchTerm.toLowerCase()))
                  ).length}/{fields.length})
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

              {/* Search and Filter */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <IconSearch size={16} style={{ marginRight: 8 }} />
                  }}
                  sx={{ mb: 1 }}
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Category</InputLabel>
                  <Select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Filter by Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {Array.from(new Set(FIELD_TYPES.map(ft => ft.category))).map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              {fields.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No fields defined yet. Draw boxes on the image to create fields.
                </Typography>
              ) : (
                <List dense>
                  {fields
                    .filter(field => {
                      const fieldType = FIELD_TYPES.find(ft => ft.value === field.fieldType);
                      const matchesCategory = filterCategory === 'all' || fieldType?.category === filterCategory;
                      const matchesSearch = searchTerm === '' || 
                        field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (fieldType?.label.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
                      return matchesCategory && matchesSearch;
                    })
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
                                {field.isLocked && <IconLock size={14} />}
                              </Box>
                            }
                            secondary={`Position: ${Math.round(field.x)}, ${Math.round(field.y)} | Size: ${Math.round(field.width)}×${Math.round(field.height)}`}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title={field.isLocked ? 'Unlock Field' : 'Lock Field'}>
                              <IconButton 
                                edge="end" 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateField(field.id, { isLocked: !field.isLocked });
                                }}
                                sx={{ mr: 1 }}
                              >
                                {field.isLocked ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Field">
                              <IconButton 
                                edge="end" 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteField(field.id);
                                }}
                              >
                                <IconTrash size={16} />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                </List>
              )}
            </Paper>

            {/* Active Field Editor */}
            {activeField && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>Edit Field</Typography>
                
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
                          {Object.entries(
                            FIELD_TYPES.reduce((acc, field) => {
                              if (!acc[field.category]) acc[field.category] = [];
                              acc[field.category].push(field);
                              return acc;
                            }, {} as Record<string, typeof FIELD_TYPES>)
                          ).map(([category, categoryFields]) => [
                            <MenuItem key={category} disabled sx={{ fontWeight: 'bold' }}>
                              {category}
                            </MenuItem>,
                            ...categoryFields.map(fieldType => (
                              <MenuItem key={fieldType.value} value={fieldType.value}>
                                {fieldType.label}
                              </MenuItem>
                            ))
                          ])}
                        </Select>
                      </FormControl>
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                        <TextField
                          label="X"
                          type="number"
                          value={Math.round(field.x)}
                          onChange={(e) => updateField(activeField, { x: Number(e.target.value) })}
                          size="small"
                        />
                        <TextField
                          label="Y"
                          type="number"
                          value={Math.round(field.y)}
                          onChange={(e) => updateField(activeField, { y: Number(e.target.value) })}
                          size="small"
                        />
                        <TextField
                          label="Width"
                          type="number"
                          value={Math.round(field.width)}
                          onChange={(e) => updateField(activeField, { width: Number(e.target.value) })}
                          size="small"
                        />
                        <TextField
                          label="Height"
                          type="number"
                          value={Math.round(field.height)}
                          onChange={(e) => updateField(activeField, { height: Number(e.target.value) })}
                          size="small"
                        />
                      </Box>
                    </Box>
                  );
                })()}
              </Paper>
            )}

            {/* Actions */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Actions</Typography>
              
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<IconDeviceFloppy />}
                  onClick={() => setShowTemplateDialog(true)}
                  disabled={fields.length === 0}
                  fullWidth
                >
                  Save Template
                </Button>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<IconDownload />}
                    onClick={exportMapping}
                    disabled={fields.length === 0}
                    size="small"
                  >
                    Export JSON
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<IconUpload />}
                    onClick={() => fileInputRef.current?.click()}
                    size="small"
                  >
                    Import
                  </Button>
                </Box>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={importTemplateFile}
                />
                
                <Divider sx={{ my: 1 }} />
                
                {/* Field Operations */}
                <Typography variant="subtitle2" color="text.secondary">Field Operations</Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<IconCopy />}
                    onClick={() => activeField && duplicateField(activeField)}
                    disabled={!activeField}
                    size="small"
                  >
                    Duplicate
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={activeField && fields.find(f => f.id === activeField)?.isLocked ? <IconLockOpen /> : <IconLock />}
                    onClick={() => {
                      if (activeField) {
                        const field = fields.find(f => f.id === activeField);
                        if (field) {
                          lockField(activeField, !field.isLocked);
                        }
                      }
                    }}
                    disabled={!activeField}
                    size="small"
                  >
                    {activeField && fields.find(f => f.id === activeField)?.isLocked ? 'Unlock' : 'Lock'}
                  </Button>
                </Box>
                
                {/* Selection Operations */}
                {fields.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">Selection</Typography>
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <Button
                        variant="outlined"
                        onClick={selectAllFields}
                        size="small"
                      >
                        Select All
                      </Button>
                      
                      <Button
                        variant="outlined"
                        onClick={clearSelection}
                        disabled={selectedFields.length === 0}
                        size="small"
                      >
                        Clear Selection
                      </Button>
                    </Box>
                    
                    {selectedFields.length > 1 && (
                      <>
                        <Typography variant="subtitle2" color="text.secondary">
                          Batch Operations ({selectedFields.length} selected)
                        </Typography>
                        
                        <Accordion>
                          <AccordionSummary expandIcon={<IconChevronDown />}>
                            <Typography variant="body2">Alignment</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Stack spacing={1}>
                              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                <Button
                                  size="small"
                                  onClick={() => alignFields('left')}
                                >
                                  Align Left
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => alignFields('right')}
                                >
                                  Align Right
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => alignFields('top')}
                                >
                                  Align Top
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => alignFields('bottom')}
                                >
                                  Align Bottom
                                </Button>
                              </Box>
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                        
                        {selectedFields.length > 2 && (
                          <Accordion>
                            <AccordionSummary expandIcon={<IconChevronDown />}>
                              <Typography variant="body2">Distribution</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Stack spacing={1}>
                                <Button
                                  size="small"
                                  onClick={() => distributeFields('horizontal')}
                                  fullWidth
                                >
                                  Distribute Horizontally
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => distributeFields('vertical')}
                                  fullWidth
                                >
                                  Distribute Vertically
                                </Button>
                              </Stack>
                            </AccordionDetails>
                          </Accordion>
                        )}
                        
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<IconTrash />}
                          onClick={() => {
                            if (window.confirm(`Delete ${selectedFields.length} selected fields?`)) {
                              deleteSelectedFields();
                            }
                          }}
                          size="small"
                          fullWidth
                        >
                          Delete Selected
                        </Button>
                      </>
                    )}
                  </>
                )}
                
                <Divider sx={{ my: 1 }} />
                
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash />}
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all fields?')) {
                      setFields([]);
                      setActiveField(null);
                      setSelectedFields([]);
                      setSnackbar({ open: true, message: 'All fields cleared', severity: 'info' });
                    }
                  }}
                  disabled={fields.length === 0}
                  fullWidth
                >
                  Clear All Fields
                </Button>
              </Stack>
              
              {/* View Settings */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>View Settings</Typography>
              
              <Stack spacing={1}>
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
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={viewState.snapToGrid}
                      onChange={(e) => setViewState(prev => ({ ...prev, snapToGrid: e.target.checked }))}
                      size="small"
                    />
                  }
                  label="Snap to Grid"
                />
                
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Zoom: {Math.round(viewState.zoom * 100)}%
                  </Typography>
                  <Slider
                    value={viewState.zoom}
                    onChange={(_, value) => setViewState(prev => ({ ...prev, zoom: value as number }))}
                    min={0.1}
                    max={3}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: '50%' },
                      { value: 1, label: '100%' },
                      { value: 2, label: '200%' }
                    ]}
                    size="small"
                  />
                </Box>
              </Stack>
              
              {/* Template Stats */}
              {fields.length > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block' }}>
                    Template Statistics
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {fields.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Fields
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {Array.from(new Set(fields.map(f => FIELD_TYPES.find(ft => ft.value === f.fieldType)?.category))).length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Categories
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {fields.filter(f => f.isLocked).length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Locked
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {Math.round(viewState.zoom * 100)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Zoom Level
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      )}

      {/* Template Dialog */}
      <Dialog 
        open={showTemplateDialog} 
        onClose={() => setShowTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Template Management</DialogTitle>
        <DialogContent>
          {savedTemplates.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>Saved Templates</Typography>
              <List>
                {savedTemplates.map((template) => (
                  <ListItem key={template.id} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {template.name}
                          </Typography>
                          {template.tags && template.tags.map(tag => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {template.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.fields.length} fields • {LANGUAGES.find(l => l.code === template.language)?.name} • 
                            {RECORD_TYPES.find(r => r.value === template.recordType)?.label.replace(/\p{Emoji}/gu, '').trim()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Created: {new Date(template.createdAt).toLocaleDateString()}
                            {template.updatedAt && ` • Updated: ${new Date(template.updatedAt).toLocaleDateString()}`}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Load Template">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              loadTemplate(template);
                              setShowTemplateDialog(false);
                              setSnackbar({ open: true, message: `Template "${template.name}" loaded successfully`, severity: 'success' });
                            }}
                          >
                            Load
                          </Button>
                        </Tooltip>
                        <Tooltip title="Export Template">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
                              saveAs(blob, `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`);
                              setSnackbar({ open: true, message: 'Template exported successfully', severity: 'success' });
                            }}
                          >
                            <IconDownload size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Template">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              const updated = savedTemplates.filter(t => t.id !== template.id);
                              setSavedTemplates(updated);
                              localStorage.setItem('ocrFieldTemplates', JSON.stringify(updated));
                              setSnackbar({ open: true, message: 'Template deleted', severity: 'info' });
                            }}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Alert severity="info">
              No saved templates found. Create and save your first template to get started.
            </Alert>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Import Template */}
          <Box>
            <Typography variant="h6" gutterBottom>Import Template</Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const template = JSON.parse(event.target?.result as string);
                      if (template.fields && template.name) {
                        const importedTemplate: FieldTemplate = {
                          ...template,
                          id: `imported_${Date.now()}`,
                          createdAt: new Date().toISOString()
                        };
                        const updated = [...savedTemplates, importedTemplate];
                        setSavedTemplates(updated);
                        localStorage.setItem('ocrFieldTemplates', JSON.stringify(updated));
                        setSnackbar({ open: true, message: 'Template imported successfully', severity: 'success' });
                      } else {
                        throw new Error('Invalid template format');
                      }
                    } catch (error) {
                      setSnackbar({ open: true, message: 'Failed to import template', severity: 'error' });
                    }
                  };
                  reader.readAsText(file);
                }
              }}
            />
            <Button
              variant="outlined"
              startIcon={<IconUpload />}
              onClick={() => fileInputRef.current?.click()}
              fullWidth
            >
              Import JSON Template
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
          {fields.length > 0 && (
            <Button onClick={saveTemplate} variant="contained">
              Save Current Template
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      <Backdrop open={isLoading} sx={{ zIndex: 9999 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="white">
            Processing PDF...
          </Typography>
        </Box>
      </Backdrop>

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

      {/* Large View Window */}
      {showLargeView && (
        <OCRFieldMappingWindow
          initialImage={image || undefined}
          initialFields={fields}
          onSave={(template) => {
            // Update the current fields with the template fields
            setFields(template.fields);
            setTemplateName(template.name);
            setTemplateDescription(template.description);
            setLanguage(template.language);
            setRecordType(template.recordType);
            setSnackbar({ open: true, message: 'Template applied from large view', severity: 'success' });
          }}
          onClose={() => setShowLargeView(false)}
          title={`OCR Field Mapping - ${templateName || 'Untitled'} (Large View)`}
        />
      )}
    </Box>
  );
};

export default OCRFieldMapping;
