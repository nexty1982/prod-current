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
  LearningProgress,
  TrainingSession,
  KnowledgeMetrics,
  EthicalFoundation,
  EthicsProgress,
  OMLearnSurvey,
} from './OMBigBook/types';
import { getFileTypeFromExtension, getFileIcon, getFileTypeChip } from './OMBigBook/fileUtils';
import LearningDashboardPanel from './OMBigBook/LearningDashboardPanel';
import TrainingPathwaysPanel from './OMBigBook/TrainingPathwaysPanel';
import KnowledgeAnalyticsPanel from './OMBigBook/KnowledgeAnalyticsPanel';
import EthicsReasoningPanel from './OMBigBook/EthicsReasoningPanel';
import CustomComponentsPanel from './OMBigBook/CustomComponentsPanel';
import RegistryManagementPanel from './OMBigBook/RegistryManagementPanel';
import TrainingDialog from './OMBigBook/TrainingDialog';
import FoundationDetailsDialog from './OMBigBook/FoundationDetailsDialog';

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
  
  // New OMAI state
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [knowledgeMetrics, setKnowledgeMetrics] = useState<KnowledgeMetrics | null>(null);
  const [activeTrainingSession, setActiveTrainingSession] = useState<TrainingSession | null>(null);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [selectedTrainingPhase, setSelectedTrainingPhase] = useState<string>('foundation');
  const [learningLoading, setLearningLoading] = useState(false);
  
  // Ethics & Reasoning state
  const [ethicsProgress, setEthicsProgress] = useState<EthicsProgress | null>(null);
  const [ethicalFoundations, setEthicalFoundations] = useState<EthicalFoundation[]>([]);
  const [omlearnSurveys, setOmlearnSurveys] = useState<OMLearnSurvey[]>([]);
  const [ethicsLoading, setEthicsLoading] = useState(false);
  const [selectedFoundation, setSelectedFoundation] = useState<EthicalFoundation | null>(null);
  const [foundationDialogOpen, setFoundationDialogOpen] = useState(false);
  
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

  // Load OMAI data on component mount
  useEffect(() => {
    loadLearningProgress();
    loadTrainingSessions();
    loadKnowledgeMetrics();
    loadEthicsProgress();
    loadEthicalFoundations();
    loadOMLearnSurveys();
  }, []);

  // New OMAI-specific functions
  const loadLearningProgress = async () => {
    try {
      const response = await fetch('/api/omai/learning-progress');
      const data = await response.json();
      if (data.success) {
        setLearningProgress(data.progress);
      }
    } catch (error) {
      console.error('Failed to load learning progress:', error);
    }
  };

  const loadTrainingSessions = async () => {
    try {
      const response = await fetch('/api/omai/training-sessions');
      const data = await response.json();
      if (data.success) {
        setTrainingSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load training sessions:', error);
    }
  };

  const loadKnowledgeMetrics = async () => {
    try {
      const response = await fetch('/api/omai/knowledge-metrics');
      const data = await response.json();
      if (data.success) {
        setKnowledgeMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to load knowledge metrics:', error);
    }
  };

  const startTrainingSession = async (phase: string) => {
    setLearningLoading(true);
    try {
      const response = await fetch('/api/omai/start-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase })
      });
      const data = await response.json();
      if (data.success) {
        setActiveTrainingSession(data.session);
        setTrainingDialogOpen(false);
        // Poll for progress updates
        const interval = setInterval(() => {
          loadTrainingSessions();
          loadLearningProgress();
        }, 5000);
        
        // Stop polling after 30 minutes
        setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
      }
    } catch (error) {
      console.error('Failed to start training session:', error);
    } finally {
      setLearningLoading(false);
    }
  };

  const stopTrainingSession = async () => {
    if (!activeTrainingSession) return;
    
    try {
      const response = await fetch(`/api/omai/stop-training/${activeTrainingSession.id}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setActiveTrainingSession(null);
        loadTrainingSessions();
      }
    } catch (error) {
      console.error('Failed to stop training session:', error);
    }
  };

  const refreshOMAIData = async () => {
    setLearningLoading(true);
    try {
      await Promise.all([
        loadLearningProgress(),
        loadTrainingSessions(),
        loadKnowledgeMetrics(),
        loadEthicsProgress(),
        loadEthicalFoundations()
      ]);
    } finally {
      setLearningLoading(false);
    }
  };

  // Ethics & Reasoning functions
  const loadEthicsProgress = async () => {
    try {
      const response = await fetch('/api/omai/ethics-progress');
      const data = await response.json();
      if (data.success) {
        setEthicsProgress(data.progress);
      }
    } catch (error) {
      console.error('Failed to load ethics progress:', error);
    }
  };

  const loadEthicalFoundations = async () => {
    try {
      const response = await fetch('/api/omai/ethical-foundations');
      const data = await response.json();
      if (data.success) {
        setEthicalFoundations(data.foundations);
      }
    } catch (error) {
      console.error('Failed to load ethical foundations:', error);
    }
  };

  const loadOMLearnSurveys = async () => {
    try {
      const response = await fetch('/api/omai/omlearn-surveys');
      const data = await response.json();
      if (data.success) {
        setOmlearnSurveys(data.surveys);
      }
    } catch (error) {
      console.error('Failed to load OMLearn surveys:', error);
    }
  };

  const importOMLearnResponses = async (responses: any) => {
    setEthicsLoading(true);
    try {
      const response = await fetch('/api/omai/import-omlearn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responses)
      });
      const data = await response.json();
      if (data.success) {
        await loadEthicalFoundations();
        await loadEthicsProgress();
      }
    } catch (error) {
      console.error('Failed to import OMLearn responses:', error);
    } finally {
      setEthicsLoading(false);
    }
  };

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
      const response = await fetch('/api/bigbook/registries', {
        credentials: 'include'
      });
      
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
      const response = await fetch('/api/bigbook/custom-components-registry', {
        credentials: 'include'
      });

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
      // Create installation result object for removal API
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
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          installationResult
        })
      });

      const result = await response.json();

      if (result.success) {
        addConsoleMessage('success', `✅ Component "${component.name}" removed successfully`);
        if (result.menuUpdated) {
          addConsoleMessage('success', `🧩 Component removed from Big Book sidebar menu`);
        }
        
        // Reload custom components to refresh the list
        await loadCustomComponents();
        
        // If we're currently viewing the removed component, go back
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Update local registry state
        setRegistries((prev: any) => ({
          ...prev,
          [type]: {
            ...prev[type],
            items: {
              ...prev[type].items,
              [id]: result.item
            }
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

  // Handle file drop
  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      try {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        // Special handling for Parish Map zip files
        if (extension === 'zip' && (
          file.name.toLowerCase().includes('parish-map') || 
          file.name.toLowerCase().includes('parishmap') ||
          file.name.toLowerCase() === '_workspace_dist_parish-map.zip'
        )) {
          addConsoleMessage('info', `🗺️ Parish Map zip detected: ${file.name}. Starting auto-installation...`);
          
          try {
            const formData = new FormData();
            formData.append('parishMapZip', file);
            
            const response = await fetch('/api/bigbook/upload-parish-map', {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
              addConsoleMessage('success', `🎉 Parish Map installed successfully!`);
              addConsoleMessage('info', `📍 Component: ${result.addon.displayName}`);
              addConsoleMessage('info', `🔗 Available at: orthodoxmetrics.com${result.addon.route}`);
              addConsoleMessage('info', `📝 Updated Big Book Components Index`);
              addConsoleMessage('success', `🧩 Added to sidebar navigation under "Components" section`);
              addConsoleMessage('info', `🔄 Refresh the page to see the new menu item in the sidebar`);
              
              // Add link to visit the component
              setTimeout(() => {
                addConsoleMessage('info', `Click here to visit: ${window.location.origin}${result.addon.route}`);
              }, 1000);
              
            } else {
              addConsoleMessage('error', `❌ Parish Map installation failed: ${result.error}`);
            }
          } catch (error) {
            addConsoleMessage('error', `❌ Parish Map installation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          continue; // Skip normal file processing for parish map zips
        }
        
        // Special handling for .tsx component files
        if (extension === 'tsx') {
          addConsoleMessage('info', `🧩 TSX Component detected: ${file.name}. Opening installation wizard...`);
          setTsxFile(file);
          setTsxWizardOpen(true);
          continue; // Skip normal file processing for tsx files
        }
        
        // Centralized file processing using new ingestion system
        const supportedTypes = ['.zip', '.js', '.json', '.md', '.sh'];
        if (!supportedTypes.includes(`.${extension}`)) {
          // Fallback to encrypted storage for unsupported types
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            const fileType = getFileTypeFromExtension(extension);
            
            // Create temporary file object
            const tempFile: FileUpload = {
              id: Date.now().toString() + Math.random(),
              name: file.name,
              type: fileType,
              content,
              size: file.size,
              uploaded: new Date(),
              processed: false,
              status: 'pending'
            };
            
            setUploadedFiles(prev => [...prev, tempFile]);
            addConsoleMessage('info', `Uploading to encrypted storage: ${file.name} (${fileType})`);
            
            // Upload to encrypted storage (fallback)
            try {
              const response = await fetch('/api/bigbook/upload', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  fileName: file.name,
                  content,
                  fileType
                }),
              });

              const result = await response.json();
              
              if (result.success) {
                setUploadedFiles(prev => prev.map(f => 
                  f.id === tempFile.id 
                    ? { 
                        ...f, 
                        status: 'completed',
                        result: { success: true, output: 'File uploaded successfully' }
                      }
                    : f
                ));
                const fileTypeMessage = result.isQuestionnaire 
                  ? `questionnaire (${result.questionnaireMetadata?.title || 'Unknown'})`
                  : 'file';
                addConsoleMessage('success', `${fileTypeMessage} uploaded to encrypted storage: ${file.name}`);
                
                if (result.isQuestionnaire) {
                  addConsoleMessage('info', `Questionnaire detected: ${result.questionnaireMetadata?.ageGroup || 'Unknown age group'} - ${result.questionnaireMetadata?.estimatedDuration || 0} minutes`);
                }
              } else {
                setUploadedFiles(prev => prev.map(f => 
                  f.id === tempFile.id ? { ...f, status: 'error', result: { success: false, error: result.error } } : f
                ));
                addConsoleMessage('error', `Upload failed: ${file.name} - ${result.error}`);
              }
            } catch (error) {
              setUploadedFiles(prev => prev.map(f => 
                f.id === tempFile.id ? { ...f, status: 'error', result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } } : f
              ));
              addConsoleMessage('error', `Upload error: ${file.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          };
          
          reader.readAsText(file);
          continue;
        }
        
        // Use centralized ingestion system for supported file types
        const fileTypeIcons: Record<string, string> = {
          zip: '📦',
          js: '⚡',
          json: '⚙️',
          md: '📝',
          sh: '🔧'
        };
        
        const fileIcon = fileTypeIcons[extension] || '📄';
        addConsoleMessage('info', `${fileIcon} Processing ${extension.toUpperCase()} file: ${file.name}`);
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          // Add OMAI notification flag if user wants it
          const notifyOMAI = extension === 'md' || extension === 'js'; // Auto-notify for docs and code
          if (notifyOMAI) {
            formData.append('notifyOMAI', 'true');
          }
          
          addConsoleMessage('info', `🔄 Sending to centralized ingestion system...`);
          
          const response = await fetch('/api/bigbook/ingest-file', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          addConsoleMessage('info', `📡 Response status: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            addConsoleMessage('error', `❌ HTTP Error ${response.status}: ${errorText}`);
            
            if (response.status === 401) {
              addConsoleMessage('error', `🔐 Authentication failed. Please refresh page and try again.`);
              addConsoleMessage('info', `💡 Tip: Make sure you're logged in as super_admin`);
            }
            continue;
          }
          
          const result = await response.json();
          
          if (result.success) {
            const { result: ingestionResult } = result;
            
            addConsoleMessage('success', `✅ ${ingestionResult.message}`);
            addConsoleMessage('info', `📂 Type: ${ingestionResult.type}/${ingestionResult.category}`);
            
            // Add type-specific messages
            switch (ingestionResult.type) {
              case 'addon':
                addConsoleMessage('info', `🧩 Component available at: ${ingestionResult.item?.route || 'N/A'}`);
                if (ingestionResult.item?.enabled) {
                  addConsoleMessage('success', `✅ Component enabled and ready to use`);
                } else {
                  addConsoleMessage('warning', `⚠️ Component requires manual enable in registry`);
                }
                break;
              case 'doc':
                addConsoleMessage('info', `📖 Document: ${ingestionResult.item?.title || ingestionResult.item?.name}`);
                if (ingestionResult.item?.webPath) {
                  addConsoleMessage('info', `🔗 Web path: ${ingestionResult.item.webPath}`);
                }
                break;
              case 'script':
                addConsoleMessage('info', `🔧 Script stored and made executable`);
                addConsoleMessage('warning', `⚠️ Script requires manual enable for security`);
                break;
              case 'config':
                addConsoleMessage('info', `⚙️ Configuration active and available`);
                break;
              case 'data':
                addConsoleMessage('info', `💾 Data archived for manual processing`);
                break;
            }
            
            // Show registry update info
            if (result.registries) {
              const registryNames = Object.keys(result.registries);
              addConsoleMessage('info', `📊 Updated registries: ${registryNames.join(', ')}`);
            }
            
            // OMAI notification status
            if (notifyOMAI) {
              addConsoleMessage('info', `🧠 OMAI notified for learning`);
            }
            
          } else {
            addConsoleMessage('error', `❌ Ingestion failed: ${result.error}`);
            if (result.debug) {
              addConsoleMessage('info', `🔍 Debug info: ${JSON.stringify(result.debug)}`);
            }
          }
          
        } catch (error) {
          addConsoleMessage('error', `❌ Ingestion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } catch (error) {
        addConsoleMessage('error', `File processing error: ${file.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      try {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        // Special handling for Parish Map zip files
        if (extension === 'zip' && (
          file.name.toLowerCase().includes('parish-map') || 
          file.name.toLowerCase().includes('parishmap') ||
          file.name.toLowerCase() === '_workspace_dist_parish-map.zip'
        )) {
          addConsoleMessage('info', `🗺️ Parish Map zip selected: ${file.name}. Starting auto-installation...`);
          
          try {
            const formData = new FormData();
            formData.append('parishMapZip', file);
            
            addConsoleMessage('info', `🔄 Sending request to /api/bigbook/upload-parish-map...`);
            
            const response = await fetch('/api/bigbook/upload-parish-map', {
              method: 'POST',
              body: formData,
              credentials: 'include',
              headers: {
                // Don't set Content-Type for FormData - let browser set it with boundary
              }
            });
            
            addConsoleMessage('info', `📡 Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
              const errorText = await response.text();
              addConsoleMessage('error', `❌ HTTP Error ${response.status}: ${errorText}`);
              
              if (response.status === 401) {
                addConsoleMessage('error', `🔐 Authentication failed. Please refresh page and try again.`);
                addConsoleMessage('info', `💡 Tip: Make sure you're logged in as super_admin`);
              }
              return;
            }
            
            const result = await response.json();
            
            if (result.success) {
              addConsoleMessage('success', `🎉 Parish Map installed successfully!`);
              addConsoleMessage('info', `📍 Component: ${result.addon.displayName}`);
              addConsoleMessage('info', `🔗 Available at: orthodoxmetrics.com${result.addon.route}`);
              addConsoleMessage('info', `📝 Updated Big Book Components Index`);
              addConsoleMessage('success', `🧩 Added to sidebar navigation under "Components" section`);
              addConsoleMessage('info', `🔄 Refresh the page to see the new menu item in the sidebar`);
              
              // Add link to visit the component
              setTimeout(() => {
                addConsoleMessage('info', `Click here to visit: ${window.location.origin}${result.addon.route}`);
              }, 1000);
              
            } else {
              addConsoleMessage('error', `❌ Parish Map installation failed: ${result.error}`);
              if (result.debug) {
                addConsoleMessage('info', `🔍 Debug info: ${JSON.stringify(result.debug)}`);
              }
            }
          } catch (error) {
            addConsoleMessage('error', `❌ Parish Map installation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error('Parish Map upload error:', error);
          }
          
          continue; // Skip normal file processing for parish map zips
        }
        
        // Special handling for .tsx component files
        if (extension === 'tsx') {
          addConsoleMessage('info', `🧩 TSX Component detected: ${file.name}. Opening installation wizard...`);
          setTsxFile(file);
          setTsxWizardOpen(true);
          continue; // Skip normal file processing for tsx files
        }
        
        // Centralized file processing using new ingestion system
        const supportedTypes = ['.zip', '.js', '.json', '.md', '.sh'];
        if (!supportedTypes.includes(`.${extension}`)) {
          // Fallback to encrypted storage for unsupported types
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            const fileType = getFileTypeFromExtension(extension);
            
            // Create temporary file object
            const tempFile: FileUpload = {
              id: Date.now().toString() + Math.random(),
              name: file.name,
              type: fileType,
              content,
              size: file.size,
              uploaded: new Date(),
              processed: false,
              status: 'pending'
            };
            
            setUploadedFiles(prev => [...prev, tempFile]);
            addConsoleMessage('info', `Uploading to encrypted storage: ${file.name} (${fileType})`);
            
            // Upload to encrypted storage (fallback)
            try {
              const response = await fetch('/api/bigbook/upload', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  fileName: file.name,
                  content,
                  fileType
                }),
              });

              const result = await response.json();
              
              if (result.success) {
                setUploadedFiles(prev => prev.map(f => 
                  f.id === tempFile.id 
                    ? { 
                        ...f, 
                        status: 'completed',
                        result: { success: true, output: 'File uploaded successfully' }
                      }
                    : f
                ));
                const fileTypeMessage = result.isQuestionnaire 
                  ? `questionnaire (${result.questionnaireMetadata?.title || 'Unknown'})`
                  : 'file';
                addConsoleMessage('success', `${fileTypeMessage} uploaded to encrypted storage: ${file.name}`);
                
                if (result.isQuestionnaire) {
                  addConsoleMessage('info', `Questionnaire detected: ${result.questionnaireMetadata?.ageGroup || 'Unknown age group'} - ${result.questionnaireMetadata?.estimatedDuration || 0} minutes`);
                }
              } else {
                setUploadedFiles(prev => prev.map(f => 
                  f.id === tempFile.id ? { ...f, status: 'error', result: { success: false, error: result.error } } : f
                ));
                addConsoleMessage('error', `Upload failed: ${file.name} - ${result.error}`);
              }
            } catch (error) {
              setUploadedFiles(prev => prev.map(f => 
                f.id === tempFile.id ? { ...f, status: 'error', result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } } : f
              ));
              addConsoleMessage('error', `Upload error: ${file.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          };
          
          reader.readAsText(file);
          continue;
        }
        
        // Use centralized ingestion system for supported file types
        const fileTypeIcons: Record<string, string> = {
          zip: '📦',
          js: '⚡',
          json: '⚙️',
          md: '📝',
          sh: '🔧'
        };
        
        const fileIcon = fileTypeIcons[extension] || '📄';
        addConsoleMessage('info', `${fileIcon} Processing ${extension.toUpperCase()} file: ${file.name}`);
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          // Add OMAI notification flag if user wants it
          const notifyOMAI = extension === 'md' || extension === 'js'; // Auto-notify for docs and code
          if (notifyOMAI) {
            formData.append('notifyOMAI', 'true');
          }
          
          addConsoleMessage('info', `🔄 Sending to centralized ingestion system...`);
          
          const response = await fetch('/api/bigbook/ingest-file', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          addConsoleMessage('info', `📡 Response status: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            addConsoleMessage('error', `❌ HTTP Error ${response.status}: ${errorText}`);
            
            if (response.status === 401) {
              addConsoleMessage('error', `🔐 Authentication failed. Please refresh page and try again.`);
              addConsoleMessage('info', `💡 Tip: Make sure you're logged in as super_admin`);
            }
            continue;
          }
          
          const result = await response.json();
          
          if (result.success) {
            const { result: ingestionResult } = result;
            
            addConsoleMessage('success', `✅ ${ingestionResult.message}`);
            addConsoleMessage('info', `📂 Type: ${ingestionResult.type}/${ingestionResult.category}`);
            
            // Add type-specific messages
            switch (ingestionResult.type) {
              case 'addon':
                addConsoleMessage('info', `🧩 Component available at: ${ingestionResult.item?.route || 'N/A'}`);
                if (ingestionResult.item?.enabled) {
                  addConsoleMessage('success', `✅ Component enabled and ready to use`);
                } else {
                  addConsoleMessage('warning', `⚠️ Component requires manual enable in registry`);
                }
                break;
              case 'doc':
                addConsoleMessage('info', `📖 Document: ${ingestionResult.item?.title || ingestionResult.item?.name}`);
                if (ingestionResult.item?.webPath) {
                  addConsoleMessage('info', `🔗 Web path: ${ingestionResult.item.webPath}`);
                }
                break;
              case 'script':
                addConsoleMessage('info', `🔧 Script stored and made executable`);
                addConsoleMessage('warning', `⚠️ Script requires manual enable for security`);
                break;
              case 'config':
                addConsoleMessage('info', `⚙️ Configuration active and available`);
                break;
              case 'data':
                addConsoleMessage('info', `💾 Data archived for manual processing`);
                break;
            }
            
            // Show registry update info
            if (result.registries) {
              const registryNames = Object.keys(result.registries);
              addConsoleMessage('info', `📊 Updated registries: ${registryNames.join(', ')}`);
            }
            
            // OMAI notification status
            if (notifyOMAI) {
              addConsoleMessage('info', `🧠 OMAI notified for learning`);
            }
            
          } else {
            addConsoleMessage('error', `❌ Ingestion failed: ${result.error}`);
            if (result.debug) {
              addConsoleMessage('info', `🔍 Debug info: ${JSON.stringify(result.debug)}`);
            }
          }
          
        } catch (error) {
          addConsoleMessage('error', `❌ Ingestion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } catch (error) {
        addConsoleMessage('error', `File processing error: ${file.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };


  const executeFile = async (file: FileUpload) => {
    setIsExecuting(true);
    addConsoleMessage('command', `Executing: ${file.name}`);
    
    try {
      // If file is in encrypted storage, retrieve it first
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.name,
          content: content,
          type: file.type,
          settings
        }),
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
        const response = await fetch(`/api/bigbook/storage/file/${fileId}?encryptedPath=${encodeURIComponent(file.encryptedPath)}`, {
          method: 'DELETE',
        });
        
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
      // Remove from local list only
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
        headers: {
          'Content-Type': 'application/json',
        },
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

  // Handle questionnaire preview
  const handleQuestionnairePreview = (file: FileUpload) => {
    if (!file.isQuestionnaire) {
      addConsoleMessage('warning', 'File is not a questionnaire');
      return;
    }
    setPreviewFile(file);
    setQuestionnairePreviewOpen(true);
    addConsoleMessage('info', `Opening questionnaire preview: ${file.questionnaireMetadata?.title || file.name}`);
  };

  // Handle questionnaire submission
  const handleQuestionnaireSubmit = async (submission: any) => {
    try {
      addConsoleMessage('info', `Submitting questionnaire responses: ${submission.questionnaireTitle}`);
      
      const response = await fetch('/api/bigbook/submit-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
          <Tab 
            label="Learning Dashboard" 
            icon={<PsychologyIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Training Pathways" 
            icon={<LearningIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Memory Management" 
            icon={<MemoryIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Knowledge Analytics" 
            icon={<AnalyticsIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Ethics & Reasoning" 
            icon={<PsychologyIcon />}
            iconPosition="start"
          />
          <Tab 
            label="OMAI Discovery" 
            icon={<AIIcon />}
            iconPosition="start"
          />
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
              learningProgress={learningProgress}
              activeTrainingSession={activeTrainingSession}
              learningLoading={learningLoading}
              refreshOMAIData={refreshOMAIData}
              setTrainingDialogOpen={setTrainingDialogOpen}
              stopTrainingSession={stopTrainingSession}
            />
          )}
          {activeTab === 1 && (
            <TrainingPathwaysPanel
              trainingSessions={trainingSessions}
              activeTrainingSession={activeTrainingSession}
              learningLoading={learningLoading}
              setSelectedTrainingPhase={setSelectedTrainingPhase}
              setTrainingDialogOpen={setTrainingDialogOpen}
            />
          )}
          {activeTab === 2 && <MemoryManager />}
          {activeTab === 3 && (
            <KnowledgeAnalyticsPanel
              knowledgeMetrics={knowledgeMetrics}
              learningProgress={learningProgress}
            />
          )}
          {activeTab === 4 && (
            <EthicsReasoningPanel
              ethicsProgress={ethicsProgress}
              ethicalFoundations={ethicalFoundations}
              omlearnSurveys={omlearnSurveys}
              ethicsLoading={ethicsLoading}
              refreshOMAIData={refreshOMAIData}
              setSelectedFoundation={setSelectedFoundation}
              setFoundationDialogOpen={setFoundationDialogOpen}
              importOMLearnResponses={importOMLearnResponses}
            />
          )}
          {activeTab === 5 && <OMAIDiscoveryPanel />}
          
          {/* Keep existing tabs content - just moved to higher numbers */}
          {activeTab === 6 && (
            <Stack spacing={3}>
              {/* Settings Panel */}
              {showSettings && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SettingsIcon />
                      Big Book Settings
                    </Typography>
                                         <Stack spacing={3}>
                       <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                         <TextField
                           sx={{ flex: 1, minWidth: 250 }}
                           label="Database User"
                           value={settings.databaseUser}
                           onChange={(e) => setSettings(prev => ({ ...prev, databaseUser: e.target.value }))}
                           placeholder="root"
                         />
                         <TextField
                           sx={{ flex: 1, minWidth: 250 }}
                           type="password"
                           label="Database Password"
                           value={settings.databasePassword}
                           onChange={(e) => setSettings(prev => ({ ...prev, databasePassword: e.target.value }))}
                           placeholder="Enter database password"
                         />
                       </Box>
                       <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                         <TextField
                           sx={{ flex: 1, minWidth: 250 }}
                           label="Default Database"
                           value={settings.defaultDatabase}
                           onChange={(e) => setSettings(prev => ({ ...prev, defaultDatabase: e.target.value }))}
                           placeholder="omai_db"
                         />
                         <TextField
                           sx={{ flex: 1, minWidth: 250 }}
                           type="number"
                           label="Script Timeout (ms)"
                           value={settings.scriptTimeout}
                           onChange={(e) => setSettings(prev => ({ ...prev, scriptTimeout: parseInt(e.target.value) }))}
                         />
                       </Box>
                       <FormControlLabel
                         control={
                           <Switch
                             checked={settings.useSudo}
                             onChange={(e) => setSettings(prev => ({ ...prev, useSudo: e.target.checked }))}
                           />
                         }
                         label="Use Sudo for Script Execution"
                       />
                       {settings.useSudo && (
                         <TextField
                           fullWidth
                           type="password"
                           label="Sudo Password"
                           value={settings.sudoPassword}
                           onChange={(e) => setSettings(prev => ({ ...prev, sudoPassword: e.target.value }))}
                           placeholder="Enter sudo password"
                         />
                       )}
                       <Button
                         variant="contained"
                         startIcon={<SaveIcon />}
                         onClick={saveSettings}
                       >
                         Save Settings
                       </Button>
                     </Stack>
                  </CardContent>
                </Card>
              )}

              {/* File Upload Area */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    File Upload
                  </Typography>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'grey.300',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onDrop={handleFileDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Drop files here or click to upload
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supports all file types: .md, .js, .sh, .py, .sql, .html, .css, .json, .xml, .txt, .pdf, images, videos, audio, archives (max 10MB)
                    </Typography>
                    <Typography variant="body2" color="primary.main" sx={{ mt: 1, fontWeight: 'bold' }}>
                      🗺️ Special: Drop Parish Map .zip files for auto-installation!
                    </Typography>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".md,.js,.jsx,.ts,.tsx,.sh,.bash,.py,.sql,.html,.htm,.css,.scss,.sass,.json,.xml,.txt,.log,.pdf,.jpg,.jpeg,.png,.gif,.svg,.webp,.mp4,.avi,.mov,.wmv,.mp3,.wav,.ogg,.zip,.tar,.gz,.rar"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Uploaded Files
                    </Typography>
                    <List>
                      {uploadedFiles.map((file) => (
                        <ListItem key={file.id} divider>
                          <ListItemIcon>
                            {getFileIcon(file.type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={file.name}
                            secondary={`${(file.size / 1024).toFixed(1)} KB • ${file.uploaded.toLocaleString()}`}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getFileTypeChip(file.type)}
                            <Tooltip title="Execute">
                              <IconButton
                                onClick={() => executeFile(file)}
                                disabled={isExecuting}
                                color="primary"
                              >
                                <PlayIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove">
                              <IconButton
                                onClick={() => removeFile(file.id)}
                                color="error"
                              >
                                <Trash2Icon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Stack>
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
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Console Output
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<RefreshCwIcon />}
                  onClick={clearConsole}
                  size="small"
                >
                  Clear Console
                </Button>
              </Stack>
              
              <Paper
                ref={consoleRef}
                sx={{
                  height: 400,
                  overflow: 'auto',
                  p: 2,
                  backgroundColor: '#1e1e1e',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}
              >
                {consoleOutput.length === 0 ? (
                  <Typography color="grey.500" textAlign="center">
                    No console output yet. Upload and execute files to see results.
                  </Typography>
                ) : (
                  consoleOutput.map((output) => (
                    <Box key={output.id} sx={{ mb: 1 }}>
                      <Typography
                        component="span"
                        sx={{
                          color: output.type === 'error' ? '#ff6b6b' :
                                 output.type === 'success' ? '#51cf66' :
                                 output.type === 'warning' ? '#ffd43b' :
                                 output.type === 'command' ? '#74c0fc' : '#ffffff',
                          fontWeight: output.type === 'command' ? 'bold' : 'normal'
                        }}
                      >
                        [{output.timestamp.toLocaleTimeString()}] {output.content}
                      </Typography>
                      {output.source && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          ({output.source})
                        </Typography>
                      )}
                    </Box>
                  ))
                )}
              </Paper>
            </Box>
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

      {/* Questionnaire Preview Modal */}
      <QuestionnairePreview
        open={questionnairePreviewOpen}
        onClose={() => {
          setQuestionnairePreviewOpen(false);
          setPreviewFile(null);
        }}
        file={previewFile}
        onSubmit={handleQuestionnaireSubmit}
      />

      {/* TSX Component Installation Wizard */}
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

      {/* Start Training Dialog */}
      <TrainingDialog
        open={trainingDialogOpen}
        onClose={() => setTrainingDialogOpen(false)}
        selectedPhase={selectedTrainingPhase}
        onPhaseSelect={setSelectedTrainingPhase}
        onStart={startTrainingSession}
        loading={learningLoading}
      />

      {/* Ethical Foundation Details Dialog */}
      <FoundationDetailsDialog
        open={foundationDialogOpen}
        onClose={() => setFoundationDialogOpen(false)}
        foundation={selectedFoundation}
      />
    </Box>
  );

};

export default OMBigBook; 