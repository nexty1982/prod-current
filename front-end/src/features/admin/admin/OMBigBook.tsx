import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  FormControl,
  FormLabel,
  Tabs,
  Tab,
  Box,
  Alert,
  Chip,
  Paper,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  LinearProgress,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import BigBookConsolePage from './BigBookConsolePage';
import { BigBookConsoleSettings, defaultSettings } from './BigBookSettings';
import EncryptedStoragePanel from './EncryptedStoragePanel';
import QuestionnairePreview from './QuestionnairePreview';
import OMAIDiscoveryPanel from './OMAIDiscoveryPanel';
import TSXComponentInstallWizard from './TSXComponentInstallWizard';
import BigBookCustomComponentViewer from './BigBookCustomComponentViewer';
import MemoryManager from './MemoryManager';
import {
  Upload as UploadIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as Trash2Icon,
  Settings as SettingsIcon,
  Description as FileTextIcon,
  Code as CodeIcon,
  Storage as DatabaseIcon,
  Terminal as TerminalIcon,
  Save as SaveIcon,
  Refresh as RefreshCwIcon,
  CloudUpload as CloudUploadIcon,
  FolderOpen as FolderOpenIcon,
  Article as ArticleIcon,
  Javascript as JavaScriptIcon,
  Code as ShellScriptIcon,
  Code as PythonIcon,
  ExpandMore as ExpandMoreIcon,
  Extension as AddonIcon,
  Article as DocIcon,
  Tune as ConfigIcon,
  Archive as DataIcon,
  Visibility as ViewIcon,
  Html as HtmlIcon,
  Css as CssIcon,
  DataObject as JsonIcon,
  Code as XmlIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Archive as ArchiveIcon,
  PictureAsPdf as PdfIcon,
  TextSnippet as TextIcon,
  // New OMAI-specific icons
  Memory as MemoryIcon,
  School as LearningIcon,
  Analytics as AnalyticsIcon,
  Timeline as ProgressIcon,
  AutoMode as AIIcon,
  Assessment as MetricsIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  History as HistoryIcon,
  Assignment as TaskIcon,
  Speed as PerformanceIcon,
  Insights as InsightsIcon,
  Lightbulb as EthicsIcon,
  Balance as MoralIcon,
  QuestionAnswer as ReasoningIcon
} from '@mui/icons-material';

interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  uploaded: Date;
  processed: boolean;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: {
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
  };
}

interface ConsoleOutput {
  id: string;
  timestamp: Date;
  type: 'command' | 'output' | 'error' | 'info';
  content: string;
  source?: string;
}

interface BigBookSettings {
  databaseUser: string;
  databasePassword: string;
  useSudo: boolean;
  sudoPassword: string;
  defaultDatabase: string;
  scriptTimeout: number;
  maxFileSize: number;
}

// New OMAI-specific interfaces
interface LearningProgress {
  totalSessions: number;
  completedSessions: number;
  currentPhase: string;
  overallProgress: number;
  lastActivity: string;
  knowledgePoints: number;
  memoriesCreated: number;
  filesProcessed: number;
}

interface TrainingSession {
  id: string;
  name: string;
  phase: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  results?: {
    filesProcessed: number;
    memoriesCreated: number;
    knowledgeExtracted: number;
    errors: number;
  };
}

interface KnowledgeMetrics {
  totalMemories: number;
  categoriesDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  usagePatterns: {
    mostUsed: Array<{ title: string; count: number }>;
    recentlyAccessed: Array<{ title: string; lastAccessed: string }>;
    trending: Array<{ title: string; trend: number }>;
  };
  learningVelocity: {
    memoriesPerWeek: number;
    knowledgeGrowthRate: number;
    activeHours: number;
  };
}

// OMLearn Ethics & Reasoning interfaces
interface EthicalFoundation {
  id: string;
  gradeGroup: 'kindergarten-2nd' | '3rd-5th' | '6th-8th' | '9th-12th';
  category: 'moral_development' | 'ethical_thinking' | 'reasoning_patterns' | 'philosophical_concepts';
  question: string;
  userResponse: string;
  reasoning: string;
  confidence: number;
  weight: number;
  appliedContexts: string[];
  createdAt: string;
  lastReferenced?: string;
}

interface EthicsProgress {
  totalSurveys: number;
  completedSurveys: number;
  gradeGroupsCompleted: string[];
  ethicalFoundationsCount: number;
  moralComplexityScore: number;
  reasoningMaturityLevel: string;
  lastAssessment: string;
}

interface OMLearnSurvey {
  id: string;
  gradeGroup: string;
  title: string;
  description: string;
  totalQuestions: number;
  completedQuestions: number;
  status: 'not_started' | 'in_progress' | 'completed';
  ageRange: string;
  focus: string;
}

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

  // Get file type from extension
  const getFileTypeFromExtension = (extension: string): FileUpload['type'] => {
    switch (extension) {
      case 'sql':
        return 'sql';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return 'javascript';
      case 'sh':
      case 'bash':
      case 'zsh':
        return 'shell';
      case 'py':
      case 'python':
        return 'python';
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
      case 'scss':
      case 'sass':
        return 'css';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'txt':
      case 'log':
        return 'text';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'image';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'audio';
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
        return 'archive';
      case 'pdf':
        return 'pdf';
      default:
        return 'other';
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

  // Get file icon
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'sql':
        return <DatabaseIcon />;
      case 'markdown':
        return <ArticleIcon />;
      case 'javascript':
        return <JavaScriptIcon />;
      case 'shell':
        return <ShellScriptIcon />;
      case 'python':
        return <PythonIcon />;
      case 'html':
        return <HtmlIcon />;
      case 'css':
        return <CssIcon />;
      case 'json':
        return <JsonIcon />;
      case 'xml':
        return <XmlIcon />;
      case 'text':
        return <TextIcon />;
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <VideoIcon />;
      case 'audio':
        return <AudioIcon />;
      case 'archive':
        return <ArchiveIcon />;
      case 'pdf':
        return <PdfIcon />;
      case 'script':
        return <CodeIcon />;
      default:
        return <FileTextIcon />;
    }
  };

  // Get file type chip color
  const getFileTypeChip = (type: string) => {
    switch (type) {
      case 'sql':
        return <Chip label="SQL" size="small" color="primary" />;
      case 'markdown':
        return <Chip label="Markdown" size="small" color="info" />;
      case 'javascript':
        return <Chip label="JavaScript" size="small" color="warning" />;
      case 'shell':
        return <Chip label="Shell" size="small" color="success" />;
      case 'python':
        return <Chip label="Python" size="small" color="secondary" />;
      case 'html':
        return <Chip label="HTML" size="small" color="error" />;
      case 'css':
        return <Chip label="CSS" size="small" color="info" />;
      case 'json':
        return <Chip label="JSON" size="small" color="warning" />;
      case 'xml':
        return <Chip label="XML" size="small" color="secondary" />;
      case 'text':
        return <Chip label="Text" size="small" color="default" />;
      case 'image':
        return <Chip label="Image" size="small" color="success" />;
      case 'video':
        return <Chip label="Video" size="small" color="error" />;
      case 'audio':
        return <Chip label="Audio" size="small" color="info" />;
      case 'archive':
        return <Chip label="Archive" size="small" color="warning" />;
      case 'pdf':
        return <Chip label="PDF" size="small" color="error" />;
      case 'script':
        return <Chip label="Script" size="small" color="secondary" />;
      default:
        return <Chip label="Other" size="small" color="default" />;
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const renderLearningDashboard = () => (
    <Box>
      {/* Learning Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h2">
              <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              OMAI Learning Dashboard
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={learningLoading ? <CircularProgress size={16} /> : <RefreshCwIcon />}
                onClick={refreshOMAIData}
                disabled={learningLoading}
                sx={{ mr: 1 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<LearningIcon />}
                onClick={() => setTrainingDialogOpen(true)}
                disabled={!!activeTrainingSession}
              >
                Start Training
              </Button>
            </Box>
          </Box>

          {learningProgress && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {Math.round(learningProgress.overallProgress)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overall Progress
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={learningProgress.overallProgress} 
                    sx={{ mt: 1 }}
                  />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {learningProgress.knowledgePoints}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Knowledge Points
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {learningProgress.memoriesCreated}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Memories Created
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {learningProgress.filesProcessed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Files Processed
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Current Phase Status */}
          {learningProgress && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Current Learning Phase
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  <strong>{learningProgress.currentPhase}</strong>
                </Typography>
                <Typography variant="body2">
                  {learningProgress.completedSessions} of {learningProgress.totalSessions} sessions completed
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last Activity: {learningProgress.lastActivity}
                </Typography>
              </Alert>
            </Box>
          )}

          {/* Active Training Session */}
          {activeTrainingSession && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Active Training Session
              </Typography>
              <Paper sx={{ p: 2, border: 2, borderColor: 'primary.main' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="subtitle1" color="primary">
                      {activeTrainingSession.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Phase: {activeTrainingSession.phase}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={stopTrainingSession}
                    size="small"
                  >
                    Stop
                  </Button>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={activeTrainingSession.progress} 
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" align="center">
                  {activeTrainingSession.progress}% Complete
                </Typography>
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  const renderTrainingPathways = () => (
    <Box>
      {/* Training Sessions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TaskIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Training Sessions
          </Typography>
          
          {trainingSessions.length === 0 ? (
            <Alert severity="info">
              No training sessions found. Start your first training session to begin OMAI's learning journey.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Session Name</TableCell>
                    <TableCell>Phase</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Results</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trainingSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={session.phase} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={session.status}
                          color={
                            session.status === 'completed' ? 'success' :
                            session.status === 'running' ? 'primary' :
                            session.status === 'failed' ? 'error' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <LinearProgress 
                            variant="determinate" 
                            value={session.progress} 
                            sx={{ width: 100, mr: 1 }}
                          />
                          <Typography variant="body2">
                            {session.progress}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {session.duration ? `${Math.round(session.duration / 60)} min` : '-'}
                      </TableCell>
                      <TableCell>
                        {session.results && (
                          <Tooltip title={`Files: ${session.results.filesProcessed}, Memories: ${session.results.memoriesCreated}, Knowledge: ${session.results.knowledgeExtracted}`}>
                            <Chip 
                              label={`${session.results.filesProcessed} files`} 
                              size="small" 
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Training Phases Overview */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Training Phases
          </Typography>
          
          <Grid container spacing={2}>
            {[
              { 
                id: 'foundation', 
                name: 'Foundation Knowledge', 
                description: 'Basic system understanding and file structure analysis',
                icon: <CodeIcon />
              },
              { 
                id: 'functional', 
                name: 'Functional Understanding', 
                description: 'API patterns, component relationships, and data flow',
                icon: <AnalyticsIcon />
              },
              { 
                id: 'operational', 
                name: 'Operational Intelligence', 
                description: 'Deployment, monitoring, and performance patterns',
                icon: <PerformanceIcon />
              },
              { 
                id: 'resolution', 
                name: 'Issue Resolution', 
                description: 'Problem-solving patterns and error handling',
                icon: <InsightsIcon />
              },
              { 
                id: 'predictive', 
                name: 'Predictive Capabilities', 
                description: 'Proactive maintenance and optimization',
                icon: <TrendingUpIcon />
              }
            ].map((phase) => (
              <Grid item xs={12} md={6} lg={4} key={phase.id}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    '&:hover': { elevation: 4 }
                  }}
                  onClick={() => {
                    setSelectedTrainingPhase(phase.id);
                    setTrainingDialogOpen(true);
                  }}
                >
                  <Box display="flex" alignItems="center" mb={1}>
                    {phase.icon}
                    <Typography variant="subtitle1" sx={{ ml: 1 }}>
                      {phase.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {phase.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  const renderKnowledgeAnalytics = () => (
    <Box>
      {knowledgeMetrics && (
        <>
          {/* Knowledge Overview */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <MetricsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Knowledge Analytics
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {knowledgeMetrics.totalMemories}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Memories
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {knowledgeMetrics.learningVelocity.memoriesPerWeek}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Memories/Week
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {Math.round(knowledgeMetrics.learningVelocity.knowledgeGrowthRate * 100)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Growth Rate
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Categories & Priorities Distribution */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Knowledge Categories
                  </Typography>
                  <List>
                    {Object.entries(knowledgeMetrics.categoriesDistribution).map(([category, count]) => (
                      <ListItem key={category}>
                        <ListItemText primary={category} />
                        <Chip label={count} size="small" />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Priority Distribution
                  </Typography>
                  <List>
                    {Object.entries(knowledgeMetrics.priorityDistribution).map(([priority, count]) => (
                      <ListItem key={priority}>
                        <ListItemText primary={priority} />
                        <Chip 
                          label={count} 
                          size="small"
                          color={
                            priority === 'critical' ? 'error' :
                            priority === 'high' ? 'warning' :
                            priority === 'medium' ? 'info' : 'default'
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Usage Patterns */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usage Patterns
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>
                    Most Used Memories
                  </Typography>
                  <List dense>
                    {knowledgeMetrics.usagePatterns.mostUsed.map((memory, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={memory.title}
                          secondary={`Used ${memory.count} times`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>
                    Recently Accessed
                  </Typography>
                  <List dense>
                    {knowledgeMetrics.usagePatterns.recentlyAccessed.map((memory, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={memory.title}
                          secondary={new Date(memory.lastAccessed).toLocaleString()}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>
                    Trending Memories
                  </Typography>
                  <List dense>
                    {knowledgeMetrics.usagePatterns.trending.map((memory, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={memory.title}
                          secondary={
                            <Box display="flex" alignItems="center">
                              <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5 }} />
                              {memory.trend > 0 ? '+' : ''}{memory.trend}%
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );

  const renderEthicsReasoning = () => (
    <Box>
      {/* Ethics Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h2">
              <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              OMAI Ethics & Reasoning Foundation
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={ethicsLoading ? <CircularProgress size={16} /> : <RefreshCwIcon />}
                onClick={refreshOMAIData}
                disabled={ethicsLoading}
                sx={{ mr: 1 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<EthicsIcon />}
                onClick={() => window.open('/omlearn', '_blank')}
              >
                Open OMLearn
              </Button>
            </Box>
          </Box>

          {ethicsProgress && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {ethicsProgress.completedSurveys}/{ethicsProgress.totalSurveys}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Surveys Completed
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(ethicsProgress.completedSurveys / ethicsProgress.totalSurveys) * 100} 
                    sx={{ mt: 1 }}
                  />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {ethicsProgress.ethicalFoundationsCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ethical Foundations
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {Math.round(ethicsProgress.moralComplexityScore)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Moral Complexity
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {ethicsProgress.reasoningMaturityLevel}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reasoning Level
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* OMLearn Integration Status */}
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              OMLearn Survey Progress
            </Typography>
            {omlearnSurveys.length > 0 ? (
              <Grid container spacing={2}>
                {omlearnSurveys.map((survey) => (
                  <Grid item xs={12} md={6} key={survey.id}>
                    <Paper sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Typography variant="subtitle1">
                          {survey.title}
                        </Typography>
                        <Chip 
                          label={survey.status.replace('_', ' ')}
                          color={
                            survey.status === 'completed' ? 'success' :
                            survey.status === 'in_progress' ? 'primary' : 'default'
                          }
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {survey.ageRange} • {survey.focus}
                      </Typography>
                      <Box display="flex" alignItems="center" mb={1}>
                        <LinearProgress 
                          variant="determinate" 
                          value={(survey.completedQuestions / survey.totalQuestions) * 100} 
                          sx={{ width: '100%', mr: 1 }}
                        />
                        <Typography variant="body2">
                          {survey.completedQuestions}/{survey.totalQuestions}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info">
                No OMLearn surveys found. Complete OMLearn assessments to establish OMAI's ethical foundation.
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Ethical Foundations */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <MoralIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Ethical Foundations
          </Typography>
          
          {ethicalFoundations.length > 0 ? (
            <Grid container spacing={2}>
              {ethicalFoundations.slice(0, 6).map((foundation) => (
                <Grid item xs={12} md={6} lg={4} key={foundation.id}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      '&:hover': { elevation: 4 }
                    }}
                    onClick={() => {
                      setSelectedFoundation(foundation);
                      setFoundationDialogOpen(true);
                    }}
                  >
                    <Box display="flex" justifyContent="between" alignItems="start" mb={1}>
                      <Typography variant="subtitle2" sx={{ flexGrow: 1, mr: 1 }}>
                        {foundation.question.length > 80 
                          ? `${foundation.question.substring(0, 80)}...` 
                          : foundation.question}
                      </Typography>
                      <Chip 
                        label={foundation.gradeGroup}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1
                      }}
                    >
                      {foundation.userResponse}
                    </Typography>
                    
                    <Box display="flex" justifyContent="between" alignItems="center">
                      <Chip 
                        label={foundation.category.replace('_', ' ')}
                        size="small"
                        color={
                          foundation.category === 'moral_development' ? 'primary' :
                          foundation.category === 'ethical_thinking' ? 'success' :
                          foundation.category === 'reasoning_patterns' ? 'info' : 'default'
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        Weight: {foundation.weight}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="warning">
              No ethical foundations established yet. Complete OMLearn surveys to build OMAI's moral reasoning framework.
            </Alert>
          )}

          {ethicalFoundations.length > 6 && (
            <Box textAlign="center" mt={2}>
              <Typography variant="body2" color="text.secondary">
                Showing 6 of {ethicalFoundations.length} ethical foundations
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Moral Reasoning Categories */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <ReasoningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Moral Reasoning Categories
          </Typography>
          
          <Grid container spacing={3}>
            {[
              { 
                category: 'moral_development', 
                name: 'Moral Development', 
                description: 'Basic moral concepts and value formation',
                icon: '🌱',
                color: 'primary'
              },
              { 
                category: 'ethical_thinking', 
                name: 'Ethical Thinking', 
                description: 'Applied ethics and moral decision-making',
                icon: '🤔',
                color: 'success'
              },
              { 
                category: 'reasoning_patterns', 
                name: 'Reasoning Patterns', 
                description: 'Logical structures and thought processes',
                icon: '🧩',
                color: 'info'
              },
              { 
                category: 'philosophical_concepts', 
                name: 'Philosophical Concepts', 
                description: 'Abstract moral and philosophical understanding',
                icon: '🎭',
                color: 'secondary'
              }
            ].map((category) => {
              const foundationsInCategory = ethicalFoundations.filter(f => f.category === category.category);
              return (
                <Grid item xs={12} md={6} key={category.category}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h2" sx={{ mb: 1 }}>
                      {category.icon}
                    </Typography>
                    <Typography variant="h6" color={`${category.color}.main`} gutterBottom>
                      {category.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {category.description}
                    </Typography>
                    <Typography variant="h4" color={`${category.color}.main`}>
                      {foundationsInCategory.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      foundations established
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

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
          {activeTab === 0 && renderLearningDashboard()}
          {activeTab === 1 && renderTrainingPathways()}
          {activeTab === 2 && <MemoryManager />}
          {activeTab === 3 && renderKnowledgeAnalytics()}
          {activeTab === 4 && renderEthicsReasoning()}
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
            <RegistryManagementPanel />
          )}

          {activeTab === 11 && <CustomComponentsPanel />}
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
      <Dialog 
        open={trainingDialogOpen} 
        onClose={() => setTrainingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <LearningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Start OMAI Training Session
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Select a training phase to begin OMAI's learning session. Each phase builds upon previous knowledge.
          </Typography>
          
          <FormControl fullWidth>
            <FormLabel>Training Phase</FormLabel>
            <Box mt={1}>
              {[
                { id: 'foundation', name: 'Foundation Knowledge', icon: '🏗️' },
                { id: 'functional', name: 'Functional Understanding', icon: '⚙️' },
                { id: 'operational', name: 'Operational Intelligence', icon: '🔧' },
                { id: 'resolution', name: 'Issue Resolution', icon: '🛠️' },
                { id: 'predictive', name: 'Predictive Capabilities', icon: '🔮' }
              ].map((phase) => (
                <Paper 
                  key={phase.id}
                  sx={{ 
                    p: 2, 
                    mb: 1, 
                    cursor: 'pointer',
                    border: selectedTrainingPhase === phase.id ? 2 : 1,
                    borderColor: selectedTrainingPhase === phase.id ? 'primary.main' : 'divider'
                  }}
                  onClick={() => setSelectedTrainingPhase(phase.id)}
                >
                  <Typography variant="subtitle1">
                    {phase.icon} {phase.name}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrainingDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => startTrainingSession(selectedTrainingPhase)}
            variant="contained"
            disabled={learningLoading}
            startIcon={learningLoading ? <CircularProgress size={16} /> : <PlayIcon />}
          >
            {learningLoading ? 'Starting...' : 'Start Training'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ethical Foundation Details Dialog */}
      <Dialog 
        open={foundationDialogOpen} 
        onClose={() => setFoundationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedFoundation && (
            <>
              <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Ethical Foundation Details
              <Chip 
                label={selectedFoundation.gradeGroup}
                size="small"
                sx={{ ml: 2 }}
              />
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedFoundation && (
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Question
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedFoundation.question}
              </Typography>
              
              <Typography variant="h6" gutterBottom color="primary">
                Your Response
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedFoundation.userResponse}
              </Typography>
              
              <Typography variant="h6" gutterBottom color="primary">
                Reasoning
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedFoundation.reasoning}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="primary">Category</Typography>
                  <Typography variant="body2">
                    {selectedFoundation.category.replace('_', ' ')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="primary">Weight</Typography>
                  <Typography variant="body2">{selectedFoundation.weight}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="primary">Confidence</Typography>
                  <Typography variant="body2">{selectedFoundation.confidence}%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="primary">Created</Typography>
                  <Typography variant="body2">
                    {new Date(selectedFoundation.createdAt).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedFoundation.appliedContexts.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Applied Contexts
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {selectedFoundation.appliedContexts.map((context, index) => (
                      <Chip
                        key={index}
                        label={context}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </>
              )}
              
              {selectedFoundation.lastReferenced && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="primary">
                    Last Referenced
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedFoundation.lastReferenced).toLocaleString()}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFoundationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Custom Components Panel Component
  const CustomComponentsPanel: React.FC = () => {
    if (selectedCustomComponent) {
      return (
        <BigBookCustomComponentViewer
          componentName={selectedCustomComponent}
          onBack={() => setSelectedCustomComponent(null)}
          onError={(error) => {
            addConsoleMessage('error', `Component viewer error: ${error}`);
            setSelectedCustomComponent(null);
          }}
        />
      );
    }

    if (customComponentsLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>Loading custom components...</Typography>
        </Box>
      );
    }

    const componentCount = customComponents ? Object.keys(customComponents.components || {}).length : 0;

    return (
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Custom Components
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Big Book custom components with automatic menu integration ({componentCount} components)
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshCwIcon />}
            onClick={loadCustomComponents}
          >
            Refresh
          </Button>
        </Box>

        {componentCount === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              No Custom Components Found
            </Typography>
            <Typography variant="body2">
              Use the TSX Component Installation Wizard with "Big Book Auto-Install Mode" to add custom components with automatic menu integration.
            </Typography>
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {Object.entries(customComponents.components || {}).map(([componentId, component]: [string, any]) => (
              <Grid item xs={12} sm={6} md={4} key={componentId}>
                <Card 
                  sx={{ 
                    cursor: 'pointer', 
                    height: '100%',
                    '&:hover': { 
                      boxShadow: 3, 
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    } 
                  }}
                  onClick={() => setSelectedCustomComponent(componentId)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <AddonIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="div">
                        {component.displayName || component.name}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '2.5em' }}>
                      {component.description || `Custom Big Book component: ${component.displayName || component.name}`}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        label={component.route} 
                        size="small" 
                        variant="outlined" 
                        sx={{ mr: 1, mb: 1 }}
                      />
                      {component.hasJSX && (
                        <Chip 
                          label="JSX" 
                          size="small" 
                          color="primary" 
                          sx={{ mr: 1, mb: 1 }}
                        />
                      )}
                      {component.hasHooks && (
                        <Chip 
                          label="Hooks" 
                          size="small" 
                          color="secondary" 
                          sx={{ mr: 1, mb: 1 }}
                        />
                      )}
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary">
                      Installed: {new Date(component.installedAt).toLocaleDateString()}
                    </Typography>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        startIcon={<ViewIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomComponent(componentId);
                        }}
                      >
                        View
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        color="error"
                        startIcon={<Trash2Icon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCustomComponent(component);
                        }}
                      >
                        Remove
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {customComponents?.menu && customComponents.menu.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Sidebar Menu Items
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These components are automatically added to the Big Book sidebar navigation
            </Typography>
            <List>
              {customComponents.menu.map((menuItem: any) => (
                <ListItem key={menuItem.id} divider>
                  <ListItemIcon>
                    <AddonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={menuItem.displayName}
                    secondary={`Route: ${menuItem.route}`}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      onClick={() => setSelectedCustomComponent(menuItem.id)}
                    >
                      Open
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>
    );
  };

  // Registry Management Panel Component
  const RegistryManagementPanel: React.FC = () => {
    const getRegistryIcon = (type: string) => {
      switch (type) {
        case 'addons': return <AddonIcon />;
        case 'scripts': return <TerminalIcon />;
        case 'docs': return <DocIcon />;
        case 'configs': return <ConfigIcon />;
        case 'data': return <DataIcon />;
        default: return <FileTextIcon />;
      }
    };

    const getItemIcon = (item: any) => {
      if (item.type?.includes('component') || item.type?.includes('javascript')) return <CodeIcon />;
      if (item.type?.includes('script')) return <TerminalIcon />;
      if (item.type?.includes('doc')) return <DocIcon />;
      if (item.type?.includes('config')) return <ConfigIcon />;
      if (item.type?.includes('zip')) return <DataIcon />;
      return <FileTextIcon />;
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString();
    };

    const getItemPath = (item: any) => {
      return item.route || item.webPath || item.storagePath || item.path || 'N/A';
    };

    if (registriesLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>Loading registries...</Typography>
        </Box>
      );
    }

    if (registriesError) {
      return (
        <Box p={3}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load registries: {registriesError}
          </Alert>
          <Button variant="contained" onClick={loadRegistries}>
            Retry
          </Button>
        </Box>
      );
    }

    if (!registries) {
      return (
        <Box p={3}>
          <Alert severity="info">
            No registry data available. Try loading some files first.
          </Alert>
        </Box>
      );
    }

    return (
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Registry Management</Typography>
          <Button 
            variant="outlined" 
            startIcon={<RefreshCwIcon />}
            onClick={loadRegistries}
          >
            Refresh
          </Button>
        </Box>

        {Object.entries(registries).map(([registryType, registry]: [string, any]) => (
          <Accordion key={registryType} defaultExpanded={Object.keys(registry.items || {}).length > 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                {getRegistryIcon(registryType)}
                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                  {registryType} ({Object.keys(registry.items || {}).length} items)
                </Typography>
                <Chip 
                  label={`v${registry?.version || '1.0'}`} 
                  size="small" 
                  variant="outlined" 
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {Object.keys(registry.items || {}).length === 0 ? (
                <Typography color="text.secondary">
                  No {registryType} registered yet.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Path/Route</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(registry.items || {})
                        .filter(([, item]) => item !== null && item !== undefined)
                        .map(([itemId, item]: [string, any]) => (
                        <TableRow key={itemId}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getItemIcon(item)}
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.displayName || item.title || item.name || 'Unnamed'}
                                </Typography>
                                {item.description && (
                                  <Typography variant="caption" color="text.secondary">
                                    {item.description}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.type || 'unknown'} 
                              size="small" 
                              variant="outlined"
                              color={item.enabled ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {getItemPath(item)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.enabled ? 'Enabled' : 'Disabled'} 
                              size="small"
                              color={item.enabled ? 'success' : 'warning'}
                              variant={item.enabled ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {item.createdAt ? formatDate(item.createdAt) : 'Unknown'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={item.enabled || false}
                              onChange={(e) => toggleItemStatus(registryType, itemId, e.target.checked)}
                              size="small"
                            />
                            {item.route && (
                              <Tooltip title="Open in new tab">
                                <IconButton 
                                  size="small" 
                                  onClick={() => window.open(item.route, '_blank')}
                                  sx={{ ml: 1 }}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {registry?.lastUpdated && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Last updated: {formatDate(registry.lastUpdated)}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}

        {Object.keys(registries).length === 0 && (
          <Alert severity="info">
            No registries found. Upload some files to populate the registries.
          </Alert>
        )}
      </Box>
    );
  };
};

export default OMBigBook; 