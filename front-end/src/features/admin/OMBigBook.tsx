import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Chip,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import BigBookConsolePage from './BigBookConsolePage';
import { BigBookConsoleSettings, defaultSettings } from './BigBookSettings';
import EncryptedStoragePanel from './EncryptedStoragePanel';
import QuestionnairePreview from './QuestionnairePreview';
import OMAIDiscoveryPanel from './OMAIDiscoveryPanel';
import TSXComponentInstallWizard from './TSXComponentInstallWizard';
import MemoryManager from './MemoryManager';
import {
  Upload as UploadIcon,
  PlayArrow as PlayIcon,
  Delete as Trash2Icon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshCwIcon,
  CloudUpload as CloudUploadIcon,
  Memory as MemoryIcon,
  School as LearningIcon,
  Analytics as AnalyticsIcon,
  AutoMode as AIIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

import type {
  FileUpload,
  ConsoleOutput,
  BigBookSettings,
} from './OMBigBook/types';
import { getFileTypeFromExtension, getFileIcon, getFileTypeChip } from './OMBigBook/fileUtils';
import { processFiles } from './OMBigBook/fileProcessing';
import { useOMAIData } from './OMBigBook/useOMAIData';
import LearningDashboardPanel from './OMBigBook/LearningDashboardPanel';
import TrainingPathwaysPanel from './OMBigBook/TrainingPathwaysPanel';
import KnowledgeAnalyticsPanel from './OMBigBook/KnowledgeAnalyticsPanel';
import EthicsReasoningPanel from './OMBigBook/EthicsReasoningPanel';
import CustomComponentsPanel from './OMBigBook/CustomComponentsPanel';
import RegistryManagementPanel from './OMBigBook/RegistryManagementPanel';
import TrainingDialog from './OMBigBook/TrainingDialog';
import FoundationDetailsDialog from './OMBigBook/FoundationDetailsDialog';
import ImportsScriptsTab from './OMBigBook/ImportsScriptsTab';
import ConsoleOutputTab from './OMBigBook/ConsoleOutputTab';

const OMBigBook: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  // Existing state
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<ConsoleOutput[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileUpload | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<BigBookSettings>({
    databaseUser: 'root',
    databasePassword: '',
    useSudo: true,
    sudoPassword: '',
    defaultDatabase: 'omai_db',
    scriptTimeout: 30000,
    maxFileSize: 10485760 // 10MB
  });
  const [consoleSettings, setConsoleSettings] = useState<BigBookConsoleSettings>(defaultSettings);
  const [questionnairePreviewOpen, setQuestionnairePreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileUpload | null>(null);
  const [registries, setRegistries] = useState<any>(null);
  const [registriesLoading, setRegistriesLoading] = useState(false);
  const [registriesError, setRegistriesError] = useState<string | null>(null);
  const [tsxWizardOpen, setTsxWizardOpen] = useState(false);
  const [tsxFile, setTsxFile] = useState<File | null>(null);
  const [customComponents, setCustomComponents] = useState<any>(null);
  const [customComponentsLoading, setCustomComponentsLoading] = useState(false);
  const [selectedCustomComponent, setSelectedCustomComponent] = useState<string | null>(null);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [selectedFoundation, setSelectedFoundation] = useState<any>(null);
  const [foundationDialogOpen, setFoundationDialogOpen] = useState(false);

  // OMAI data hook
  const omai = useOMAIData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console to bottom
  const scrollToBottom = useCallback(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [consoleOutput, scrollToBottom]);

  // Load registries when tab is opened
  useEffect(() => {
    if (activeTab === 5) {
      loadRegistries();
    }
    if (activeTab === 6) {
      loadCustomComponents();
    }
  }, [activeTab]);

  // Load registries function
  const loadRegistries = async () => {
    setRegistriesLoading(true);
    setRegistriesError(null);

    try {
      const response = await fetch('/api/bigbook/registries', { credentials: 'include' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setRegistries(result.registries);
      } else {
        throw new Error(result.error || 'Failed to load registries');
      }
    } catch (error) {
      setRegistriesError(error instanceof Error ? error.message : 'Unknown error');
      addConsoleMessage('error', `Failed to load registries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRegistriesLoading(false);
    }
  };

  // Load custom components function
  const loadCustomComponents = async () => {
    setCustomComponentsLoading(true);

    try {
      const response = await fetch('/api/bigbook/custom-components-registry', { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();
        setCustomComponents(data);
        addConsoleMessage('success', `Loaded ${Object.keys(data.components || {}).length} custom components`);
      } else {
        throw new Error('Failed to load custom components');
      }
    } catch (error) {
      console.error('Error loading custom components:', error);
      addConsoleMessage('error', `Failed to load custom components: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCustomComponentsLoading(false);
    }
  };

  // Remove custom component function
  const handleRemoveCustomComponent = async (component: any) => {
    if (!window.confirm(`Are you sure you want to remove the component "${component.displayName || component.name}"? This action cannot be undone.`)) {
      return;
    }

    addConsoleMessage('info', `🗑️ Removing custom component: ${component.name}`);

    try {
      const installationResult = {
        componentName: component.name,
        installedPath: component.path,
        route: component.route,
        displayName: component.displayName,
        registryUpdated: true,
        menuUpdated: true
      };

      const response = await fetch('/api/bigbook/remove-bigbook-component', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installationResult })
      });

      const result = await response.json();

      if (result.success) {
        addConsoleMessage('success', `✅ Component "${component.name}" removed successfully`);
        if (result.menuUpdated) {
          addConsoleMessage('success', `🧩 Component removed from Big Book sidebar menu`);
        }
        await loadCustomComponents();
        if (selectedCustomComponent === component.name) {
          setSelectedCustomComponent(null);
        }
      } else {
        throw new Error(result.error || 'Failed to remove component');
      }
    } catch (error) {
      addConsoleMessage('error', `❌ Failed to remove component: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Toggle item status
  const toggleItemStatus = async (type: string, id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/bigbook/toggle-item/${type}/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setRegistries((prev: any) => ({
          ...prev,
          [type]: {
            ...prev[type],
            items: { ...prev[type].items, [id]: result.item }
          }
        }));
        addConsoleMessage('success', `Item ${enabled ? 'enabled' : 'disabled'}: ${result.item.name || result.item.displayName || id}`);
      } else {
        throw new Error(result.error || 'Failed to toggle item');
      }
    } catch (error) {
      addConsoleMessage('error', `Failed to toggle item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add console message
  const addConsoleMessage = (type: ConsoleOutput['type'], message: string, details?: string) => {
    const newMessage: ConsoleOutput = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      content: message,
      source: type === 'command' ? 'User' : 'System'
    };
    setConsoleOutput(prev => [...prev, newMessage]);
  };

  // File processing callbacks
  const fileCallbacks = {
    addConsoleMessage,
    setUploadedFiles,
    setTsxFile,
    setTsxWizardOpen,
  };

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    await processFiles(Array.from(e.dataTransfer.files), fileCallbacks);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(Array.from(e.target.files || []), fileCallbacks);
  };

  const executeFile = async (file: FileUpload) => {
    setIsExecuting(true);
    addConsoleMessage('command', `Executing: ${file.name}`);

    try {
      let content = file.content;
      if (file.encryptedPath) {
        try {
          const retrieveResponse = await fetch(`/api/bigbook/storage/file/${file.id}?encryptedPath=${encodeURIComponent(file.encryptedPath)}`);
          const retrieveResult = await retrieveResponse.json();

          if (retrieveResult.success) {
            content = retrieveResult.content;
          } else {
            throw new Error(`Failed to retrieve file from encrypted storage: ${retrieveResult.error}`);
          }
        } catch (retrieveError) {
          addConsoleMessage('error', `Failed to retrieve file from encrypted storage: ${file.name}`, retrieveError instanceof Error ? retrieveError.message : 'Unknown error');
          setIsExecuting(false);
          return;
        }
      }

      const response = await fetch('/api/bigbook/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, fileName: file.name, content, type: file.type, settings }),
      });

      const result = await response.json();

      if (result.success) {
        addConsoleMessage('success', `Execution completed: ${file.name}`, result.output);
      } else {
        addConsoleMessage('error', `Execution failed: ${file.name}`, result.error);
      }
    } catch (error) {
      addConsoleMessage('error', `Execution error: ${file.name}`, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExecuting(false);
    }
  };

  const removeFile = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);

    if (file?.encryptedPath) {
      try {
        const response = await fetch(`/api/bigbook/storage/file/${fileId}?encryptedPath=${encodeURIComponent(file.encryptedPath)}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
          setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
          addConsoleMessage('success', `File removed from encrypted storage: ${file.name}`);
        } else {
          addConsoleMessage('error', `Failed to remove file from encrypted storage: ${file.name} - ${result.error}`);
        }
      } catch (error) {
        addConsoleMessage('error', `Error removing file from encrypted storage: ${file.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      addConsoleMessage('info', 'File removed from list');
    }
  };

  const clearConsole = () => {
    setConsoleOutput([]);
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/bigbook/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        addConsoleMessage('success', 'Settings saved successfully');
        setShowSettings(false);
      } else {
        addConsoleMessage('error', 'Failed to save settings');
      }
    } catch (error) {
      addConsoleMessage('error', 'Error saving settings');
    }
  };

  const handleQuestionnairePreview = (file: FileUpload) => {
    if (!file.isQuestionnaire) {
      addConsoleMessage('warning', 'File is not a questionnaire');
      return;
    }
    setPreviewFile(file);
    setQuestionnairePreviewOpen(true);
    addConsoleMessage('info', `Opening questionnaire preview: ${file.questionnaireMetadata?.title || file.name}`);
  };

  const handleQuestionnaireSubmit = async (submission: any) => {
    try {
      addConsoleMessage('info', `Submitting questionnaire responses: ${submission.questionnaireTitle}`);

      const response = await fetch('/api/bigbook/submit-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      const result = await response.json();

      if (result.success) {
        addConsoleMessage('success', `Questionnaire submitted successfully (${result.action}): ${submission.questionnaireTitle}`,
          `Response ID: ${result.responseId}\nResponses: ${submission.responses.length} answers`);
      } else {
        addConsoleMessage('error', `Failed to submit questionnaire: ${result.error}`);
      }
    } catch (error) {
      addConsoleMessage('error', `Error submitting questionnaire: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <AIIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            OMAI Learning Hub
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive OMAI learning, memory management, and progress tracking
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setShowSettings(!showSettings)}
        >
          Settings
        </Button>
      </Stack>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Learning Dashboard" icon={<PsychologyIcon />} iconPosition="start" />
          <Tab label="Training Pathways" icon={<LearningIcon />} iconPosition="start" />
          <Tab label="Memory Management" icon={<MemoryIcon />} iconPosition="start" />
          <Tab label="Knowledge Analytics" icon={<AnalyticsIcon />} iconPosition="start" />
          <Tab label="Ethics & Reasoning" icon={<PsychologyIcon />} iconPosition="start" />
          <Tab label="OMAI Discovery" icon={<AIIcon />} iconPosition="start" />
          <Tab label="Imports & Scripts" />
          <Tab label="File Console" />
          <Tab label="Console" />
          <Tab label="Encrypted Storage" />
          <Tab label="Registry Management" />
          <Tab label="Custom Components" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <LearningDashboardPanel
              learningProgress={omai.learningProgress}
              activeTrainingSession={omai.activeTrainingSession}
              learningLoading={omai.learningLoading}
              refreshOMAIData={omai.refreshOMAIData}
              setTrainingDialogOpen={setTrainingDialogOpen}
              stopTrainingSession={omai.stopTrainingSession}
            />
          )}
          {activeTab === 1 && (
            <TrainingPathwaysPanel
              trainingSessions={omai.trainingSessions}
              activeTrainingSession={omai.activeTrainingSession}
              learningLoading={omai.learningLoading}
              setSelectedTrainingPhase={omai.setSelectedTrainingPhase}
              setTrainingDialogOpen={setTrainingDialogOpen}
            />
          )}
          {activeTab === 2 && <MemoryManager />}
          {activeTab === 3 && (
            <KnowledgeAnalyticsPanel
              knowledgeMetrics={omai.knowledgeMetrics}
              learningProgress={omai.learningProgress}
            />
          )}
          {activeTab === 4 && (
            <EthicsReasoningPanel
              ethicsProgress={omai.ethicsProgress}
              ethicalFoundations={omai.ethicalFoundations}
              omlearnSurveys={omai.omlearnSurveys}
              ethicsLoading={omai.ethicsLoading}
              refreshOMAIData={omai.refreshOMAIData}
              setSelectedFoundation={setSelectedFoundation}
              setFoundationDialogOpen={setFoundationDialogOpen}
              importOMLearnResponses={omai.importOMLearnResponses}
            />
          )}
          {activeTab === 5 && <OMAIDiscoveryPanel />}

          {activeTab === 6 && (
            <ImportsScriptsTab
              showSettings={showSettings}
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettings}
              uploadedFiles={uploadedFiles}
              isExecuting={isExecuting}
              fileInputRef={fileInputRef}
              onFileDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onFileInputChange={handleFileInputChange}
              onExecuteFile={executeFile}
              onRemoveFile={removeFile}
            />
          )}

          {activeTab === 7 && (
            <BigBookConsolePage
              files={uploadedFiles}
              consoleOutput={consoleOutput}
              isExecuting={isExecuting}
              onFileSelect={setSelectedFile}
              onFileExecute={executeFile}
              onFileDelete={removeFile}
              onQuestionnairePreview={handleQuestionnairePreview}
              onClearConsole={clearConsole}
              selectedFile={selectedFile}
            />
          )}

          {activeTab === 8 && (
            <ConsoleOutputTab
              consoleOutput={consoleOutput}
              consoleRef={consoleRef}
              clearConsole={clearConsole}
            />
          )}

          {activeTab === 9 && <EncryptedStoragePanel />}

          {activeTab === 10 && (
            <RegistryManagementPanel
              registriesLoading={registriesLoading}
              registriesError={registriesError}
              registries={registries}
              loadRegistries={loadRegistries}
              toggleItemStatus={toggleItemStatus}
            />
          )}

          {activeTab === 11 && (
            <CustomComponentsPanel
              customComponentsLoading={customComponentsLoading}
              customComponents={customComponents}
              selectedCustomComponent={selectedCustomComponent}
              setSelectedCustomComponent={setSelectedCustomComponent}
              loadCustomComponents={loadCustomComponents}
              handleRemoveCustomComponent={handleRemoveCustomComponent}
              addConsoleMessage={addConsoleMessage}
            />
          )}
        </Box>
      </Paper>

      <QuestionnairePreview
        open={questionnairePreviewOpen}
        onClose={() => {
          setQuestionnairePreviewOpen(false);
          setPreviewFile(null);
        }}
        file={previewFile}
        onSubmit={handleQuestionnaireSubmit}
      />

      <TSXComponentInstallWizard
        open={tsxWizardOpen}
        onClose={() => {
          setTsxWizardOpen(false);
          setTsxFile(null);
        }}
        file={tsxFile}
        onInstallComplete={(result) => {
          addConsoleMessage('success', `Component installation completed: ${result.componentName}`);
          if (result.previewUrl) {
            addConsoleMessage('info', `Preview available at: ${result.previewUrl}`);
          }
        }}
        onConsoleMessage={addConsoleMessage}
      />

      <TrainingDialog
        open={trainingDialogOpen}
        onClose={() => setTrainingDialogOpen(false)}
        selectedPhase={omai.selectedTrainingPhase}
        onPhaseSelect={omai.setSelectedTrainingPhase}
        onStart={omai.startTrainingSession}
        loading={omai.learningLoading}
      />

      <FoundationDetailsDialog
        open={foundationDialogOpen}
        onClose={() => setFoundationDialogOpen(false)}
        foundation={selectedFoundation}
      />
    </Box>
  );

};

export default OMBigBook;
