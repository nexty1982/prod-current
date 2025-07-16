/**
 * OCR Text Block List Component
 * Displays OCR text with confidence scores and allows field number assignment
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Badge,
  Alert
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { OcrTextLine } from './utils/ocrRowSplitter';

interface OcrTextBlockListProps {
  ocrLines: OcrTextLine[];
  usedLines: Set<number>;
  onLineSelect: (lineIndex: number, recordIndex: number, fieldName: string) => void;
  currentMappings: Map<number, { recordIndex: number; fieldName: string }>;
  onReset: () => void;
  hideUsedLines?: boolean;
  className?: string;
}

const FIELD_OPTIONS = [
  { value: 'death_date', label: 'Death Date', color: '#e3f2fd' },
  { value: 'burial_date', label: 'Burial Date', color: '#f3e5f5' },
  { value: 'name', label: 'Name', color: '#e8f5e8' },
  { value: 'age', label: 'Age', color: '#fff3e0' },
  { value: 'priest_officiated', label: 'Priest (Officiated)', color: '#e1f5fe' },
  { value: 'burial_location', label: 'Burial Location', color: '#f9fbe7' }
];

export const OcrTextBlockList: React.FC<OcrTextBlockListProps> = ({
  ocrLines,
  usedLines,
  onLineSelect,
  currentMappings,
  onReset,
  hideUsedLines = true,
  className = ''
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [showOnlyUnused, setShowOnlyUnused] = useState(false);
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number>(1);

  // Filter lines based on search, usage, and hide settings
  const filteredLines = useMemo(() => {
    return ocrLines.filter((line, index) => {
      const matchesSearch = !searchFilter || 
        line.text.toLowerCase().includes(searchFilter.toLowerCase());
      
      const isUsed = usedLines.has(index);
      const matchesUsage = !showOnlyUnused || !isUsed;
      
      // If hideUsedLines is true, don't show used lines at all
      const shouldShow = hideUsedLines ? !isUsed : matchesUsage;
      
      return matchesSearch && shouldShow;
    });
  }, [ocrLines, searchFilter, showOnlyUnused, usedLines, hideUsedLines]);

  const handleAssignLine = (lineIndex: number) => {
    if (selectedField && selectedRecordIndex) {
      onLineSelect(lineIndex, selectedRecordIndex - 1, selectedField);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'error';
  };

  const getFieldColor = (fieldName: string) => {
    const field = FIELD_OPTIONS.find(f => f.value === fieldName);
    return field?.color || '#f5f5f5';
  };

  return (
    <Box className={`ocr-text-block-list ${className}`}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          OCR Text Blocks
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Assign text blocks to record fields by selecting a field and record number
        </Typography>
        
        {/* Assignment Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Field Type</InputLabel>
            <Select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              label="Field Type"
            >
              {FIELD_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        backgroundColor: option.color,
                        borderRadius: '50%',
                        border: '1px solid #ddd'
                      }}
                    />
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            type="number"
            label="Record #"
            value={selectedRecordIndex}
            onChange={(e) => setSelectedRecordIndex(Number(e.target.value))}
            inputProps={{ min: 1, max: 20 }}
            sx={{ width: 100 }}
          />
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search text..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            }}
            sx={{ minWidth: 200 }}
          />
          
          {!hideUsedLines && (
            <Tooltip title={showOnlyUnused ? "Show all lines" : "Show only unused lines"}>
              <IconButton
                onClick={() => setShowOnlyUnused(!showOnlyUnused)}
                color={showOnlyUnused ? "primary" : "default"}
              >
                {showOnlyUnused ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Reset all assignments">
            <IconButton
              onClick={onReset}
              color="warning"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Typography variant="body2" color="text.secondary">
            {filteredLines.length} of {ocrLines.length} lines
            {hideUsedLines && usedLines.size > 0 && (
              <> • {usedLines.size} used (hidden)</>
            )}
          </Typography>
        </Box>

        {/* Assignment Instructions */}
        {selectedField && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Click on any text block below to assign it to <strong>{FIELD_OPTIONS.find(f => f.value === selectedField)?.label}</strong> in <strong>Record #{selectedRecordIndex}</strong>
          </Alert>
        )}
      </Box>

      {/* OCR Lines List */}
      <Box sx={{ 
        maxHeight: '60vh', 
        overflowY: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: 1
      }}>
        {filteredLines.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No OCR text blocks found matching your criteria
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 1 }}>
            {filteredLines.map((line) => {
              const isUsed = usedLines.has(line.index);
              const mapping = currentMappings.get(line.index);
              const canAssign = selectedField && selectedRecordIndex;

              return (
                <Card
                  key={line.index}
                  sx={{
                    mb: 1,
                    cursor: canAssign ? 'pointer' : 'default',
                    opacity: isUsed ? 0.6 : 1,
                    backgroundColor: mapping ? getFieldColor(mapping.fieldName) : 'white',
                    border: mapping ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    '&:hover': canAssign ? {
                      boxShadow: 2,
                      backgroundColor: mapping ? getFieldColor(mapping.fieldName) : '#f5f5f5'
                    } : {}
                  }}
                  onClick={() => canAssign && handleAssignLine(line.index)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, mr: 2 }}>
                        {/* Line number and text */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Badge
                            badgeContent={line.index}
                            color="primary"
                            sx={{
                              '& .MuiBadge-badge': {
                                fontSize: '0.75rem',
                                minWidth: '20px',
                                height: '20px'
                              }
                            }}
                          >
                            <Box sx={{ width: 8 }} />
                          </Badge>
                          
                          <Typography
                            variant="body1"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.9rem',
                              fontWeight: isUsed ? 'normal' : 'medium'
                            }}
                          >
                            {line.text}
                          </Typography>
                        </Box>

                        {/* Confidence and mapping info */}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Chip
                            label={`${Math.round(line.confidence * 100)}%`}
                            size="small"
                            color={getConfidenceColor(line.confidence)}
                            sx={{ fontSize: '0.75rem' }}
                          />
                          
                          {mapping && (
                            <Chip
                              label={`Record ${mapping.recordIndex + 1} → ${FIELD_OPTIONS.find(f => f.value === mapping.fieldName)?.label}`}
                              size="small"
                              color="primary"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                          
                          {isUsed && !mapping && (
                            <Chip
                              label="Used"
                              size="small"
                              color="default"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                      </Box>

                      {/* Action buttons */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {canAssign && !isUsed && (
                          <Tooltip title={`Assign to ${FIELD_OPTIONS.find(f => f.value === selectedField)?.label}`}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignLine(line.index);
                              }}
                            >
                              <AssignmentIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {mapping && (
                          <Tooltip title="Clear assignment">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Note: You'll need to implement clear functionality
                                console.log('Clear assignment for line', line.index);
                              }}
                            >
                              <ClearIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Statistics */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>{usedLines.size}</strong> of <strong>{ocrLines.length}</strong> lines assigned •{' '}
          <strong>{ocrLines.length - usedLines.size}</strong> remaining •{' '}
          Average confidence: <strong>{Math.round(ocrLines.reduce((sum, line) => sum + line.confidence, 0) / ocrLines.length * 100)}%</strong>
        </Typography>
      </Box>
    </Box>
  );
};
