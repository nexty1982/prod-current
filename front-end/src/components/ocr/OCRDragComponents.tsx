import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import {
  DragIndicator,
  Close,
  CheckCircle,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';

interface OcrBlock {
  id: string;
  text: string;
  confidence: number;
  boundingBox?: any;
  sourceLineNumber?: number;
  used?: boolean;
}

interface DroppableFieldProps {
  fieldName: string;
  assigned: any;
  onAssign: (fieldName: string, blockId: string) => void;
  onClear?: (fieldName: string) => void;
}

interface SortableTextBlockProps {
  block: OcrBlock;
  isUsed?: boolean;
}

export const DroppableField: React.FC<DroppableFieldProps> = ({
  fieldName,
  assigned,
  onAssign,
  onClear
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `field-${fieldName}`,
  });

  const displayName = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Card
      ref={setNodeRef}
      sx={{
        mb: 2,
        border: '2px dashed',
        borderColor: isOver ? 'primary.main' : assigned ? 'success.main' : 'grey.300',
        bgcolor: isOver ? 'primary.50' : assigned ? 'success.50' : 'white',
        transition: 'all 0.2s ease',
        minHeight: 80
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
            {displayName}
          </Typography>
          {assigned && onClear && (
            <IconButton
              size="small"
              onClick={() => onClear(fieldName)}
              sx={{ ml: 1 }}
            >
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>

        {assigned ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {assigned.text}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`${Math.round(assigned.confidence * 100)}% confidence`}
                size="small"
                color={assigned.confidence > 0.8 ? 'success' : assigned.confidence > 0.6 ? 'warning' : 'error'}
                icon={
                  assigned.confidence > 0.8 ? <CheckCircle sx={{ fontSize: 14 }} /> :
                  assigned.confidence > 0.6 ? <Warning sx={{ fontSize: 14 }} /> :
                  <ErrorIcon sx={{ fontSize: 14 }} />
                }
              />
              {assigned.sourceLineNumber && (
                <Chip
                  label={`Line ${assigned.sourceLineNumber}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              mt: 1,
              p: 2,
              textAlign: 'center',
              color: 'text.secondary',
              border: '1px dashed',
              borderColor: 'grey.300',
              borderRadius: 1,
              minHeight: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="body2">
              {isOver ? 'Drop here' : 'Drag OCR text here'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export const SortableTextBlock: React.FC<SortableTextBlockProps> = ({ 
  block, 
  isUsed = false 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: block.id,
    disabled: isUsed
  });

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
        border: isDragging ? '2px dashed' : '1px solid',
        borderColor: isDragging ? 'primary.main' : isUsed ? 'grey.300' : 'grey.200',
        '&:hover': {
          borderColor: isUsed ? 'grey.300' : 'primary.main',
          boxShadow: isUsed ? 'none' : 2,
          transform: isUsed ? 'none' : 'translateY(-2px)'
        },
        '&:active': {
          cursor: isUsed ? 'not-allowed' : 'grabbing'
        },
        transition: 'all 0.2s ease'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <DragIndicator 
          sx={{ 
            color: isUsed ? 'grey.400' : 'grey.600', 
            fontSize: 16,
            mt: 0.5
          }} 
        />
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 'medium',
              color: isUsed ? 'text.secondary' : 'text.primary',
              lineHeight: 1.4
            }}
          >
            {block.text}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${Math.round(block.confidence * 100)}%`}
              size="small"
              color={block.confidence > 0.8 ? 'success' : block.confidence > 0.6 ? 'warning' : 'error'}
              variant={isUsed ? 'outlined' : 'filled'}
            />
            {block.sourceLineNumber && (
              <Chip
                label={`Line ${block.sourceLineNumber}`}
                size="small"
                variant="outlined"
                color="default"
              />
            )}
            {isUsed && (
              <Chip
                label="Used"
                size="small"
                color="success"
                variant="outlined"
                icon={<CheckCircle sx={{ fontSize: 14 }} />}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};
