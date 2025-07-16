/**
 * OCR Record Mapper - Advanced Interface
 * 
 * Complete OCR correction interface with:
 * - Smart suggestions from historical mappings
 * - Field template management
 * - Drag and drop text mapping
 * - Confidence scoring and validation
 * - Export and learning capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Alert,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Upload,
  Save,
  Download,
  Refresh,
  AutoAwesome,
  Visibility,
  Analytics,
  Settings,
  Close,
  CheckCircle,
  Warning,
  TrendingUp,
  Psychology,
  FileUpload,
  Send
} from '@mui/icons-material';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { OcrCorrectionTool } from './OcrCorrectionTool';
import { FieldTemplateSelector } from './FieldTemplateSelector';
import { SmartSuggestionEngine } from './SmartSuggestionEngine';

interface FieldSuggestion {
  fieldName: string;
  confidence: number;
  reason: string;
  source: 'pattern' | 'history' | 'similarity';
}

interface OcrRecordMapperProps {
  churchId: string;
  userEmail?: string;
  onSubmit?: (mappedRecord: any) => void;
  onClose?: () => void;
}

interface MappingSession {
  id: string;
  template: string;
  imageFile?: File;
  ocrBlocks: any[];
  mappings: Record<string, any>;
  suggestions: Record<string, FieldSuggestion[]>;
  startTime: string;
  lastActivity: string;
  isComplete: boolean;
}

export const OcrRecordMapper: React.FC<OcrRecordMapperProps> = ({
  churchId,
  userEmail,
  onSubmit,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [currentSession, setCurrentSession] = useState<MappingSession | null>(null);
  const [suggestionEngine] = useState(() => new SmartSuggestionEngine(churchId));
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [mappingStats, setMappingStats] = useState<any>(null);

  // Initialize session
  const createNewSession = (template: string = 'baptism') => {
    const session: MappingSession = {
      id: `session_${Date.now()}`,
      template,
      ocrBlocks: [],
      mappings: {},
      suggestions: {},
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isComplete: false
    };
    setCurrentSession(session);
    return session;
  };

  // Load mapping statistics
  useEffect(() => {
    const stats = suggestionEngine.getMappingStats();
    setMappingStats(stats);
  }, [suggestionEngine]);

  // Auto-save session periodically
  useEffect(() => {
    if (currentSession) {
      const interval = setInterval(() => {
        localStorage.setItem(`ocr-session-${currentSession.id}`, JSON.stringify(currentSession));
      }, 30000); // Save every 30 seconds

      return () => clearInterval(interval);
    }
  }, [currentSession]);

  const handleTemplateChange = (templateKey: string, fields: string[]) => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        template: templateKey,
        lastActivity: new Date().toISOString()
      });
    } else {
      createNewSession(templateKey);
    }
  };

  const handleOcrComplete = useCallback((ocrBlocks: any[]) => {
    if (!currentSession) return;

    const updatedSession = {
      ...currentSession,
      ocrBlocks,
      lastActivity: new Date().toISOString()
    };

    // Generate smart suggestions for each OCR block
    if (autoSuggestEnabled) {
      const template = currentSession.template;
      const availableFields = getFieldsForTemplate(template);
      const suggestions: Record<string, FieldSuggestion[]> = {};

      ocrBlocks.forEach(block => {
        const blockSuggestions = suggestionEngine.getSuggestionsForText(block.text, availableFields);
        if (blockSuggestions.length > 0) {
          suggestions[block.id] = blockSuggestions;
        }
      });

      updatedSession.suggestions = suggestions;
    }

    setCurrentSession(updatedSession);
  }, [currentSession, autoSuggestEnabled, suggestionEngine]);

  const handleMappingChange = (fieldName: string, ocrBlock: any, correctedText?: string) => {
    if (!currentSession) return;

    const mapping = {
      fieldName,
      ocrBlockId: ocrBlock.id,
      ocrText: ocrBlock.text,
      correctedText: correctedText || ocrBlock.text,
      confidence: ocrBlock.confidence,
      isManuallyEdited: !!correctedText && correctedText !== ocrBlock.text,
      timestamp: new Date().toISOString()
    };

    const updatedMappings = {
      ...currentSession.mappings,
      [fieldName]: mapping
    };

    setCurrentSession({
      ...currentSession,
      mappings: updatedMappings,
      lastActivity: new Date().toISOString()
    });

    // Record mapping for learning
    suggestionEngine.recordMapping(
      ocrBlock.text,
      fieldName,
      ocrBlock.confidence,
      mapping.isManuallyEdited,
      correctedText
    );
  };

  const handleSubmitMapping = () => {
    if (!currentSession) return;

    const mappedRecord = {
      sessionId: currentSession.id,
      template: currentSession.template,
      churchId,
      userEmail,
      mappings: Object.values(currentSession.mappings),
      rawOcr: currentSession.ocrBlocks,
      suggestions: currentSession.suggestions,
      metadata: {
        startTime: currentSession.startTime,
        completionTime: new Date().toISOString(),
        autoSuggestUsed: autoSuggestEnabled,
        totalMappings: Object.keys(currentSession.mappings).length
      }
    };

    // Mark session as complete
    const completedSession = {
      ...currentSession,
      isComplete: true,
      lastActivity: new Date().toISOString()
    };
    setCurrentSession(completedSession);

    if (onSubmit) {
      onSubmit(mappedRecord);
    } else {
      console.log('Mapped Record:', mappedRecord);
      alert('✅ Record mapping completed successfully!\n\nCheck console for details.');
    }
  };

  const exportMappingData = () => {
    const exportData = {
      session: currentSession,
      mappingHistory: suggestionEngine.exportMappingHistory(),
      exported: new Date().toISOString(),
      churchId,
      userEmail
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-mapping-export-${churchId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFieldsForTemplate = (template: string): string[] => {
    const templates: Record<string, string[]> = {
      baptism: ['child_name', 'baptism_date', 'birth_date', 'father_name', 'mother_name', 'godfather_name', 'godmother_name', 'priest_name', 'church_location', 'notes'],
      marriage: ['groom_name', 'bride_name', 'marriage_date', 'groom_age', 'bride_age', 'witness_1', 'witness_2', 'priest_name', 'church_location', 'notes'],
      funeral: ['deceased_name', 'death_date', 'burial_date', 'age', 'cause_of_death', 'priest_administered', 'priest_officiated', 'burial_location', 'notes']
    };
    return templates[template] || templates.baptism;
  };

  const renderStatsTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          OCR Mapping Analytics
        </Typography>

        {mappingStats && (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
              <Box>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {mappingStats.totalMappings}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Mappings
                  </Typography>
                </Paper>
              </Box>
              <Box>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {Math.round(mappingStats.editRate)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manual Edit Rate
                  </Typography>
                </Paper>
              </Box>
              <Box>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {Math.round(mappingStats.avgConfidence * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Confidence
                  </Typography>
                </Paper>
              </Box>
              <Box>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {Object.keys(mappingStats.fieldFrequency).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unique Fields
                  </Typography>
                </Paper>
              </Box>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Most Frequently Mapped Fields:
            </Typography>
            <List>
              {Object.entries(mappingStats.fieldFrequency)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([field, count]) => (
                  <ListItem key={field}>
                    <ListItemIcon>
                      <TrendingUp />
                    </ListItemIcon>
                    <ListItemText
                      primary={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      secondary={`${count} mappings`}
                    />
                  </ListItem>
                ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderSettingsTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          OCR Mapping Settings
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoSuggestEnabled}
                onChange={(e) => setAutoSuggestEnabled(e.target.checked)}
              />
            }
            label="Enable Smart Suggestions"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
            Automatically suggest field mappings based on historical data and patterns
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom>
          Data Management:
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportMappingData}
          >
            Export Mapping Data
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Analytics />}
            onClick={() => setStatsDialogOpen(true)}
          >
            View Analytics
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              setMappingStats(suggestionEngine.getMappingStats());
            }}
          >
            Refresh Stats
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Box sx={{ maxWidth: '8xl', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
              OCR Record Mapper
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Intelligent mapping tool for Orthodox church records with AI-powered suggestions
            </Typography>
          </Box>
          {onClose && (
            <IconButton onClick={onClose} size="large">
              <Close />
            </IconButton>
          )}
        </Box>

        {/* Session Status */}
        {currentSession && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    Session: {currentSession.template.charAt(0).toUpperCase() + currentSession.template.slice(1)} Record
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Started: {new Date(currentSession.startTime).toLocaleString()} • 
                    Mappings: {Object.keys(currentSession.mappings).length} • 
                    OCR Blocks: {currentSession.ocrBlocks.length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {autoSuggestEnabled && Object.keys(currentSession.suggestions).length > 0 && (
                    <Chip
                      icon={<Psychology />}
                      label={`${Object.keys(currentSession.suggestions).length} AI suggestions`}
                      color="secondary"
                      size="small"
                    />
                  )}
                  <Chip
                    icon={currentSession.isComplete ? <CheckCircle /> : <Warning />}
                    label={currentSession.isComplete ? 'Complete' : 'In Progress'}
                    color={currentSession.isComplete ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Main Interface */}
        <Paper sx={{ width: '100%' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab 
              icon={<FileUpload />} 
              label="OCR Mapping" 
              iconPosition="start"
            />
            <Tab 
              icon={<Settings />} 
              label="Template Config" 
              iconPosition="start"
            />
            <Tab 
              icon={<Analytics />} 
              label="Analytics" 
              iconPosition="start"
            />
            <Tab 
              icon={<Settings />} 
              label="Settings" 
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Box>
                {!currentSession ? (
                  <Card sx={{ textAlign: 'center', py: 6 }}>
                    <CardContent>
                      <Upload sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Start OCR Mapping Session
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Create a new session to begin mapping OCR text to structured record fields
                      </Typography>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => createNewSession()}
                        startIcon={<FileUpload />}
                      >
                        Create New Session
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <OcrCorrectionTool
                    churchId={churchId}
                    onSubmit={handleSubmitMapping}
                    initialTemplate={currentSession.template}
                  />
                )}
              </Box>
            )}

            {activeTab === 1 && (
              <FieldTemplateSelector
                selectedTemplate={currentSession?.template || 'baptism'}
                onTemplateChange={handleTemplateChange}
                churchId={churchId}
              />
            )}

            {activeTab === 2 && renderStatsTab()}

            {activeTab === 3 && renderSettingsTab()}
          </Box>
        </Paper>

        {/* Action Buttons */}
        {currentSession && !currentSession.isComplete && activeTab === 0 && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Send />}
              onClick={handleSubmitMapping}
              disabled={Object.keys(currentSession.mappings).length === 0}
            >
              Submit Mapped Record
            </Button>
          </Box>
        )}

        {/* Analytics Dialog */}
        <Dialog
          open={statsDialogOpen}
          onClose={() => setStatsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            OCR Mapping Analytics
          </DialogTitle>
          <DialogContent>
            {renderStatsTab()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatsDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default OcrRecordMapper;
