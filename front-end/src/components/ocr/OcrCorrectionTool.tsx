/*
  ✅ GOAL:
  Build an intelligent OCR correction interface for Orthodox church records.

  🎯 FUNCTIONALITY:
  1. Load or define a field template before uploading (e.g., death_date, name, priest).
  2. Upload an image → run OCR using Google Vision API.
  3. Display the improved OCR text blocks (right side).
  4. Allow user to drag and drop text blocks into each structured field (left side).
  5. Track confidence scores and manual corrections.
  6. Save final result as JSON + training data for backend learning.
*/

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Paper,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  DragIndicator,
  Send as Submit,
  Refresh,
  Save,
  Download,
  Upload,
  AutoAwesome as AutoFix,
  Visibility,
  Close,
  CheckCircle,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Field templates for different record types
const RECORD_TEMPLATES = {
  baptism: [
    'child_name',
    'baptism_date',
    'birth_date',
    'father_name',
    'mother_name',
    'godfather_name',
    'godmother_name',
    'priest_name',
    'church_location',
    'notes'
  ],
  marriage: [
    'groom_name',
    'bride_name',
    'marriage_date',
    'groom_age',
    'bride_age',
    'witness_1',
    'witness_2',
    'priest_name',
    'church_location',
    'notes'
  ],
  funeral: [
    'deceased_name',
    'death_date',
    'burial_date',
    'age',
    'cause_of_death',
    'priest_administered',
    'priest_officiated',
    'burial_location',
    'notes'
  ]
};

interface OcrBlock {
  id: string;
  text: string;
  confidence: number;
  boundingBox?: any;
  sourceLineNumber?: number;
  used?: boolean;
}

interface FieldMapping {
  fieldName: string;
  ocrBlockId?: string;
  correctedText: string;
  confidence?: number;
  isManuallyEdited: boolean;
}

interface OcrCorrectionToolProps {
  churchId: string;
  onSubmit?: (mappedRecord: any) => void;
  initialImage?: File;
  initialTemplate?: string;
}

// Sortable Text Block Component
const SortableTextBlock: React.FC<{ block: OcrBlock; isUsed: boolean }> = ({ block, isUsed }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: isUsed });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isUsed ? 0.4 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        p: 2,
        mb: 1,
        cursor: isUsed ? 'not-allowed' : 'grab',
        bgcolor: isUsed ? 'grey.100' : 'white',
        border: isDragging ? '2px dashed primary.main' : '1px solid',
        borderColor: isUsed ? 'grey.300' : 'grey.200',
        '&:hover': {
          borderColor: isUsed ? 'grey.300' : 'primary.main',
          boxShadow: isUsed ? 'none' : 2
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DragIndicator sx={{ color: 'grey.400', fontSize: 16 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {block.text}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip
              label={`${Math.round(block.confidence * 100)}%`}
              size="small"
              color={block.confidence > 0.8 ? 'success' : block.confidence > 0.6 ? 'warning' : 'error'}
            />
            {isUsed && (
              <Chip
                label="Used"
                size="small"
                color="default"
                icon={<CheckCircle sx={{ fontSize: 14 }} />}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

// Droppable Field Component
const DroppableField: React.FC<{
  fieldName: string;
  mapping: FieldMapping | null;
  onTextChange: (fieldName: string, text: string) => void;
  onClear: (fieldName: string) => void;
}> = ({ fieldName, mapping, onTextChange, onClear }) => {
  const displayName = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Card sx={{ mb: 2, border: mapping ? '2px solid' : '2px dashed', borderColor: mapping ? 'success.main' : 'grey.300' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {displayName}
          </Typography>
          {mapping && (
            <IconButton size="small" onClick={() => onClear(fieldName)} color="error">
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
        
        {mapping ? (
          <Box>
            <TextField
              fullWidth
              size="small"
              value={mapping.correctedText}
              onChange={(e) => onTextChange(fieldName, e.target.value)}
              variant="outlined"
              multiline
              maxRows={3}
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              {mapping.confidence && (
                <Chip
                  label={`${Math.round(mapping.confidence * 100)}% confidence`}
                  size="small"
                  color={mapping.confidence > 0.8 ? 'success' : mapping.confidence > 0.6 ? 'warning' : 'error'}
                />
              )}
              {mapping.isManuallyEdited && (
                <Chip
                  label="Edited"
                  size="small"
                  color="info"
                  icon={<AutoFix sx={{ fontSize: 14 }} />}
                />
              )}
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              p: 3,
              textAlign: 'center',
              color: 'text.secondary',
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: 1,
              minHeight: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="body2">
              Drop OCR text here or type manually
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export const OcrCorrectionTool: React.FC<OcrCorrectionToolProps> = ({
  churchId,
  onSubmit,
  initialImage,
  initialTemplate = 'baptism'
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplate);
  const [ocrBlocks, setOcrBlocks] = useState<OcrBlock[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMapping | null>>({});
  const [uploadedImage, setUploadedImage] = useState<File | null>(initialImage || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Initialize field mappings when template changes
  useEffect(() => {
    const template = RECORD_TEMPLATES[selectedTemplate as keyof typeof RECORD_TEMPLATES] || [];
    const mappings: Record<string, FieldMapping | null> = {};
    template.forEach(fieldName => {
      mappings[fieldName] = null;
    });
    setFieldMappings(mappings);
  }, [selectedTemplate]);

  // Mock OCR processing (replace with actual Google Vision API call)
  const processImageWithOCR = async (imageFile: File): Promise<OcrBlock[]> => {
    setIsProcessing(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock OCR results based on template type
      const mockResults: Record<string, OcrBlock[]> = {
        baptism: [
          { id: '1', text: 'Michael Alexander Popov', confidence: 0.95, sourceLineNumber: 1 },
          { id: '2', text: 'January 15, 2024', confidence: 0.92, sourceLineNumber: 2 },
          { id: '3', text: 'December 28, 2023', confidence: 0.88, sourceLineNumber: 3 },
          { id: '4', text: 'Alexander Popov', confidence: 0.94, sourceLineNumber: 4 },
          { id: '5', text: 'Maria Popova', confidence: 0.93, sourceLineNumber: 5 },
          { id: '6', text: 'John Doe', confidence: 0.85, sourceLineNumber: 6 },
          { id: '7', text: 'Jane Smith', confidence: 0.87, sourceLineNumber: 7 },
          { id: '8', text: 'Fr. Gregory Peterson', confidence: 0.91, sourceLineNumber: 8 },
          { id: '9', text: 'St. Nicholas Orthodox Church', confidence: 0.89, sourceLineNumber: 9 }
        ],
        marriage: [
          { id: '1', text: 'George Antonios', confidence: 0.94 },
          { id: '2', text: 'Elena Kostas', confidence: 0.92 },
          { id: '3', text: 'June 12, 2024', confidence: 0.90 },
          { id: '4', text: '28', confidence: 0.85 },
          { id: '5', text: '26', confidence: 0.83 },
          { id: '6', text: 'Nicholas Antonios', confidence: 0.88 },
          { id: '7', text: 'Sophia Kostas', confidence: 0.87 },
          { id: '8', text: 'Fr. John Papadopoulos', confidence: 0.93 }
        ],
        funeral: [
          { id: '1', text: 'Joan Bongiorno', confidence: 0.98 },
          { id: '2', text: 'April 18, 2024', confidence: 0.94 },
          { id: '3', text: 'April 22, 2024', confidence: 0.91 },
          { id: '4', text: '92', confidence: 0.95 },
          { id: '5', text: 'Follicular Lymphoma', confidence: 0.96 },
          { id: '6', text: 'Fr. Jass Pawells', confidence: 0.72 },
          { id: '7', text: 'Fr. Michael Stevens', confidence: 0.89 },
          { id: '8', text: 'Holy Cross Cemetery', confidence: 0.87 }
        ]
      };

      return mockResults[selectedTemplate] || mockResults.baptism;
    } catch (err) {
      setError('Failed to process image with OCR');
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      processImageWithOCR(file).then(setOcrBlocks);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && over.id.startsWith('field-')) {
      const fieldName = over.id.replace('field-', '');
      const blockId = active.id;
      const block = ocrBlocks.find(b => b.id === blockId);

      if (block && !block.used) {
        assignBlockToField(fieldName, block);
      }
    }
  };

  const assignBlockToField = (fieldName: string, block: OcrBlock) => {
    // Clear any existing mapping for this field
    const updatedMappings = { ...fieldMappings };
    if (updatedMappings[fieldName]) {
      const oldBlockId = updatedMappings[fieldName]?.ocrBlockId;
      if (oldBlockId) {
        setOcrBlocks(prev => prev.map(b => b.id === oldBlockId ? { ...b, used: false } : b));
      }
    }

    // Set new mapping
    updatedMappings[fieldName] = {
      fieldName,
      ocrBlockId: block.id,
      correctedText: block.text,
      confidence: block.confidence,
      isManuallyEdited: false
    };

    setFieldMappings(updatedMappings);

    // Mark block as used
    setOcrBlocks(prev => prev.map(b => b.id === block.id ? { ...b, used: true } : b));
  };

  const handleTextChange = (fieldName: string, newText: string) => {
    const mapping = fieldMappings[fieldName];
    if (mapping) {
      setFieldMappings(prev => ({
        ...prev,
        [fieldName]: {
          ...mapping,
          correctedText: newText,
          isManuallyEdited: newText !== (ocrBlocks.find(b => b.id === mapping.ocrBlockId)?.text || '')
        }
      }));
    }
  };

  const clearFieldMapping = (fieldName: string) => {
    const mapping = fieldMappings[fieldName];
    if (mapping?.ocrBlockId) {
      setOcrBlocks(prev => prev.map(b => b.id === mapping.ocrBlockId ? { ...b, used: false } : b));
    }
    setFieldMappings(prev => ({ ...prev, [fieldName]: null }));
  };

  const handleSubmit = () => {
    const mappedRecord = {
      template: selectedTemplate,
      churchId,
      mappings: Object.entries(fieldMappings)
        .filter(([_, mapping]) => mapping && mapping.correctedText.trim())
        .map(([fieldName, mapping]) => ({
          fieldName,
          value: mapping!.correctedText,
          confidence: mapping!.confidence,
          isManuallyEdited: mapping!.isManuallyEdited,
          ocrBlockId: mapping!.ocrBlockId
        })),
      rawOcr: ocrBlocks,
      corrections: Object.entries(fieldMappings)
        .filter(([_, mapping]) => mapping?.isManuallyEdited)
        .map(([fieldName, mapping]) => ({
          fieldName,
          originalText: ocrBlocks.find(b => b.id === mapping!.ocrBlockId)?.text || '',
          correctedText: mapping!.correctedText
        }))
    };

    if (onSubmit) {
      onSubmit(mappedRecord);
    } else {
      console.log('Mapped Record:', mappedRecord);
      alert('Record mapped successfully! Check console for details.');
    }
  };

  const template = RECORD_TEMPLATES[selectedTemplate as keyof typeof RECORD_TEMPLATES] || [];
  const completedMappings = Object.values(fieldMappings).filter(m => m && m.correctedText.trim()).length;
  const progressPercentage = template.length > 0 ? (completedMappings / template.length) * 100 : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Box sx={{ maxWidth: '7xl', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
            OCR Record Mapping Tool
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upload church records, extract text with OCR, and map to structured fields
          </Typography>
        </Box>

        {/* Controls */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 4fr 5fr' }, gap: 3, alignItems: 'center' }}>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Record Type</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label="Record Type"
                  >
                    <MenuItem value="baptism">Baptism Record</MenuItem>
                    <MenuItem value="marriage">Marriage Record</MenuItem>
                    <MenuItem value="funeral">Funeral Record</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<Upload />}
                  fullWidth
                  disabled={isProcessing}
                >
                  {uploadedImage ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    hidden
                    accept="image/*,.pdf"
                    onChange={handleImageUpload}
                  />
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Submit />}
                  onClick={handleSubmit}
                  disabled={completedMappings === 0}
                >
                  Submit Mapping
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Visibility />}
                  onClick={() => setPreviewOpen(true)}
                  disabled={completedMappings === 0}
                >
                  Preview
                </Button>
              </Box>
            </Box>

            {/* Progress Bar */}
            {template.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Progress: {completedMappings} of {template.length} fields mapped
                  </Typography>
                  <Typography variant="body2" color="primary">
                    {Math.round(progressPercentage)}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progressPercentage} />
              </Box>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isProcessing && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                Processing Image with OCR...
              </Typography>
              <LinearProgress sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <DndContext 
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {/* Field Template (Left Side) */}
            <Box>
              <Card sx={{ height: '70vh' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" gutterBottom>
                    Record Template - {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Drag OCR text blocks from the right panel to populate these fields
                  </Typography>

                  {/* Scrollable Fields Container */}
                  <Box 
                    sx={{ 
                      flex: 1,
                      overflowY: 'auto',
                      pr: 1,
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#c1c1c1',
                        borderRadius: '4px',
                        '&:hover': {
                          background: '#a8a8a8',
                        },
                      },
                    }}
                  >
                    {template.map((fieldName) => (
                      <div key={fieldName} id={`field-${fieldName}`}>
                        <DroppableField
                          fieldName={fieldName}
                          mapping={fieldMappings[fieldName]}
                          onTextChange={handleTextChange}
                          onClear={clearFieldMapping}
                        />
                      </div>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* OCR Text Blocks (Right Side) */}
            <Box>
              <Card sx={{ height: '70vh' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" gutterBottom>
                    OCR Text Blocks
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {ocrBlocks.length > 0 
                      ? `${ocrBlocks.length} text blocks extracted. Drag to map to fields.`
                      : 'Upload an image to extract text blocks with OCR'
                    }
                  </Typography>

                  {ocrBlocks.length > 0 ? (
                    <Box 
                      sx={{ 
                        flex: 1,
                        overflowY: 'auto',
                        pr: 1,
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: '#f1f1f1',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#c1c1c1',
                          borderRadius: '4px',
                          '&:hover': {
                            background: '#a8a8a8',
                          },
                        },
                      }}
                    >
                      <SortableContext
                        items={ocrBlocks.map(b => b.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {ocrBlocks.map((block) => (
                          <SortableTextBlock
                            key={block.id}
                            block={block}
                            isUsed={block.used || false}
                          />
                        ))}
                      </SortableContext>
                    </Box>
                  ) : !isProcessing ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'text.secondary' }}>
                      <Box>
                        <Upload sx={{ fontSize: 64, mb: 2 }} />
                        <Typography variant="body1">
                          No OCR text blocks available
                        </Typography>
                        <Typography variant="body2">
                          Upload an image to get started
                        </Typography>
                      </Box>
                    </Box>
                  ) : null}

                  {isProcessing && (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      <Box>
                        <LinearProgress sx={{ mb: 2, width: 200 }} />
                        <Typography variant="body2" color="text.secondary">
                          Processing image with OCR...
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>

          <DragOverlay>
            {activeId ? (
              <Paper sx={{ p: 2, opacity: 0.8, transform: 'rotate(5deg)' }}>
                <Typography variant="body2">
                  {ocrBlocks.find(b => b.id === activeId)?.text}
                </Typography>
              </Paper>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Mapped Record Preview
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Chip label={`${selectedTemplate} Record`} color="primary" />
              <Chip label={`${completedMappings} fields mapped`} sx={{ ml: 1 }} />
            </Box>
            
            {Object.entries(fieldMappings)
              .filter(([_, mapping]) => mapping && mapping.correctedText.trim())
              .map(([fieldName, mapping]) => (
                <Box key={fieldName} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {mapping!.correctedText}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {mapping!.confidence && (
                      <Chip
                        label={`${Math.round(mapping!.confidence * 100)}% confidence`}
                        size="small"
                        color={mapping!.confidence > 0.8 ? 'success' : mapping!.confidence > 0.6 ? 'warning' : 'error'}
                      />
                    )}
                    {mapping!.isManuallyEdited && (
                      <Chip
                        label="Manually edited"
                        size="small"
                        color="info"
                      />
                    )}
                  </Box>
                </Box>
              ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button variant="contained" onClick={handleSubmit}>
              Submit Record
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default OcrCorrectionTool;
