/**
 * Editable Record Row Component
 * Single row representing one death record with editable fields
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Typography,
  Button,
  Autocomplete,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { DeathRecord, FieldMapping, MappingStateManager } from './MappingState';

interface EditableRecordRowProps {
  record: DeathRecord;
  recordIndex: number;
  onUpdateField: (fieldName: keyof DeathRecord, value: string) => void;
  onDeleteRecord: () => void;
  onClearFieldMapping: (fieldName: keyof DeathRecord) => void;
  fieldSuggestions: Record<string, string[]>;
  onSaveSuggestion: (fieldName: keyof DeathRecord, value: string) => void;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

const FIELD_CONFIGS = [
  { 
    key: 'death_date' as const, 
    label: 'Death Date', 
    placeholder: 'MM/DD/YYYY',
    width: 120,
    required: true,
    type: 'date-text'
  },
  { 
    key: 'burial_date' as const, 
    label: 'Burial Date', 
    placeholder: 'MM/DD/YYYY',
    width: 120,
    required: false,
    type: 'date-text'
  },
  { 
    key: 'name' as const, 
    label: 'Full Name', 
    placeholder: 'John Smith',
    width: 200,
    required: true,
    type: 'text'
  },
  { 
    key: 'age' as const, 
    label: 'Age', 
    placeholder: '80',
    width: 80,
    required: false,
    type: 'number'
  },
  { 
    key: 'priest_officiated' as const, 
    label: 'Priest (Officiated)', 
    placeholder: 'Fr. Michael',
    width: 160,
    required: false,
    type: 'autocomplete'
  },
  { 
    key: 'burial_location' as const, 
    label: 'Burial Location', 
    placeholder: 'Cemetery plot #1',
    width: 200,
    required: false,
    type: 'autocomplete'
  }
];

export const EditableRecordRow: React.FC<EditableRecordRowProps> = ({
  record,
  recordIndex,
  onUpdateField,
  onDeleteRecord,
  onClearFieldMapping,
  fieldSuggestions,
  onSaveSuggestion,
  isEditing = false,
  onToggleEdit,
  isLocked = false,
  onToggleLock,
  isCollapsed = false,
  onToggleCollapse,
  className = ''
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [pendingValues, setPendingValues] = useState<Record<string, string>>({});

  // Calculate record completeness
  const completeness = MappingStateManager.getRecordCompleteness(record);
  const validation = MappingStateManager.validateRecord(record);

  const handleFieldEdit = useCallback((fieldKey: string, value: string) => {
    setPendingValues(prev => ({ ...prev, [fieldKey]: value }));
  }, []);

  const handleFieldSave = useCallback((fieldKey: string) => {
    const newValue = pendingValues[fieldKey] || '';
    onUpdateField(fieldKey as keyof DeathRecord, newValue);
    
    // Save suggestion if it's a new value
    if (newValue.trim() && FIELD_CONFIGS.find(f => f.key === fieldKey)?.type === 'autocomplete') {
      onSaveSuggestion(fieldKey as keyof DeathRecord, newValue.trim());
    }
    
    setEditingField(null);
    setPendingValues(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  }, [pendingValues, onUpdateField, onSaveSuggestion]);

  const handleFieldCancel = useCallback((fieldKey: string) => {
    setEditingField(null);
    setPendingValues(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  }, []);

  const getFieldValue = (fieldKey: string): string => {
    if (editingField === fieldKey) {
      return pendingValues[fieldKey] ?? '';
    }
    
    const field = record[fieldKey as keyof DeathRecord] as FieldMapping | null;
    return field?.value || '';
  };

  const getFieldMapping = (fieldKey: string): FieldMapping | null => {
    return record[fieldKey as keyof DeathRecord] as FieldMapping | null;
  };

  const renderField = (config: typeof FIELD_CONFIGS[0]) => {
    const fieldValue = getFieldValue(config.key);
    const fieldMapping = getFieldMapping(config.key);
    const isCurrentlyEditing = editingField === config.key;
    const suggestions = fieldSuggestions[config.key] || [];

    const fieldElement = (
      <Box key={config.key} sx={{ position: 'relative' }}>
        {/* Field Label with Confidence Indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {config.label}
            {config.required && <span style={{ color: 'red' }}>*</span>}
          </Typography>
          
          {fieldMapping && fieldMapping.sourceLine >= 0 && (
            <Tooltip title={`From OCR line ${fieldMapping.sourceLine} (${Math.round(fieldMapping.confidence * 100)}% confidence)`}>
              <Chip
                label={`${Math.round(fieldMapping.confidence * 100)}%`}
                size="small"
                color={fieldMapping.confidence >= 0.8 ? 'success' : fieldMapping.confidence >= 0.6 ? 'warning' : 'error'}
                sx={{ height: 16, fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}
          
          {fieldMapping?.isEdited && (
            <Tooltip title="Manually edited">
              <EditIcon sx={{ fontSize: 12, color: 'info.main' }} />
            </Tooltip>
          )}
        </Box>

        {/* Input Field */}
        {isCurrentlyEditing && !isLocked ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {config.type === 'autocomplete' ? (
              <Autocomplete
                value={fieldValue}
                onInputChange={(_, value) => handleFieldEdit(config.key, value)}
                options={suggestions}
                freeSolo
                size="small"
                sx={{ width: config.width }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={config.placeholder}
                    variant="outlined"
                    size="small"
                    autoFocus
                  />
                )}
              />
            ) : (
              <TextField
                value={fieldValue}
                onChange={(e) => handleFieldEdit(config.key, e.target.value)}
                placeholder={config.placeholder}
                variant="outlined"
                size="small"
                type={config.type === 'number' ? 'number' : 'text'}
                sx={{ width: config.width }}
                autoFocus
              />
            )}
            
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleFieldSave(config.key)}
            >
              <SaveIcon sx={{ fontSize: 16 }} />
            </IconButton>
            
            <IconButton
              size="small"
              color="error"
              onClick={() => handleFieldCancel(config.key)}
            >
              <CancelIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              minHeight: 32,
              p: 1,
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              backgroundColor: isLocked ? '#f0f0f0' : (fieldValue ? 'white' : '#f9f9f9'),
              cursor: isLocked ? 'default' : 'pointer',
              opacity: isLocked ? 0.7 : 1,
              '&:hover': isLocked ? {} : {
                backgroundColor: '#f5f5f5',
                borderColor: '#1976d2'
              }
            }}
            onClick={() => !isLocked && setEditingField(config.key)}
          >
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                color: fieldValue ? 'text.primary' : 'text.secondary',
                fontStyle: fieldValue ? 'normal' : 'italic'
              }}
            >
              {fieldValue || config.placeholder}
            </Typography>
            
            {fieldMapping && !isLocked && (
              <Tooltip title="Clear OCR mapping">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFieldMapping(config.key);
                  }}
                  sx={{ p: 0.25 }}
                >
                  <AssignmentIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    );

    return fieldElement;
  };

  return (
    <Card 
      className={`editable-record-row ${className}`}
      sx={{
        mb: 2,
        border: validation.isValid ? '1px solid #e0e0e0' : '2px solid #f44336',
        '&:hover': { boxShadow: 2 }
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Record Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge
              badgeContent={recordIndex + 1}
              color="primary"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '1rem',
                  minWidth: '24px',
                  height: '24px'
                }
              }}
            >
              <Box sx={{ width: 12 }} />
            </Badge>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                Funeral Record #{recordIndex + 1}
              </Typography>
              
              {/* Lock Status */}
              {isLocked && (
                <Chip
                  icon={<LockIcon sx={{ fontSize: 14 }} />}
                  label="Locked"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>
            
            {/* Completeness Indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={completeness}
                sx={{ width: 80, height: 6, borderRadius: 3 }}
                color={completeness >= 80 ? 'success' : completeness >= 50 ? 'warning' : 'error'}
              />
              <Typography variant="caption" color="text.secondary">
                {completeness}%
              </Typography>
            </Box>
            
            {/* Validation Status */}
            {validation.isValid ? (
              <Tooltip title="Record is valid">
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
              </Tooltip>
            ) : (
              <Tooltip title={`Validation errors: ${validation.errors.join(', ')}`}>
                <WarningIcon sx={{ color: 'error.main', fontSize: 20 }} />
              </Tooltip>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Collapse/Expand Button */}
            <Tooltip title={isCollapsed ? "Expand record" : "Collapse record"}>
              <IconButton
                size="small"
                onClick={onToggleCollapse}
                color="primary"
              >
                {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </IconButton>
            </Tooltip>

            {/* Lock/Unlock Button */}
            {validation.isValid && completeness >= 50 && (
              <Tooltip title={isLocked ? "Unlock record" : "Lock record"}>
                <IconButton
                  size="small"
                  onClick={onToggleLock}
                  color={isLocked ? "success" : "default"}
                >
                  {isLocked ? <LockIcon /> : <LockOpenIcon />}
                </IconButton>
              </Tooltip>
            )}
            
            {onToggleEdit && !isLocked && (
              <Button
                size="small"
                variant={isEditing ? "contained" : "outlined"}
                onClick={onToggleEdit}
                startIcon={<EditIcon />}
              >
                {isEditing ? 'Editing' : 'Edit'}
              </Button>
            )}
            
            <Tooltip title="Delete record">
              <IconButton
                size="small"
                color="error"
                onClick={onDeleteRecord}
                disabled={isLocked}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Fields Grid - Only show if not collapsed */}
        {!isCollapsed && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: 2 
          }}>
            {FIELD_CONFIGS.map(renderField)}
          </Box>
        )}

        {/* Collapsed View Summary */}
        {isCollapsed && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Name:</strong> {record.name?.value || 'Not set'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <strong>Death:</strong> {record.death_date?.value || 'Not set'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <strong>Burial:</strong> {record.burial_date?.value || 'Not set'}
            </Typography>
            {isLocked && (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                label="Complete"
                size="small"
                color="success"
              />
            )}
          </Box>
        )}

        {/* Validation Errors */}
        {!validation.isValid && (
          <Box sx={{ mt: 2 }}>
            {validation.errors.map((error, index) => (
              <Typography key={index} variant="caption" color="error" display="block">
                • {error}
              </Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
